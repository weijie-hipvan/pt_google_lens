# AI Tagging API

Rails 8 API backend for AI-powered object detection and product search.

## 🛠️ Tech Stack

- **Ruby** 3.3.4
- **Rails** 8.0 (API mode)
- **Faraday** - HTTP client
- **MiniMagick** - Image processing
- **rack-cors** - CORS handling
- **dotenv-rails** - Environment variables

## 🚀 Quick Start

```bash
# Install dependencies
bundle install

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Start server
rails s -p 3001
```

## 🔑 Environment Variables

Create a `.env` file:

```env
# Google Cloud Vision API
GOOGLE_CLOUD_API_KEY=your_google_cloud_api_key

# SerpApi (Google Lens & Shopping)
SERPAPI_KEY=your_serpapi_key

# CORS
FRONTEND_URL=http://localhost:3000
```

## 📝 API Endpoints

### POST /api/v1/detections

Detect objects in an image using Google Cloud Vision.

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
      "bounding_box": {
        "x": 0.1,
        "y": 0.15,
        "width": 0.3,
        "height": 0.2
      },
      "thumbnail_url": "http://localhost:3001/thumbnails/thumb_123.jpg"
    }
  ],
  "image_dimensions": {
    "width": 5504,
    "height": 8256
  },
  "provider": "google_vision"
}
```

### POST /api/v1/shopping_searches

Search for products matching an object. Supports both image-based (Google Lens) and keyword-based (Google Shopping) search.

**Request:**
```json
{
  "query": "SMEG coffee machine",
  "image_url": "https://example.imgix.net/image.jpg",
  "bounding_box": {
    "x": 0.48,
    "y": 0.53,
    "width": 0.10,
    "height": 0.11
  },
  "image_dimensions": {
    "width": 5504,
    "height": 8256
  }
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
  "search_type": "image",
  "processing_time_ms": 5050
}
```

**Search Priority:**
1. **Image search (Google Lens)** - If `image_url` and `bounding_box` provided
2. **Keyword search (Google Shopping)** - Fallback if image search fails or no image provided

### POST /api/v1/visual_searches

Visual search using Google Lens for similar images and labels.

**Request:**
```json
{
  "image_url": "https://example.imgix.net/image.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "best_guess_labels": ["modern living room", "interior design"],
  "similar_images": [
    {
      "url": "https://...",
      "source": "Pinterest"
    }
  ],
  "processing_time_ms": 2500
}
```

### POST /api/v1/google_lens_products

Direct Google Lens product search.

**Request:**
```json
{
  "image_url": "https://example.imgix.net/image.jpg"
}
```

## 📁 Project Structure

```
app/
├── controllers/
│   └── api/v1/
│       ├── application_controller.rb
│       ├── detections_controller.rb
│       ├── shopping_searches_controller.rb
│       ├── visual_searches_controller.rb
│       └── google_lens_products_controller.rb
├── services/
│   ├── ai/
│   │   ├── detection_service.rb
│   │   ├── google_vision_adapter.rb
│   │   ├── google_lens_products_adapter.rb
│   │   ├── shopping_search_adapter.rb
│   │   └── visual_search_adapter.rb
│   └── thumbnail_service.rb
└── models/
config/
├── routes.rb
├── initializers/
│   └── cors.rb
└── application.rb
```

## 🔧 Services

### DetectionService
Orchestrates object detection using adapters.

### GoogleVisionAdapter
Calls Google Cloud Vision API for object localization.

### GoogleLensProductsAdapter
- Calls SerpApi Google Lens for visual product search
- Handles imgix server-side cropping for accurate object extraction
- Uses `rect` parameter for pixel-accurate cropping

### ShoppingSearchAdapter
- Orchestrates product search
- Prioritizes image search (Google Lens)
- Falls back to keyword search (Google Shopping)

### ThumbnailService
- Downloads images and extracts dimensions
- Generates cropped thumbnails for detected objects
- Returns `image_dimensions` in detection response

## 🖼️ Imgix Cropping

The API supports imgix server-side cropping for accurate object extraction:

```ruby
# Input: normalized bounding box (0-1) + image dimensions
bounding_box = { x: 0.48, y: 0.53, width: 0.10, height: 0.11 }
image_dimensions = { width: 5504, height: 8256 }

# Output: imgix URL with rect parameter
# https://example.imgix.net/image.jpg?rect=2642,4375,550,908&w=500
```

## 🧪 Testing

```bash
# Test detection endpoint
curl -X POST http://localhost:3001/api/v1/detections \
  -H "Content-Type: application/json" \
  -d '{"image_url": "https://example.imgix.net/image.jpg"}'

# Test shopping search
curl -X POST http://localhost:3001/api/v1/shopping_searches \
  -H "Content-Type: application/json" \
  -d '{"query": "coffee machine"}'
```

## 📄 License

MIT
