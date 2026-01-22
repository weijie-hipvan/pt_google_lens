module Api
  module V1
    class ShoppingSearchesController < ApplicationController
      # POST /api/v1/shopping_searches
      # Search for products with prices
      def create
        query = params[:query]
        options = shopping_options_params.to_h.symbolize_keys

        if query.blank?
          render json: { success: false, error: "Search query is required" }, status: :bad_request and return
        end

        result = Ai::ShoppingSearchAdapter.search(query: query, options: options)

        if result[:success]
          render json: result, status: :ok
        else
          render json: result, status: :internal_server_error
        end
      rescue StandardError => e
        Rails.logger.error "Shopping Search Error: #{e.message}\n#{e.backtrace.first(5).join("\n")}"
        render json: {
          success: false,
          error: e.message,
          products: [],
          shopping_links: []
        }, status: :internal_server_error
      end

      private

      def shopping_options_params
        params.fetch(:options, {}).permit(:max_results, :language, :country)
      end
    end
  end
end
