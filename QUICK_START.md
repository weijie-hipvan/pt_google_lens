# ⚡ Quick Start Guide

Get the AI Tagging System running in minutes.

---

## 🎯 Prerequisites

- **Ruby** 3.3+ (for backend)
- **Node.js** 18+ (for frontend)
- **API Keys:**
  - Google Cloud Vision API key
  - SerpApi API key

---

## 🚀 Setup

### Step 1: Clone & Setup Backend

```bash
cd ai-tagging-api

# Install dependencies
bundle install

# Create .env file
cat > .env << EOF
GOOGLE_CLOUD_API_KEY=your_google_cloud_api_key
SERPAPI_KEY=your_serpapi_key
FRONTEND_URL=http://localhost:3000
EOF

# Start server
rails s -p 3001
```

### Step 2: Setup Frontend (Standalone Tool)

```bash
cd ai-tagging-ui

# Install dependencies
npm install

# Create .env.local file
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local

# Start dev server
npm run dev
```

### Step 3: Open Browser

```
http://localhost:3000
```

---

## 🖥️ Usage Flow

```
1. Open app → See upload zone
2. Drag image or paste URL → Preview shows
3. Click "Boost with AI ✨" → Loading...
4. Bounding boxes appear → Objects detected!
5. Click object → View details
6. Click "Find Similar" → Product search
7. Review products → Accept/Reject
8. Click "Export" → JSON download
```

---

## 🔧 Communa-Web Integration

If integrating with Communa-Web:

### Step 1: Ensure Backend is Running

```bash
cd ai-tagging-api
rails s -p 3001
```

### Step 2: Start Communa-Web

```bash
cd communa-web
pnpm install
pnpm dev
```

### Step 3: Use AI Tags

1. Go to Post Submission form
2. Upload an image
3. Click "🏷️ AI Tags" button on image
4. Select detected objects
5. Search for products
6. Import selected products as pins

---

## 📋 API Testing

### Test Detection

```bash
curl -X POST http://localhost:3001/api/v1/detections \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://your-imgix-url.imgix.net/image.jpg",
    "provider": "google_vision"
  }'
```

### Test Shopping Search

```bash
curl -X POST http://localhost:3001/api/v1/shopping_searches \
  -H "Content-Type: application/json" \
  -d '{
    "query": "modern sofa",
    "image_url": "https://your-imgix-url.imgix.net/image.jpg"
  }'
```

---

## 🔑 Getting API Keys

### Google Cloud Vision API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable "Cloud Vision API"
4. Go to "Credentials" → Create API Key
5. Copy key to `.env` as `GOOGLE_CLOUD_API_KEY`

### SerpApi

1. Go to [SerpApi](https://serpapi.com)
2. Sign up for account
3. Go to Dashboard → API Key
4. Copy key to `.env` as `SERPAPI_KEY`

---

## 🆘 Troubleshooting

### CORS Errors

Ensure `FRONTEND_URL` in backend `.env` matches your frontend URL:

```env
FRONTEND_URL=http://localhost:3000
```

### Detection Returns Empty Objects

- Check `GOOGLE_CLOUD_API_KEY` is valid
- Ensure image URL is publicly accessible
- Try a different image with clearer objects

### Product Search Returns No Results

- Check `SERPAPI_KEY` is valid
- Ensure image URL is NOT localhost (use public URL)
- Try keyword search as fallback

### Imgix Cropping Issues

- Ensure `image_dimensions` is passed from frontend
- Check that bounding box values are normalized (0-1)
- Verify imgix URL supports `rect` parameter

---

## 📁 File Structure

```
pt_google_lens/
├── ai-tagging-api/     # Rails backend (port 3001)
├── ai-tagging-ui/      # Next.js standalone (port 3000)
├── README.md           # Main documentation
├── QUICK_START.md      # This file
└── IMPLEMENTATION_PLAN.md

communa-web/
├── app/
│   ├── components/
│   │   └── AITaggingImporter/  # Integration components
│   └── utils/
│       └── aiTaggingImporter/  # API client & converters
└── docs/
    └── AI_TAGGING_IMPORT_PLAN.md
```

---

## ✅ Checklist

- [ ] Ruby 3.3+ installed
- [ ] Node.js 18+ installed
- [ ] Google Cloud Vision API key obtained
- [ ] SerpApi key obtained
- [ ] Backend running on port 3001
- [ ] Frontend running on port 3000
- [ ] Successfully detected objects in test image
- [ ] Successfully searched products

---

**Good luck! 🚀**
