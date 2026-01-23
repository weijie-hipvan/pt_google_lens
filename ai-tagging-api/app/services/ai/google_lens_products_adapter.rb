require "base64"
require "faraday"
require "json"

module Ai
  class GoogleLensProductsAdapter
    # SerpApi for Google Lens Products results
    SERPAPI_URL = "https://serpapi.com/search.json"

    # Search for products using Google Lens via SerpApi
    # Requires SERPAPI_KEY environment variable
    # @param image_data [String] Base64 encoded image (with or without data URI prefix) OR image URL
    # @param options [Hash] Additional options (max_results, language, country)
    # @return [Hash] Search results with products array
    def self.search(image_data:, options: {})
      api_key = ENV["SERPAPI_KEY"]
      return fallback_search(image_data: image_data, options: options) unless api_key

      start_time = Process.clock_gettime(Process::CLOCK_MONOTONIC)

      # Default to Singapore for SG-focused searches
      country = options[:country] || "sg"

      # Determine if image_data is a URL or base64
      params = {
        engine: "google_lens",
        type: "products",
        api_key: api_key,
        hl: options[:language] || "en",
        gl: country, # Default to Singapore
        num: options[:max_results] || 10
      }

      # Check if it's a URL (starts with http:// or https://)
      if image_data.match?(/^https?:\/\//)
        params[:url] = image_data
      else
        # Handle base64 with or without data URI prefix
        base64_content = if image_data.include?(",")
                          image_data.split(",").last
        else
                          image_data
        end
        params[:image_base64] = base64_content
      end

      response = Faraday.get(SERPAPI_URL, params)
      end_time = Process.clock_gettime(Process::CLOCK_MONOTONIC)
      processing_time_ms = ((end_time - start_time) * 1000).round

      handle_serpapi_response(response, processing_time_ms, country)
    rescue StandardError => e
      Rails.logger.error "SerpApi Google Lens Products Error: #{e.message}"
      fallback_search(image_data: image_data, options: options)
    end

    private

    def self.handle_serpapi_response(response, processing_time_ms, country = "sg")
      if response.success?
        body = JSON.parse(response.body)

        # Extract products from visual_matches (SerpApi returns products in visual_matches for type: 'products')
        products = (body["visual_matches"] || []).map do |item|
          raw_price = item.dig("price", "value")
          cleaned_price = clean_price(raw_price)

          {
            title: item["title"],
            url: item["link"],
            price: cleaned_price,
            extracted_price: item.dig("price", "extracted_value"),
            currency: item.dig("price", "currency") || detect_currency(raw_price, country),
            image_url: item["image"] || item["thumbnail"],
            merchant: item["source"],
            rating: item["rating"],
            reviews_count: item["reviews"],
            in_stock: item["in_stock"],
            condition: item["condition"],
            source_icon: item["source_icon"]
          }
        end

        {
          success: true,
          request_id: SecureRandom.uuid,
          processing_time_ms: processing_time_ms,
          total_results: products.length,
          products: products,
          shopping_links: [], # Google Lens Products doesn't return shopping links
          source: "serpapi_google_lens_products"
        }
      else
        {
          success: false,
          request_id: SecureRandom.uuid,
          processing_time_ms: processing_time_ms,
          error: "SerpApi request failed: #{response.status}",
          products: [],
          shopping_links: []
        }
      end
    end

    # Fallback search - returns empty results with message
    def self.fallback_search(image_data:, options: {})
      {
        success: false,
        request_id: SecureRandom.uuid,
        processing_time_ms: 0,
        error: "SerpApi key not configured. Please set SERPAPI_KEY environment variable.",
        products: [],
        shopping_links: [],
        source: "fallback"
      }
    end

    def self.clean_price(price_string)
      return nil unless price_string
      # Remove trailing asterisks and other common price indicators
      price_string.to_s.strip.gsub(/\*+$/, "").strip
    end

    def self.detect_currency(price_string, country = "sg")
      return nil unless price_string

      price_str = price_string.to_s.strip

      # Check for SGD first (S$ or Singapore dollar indicators)
      return "SGD" if price_str.match?(/S\$|SGD|Singapore/i)

      # For Singapore context: if country is 'sg' and price contains "$" without USD indicators, default to SGD
      # This handles cases where SerpApi returns "$20" instead of "S$20" for Singapore
      if country == "sg" && price_str.match?(/\$/) && !price_str.match?(/USD|US\$|United States/i)
        return "SGD"
      end

      case price_str
      when /\$/
        "USD"
      when /€/
        "EUR"
      when /£/
        "GBP"
      when /¥/
        "JPY"
      when /₹/
        "INR"
      else
        nil
      end
    end
  end
end
