# frozen_string_literal: true

module Api
  module V1
    # Controller for AI-powered object detection in images.
    # Provides endpoint for detecting objects and their bounding boxes.
    class DetectionsController < ApplicationController
      # Disable parameter wrapping for JSON requests
      wrap_parameters false

      # POST /api/v1/detections
      #
      # Detect objects in the provided image using AI vision services.
      #
      # Request body (option 1 - base64):
      #   {
      #     "image": "base64_encoded_image_string",
      #     "options": { "max_objects": 10, "provider": "google" }
      #   }
      #
      # Request body (option 2 - URL):
      #   {
      #     "image_url": "https://example.com/image.jpg",
      #     "provider": "google_vision"
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
        image = params[:image]
        image_url = params[:image_url]
        provider = params[:provider] || params.dig(:options, :provider) || 'google_vision'
        options = params[:options].present? ? params[:options].permit!.to_h.symbolize_keys : {}
        
        # Handle image_dimensions - convert to hash safely
        image_dimensions = if params[:image_dimensions].present?
                             params[:image_dimensions].permit(:width, :height).to_h.symbolize_keys
                           end

        # Validate required parameters - need either image or image_url
        if image.blank? && image_url.blank?
          render json: {
            success: false,
            error: 'Image is required. Please provide either a base64-encoded image or an image_url.'
          }, status: :bad_request
          return
        end

        # Perform detection
        service = Ai::DetectionService.new(provider: provider)
        
        # Use URL or base64 depending on what's provided
        if image_url.present?
          result = service.detect_from_url(image_url, options)
        else
          result = service.detect(image, options)
        end

        if result[:success] && result[:objects].present?
          # Generate thumbnails for detected objects
          thumbnail_service = ThumbnailService.new(base_url: request.base_url)
          
          if image_url.present?
            # Generate thumbnails from URL (downloads image, extracts dimensions automatically)
            result[:objects] = thumbnail_service.generate_thumbnails_from_url(
              image_url: image_url,
              objects: result[:objects]
            )
          elsif image.present? && image_dimensions.present?
            # Generate thumbnails from base64 image with provided dimensions
            result[:objects] = thumbnail_service.generate_thumbnails(
              image_data: image,
              objects: result[:objects],
              image_dimensions: image_dimensions
            )
          end

          render json: result, status: :ok
        elsif result[:success]
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
          options: [:max_objects, :confidence_threshold, :provider],
          image_dimensions: [:width, :height]
        )
      end
    end
  end
end
