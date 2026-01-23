'use client';

import { useState, useCallback } from 'react';
import { useTaggingStore } from '@/store/taggingStore';
import { detectObjects, visualSearch } from '@/lib/api';
import { VisualSearchResult } from '@/types/ai';
import ImageUploader from '@/components/ImageUploader';
import CanvasViewer from '@/components/CanvasViewer';
import ObjectList from '@/components/ObjectList';
import ActionBar, { AIProvider } from '@/components/ActionBar';
import ExportModal from '@/components/ExportModal';
import ProductLinksPanel from '@/components/ProductLinksPanel';
import HistoryPanel from '@/components/HistoryPanel';
import { addToHistory } from '@/lib/cache';

export default function Home() {
  const {
    imageUrl,
    imageBase64,
    imageDimensions,
    objects,
    error,
    setObjects,
    setLoading,
    setError,
    getAcceptedObjects,
    clearImage,
    setObjectRelatedProducts,
  } = useTaggingStore();

  const [showExportModal, setShowExportModal] = useState(false);
  const [showProductPanel, setShowProductPanel] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [visualSearchResult, setVisualSearchResult] = useState<VisualSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchingObjectLabel, setSearchingObjectLabel] = useState<string | undefined>();
  const [searchingObjectId, setSearchingObjectId] = useState<string | undefined>();
  const [searchingObjectBoundingBox, setSearchingObjectBoundingBox] = useState<{ x: number; y: number; width: number; height: number } | undefined>();
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('google');

  // Boost with AI - runs both detection and visual search in parallel
  const handleBoost = async (provider: AIProvider) => {
    if (!imageBase64) {
      setError('No image loaded. Please upload an image first.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    // Open the product panel and set initial states
    setShowProductPanel(true);
    setIsSearching(true);
    setSearchingObjectLabel('Entire Image');
    setVisualSearchResult(null);

    try {
      // Start both requests
      const detectPromise = detectObjects({
        image: imageBase64,
        options: {
          max_objects: 15,
          confidence_threshold: 0.25,
          provider: provider === 'auto' ? 'google' : provider,
        },
        image_dimensions: imageDimensions ? {
          width: imageDimensions.naturalWidth,
          height: imageDimensions.naturalHeight,
        } : undefined,
      });

      const searchPromise = visualSearch({
        image: imageBase64,
        options: { max_results: 20 },
      });

      // Wait for both to complete (don't fail if one fails)
      const results = await Promise.allSettled([detectPromise, searchPromise]);

      // Handle detection result
      if (results[0].status === 'fulfilled') {
        const detectResult = results[0].value;
        console.log('[Boost] Detection result:', detectResult.success, detectResult.objects?.length, 'objects');
        
        if (detectResult.success) {
          setObjects(detectResult.objects);
          
          // Save to history
          addToHistory({
            timestamp: Date.now(),
            imageHash: imageBase64.substring(0, 50),
            imageThumbnail: imageBase64.length < 50000 ? imageBase64 : undefined,
            objectCount: detectResult.objects.length,
            provider,
          });
        } else {
          setError(detectResult.error || 'Detection failed');
        }
      } else {
        console.error('[Boost] Detection failed:', results[0].reason);
        setError(`Detection error: ${results[0].reason?.message || 'Unknown error'}`);
      }

      // Handle visual search result
      if (results[1].status === 'fulfilled') {
        const searchResult = results[1].value;
        console.log('[Boost] Search result:', searchResult.success, searchResult.product_matches?.length, 'products');
        setVisualSearchResult(searchResult);
      } else {
        console.error('[Boost] Search failed:', results[1].reason);
        setVisualSearchResult({
          success: false,
          request_id: '',
          processing_time_ms: 0,
          web_entities: [],
          product_matches: [],
          visually_similar_images: [],
          pages_with_matching_images: [],
          error: results[1].reason?.message || 'Search failed',
        });
      }

    } catch (err) {
      console.error('[Boost] Unexpected error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  // Load from history (history feature - just shows past analyses, not full restore)
  const handleLoadHistory = useCallback(() => {
    setError('History feature shows past analyses. Please re-upload the image to analyze again.');
    setShowHistoryPanel(false);
  }, [setError]);

  const handleExport = () => {
    setShowExportModal(true);
  };

  const handleFindSimilar = async (objectId: string) => {
    if (!imageBase64) return;

    const obj = objects.find((o) => o.id === objectId);
    if (!obj) return;

    setShowProductPanel(true);
    setIsSearching(true);
    setSearchingObjectLabel(obj.label);
    setSearchingObjectId(objectId); // Track which object we're searching for
    setSearchingObjectBoundingBox(obj.bounding_box); // Pass bounding box for cropping
    setVisualSearchResult(null);

    try {
      const result = await visualSearch({
        image: imageBase64,
        bounding_box: obj.bounding_box,
        options: { max_results: 20 },
      });
      setVisualSearchResult(result);
    } catch (err) {
      setVisualSearchResult({
        success: false,
        request_id: '',
        processing_time_ms: 0,
        web_entities: [],
        product_matches: [],
        visually_similar_images: [],
        pages_with_matching_images: [],
        error: err instanceof Error ? err.message : 'Search failed',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchWholeImage = async () => {
    if (!imageBase64) return;

    setShowProductPanel(true);
    setIsSearching(true);
    setSearchingObjectLabel('Entire Image');
    setSearchingObjectId(undefined); // No specific object for whole image search
    setVisualSearchResult(null);

    try {
      const result = await visualSearch({
        image: imageBase64,
        options: { max_results: 20 },
      });
      setVisualSearchResult(result);
    } catch (err) {
      setVisualSearchResult({
        success: false,
        request_id: '',
        processing_time_ms: 0,
        web_entities: [],
        product_matches: [],
        visually_similar_images: [],
        pages_with_matching_images: [],
        error: err instanceof Error ? err.message : 'Search failed',
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800/50 bg-gray-900/50 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-[1920px] mx-auto px-4 lg:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="text-xl">🏷️</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">
                AI Tagging Boost
              </h1>
              <p className="text-xs text-gray-500">
                Powered by Google Vision • Optional Enhancement
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* History Button */}
            <button
              onClick={() => setShowHistoryPanel(!showHistoryPanel)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2
                ${showHistoryPanel 
                  ? 'bg-purple-500/20 border border-purple-500/50 text-purple-400' 
                  : 'bg-gray-800/50 border border-gray-700/50 text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
            >
              📜 History
            </button>
            
            {imageUrl && (
              <>
                <button
                  onClick={handleSearchWholeImage}
                  disabled={isSearching}
                  className="px-4 py-2 rounded-lg text-sm font-medium 
                             bg-gradient-to-r from-orange-500/20 to-pink-500/20 
                             border border-orange-500/30 text-orange-400
                             hover:from-orange-500/30 hover:to-pink-500/30
                             transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  🔍 Visual Search
                </button>
                <button
                  onClick={() => {
                    clearImage();
                    setShowProductPanel(false);
                    setVisualSearchResult(null);
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 
                             hover:text-white hover:bg-gray-800/50 transition-colors"
                >
                  ✕ Clear
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="max-w-[1920px] mx-auto px-4 lg:px-6 py-2">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2.5 flex items-center justify-between">
            <span className="text-red-400 text-sm">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 p-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-[1920px] mx-auto px-4 lg:px-6 py-4">
        {/* Action Bar */}
        <ActionBar 
          onBoost={handleBoost} 
          onExport={handleExport}
          selectedProvider={selectedProvider}
          onProviderChange={setSelectedProvider}
        />

        {/* Editor Area - Larger panels for more info */}
        <div className="mt-4 flex gap-3" style={{ height: 'calc(100vh - 180px)' }}>
          {/* History Panel */}
          {showHistoryPanel && (
            <div className="w-80 rounded-xl border border-gray-700/30 overflow-hidden bg-gray-800/50 flex-shrink-0">
              <HistoryPanel
                onLoadHistory={handleLoadHistory}
                onClose={() => setShowHistoryPanel(false)}
              />
            </div>
          )}

          {/* Canvas / Uploader - Smaller when panels open */}
          <div className={`bg-gray-800/30 rounded-xl border border-gray-700/30 overflow-hidden transition-all duration-300 ${
            showProductPanel && showHistoryPanel ? 'flex-1 min-w-[400px]' : 
            showProductPanel ? 'flex-1 min-w-[450px] max-w-[50%]' : 
            showHistoryPanel ? 'flex-1 max-w-[55%]' : 'flex-1 max-w-[60%]'
          }`}>
            {imageUrl ? <CanvasViewer /> : <ImageUploader />}
          </div>

          {/* Object List Sidebar - Expanded for more info */}
          <div className={`bg-gray-800/50 rounded-xl border border-gray-700/30 overflow-hidden transition-all duration-300 flex-shrink-0 ${
            showProductPanel ? 'w-80' : 'w-96'
          }`}>
            <ObjectList onFindSimilar={handleFindSimilar} />
          </div>

          {/* Product Links Panel - Expanded for product details */}
          {showProductPanel && (
            <div className="w-96 rounded-xl border border-gray-700/30 overflow-hidden bg-gray-800/50 flex-shrink-0">
              <ProductLinksPanel
                searchResult={visualSearchResult}
                isLoading={isSearching}
                objectLabel={searchingObjectLabel}
                objectId={searchingObjectId}
                originalImageUrl={imageUrl || undefined}
                objectBoundingBox={searchingObjectBoundingBox}
                imageDimensions={imageDimensions ? { width: imageDimensions.naturalWidth, height: imageDimensions.naturalHeight } : undefined}
                onClose={() => setShowProductPanel(false)}
                onProductsFound={setObjectRelatedProducts}
              />
            </div>
          )}
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
