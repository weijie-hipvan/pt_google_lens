import { create } from 'zustand';
import { DetectedObject, ImageDimensions } from '@/types/ai';

/**
 * Tagging application state
 */
interface TaggingState {
  // Image state
  imageUrl: string | null;
  imageBase64: string | null;
  imageDimensions: ImageDimensions | null;

  // Detection state
  objects: DetectedObject[];
  isLoading: boolean;
  error: string | null;

  // Selection state
  selectedObjectId: string | null;

  // Actions
  setImage: (url: string, base64: string, dimensions: ImageDimensions) => void;
  clearImage: () => void;
  setObjects: (objects: DetectedObject[]) => void;
  selectObject: (id: string | null) => void;
  acceptObject: (id: string) => void;
  rejectObject: (id: string) => void;
  acceptAll: () => void;
  rejectAll: () => void;
  resetObjects: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  getAcceptedObjects: () => DetectedObject[];
  getPendingObjects: () => DetectedObject[];
}

/**
 * Zustand store for tagging application state management
 */
export const useTaggingStore = create<TaggingState>((set, get) => ({
  // Initial state
  imageUrl: null,
  imageBase64: null,
  imageDimensions: null,
  objects: [],
  isLoading: false,
  error: null,
  selectedObjectId: null,

  // Set image and clear previous state
  setImage: (url, base64, dimensions) =>
    set({
      imageUrl: url,
      imageBase64: base64,
      imageDimensions: dimensions,
      objects: [],
      error: null,
      selectedObjectId: null,
    }),

  // Clear all image-related state
  clearImage: () =>
    set({
      imageUrl: null,
      imageBase64: null,
      imageDimensions: null,
      objects: [],
      selectedObjectId: null,
      error: null,
    }),

  // Set detected objects
  setObjects: (objects) => set({ objects }),

  // Select an object by ID
  selectObject: (id) => set({ selectedObjectId: id }),

  // Accept a single object
  acceptObject: (id) =>
    set((state) => ({
      objects: state.objects.map((obj) =>
        obj.id === id ? { ...obj, status: 'accepted' as const } : obj
      ),
    })),

  // Reject a single object
  rejectObject: (id) =>
    set((state) => ({
      objects: state.objects.map((obj) =>
        obj.id === id ? { ...obj, status: 'rejected' as const } : obj
      ),
    })),

  // Accept all objects
  acceptAll: () =>
    set((state) => ({
      objects: state.objects.map((obj) => ({
        ...obj,
        status: 'accepted' as const,
      })),
    })),

  // Reject all objects
  rejectAll: () =>
    set((state) => ({
      objects: state.objects.map((obj) => ({
        ...obj,
        status: 'rejected' as const,
      })),
    })),

  // Reset all objects to pending
  resetObjects: () =>
    set((state) => ({
      objects: state.objects.map((obj) => ({
        ...obj,
        status: 'pending' as const,
      })),
    })),

  // Set loading state
  setLoading: (loading) => set({ isLoading: loading }),

  // Set error message
  setError: (error) => set({ error }),

  // Get only accepted objects
  getAcceptedObjects: () =>
    get().objects.filter((obj) => obj.status === 'accepted'),

  // Get only pending objects
  getPendingObjects: () =>
    get().objects.filter((obj) => obj.status === 'pending'),
}));
