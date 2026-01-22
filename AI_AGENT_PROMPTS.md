# 🤖 AI Agent Implementation Prompts
## Detailed Prompts for Each Implementation Task

Use these prompts to guide AI agent through implementing each part of the project.

---

## 📋 HOW TO USE

1. Copy the prompt for the task you need to implement
2. Paste into AI agent (Cursor, Claude, ChatGPT, etc.)
3. Review and adjust generated code
4. Proceed to next task

---

## PHASE 1: FOUNDATION

---

## BACKEND PROMPTS (Rails API)

### Prompt B1.1: Rails Project Setup

```
Create a Ruby on Rails 7 API-only application for AI-powered object detection.

PROJECT SETUP:
- Project name: ai-tagging-api
- API-only mode (no views)
- Skip test framework (--skip-test)

GEMFILE ADDITIONS:
- rack-cors (for CORS handling)
- faraday (HTTP client for AI APIs)
- dotenv-rails (environment variables)

FOLDER STRUCTURE TO CREATE:
app/
  controllers/
    api/
      v1/
        detections_controller.rb
  services/
    ai/
      base_adapter.rb
      google_vision_adapter.rb
      detection_service.rb

CREATE FILES:
- .env with GOOGLE_CLOUD_API_KEY and FRONTEND_URL placeholders

Run the setup commands and create the basic structure.
```

---

### Prompt B1.2: CORS Configuration

```
Configure CORS for the Rails API to allow requests from the frontend.

File: config/initializers/cors.rb

Requirements:
- Allow origin from ENV['FRONTEND_URL'] with fallback to 'http://localhost:3000'
- Allow all headers
- Allow methods: GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD
- Apply to all resources ('*')

Use Rack::Cors middleware.
```

---

### Prompt B1.3: Base Adapter Class

```
Create the base adapter class for AI providers.

File: app/services/ai/base_adapter.rb

Module: Ai
Class: BaseAdapter

Methods:
- name: raises NotImplementedError (abstract)
- detect(image_base64, options = {}): raises NotImplementedError (abstract)
- generate_request_id (protected): returns SecureRandom.uuid

This class defines the interface that all AI provider adapters must implement.
```

---

### Prompt B1.4: Google Vision Adapter

```
Implement the Google Cloud Vision API adapter for object detection.

File: app/services/ai/google_vision_adapter.rb

Module: Ai
Class: GoogleVisionAdapter < BaseAdapter

Constants:
- API_URL = 'https://vision.googleapis.com/v1/images:annotate'

Methods:
- name: returns 'google_vision'
- detect(image_base64, options = {}):
  1. Record start time
  2. Generate request_id
  3. Strip "data:image/xxx;base64," prefix from image if present
  4. Call Google Vision API with OBJECT_LOCALIZATION feature
  5. Parse and normalize response
  6. Return hash with: success, request_id, processing_time_ms, objects, provider
  7. Handle errors gracefully

Private methods:
- call_api(image_base64, options): Use Faraday to POST to Vision API
- build_request_body(image_base64, options): Build request JSON
- normalize_response(response): Transform API response to standard format
- extract_bounding_box(vertices): Convert normalized vertices to x, y, width, height

Response format for each object:
{
  id: "obj_1",
  label: "sofa",
  confidence: 0.95,
  bounding_box: { x: 0.1, y: 0.15, width: 0.3, height: 0.2 },
  status: 'pending'
}

Note: Bounding box coordinates are normalized (0-1), keep them as-is.
```

---

### Prompt B1.5: Detection Service

```
Create the detection service that orchestrates AI adapters.

File: app/services/ai/detection_service.rb

Module: Ai
Class: DetectionService

Constants:
- ADAPTERS hash mapping provider names to adapter classes:
  'google' => GoogleVisionAdapter

Constructor:
- initialize(provider: 'google'): instantiate appropriate adapter

Methods:
- detect(image_base64, options = {}):
  1. Call adapter.detect with image and options
  2. If options[:confidence_threshold] present, filter objects below threshold
  3. Return result hash

This service provides a clean interface for the controller.
```

---

### Prompt B1.6: Detections Controller

```
Create the API controller for object detection.

File: app/controllers/api/v1/detections_controller.rb

Module: Api::V1
Class: DetectionsController < ApplicationController

Actions:
- create (POST):
  1. Extract image and options from params
  2. Validate image is present (return 400 if missing)
  3. Create DetectionService with provider from options
  4. Call service.detect with image and options
  5. Return JSON result with appropriate status code

Private methods:
- detection_params: permit :image and options (max_objects, confidence_threshold, provider)

Response status codes:
- 200: Success
- 400: Bad request (missing image)
- 422: Unprocessable entity (detection failed)
```

---

### Prompt B1.7: Routes Configuration

```
Configure API routes for the Rails application.

File: config/routes.rb

Routes:
- Namespace: api/v1
- Resource: detections (only: [:create])
- Health check: GET /health returning 200 OK

Result should map:
POST /api/v1/detections -> Api::V1::DetectionsController#create
GET /health -> simple 200 OK response
```

---

## FRONTEND PROMPTS (Next.js)

### Prompt F1.1: Frontend Project Setup

```
Create a Next.js 14 project for the AI Tagging UI.

PROJECT SETUP:
- Project name: ai-tagging-ui
- TypeScript enabled
- Tailwind CSS enabled
- App Router (not pages)
- Import alias: @/*

DEPENDENCIES TO INSTALL:
- konva (canvas library)
- react-konva (React bindings for Konva)
- zustand (state management)
- uuid (for generating IDs)
- axios (HTTP client)
- @types/uuid (TypeScript types)

FOLDER STRUCTURE:
app/
  layout.tsx
  page.tsx
  globals.css
components/
lib/
store/
types/

CREATE FILES:
- .env.local with NEXT_PUBLIC_API_URL=http://localhost:3001

Run setup commands and create basic structure.
```

---

### Prompt F1.2: TypeScript Types

```
Create TypeScript type definitions for the AI detection system.

File: types/ai.ts

Interfaces to create:

1. BoundingBox:
   - x: number (normalized 0-1)
   - y: number (normalized 0-1)
   - width: number (normalized 0-1)
   - height: number (normalized 0-1)

2. AttributeValue:
   - value: string
   - confidence: number

3. DetectedObject:
   - id: string
   - label: string
   - confidence: number
   - bounding_box: BoundingBox
   - attributes?: Record<string, AttributeValue>
   - status: 'pending' | 'accepted' | 'rejected'

4. DetectInput:
   - image: string (base64)
   - options?: { max_objects?, confidence_threshold?, provider? }

5. DetectResult:
   - success: boolean
   - request_id: string
   - processing_time_ms: number
   - objects: DetectedObject[]
   - scene?: { type: string, confidence: number }
   - provider: string
   - error?: string

6. ImageDimensions:
   - width: number
   - height: number
   - naturalWidth: number
   - naturalHeight: number

Export all interfaces.
```

---

### Prompt F1.3: API Client

```
Create an API client for communicating with the Rails backend.

File: lib/api.ts

Requirements:
1. Use axios for HTTP requests
2. Read API_BASE_URL from NEXT_PUBLIC_API_URL env variable
3. Default fallback to 'http://localhost:3001'
4. Set Content-Type to application/json

Functions:
- detectObjects(input: DetectInput): Promise<DetectResult>
  POST to /api/v1/detections with input body
  Return response.data

Export the detectObjects function and apiClient instance.
```

---

## PHASE 2: CORE UI COMPONENTS

### Prompt F2.1: Zustand Store

```
Create a Zustand store for managing the tagging application state.

File: store/taggingStore.ts

State properties:
- imageUrl: string | null
- imageBase64: string | null
- imageDimensions: ImageDimensions | null
- objects: DetectedObject[]
- isLoading: boolean
- error: string | null
- selectedObjectId: string | null

Actions:
- setImage(url, base64, dimensions): Set image data, clear objects and error
- clearImage(): Reset all state to initial values
- setObjects(objects): Set detected objects array
- selectObject(id): Set selected object ID
- acceptObject(id): Change object status to 'accepted'
- rejectObject(id): Change object status to 'rejected'
- acceptAll(): Set all objects to 'accepted'
- rejectAll(): Set all objects to 'rejected'
- resetObjects(): Set all objects back to 'pending'
- setLoading(loading): Set loading state
- setError(error): Set error message
- getAcceptedObjects(): Return array of accepted objects only

Use create from zustand. Export useTaggingStore hook.
```

---

### Prompt F2.2: Image Uploader Component

```
Create a drag-and-drop image uploader component.

File: components/ImageUploader.tsx

Requirements:
- 'use client' directive (needs interactivity)
- Accept image/jpeg, image/png, image/webp
- Max file size: 5MB
- Drag & drop zone with dashed border
- Click to open file picker
- Visual feedback for drag state

Functionality:
1. Handle dragOver, dragLeave, drop events
2. Handle click to open file input
3. Validate file type and size
4. Convert file to base64 using FileReader
5. Get image dimensions by creating Image element
6. Call store.setImage with URL, base64, and dimensions
7. Show error messages for invalid files

Styling (Tailwind):
- Height: h-96
- Border: dashed, gray-600
- Drag state: blue border, light blue background
- Hover: darker border
- Center content: upload icon + text
- Support text showing accepted formats
```

---

### Prompt F2.3: Confidence Badge Component

```
Create a component to display confidence level with color coding.

File: components/ConfidenceBadge.tsx

Props:
- confidence: number (0-1)
- showPercentage?: boolean (default true)
- size?: 'sm' | 'md' | 'lg' (default 'md')

Color coding:
- High (>= 0.85): Green (#22c55e)
- Medium (0.60-0.85): Yellow (#eab308)
- Low (< 0.60): Red (#ef4444)

Render:
- Inline flex container
- Colored dot (w-2 h-2)
- Percentage text in matching color
- Title attribute with "High/Medium/Low confidence"

Size variants affect padding and font size.
```

---

### Prompt F2.4: Object List Component

```
Create a sidebar component to display detected objects.

File: components/ObjectList.tsx

Requirements:
- 'use client' directive
- Use useTaggingStore for state and actions

Layout:
- Fixed width sidebar (320px)
- Header with "Detected Objects" + count
- Scrollable list of objects
- Empty state when no objects

Each object item shows:
- Status icon (⏳ pending, ✅ accepted, ❌ rejected)
- Label (capitalized)
- ConfidenceBadge
- Accept and Reject buttons

Interactions:
- Click item: selectObject(id)
- Accept button: acceptObject(id)
- Reject button: rejectObject(id)

Styling:
- Selected item: blue ring highlight
- Accepted item: subtle green tint
- Rejected item: reduced opacity, strikethrough label
- Hover effects on items
```

---

### Prompt F2.5: Canvas Viewer Component

```
Create a canvas component using React Konva to display image with bounding boxes.

File: components/CanvasViewer.tsx

Requirements:
- 'use client' directive
- Import Stage, Layer, Image, Rect, Text, Group from react-konva
- Use useTaggingStore for state

Features:
1. Load image from imageUrl into HTMLImageElement
2. Calculate scale factor to fit container while maintaining aspect ratio
3. Center image in stage
4. Draw bounding boxes for each detected object
5. Color-code boxes by confidence level
6. Show label + percentage above each box
7. Handle click on box to select object

Bounding box styling:
- Stroke color based on confidence (green/yellow/red)
- Selected: thicker stroke (3px vs 2px)
- Rejected: dashed line, reduced opacity
- Label background: colored rectangle above box
- Label text: white, bold

Coordinate transformation:
- boundingBox values are normalized (0-1)
- Multiply by naturalWidth/Height then by scale
- Add offset for centering

Handle window resize to recalculate stage size.
```

---

### Prompt F2.6: Action Bar Component

```
Create a top action bar with main control buttons.

File: components/ActionBar.tsx

Props:
- onBoost: () => Promise<void>
- onExport: () => void

Buttons (left group):
1. "✨ Boost with AI" - Primary gradient button
   - Disabled: no image OR loading
   - Loading state: spinner + "Analyzing..."
   
2. "✓ Accept All" - Green outlined
   - Disabled: no objects
   
3. "✗ Reject All" - Red outlined
   - Disabled: no objects
   
4. "↻ Reset" - Gray outlined
   - Disabled: no objects

Right side:
5. "📥 Export JSON (count)" - Secondary button
   - Disabled: no accepted objects
   - Shows count of accepted objects

Styling:
- Flex container with justify-between
- Gap between buttons
- Disabled state: gray, reduced opacity, no cursor
- Hover effects
- Gradient for primary button
```

---

## PHASE 3: INTEGRATION

### Prompt F3.1: Export Modal Component

```
Create a modal to preview and export JSON results.

File: components/ExportModal.tsx

Props:
- isOpen: boolean
- onClose: () => void
- objects: DetectedObject[]
- imageDimensions: ImageDimensions | null

Features:
1. Overlay backdrop (semi-transparent black, blur)
2. Modal container (gray-800, rounded, shadow)
3. Header with title and close button
4. JSON preview in code block
5. Footer with action buttons

Export JSON format:
{
  exported_at: ISO timestamp,
  image_dimensions: { width, height },
  total_objects: count,
  objects: [{ label, confidence, bounding_box, attributes }]
}

Buttons:
- Copy to Clipboard: Use navigator.clipboard
- Download JSON: Create blob and trigger download

Close triggers:
- Click overlay
- Press Escape key
- Click close button

Add state for "Copied!" feedback (2 second timeout).
```

---

### Prompt F3.2: Main Page Integration

```
Create the main page that integrates all components.

File: app/page.tsx

Requirements:
- 'use client' directive
- Import all components and hooks

Layout:
- Header: Logo, title, subtitle, "Upload New" button
- Error banner (dismissible)
- ActionBar
- Main area: ImageUploader OR CanvasViewer
- Sidebar: ObjectList
- ExportModal

State management:
- Use useTaggingStore for all state
- Local state for showExportModal

Functions:
- handleBoost: Call detectObjects API, update store
- handleExport: Open export modal

Conditional rendering:
- No image: Show ImageUploader full width
- Has image: Show CanvasViewer + ObjectList

Error handling:
- Display error banner when error state set
- Dismiss button to clear error

Styling:
- Min height: full screen
- Max width: 1280px, centered
- Dark theme (gray-900 background)
```

---

### Prompt F3.3: Global Styles

```
Update global styles for the application.

File: app/globals.css

Include:
1. Tailwind directives
2. Google Fonts import (Inter)
3. Body styling (dark theme, antialiased)
4. Custom scrollbar styles
5. Animation keyframes (fade-in, zoom-in)
6. Animation utility classes

Scrollbar:
- Width: 8px
- Track: gray-900
- Thumb: gray-700, rounded
- Thumb hover: gray-600

Animations:
- fade-in: opacity 0 to 1
- zoom-in: scale 0.95 to 1
- Duration: 200ms
- Timing: ease-out
```

---

## PHASE 4: DEPLOYMENT

### Prompt B4.1: Deploy Rails API

```
Prepare and deploy the Rails API to a hosting service.

Options:
1. Render.com (recommended for free tier)
2. Railway
3. Heroku

Steps:
1. Ensure Procfile exists: web: bundle exec puma -C config/puma.rb
2. Configure production database (if needed)
3. Set environment variables on hosting platform:
   - GOOGLE_CLOUD_API_KEY
   - FRONTEND_URL (Vercel URL after deploy)
   - RAILS_MASTER_KEY
4. Deploy from GitHub

Post-deploy:
- Test /health endpoint
- Test POST /api/v1/detections with curl
```

---

### Prompt F4.1: Deploy Next.js Frontend

```
Deploy the Next.js frontend to Vercel.

Steps:
1. Push code to GitHub
2. Import project in Vercel
3. Set environment variables:
   - NEXT_PUBLIC_API_URL=https://your-rails-api.com
4. Deploy

Verify:
- Open deployed URL
- Check network requests go to correct API
- Test full flow
```

---

## 📌 UTILITY PROMPTS

### Debug: API Connection Issues

```
Debug connection between Next.js frontend and Rails API.

Check these:
1. CORS configuration in Rails allows frontend origin?
2. NEXT_PUBLIC_API_URL set correctly in .env.local?
3. Rails server running on correct port?
4. Network tab shows correct request URL?
5. Any CORS errors in browser console?

Common fixes:
- Restart both servers after env changes
- Clear browser cache
- Check Vercel env vars match production API URL
```

---

### Debug: Google Vision API Errors

```
Debug Google Vision API issues.

Check these:
1. GOOGLE_CLOUD_API_KEY is valid?
2. Cloud Vision API enabled in Google Cloud Console?
3. API key has no restrictions blocking requests?
4. Image base64 is valid (try decoding it)?
5. Request body format matches API spec?

Log these in Rails:
- Full request body being sent
- Raw response from Google
- Any exception messages
```

---

### Debug: Canvas Not Rendering

```
Debug React Konva canvas issues.

Check these:
1. Image URL valid and loading?
2. Image onload event firing?
3. Stage has width and height > 0?
4. imageDimensions populated correctly?
5. Scale calculation correct?
6. Objects array has data?
7. Bounding box coordinates in valid range (0-1)?

Console.log:
- imageUrl
- imageDimensions
- objects
- scale factor
- calculated box positions
```

---

## 🚀 QUICK REFERENCE

### Start Development

**Backend (Terminal 1):**
```bash
cd ai-tagging-api
bundle install
rails s -p 3001
```

**Frontend (Terminal 2):**
```bash
cd ai-tagging-ui
npm install
npm run dev
```

### Test API with curl

```bash
curl -X POST http://localhost:3001/api/v1/detections \
  -H "Content-Type: application/json" \
  -d '{"image": "BASE64_IMAGE_HERE", "options": {"max_objects": 5}}'
```

---

**Version:** 2.0  
**Created:** January 22, 2025  
**Updated:** English language, Rails backend
