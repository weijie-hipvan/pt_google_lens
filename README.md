# 🏷️ AI Tagging Boost System

> **AI-powered product tagging for interior design images**

An AI system that detects objects in images and finds matching products for quick tagging in content management workflows.

---

## 📚 Documentation

| File | Description |
|------|-------------|
| [📋 IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) | Original technical spec (Phase 1) |
| [🤖 AI_AGENT_PROMPTS.md](./AI_AGENT_PROMPTS.md) | Prompt templates for AI agent |
| [⚡ QUICK_START.md](./QUICK_START.md) | Quick start guide |

---

## 🏗️ Architecture

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                         AI TAGGING SYSTEM                                     ║
╚══════════════════════════════════════════════════════════════════════════════╝

    ┌──────────────────┐         ┌──────────────────┐
    │   COMMUNA-WEB    │         │  AI-TAGGING-UI   │
    │  (Main Product)  │         │ (Standalone Tool)│
    │                  │         │                  │
    │  React Router 7  │         │   Next.js 14     │
    │  TypeScript      │         │   TypeScript     │
    │  Vanilla Extract │         │   Tailwind CSS   │
    └────────┬─────────┘         └────────┬─────────┘
             │                            │
             │     HTTP/REST API          │
             └────────────┬───────────────┘
                          │
                          ▼
    ┌─────────────────────────────────────────────────────────────────────────┐
    │                        AI-TAGGING-API                                    │
    │                        (Rails 8 Backend)                                 │
    │                                                                          │
    │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
    │  │ Detections  │  │  Shopping   │  │   Visual    │  │ GoogleLens  │     │
    │  │ Controller  │  │  Searches   │  │  Searches   │  │  Products   │     │
    │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │
    │         │                │                │                │            │
    │         ▼                ▼                ▼                ▼            │
    │  ┌─────────────────────────────────────────────────────────────────┐    │
    │  │                        SERVICES LAYER                           │    │
    │  │                                                                 │    │
    │  │  • DetectionService      - Object detection orchestration       │    │
    │  │  • GoogleVisionAdapter   - Google Cloud Vision API              │    │
    │  │  • GoogleLensProductsAdapter - SerpApi Google Lens (Products)   │    │
    │  │  • ShoppingSearchAdapter - SerpApi Google Shopping              │    │
    │  │  • ThumbnailService      - Image cropping (MiniMagick)          │    │
    │  └─────────────────────────────────────────────────────────────────┘    │
    └─────────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
    ┌─────────────────────────────────────────────────────────────────────────┐
    │                        EXTERNAL SERVICES                                 │
    │                                                                          │
    │   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐     │
    │   │  Google Cloud   │    │    SerpApi      │    │     Imgix       │     │
    │   │  Vision API     │    │                 │    │  (Image CDN)    │     │
    │   │                 │    │  • Google Lens  │    │                 │     │
    │   │  • Object       │    │  • Google       │    │  • Server-side  │     │
    │   │    Detection    │    │    Shopping     │    │    cropping     │     │
    │   │  • Labeling     │    │                 │    │  • rect param   │     │
    │   └─────────────────┘    └─────────────────┘    └─────────────────┘     │
    └─────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Backend (ai-tagging-api/)
| Component | Technology | Version |
|-----------|------------|---------|
| Framework | Ruby on Rails | 8.0 (API mode) |
| Language | Ruby | 3.3.4 |
| HTTP Client | Faraday | 2.x |
| Image Processing | MiniMagick | - |
| AI Provider | Google Cloud Vision API | v1 |
| Product Search | SerpApi (Google Lens + Shopping) | - |

### Frontend - Standalone (ai-tagging-ui/)
| Component | Technology | Version |
|-----------|------------|---------|
| Framework | Next.js | 14+ (App Router) |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 3.x |
| Canvas | React Konva | 18.x |
| State | Zustand | 4.x |

### Integration - Communa Web
| Component | Technology | Version |
|-----------|------------|---------|
| Framework | React Router | 7.x |
| Language | TypeScript | 5.x |
| Styling | Vanilla Extract | - |
| State | Zustand | 4.x |

---

## 📁 Project Structure

```
/ai-tagging-api (Rails Backend)
├── app/
│   ├── controllers/api/v1/
│   │   ├── detections_controller.rb
│   │   ├── shopping_searches_controller.rb
│   │   ├── visual_searches_controller.rb
│   │   └── google_lens_products_controller.rb
│   └── services/ai/
│       ├── detection_service.rb
│       ├── google_vision_adapter.rb
│       ├── google_lens_products_adapter.rb
│       └── shopping_search_adapter.rb
├── config/
│   └── routes.rb
└── .env

/ai-tagging-ui (Next.js Standalone)
├── app/
│   ├── page.tsx
│   └── layout.tsx
├── components/
│   ├── ImageUploader.tsx
│   ├── CanvasViewer.tsx
│   ├── ObjectList.tsx
│   ├── ActionBar.tsx
│   ├── ProductLinksPanel.tsx
│   └── ExportModal.tsx
├── lib/api.ts
├── store/taggingStore.ts
└── types/ai.ts

/communa-web (Integration)
├── app/
│   ├── components/
│   │   ├── AITaggingImporter/
│   │   │   ├── index.tsx
│   │   │   ├── ObjectSelector.tsx
│   │   │   ├── ImportPreview.tsx
│   │   │   └── styles.css.ts
│   │   └── SortableEntries.client/
│   │       └── PictureList/
│   │           └── PostImage.tsx
│   └── utils/aiTaggingImporter/
│       ├── api.ts
│       ├── types.ts
│       └── converter.ts
```

---

## 🚀 Quick Start

### Prerequisites
- Ruby 3.3+
- Node.js 18+
- Google Cloud Vision API key
- SerpApi API key

### Backend Setup
```bash
cd ai-tagging-api
bundle install

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Start server
rails s -p 3001
```

### Frontend Setup (Standalone Tool)
```bash
cd ai-tagging-ui
npm install
npm run dev
# Open http://localhost:3000
```

### Communa-Web Integration
```bash
cd communa-web
pnpm install
pnpm dev
# Open http://localhost:3000
```

---

## 📝 API Endpoints

### POST /api/v1/detections
Detect objects in an image.

**Request:**
```json
{
  "image_url": "https://example.imgix.net/image.jpg",
  "provider": "google_vision"
}
```

**Response:**
```json
{
  "success": true,
  "request_id": "uuid",
  "processing_time_ms": 1250,
  "objects": [
    {
      "id": "obj_1",
      "label": "sofa",
      "confidence": 0.95,
      "bounding_box": { "x": 0.1, "y": 0.15, "width": 0.3, "height": 0.2 },
      "thumbnail_url": "http://localhost:3001/thumbnails/..."
    }
  ],
  "image_dimensions": { "width": 5504, "height": 8256 },
  "provider": "google_vision"
}
```

### POST /api/v1/shopping_searches
Search for products matching an object.

**Request:**
```json
{
  "query": "SMEG coffee machine",
  "image_url": "https://example.imgix.net/image.jpg",
  "bounding_box": { "x": 0.48, "y": 0.53, "width": 0.10, "height": 0.11 },
  "image_dimensions": { "width": 5504, "height": 8256 }
}
```

**Response:**
```json
{
  "success": true,
  "products": [
    {
      "title": "SMEG Drip Filter Coffee Machine",
      "price": "$389.00",
      "extracted_price": 389,
      "merchant": "west elm",
      "url": "https://...",
      "image_url": "https://...",
      "rating": 4.6,
      "reviews_count": 4300,
      "shipping": "Free shipping"
    }
  ],
  "source": "serpapi_google_lens_products",
  "search_type": "image"
}
```

---

## 🔑 Environment Variables

### Backend (.env)
```env
GOOGLE_CLOUD_API_KEY=your_google_cloud_api_key
SERPAPI_KEY=your_serpapi_key
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## ✨ Key Features

- ✅ **Object Detection** - AI-powered detection using Google Cloud Vision
- ✅ **Visual Product Search** - Find products via Google Lens image search
- ✅ **Accurate Cropping** - Imgix server-side crop with exact dimensions
- ✅ **Keyword Fallback** - Google Shopping search when image search fails
- ✅ **Communa Integration** - Direct import to PostSubmission form
- ✅ **Thumbnail Generation** - Visual preview of detected objects
- ✅ **Multi-product Selection** - Choose from multiple product matches

---

## 📊 Data Flow

```
1. USER UPLOADS IMAGE
   │
   ▼
2. OBJECT DETECTION (Google Vision)
   ├── Detect objects in image
   ├── Return bounding boxes (normalized 0-1)
   ├── Extract image dimensions (MiniMagick)
   └── Generate thumbnails for each object
   │
   ▼
3. PRODUCT SEARCH (SerpApi Google Lens)
   ├── Receive: image_url + bounding_box + image_dimensions
   ├── Calculate: imgix crop rect (pixel coordinates)
   ├── Request: Cropped image → Google Lens
   └── Return: Related products with prices/merchants
   │
   ▼
4. IMPORT TO POST (Communa-Web)
   ├── User selects products
   ├── Convert to ShoppingPin format
   └── Add to post with coordinates
```

---

## 📄 License

MIT

---

**Last Updated:** January 2026
