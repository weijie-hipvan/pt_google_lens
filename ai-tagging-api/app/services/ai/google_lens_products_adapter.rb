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
    # @param bounding_box [Hash] Optional {x, y, width, height} normalized (0-1) to crop specific object
    # @param options [Hash] Additional options (max_results, language, country)
    # @return [Hash] Search results with products array
    def self.search(image_data:, bounding_box: nil, options: {})
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
        # IMPORTANT: SerpApi needs a PUBLICLY accessible URL
        # localhost URLs won't work
        if image_data.include?("localhost") || image_data.include?("127.0.0.1")
          puts "[GoogleLens] ⚠️ Local URL detected: #{image_data}"
          puts "[GoogleLens] -> Skipping image search (SerpApi can't access localhost)"
          return { success: false, products: [], error: "Local URL not accessible by SerpApi" }
        end
        
        # If bounding box provided, try to use imgix server-side cropping first
        if bounding_box.present?
          puts "[GoogleLens] Bounding box provided: #{bounding_box}"
          
          if is_imgix_url?(image_data)
            # Use imgix server-side cropping (best approach - no download needed!)
            puts "[GoogleLens] -> Using imgix server-side crop"
            cropped_url = build_imgix_crop_url(image_data, bounding_box)
            params[:url] = cropped_url
            puts "[GoogleLens] -> Cropped URL: #{cropped_url.first(100)}..."
          else
            # Non-imgix URL: download, crop locally, and use base64
            puts "[GoogleLens] -> Non-imgix URL, downloading and cropping locally..."
            cropped_base64 = download_and_crop_image(image_data, bounding_box)
            if cropped_base64 && cropped_base64.length < 30000  # Only use base64 if small enough
              params[:image_base64] = cropped_base64
              puts "[GoogleLens] -> Cropped image ready (#{cropped_base64.length} chars)"
            else
              puts "[GoogleLens] -> Cropped image too large or failed, using full URL"
              params[:url] = image_data
            end
          end
        else
          params[:url] = image_data
          puts "[GoogleLens] Using public URL (full image): #{image_data}"
        end
      else
        # Handle base64 with or without data URI prefix
        base64_content = if image_data.include?(",")
                          image_data.split(",").last
        else
                          image_data
        end
        params[:image_base64] = base64_content
        puts "[GoogleLens] Using base64 image (#{base64_content.length} chars)"
      end

      puts "[GoogleLens] Calling SerpApi..."
      puts "[GoogleLens] Params: engine=#{params[:engine]}, type=#{params[:type]}, url?=#{params[:url].present?}, base64?=#{params[:image_base64].present?}"
      
      # SerpApi uses GET for all requests, but large base64 images may fail
      # For cropped images, try to keep them small by reducing quality
      response = Faraday.get(SERPAPI_URL, params) do |req|
        req.options.timeout = 60  # Increase timeout for large images
      end
      end_time = Process.clock_gettime(Process::CLOCK_MONOTONIC)
      processing_time_ms = ((end_time - start_time) * 1000).round

      puts "[GoogleLens] Response status: #{response.status}"
      puts "[GoogleLens] Response time: #{processing_time_ms}ms"
      
      # Debug: show error if not success
      if response.status != 200
        body = JSON.parse(response.body) rescue {}
        puts "[GoogleLens] ❌ ERROR Response: #{body['error'] || response.body.first(500)}"
      end
      
      result = handle_serpapi_response(response, processing_time_ms, country)
      puts "[GoogleLens] Products found: #{result[:products]&.length || 0}"
      
      result
    rescue StandardError => e
      Rails.logger.error "SerpApi Google Lens Products Error: #{e.message}"
      puts "[GoogleLens] ❌ ERROR: #{e.message}"
      fallback_search(image_data: image_data, options: options)
    end
    
    # Download image from URL and crop to bounding box
    # @param url [String] Public image URL
    # @param bounding_box [Hash] {x, y, width, height} normalized (0-1)
    # @return [String] Base64 encoded cropped image, or nil on failure
    def self.download_and_crop_image(url, bounding_box)
      require 'mini_magick'
      require 'open-uri'
      
      # Download image
      puts "[GoogleLens] -> Downloading from: #{url}"
      temp_file = Tempfile.new(['google_lens_crop', '.jpg'])
      
      URI.open(url, "User-Agent" => "Mozilla/5.0") do |remote_file|
        temp_file.binmode
        temp_file.write(remote_file.read)
        temp_file.rewind
      end
      
      # Open with MiniMagick
      image = MiniMagick::Image.open(temp_file.path)
      img_width = image.width
      img_height = image.height
      
      puts "[GoogleLens] -> Image size: #{img_width}x#{img_height}"
      
      # Convert normalized coordinates (0-1) to pixels
      x = (bounding_box[:x].to_f * img_width).to_i
      y = (bounding_box[:y].to_f * img_height).to_i
      width = (bounding_box[:width].to_f * img_width).to_i
      height = (bounding_box[:height].to_f * img_height).to_i
      
      puts "[GoogleLens] -> Crop region: #{x},#{y} #{width}x#{height}"
      
      # Crop the image
      image.crop("#{width}x#{height}+#{x}+#{y}")
      
      # Resize if too large (keep under 500px for smaller base64)
      max_dimension = 500
      if width > max_dimension || height > max_dimension
        image.resize("#{max_dimension}x#{max_dimension}>")
        puts "[GoogleLens] -> Resized to fit #{max_dimension}px"
      end
      
      image.format("jpg")
      image.quality(70)  # Lower quality for smaller file size
      
      # Convert to base64
      cropped_data = File.binread(image.path)
      Base64.strict_encode64(cropped_data)
    rescue StandardError => e
      puts "[GoogleLens] -> Error cropping image: #{e.message}"
      nil
    ensure
      temp_file&.close
      temp_file&.unlink
    end
    
    # Check if URL is an imgix URL
    def self.is_imgix_url?(url)
      url.include?("imgix.net")
    end
    
    # Build imgix URL with crop parameters
    # @param url [String] Original imgix URL
    # @param bounding_box [Hash] {x, y, width, height} normalized (0-1)
    # @return [String] Cropped imgix URL
    def self.build_imgix_crop_url(url, bounding_box)
      uri = URI.parse(url)
      params = URI.decode_www_form(uri.query || "").to_h
      
      # imgix rect format: rect=x,y,w,h (in pixels)
      # The bounding_box is normalized (0-1) relative to the DISPLAYED image
      # We need to convert to pixels relative to the original rect
      
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
      else
        # No rect - use rendered dimensions (w * dpr) as reference
        render_width = (params["w"]&.to_i || 1000) * (params["dpr"]&.to_i || 1)
        render_height = (render_width * 1.5).to_i  # Estimate aspect ratio
        
        puts "[imgix] No original rect, using render size: #{render_width}x#{render_height}"
        
        crop_x = (bounding_box[:x].to_f * render_width).to_i
        crop_y = (bounding_box[:y].to_f * render_height).to_i
        crop_w = (bounding_box[:width].to_f * render_width).to_i
        crop_h = (bounding_box[:height].to_f * render_height).to_i
      end
      
      puts "[imgix] New crop: x=#{crop_x}, y=#{crop_y}, w=#{crop_w}, h=#{crop_h}"
      
      # Update params for cropped image
      params["rect"] = "#{crop_x},#{crop_y},#{crop_w},#{crop_h}"
      params["w"] = [crop_w, 500].min.to_s  # Limit width to 500px for faster loading
      params.delete("dpr")  # Remove dpr since we're setting explicit size
      params.delete("fit")  # Remove fit since rect handles cropping
      
      # Rebuild URL
      uri.query = URI.encode_www_form(params)
      final_url = uri.to_s
      puts "[imgix] Final URL: #{final_url}"
      final_url
    end
    
    # Convert a localhost URL to base64 by reading the local file
    def self.convert_local_url_to_base64(url)
      # Extract the path from URL (e.g., /thumbnails/thumb_xxx.jpg)
      uri = URI.parse(url)
      local_path = Rails.root.join("public", uri.path.sub(/^\//, ""))
      
      puts "[GoogleLens] -> Looking for local file: #{local_path}"
      
      if File.exist?(local_path)
        file_content = File.binread(local_path)
        Base64.strict_encode64(file_content)
      else
        puts "[GoogleLens] -> File not found!"
        nil
      end
    rescue StandardError => e
      puts "[GoogleLens] -> Error reading file: #{e.message}"
      nil
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
