# frozen_string_literal: true

require 'mini_magick'
require 'base64'
require 'securerandom'
require 'fileutils'
require 'open-uri'

# Service to generate thumbnails for detected objects
# Crops objects from the original image based on bounding boxes
class ThumbnailService
  THUMBNAILS_DIR = Rails.root.join("public", "thumbnails")
  MIN_THUMBNAIL_SIZE = 100
  MAX_THUMBNAIL_SIZE = 400

  def initialize(base_url: nil)
    @base_url = base_url || ENV.fetch('BASE_URL', 'http://localhost:3001')
    ensure_thumbnails_directory
  end

  # Generate thumbnails for all detected objects
  #
  # @param image_data [String] Base64 encoded image or image path
  # @param objects [Array<Hash>] Array of detected objects with bounding_box
  # @param image_dimensions [Hash] Original image dimensions { width:, height: }
  # @return [Array<Hash>] Objects with thumbnail_url added
  def generate_thumbnails(image_data:, objects:, image_dimensions:)
    return objects if objects.blank?

    # Decode base64 image to temp file
    temp_image_path = save_temp_image(image_data)
    return objects unless temp_image_path

    begin
      objects.map do |obj|
        generate_object_thumbnail(temp_image_path, obj, image_dimensions)
      end
    ensure
      # Clean up temp file
      FileUtils.rm_f(temp_image_path) if temp_image_path && File.exist?(temp_image_path)
    end
  end

  # Generate thumbnails from an image URL
  #
  # @param image_url [String] URL of the source image
  # @param objects [Array<Hash>] Array of detected objects with bounding_box
  # @return [Hash] { objects: Array<Hash>, image_dimensions: Hash } - Objects with thumbnail_url and image dimensions
  def generate_thumbnails_from_url(image_url:, objects:)
    if objects.blank? || image_url.blank?
      return { objects: objects, image_dimensions: nil }
    end

    # Download image to temp file
    temp_image_path = download_image(image_url)
    return { objects: objects, image_dimensions: nil } unless temp_image_path

    begin
      # Get image dimensions from downloaded file
      image = MiniMagick::Image.open(temp_image_path)
      image_dimensions = { width: image.width, height: image.height }
      
      Rails.logger.info("[ThumbnailService] Downloaded image: #{image.width}x#{image.height}")

      processed_objects = objects.map do |obj|
        generate_object_thumbnail(temp_image_path, obj, image_dimensions)
      end

      { objects: processed_objects, image_dimensions: image_dimensions }
    rescue StandardError => e
      Rails.logger.error("[ThumbnailService] Error processing image from URL: #{e.message}")
      { objects: objects, image_dimensions: nil }
    ensure
      # Clean up temp file
      FileUtils.rm_f(temp_image_path) if temp_image_path && File.exist?(temp_image_path)
    end
  end

  # Generate a single thumbnail for one object
  #
  # @param image_path [String] Path to source image
  # @param obj [Hash] Object with bounding_box
  # @param image_dimensions [Hash] Original image dimensions
  # @return [Hash] Object with thumbnail_url added
  def generate_object_thumbnail(image_path, obj, image_dimensions)
    bounding_box = obj[:bounding_box] || obj['bounding_box']
    
    if bounding_box.nil? || bounding_box.empty?
      return obj.merge(thumbnail_url: nil)
    end

    begin
      # Convert normalized coordinates (0-1) to pixel coordinates
      crop = calculate_crop_area(bounding_box, image_dimensions)
      
      # Skip invalid crops
      if crop[:width] <= 0 || crop[:height] <= 0
        return obj.merge(thumbnail_url: nil)
      end

      # Generate unique filename
      object_id = obj[:id] || obj['id'] || SecureRandom.hex(4)
      thumbnail_filename = "thumb_#{Time.current.to_i}_#{SecureRandom.hex(6)}_#{object_id}.jpg"
      thumbnail_path = THUMBNAILS_DIR.join(thumbnail_filename)

      # Process image with MiniMagick
      image = MiniMagick::Image.open(image_path)
      
      # Crop the region
      image.crop("#{crop[:width]}x#{crop[:height]}+#{crop[:x]}+#{crop[:y]}")
      
      # Resize if too small (for better visibility)
      if crop[:width] < MIN_THUMBNAIL_SIZE || crop[:height] < MIN_THUMBNAIL_SIZE
        scale = [MIN_THUMBNAIL_SIZE.to_f / crop[:width], MIN_THUMBNAIL_SIZE.to_f / crop[:height]].max
        new_width = [crop[:width] * scale, MAX_THUMBNAIL_SIZE].min.to_i
        new_height = [crop[:height] * scale, MAX_THUMBNAIL_SIZE].min.to_i
        image.resize("#{new_width}x#{new_height}")
      elsif crop[:width] > MAX_THUMBNAIL_SIZE || crop[:height] > MAX_THUMBNAIL_SIZE
        # Resize if too large
        image.resize("#{MAX_THUMBNAIL_SIZE}x#{MAX_THUMBNAIL_SIZE}>")
      end
      
      # Convert to JPG and save
      image.format("jpg")
      image.quality(85)
      image.write(thumbnail_path.to_s)

      # Generate URL
      thumbnail_url = "#{@base_url}/thumbnails/#{thumbnail_filename}"

      Rails.logger.info("[ThumbnailService] Generated thumbnail: #{thumbnail_filename}")
      
      obj.merge(thumbnail_url: thumbnail_url)
    rescue MiniMagick::Error => e
      Rails.logger.error("[ThumbnailService] MiniMagick error for #{obj[:id]}: #{e.message}")
      obj.merge(thumbnail_url: nil)
    rescue StandardError => e
      Rails.logger.error("[ThumbnailService] Error generating thumbnail: #{e.message}")
      obj.merge(thumbnail_url: nil)
    end
  end

  # Clean up old thumbnails (older than 24 hours)
  def cleanup_old_thumbnails(max_age_hours: 24)
    return unless THUMBNAILS_DIR.exist?

    cutoff_time = Time.current - max_age_hours.hours
    deleted_count = 0

    Dir.glob(THUMBNAILS_DIR.join("thumb_*.jpg")).each do |file|
      if File.mtime(file) < cutoff_time
        FileUtils.rm_f(file)
        deleted_count += 1
      end
    end

    Rails.logger.info("[ThumbnailService] Cleaned up #{deleted_count} old thumbnails")
    deleted_count
  end

  private

  def ensure_thumbnails_directory
    FileUtils.mkdir_p(THUMBNAILS_DIR) unless THUMBNAILS_DIR.exist?
  end

  # Save base64 image to temporary file
  def save_temp_image(image_data)
    return image_data if File.exist?(image_data.to_s)

    begin
      # Handle data URI format
      base64_data = if image_data.include?(',')
                      image_data.split(',').last
                    else
                      image_data
                    end

      decoded = Base64.decode64(base64_data)
      
      temp_path = Rails.root.join("tmp", "temp_#{Time.current.to_i}_#{SecureRandom.hex(4)}.jpg")
      FileUtils.mkdir_p(File.dirname(temp_path))
      
      File.binwrite(temp_path, decoded)
      temp_path.to_s
    rescue StandardError => e
      Rails.logger.error("[ThumbnailService] Failed to save temp image: #{e.message}")
      nil
    end
  end

  # Download image from URL to temporary file
  def download_image(image_url)
    begin
      temp_path = Rails.root.join("tmp", "download_#{Time.current.to_i}_#{SecureRandom.hex(4)}.jpg")
      FileUtils.mkdir_p(File.dirname(temp_path))

      Rails.logger.info("[ThumbnailService] Downloading image from: #{image_url}")

      # Download with timeout and proper headers
      URI.open(
        image_url,
        "User-Agent" => "Mozilla/5.0 (compatible; AITaggingBot/1.0)",
        read_timeout: 30,
        open_timeout: 10
      ) do |remote_file|
        File.binwrite(temp_path, remote_file.read)
      end

      Rails.logger.info("[ThumbnailService] Downloaded to: #{temp_path}")
      temp_path.to_s
    rescue OpenURI::HTTPError => e
      Rails.logger.error("[ThumbnailService] HTTP error downloading image: #{e.message}")
      nil
    rescue StandardError => e
      Rails.logger.error("[ThumbnailService] Failed to download image: #{e.message}")
      nil
    end
  end

  # Convert normalized bounding box (0-1) to pixel coordinates
  def calculate_crop_area(bounding_box, image_dimensions)
    # Handle both symbol and string keys
    box_x = bounding_box[:x] || bounding_box['x'] || 0
    box_y = bounding_box[:y] || bounding_box['y'] || 0
    box_w = bounding_box[:width] || bounding_box['width'] || 0
    box_h = bounding_box[:height] || bounding_box['height'] || 0

    img_width = image_dimensions[:width] || image_dimensions['width'] || 1
    img_height = image_dimensions[:height] || image_dimensions['height'] || 1

    # If values are already in pixels (> 1), use them directly
    # Otherwise, treat as normalized (0-1) and convert
    if box_x <= 1 && box_y <= 1 && box_w <= 1 && box_h <= 1
      {
        x: (box_x * img_width).to_i,
        y: (box_y * img_height).to_i,
        width: (box_w * img_width).to_i,
        height: (box_h * img_height).to_i
      }
    else
      {
        x: box_x.to_i,
        y: box_y.to_i,
        width: box_w.to_i,
        height: box_h.to_i
      }
    end
  end
end
