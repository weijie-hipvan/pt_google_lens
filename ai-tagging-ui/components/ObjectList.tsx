'use client';

import { useTaggingStore } from '@/store/taggingStore';
import ConfidenceBadge from './ConfidenceBadge';

const STATUS_ICONS = {
  pending: '⏳',
  accepted: '✅',
  rejected: '❌',
};

export default function ObjectList() {
  const {
    objects,
    selectedObjectId,
    selectObject,
    acceptObject,
    rejectObject,
  } = useTaggingStore();

  if (objects.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 p-6">
        <svg
          className="w-12 h-12 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
        <p className="text-center">
          Upload an image and click
          <br />
          <strong>&quot;Boost with AI&quot;</strong> to detect objects
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h3 className="font-semibold text-gray-200">
          Detected Objects ({objects.length})
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        {objects.map((obj) => (
          <div
            key={obj.id}
            onClick={() => selectObject(obj.id)}
            className={`
              p-4 border-b border-gray-700/50 cursor-pointer
              transition-all duration-150
              ${
                selectedObjectId === obj.id
                  ? 'bg-blue-500/20 ring-2 ring-blue-500 ring-inset'
                  : 'hover:bg-gray-700/50'
              }
              ${obj.status === 'rejected' ? 'opacity-50' : ''}
              ${obj.status === 'accepted' ? 'bg-green-500/10' : ''}
            `}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={`
                font-medium capitalize
                ${
                  obj.status === 'rejected'
                    ? 'line-through text-gray-500'
                    : 'text-gray-200'
                }
              `}
              >
                {STATUS_ICONS[obj.status]} {obj.label}
              </span>
              <ConfidenceBadge confidence={obj.confidence} size="sm" />
            </div>

            <div className="flex gap-2 mt-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  acceptObject(obj.id);
                }}
                disabled={obj.status === 'accepted'}
                className={`
                  flex-1 py-1.5 px-3 rounded text-sm font-medium
                  transition-colors duration-150
                  ${
                    obj.status === 'accepted'
                      ? 'bg-green-500/20 text-green-400 cursor-default'
                      : 'bg-gray-700 hover:bg-green-600 text-gray-200'
                  }
                `}
              >
                ✓ Accept
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  rejectObject(obj.id);
                }}
                disabled={obj.status === 'rejected'}
                className={`
                  flex-1 py-1.5 px-3 rounded text-sm font-medium
                  transition-colors duration-150
                  ${
                    obj.status === 'rejected'
                      ? 'bg-red-500/20 text-red-400 cursor-default'
                      : 'bg-gray-700 hover:bg-red-600 text-gray-200'
                  }
                `}
              >
                ✗ Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
