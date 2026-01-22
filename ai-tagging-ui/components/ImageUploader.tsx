'use client';

import { useCallback, useState } from 'react';
import { useTaggingStore } from '@/store/taggingStore';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function ImageUploader() {
  const { setImage, setError } = useTaggingStore();
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'file' | 'url'>('file');
  const [urlInput, setUrlInput] = useState('');
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  const processFile = useCallback(
    async (file: File) => {
      // Validate file type
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError('Invalid file type. Please upload JPG, PNG, or WebP.');
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        setError('File too large. Maximum size is 5MB.');
        return;
      }

      // Convert to base64
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        const url = URL.createObjectURL(file);

        // Get image dimensions
        const img = new Image();
        img.onload = () => {
          setImage(url, base64, {
            width: img.width,
            height: img.height,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
          });
        };
        img.src = url;
      };
      reader.readAsDataURL(file);
    },
    [setImage, setError]
  );

  const processUrl = useCallback(
    async (imageUrl: string) => {
      if (!imageUrl.trim()) {
        setError('Please enter an image URL');
        return;
      }

      // Basic URL validation
      try {
        new URL(imageUrl);
      } catch {
        setError('Invalid URL format');
        return;
      }

      setIsLoadingUrl(true);
      setError(null);

      try {
        // Fetch the image and convert to base64
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error('Failed to fetch image');
        }

        const blob = await response.blob();
        
        // Validate content type
        if (!ACCEPTED_TYPES.includes(blob.type) && !blob.type.startsWith('image/')) {
          throw new Error('URL does not point to a valid image');
        }

        // Convert blob to base64
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;

          // Get image dimensions
          const img = new Image();
          img.onload = () => {
            setImage(imageUrl, base64, {
              width: img.width,
              height: img.height,
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight,
            });
          };
          img.onerror = () => {
            setError('Failed to load image from URL');
            setIsLoadingUrl(false);
          };
          img.src = base64;
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load image from URL');
      } finally {
        setIsLoadingUrl(false);
      }
    },
    [setImage, setError]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = ACCEPTED_TYPES.join(',');
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) processFile(file);
    };
    input.click();
  }, [processFile]);

  const handleUrlSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      processUrl(urlInput);
    },
    [urlInput, processUrl]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const pastedText = e.clipboardData.getData('text');
      if (pastedText && (pastedText.startsWith('http://') || pastedText.startsWith('https://'))) {
        setUrlInput(pastedText);
        // Auto-submit if it looks like an image URL
        if (/\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(pastedText)) {
          setTimeout(() => processUrl(pastedText), 100);
        }
      }
    },
    [processUrl]
  );

  return (
    <div className="w-full h-full min-h-[400px] flex flex-col bg-gray-800/30 rounded-xl overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('file')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2
            ${activeTab === 'file'
              ? 'text-cyan-400 border-b-2 border-cyan-400 bg-gray-800/50'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/30'
            }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Upload File
        </button>
        <button
          onClick={() => setActiveTab('url')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2
            ${activeTab === 'url'
              ? 'text-cyan-400 border-b-2 border-cyan-400 bg-gray-800/50'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/30'
            }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          Paste URL
        </button>
      </div>

      {/* File Upload Tab */}
      {activeTab === 'file' && (
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            flex-1 flex flex-col items-center justify-center
            border-2 border-dashed m-4 rounded-xl
            cursor-pointer transition-all duration-200
            ${isDragging
              ? 'border-cyan-500 bg-cyan-500/10'
              : 'border-gray-600 hover:border-gray-500 bg-gray-800/50 hover:bg-gray-700/50'
            }
          `}
        >
          <svg
            className="w-16 h-16 text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-gray-300 text-lg font-medium">
            Drag & drop an image here
          </p>
          <p className="text-gray-500 text-sm mt-2">or click to select a file</p>
          <p className="text-gray-600 text-xs mt-4">
            Supports: JPG, PNG, WebP (max 5MB)
          </p>
        </div>
      )}

      {/* URL Input Tab */}
      {activeTab === 'url' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <svg
            className="w-16 h-16 text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
            />
          </svg>
          
          <p className="text-gray-300 text-lg font-medium mb-2">
            Paste an image URL
          </p>
          <p className="text-gray-500 text-sm mb-6 text-center">
            Enter or paste a direct link to an image
          </p>

          <form onSubmit={handleUrlSubmit} className="w-full max-w-lg">
            <div className="relative">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onPaste={handlePaste}
                placeholder="https://example.com/image.jpg"
                className="w-full px-4 py-3 pr-24 bg-gray-700/50 border border-gray-600 rounded-lg
                           text-gray-200 placeholder-gray-500
                           focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent
                           transition-all"
                disabled={isLoadingUrl}
              />
              <button
                type="submit"
                disabled={isLoadingUrl || !urlInput.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2
                           px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-600
                           text-white text-sm font-medium rounded-md
                           transition-colors disabled:cursor-not-allowed"
              >
                {isLoadingUrl ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Loading
                  </span>
                ) : (
                  'Load'
                )}
              </button>
            </div>
          </form>

          {/* Example URLs */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 text-xs mb-2">Try these examples:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { label: '🛋️ Furniture', url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800' },
                { label: '💡 Lamp', url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800' },
                { label: '🪑 Chair', url: 'https://images.unsplash.com/photo-1503602642458-232111445657?w=800' },
              ].map((example) => (
                <button
                  key={example.label}
                  onClick={() => {
                    setUrlInput(example.url);
                    processUrl(example.url);
                  }}
                  className="px-3 py-1.5 bg-gray-700/50 hover:bg-gray-600/50 
                             text-gray-400 hover:text-gray-200 text-xs rounded-full
                             transition-colors"
                >
                  {example.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
