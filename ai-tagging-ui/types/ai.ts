/**
 * Bounding box coordinates (normalized 0-1)
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Attribute value with confidence score
 */
export interface AttributeValue {
  value: string;
  confidence: number;
}

/**
 * Detected object from AI vision API
 */
export interface DetectedObject {
  id: string;
  label: string;
  confidence: number;
  bounding_box: BoundingBox;
  attributes?: Record<string, AttributeValue>;
  status: 'pending' | 'accepted' | 'rejected';
}

/**
 * Input for detection API
 */
export interface DetectInput {
  image: string; // base64 encoded image
  options?: {
    max_objects?: number;
    confidence_threshold?: number;
    provider?: 'google' | 'openai' | 'auto';
  };
}

/**
 * Response from detection API
 */
export interface DetectResult {
  success: boolean;
  request_id: string;
  processing_time_ms: number;
  objects: DetectedObject[];
  scene?: {
    type: string;
    confidence: number;
  };
  provider: string;
  error?: string;
}

/**
 * Image dimensions for canvas rendering
 */
export interface ImageDimensions {
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
}

/**
 * Export data format
 */
export interface ExportData {
  exported_at: string;
  image_dimensions: {
    width: number;
    height: number;
  } | null;
  total_objects: number;
  objects: Array<{
    label: string;
    confidence: number;
    bounding_box: BoundingBox;
    attributes?: Record<string, AttributeValue>;
  }>;
}
