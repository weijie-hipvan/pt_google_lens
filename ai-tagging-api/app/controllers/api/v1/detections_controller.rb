# frozen_string_literal: true

module Api
  module V1
    # Controller for AI-powered object detection in images.
    # Provides endpoint for detecting objects and their bounding boxes.
    class DetectionsController < ApplicationController
      # POST /api/v1/detections
      #
      # Detect objects in the provided image using AI vision services.
      #
      # Request body:
      #   {
      #     "image": "base64_encoded_image_string",
      #     "options": {
      #       "max_objects": 10,
      #       "confidence_threshold": 0.5,
      #       "provider": "google"
      #     }
      #   }
      #
      # Response:
      #   {
      #     "success": true,
      #     "request_id": "uuid",
      #     "processing_time_ms": 1250,
      #     "objects": [...],
      #     "provider": "google_vision"
      #   }
      def create
        image = detection_params[:image]
        options = detection_params[:options] || {}

        # Validate required parameters
        if image.blank?
          render json: {
            success: false,
            error: 'Image is required. Please provide a base64-encoded image.'
          }, status: :bad_request
          return
        end

        # Perform detection
        service = Ai::DetectionService.new(provider: options[:provider] || 'google')
        result = service.detect(image, options.to_h.symbolize_keys)

        if result[:success]
          render json: result, status: :ok
        else
          render json: result, status: :unprocessable_entity
        end
      rescue StandardError => e
        Rails.logger.error("[DetectionsController] Error: #{e.message}")
        Rails.logger.error(e.backtrace.first(10).join("\n"))

        render json: {
          success: false,
          error: "Internal server error: #{e.message}"
        }, status: :internal_server_error
      end

      private

      def detection_params
        params.permit(
          :image,
          options: [:max_objects, :confidence_threshold, :provider]
        )
      end
    end
  end
end
