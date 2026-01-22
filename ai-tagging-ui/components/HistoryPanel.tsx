'use client';

import { useState, useEffect } from 'react';
import { getHistory, removeFromHistory, clearHistory, HistoryEntry, getCacheStats } from '@/lib/cache';

interface HistoryPanelProps {
  onLoadHistory: (imageHash: string) => void;
  currentImageHash?: string;
  onClose: () => void;
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function HistoryCard({ 
  entry, 
  isActive,
  onLoad, 
  onDelete 
}: { 
  entry: HistoryEntry; 
  isActive: boolean;
  onLoad: () => void; 
  onDelete: () => void;
}) {
  return (
    <div 
      className={`
        group relative p-3 rounded-lg border transition-all cursor-pointer
        ${isActive 
          ? 'bg-emerald-500/20 border-emerald-500/50' 
          : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-700/50 hover:border-gray-600'
        }
      `}
      onClick={onLoad}
    >
      <div className="flex gap-3">
        {/* Thumbnail */}
        <div className="w-16 h-16 rounded-md bg-gray-700 overflow-hidden flex-shrink-0">
          {entry.imageThumbnail ? (
            <img 
              src={entry.imageThumbnail} 
              alt="Thumbnail"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-200">
              {entry.objectCount} objects
            </span>
            {isActive && (
              <span className="px-1.5 py-0.5 text-xs rounded bg-emerald-500/30 text-emerald-400">
                Current
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {formatTimeAgo(entry.timestamp)}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">
              {entry.provider === 'google' ? '🔍 Vision' : entry.provider === 'openai' ? '🤖 GPT' : '✨ Auto'}
            </span>
          </div>
        </div>

        {/* Delete button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-2 right-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 
                     hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all"
          title="Remove from history"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function HistoryPanel({ onLoadHistory, currentImageHash, onClose }: HistoryPanelProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [cacheStats, setCacheStats] = useState({ entries: 0, sizeKB: 0 });

  useEffect(() => {
    setHistory(getHistory());
    setCacheStats(getCacheStats());
  }, []);

  const handleDelete = (id: string) => {
    removeFromHistory(id);
    setHistory(getHistory());
    setCacheStats(getCacheStats());
  };

  const handleClearAll = () => {
    if (confirm('Clear all history? Cached results will be kept.')) {
      clearHistory();
      setHistory([]);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-900/95">
      {/* Header */}
      <div className="p-4 border-b border-gray-700/50 bg-gray-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📜</span>
            <h3 className="font-semibold text-gray-200">History</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">
              {history.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Cache stats */}
        <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
          <span>💾 {cacheStats.entries} cached</span>
          <span>📦 {cacheStats.sizeKB} KB</span>
        </div>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 py-8">
            <svg className="w-12 h-12 mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">No history yet</p>
            <p className="text-xs mt-1">Analyzed images will appear here</p>
          </div>
        ) : (
          history.map((entry) => (
            <HistoryCard
              key={entry.id}
              entry={entry}
              isActive={entry.imageHash === currentImageHash}
              onLoad={() => onLoadHistory(entry.imageHash)}
              onDelete={() => handleDelete(entry.id)}
            />
          ))
        )}
      </div>

      {/* Footer Actions */}
      {history.length > 0 && (
        <div className="p-3 border-t border-gray-700/50">
          <button
            onClick={handleClearAll}
            className="w-full px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 
                       rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear History
          </button>
        </div>
      )}
    </div>
  );
}
