# Phân Tích Tính Khả Thi: Tích Hợp AI Tagging Export vào Communa-Web

## 📋 Tổng Quan

**Mục tiêu:** Sử dụng export JSON từ AI Tagging System để tự động tạo shopping pins trong PostSubmission form của communa-web, giúp người dùng tagging nhanh hơn và chính xác hơn.

---

## 🔍 Phân Tích Cấu Trúc Dữ Liệu

### 1. AI Tagging Export Format (Hiện tại)

```typescript
interface ExportData {
  exported_at: string;
  image_dimensions: { width: number; height: number } | null;
  total_objects: number;
  objects: Array<{
    label: string;                    // "ceiling fan"
    confidence: number;               // 0.87
    bounding_box: {                   // Normalized 0-1
      x: number;                      // 0.435
      y: number;                      // 0.136
      width: number;                  // 0.205
      height: number;                 // 0.126
    };
    bounding_box_pixels?: {           // Pixel coordinates
      x: number;                      // 668
      y: number;                      // 139
      width: number;                  // 315
      height: number;                 // 129
    };
    thumbnail_url?: string;
    related_products?: Array<{       // Products từ shopping search
      title: string;                  // "Breezary Larrisa 52 in. Ceiling Fan"
      url: string;                    // "https://www.homedepot.com/..."
      price?: string;                 // "$51.98"
      extracted_price?: number;       // 51.98
      merchant?: string;              // "Home Depot"
      rating?: number;                // 3.5
      reviews_count?: number;         // 12
      shipping?: string;              // "Free delivery"
      image_url?: string;
    }>;
  }>;
}
```

### 2. Communa-Web Pin Format (Hiện tại)

```typescript
type IPin = {
  coords: TCoords;                    // { x: number, y: number, percentage: TPercentage }
  id: string;                         // Unique pin ID
  verified: boolean;                   // Verification status
  verified_shopping_data: boolean;     // Shopping data verified
  offer: IOffer;                       // Product offer data
  zoom_factor: number;                 // Zoom level
  originCoords: TCoords;              // Original coordinates
  retailer?: Retailer;                 // Retailer info
}

type TCoords = {
  x: number;                          // Percentage (0-100)
  y: number;                          // Percentage (0-100)
  percentage: TPercentage;            // { x, y, width, height } in percentage
}

type TPercentage = {
  x: number;                          // Percentage (0-100)
  y: number;                          // Percentage (0-100)
  width: number;                      // Percentage (0-100)
  height: number;                     // Percentage (0-100)
}

interface IOffer extends IOfferOpenAPI, IProductOpenAPI {
  id: string;                          // Offer/product ID
  name: string;                        // Product name
  brand?: string;                      // Brand name
  regular_price?: number;              // Regular price
  promo_price?: number;                // Promotional price
  currency?: string;                   // Currency code
  cover_image?: string;                // Product image URL
  final_url?: string;                  // Product URL
  provider_id?: string;                // Provider ID
  // ... other fields
}
```

### 3. PostSubmission Form Data Structure

```typescript
// Picture trong composingImages
interface PostSetImage {
  id: string;
  s3_url: string;
  s3_url_meta: { w: number; h: number };
  crop_area: CropArea;
  shopping_pins?: IPin[];              // Array of pins
  // ... other fields
}

// Form submission format
interface PostSetFormData {
  images: Array<{
    shopping_pins: IPin[];             // Pins được submit
    // ... other fields
  }>;
  image_pins: Array<{                  // Processed pins
    id: number;
    image_url: string;
    pinable_type: 'picture_item';
    pins: IPin[];
  }>;
}
```

---

## ✅ Tính Khả Thi: **CAO**

### Mapping Dữ Liệu

#### ✅ 1. Coordinates Mapping - **KHẢ THI**

**AI Export:**
- `bounding_box`: Normalized (0-1) hoặc `bounding_box_pixels`: Pixels
- Center point: `(x + width/2, y + height/2)`

**Comunna-Web:**
- `coords.x`, `coords.y`: Percentage (0-100) - center point
- `coords.percentage`: `{x, y, width, height}` in percentage

**Conversion Logic:**
```typescript
// Từ normalized (0-1) sang percentage (0-100)
function convertBoundingBoxToCoords(
  bbox: BoundingBox, 
  imageDimensions: { width: number; height: number }
): TCoords {
  // Center point
  const centerX = (bbox.x + bbox.width / 2) * 100;
  const centerY = (bbox.y + bbox.height / 2) * 100;
  
  return {
    x: centerX,
    y: centerY,
    percentage: {
      x: bbox.x * 100,
      y: bbox.y * 100,
      width: bbox.width * 100,
      height: bbox.height * 100,
    }
  };
}
```

#### ✅ 2. Offer/Product Mapping - **KHẢ THI** (với một số giả định)

**AI Export RelatedProduct:**
- `title`, `url`, `price`, `merchant`, `image_url`, `rating`, `reviews_count`

**Comunna-Web IOffer:**
- Cần `id`, `name`, `brand`, `regular_price`, `final_url`, `cover_image`, `provider_id`

**Mapping Strategy:**
```typescript
function createOfferFromRelatedProduct(
  product: RelatedProduct,
  objectLabel: string
): Partial<IOffer> {
  return {
    id: generateOfferId(product.url),  // Hash URL hoặc generate UUID
    name: product.title,
    brand: extractBrand(product.title) || product.merchant,
    regular_price: product.extracted_price || parsePrice(product.price),
    final_url: product.url,
    cover_image: product.image_url,
    provider_id: product.merchant,      // Hoặc map merchant -> provider_id
    currency: detectCurrency(product.price),
    // verified fields sẽ được set sau khi review
  };
}
```

**⚠️ Lưu ý:**
- `IOffer.id` thường là ID từ database - cần tạo temporary ID hoặc lookup existing
- `provider_id` cần mapping từ merchant name
- Có thể cần tạo offer mới trong hệ thống nếu chưa tồn tại

#### ✅ 3. Pin Creation - **KHẢ THI**

**Required Fields:**
- ✅ `coords`: Có thể convert từ bounding_box
- ✅ `id`: Generate UUID
- ✅ `offer`: Có thể tạo từ related_products
- ⚠️ `verified`: Mặc định `false` (cần review)
- ⚠️ `verified_shopping_data`: Mặc định `false`
- ⚠️ `zoom_factor`: Có thể tính từ bounding_box hoặc default 1.0
- ⚠️ `originCoords`: Copy từ `coords`

---

## 🎯 Implementation Strategy

### Option 1: Import JSON vào PostSubmission Form (Recommended)

**Flow:**
1. User upload ảnh trong PostSubmission
2. User click "Import AI Tags" button
3. Upload/paste export JSON từ AI Tagging System
4. System parse JSON và tạo pins tự động
5. User review và edit pins trước khi submit

**Pros:**
- ✅ Không cần thay đổi AI Tagging System
- ✅ User có control - review trước khi submit
- ✅ Có thể import nhiều lần, edit, merge
- ✅ Tách biệt workflow - AI tagging là optional tool

**Cons:**
- ⚠️ User cần 2 bước: AI tagging → Import
- ⚠️ Cần UI để import JSON

### Option 2: Direct Integration (API Call)

**Flow:**
1. User upload ảnh trong PostSubmission
2. Click "Boost with AI" button
3. Call AI Tagging API trực tiếp
4. Auto-create pins từ response

**Pros:**
- ✅ Seamless workflow
- ✅ Real-time results

**Cons:**
- ⚠️ Cần expose AI Tagging API
- ⚠️ Cần handle errors, loading states
- ⚠️ User ít control hơn

---

## 📝 Implementation Plan (Option 1 - Recommended)

### Phase 1: JSON Parser & Converter

**File:** `app/utils/aiTaggingImporter.ts`

```typescript
interface ImportResult {
  pins: IPin[];
  warnings: string[];
  errors: string[];
}

function importAITaggingData(
  exportData: ExportData,
  imageDimensions: { width: number; height: number },
  imageId: string
): ImportResult {
  const pins: IPin[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  exportData.objects.forEach((obj) => {
    // Chỉ import objects có related_products
    if (!obj.related_products || obj.related_products.length === 0) {
      warnings.push(`Object "${obj.label}" has no related products, skipping`);
      return;
    }

    // Convert coordinates
    const coords = convertBoundingBoxToCoords(
      obj.bounding_box,
      imageDimensions
    );

    // Tạo pin cho mỗi related product (hoặc chỉ product đầu tiên?)
    obj.related_products.forEach((product, idx) => {
      const pin: IPin = {
        id: `${imageId}_${obj.label}_${idx}_${Date.now()}`,
        coords,
        originCoords: { ...coords },
        verified: false,
        verified_shopping_data: false,
        zoom_factor: 1.0, // Default hoặc tính từ bounding_box
        offer: createOfferFromRelatedProduct(product, obj.label),
        retailer: product.merchant ? {
          name: product.merchant,
          id: product.merchant.toLowerCase().replace(/\s+/g, '_')
        } : undefined,
      };
      pins.push(pin);
    });
  });

  return { pins, warnings, errors };
}
```

### Phase 2: UI Component - Import Button

**File:** `app/components/PostSubmission/AITaggingImporter.tsx`

```typescript
export default function AITaggingImporter({ 
  onImport, 
  imageId, 
  imageDimensions 
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [preview, setPreview] = useState<ImportResult | null>(null);

  const handleParse = () => {
    try {
      const exportData: ExportData = JSON.parse(jsonInput);
      const result = importAITaggingData(exportData, imageDimensions, imageId);
      setPreview(result);
    } catch (error) {
      // Show error
    }
  };

  const handleImport = () => {
    if (preview) {
      onImport(preview.pins);
      setIsOpen(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
      {/* Upload JSON file hoặc paste */}
      {/* Preview pins sẽ được tạo */}
      {/* Confirm button */}
    </Modal>
  );
}
```

### Phase 3: Integration vào PostSubmission

**File:** `app/components/PostSubmission/PictureForms.tsx`

```typescript
// Thêm button "Import AI Tags" vào mỗi picture
<AITaggingImporter
  imageId={item.id}
  imageDimensions={item.s3_url_meta}
  onImport={(pins) => {
    // Merge với existing pins
    setComposingImages(prev => prev.map(img => 
      img.id === item.id 
        ? { ...img, shopping_pins: [...(img.shopping_pins || []), ...pins] }
        : img
    ));
  }}
/>
```

---

## ⚠️ Challenges & Solutions

### Challenge 1: Offer ID Generation
**Problem:** `IOffer.id` cần là unique ID, có thể là database ID

**Solutions:**
- Option A: Generate temporary ID (UUID), backend sẽ lookup hoặc create
- Option B: Hash product URL để tạo consistent ID
- Option C: Lookup existing offer trong hệ thống bằng URL

**Recommendation:** Option B - Hash URL để có consistent ID

### Challenge 2: Provider/Merchant Mapping
**Problem:** `provider_id` cần map từ merchant name

**Solutions:**
- Tạo mapping table: `{ "Home Depot": "homedepot_id", ... }`
- Hoặc lookup provider từ merchant name
- Hoặc để null và backend sẽ handle

**Recommendation:** Tạo mapping table, fallback to null

### Challenge 3: Multiple Products per Object
**Problem:** Một object có thể có nhiều related_products

**Solutions:**
- Option A: Tạo 1 pin cho product đầu tiên (highest score)
- Option B: Tạo nhiều pins cho tất cả products
- Option C: User chọn product nào muốn pin

**Recommendation:** Option C - Show preview, user chọn

### Challenge 4: Coordinate Accuracy
**Problem:** Bounding box center có thể không chính xác như user click

**Solutions:**
- Allow user drag pin sau khi import
- Hoặc import với bounding box area thay vì center point

**Recommendation:** Import với center point, allow drag

---

## 📊 Estimated Effort

| Task | Effort | Priority |
|------|--------|----------|
| JSON Parser & Converter | 2-3 days | High |
| UI Component (Import Modal) | 2-3 days | High |
| Integration vào PostSubmission | 1-2 days | High |
| Testing & Edge Cases | 2-3 days | Medium |
| Provider/Merchant Mapping | 1 day | Medium |
| Documentation | 1 day | Low |
| **Total** | **9-13 days** | |

---

## ✅ Kết Luận

**Tính khả thi: CAO** ✅

**Recommendation:**
- ✅ **Proceed với Option 1** (Import JSON)
- ✅ Start với MVP: Import 1 product per object (product đầu tiên)
- ✅ Allow user review và edit pins trước khi submit
- ✅ Iterate dựa trên user feedback

**Next Steps:**
1. Confirm approach với team
2. Create detailed technical spec
3. Implement Phase 1 (Parser)
4. Test với real export data
5. Implement UI components
6. Integration testing
