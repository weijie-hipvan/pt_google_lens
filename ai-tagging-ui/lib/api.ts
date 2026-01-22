import axios from 'axios';
import { DetectInput, DetectResult } from '@/types/ai';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
      // Return error response from API if available
      if (error.response?.data) {
        return error.response.data as DetectResult;
      }
      
      // Network or timeout error
      return {
        success: false,
        request_id: '',
        processing_time_ms: 0,
        objects: [],
        provider: 'unknown',
        error: error.message || 'Network error occurred',
      };
    }
    
    // Unknown error
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
