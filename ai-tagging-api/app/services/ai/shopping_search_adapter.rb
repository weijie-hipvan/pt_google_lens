require "faraday"
require "json"

module Ai
  class ShoppingSearchAdapter
    # SerpApi for Google Shopping results (recommended for production)
    SERPAPI_URL = "https://serpapi.com/search.json"

    # Google Custom Search API (free tier available)
    GOOGLE_CSE_URL = "https://www.googleapis.com/customsearch/v1"

    # Search for products using Google Shopping via SerpApi
    # Requires SERPAPI_KEY environment variable
    def self.search_serpapi(query:, options: {})
      api_key = ENV["SERPAPI_KEY"]

      # Debug logging using puts for immediate output
      puts "=" * 60
      puts "[SerpApi] Starting shopping search"
      puts "[SerpApi] Query: #{query}"
      puts "[SerpApi] SERPAPI_KEY present: #{api_key.present?}"
      puts "[SerpApi] SERPAPI_KEY length: #{api_key&.length || 0}"
      puts "[SerpApi] SERPAPI_KEY first 8 chars: #{api_key&.first(8)}..." if api_key.present?

      unless api_key
        puts "[SerpApi] No SERPAPI_KEY found! Falling back to links."
        return fallback_search(query: query, options: options)
      end

      start_time = Process.clock_gettime(Process::CLOCK_MONOTONIC)

      params = {
        engine: "google_shopping",
        q: query,
        api_key: api_key,
        hl: options[:language] || "en",
        gl: options[:country] || "us",
        num: options[:max_results] || 10
      }

      puts "[SerpApi] Request URL: #{SERPAPI_URL}"
      puts "[SerpApi] Request params (excluding key): #{params.except(:api_key)}"

      response = Faraday.get(SERPAPI_URL, params)
      end_time = Process.clock_gettime(Process::CLOCK_MONOTONIC)
      processing_time_ms = ((end_time - start_time) * 1000).round

      puts "[SerpApi] Response status: #{response.status}"
      puts "[SerpApi] Response time: #{processing_time_ms}ms"
      puts "[SerpApi] Response body preview: #{response.body&.first(500)}..."
      puts "=" * 60

      handle_serpapi_response(response, processing_time_ms, query)
    rescue StandardError => e
      puts "=" * 60
      puts "[SerpApi] ERROR: #{e.class} - #{e.message}"
      puts "[SerpApi] Backtrace: #{e.backtrace&.first(5)&.join("\n")}"
      puts "=" * 60
      fallback_search(query: query, options: options)
    end

    # Fallback: Use Google Custom Search API
    def self.search_google_cse(query:, options: {})
      api_key = ENV["GOOGLE_CLOUD_API_KEY"]
      cx = ENV["GOOGLE_CSE_ID"] # Custom Search Engine ID

      unless api_key && cx
        return {
          success: false,
          error: "Google Custom Search not configured",
          products: []
        }
      end

      start_time = Process.clock_gettime(Process::CLOCK_MONOTONIC)

      params = {
        key: api_key,
        cx: cx,
        q: "#{query} buy price",
        searchType: "image",
        num: options[:max_results] || 10
      }

      response = Faraday.get(GOOGLE_CSE_URL, params)
      end_time = Process.clock_gettime(Process::CLOCK_MONOTONIC)
      processing_time_ms = ((end_time - start_time) * 1000).round

      handle_google_cse_response(response, processing_time_ms, query)
    rescue StandardError => e
      {
        success: false,
        error: e.message,
        products: []
      }
    end

    # Main search method - tries image search first (if image_url provided), then keyword search
    # @param query [String] Search query (keyword)
    # @param image_url [String] Optional original image URL for Google Lens (must be PUBLIC)
    # @param bounding_box [Hash] Optional {x, y, width, height} to crop specific object
    # @param options [Hash] Additional options
    def self.search(query:, image_url: nil, bounding_box: nil, options: {})
      puts "=" * 60
      puts "[ShoppingSearch] search() called"
      puts "[ShoppingSearch] Query: #{query}"
      puts "[ShoppingSearch] Image URL: #{image_url.present? ? image_url.first(50) + '...' : 'nil'}"
      puts "[ShoppingSearch] Bounding Box: #{bounding_box.present? ? bounding_box : 'nil'}"
      puts "=" * 60

      # PRIORITY 1: Try Google Lens image search if image_url provided
      if image_url.present? && ENV["SERPAPI_KEY"].present?
        puts "[ShoppingSearch] -> PRIORITY 1: Trying Google Lens image search..."
        result = search_by_image(image_url: image_url, bounding_box: bounding_box, options: options)

        if result[:success] && result[:products].present?
          puts "[ShoppingSearch] -> Google Lens returned #{result[:products].length} products!"
          return result
        else
          puts "[ShoppingSearch] -> Google Lens returned no products, falling back to keyword search..."
        end
      end

      # PRIORITY 2: Try SerpApi keyword search
      if ENV["SERPAPI_KEY"].present?
        puts "[ShoppingSearch] -> PRIORITY 2: Trying keyword search for '#{query}'..."
        result = search_serpapi(query: query, options: options)
        puts "[ShoppingSearch] -> search_serpapi returned: success=#{result[:success]}, source=#{result[:source]}"
        return result if result[:success]
        puts "[ShoppingSearch] -> search_serpapi failed, falling back..."
      else
        puts "[ShoppingSearch] -> SERPAPI_KEY NOT FOUND! Using fallback."
      end

      # PRIORITY 3: Fallback to shopping links
      puts "[ShoppingSearch] -> PRIORITY 3: Using fallback_search"
      fallback_search(query: query, options: options)
    end

    # Search by image using Google Lens Products API
    # Returns visually similar products - more accurate than keyword search
    # @param image_url [String] Public image URL
    # @param bounding_box [Hash] Optional {x, y, width, height} to crop specific object
    def self.search_by_image(image_url:, bounding_box: nil, options: {})
      puts "[ShoppingSearch] -> Calling GoogleLensProductsAdapter.search..."
      puts "[ShoppingSearch] -> Bounding box: #{bounding_box.present? ? bounding_box : 'full image'}"
      result = Ai::GoogleLensProductsAdapter.search(
        image_url: image_url,
        bounding_box: bounding_box,
        options: options
      )

      # Normalize response format to match our standard
      if result[:success]
        {
          success: true,
          request_id: result[:request_id],
          processing_time_ms: result[:processing_time_ms],
          query: "image_search",
          total_results: result[:total_results],
          products: result[:products],
          source: result[:source] || "google_lens_products",
          search_type: "image"
        }
      else
        result
      end
    rescue StandardError => e
      puts "[ShoppingSearch] -> Google Lens error: #{e.message}"
      { success: false, products: [], error: e.message }
    end

    private

    def self.handle_serpapi_response(response, processing_time_ms, query)
      if response.success?
        body = JSON.parse(response.body)

        products = (body["shopping_results"] || []).map do |item|
          {
            title: item["title"],
            url: item["link"],
            price: item["price"],
            extracted_price: item["extracted_price"],
            currency: detect_currency(item["price"]),
            image_url: item["thumbnail"],
            merchant: item["source"],
            rating: item["rating"],
            reviews_count: item["reviews"],
            shipping: item["delivery"],
            condition: item["second_hand_condition"]
          }
        end

        {
          success: true,
          request_id: SecureRandom.uuid,
          processing_time_ms: processing_time_ms,
          query: query,
          total_results: body["search_information"]&.dig("total_results") || products.length,
          products: products,
          source: "serpapi_google_shopping",
          search_type: "keyword"
        }
      else
        {
          success: false,
          request_id: SecureRandom.uuid,
          processing_time_ms: processing_time_ms,
          error: "SerpApi request failed: #{response.status}",
          products: []
        }
      end
    end

    def self.handle_google_cse_response(response, processing_time_ms, query)
      if response.success?
        body = JSON.parse(response.body)

        products = (body["items"] || []).map do |item|
          {
            title: item["title"],
            url: item["link"],
            image_url: item["image"]&.dig("thumbnailLink"),
            merchant: extract_domain(item["displayLink"]),
            snippet: item["snippet"]
          }
        end

        {
          success: true,
          request_id: SecureRandom.uuid,
          processing_time_ms: processing_time_ms,
          query: query,
          products: products,
          source: "google_cse"
        }
      else
        {
          success: false,
          error: "Google CSE request failed",
          products: []
        }
      end
    end

    # Fallback search using known e-commerce URLs
    def self.fallback_search(query:, options: {})
      encoded_query = ERB::Util.url_encode(query)

      # Generate shopping links for major retailers
      shopping_links = [
        {
          title: "Search on Amazon",
          url: "https://www.amazon.com/s?k=#{encoded_query}",
          merchant: "Amazon",
          logo: "🛒"
        },
        {
          title: "Search on eBay",
          url: "https://www.ebay.com/sch/i.html?_nkw=#{encoded_query}",
          merchant: "eBay",
          logo: "🏷️"
        },
        {
          title: "Search on Wayfair",
          url: "https://www.wayfair.com/keyword.html?keyword=#{encoded_query}",
          merchant: "Wayfair",
          logo: "🏠"
        },
        {
          title: "Search on IKEA",
          url: "https://www.ikea.com/us/en/search/products/?q=#{encoded_query}",
          merchant: "IKEA",
          logo: "🪑"
        },
        {
          title: "Search on Google Shopping",
          url: "https://www.google.com/search?tbm=shop&q=#{encoded_query}",
          merchant: "Google Shopping",
          logo: "🔍"
        },
        {
          title: "Search on Lazada",
          url: "https://www.lazada.sg/catalog/?q=#{encoded_query}",
          merchant: "Lazada",
          logo: "🛍️"
        },
        {
          title: "Search on Shopee",
          url: "https://shopee.sg/search?keyword=#{encoded_query}",
          merchant: "Shopee",
          logo: "🧡"
        },
        {
          title: "Search on HipVan",
          url: "https://www.hipvan.com/search?q=#{encoded_query}",
          merchant: "HipVan",
          logo: "✨"
        }
      ]

      {
        success: true,
        request_id: SecureRandom.uuid,
        processing_time_ms: 0,
        query: query,
        products: [],
        shopping_links: shopping_links,
        source: "fallback_links",
        message: "Direct product search not available. Use the shopping links below to search."
      }
    end

    def self.detect_currency(price_string)
      return nil unless price_string

      case price_string
      when /\$/
        "USD"
      when /€/
        "EUR"
      when /£/
        "GBP"
      when /¥/
        "JPY"
      when /S\$/
        "SGD"
      else
        nil
      end
    end

    def self.extract_domain(url)
      return nil unless url
      url.gsub("www.", "").split(".").first.capitalize
    rescue
      nil
    end
  end
end
