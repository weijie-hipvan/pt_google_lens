import axios from 'axios';
import { DetectInput, DetectResult, VisualSearchResult, BoundingBox, ShoppingSearchResult } from '@/types/ai';
import { generateImageHash, getCachedResult, setCachedResult } from './cache';

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
 * Results are cached to avoid repeated API calls for the same image
 * 
 * @param input - Detection input with base64 image and options
 * @param useCache - Whether to use cached results (default: true)
 * @returns Detection result with objects and metadata
 */
export async function detectObjects(input: DetectInput, useCache: boolean = true): Promise<DetectResult & { fromCache?: boolean }> {
  const imageHash = generateImageHash(input.image);
  const cacheKey = `detect_${input.options?.provider || 'default'}`;
  
  // Check cache first
  if (useCache) {
    const cached = getCachedResult<DetectResult>(cacheKey, imageHash);
    if (cached) {
      return { ...cached, fromCache: true };
    }
  }
  
  try {
    const response = await apiClient.post<DetectResult>('/api/v1/detections', input);
    const result = response.data;
    
    // Cache successful results
    if (result.success) {
      setCachedResult(cacheKey, imageHash, result);
    }
    
    return { ...result, fromCache: false };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.data) {
        return { ...(error.response.data as DetectResult), fromCache: false };
      }
      
      return {
        success: false,
        request_id: '',
        processing_time_ms: 0,
        objects: [],
        provider: 'unknown',
        error: error.message || 'Network error occurred',
        fromCache: false,
      };
    }
    
    return {
      success: false,
      request_id: '',
      processing_time_ms: 0,
      objects: [],
      provider: 'unknown',
      error: 'An unexpected error occurred',
      fromCache: false,
    };
  }
}

/**
 * Visual search (Google Lens style) - find similar products/images
 * Results are cached to avoid repeated API calls for the same image
 * 
 * @param input - Visual search input with base64 image and optional bounding box
 * @param useCache - Whether to use cached results (default: true)
 * @returns Visual search result with product matches and similar images
 */
export async function visualSearch(input: VisualSearchInput, useCache: boolean = true): Promise<VisualSearchResult & { fromCache?: boolean }> {
  const imageHash = generateImageHash(input.image);
  // Include bounding box in cache key if provided
  const bboxKey = input.bounding_box 
    ? `_${input.bounding_box.x.toFixed(2)}_${input.bounding_box.y.toFixed(2)}_${input.bounding_box.width.toFixed(2)}_${input.bounding_box.height.toFixed(2)}`
    : '_full';
  const cacheKey = `visual_search${bboxKey}`;
  
  // Check cache first
  if (useCache) {
    const cached = getCachedResult<VisualSearchResult>(cacheKey, imageHash);
    if (cached) {
      return { ...cached, fromCache: true };
    }
  }
  
  try {
    const response = await apiClient.post<VisualSearchResult>('/api/v1/visual_searches', input);
    const result = response.data;
    
    // Cache successful results
    if (result.success) {
      setCachedResult(cacheKey, imageHash, result);
    }
    
    return { ...result, fromCache: false };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.data) {
        return { ...(error.response.data as VisualSearchResult), fromCache: false };
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
        fromCache: false,
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
      fromCache: false,
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
 * @param useCache - Whether to use cached results (default: true)
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
  },
  useCache: boolean = true
): Promise<ShoppingSearchResult & { fromCache?: boolean }> {
  // For shopping search, include image_url and bounding_box in cache key if provided
  const bboxKey = options?.bounding_box 
    ? `_${options.bounding_box.x.toFixed(2)}_${options.bounding_box.y.toFixed(2)}` 
    : '';
  const cacheKeyBase = options?.image_url 
    ? `${query}_img_${options.image_url.slice(-20)}${bboxKey}` 
    : query;
  const queryHash = generateImageHash(cacheKeyBase);
  const cacheKey = 'shopping_search';
  
  // Check cache first
  if (useCache) {
    const cached = getCachedResult<ShoppingSearchResult>(cacheKey, queryHash);
    if (cached) {
      return { ...cached, fromCache: true };
    }
  }
  
  try {
    const response = await apiClient.post<ShoppingSearchResult>('/api/v1/shopping_searches', {
      query,
      image_url: options?.image_url,  // Original image URL for Google Lens
      bounding_box: options?.bounding_box, // Bounding box to crop specific object
      options: {
        max_results: options?.max_results,
        language: options?.language,
        country: options?.country,
      },
    });
    const result = response.data;
    
    // Cache successful results
    if (result.success) {
      setCachedResult(cacheKey, queryHash, result);
    }
    
    return { ...result, fromCache: false };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.data) {
        return { ...(error.response.data as ShoppingSearchResult), fromCache: false };
      }
      
      return {
        success: false,
        request_id: '',
        processing_time_ms: 0,
        query,
        products: [],
        source: 'error',
        error: error.message || 'Network error occurred',
        fromCache: false,
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
      fromCache: false,
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
