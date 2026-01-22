'use client';

import { useState } from 'react';
import { useTaggingStore } from '@/store/taggingStore';
import { detectObjects } from '@/lib/api';
import ImageUploader from '@/components/ImageUploader';
import CanvasViewer from '@/components/CanvasViewer';
import ObjectList from '@/components/ObjectList';
import ActionBar from '@/components/ActionBar';
import ExportModal from '@/components/ExportModal';

export default function Home() {
  const {
    imageUrl,
    imageBase64,
    imageDimensions,
    error,
    setObjects,
    setLoading,
    setError,
    getAcceptedObjects,
    clearImage,
  } = useTaggingStore();

  const [showExportModal, setShowExportModal] = useState(false);

  const handleBoost = async () => {
    if (!imageBase64) return;

    setLoading(true);
    setError(null);

    try {
      const result = await detectObjects({
        image: imageBase64,
        options: {
          max_objects: 10,
          confidence_threshold: 0.3,
        },
      });

      if (result.success) {
        setObjects(result.objects);
      } else {
        setError(result.error || 'Detection failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    setShowExportModal(true);
  };

  return (
    <main className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              AI Tagging Boost
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Optional AI-powered product tagging tool
            </p>
          </div>
          {imageUrl && (
            <button
              onClick={clearImage}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              ← Upload New Image
            </button>
          )}
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="text-red-400">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Action Bar */}
        <ActionBar onBoost={handleBoost} onExport={handleExport} />

        {/* Editor Area */}
        <div
          className="mt-6 flex gap-6"
          style={{ height: 'calc(100vh - 280px)' }}
        >
          {/* Canvas / Uploader */}
          <div className="flex-1">{imageUrl ? <CanvasViewer /> : <ImageUploader />}</div>

          {/* Sidebar */}
          <div className="w-80 bg-gray-800 rounded-lg overflow-hidden">
            <ObjectList />
          </div>
        </div>
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        objects={getAcceptedObjects()}
        imageDimensions={imageDimensions}
      />
    </main>
  );
}
