# 🚀 AI Tagging Boost Tool - Implementation Plan (Phase 1)
## Original Design Document

> ⚠️ **Note:** This is the original Phase 1 implementation plan from the hackathon.
> The project has since evolved with additional features including:
> - SerpApi integration (Google Lens + Google Shopping)
> - Communa-Web integration
> - Imgix server-side cropping
> - Thumbnail generation service
>
> See [README.md](./README.md) for current architecture and [QUICK_START.md](./QUICK_START.md) for setup instructions.

---

## 📋 PROJECT OVERVIEW

**Project Name:** AI-Augmented Product Tagging System  
**Goal:** Standalone microservice with Web UI for optional AI-powered product tagging  
**Timeline:** 24 hours (Hackathon)  
**Key Message:** "Same workflow, OPTIONAL AI superpower"

**Architecture:** Separate Backend (Rails API) + Frontend (Next.js React)

---

## 🛠️ TECH STACK

### Backend (Rails API)
| Component | Technology | Version |
|-----------|------------|---------|
| Framework | Ruby on Rails | 7.x (API mode) |
| Language | Ruby | 3.2+ |
| AI Primary | Google Cloud Vision API | v1 |
| AI Secondary | OpenAI GPT-4o Vision | (optional) |
| HTTP Client | Faraday | 2.x |
| JSON Serializer | ActiveModel::Serializers | - |

### Frontend (React)
| Component | Technology | Version |
|-----------|------------|---------|
| Framework | Next.js | 14+ (App Router) |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 3.x |
| Canvas | React Konva | 18.x |
| State | Zustand | 4.x |
| HTTP Client | Axios | 1.x |
| Deploy | Vercel | - |

---

## 📁 PROJECT STRUCTURE

### Backend (Rails API)
```
ai-tagging-api/
├── app/
│   ├── controllers/
│   │   └── api/
│   │       └── v1/
│   │           └── detections_controller.rb
│   ├── services/
│   │   └── ai/
│   │       ├── base_adapter.rb
│   │       ├── google_vision_adapter.rb
│   │       ├── openai_adapter.rb (optional)
│   │       └── detection_service.rb
│   └── serializers/
│       └── detection_result_serializer.rb
├── config/
│   ├── routes.rb
│   └── initializers/
│       └── cors.rb
├── lib/
│   └── ai/
│       └── normalizer.rb
├── .env
└── Gemfile
```

### Frontend (Next.js)
```
ai-tagging-ui/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── ImageUploader.tsx
│   ├── CanvasViewer.tsx
│   ├── ObjectList.tsx
│   ├── ActionBar.tsx
│   ├── ConfidenceBadge.tsx
│   └── ExportModal.tsx
├── lib/
│   ├── api.ts                  # API client for Rails backend
│   └── utils.ts
├── store/
│   └── taggingStore.ts
├── types/
│   └── ai.ts
├── .env.local
└── package.json
```

---

## 📝 IMPLEMENTATION TASKS

### PHASE 1: Foundation (Hours 1-6)

---

## BACKEND TASKS (Rails API)

#### Task 1.1: Rails Project Setup
```bash
# Create Rails API-only application
rails new ai-tagging-api --api --skip-test --skip-system-test

cd ai-tagging-api

# Add required gems to Gemfile
# gem 'rack-cors'
# gem 'faraday'
# gem 'dotenv-rails'

bundle install
```

**AI Agent Instructions:**
1. Create Rails 7 API-only project
2. Add gems: `rack-cors`, `faraday`, `dotenv-rails`
3. Configure CORS to allow frontend origin
4. Create folder structure for services

#### Task 1.2: CORS Configuration (`config/initializers/cors.rb`)
```ruby
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins ENV.fetch('FRONTEND_URL', 'http://localhost:3000')
    
    resource '*',
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head]
  end
end
```

#### Task 1.3: Environment Setup
```bash
# .env
GOOGLE_CLOUD_API_KEY=your_google_cloud_api_key
OPENAI_API_KEY=your_openai_api_key
FRONTEND_URL=http://localhost:3000
```

#### Task 1.4: Base AI Adapter (`app/services/ai/base_adapter.rb`)
```ruby
module Ai
  class BaseAdapter
    def name
      raise NotImplementedError
    end
    
    def detect(image_base64, options = {})
      raise NotImplementedError
    end
    
    protected
    
    def generate_request_id
      SecureRandom.uuid
    end
  end
end
```

#### Task 1.5: Google Vision Adapter (`app/services/ai/google_vision_adapter.rb`)
```ruby
module Ai
  class GoogleVisionAdapter < BaseAdapter
    API_URL = 'https://vision.googleapis.com/v1/images:annotate'.freeze
    
    def name
      'google_vision'
    end
    
    def detect(image_base64, options = {})
      start_time = Time.current
      request_id = generate_request_id
      
      # Strip data URL prefix if present
      clean_base64 = image_base64.sub(/^data:image\/\w+;base64,/, '')
      
      response = call_api(clean_base64, options)
      objects = normalize_response(response)
      
      {
        success: true,
        request_id: request_id,
        processing_time_ms: ((Time.current - start_time) * 1000).to_i,
        objects: objects,
        provider: name
      }
    rescue StandardError => e
      {
        success: false,
        request_id: request_id,
        processing_time_ms: ((Time.current - start_time) * 1000).to_i,
        objects: [],
        provider: name,
        error: e.message
      }
    end
    
    private
    
    def call_api(image_base64, options)
      conn = Faraday.new(url: API_URL) do |f|
        f.request :json
        f.response :json
      end
      
      response = conn.post do |req|
        req.params['key'] = ENV['GOOGLE_CLOUD_API_KEY']
        req.body = build_request_body(image_base64, options)
      end
      
      response.body
    end
    
    def build_request_body(image_base64, options)
      {
        requests: [{
          image: { content: image_base64 },
          features: [
            { type: 'OBJECT_LOCALIZATION', maxResults: options[:max_objects] || 10 },
            { type: 'LABEL_DETECTION', maxResults: 10 }
          ]
        }]
      }
    end
    
    def normalize_response(response)
      annotations = response.dig('responses', 0, 'localizedObjectAnnotations') || []
      
      annotations.each_with_index.map do |obj, index|
        vertices = obj.dig('boundingPoly', 'normalizedVertices') || []
        
        {
          id: "obj_#{index + 1}",
          label: obj['name']&.downcase,
          confidence: obj['score'],
          bounding_box: extract_bounding_box(vertices),
          status: 'pending'
        }
      end
    end
    
    def extract_bounding_box(vertices)
      return { x: 0, y: 0, width: 0, height: 0 } if vertices.empty?
      
      {
        x: vertices[0]['x'] || 0,
        y: vertices[0]['y'] || 0,
        width: (vertices[2]['x'] || 0) - (vertices[0]['x'] || 0),
        height: (vertices[2]['y'] || 0) - (vertices[0]['y'] || 0)
      }
    end
  end
end
```

#### Task 1.6: Detection Service (`app/services/ai/detection_service.rb`)
```ruby
module Ai
  class DetectionService
    ADAPTERS = {
      'google' => GoogleVisionAdapter,
      'openai' => OpenaiAdapter # optional
    }.freeze
    
    def initialize(provider: 'google')
      @adapter = ADAPTERS.fetch(provider, GoogleVisionAdapter).new
    end
    
    def detect(image_base64, options = {})
      result = @adapter.detect(image_base64, options)
      
      # Apply confidence threshold filter
      if options[:confidence_threshold].present?
        threshold = options[:confidence_threshold].to_f
        result[:objects] = result[:objects].select { |obj| obj[:confidence] >= threshold }
      end
      
      result
    end
  end
end
```

#### Task 1.7: Detections Controller (`app/controllers/api/v1/detections_controller.rb`)
```ruby
module Api
  module V1
    class DetectionsController < ApplicationController
      def create
        image = detection_params[:image]
        options = detection_params[:options] || {}
        
        if image.blank?
          render json: { success: false, error: 'Image is required' }, status: :bad_request
          return
        end
        
        service = Ai::DetectionService.new(provider: options[:provider] || 'google')
        result = service.detect(image, options.symbolize_keys)
        
        if result[:success]
          render json: result, status: :ok
        else
          render json: result, status: :unprocessable_entity
        end
      end
      
      private
      
      def detection_params
        params.permit(:image, options: [:max_objects, :confidence_threshold, :provider])
      end
    end
  end
end
```

#### Task 1.8: Routes Configuration (`config/routes.rb`)
```ruby
Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resources :detections, only: [:create]
    end
  end
  
  # Health check
  get '/health', to: proc { [200, {}, ['OK']] }
end
```

---

## FRONTEND TASKS (Next.js)

#### Task 1.9: Frontend Project Setup
```bash
# Create Next.js project
npx create-next-app@latest ai-tagging-ui --typescript --tailwind --app --src-dir=false --import-alias="@/*"

cd ai-tagging-ui

# Install dependencies
npm install konva react-konva zustand uuid axios
npm install -D @types/uuid
```

#### Task 1.10: TypeScript Types (`types/ai.ts`)
```typescript
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AttributeValue {
  value: string;
  confidence: number;
}

export interface DetectedObject {
  id: string;
  label: string;
  confidence: number;
  bounding_box: BoundingBox;
  attributes?: Record<string, AttributeValue>;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface DetectInput {
  image: string;
  options?: {
    max_objects?: number;
    confidence_threshold?: number;
    provider?: 'google' | 'openai' | 'auto';
  };
}

export interface DetectResult {
  success: boolean;
  request_id: string;
  processing_time_ms: number;
  objects: DetectedObject[];
  scene?: {
    type: string;
    confidence: number;
  };
  provider: string;
  error?: string;
}

export interface ImageDimensions {
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
}
```

#### Task 1.11: API Client (`lib/api.ts`)
```typescript
import axios from 'axios';
import { DetectInput, DetectResult } from '@/types/ai';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function detectObjects(input: DetectInput): Promise<DetectResult> {
  const response = await apiClient.post<DetectResult>('/api/v1/detections', input);
  return response.data;
}

export default apiClient;
```

#### Task 1.12: Environment Setup (Frontend)
```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

### PHASE 2: Core UI Components (Hours 7-14)

#### Task 2.1: Zustand Store (`store/taggingStore.ts`)
```typescript
import { create } from 'zustand';
import { DetectedObject, ImageDimensions } from '@/types/ai';

interface TaggingState {
  // Image state
  imageUrl: string | null;
  imageBase64: string | null;
  imageDimensions: ImageDimensions | null;
  
  // Detection state
  objects: DetectedObject[];
  isLoading: boolean;
  error: string | null;
  
  // Selection state
  selectedObjectId: string | null;
  
  // Actions
  setImage: (url: string, base64: string, dimensions: ImageDimensions) => void;
  clearImage: () => void;
  setObjects: (objects: DetectedObject[]) => void;
  selectObject: (id: string | null) => void;
  acceptObject: (id: string) => void;
  rejectObject: (id: string) => void;
  acceptAll: () => void;
  rejectAll: () => void;
  resetObjects: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  getAcceptedObjects: () => DetectedObject[];
}

export const useTaggingStore = create<TaggingState>((set, get) => ({
  imageUrl: null,
  imageBase64: null,
  imageDimensions: null,
  objects: [],
  isLoading: false,
  error: null,
  selectedObjectId: null,
  
  setImage: (url, base64, dimensions) => set({ 
    imageUrl: url, 
    imageBase64: base64, 
    imageDimensions: dimensions,
    objects: [],
    error: null 
  }),
  
  clearImage: () => set({ 
    imageUrl: null, 
    imageBase64: null, 
    imageDimensions: null,
    objects: [],
    selectedObjectId: null 
  }),
  
  setObjects: (objects) => set({ objects }),
  
  selectObject: (id) => set({ selectedObjectId: id }),
  
  acceptObject: (id) => set((state) => ({
    objects: state.objects.map((obj) =>
      obj.id === id ? { ...obj, status: 'accepted' as const } : obj
    )
  })),
  
  rejectObject: (id) => set((state) => ({
    objects: state.objects.map((obj) =>
      obj.id === id ? { ...obj, status: 'rejected' as const } : obj
    )
  })),
  
  acceptAll: () => set((state) => ({
    objects: state.objects.map((obj) => ({ ...obj, status: 'accepted' as const }))
  })),
  
  rejectAll: () => set((state) => ({
    objects: state.objects.map((obj) => ({ ...obj, status: 'rejected' as const }))
  })),
  
  resetObjects: () => set((state) => ({
    objects: state.objects.map((obj) => ({ ...obj, status: 'pending' as const }))
  })),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error }),
  
  getAcceptedObjects: () => get().objects.filter((obj) => obj.status === 'accepted')
}));
```

#### Task 2.2: Image Uploader Component (`components/ImageUploader.tsx`)
```typescript
'use client';

import { useCallback, useState } from 'react';
import { useTaggingStore } from '@/store/taggingStore';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function ImageUploader() {
  const { setImage, setError } = useTaggingStore();
  const [isDragging, setIsDragging] = useState(false);

  const processFile = useCallback(async (file: File) => {
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
  }, [setImage, setError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

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
        w-full h-96 border-2 border-dashed rounded-xl
        cursor-pointer transition-all duration-200
        ${isDragging 
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
      <p className="text-gray-500 text-sm mt-2">
        or click to select a file
      </p>
      <p className="text-gray-600 text-xs mt-4">
        Supports: JPG, PNG, WebP (max 5MB)
      </p>
    </div>
  );
}
```

#### Task 2.3: Confidence Badge Component (`components/ConfidenceBadge.tsx`)
```typescript
interface ConfidenceBadgeProps {
  confidence: number;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const CONFIDENCE_LEVELS = {
  high: { color: 'bg-green-500', text: 'text-green-500', label: 'High' },
  medium: { color: 'bg-yellow-500', text: 'text-yellow-500', label: 'Medium' },
  low: { color: 'bg-red-500', text: 'text-red-500', label: 'Low' },
};

const SIZES = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-1',
  lg: 'text-base px-3 py-1.5',
};

export default function ConfidenceBadge({ 
  confidence, 
  showPercentage = true,
  size = 'md' 
}: ConfidenceBadgeProps) {
  const level = confidence >= 0.85 ? 'high' : confidence >= 0.60 ? 'medium' : 'low';
  const { color, text } = CONFIDENCE_LEVELS[level];
  const percentage = Math.round(confidence * 100);

  return (
    <span 
      className={`inline-flex items-center gap-1.5 rounded-full ${SIZES[size]}`}
      title={`${CONFIDENCE_LEVELS[level].label} confidence`}
    >
      <span className={`w-2 h-2 rounded-full ${color}`} />
      {showPercentage && (
        <span className={`font-medium ${text}`}>{percentage}%</span>
      )}
    </span>
  );
}
```

#### Task 2.4: Object List Component (`components/ObjectList.tsx`)
```typescript
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
    rejectObject 
  } = useTaggingStore();

  if (objects.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 p-6">
        <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" 
          />
        </svg>
        <p className="text-center">
          Upload an image and click<br />
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
              ${selectedObjectId === obj.id 
                ? 'bg-blue-500/20 ring-2 ring-blue-500 ring-inset' 
                : 'hover:bg-gray-700/50'
              }
              ${obj.status === 'rejected' ? 'opacity-50' : ''}
              ${obj.status === 'accepted' ? 'bg-green-500/10' : ''}
            `}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`
                font-medium capitalize
                ${obj.status === 'rejected' ? 'line-through text-gray-500' : 'text-gray-200'}
              `}>
                {STATUS_ICONS[obj.status]} {obj.label}
              </span>
              <ConfidenceBadge confidence={obj.confidence} size="sm" />
            </div>
            
            <div className="flex gap-2 mt-3">
              <button
                onClick={(e) => { e.stopPropagation(); acceptObject(obj.id); }}
                disabled={obj.status === 'accepted'}
                className={`
                  flex-1 py-1.5 px-3 rounded text-sm font-medium
                  transition-colors duration-150
                  ${obj.status === 'accepted'
                    ? 'bg-green-500/20 text-green-400 cursor-default'
                    : 'bg-gray-700 hover:bg-green-600 text-gray-200'
                  }
                `}
              >
                ✓ Accept
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); rejectObject(obj.id); }}
                disabled={obj.status === 'rejected'}
                className={`
                  flex-1 py-1.5 px-3 rounded text-sm font-medium
                  transition-colors duration-150
                  ${obj.status === 'rejected'
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
```

#### Task 2.5: Canvas Viewer Component (`components/CanvasViewer.tsx`)
```typescript
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Text, Group } from 'react-konva';
import { useTaggingStore } from '@/store/taggingStore';

const CONFIDENCE_COLORS = {
  high: '#22c55e',
  medium: '#eab308',
  low: '#ef4444',
};

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.85) return CONFIDENCE_COLORS.high;
  if (confidence >= 0.60) return CONFIDENCE_COLORS.medium;
  return CONFIDENCE_COLORS.low;
};

export default function CanvasViewer() {
  const { imageUrl, imageDimensions, objects, selectedObjectId, selectObject } = useTaggingStore();
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });

  // Load image
  useEffect(() => {
    if (imageUrl) {
      const img = new window.Image();
      img.src = imageUrl;
      img.onload = () => setImage(img);
    }
  }, [imageUrl]);

  // Handle resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Calculate scale to fit image in container
  const scale = imageDimensions
    ? Math.min(
        stageSize.width / imageDimensions.naturalWidth,
        stageSize.height / imageDimensions.naturalHeight
      )
    : 1;

  const scaledWidth = imageDimensions ? imageDimensions.naturalWidth * scale : 0;
  const scaledHeight = imageDimensions ? imageDimensions.naturalHeight * scale : 0;
  const offsetX = (stageSize.width - scaledWidth) / 2;
  const offsetY = (stageSize.height - scaledHeight) / 2;

  const handleBoxClick = useCallback((objectId: string) => {
    selectObject(objectId);
  }, [selectObject]);

  return (
    <div ref={containerRef} className="w-full h-full bg-gray-900 rounded-lg overflow-hidden">
      <Stage width={stageSize.width} height={stageSize.height}>
        <Layer>
          {image && imageDimensions && (
            <KonvaImage
              image={image}
              x={offsetX}
              y={offsetY}
              width={scaledWidth}
              height={scaledHeight}
            />
          )}

          {imageDimensions && objects.map((obj) => {
            const color = getConfidenceColor(obj.confidence);
            const isSelected = obj.id === selectedObjectId;
            const isRejected = obj.status === 'rejected';
            
            const x = offsetX + obj.bounding_box.x * imageDimensions.naturalWidth * scale;
            const y = offsetY + obj.bounding_box.y * imageDimensions.naturalHeight * scale;
            const width = obj.bounding_box.width * imageDimensions.naturalWidth * scale;
            const height = obj.bounding_box.height * imageDimensions.naturalHeight * scale;

            return (
              <Group key={obj.id} onClick={() => handleBoxClick(obj.id)}>
                <Rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  stroke={color}
                  strokeWidth={isSelected ? 3 : 2}
                  dash={isRejected ? [5, 5] : undefined}
                  opacity={isRejected ? 0.3 : 1}
                  cornerRadius={4}
                />
                <Rect
                  x={x}
                  y={y - 24}
                  width={Math.max(width, 80)}
                  height={22}
                  fill={color}
                  opacity={0.9}
                  cornerRadius={[4, 4, 0, 0]}
                />
                <Text
                  x={x + 6}
                  y={y - 20}
                  text={`${obj.label} (${Math.round(obj.confidence * 100)}%)`}
                  fill="white"
                  fontSize={12}
                  fontStyle="bold"
                />
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}
```

#### Task 2.6: Action Bar Component (`components/ActionBar.tsx`)
```typescript
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
    getAcceptedObjects 
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
            ${!hasImage || isLoading
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg hover:shadow-xl'
            }
          `}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
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
            ${!hasObjects
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
            ${!hasObjects
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
            ${!hasObjects
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
          ${acceptedCount === 0
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
```

---

### PHASE 3: Integration & Polish (Hours 15-20)

#### Task 3.1: Export Modal (`components/ExportModal.tsx`)
```typescript
'use client';

import { useEffect, useState } from 'react';
import { DetectedObject, ImageDimensions } from '@/types/ai';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  objects: DetectedObject[];
  imageDimensions: ImageDimensions | null;
}

export default function ExportModal({ isOpen, onClose, objects, imageDimensions }: ExportModalProps) {
  const [copied, setCopied] = useState(false);

  const exportData = {
    exported_at: new Date().toISOString(),
    image_dimensions: imageDimensions ? {
      width: imageDimensions.naturalWidth,
      height: imageDimensions.naturalHeight,
    } : null,
    total_objects: objects.length,
    objects: objects.map(obj => ({
      label: obj.label,
      confidence: obj.confidence,
      bounding_box: obj.bounding_box,
      attributes: obj.attributes,
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
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-gray-100">Export Results</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <pre className="bg-gray-900 rounded-lg p-4 text-sm text-gray-300 overflow-x-auto">
            <code>{jsonString}</code>
          </pre>
        </div>

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
```

#### Task 3.2: Main Page Integration (`app/page.tsx`)
```typescript
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
    objects,
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
          confidence_threshold: 0.5,
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
        <div className="mt-6 flex gap-6" style={{ height: 'calc(100vh - 280px)' }}>
          {/* Canvas / Uploader */}
          <div className="flex-1">
            {imageUrl ? (
              <CanvasViewer />
            ) : (
              <ImageUploader />
            )}
          </div>

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
```

#### Task 3.3: Global Styles (`app/globals.css`)
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root {
  font-family: 'Inter', sans-serif;
}

body {
  @apply bg-gray-900 text-gray-100 antialiased;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  @apply bg-gray-900;
}

::-webkit-scrollbar-thumb {
  @apply bg-gray-700 rounded-full;
}

::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-600;
}

/* Animation utilities */
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes zoom-in {
  from { transform: scale(0.95); }
  to { transform: scale(1); }
}

.animate-in {
  animation-duration: 200ms;
  animation-timing-function: ease-out;
  animation-fill-mode: both;
}

.fade-in {
  animation-name: fade-in;
}

.zoom-in {
  animation-name: zoom-in;
}
```

---

### PHASE 4: Demo Prep & Deploy (Hours 21-24)

#### Task 4.1: Backend Deployment
```bash
# Option 1: Deploy to Render.com
# - Create new Web Service
# - Connect GitHub repo
# - Set environment variables
# - Deploy

# Option 2: Deploy to Railway
# railway login
# railway init
# railway up
```

#### Task 4.2: Frontend Deployment
```bash
# Deploy to Vercel
cd ai-tagging-ui
vercel --prod

# Set environment variable on Vercel:
# NEXT_PUBLIC_API_URL=https://your-rails-api-url.com
```

---

## ✅ TASK CHECKLIST

### Phase 1: Foundation
**Backend (Rails)**
- [ ] Create Rails API project
- [ ] Configure CORS
- [ ] Set up environment variables
- [ ] Create BaseAdapter class
- [ ] Implement GoogleVisionAdapter
- [ ] Create DetectionService
- [ ] Create DetectionsController
- [ ] Configure routes

**Frontend (Next.js)**
- [ ] Create Next.js project
- [ ] Install dependencies
- [ ] Create TypeScript types
- [ ] Create API client

### Phase 2: Core UI
- [ ] Create Zustand store
- [ ] Create ImageUploader component
- [ ] Create ConfidenceBadge component
- [ ] Create ObjectList component
- [ ] Create CanvasViewer component
- [ ] Create ActionBar component

### Phase 3: Integration
- [ ] Create ExportModal component
- [ ] Integrate main page
- [ ] Add error handling
- [ ] Polish UI styling

### Phase 4: Deploy
- [ ] Deploy Rails API
- [ ] Deploy Next.js frontend
- [ ] Test full flow
- [ ] Prepare demo

---

## 🎯 API CONTRACT

### POST /api/v1/detections

**Request:**
```json
{
  "image": "base64_encoded_image_string",
  "options": {
    "max_objects": 10,
    "confidence_threshold": 0.5,
    "provider": "google"
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "processing_time_ms": 1250,
  "objects": [
    {
      "id": "obj_1",
      "label": "sofa",
      "confidence": 0.95,
      "bounding_box": {
        "x": 0.1,
        "y": 0.15,
        "width": 0.3,
        "height": 0.2
      },
      "status": "pending"
    }
  ],
  "provider": "google_vision"
}
```

**Response (Error):**
```json
{
  "success": false,
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "processing_time_ms": 150,
  "objects": [],
  "provider": "google_vision",
  "error": "Error message here"
}
```

---

**Document Version:** 2.0  
**Created:** January 22, 2025  
**Updated:** Backend changed to Rails API  
**Purpose:** AI Agent Implementation Guidance
