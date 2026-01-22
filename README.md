# 🏷️ AI Tagging Boost Tool

> **"Same workflow, OPTIONAL AI superpower"**

An optional AI-powered tool that helps tagging teams work faster - not mandatory, no workflow changes required.

---

## 📚 Documentation

| File | Description |
|------|-------------|
| [📋 IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) | Detailed technical spec, architecture, code samples |
| [🤖 AI_AGENT_PROMPTS.md](./AI_AGENT_PROMPTS.md) | Prompt templates to guide AI agent implementation |
| [⚡ QUICK_START.md](./QUICK_START.md) | Quick start guide with checklist |

---

## 🎯 Project Overview

### What This Is
- ✅ **Optional** tool - team chooses when to use it
- ✅ **Enhancement** add-on - boost productivity
- ✅ **AI trend** adoption - stay competitive
- ✅ **Zero disruption** - existing workflow remains 100% intact

### What This Is NOT
- ❌ Replacement for current workflow
- ❌ Mandatory system
- ❌ Process change

---

## 🏗️ Architecture

```
┌──────────────────────┐     ┌──────────────────────┐
│   FRONTEND           │     │   BACKEND            │
│   Next.js + React    │────▶│   Rails API          │
│   TypeScript         │     │   Ruby               │
│   Tailwind CSS       │     │   Google Vision      │
│   React Konva        │     │                      │
└──────────────────────┘     └──────────────────────┘
```

---

## 🛠️ Tech Stack

### Backend (Rails API)
| Component | Technology |
|-----------|------------|
| Framework | Ruby on Rails 7 (API mode) |
| Language | Ruby 3.2+ |
| HTTP Client | Faraday |
| AI Provider | Google Cloud Vision API |

### Frontend (Next.js)
| Component | Technology |
|-----------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Canvas | React Konva |
| State | Zustand |
| HTTP Client | Axios |

---

## 📁 Project Structure

```
/ai-tagging-api (Rails Backend)
├── app/
│   ├── controllers/api/v1/detections_controller.rb
│   └── services/ai/
│       ├── base_adapter.rb
│       ├── google_vision_adapter.rb
│       └── detection_service.rb
├── config/
│   ├── routes.rb
│   └── initializers/cors.rb
└── .env

/ai-tagging-ui (Next.js Frontend)
├── app/
│   ├── page.tsx
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ImageUploader.tsx
│   ├── CanvasViewer.tsx
│   ├── ObjectList.tsx
│   ├── ActionBar.tsx
│   ├── ConfidenceBadge.tsx
│   └── ExportModal.tsx
├── lib/api.ts
├── store/taggingStore.ts
├── types/ai.ts
└── .env.local
```

---

## 🚀 Quick Start

### Backend Setup
```bash
# Create Rails API
rails new ai-tagging-api --api
cd ai-tagging-api

# Add gems
bundle add rack-cors faraday dotenv-rails

# Configure .env
echo "GOOGLE_CLOUD_API_KEY=your_key" > .env

# Start server
rails s -p 3001
```

### Frontend Setup
```bash
# Create Next.js project
npx create-next-app@latest ai-tagging-ui --typescript --tailwind --app
cd ai-tagging-ui

# Install dependencies
npm install konva react-konva zustand uuid axios

# Configure .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local

# Start dev server
npm run dev
```

### Open Browser
```
http://localhost:3000
```

---

## 📖 Implementation Guide

**See detailed implementation in:**
- [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) - Full technical spec
- [AI_AGENT_PROMPTS.md](./AI_AGENT_PROMPTS.md) - Step-by-step prompts

**Timeline: 24-hour Hackathon**

| Phase | Hours | Focus |
|-------|-------|-------|
| Foundation | 1-6 | Rails API + Next.js Setup |
| Core UI | 7-14 | Canvas + Components |
| Integration | 15-20 | Connect + Polish |
| Demo | 21-24 | Deploy + Rehearse |

---

## 🎬 Demo Flow

```
Upload Image → Click "Boost with AI" → See Bounding Boxes
→ Accept/Reject Objects → Export JSON
```

**Key Features:**
- 🖼️ Drag & drop image upload
- 🤖 AI object detection with bounding boxes
- 🎨 Color-coded confidence (🟢🟡🔴)
- ✅❌ Accept/Reject individual objects
- 📥 Export JSON results

---

## 📝 API

### POST /api/v1/detections

**Request:**
```json
{
  "image": "base64_encoded_string",
  "options": {
    "max_objects": 10,
    "confidence_threshold": 0.7
  }
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
      "status": "pending"
    }
  ],
  "provider": "google_vision"
}
```

---

## 🔑 Environment Variables

### Backend (.env)
```env
GOOGLE_CLOUD_API_KEY=your_google_cloud_api_key
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 📄 License

MIT

---

**Hackathon Project - January 2025**
