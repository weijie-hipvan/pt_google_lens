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
  defaultExpanded = false,
}: {
  obj: DetectedObject;
  isSelected: boolean;
  imageDimensions: { width: number; height: number } | null;
  onSelect: () => void;
  onAccept: () => void;
  onReject: () => void;
  onFindSimilar: () => void;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);
  const config = STATUS_CONFIG[obj.status];

  const pixelCoords = imageDimensions ? {
    x: Math.round(obj.bounding_box.x * imageDimensions.width),
    y: Math.round(obj.bounding_box.y * imageDimensions.height),
    w: Math.round(obj.bounding_box.width * imageDimensions.width),
    h: Math.round(obj.bounding_box.height * imageDimensions.height),
  } : null;

  // Auto-expand when selected
  const showExpanded = expanded || isSelected;

  const copyObjectData = (e: React.MouseEvent) => {
    e.stopPropagation();
    const data = {
      label: obj.label,
      confidence: obj.confidence,
      bounding_box: obj.bounding_box,
      bounding_box_pixels: pixelCoords ? {
        x: pixelCoords.x,
        y: pixelCoords.y,
        width: pixelCoords.w,
        height: pixelCoords.h,
      } : null,
      thumbnail_url: obj.thumbnail_url,
      status: obj.status,
    };
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      onClick={onSelect}
      className={`
        rounded-xl cursor-pointer transition-all duration-200 overflow-hidden
        border-l-4 ${config.color} ${config.bg}
        ${isSelected ? 'ring-2 ring-cyan-400/50 bg-cyan-500/10 shadow-lg shadow-cyan-500/10' : 'hover:bg-gray-700/30'}
      `}
    >
      {/* Header */}
      <div className="p-3">
        <div className="flex items-start gap-3">
          {/* Thumbnail - Larger */}
          {obj.thumbnail_url ? (
            <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-gray-700 ring-1 ring-gray-600">
              <img 
                src={obj.thumbnail_url} 
                alt={obj.label}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-lg shrink-0 bg-gray-700/50 flex items-center justify-center ring-1 ring-gray-600">
              <span className="text-2xl">{config.icon}</span>
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className={`font-semibold text-sm ${obj.status === 'rejected' ? 'line-through text-gray-500' : 'text-gray-100'}`}>
                {obj.label}
              </h4>
              {obj.thumbnail_url && <span className="text-xs">{config.icon}</span>}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <ConfidenceBadge confidence={obj.confidence} size="sm" />
              <span className="text-[10px] text-gray-500 font-mono">#{obj.id.slice(0, 8)}</span>
            </div>
            {/* Quick pixel size info */}
            {pixelCoords && (
              <div className="mt-1.5 text-[11px] text-gray-500 font-mono">
                📐 {pixelCoords.w}×{pixelCoords.h}px
              </div>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="p-1.5 hover:bg-gray-600 rounded-lg transition-colors shrink-0"
          >
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${showExpanded ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Expanded Details */}
        {showExpanded && (
          <div className="mt-3 pt-3 border-t border-gray-700/50 space-y-3">
            {/* Coordinates - Clearer layout */}
            <div className="bg-gray-800/70 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Bounding Box</span>
                <button
                  onClick={copyObjectData}
                  className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
                    copied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700 text-gray-400 hover:text-white'
                  }`}
                >
                  {copied ? '✓ Copied' : '📋 Copy'}
                </button>
              </div>
              
              {/* Normalized coordinates */}
              <div className="grid grid-cols-4 gap-2 text-xs mb-2">
                <div className="text-center p-1.5 bg-gray-900/50 rounded">
                  <div className="text-gray-500 text-[10px]">X</div>
                  <div className="text-cyan-400 font-mono font-medium">{(obj.bounding_box.x * 100).toFixed(1)}%</div>
                </div>
                <div className="text-center p-1.5 bg-gray-900/50 rounded">
                  <div className="text-gray-500 text-[10px]">Y</div>
                  <div className="text-cyan-400 font-mono font-medium">{(obj.bounding_box.y * 100).toFixed(1)}%</div>
                </div>
                <div className="text-center p-1.5 bg-gray-900/50 rounded">
                  <div className="text-gray-500 text-[10px]">W</div>
                  <div className="text-purple-400 font-mono font-medium">{(obj.bounding_box.width * 100).toFixed(1)}%</div>
                </div>
                <div className="text-center p-1.5 bg-gray-900/50 rounded">
                  <div className="text-gray-500 text-[10px]">H</div>
                  <div className="text-purple-400 font-mono font-medium">{(obj.bounding_box.height * 100).toFixed(1)}%</div>
                </div>
              </div>
              
              {/* Pixel coordinates */}
              {pixelCoords && (
                <div className="text-xs text-gray-400 bg-gray-900/50 rounded p-2 text-center">
                  <span className="text-emerald-400 font-medium">{pixelCoords.w}×{pixelCoords.h}</span>
                  <span className="text-gray-500"> px @ position </span>
                  <span className="text-cyan-400 font-medium">({pixelCoords.x}, {pixelCoords.y})</span>
                </div>
              )}
            </div>

            {/* Find Similar Button - More prominent */}
            <button
              onClick={(e) => { e.stopPropagation(); onFindSimilar(); }}
              className="w-full py-2.5 px-3 bg-gradient-to-r from-orange-500/20 to-pink-500/20 
                         hover:from-orange-500/30 hover:to-pink-500/30 border border-orange-500/30
                         text-orange-300 font-semibold rounded-lg text-sm flex items-center justify-center gap-2 transition-all
                         hover:shadow-lg hover:shadow-orange-500/10"
            >
              🔍 Find Similar Products
            </button>
          </div>
        )}
      </div>

      {/* Action Buttons - Larger touch targets */}
      <div className="flex border-t border-gray-700/30">
        <button
          onClick={(e) => { e.stopPropagation(); onAccept(); }}
          disabled={obj.status === 'accepted'}
          className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors border-r border-gray-700/30
            ${obj.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-400' : 'hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-400'}`}
        >
          ✓ Accept
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onReject(); }}
          disabled={obj.status === 'rejected'}
          className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors
            ${obj.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'hover:bg-red-500/20 text-gray-400 hover:text-red-400'}`}
        >
          ✗ Reject
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
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {objects.map((obj, idx) => (
          <ObjectCard
            key={obj.id}
            obj={obj}
            isSelected={selectedObjectId === obj.id}
            imageDimensions={imageDimensions}
            onSelect={() => selectObject(obj.id)}
            onAccept={() => acceptObject(obj.id)}
            onReject={() => rejectObject(obj.id)}
            onFindSimilar={() => onFindSimilar?.(obj.id)}
            defaultExpanded={idx === 0}
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
