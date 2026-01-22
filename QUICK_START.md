# ⚡ Quick Start Guide
## Get Started with AI Agent

---

## 🎯 OVERVIEW

This project consists of **3 documentation files**:

| File | Purpose |
|------|---------|
| `IMPLEMENTATION_PLAN.md` | Detailed technical spec, architecture, code samples |
| `AI_AGENT_PROMPTS.md` | Prompt templates to copy-paste for AI agent |
| `QUICK_START.md` | Quick start guide (this file) |

---

## 🏗️ ARCHITECTURE

```
┌──────────────────────┐     ┌──────────────────────┐
│   FRONTEND           │     │   BACKEND            │
│   (Next.js + React)  │────▶│   (Rails API)        │
│   Port: 3000         │     │   Port: 3001         │
└──────────────────────┘     └──────────────────────┘
                                      │
                                      ▼
                             ┌──────────────────────┐
                             │   Google Vision API   │
                             └──────────────────────┘
```

---

## 🚀 START IMPLEMENTATION

### Step 1: Setup Backend - Rails API (10 min)

Copy this prompt and paste into AI agent:

```
Create a Rails 7 API-only application for AI object detection.
Project name: ai-tagging-api

Add gems: rack-cors, faraday, dotenv-rails

Create services for Google Vision API integration with adapter pattern.
Create POST /api/v1/detections endpoint.
Configure CORS for frontend at localhost:3000.

See IMPLEMENTATION_PLAN.md for detailed code samples.
```

---

### Step 2: Setup Frontend - Next.js (5 min)

```
Create a Next.js 14 project with TypeScript and Tailwind.
Project name: ai-tagging-ui

Install: konva, react-konva, zustand, uuid, axios

Create TypeScript types for AI detection system.
Create API client to call Rails backend.

See IMPLEMENTATION_PLAN.md Task 1.9-1.12.
```

---

### Step 3: Core Backend Services (15 min)

**Prompt 1 - Adapters:**
```
Create AI adapter classes in app/services/ai/:
- base_adapter.rb - abstract interface
- google_vision_adapter.rb - Google Cloud Vision implementation
- detection_service.rb - orchestration layer

See IMPLEMENTATION_PLAN.md Tasks 1.4-1.6 for full code.
```

**Prompt 2 - Controller:**
```
Create the detections controller at app/controllers/api/v1/detections_controller.rb
Handle POST with image and options params.
Return normalized JSON response.

See IMPLEMENTATION_PLAN.md Task 1.7.
```

---

### Step 4: Zustand Store (5 min)

```
Create store/taggingStore.ts with Zustand.
State: imageUrl, imageBase64, imageDimensions, objects, isLoading, error, selectedObjectId
Actions: setImage, clearImage, setObjects, acceptObject, rejectObject, acceptAll, rejectAll

See IMPLEMENTATION_PLAN.md Task 2.1.
```

---

### Step 5: UI Components (20 min)

**Create in order:**

1. `components/ImageUploader.tsx` - Drag & drop upload
2. `components/ConfidenceBadge.tsx` - Color-coded confidence (🟢🟡🔴)
3. `components/ObjectList.tsx` - Sidebar with detected objects
4. `components/CanvasViewer.tsx` - React Konva canvas with bounding boxes
5. `components/ActionBar.tsx` - Action buttons

See detailed prompts in `AI_AGENT_PROMPTS.md` Phase 2.

---

### Step 6: Integration (10 min)

```
Update app/page.tsx to integrate all components:
- Header with title
- ActionBar
- Conditional: ImageUploader or CanvasViewer
- ObjectList sidebar
- ExportModal
- Handle API calls and state management
```

---

### Step 7: Export & Polish (10 min)

```
1. Create components/ExportModal.tsx - Modal to export JSON
2. Add loading states and error handling
3. Polish UI: colors, spacing, transitions
```

---

## 📋 TASK CHECKLIST

Mark as complete when done:

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
- [ ] Deploy Rails API (Render/Railway)
- [ ] Deploy Next.js frontend (Vercel)
- [ ] Test full flow
- [ ] Prepare demo

---

## 🔑 ENVIRONMENT SETUP

### Backend (.env)
```env
GOOGLE_CLOUD_API_KEY=your_api_key_here
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Get Google Cloud API Key:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Enable "Cloud Vision API"
3. Create API key
4. Add to .env file

---

## 🖥️ RUN LOCALLY

**Terminal 1 - Backend:**
```bash
cd ai-tagging-api
bundle install
rails s -p 3001
```

**Terminal 2 - Frontend:**
```bash
cd ai-tagging-ui
npm install
npm run dev
```

**Open:** http://localhost:3000

---

## 💡 TIPS

1. **Test early**: After completing API route, test with curl before building UI

2. **Mock data**: Prepare mock responses to test UI while API is being built

3. **Incremental commits**: Commit after each component is complete

4. **Debug freely**: Console.log liberally, clean up later

---

## 🎬 DEMO FLOW

Flow for demonstration:

```
1. Open app → See upload zone
2. Drag image → Preview shows
3. Click "Boost with AI ✨" → Loading...
4. Bounding boxes appear → Wow!
5. Click box → Highlight + select in list
6. Accept/Reject objects
7. Click "Export" → JSON modal
8. Copy/Download → Done!
```

---

## 🆘 STUCK?

If you encounter issues, use debug prompts in `AI_AGENT_PROMPTS.md`:
- "Debug: API Connection Issues"
- "Debug: Google Vision API Errors"
- "Debug: Canvas Not Rendering"

Or ask AI agent with specific context:
```
I'm implementing [component/feature].
Error: [error message]
Current code: [paste code]
What needs to be fixed?
```

---

## 📁 FINAL PROJECT STRUCTURE

```
/ai-tagging-api (Rails)
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

/ai-tagging-ui (Next.js)
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

**Good luck with the hackathon! 🚀**
