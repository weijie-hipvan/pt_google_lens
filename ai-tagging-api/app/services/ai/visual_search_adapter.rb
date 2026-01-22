require 'base64'
require 'faraday'
require 'json'

module Ai
  class VisualSearchAdapter
    API_URL = "https://vision.googleapis.com/v1/images:annotate"

    # Perform visual search using Google Vision Web Detection
    # This is similar to Google Lens functionality
    def self.search(image_data:, bounding_box: nil, options: {})
      api_key = ENV['GOOGLE_CLOUD_API_KEY']
      raise "Google Cloud API Key not set" unless api_key

      payload = build_payload(image_data, bounding_box, options)
      start_time = Process.clock_gettime(Process::CLOCK_MONOTONIC)

      response = Faraday.post("#{API_URL}?key=#{api_key}") do |req|
        req.headers['Content-Type'] = 'application/json'
        req.body = payload.to_json
      end

      end_time = Process.clock_gettime(Process::CLOCK_MONOTONIC)
      processing_time_ms = ((end_time - start_time) * 1000).round

      handle_response(response, processing_time_ms)
    end

    private

    def self.build_payload(image_data, bounding_box, options)
      # Handle base64 with or without data URI prefix
      base64_content = if image_data.include?(',')
                         image_data.split(',').last
                       else
                         image_data
                       end

      image_context = {}
      
      # If bounding box provided, crop to that region
      if bounding_box
        image_context[:cropHintsParams] = {
          aspectRatios: [
            bounding_box[:width].to_f / bounding_box[:height].to_f
          ]
        }
      end

      {
        requests: [
          {
            image: { content: base64_content },
            features: [
              { type: "WEB_DETECTION", maxResults: options[:max_results] || 20 },
              { type: "PRODUCT_SEARCH", maxResults: 10 },
              { type: "LABEL_DETECTION", maxResults: 10 }
            ],
            imageContext: image_context.empty? ? nil : image_context
          }.compact
        ]
      }
    end

    def self.handle_response(response, processing_time_ms)
      if response.success?
        body = JSON.parse(response.body)
        
        if body['responses']&.first&.dig('error')
          error_msg = body['responses'].first['error']['message']
          {
            success: false,
            request_id: SecureRandom.uuid,
            processing_time_ms: processing_time_ms,
            error: "Google Vision API error: #{error_msg}",
            web_entities: [],
            product_matches: [],
            visually_similar_images: [],
            pages_with_matching_images: []
          }
        else
          normalize_response(body, processing_time_ms)
        end
      else
        {
          success: false,
          request_id: SecureRandom.uuid,
          processing_time_ms: processing_time_ms,
          error: "API request failed with status #{response.status}",
          web_entities: [],
          product_matches: [],
          visually_similar_images: [],
          pages_with_matching_images: []
        }
      end
    end

    def self.normalize_response(raw_response, processing_time_ms)
      response_data = raw_response['responses']&.first || {}
      web_detection = response_data['webDetection'] || {}
      
      # Extract web entities (what Google thinks the image contains)
      web_entities = (web_detection['webEntities'] || []).map do |entity|
        {
          entity_id: entity['entityId'] || SecureRandom.uuid,
          description: entity['description'] || 'Unknown',
          score: entity['score'] || 0
        }
      end.sort_by { |e| -e[:score] }

      # Extract pages with matching images (potential product sources)
      pages_with_matching = (web_detection['pagesWithMatchingImages'] || []).map do |page|
        {
          url: page['url'],
          title: page['pageTitle'] || extract_domain(page['url']),
          thumbnail_url: page['partialMatchingImages']&.first&.dig('url')
        }
      end

      # Extract visually similar images
      similar_images = (web_detection['visuallySimilarImages'] || []).map do |img|
        img['url']
      end.compact

      # Extract full matching images (exact or near-exact matches)
      full_matches = (web_detection['fullMatchingImages'] || []).map do |img|
        img['url']
      end.compact

      # Build product matches from pages (inferring product info from page URLs/titles)
      product_matches = pages_with_matching.map do |page|
        {
          title: page[:title],
          url: page[:url],
          score: calculate_page_relevance_score(page, web_entities),
          image_url: page[:thumbnail_url],
          merchant: extract_merchant(page[:url]),
          price: nil # Would need additional scraping to get price
        }
      end.sort_by { |p| -p[:score] }.first(10)

      # Add labels if available
      labels = (response_data['labelAnnotations'] || []).map do |label|
        {
          description: label['description'],
          score: label['score']
        }
      end

      {
        success: true,
        request_id: SecureRandom.uuid,
        processing_time_ms: processing_time_ms,
        web_entities: web_entities.first(15),
        product_matches: product_matches,
        visually_similar_images: (full_matches + similar_images).uniq.first(10),
        pages_with_matching_images: pages_with_matching.first(15),
        labels: labels.first(10),
        best_guess_labels: web_detection['bestGuessLabels']&.map { |l| l['label'] } || []
      }
    end

    def self.extract_domain(url)
      return 'Unknown' unless url
      uri = URI.parse(url)
      uri.host&.gsub('www.', '') || 'Unknown'
    rescue
      'Unknown'
    end

    def self.extract_merchant(url)
      return nil unless url
      domain = extract_domain(url)
      
      # Known merchants
      merchants = {
        'amazon' => 'Amazon',
        'ebay' => 'eBay',
        'etsy' => 'Etsy',
        'wayfair' => 'Wayfair',
        'ikea' => 'IKEA',
        'target' => 'Target',
        'walmart' => 'Walmart',
        'homedepot' => 'Home Depot',
        'lowes' => "Lowe's",
        'overstock' => 'Overstock',
        'westelm' => 'West Elm',
        'crateandbarrel' => 'Crate & Barrel',
        'potterybarn' => 'Pottery Barn',
        'cb2' => 'CB2',
        'allmodern' => 'AllModern',
        'article' => 'Article',
        'castlery' => 'Castlery',
        'hipvan' => 'HipVan',
        'lazada' => 'Lazada',
        'shopee' => 'Shopee',
        'alibaba' => 'Alibaba',
        'aliexpress' => 'AliExpress',
        'pinterest' => 'Pinterest',
        'houzz' => 'Houzz'
      }

      merchants.each do |key, name|
        return name if domain.downcase.include?(key)
      end

      domain.split('.').first.capitalize
    end

    def self.calculate_page_relevance_score(page, web_entities)
      score = 0.5 # Base score
      
      # Boost score if page title matches web entities
      if page[:title]
        web_entities.each do |entity|
          if page[:title].downcase.include?(entity[:description].to_s.downcase)
            score += entity[:score] * 0.3
          end
        end
      end

      # Boost known e-commerce sites
      ecommerce_domains = %w[amazon ebay etsy wayfair ikea target walmart shopee lazada alibaba hipvan]
      if ecommerce_domains.any? { |d| page[:url].to_s.downcase.include?(d) }
        score += 0.2
      end

      [score, 1.0].min
    end
  end
end
