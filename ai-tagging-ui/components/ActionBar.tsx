'use client';

import { useState, useRef, useEffect } from 'react';
import { useTaggingStore } from '@/store/taggingStore';

export type AIProvider = 'google' | 'openai' | 'auto';

interface ActionBarProps {
  onBoost: (provider: AIProvider, skipCache?: boolean) => Promise<void>;
  onExport: () => void;
  selectedProvider: AIProvider;
  onProviderChange: (provider: AIProvider) => void;
  cacheEnabled?: boolean;
  onCacheToggle?: (enabled: boolean) => void;
}

const PROVIDERS: { value: AIProvider; label: string; icon: string; description: string }[] = [
  { value: 'google', label: 'Google Vision', icon: '🌐', description: 'Best for object detection' },
  { value: 'openai', label: 'OpenAI GPT-4o', icon: '🤖', description: 'Best for descriptions' },
  { value: 'auto', label: 'Auto (Best)', icon: '✨', description: 'Automatically select' },
];

export default function ActionBar({ onBoost, onExport, selectedProvider, onProviderChange, cacheEnabled = false, onCacheToggle }: ActionBarProps) {
  const {
    imageUrl,
    objects,
    isLoading,
    acceptAll,
    rejectAll,
    resetObjects,
    getAcceptedObjects,
  } = useTaggingStore();

  const [showProviderMenu, setShowProviderMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProviderMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasImage = !!imageUrl;
  const hasObjects = objects.length > 0;
  const acceptedCount = getAcceptedObjects().length;

  const currentProvider = PROVIDERS.find(p => p.value === selectedProvider) || PROVIDERS[0];

  return (
    <div className="flex items-center justify-between gap-4 p-3 bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 relative z-30">
      {/* Left: Main Actions */}
      <div className="flex items-center gap-2">
        {/* Boost Button with Provider */}
        <div className="flex items-center" ref={dropdownRef}>
          <button
            onClick={() => onBoost(selectedProvider, !cacheEnabled)}
            disabled={!hasImage || isLoading}
            className={`
              px-5 py-2.5 rounded-l-lg font-semibold text-sm
              transition-all duration-200 flex items-center gap-2
              ${!hasImage || isLoading
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white shadow-lg shadow-emerald-500/20'
              }
            `}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Detecting...</span>
              </>
            ) : (
              <>
                <span className="text-lg">🔍</span>
                <span>Detect Objects</span>
              </>
            )}
          </button>
          
          {/* Provider Selector */}
          <div className="relative">
            <button
              onClick={() => setShowProviderMenu(!showProviderMenu)}
              disabled={isLoading}
              className={`
                px-3 py-2.5 rounded-r-lg border-l border-emerald-600/50 text-sm
                transition-all duration-200 flex items-center gap-1
                ${isLoading
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white'
                }
              `}
              title={`Current: ${currentProvider.label}`}
            >
              <span>{currentProvider.icon}</span>
              <svg className={`w-4 h-4 transition-transform ${showProviderMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Provider Dropdown - Fixed positioning */}
            {showProviderMenu && (
              <>
                {/* Backdrop */}
                <div className="fixed inset-0 z-40" onClick={() => setShowProviderMenu(false)} />
                <div className="absolute top-full right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-2 border-b border-gray-700 bg-gray-700/50">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">AI Provider</p>
                  </div>
                  {PROVIDERS.map((provider) => (
                    <button
                      key={provider.value}
                      onClick={() => {
                        onProviderChange(provider.value);
                        setShowProviderMenu(false);
                      }}
                      className={`
                        w-full px-3 py-2.5 text-left flex items-center gap-3 transition-colors
                        ${selectedProvider === provider.value 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : 'hover:bg-gray-700/50 text-gray-300'
                        }
                      `}
                    >
                      <span className="text-xl">{provider.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{provider.label}</p>
                        <p className="text-xs text-gray-500">{provider.description}</p>
                      </div>
                      {selectedProvider === provider.value && (
                        <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Cache Toggle */}
        <button
          onClick={() => onCacheToggle?.(!cacheEnabled)}
          disabled={isLoading}
          className={`
            px-2.5 py-2 rounded-lg text-xs font-medium
            transition-all duration-150 flex items-center gap-1.5
            ${isLoading ? 'text-gray-600 cursor-not-allowed' : ''}
            ${cacheEnabled 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
              : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
            }
          `}
          title={cacheEnabled ? 'Cache enabled - click to disable' : 'Cache disabled - always fetch fresh results'}
        >
          {cacheEnabled ? (
            <>
              <span>⚡</span>
              <span>Cache ON</span>
            </>
          ) : (
            <>
              <span>🔄</span>
              <span>Fresh</span>
            </>
          )}
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-700 mx-1"></div>

        {/* Object Actions */}
        <button
          onClick={acceptAll}
          disabled={!hasObjects}
          className={`
            px-3 py-2 rounded-lg text-sm font-medium
            transition-all duration-150 flex items-center gap-1.5
            ${!hasObjects
              ? 'text-gray-600 cursor-not-allowed'
              : 'text-emerald-400 hover:bg-emerald-500/20'
            }
          `}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Accept All
        </button>

        <button
          onClick={rejectAll}
          disabled={!hasObjects}
          className={`
            px-3 py-2 rounded-lg text-sm font-medium
            transition-all duration-150 flex items-center gap-1.5
            ${!hasObjects
              ? 'text-gray-600 cursor-not-allowed'
              : 'text-red-400 hover:bg-red-500/20'
            }
          `}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Reject All
        </button>

        <button
          onClick={resetObjects}
          disabled={!hasObjects}
          className={`
            px-3 py-2 rounded-lg text-sm font-medium
            transition-all duration-150 flex items-center gap-1.5
            ${!hasObjects
              ? 'text-gray-600 cursor-not-allowed'
              : 'text-gray-400 hover:bg-gray-700'
            }
          `}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Reset
        </button>
      </div>

      {/* Right: Export */}
      <button
        onClick={onExport}
        disabled={acceptedCount === 0}
        className={`
          px-4 py-2 rounded-lg text-sm font-medium
          transition-all duration-200 flex items-center gap-2
          ${acceptedCount === 0
            ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
            : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/30'
          }
        `}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Export ({acceptedCount})
      </button>
    </div>
  );
}
