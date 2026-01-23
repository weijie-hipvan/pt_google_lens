/**
 * History utility for tracking analyzed images
 * Uses localStorage for persistence across sessions
 */

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
