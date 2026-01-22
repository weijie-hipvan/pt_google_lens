# frozen_string_literal: true

module Ai
  # Service class that orchestrates AI detection using various adapters.
  # Provides a clean interface for controllers to perform object detection.
  class DetectionService
    ADAPTERS = {
      'google' => GoogleVisionAdapter,
      'google_vision' => GoogleVisionAdapter
      # 'openai' => OpenaiAdapter  # Future: OpenAI Vision support
    }.freeze

    DEFAULT_PROVIDER = 'google'

    def initialize(provider: DEFAULT_PROVIDER)
      adapter_class = ADAPTERS[provider.to_s.downcase] || ADAPTERS[DEFAULT_PROVIDER]
      @adapter = adapter_class.new
    end

    # Perform object detection on the given image
    #
    # @param image_base64 [String] Base64-encoded image data
    # @param options [Hash] Detection options
    # @option options [Integer] :max_objects Maximum number of objects to detect
    # @option options [Float] :confidence_threshold Minimum confidence score (0-1)
    # @return [Hash] Detection result with success status, objects, and metadata
    def detect(image_base64, options = {})
      result = @adapter.detect(image_base64, options.symbolize_keys)

      # Apply confidence threshold filter if specified
      if result[:success] && options[:confidence_threshold].present?
        threshold = options[:confidence_threshold].to_f
        result[:objects] = filter_by_confidence(result[:objects], threshold)
      end

      result
    end

    # Get the name of the current adapter
    def provider_name
      @adapter.name
    end

    private

    def filter_by_confidence(objects, threshold)
      objects.select { |obj| obj[:confidence] >= threshold }
    end
  end
end
