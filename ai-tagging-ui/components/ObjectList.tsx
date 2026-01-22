'use client';

import { useState } from 'react';
import { useTaggingStore } from '@/store/taggingStore';
import ConfidenceBadge from './ConfidenceBadge';
import { DetectedObject } from '@/types/ai';

const STATUS_CONFIG = {
  pending: { icon: '⏳', color: 'border-yellow-500/40', bg: 'bg-yellow-500/5' },
  accepted: { icon: '✅', color: 'border-emerald-500/50', bg: 'bg-emerald-500/10' },
  rejected: { icon: '❌', color: 'border-red-500/40', bg: 'bg-red-500/5 opacity-50' },
};

function ObjectCard({
  obj,
  isSelected,
  imageDimensions,
  onSelect,
  onAccept,
  onReject,
  onFindSimilar,
}: {
  obj: DetectedObject;
  isSelected: boolean;
  imageDimensions: { width: number; height: number } | null;
  onSelect: () => void;
  onAccept: () => void;
  onReject: () => void;
  onFindSimilar: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = STATUS_CONFIG[obj.status];

  const pixelCoords = imageDimensions ? {
    x: Math.round(obj.bounding_box.x * imageDimensions.width),
    y: Math.round(obj.bounding_box.y * imageDimensions.height),
    w: Math.round(obj.bounding_box.width * imageDimensions.width),
    h: Math.round(obj.bounding_box.height * imageDimensions.height),
  } : null;

  return (
    <div
      onClick={onSelect}
      className={`
        rounded-lg cursor-pointer transition-all duration-200 overflow-hidden
        border-l-3 ${config.color} ${config.bg}
        ${isSelected ? 'ring-1 ring-cyan-400/50 bg-cyan-500/10' : 'hover:bg-gray-700/30'}
      `}
    >
      {/* Header */}
      <div className="p-2.5">
        <div className="flex items-start gap-2">
          {/* Thumbnail */}
          {obj.thumbnail_url ? (
            <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0 bg-gray-700">
              <img 
                src={obj.thumbnail_url} 
                alt={obj.label}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-md flex-shrink-0 bg-gray-700/50 flex items-center justify-center">
              <span className="text-lg">{config.icon}</span>
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {!obj.thumbnail_url && <span className="text-sm">{config.icon}</span>}
              <h4 className={`font-medium text-sm truncate ${obj.status === 'rejected' ? 'line-through text-gray-500' : 'text-gray-100'}`}>
                {obj.label}
              </h4>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <ConfidenceBadge confidence={obj.confidence} size="sm" />
              <span className="text-[10px] text-gray-500 font-mono">#{obj.id.slice(0, 6)}</span>
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="p-1 hover:bg-gray-600 rounded transition-colors flex-shrink-0"
          >
            <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Expanded Details */}
        {expanded && (
          <div className="mt-2.5 pt-2.5 border-t border-gray-700/50 space-y-2.5">
            {/* Coordinates */}
            <div className="bg-gray-800/50 rounded-lg p-2">
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-gray-500">X:</span>
                  <span className="text-cyan-400 font-mono">{(obj.bounding_box.x * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Y:</span>
                  <span className="text-cyan-400 font-mono">{(obj.bounding_box.y * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">W:</span>
                  <span className="text-purple-400 font-mono">{(obj.bounding_box.width * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">H:</span>
                  <span className="text-purple-400 font-mono">{(obj.bounding_box.height * 100).toFixed(1)}%</span>
                </div>
              </div>
              {pixelCoords && (
                <div className="mt-1.5 pt-1.5 border-t border-gray-700/50 text-[10px] text-gray-500">
                  {pixelCoords.w}×{pixelCoords.h}px @ ({pixelCoords.x}, {pixelCoords.y})
                </div>
              )}
            </div>

            {/* Find Similar Button */}
            <button
              onClick={(e) => { e.stopPropagation(); onFindSimilar(); }}
              className="w-full py-1.5 px-2 bg-gradient-to-r from-orange-500/20 to-pink-500/20 
                         hover:from-orange-500/30 hover:to-pink-500/30 border border-orange-500/30
                         text-orange-300 font-medium rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              🔍 Find Similar Products
            </button>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex border-t border-gray-700/30">
        <button
          onClick={(e) => { e.stopPropagation(); onAccept(); }}
          disabled={obj.status === 'accepted'}
          className={`flex-1 py-1.5 text-xs font-medium flex items-center justify-center gap-1 transition-colors border-r border-gray-700/30
            ${obj.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-400' : 'hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-400'}`}
        >
          ✓
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onReject(); }}
          disabled={obj.status === 'rejected'}
          className={`flex-1 py-1.5 text-xs font-medium flex items-center justify-center gap-1 transition-colors
            ${obj.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'hover:bg-red-500/20 text-gray-400 hover:text-red-400'}`}
        >
          ✗
        </button>
      </div>
    </div>
  );
}

interface ObjectListProps {
  onFindSimilar?: (objectId: string) => void;
}

export default function ObjectList({ onFindSimilar }: ObjectListProps) {
  const { objects, selectedObjectId, imageDimensions, selectObject, acceptObject, rejectObject } = useTaggingStore();

  const counts = {
    pending: objects.filter((o) => o.status === 'pending').length,
    accepted: objects.filter((o) => o.status === 'accepted').length,
    rejected: objects.filter((o) => o.status === 'rejected').length,
  };

  if (objects.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 p-4">
        <span className="text-4xl mb-3">🔍</span>
        <p className="text-center text-xs">
          Upload an image and click<br />
          <strong className="text-cyan-400">Boost with AI</strong><br />
          to detect objects
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-gray-700/50 bg-gray-800/30">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm text-gray-200">Objects ({objects.length})</h3>
        </div>
        <div className="flex gap-3 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
            {counts.pending}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            {counts.accepted}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            {counts.rejected}
          </span>
        </div>
      </div>

      {/* Object List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {objects.map((obj) => (
          <ObjectCard
            key={obj.id}
            obj={obj}
            isSelected={selectedObjectId === obj.id}
            imageDimensions={imageDimensions}
            onSelect={() => selectObject(obj.id)}
            onAccept={() => acceptObject(obj.id)}
            onReject={() => rejectObject(obj.id)}
            onFindSimilar={() => onFindSimilar?.(obj.id)}
          />
        ))}
      </div>

      {/* Footer */}
      {imageDimensions && (
        <div className="p-2 border-t border-gray-700/50 bg-gray-800/30 text-[10px] text-gray-500">
          Image: {imageDimensions.width}×{imageDimensions.height}px
        </div>
      )}
    </div>
  );
}
