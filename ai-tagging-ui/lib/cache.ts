/**
 * Simple cache utility for storing AI detection results
 * Uses localStorage for persistence across sessions
 */

const CACHE_PREFIX = 'ai_tagging_cache_';
const CACHE_VERSION = 'v1';
const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_ENTRIES = 50;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  imageHash: string;
}

/**
 * Generate a simple hash from image data
 * Uses a fast hashing algorithm for base64 strings
 */
export function generateImageHash(imageBase64: string): string {
  // Use a subset of the image data for faster hashing
  // Take first 1000 chars + last 1000 chars + length
  const sample = imageBase64.length > 2000
    ? imageBase64.slice(0, 1000) + imageBase64.slice(-1000)
    : imageBase64;
  
  let hash = 0;
  for (let i = 0; i < sample.length; i++) {
    const char = sample.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Add length to make hash more unique
  return `${CACHE_VERSION}_${Math.abs(hash)}_${imageBase64.length}`;
}

/**
 * Get cached result for an image
 */
export function getCachedResult<T>(cacheKey: string, imageHash: string): T | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const key = `${CACHE_PREFIX}${cacheKey}_${imageHash}`;
    const cached = localStorage.getItem(key);
    
    if (!cached) return null;
    
    const entry: CacheEntry<T> = JSON.parse(cached);
    
    // Check if cache is expired
    if (Date.now() - entry.timestamp > MAX_CACHE_AGE_MS) {
      localStorage.removeItem(key);
      return null;
    }
    
    // Verify image hash matches
    if (entry.imageHash !== imageHash) {
      localStorage.removeItem(key);
      return null;
    }
    
    console.log(`[Cache] HIT for ${cacheKey}`);
    return entry.data;
  } catch (error) {
    console.error('[Cache] Error reading cache:', error);
    return null;
  }
}

/**
 * Store result in cache
 */
export function setCachedResult<T>(cacheKey: string, imageHash: string, data: T): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = `${CACHE_PREFIX}${cacheKey}_${imageHash}`;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      imageHash,
    };
    
    localStorage.setItem(key, JSON.stringify(entry));
    console.log(`[Cache] STORED for ${cacheKey}`);
    
    // Cleanup old entries if too many
    cleanupOldEntries();
  } catch (error) {
    console.error('[Cache] Error writing cache:', error);
    // If localStorage is full, clear old entries and try again
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      clearOldestEntries(10);
      try {
        const key = `${CACHE_PREFIX}${cacheKey}_${imageHash}`;
        const entry: CacheEntry<T> = { data, timestamp: Date.now(), imageHash };
        localStorage.setItem(key, JSON.stringify(entry));
      } catch {
        console.error('[Cache] Still failed after cleanup');
      }
    }
  }
}

/**
 * Clear cache for a specific image
 */
export function clearCacheForImage(imageHash: string): void {
  if (typeof window === 'undefined') return;
  
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX) && key.includes(imageHash)) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
  console.log(`[Cache] Cleared ${keysToRemove.length} entries for image`);
}

/**
 * Clear all cache
 */
export function clearAllCache(): void {
  if (typeof window === 'undefined') return;
  
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
  console.log(`[Cache] Cleared all ${keysToRemove.length} cache entries`);
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { entries: number; sizeKB: number } {
  if (typeof window === 'undefined') return { entries: 0, sizeKB: 0 };
  
  let entries = 0;
  let totalSize = 0;
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      entries++;
      const value = localStorage.getItem(key);
      if (value) {
        totalSize += value.length * 2; // UTF-16 = 2 bytes per char
      }
    }
  }
  
  return {
    entries,
    sizeKB: Math.round(totalSize / 1024),
  };
}

/**
 * History entry with metadata
 */
export interface HistoryEntry {
  id: string;
  timestamp: number;
  imageHash: string;
  imageThumbnail?: string;
  objectCount: number;
  provider: string;
}

const HISTORY_KEY = 'ai_tagging_history';
const MAX_HISTORY_ENTRIES = 20;

/**
 * Add entry to history
 */
export function addToHistory(entry: Omit<HistoryEntry, 'id'>): void {
  if (typeof window === 'undefined') return;
  
  try {
    const history = getHistory();
    
    // Check if already exists (same image hash)
    const existingIndex = history.findIndex(h => h.imageHash === entry.imageHash);
    if (existingIndex >= 0) {
      // Update existing entry
      history[existingIndex] = { ...history[existingIndex], ...entry, timestamp: Date.now() };
    } else {
      // Add new entry
      const newEntry: HistoryEntry = {
        ...entry,
        id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };
      history.unshift(newEntry);
    }
    
    // Limit history size
    const trimmedHistory = history.slice(0, MAX_HISTORY_ENTRIES);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmedHistory));
  } catch (error) {
    console.error('[History] Error adding to history:', error);
  }
}

/**
 * Get history entries
 */
export function getHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

/**
 * Remove entry from history
 */
export function removeFromHistory(id: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const history = getHistory();
    const filtered = history.filter(h => h.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('[History] Error removing from history:', error);
  }
}

/**
 * Clear all history
 */
export function clearHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(HISTORY_KEY);
}

/**
 * Cleanup old/expired entries
 */
function cleanupOldEntries(): void {
  if (typeof window === 'undefined') return;
  
  const entries: { key: string; timestamp: number }[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      try {
        const value = localStorage.getItem(key);
        if (value) {
          const entry = JSON.parse(value);
          entries.push({ key, timestamp: entry.timestamp || 0 });
        }
      } catch {
        // Invalid entry, remove it
        if (key) localStorage.removeItem(key);
      }
    }
  }
  
  // Remove expired entries
  const now = Date.now();
  entries.forEach(({ key, timestamp }) => {
    if (now - timestamp > MAX_CACHE_AGE_MS) {
      localStorage.removeItem(key);
    }
  });
  
  // If still too many, remove oldest
  if (entries.length > MAX_CACHE_ENTRIES) {
    const validEntries = entries.filter(e => now - e.timestamp <= MAX_CACHE_AGE_MS);
    validEntries.sort((a, b) => a.timestamp - b.timestamp);
    
    const toRemove = validEntries.slice(0, validEntries.length - MAX_CACHE_ENTRIES);
    toRemove.forEach(({ key }) => localStorage.removeItem(key));
  }
}

/**
 * Clear oldest N entries
 */
function clearOldestEntries(count: number): void {
  if (typeof window === 'undefined') return;
  
  const entries: { key: string; timestamp: number }[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      try {
        const value = localStorage.getItem(key);
        if (value) {
          const entry = JSON.parse(value);
          entries.push({ key, timestamp: entry.timestamp || 0 });
        }
      } catch {
        if (key) localStorage.removeItem(key);
      }
    }
  }
  
  entries.sort((a, b) => a.timestamp - b.timestamp);
  entries.slice(0, count).forEach(({ key }) => localStorage.removeItem(key));
}
