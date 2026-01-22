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
  thumbnail_url?: string; // Cropped thumbnail of the object
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
  image_dimensions?: {
    width: number;
    height: number;
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
    bounding_box_pixels?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    attributes?: Record<string, AttributeValue>;
    thumbnail_url?: string;
  }>;
}

/**
 * Product match from Google Lens/Vision
 */
export interface ProductMatch {
  title: string;
  url: string;
  score: number;
  image_url?: string;
  price?: string;
  merchant?: string;
}

/**
 * Web entity from Google Vision
 */
export interface WebEntity {
  entity_id: string;
  description: string;
  score: number;
}

/**
 * Visual search result (Google Lens style)
 */
export interface VisualSearchResult {
  success: boolean;
  request_id: string;
  processing_time_ms: number;
  web_entities: WebEntity[];
  product_matches: ProductMatch[];
  visually_similar_images: string[];
  pages_with_matching_images: Array<{
    url: string;
    title: string;
    thumbnail_url?: string;
  }>;
  error?: string;
}

/**
 * Shopping link for fallback search
 */
export interface ShoppingLink {
  title: string;
  url: string;
  merchant: string;
  logo: string;
}

/**
 * Product from shopping search
 */
export interface ShoppingProduct {
  title: string;
  url: string;
  price?: string;
  extracted_price?: number;
  currency?: string;
  image_url?: string;
  merchant?: string;
  rating?: number;
  reviews_count?: number;
  shipping?: string;
  condition?: string;
}

/**
 * Shopping search result
 */
export interface ShoppingSearchResult {
  success: boolean;
  request_id: string;
  processing_time_ms: number;
  query: string;
  total_results?: number;
  products: ShoppingProduct[];
  shopping_links?: ShoppingLink[];
  source: string;
  message?: string;
  error?: string;
}
