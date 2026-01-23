'use client';

import { useState, useEffect, useCallback } from 'react';
import { VisualSearchResult, WebEntity, ShoppingSearchResult, ShoppingLink, RelatedProduct } from '@/types/ai';
import { shoppingSearch } from '@/lib/api';

interface ProductLinksPanelProps {
  searchResult: VisualSearchResult | null;
  isLoading: boolean;
  objectLabel?: string;
  objectId?: string; // ID of the object being searched
  originalImageUrl?: string; // Original image URL for Google Lens (must be PUBLIC, not localhost)
  objectBoundingBox?: { x: number; y: number; width: number; height: number }; // Bounding box for cropping
  onClose: () => void;
  onProductsFound?: (objectId: string, products: RelatedProduct[]) => void; // Callback when products found
}

// Product card component for displaying individual products
interface ProductCardProps {
  product: {
    title?: string;
    url?: string;
    price?: string;
    extracted_price?: number;
    image_url?: string;
    merchant?: string;
    rating?: number;
    reviews_count?: number;
    shipping?: string;
    condition?: string;
  };
  accentColor: 'purple' | 'blue' | 'emerald';
}

function ProductCard({ product, accentColor }: ProductCardProps) {
  const colors = {
    purple: {
      bg: 'bg-purple-500/5 hover:bg-purple-500/10',
      border: 'border-purple-500/20 hover:border-purple-500/40',
      text: 'group-hover:text-purple-300',
      price: 'text-purple-400',
    },
    blue: {
      bg: 'bg-blue-500/5 hover:bg-blue-500/10',
      border: 'border-blue-500/20 hover:border-blue-500/40',
      text: 'group-hover:text-blue-300',
      price: 'text-blue-400',
    },
    emerald: {
      bg: 'bg-emerald-500/5 hover:bg-emerald-500/10',
      border: 'border-emerald-500/20 hover:border-emerald-500/40',
      text: 'group-hover:text-emerald-300',
      price: 'text-emerald-400',
    },
  };
  const c = colors[accentColor];

  return (
    <div className={`group p-2.5 ${c.bg} rounded-lg border ${c.border} transition-all`}>
      <div className="flex gap-2.5">
        {product.image_url && (
          <a href={product.url} target="_blank" rel="noopener noreferrer">
            <img src={product.image_url} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0 hover:ring-2 hover:ring-white/30 transition-all" />
          </a>
        )}
        <div className="flex-1 min-w-0">
          <a href={product.url} target="_blank" rel="noopener noreferrer" className="block">
            <p className={`text-xs font-medium text-gray-200 line-clamp-2 leading-snug ${c.text} transition-colors`}>{product.title}</p>
          </a>
          <div className="flex items-center gap-2 mt-1">
            {product.price && (
              <span className={`text-sm font-bold ${c.price}`}>{product.price}</span>
            )}
            {product.merchant && (
              <span className="text-[10px] px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded">{product.merchant}</span>
            )}
          </div>
          {(product.rating || product.shipping) && (
            <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px]">
              {product.rating && (
                <span className="flex items-center gap-0.5 text-yellow-400">
                  ⭐ {product.rating.toFixed(1)}
                </span>
              )}
              {product.shipping && (
                <span className="text-cyan-400">🚚 {product.shipping}</span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            navigator.clipboard.writeText(JSON.stringify({
              title: product.title,
              price: product.price,
              merchant: product.merchant,
              url: product.url,
              image_url: product.image_url,
            }, null, 2));
          }}
          className="opacity-0 group-hover:opacity-100 p-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-400 hover:text-white transition-all self-start"
          title="Copy product data"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function ShoppingLinkCard({ link }: { link: ShoppingLink }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 p-2.5 bg-gray-700/30 hover:bg-emerald-500/10 rounded-lg
                 border border-gray-600/30 hover:border-emerald-500/30 transition-all"
    >
      <span className="text-xl w-8 text-center">{link.logo}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-200 group-hover:text-emerald-400 transition-colors">{link.merchant}</p>
      </div>
      <svg className="w-4 h-4 text-gray-500 group-hover:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}

function WebEntityTag({ entity }: { entity: WebEntity }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-700/50 text-gray-300 rounded-full text-xs">
      {entity.description}
      <span className="text-gray-500 text-[10px]">{(entity.score * 100).toFixed(0)}%</span>
    </span>
  );
}

function SimilarImageGrid({ images }: { images: string[] }) {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const validImages = images.filter(img => !failedImages.has(img));
  if (validImages.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-1.5">
      {validImages.slice(0, 9).map((url, idx) => (
        <a key={idx} href={url} target="_blank" rel="noopener noreferrer"
          className="aspect-square bg-gray-700 rounded-lg overflow-hidden hover:ring-2 hover:ring-cyan-500 transition-all">
          <img src={url} alt={`Similar ${idx + 1}`} className="w-full h-full object-cover"
            onError={() => setFailedImages(prev => new Set([...prev, url]))} />
        </a>
      ))}
    </div>
  );
}

export default function ProductLinksPanel({ searchResult, isLoading, objectLabel, objectId, originalImageUrl, objectBoundingBox, onClose, onProductsFound }: ProductLinksPanelProps) {
  const [activeTab, setActiveTab] = useState<'products' | 'similar' | 'tags'>('products');
  
  // Separate state for image search and keyword search results
  const [imageSearchResult, setImageSearchResult] = useState<ShoppingSearchResult | null>(null);
  const [keywordSearchResult, setKeywordSearchResult] = useState<ShoppingSearchResult | null>(null);
  const [isLoadingImageSearch, setIsLoadingImageSearch] = useState(false);
  const [isLoadingKeywordSearch, setIsLoadingKeywordSearch] = useState(false);
  
  const [searchKeyword, setSearchKeyword] = useState(objectLabel || '');
  const [lastSearchedKeyword, setLastSearchedKeyword] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // Reset state when switching to a different object
  useEffect(() => {
    if (objectLabel && objectLabel !== 'Entire Image') {
      setSearchKeyword(objectLabel);
    }
    // Reset all search results when objectId changes
    setImageSearchResult(null);
    setKeywordSearchResult(null);
    setLastSearchedKeyword('');
    setHasSearched(false);
  }, [objectId, objectLabel]);

  // Image-based search using Google Lens (cropped object image)
  // Note: Only works with PUBLIC URLs (imgix, etc). Blob URLs from file uploads won't work.
  const fetchImageSearch = useCallback(async () => {
    if (!originalImageUrl || !objectBoundingBox) {
      console.log('[ProductLinksPanel] Skipping image search - no URL or bounding box');
      return;
    }
    
    // Skip if it's a blob URL (from file upload) - Google Lens can't access these
    if (originalImageUrl.startsWith('blob:')) {
      console.log('[ProductLinksPanel] Skipping image search - blob URL not accessible by Google Lens');
      setImageSearchResult({
        success: false,
        products: [],
        error: 'Image search requires a public URL. Enter an image URL (e.g., imgix) to enable image search.',
        search_type: 'image',
        request_id: '',
        processing_time_ms: 0,
        query: '',
        source: 'skipped',
      });
      return;
    }
    
    setIsLoadingImageSearch(true);
    try {
      console.log('[ProductLinksPanel] Starting IMAGE search...');
      console.log('  - originalImageUrl:', originalImageUrl.slice(0, 80) + '...');
      console.log('  - objectBoundingBox:', objectBoundingBox);
      
      const result = await shoppingSearch('', { 
        image_url: originalImageUrl,
        bounding_box: objectBoundingBox,
      });
      
      // Only set if it was actually an image search
      if (result.search_type === 'image') {
        setImageSearchResult(result);
        console.log(`[ProductLinksPanel] Image search completed - ${result.products?.length || 0} products`);
        
        // Save products to object
        if (result.success && result.products && result.products.length > 0 && objectId && onProductsFound) {
          const relatedProducts: RelatedProduct[] = result.products.map(p => ({
            title: p.title,
            url: p.url,
            price: p.price,
            extracted_price: p.extracted_price,
            image_url: p.image_url,
            merchant: p.merchant,
            rating: p.rating,
            reviews_count: p.reviews_count,
            shipping: p.shipping,
          }));
          onProductsFound(objectId, relatedProducts);
        }
      } else {
        // Backend fell back to keyword search, store it there instead
        console.log('[ProductLinksPanel] Backend fell back to keyword search');
        setKeywordSearchResult(result);
      }
    } catch (error) {
      console.error('Image search error:', error);
    } finally {
      setIsLoadingImageSearch(false);
    }
  }, [originalImageUrl, objectBoundingBox, objectId, onProductsFound]);

  // Keyword-based search using Google Shopping
  const fetchKeywordSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;
    
    setLastSearchedKeyword(query);
    setIsLoadingKeywordSearch(true);
    try {
      console.log('[ProductLinksPanel] Starting KEYWORD search for:', query);
      
      // Force keyword search by not passing image_url
      const result = await shoppingSearch(query, {});
      setKeywordSearchResult(result);
      
      console.log(`[ProductLinksPanel] Keyword search completed - ${result.products?.length || 0} products`);
      
      // Save products to object if no image search results
      if (!imageSearchResult?.products?.length && result.success && result.products && result.products.length > 0 && objectId && onProductsFound) {
        const relatedProducts: RelatedProduct[] = result.products.map(p => ({
          title: p.title,
          url: p.url,
          price: p.price,
          extracted_price: p.extracted_price,
          image_url: p.image_url,
          merchant: p.merchant,
          rating: p.rating,
          reviews_count: p.reviews_count,
          shipping: p.shipping,
        }));
        onProductsFound(objectId, relatedProducts);
      }
    } catch (error) {
      console.error('Keyword search error:', error);
    } finally {
      setIsLoadingKeywordSearch(false);
    }
  }, [objectId, onProductsFound, imageSearchResult]);

  // Run both searches - image search first, then keyword search
  const runBothSearches = useCallback(async (keyword: string) => {
    setHasSearched(true);
    
    // Run both searches in parallel
    await Promise.all([
      fetchImageSearch(),
      fetchKeywordSearch(keyword),
    ]);
  }, [fetchImageSearch, fetchKeywordSearch]);

  // Auto-trigger searches when objectLabel changes
  useEffect(() => {
    if (objectLabel && objectLabel !== 'Entire Image' && searchResult?.success && !hasSearched) {
      runBothSearches(objectLabel);
    }
  }, [objectLabel, searchResult?.success, runBothSearches, hasSearched]);

  // Combined loading state
  const isLoadingShopping = isLoadingImageSearch || isLoadingKeywordSearch;
  
  // Combined product count
  const totalProducts = (imageSearchResult?.products?.length || 0) + (keywordSearchResult?.products?.length || 0);

  // Products tab now shows shopping results (with prices) - the most useful for tagging
  const tabs = [
    { id: 'products', label: 'Products', count: totalProducts, icon: '🛒', loading: isLoadingShopping },
    { id: 'similar', label: 'Similar', count: searchResult?.visually_similar_images?.length || 0, icon: '🖼️' },
    { id: 'tags', label: 'Tags', count: searchResult?.web_entities?.length || 0, icon: '🏷️' },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-900/50">
      {/* Header */}
      <div className="p-3 border-b border-gray-700/50 bg-gradient-to-r from-orange-500/5 to-pink-500/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
              <span className="text-sm">🔍</span>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-gray-200">Visual Search</h3>
              {objectLabel && (
                <p className="text-xs text-gray-500 truncate max-w-[150px]">{objectLabel}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Search Info */}
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {searchResult && (
            <p className="text-[10px] text-gray-500 flex items-center gap-1">
              {(searchResult as unknown as { fromCache?: boolean }).fromCache ? (
                <>
                  <span className="text-emerald-500">⚡</span> 
                  <span className="text-emerald-400">Cached</span>
                </>
              ) : (
                <>
                  <span className="text-yellow-500">⚡</span> 
                  {searchResult.processing_time_ms}ms
                </>
              )}
            </p>
          )}
          
          {/* Search Status Indicators */}
          <div className="flex flex-wrap gap-1">
            {imageSearchResult?.success && imageSearchResult.products && imageSearchResult.products.length > 0 && (
              <div className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <span>📷</span>
                <span>{imageSearchResult.products.length}</span>
              </div>
            )}
            {keywordSearchResult?.success && keywordSearchResult.products && keywordSearchResult.products.length > 0 && (
              <div className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 bg-blue-500/20 text-blue-300 border border-blue-500/30">
                <span>🔤</span>
                <span>{keywordSearchResult.products.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-10 h-10 border-3 border-gray-600 border-t-cyan-500 rounded-full animate-spin mb-3"></div>
          <p className="text-gray-400 text-sm">Searching...</p>
        </div>
      )}

      {/* Error State */}
      {!isLoading && searchResult && !searchResult.success && (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-3">
            <span className="text-xl">❌</span>
          </div>
          <p className="text-red-400 text-sm font-medium">Search Failed</p>
          <p className="text-gray-500 text-xs mt-1 text-center">{searchResult.error}</p>
        </div>
      )}

      {/* Results */}
      {!isLoading && searchResult?.success && (
        <>
          {/* Tabs */}
          <div className="flex border-b border-gray-700/50 bg-gray-800/30">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex-1 py-2 px-2 text-[11px] font-medium transition-colors flex items-center justify-center gap-1
                  ${activeTab === tab.id
                    ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5'
                    : 'text-gray-500 hover:text-gray-300'
                  }`}
              >
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.loading ? (
                  <span className="w-3 h-3 border border-gray-500 border-t-cyan-400 rounded-full animate-spin"></span>
                ) : (
                  <span className="text-[10px] opacity-60">({tab.count})</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-3">
            {/* Products Tab - Shows shopping results with prices */}
            {activeTab === 'products' && (
              <div className="space-y-4">
                {/* IMAGE SEARCH RESULTS SECTION */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-purple-400 text-sm">📷</span>
                    <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Image Search</span>
                    <span className="text-[10px] text-gray-500">(Google Lens)</span>
                    {isLoadingImageSearch && (
                      <span className="w-3 h-3 border border-purple-500/50 border-t-purple-400 rounded-full animate-spin"></span>
                    )}
                  </div>
                  
                  {isLoadingImageSearch ? (
                    <div className="flex items-center justify-center py-4 bg-purple-500/5 rounded-lg border border-purple-500/20">
                      <span className="text-xs text-gray-400">Searching by image...</span>
                    </div>
                  ) : imageSearchResult?.success && imageSearchResult.products && imageSearchResult.products.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-500">{imageSearchResult.products.length} visually similar products</span>
                        <button
                          onClick={() => {
                            const data = imageSearchResult.products?.map(p => ({ title: p.title, price: p.price, merchant: p.merchant, url: p.url }));
                            navigator.clipboard.writeText(JSON.stringify(data, null, 2));
                          }}
                          className="text-[10px] px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30"
                        >
                          📋 Copy
                        </button>
                      </div>
                      {imageSearchResult.products.slice(0, 6).map((product, idx) => (
                        <ProductCard key={`img-${idx}`} product={product} accentColor="purple" />
                      ))}
                    </div>
                  ) : !isLoadingImageSearch && hasSearched ? (
                    <div className="py-3 px-4 bg-gray-800/30 rounded-lg border border-gray-700/30 text-center">
                      <p className="text-xs text-gray-500">No image search results</p>
                      <p className="text-[10px] text-gray-600 mt-1">Try entering an imgix URL for better results</p>
                    </div>
                  ) : null}
                </div>

                {/* KEYWORD SEARCH RESULTS SECTION */}
                <div className="space-y-2 p-3 bg-blue-500/5 rounded-lg border border-blue-500/20">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400 text-sm">🔤</span>
                    <span className="text-xs font-semibold text-blue-300 uppercase tracking-wider">Keyword Search</span>
                    <span className="text-[10px] text-gray-500">(Google Shopping)</span>
                    {isLoadingKeywordSearch && (
                      <span className="w-3 h-3 border border-blue-500/50 border-t-blue-400 rounded-full animate-spin"></span>
                    )}
                  </div>
                  
                  {/* Search Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchKeywordSearch(searchKeyword)}
                      placeholder="Search by keyword..."
                      className="flex-1 px-2.5 py-1.5 bg-gray-900 border border-gray-600 rounded-lg text-xs text-gray-200 
                                placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => fetchKeywordSearch(searchKeyword)}
                      disabled={isLoadingKeywordSearch || !searchKeyword.trim()}
                      className="px-2.5 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500
                                text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                    >
                      {isLoadingKeywordSearch ? (
                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      ) : (
                        <>🔍 Search</>
                      )}
                    </button>
                  </div>
                  
                  {/* Suggested Keywords */}
                  {(() => {
                    const bestGuess = (searchResult as unknown as { best_guess_labels?: string[] } | null)?.best_guess_labels || [];
                    const webEntities = searchResult?.web_entities?.slice(0, 5).map(e => e.description) || [];
                    const suggestions = [...new Set([objectLabel, ...bestGuess, ...webEntities])].filter(Boolean).slice(0, 5);
                    
                    if (suggestions.length === 0) return null;
                    
                    return (
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-[10px] text-gray-500">Try:</span>
                        {suggestions.map((keyword, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setSearchKeyword(keyword || '');
                              fetchKeywordSearch(keyword || '');
                            }}
                            className={`px-2 py-0.5 text-[10px] rounded-full transition-colors ${
                              keyword === lastSearchedKeyword 
                                ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50' 
                                : 'bg-gray-700/50 text-gray-400 hover:bg-blue-500/20 hover:text-blue-300 border border-transparent'
                            }`}
                          >
                            {keyword}
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                  
                  {lastSearchedKeyword && (
                    <p className="text-[10px] text-gray-500">
                      Searched: &quot;<span className="text-blue-400">{lastSearchedKeyword}</span>&quot;
                    </p>
                  )}
                  
                  {isLoadingKeywordSearch ? (
                    <div className="flex items-center justify-center py-4 bg-blue-500/5 rounded-lg border border-blue-500/20">
                      <span className="text-xs text-gray-400">Searching by keyword...</span>
                    </div>
                  ) : keywordSearchResult?.success && keywordSearchResult.products && keywordSearchResult.products.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-500">{keywordSearchResult.products.length} products found</span>
                        <button
                          onClick={() => {
                            const data = keywordSearchResult.products?.map(p => ({ title: p.title, price: p.price, merchant: p.merchant, url: p.url }));
                            navigator.clipboard.writeText(JSON.stringify(data, null, 2));
                          }}
                          className="text-[10px] px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30"
                        >
                          📋 Copy
                        </button>
                      </div>
                      {keywordSearchResult.products.slice(0, 8).map((product, idx) => (
                        <ProductCard key={`kw-${idx}`} product={product} accentColor="blue" />
                      ))}
                    </div>
                  ) : !isLoadingKeywordSearch && lastSearchedKeyword ? (
                    <div className="py-3 px-4 bg-gray-800/30 rounded-lg border border-gray-700/30 text-center">
                      <p className="text-xs text-gray-500">No keyword search results</p>
                    </div>
                  ) : null}
                </div>

                {/* Show quick search links if no products at all */}
                {!isLoadingShopping && !imageSearchResult?.products?.length && !keywordSearchResult?.products?.length && 
                 keywordSearchResult?.shopping_links && keywordSearchResult.shopping_links.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-gray-500 mb-2">No products found. Search on:</p>
                    {keywordSearchResult.shopping_links.map((link, idx) => (
                      <ShoppingLinkCard key={idx} link={link} />
                    ))}
                  </div>
                )}
                
                {/* Show quick search links below products if both exist */}
                {(imageSearchResult?.products?.length || keywordSearchResult?.products?.length) && 
                 keywordSearchResult?.shopping_links && keywordSearchResult.shopping_links.length > 0 && (
                  <div className="space-y-1.5 mt-4 pt-3 border-t border-gray-700/50">
                    <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Search More</h4>
                    {keywordSearchResult.shopping_links.slice(0, 4).map((link, idx) => (
                      <ShoppingLinkCard key={idx} link={link} />
                    ))}
                  </div>
                )}

                {/* Empty state when no searches have been done */}
                {!hasSearched && !isLoadingShopping && (
                  <div className="text-center py-4 text-gray-500">
                    <p className="text-sm">Click search or select a keyword above</p>
                    <p className="text-xs mt-1 text-gray-600">Image search runs automatically if URL is provided</p>
                  </div>
                )}
              </div>
            )}

            {/* Similar Images Tab */}
            {activeTab === 'similar' && (
              <div className="space-y-3">
                <SimilarImageGrid images={searchResult?.visually_similar_images || []} />
                {searchResult?.pages_with_matching_images && searchResult.pages_with_matching_images.length > 0 && (
                  <div className="mt-3">
                    <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Found On</h4>
                    <div className="space-y-1">
                      {searchResult.pages_with_matching_images.slice(0, 5).map((page, idx) => (
                        <a key={idx} href={page.url} target="_blank" rel="noopener noreferrer"
                          className="block p-2 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors">
                          <p className="text-xs text-gray-200 truncate">{page.title}</p>
                          <p className="text-[10px] text-gray-500 truncate">{page.url}</p>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tags Tab */}
            {activeTab === 'tags' && (() => {
              const bestGuessLabels = (searchResult as unknown as { best_guess_labels?: string[] } | null)?.best_guess_labels || [];
              const labelScores = (searchResult as unknown as { labels?: Array<{ description: string; score: number }> } | null)?.labels || [];
              
              return (
              <div className="space-y-3">
                {bestGuessLabels.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">🎯 Best Guess</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {bestGuessLabels.map((label, idx) => (
                        <span key={idx} className="px-2.5 py-1 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 rounded-full text-xs font-medium">
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">🏷️ Detected</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {searchResult?.web_entities?.map((entity, idx) => (
                      <WebEntityTag key={idx} entity={entity} />
                    )) || <p className="text-xs text-gray-500">No tags found</p>}
                  </div>
                </div>
                {labelScores.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">📋 Labels</h4>
                    <div className="space-y-1">
                      {labelScores.slice(0, 8).map((label, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="text-gray-300">{label.description}</span>
                          <span className="text-gray-500">{(label.score * 100).toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              );
            })()}
          </div>
        </>
      )}

      {/* Empty State */}
      {!isLoading && !searchResult && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-gray-500">
          <span className="text-4xl mb-3">🔍</span>
          <p className="text-center text-xs">
            Click <strong className="text-orange-400">Find Similar</strong>
            <br />on any detected object
          </p>
        </div>
      )}
    </div>
  );
}
