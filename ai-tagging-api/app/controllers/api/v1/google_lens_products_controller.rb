module Api
  module V1
    class GoogleLensProductsController < ApplicationController
      # POST /api/v1/google_lens_products
      # Search for products using Google Lens (image-based product search)
      # @param image_url [String] Public image URL (required)
      # @param bounding_box [Hash] Optional {x, y, width, height} normalized (0-1) to crop specific object
      def create
        image_url = params[:image_url] || params[:image] # Support both for backward compatibility
        bounding_box = params[:bounding_box].present? ? params[:bounding_box].permit(:x, :y, :width, :height).to_h.symbolize_keys : nil
        options = google_lens_products_options_params.to_h.symbolize_keys

        if image_url.blank?
          render json: { success: false, error: "Image URL is required" }, status: :bad_request and return
        end

        result = Ai::GoogleLensProductsAdapter.search(image_url: image_url, bounding_box: bounding_box, options: options)

        if result[:success]
          render json: result, status: :ok
        else
          render json: result, status: :internal_server_error
        end
      rescue StandardError => e
        Rails.logger.error "Google Lens Products Error: #{e.message}\n#{e.backtrace.first(5).join("\n")}"
        render json: {
          success: false,
          error: e.message,
          products: [],
          shopping_links: []
        }, status: :internal_server_error
      end

      private

      def google_lens_products_options_params
        params.fetch(:options, {}).permit(:max_results, :language)
      end
    end
  end
end
