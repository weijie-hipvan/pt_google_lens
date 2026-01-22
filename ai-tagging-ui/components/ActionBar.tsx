'use client';

import { useTaggingStore } from '@/store/taggingStore';

interface ActionBarProps {
  onBoost: () => Promise<void>;
  onExport: () => void;
}

export default function ActionBar({ onBoost, onExport }: ActionBarProps) {
  const {
    imageUrl,
    objects,
    isLoading,
    acceptAll,
    rejectAll,
    resetObjects,
    getAcceptedObjects,
  } = useTaggingStore();

  const hasImage = !!imageUrl;
  const hasObjects = objects.length > 0;
  const acceptedCount = getAcceptedObjects().length;

  return (
    <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
      <div className="flex items-center gap-3">
        <button
          onClick={onBoost}
          disabled={!hasImage || isLoading}
          className={`
            px-6 py-2.5 rounded-lg font-semibold
            transition-all duration-200
            ${
              !hasImage || isLoading
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg hover:shadow-xl'
            }
          `}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Analyzing...
            </span>
          ) : (
            <span>✨ Boost with AI</span>
          )}
        </button>

        <button
          onClick={acceptAll}
          disabled={!hasObjects}
          className={`
            px-4 py-2.5 rounded-lg font-medium border
            transition-colors duration-150
            ${
              !hasObjects
                ? 'border-gray-700 text-gray-600 cursor-not-allowed'
                : 'border-green-600 text-green-500 hover:bg-green-600 hover:text-white'
            }
          `}
        >
          ✓ Accept All
        </button>

        <button
          onClick={rejectAll}
          disabled={!hasObjects}
          className={`
            px-4 py-2.5 rounded-lg font-medium border
            transition-colors duration-150
            ${
              !hasObjects
                ? 'border-gray-700 text-gray-600 cursor-not-allowed'
                : 'border-red-600 text-red-500 hover:bg-red-600 hover:text-white'
            }
          `}
        >
          ✗ Reject All
        </button>

        <button
          onClick={resetObjects}
          disabled={!hasObjects}
          className={`
            px-4 py-2.5 rounded-lg font-medium border
            transition-colors duration-150
            ${
              !hasObjects
                ? 'border-gray-700 text-gray-600 cursor-not-allowed'
                : 'border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-white'
            }
          `}
        >
          ↻ Reset
        </button>
      </div>

      <button
        onClick={onExport}
        disabled={acceptedCount === 0}
        className={`
          px-6 py-2.5 rounded-lg font-semibold
          transition-all duration-200
          ${
            acceptedCount === 0
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-gray-700 hover:bg-gray-600 text-white'
          }
        `}
      >
        📥 Export JSON ({acceptedCount})
      </button>
    </div>
  );
}
