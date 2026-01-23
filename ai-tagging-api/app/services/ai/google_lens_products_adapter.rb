require "faraday"
require "json"

module Ai
  class GoogleLensProductsAdapter
    # SerpApi for Google Lens Products results
    SERPAPI_URL = "https://serpapi.com/search.json"

    # Search for products using Google Lens via SerpApi
    # Requires SERPAPI_KEY environment variable
    # @param image_url [String] Public image URL (must be publicly accessible)
    # @param bounding_box [Hash] Optional {x, y, width, height} normalized (0-1) to crop specific object
    # @param image_dimensions [Hash] Optional {width, height} actual image dimensions for accurate crop calculation
    # @param options [Hash] Additional options (max_results, language, country)
    # @return [Hash] Search results with products array
    def self.search(image_url:, bounding_box: nil, image_dimensions: nil, options: {})
      api_key = ENV["SERPAPI_KEY"]
      country = "sg"

      return fallback_search(image_url: image_url, options: options) unless api_key

      # Validate URL format
      unless image_url.match?(/^https?:\/\//)
        return {
          success: false,
          request_id: SecureRandom.uuid,
          error: "Invalid image URL. Must be a valid HTTP/HTTPS URL.",
          products: [],
          shopping_links: []
        }
      end

      # IMPORTANT: SerpApi needs a PUBLICLY accessible URL
      # localhost URLs won't work
      if image_url.include?("localhost") || image_url.include?("127.0.0.1")
        puts "[GoogleLens] ⚠️ Local URL detected: #{image_url}"
        puts "[GoogleLens] -> Skipping image search (SerpApi can't access localhost)"
        return {
          success: false,
          request_id: SecureRandom.uuid,
          error: "Local URL not accessible by SerpApi. URL must be publicly accessible.",
          products: [],
          shopping_links: []
        }
      end

      start_time = Process.clock_gettime(Process::CLOCK_MONOTONIC)

      # Build SerpApi parameters
      params = {
        engine: "google_lens",
        type: "products",
        api_key: api_key,
        hl: options[:language] || "en",
        gl: "sg", # Default to Singapore
        country: "sg",
        num: options[:max_results] || 10
      }

      # Handle bounding box cropping for imgix URLs
      if bounding_box.present? && is_imgix_url?(image_url)
        puts "[GoogleLens] Bounding box provided: #{bounding_box}"
        puts "[GoogleLens] Image dimensions: #{image_dimensions.present? ? image_dimensions : 'nil (will estimate)'}"
        puts "[GoogleLens] -> Using imgix server-side crop"
        cropped_url = build_imgix_crop_url(image_url, bounding_box, image_dimensions)
        params[:url] = cropped_url
        puts "[GoogleLens] -> Cropped URL: #{cropped_url.first(100)}..."
      else
        params[:url] = image_url
        puts "[GoogleLens] Using public URL: #{image_url}"
      end

      puts "[GoogleLens] Calling SerpApi..."
      puts "[GoogleLens] Params: #{params.to_json}"

      response = Faraday.get(SERPAPI_URL, params) do |req|
        req.options.timeout = 60
      end
      end_time = Process.clock_gettime(Process::CLOCK_MONOTONIC)
      processing_time_ms = ((end_time - start_time) * 1000).round

      puts "[GoogleLens] Response status: #{response.status}"
      puts "[GoogleLens] Response time: #{processing_time_ms}ms"

      # Debug: show error if not success
      if response.status != 200
        body = JSON.parse(response.body) rescue {}
        puts "[GoogleLens] ❌ ERROR Response: #{body["error"] || response.body.first(500)}"
      end

      result = handle_serpapi_response(response, processing_time_ms, country)
      puts "[GoogleLens] Products found: #{result[:products]&.length || 0}"

      result
    rescue StandardError => e
      Rails.logger.error "SerpApi Google Lens Products Error: #{e.message}"
      puts "[GoogleLens] ❌ ERROR: #{e.message}"
      fallback_search(image_url: image_url, options: options)
    end

    # Check if URL is an imgix URL
    def self.is_imgix_url?(url)
      url.include?("imgix.net")
    end

    # Build imgix URL with crop parameters
    # @param url [String] Original imgix URL
    # @param bounding_box [Hash] {x, y, width, height} normalized (0-1)
    # @param image_dimensions [Hash] Optional {width, height} actual image dimensions
    # @return [String] Cropped imgix URL
    def self.build_imgix_crop_url(url, bounding_box, image_dimensions = nil)
      uri = URI.parse(url)
      params = URI.decode_www_form(uri.query || "").to_h

      # imgix rect format: rect=x,y,w,h (in pixels)
      # The bounding_box is normalized (0-1) relative to the DISPLAYED image
      # We need to convert to pixels relative to the original rect or actual image dimensions

      orig_rect = params["rect"]

      if orig_rect
        # URL already has a rect - bounding box is relative to this cropped area
        orig_x, orig_y, orig_w, orig_h = orig_rect.split(",").map(&:to_i)
        puts "[imgix] Original rect: x=#{orig_x}, y=#{orig_y}, w=#{orig_w}, h=#{orig_h}"

        # Calculate new crop within the existing rect
        crop_x = orig_x + (bounding_box[:x].to_f * orig_w).to_i
        crop_y = orig_y + (bounding_box[:y].to_f * orig_h).to_i
        crop_w = (bounding_box[:width].to_f * orig_w).to_i
        crop_h = (bounding_box[:height].to_f * orig_h).to_i
      elsif image_dimensions.present?
        # Use actual image dimensions from client (most accurate!)
        img_width = image_dimensions[:width].to_i
        img_height = image_dimensions[:height].to_i

        puts "[imgix] Using actual image dimensions: #{img_width}x#{img_height}"

        crop_x = (bounding_box[:x].to_f * img_width).to_i
        crop_y = (bounding_box[:y].to_f * img_height).to_i
        crop_w = (bounding_box[:width].to_f * img_width).to_i
        crop_h = (bounding_box[:height].to_f * img_height).to_i
      else
        # No rect and no dimensions - fallback to estimates (less accurate)
        render_width = (params["w"]&.to_i || 1000) * (params["dpr"]&.to_i || 1)
        render_height = (render_width * 1.5).to_i  # Estimate aspect ratio

        puts "[imgix] ⚠️ No dimensions provided, estimating: #{render_width}x#{render_height}"

        crop_x = (bounding_box[:x].to_f * render_width).to_i
        crop_y = (bounding_box[:y].to_f * render_height).to_i
        crop_w = (bounding_box[:width].to_f * render_width).to_i
        crop_h = (bounding_box[:height].to_f * render_height).to_i
      end

      puts "[imgix] New crop: x=#{crop_x}, y=#{crop_y}, w=#{crop_w}, h=#{crop_h}"

      # Update params for cropped image
      params["rect"] = "#{crop_x},#{crop_y},#{crop_w},#{crop_h}"
      params["w"] = [ crop_w, 500 ].min.to_s  # Limit width to 500px for faster loading
      params.delete("dpr")  # Remove dpr since we're setting explicit size
      params.delete("fit")  # Remove fit since rect handles cropping

      # Rebuild URL
      uri.query = URI.encode_www_form(params)
      final_url = uri.to_s
      puts "[imgix] Final URL: #{final_url}"
      final_url
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
    def self.fallback_search(image_url:, options: {})
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
