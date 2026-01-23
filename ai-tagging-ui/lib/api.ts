import axios from 'axios';
import { DetectInput, DetectResult, VisualSearchResult, BoundingBox, ShoppingSearchResult } from '@/types/ai';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Input for visual search API
 */
export interface VisualSearchInput {
  image: string; // base64 encoded image
  bounding_box?: BoundingBox;
  options?: {
    max_results?: number;
  };
}

/**
 * Axios instance configured for the Rails API
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60 seconds for AI processing
});

/**
 * Detect objects in an image using the AI vision API
 * 
 * @param input - Detection input with base64 image and options
 * @returns Detection result with objects and metadata
 */
export async function detectObjects(input: DetectInput): Promise<DetectResult> {
  try {
    const response = await apiClient.post<DetectResult>('/api/v1/detections', input);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.data) {
        return error.response.data as DetectResult;
      }
      
      return {
        success: false,
        request_id: '',
        processing_time_ms: 0,
        objects: [],
        provider: 'unknown',
        error: error.message || 'Network error occurred',
      };
    }
    
    return {
      success: false,
      request_id: '',
      processing_time_ms: 0,
      objects: [],
      provider: 'unknown',
      error: 'An unexpected error occurred',
    };
  }
}

/**
 * Visual search (Google Lens style) - find similar products/images
 * 
 * @param input - Visual search input with base64 image and optional bounding box
 * @returns Visual search result with product matches and similar images
 */
export async function visualSearch(input: VisualSearchInput): Promise<VisualSearchResult> {
  try {
    const response = await apiClient.post<VisualSearchResult>('/api/v1/visual_searches', input);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.data) {
        return error.response.data as VisualSearchResult;
      }
      
      return {
        success: false,
        request_id: '',
        processing_time_ms: 0,
        web_entities: [],
        product_matches: [],
        visually_similar_images: [],
        pages_with_matching_images: [],
        error: error.message || 'Network error occurred',
      };
    }
    
    return {
      success: false,
      request_id: '',
      processing_time_ms: 0,
      web_entities: [],
      product_matches: [],
      visually_similar_images: [],
      pages_with_matching_images: [],
      error: 'An unexpected error occurred',
    };
  }
}

/**
 * Shopping search - find products with prices
 * Supports both keyword search and image-based search (Google Lens)
 * Image-based search has priority and returns more accurate results
 * 
 * @param query - Product name or description to search (fallback if image search fails)
 * @param options - Search options including optional image_url for visual search
 * @returns Shopping search result with products and shopping links
 */
export async function shoppingSearch(
  query: string,
  options?: { 
    max_results?: number; 
    language?: string; 
    country?: string;
    image_url?: string;  // Original image URL for Google Lens (must be PUBLIC)
    bounding_box?: { x: number; y: number; width: number; height: number }; // Crop to specific object
    image_dimensions?: { width: number; height: number }; // Actual image dimensions for accurate crop
  }
): Promise<ShoppingSearchResult> {
  try {
    const response = await apiClient.post<ShoppingSearchResult>('/api/v1/shopping_searches', {
      query,
      image_url: options?.image_url,  // Original image URL for Google Lens
      bounding_box: options?.bounding_box, // Bounding box to crop specific object
      image_dimensions: options?.image_dimensions, // Actual image dimensions for accurate crop calculation
      options: {
        max_results: options?.max_results,
        language: options?.language,
        country: options?.country,
      },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.data) {
        return error.response.data as ShoppingSearchResult;
      }
      
      return {
        success: false,
        request_id: '',
        processing_time_ms: 0,
        query,
        products: [],
        source: 'error',
        error: error.message || 'Network error occurred',
      };
    }
    
    return {
      success: false,
      request_id: '',
      processing_time_ms: 0,
      query,
      products: [],
      source: 'error',
      error: 'An unexpected error occurred',
    };
  }
}

/**
 * Check API health
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await apiClient.get('/health');
    return response.status === 200;
  } catch {
    return false;
  }
}

export default apiClient;
