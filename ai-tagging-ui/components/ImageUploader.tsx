'use client';

import { useCallback, useState } from 'react';
import { useTaggingStore } from '@/store/taggingStore';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function ImageUploader() {
  const { setImage, setError } = useTaggingStore();
  const [isDragging, setIsDragging] = useState(false);

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

  return (
    <div
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`
        flex flex-col items-center justify-center
        w-full h-full min-h-[400px] border-2 border-dashed rounded-xl
        cursor-pointer transition-all duration-200
        ${
          isDragging
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-gray-600 hover:border-gray-500 bg-gray-800/50 hover:bg-gray-800'
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
  );
}
