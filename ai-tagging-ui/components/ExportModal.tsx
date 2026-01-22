'use client';

import { useEffect, useState } from 'react';
import { DetectedObject, ImageDimensions, ExportData } from '@/types/ai';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  objects: DetectedObject[];
  imageDimensions: ImageDimensions | null;
}

export default function ExportModal({
  isOpen,
  onClose,
  objects,
  imageDimensions,
}: ExportModalProps) {
  const [copied, setCopied] = useState(false);

  // Count objects with related products
  const objectsWithProducts = objects.filter(obj => obj.related_products && obj.related_products.length > 0);
  const totalRelatedProducts = objects.reduce((sum, obj) => sum + (obj.related_products?.length || 0), 0);

  const exportData: ExportData = {
    exported_at: new Date().toISOString(),
    image_dimensions: imageDimensions
      ? {
          width: imageDimensions.naturalWidth,
          height: imageDimensions.naturalHeight,
        }
      : null,
    total_objects: objects.length,
    objects: objects.map((obj) => ({
      label: obj.label,
      confidence: obj.confidence,
      bounding_box: obj.bounding_box,
      bounding_box_pixels: imageDimensions
        ? {
            x: Math.round(obj.bounding_box.x * imageDimensions.naturalWidth),
            y: Math.round(obj.bounding_box.y * imageDimensions.naturalHeight),
            width: Math.round(obj.bounding_box.width * imageDimensions.naturalWidth),
            height: Math.round(obj.bounding_box.height * imageDimensions.naturalHeight),
          }
        : undefined,
      attributes: obj.attributes,
      thumbnail_url: obj.thumbnail_url,
      related_products: obj.related_products, // Include related products from shopping search
    })),
  };

  const jsonString = JSON.stringify(exportData, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tagging-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-100">Export Results</h2>
            <div className="flex items-center gap-3 mt-1 text-sm">
              <span className="text-gray-400">
                📦 {objects.length} objects
              </span>
              {totalRelatedProducts > 0 && (
                <span className="text-emerald-400">
                  🛒 {totalRelatedProducts} products ({objectsWithProducts.length} objects with products)
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <pre className="bg-gray-900 rounded-lg p-4 text-sm text-gray-300 overflow-x-auto">
            <code>{jsonString}</code>
          </pre>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-700">
          <button
            onClick={handleCopy}
            className="px-4 py-2 rounded-lg font-medium bg-gray-700 hover:bg-gray-600 text-white transition-colors"
          >
            {copied ? '✓ Copied!' : '📋 Copy to Clipboard'}
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-2 rounded-lg font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            📥 Download JSON
          </button>
        </div>
      </div>
    </div>
  );
}
