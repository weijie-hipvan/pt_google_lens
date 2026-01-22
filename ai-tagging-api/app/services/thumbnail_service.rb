# frozen_string_literal: true

require 'mini_magick'
require 'base64'
require 'securerandom'
require 'fileutils'

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
