module Api
  module V1
    class GoogleLensProductsController < ApplicationController
      # POST /api/v1/google_lens_products
      # Search for products using Google Lens (image-based product search)
      def create
        image_data = params[:image]
        options = google_lens_products_options_params.to_h.symbolize_keys

        if image_data.blank?
          render json: { success: false, error: "Image data is required" }, status: :bad_request and return
        end

        result = Ai::GoogleLensProductsAdapter.search(image_data: image_data, options: options)

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
        params.fetch(:options, {}).permit(:max_results, :language, :country)
      end
    end
  end
end
