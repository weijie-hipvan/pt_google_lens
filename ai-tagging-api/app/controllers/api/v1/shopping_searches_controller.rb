module Api
  module V1
    class ShoppingSearchesController < ApplicationController
      # POST /api/v1/shopping_searches
      # Search for products with prices
      # Supports both keyword search and image-based search
      # @param query [String] Search keyword (required)
      # @param image_url [String] Original image URL for Google Lens (public URL)
      # @param bounding_box [Hash] Optional {x, y, width, height} to crop specific object (normalized 0-1)
      # @param image_dimensions [Hash] Optional {width, height} actual image dimensions for accurate crop calculation
      def create
        query = params[:query]
        image_url = params[:image_url]  # Original image URL for Google Lens (must be PUBLIC)
        bounding_box = params[:bounding_box].present? ? params[:bounding_box].permit(:x, :y, :width, :height).to_h.symbolize_keys : nil
        image_dimensions = params[:image_dimensions].present? ? params[:image_dimensions].permit(:width, :height).to_h.symbolize_keys : nil
        options = shopping_options_params.to_h.symbolize_keys
        
        puts "=" * 60
        puts "[Controller] ShoppingSearchesController#create called!"
        puts "[Controller] Query: #{query.presence || '(empty)'}"
        puts "[Controller] Image URL: #{image_url.present? ? image_url.first(80) + '...' : 'nil'}"
        puts "[Controller] Bounding Box: #{bounding_box.present? ? bounding_box : 'nil'}"
        puts "[Controller] Image Dimensions: #{image_dimensions.present? ? image_dimensions : 'nil (will estimate)'}"
        puts "=" * 60

        # Either query OR image_url is required
        if query.blank? && image_url.blank?
          render json: { success: false, error: "Either search query or image_url is required" }, status: :bad_request and return
        end

        puts "[Controller] Calling Ai::ShoppingSearchAdapter.search..."
        result = Ai::ShoppingSearchAdapter.search(
          query: query,
          image_url: image_url,               # Pass original image URL (must be public)
          bounding_box: bounding_box,         # Pass bounding box for cropping (normalized 0-1)
          image_dimensions: image_dimensions, # Pass actual image dimensions for accurate crop
          options: options
        )
        puts "[Controller] Result success: #{result[:success]}, source: #{result[:source]}, search_type: #{result[:search_type]}"

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
