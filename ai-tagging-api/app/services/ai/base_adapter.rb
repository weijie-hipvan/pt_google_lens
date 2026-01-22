# frozen_string_literal: true

module Ai
  # Base adapter class that defines the interface for all AI vision providers.
  # All adapters must implement the #detect method.
  class BaseAdapter
    def name
      raise NotImplementedError, "#{self.class} must implement #name"
    end

    def detect(image_base64, options = {})
      raise NotImplementedError, "#{self.class} must implement #detect"
    end

    protected

    def generate_request_id
      SecureRandom.uuid
    end

    def measure_time
      start_time = Process.clock_gettime(Process::CLOCK_MONOTONIC)
      result = yield
      end_time = Process.clock_gettime(Process::CLOCK_MONOTONIC)
      elapsed_ms = ((end_time - start_time) * 1000).to_i
      [result, elapsed_ms]
    end
  end
end
