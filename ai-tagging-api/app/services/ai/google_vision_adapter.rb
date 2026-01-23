# frozen_string_literal: true

module Ai
  # Google Cloud Vision API adapter for object detection.
  # Uses the OBJECT_LOCALIZATION feature to detect objects and their bounding boxes.
  class GoogleVisionAdapter < BaseAdapter
    API_URL = 'https://vision.googleapis.com/v1/images:annotate'

    def name
      'google_vision'
    end

    def detect(image_base64, options = {})
      request_id = generate_request_id

      result, processing_time_ms = measure_time do
        perform_detection({ content: clean_base64(image_base64) }, options)
      end

      build_success_response(result, request_id, processing_time_ms)
    rescue StandardError => e
      build_error_response(e, request_id)
    end

    def detect_from_url(image_url, options = {})
      request_id = generate_request_id

      result, processing_time_ms = measure_time do
        perform_detection({ source: { imageUri: image_url } }, options)
      end

      build_success_response(result, request_id, processing_time_ms)
    rescue StandardError => e
      build_error_response(e, request_id)
    end

    private

    def build_success_response(result, request_id, processing_time_ms)
      {
        success: true,
        request_id: request_id,
        processing_time_ms: processing_time_ms,
        objects: result,
        provider: name
      }
    end

    def build_error_response(error, request_id)
      Rails.logger.error("[GoogleVisionAdapter] Detection failed: #{error.message}")
      Rails.logger.error(error.backtrace.first(5).join("\n"))

      {
        success: false,
        request_id: request_id || generate_request_id,
        processing_time_ms: 0,
        objects: [],
        provider: name,
        error: error.message
      }
    end

    def clean_base64(image_base64)
      # Strip data URL prefix if present (e.g., "data:image/jpeg;base64,")
      image_base64.sub(%r{^data:image/\w+;base64,}, '')
    end

    def perform_detection(image_source, options)
      response = call_api(image_source, options)
      normalize_response(response, options)
    end

    def call_api(image_source, options)
      conn = Faraday.new(url: API_URL) do |f|
        f.request :json
        f.response :json
        f.options.timeout = 30
        f.options.open_timeout = 10
      end

      response = conn.post do |req|
        req.params['key'] = ENV.fetch('GOOGLE_CLOUD_API_KEY')
        req.body = build_request_body(image_source, options)
      end

      unless response.success?
        error_message = response.body.dig('error', 'message') || 'Unknown API error'
        raise "Google Vision API error: #{error_message}"
      end

      response.body
    end

    def build_request_body(image_source, options)
      max_results = options[:max_objects] || 10

      {
        requests: [
          {
            image: image_source,
            features: [
              { type: 'OBJECT_LOCALIZATION', maxResults: max_results },
              { type: 'LABEL_DETECTION', maxResults: 10 }
            ]
          }
        ]
      }
    end

    def normalize_response(response, options)
      api_response = response.dig('responses', 0) || {}
      localized_objects = api_response['localizedObjectAnnotations'] || []
      labels = api_response['labelAnnotations'] || []

      # Build a map of labels for potential attribute enrichment
      label_map = labels.each_with_object({}) do |label, hash|
        hash[label['description']&.downcase] = label['score']
      end

      localized_objects.each_with_index.map do |obj, index|
        build_detected_object(obj, index, label_map)
      end
    end

    def build_detected_object(obj, index, label_map)
      vertices = obj.dig('boundingPoly', 'normalizedVertices') || []

      {
        id: "obj_#{index + 1}",
        label: obj['name']&.downcase || 'unknown',
        confidence: obj['score'] || 0,
        bounding_box: extract_bounding_box(vertices),
        attributes: extract_attributes(obj, label_map),
        status: 'pending'
      }
    end

    def extract_bounding_box(vertices)
      return { x: 0, y: 0, width: 0, height: 0 } if vertices.empty?

      # Normalized vertices are in the range [0, 1]
      # vertices[0] = top-left, vertices[1] = top-right
      # vertices[2] = bottom-right, vertices[3] = bottom-left
      x = vertices[0]['x'] || 0
      y = vertices[0]['y'] || 0
      x2 = vertices[2]['x'] || 0
      y2 = vertices[2]['y'] || 0

      {
        x: x.round(4),
        y: y.round(4),
        width: (x2 - x).round(4),
        height: (y2 - y).round(4)
      }
    end

    def extract_attributes(obj, label_map)
      # For now, we return empty attributes
      # This can be extended to infer attributes from labels or use other APIs
      {}
    end
  end
end
