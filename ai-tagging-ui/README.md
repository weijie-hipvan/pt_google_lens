# AI Tagging UI

Next.js 14 standalone frontend for AI-powered product tagging.

## 🛠️ Tech Stack

- **Next.js** 14 (App Router)
- **React** 18
- **TypeScript** 5
- **Tailwind CSS** 3
- **React Konva** - Canvas rendering
- **Zustand** - State management

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your API URL

# Start dev server
npm run dev

# Open http://localhost:3000
```

## 🔑 Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## ✨ Features

### Object Detection
- Upload image via drag & drop or URL input
- AI-powered object detection with bounding boxes
- Color-coded confidence levels (🟢 High, 🟡 Medium, 🔴 Low)
- Thumbnail preview for each detected object

### Product Search
- **Image Search** - Visual similarity via Google Lens
- **Keyword Search** - Text-based via Google Shopping
- Product cards with price, merchant, rating, reviews
- Multiple product results per object

### Export
- JSON export with all detection + product data
- Includes image dimensions, bounding boxes, coordinates
- Compatible with Communa-Web import

## 📁 Project Structure

```
app/
├── page.tsx           # Main page
├── layout.tsx         # Root layout
├── globals.css        # Global styles
└── favicon.ico

components/
├── ImageUploader.tsx     # Drag & drop upload
├── CanvasViewer.tsx      # React Konva canvas
├── ObjectList.tsx        # Detected objects sidebar
├── ActionBar.tsx         # Main actions
├── ConfidenceBadge.tsx   # Confidence indicator
├── ProductLinksPanel.tsx # Product search results
├── ExportModal.tsx       # JSON export
└── HistoryPanel.tsx      # Recent images

lib/
├── api.ts     # API client
└── cache.ts   # Cache utilities (removed)

store/
└── taggingStore.ts   # Zustand store

types/
└── ai.ts      # TypeScript interfaces
```

## 🎨 UI Components

### ImageUploader
- Drag & drop file upload
- URL input for remote images
- File validation (JPG, PNG, WebP, max 5MB)

### CanvasViewer
- React Konva canvas rendering
- Bounding box overlay
- Click to select objects
- Responsive scaling

### ObjectList
- Sidebar with detected objects
- Accept/Reject buttons
- Confidence badges
- Thumbnail previews

### ProductLinksPanel
- Tabbed interface (Image Search / Keyword Search)
- Product cards with details
- Find similar button per object
- Keyword search input

### ExportModal
- JSON preview
- Copy to clipboard
- Download as file

## 📊 State Management (Zustand)

```typescript
interface TaggingState {
  // Image
  imageUrl: string | null
  imageBase64: string | null
  imageDimensions: ImageDimensions | null
  
  // Detection
  objects: DetectedObject[]
  isLoading: boolean
  error: string | null
  
  // Selection
  selectedObjectId: string | null
  
  // Products
  productSearchResults: Map<string, Product[]>
}
```

## 🔄 Data Flow

```
1. Upload Image
   ↓
2. Click "Boost with AI"
   ↓
3. API: /api/v1/detections
   ↓
4. Display bounding boxes
   ↓
5. Select object → "Find Similar"
   ↓
6. API: /api/v1/shopping_searches
   ↓
7. Display products
   ↓
8. Accept objects → Export JSON
```

## 🧪 Development

```bash
# Development
npm run dev

# Build
npm run build

# Start production
npm start

# Lint
npm run lint
```

## 📝 Export Format

```json
{
  "exported_at": "2026-01-23T10:30:00.000Z",
  "image_dimensions": {
    "width": 5504,
    "height": 8256
  },
  "total_objects": 5,
  "objects": [
    {
      "label": "coffee machine",
      "confidence": 0.92,
      "bounding_box": {
        "x": 0.48,
        "y": 0.53,
        "width": 0.10,
        "height": 0.11
      },
      "bounding_box_pixels": {
        "x": 2642,
        "y": 4375,
        "width": 550,
        "height": 908
      },
      "thumbnail_url": "http://localhost:3001/thumbnails/...",
      "related_products": [
        {
          "title": "SMEG Drip Filter Coffee Machine",
          "price": "$389.00",
          "extracted_price": 389,
          "merchant": "west elm",
          "url": "https://...",
          "image_url": "https://...",
          "rating": 4.6,
          "reviews_count": 4300
        }
      ]
    }
  ]
}
```

## 📄 License

MIT
