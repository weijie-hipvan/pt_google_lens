module Api
  module V1
    class VisualSearchesController < ApplicationController
      # Disable parameter wrapping for JSON requests
      wrap_parameters false

      # POST /api/v1/visual_searches
      # Search for similar products/images using Google Vision Web Detection
      def create
        image_data = params[:image]
        image_url = params[:image_url]
        bounding_box = params[:bounding_box]
        options = visual_search_options_params.to_h.symbolize_keys

        if image_data.blank? && image_url.blank?
          render json: { success: false, error: "Image is required. Provide either 'image' (base64) or 'image_url'" }, status: :bad_request and return
        end

        # Parse bounding box if provided
        bbox = nil
        if bounding_box.present?
          bbox = {
            x: bounding_box[:x].to_f,
            y: bounding_box[:y].to_f,
            width: bounding_box[:width].to_f,
            height: bounding_box[:height].to_f
          }
        end

        # Use URL or base64 depending on what's provided
        result = if image_url.present?
          Ai::VisualSearchAdapter.search_from_url(
            image_url: image_url,
            bounding_box: bbox,
            options: options
          )
        else
          Ai::VisualSearchAdapter.search(
            image_data: image_data,
            bounding_box: bbox,
            options: options
          )
        end

        if result[:success]
          render json: result, status: :ok
        else
          render json: result, status: :internal_server_error
        end
      rescue StandardError => e
        Rails.logger.error "Visual Search Error: #{e.message}\n#{e.backtrace.first(5).join("\n")}"
        render json: {
          success: false,
          error: e.message,
          web_entities: [],
          product_matches: [],
          visually_similar_images: [],
          pages_with_matching_images: []
        }, status: :internal_server_error
      end

      private

      def visual_search_options_params
        params.fetch(:options, {}).permit(:max_results)
      end
    end
  end
end
