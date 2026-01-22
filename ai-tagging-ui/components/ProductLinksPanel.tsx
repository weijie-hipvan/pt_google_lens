'use client';

import { useState, useEffect } from 'react';
import { VisualSearchResult, ProductMatch, WebEntity, ShoppingSearchResult, ShoppingLink } from '@/types/ai';
import { shoppingSearch } from '@/lib/api';

interface ProductLinksPanelProps {
  searchResult: VisualSearchResult | null;
  isLoading: boolean;
  objectLabel?: string;
  onClose: () => void;
}

function ProductCard({ product }: { product: ProductMatch }) {
  return (
    <a
      href={product.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block p-3 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg
                 border border-gray-600/30 hover:border-cyan-500/30 transition-all"
    >
      <div className="flex gap-3">
        <div className="w-14 h-14 flex-shrink-0 bg-gray-700 rounded-lg overflow-hidden">
          {product.image_url ? (
            <img src={product.image_url} alt={product.title} className="w-full h-full object-cover"
              onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500 text-xl">📷</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-200 line-clamp-2 group-hover:text-cyan-400 transition-colors leading-tight">
            {product.title}
          </h4>
          <div className="flex items-center gap-2 mt-1.5">
            {product.merchant && (
              <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded">
                {product.merchant}
              </span>
            )}
            <span className="text-[10px] text-gray-500">{(product.score * 100).toFixed(0)}%</span>
          </div>
          {product.price && (
            <span className="text-sm font-bold text-emerald-400 mt-1 block">{product.price}</span>
          )}
        </div>
      </div>
    </a>
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

export default function ProductLinksPanel({ searchResult, isLoading, objectLabel, onClose }: ProductLinksPanelProps) {
  const [activeTab, setActiveTab] = useState<'products' | 'shop' | 'similar' | 'tags'>('products');
  const [shoppingResult, setShoppingResult] = useState<ShoppingSearchResult | null>(null);
  const [isLoadingShopping, setIsLoadingShopping] = useState(false);
  const [shoppingQuery, setShoppingQuery] = useState<string | null>(null);

  // Automatically trigger shopping search when visual search completes
  useEffect(() => {
    if (!searchResult?.success) return;
    
    // Determine the best query for shopping search
    let query: string | null = null;
    
    // Priority 1: Use best_guess_labels from visual search (most accurate)
    const bestGuessLabels = (searchResult as unknown as { best_guess_labels?: string[] }).best_guess_labels;
    if (bestGuessLabels && bestGuessLabels.length > 0) {
      query = bestGuessLabels[0];
      console.log('[Shopping] Using best_guess_label:', query);
    }
    // Priority 2: Use top web entity with high score
    else if (searchResult.web_entities && searchResult.web_entities.length > 0) {
      const topEntity = searchResult.web_entities.find(e => e.score > 0.5 && e.description);
      if (topEntity) {
        query = topEntity.description;
        console.log('[Shopping] Using web_entity:', query);
      }
    }
    // Priority 3: Use objectLabel if it's not "Entire Image"
    else if (objectLabel && objectLabel !== 'Entire Image') {
      query = objectLabel;
      console.log('[Shopping] Using objectLabel:', query);
    }
    
    // Trigger shopping search if we have a valid query and it's different from current
    if (query) {
      setShoppingQuery(prevQuery => {
        if (prevQuery !== query) {
          fetchShoppingLinks(query!);
          return query;
        }
        return prevQuery;
      });
    }
     
  }, [searchResult, objectLabel]);

  const fetchShoppingLinks = async (query: string) => {
    console.log('[Shopping] Fetching shopping links for:', query);
    setIsLoadingShopping(true);
    try {
      const result = await shoppingSearch(query);
      console.log('[Shopping] Got result:', result.success, result.products?.length, 'products');
      setShoppingResult(result);
    } catch (error) {
      console.error('Shopping search error:', error);
    } finally {
      setIsLoadingShopping(false);
    }
  };

  const tabs = [
    { id: 'products', label: 'Products', count: searchResult?.product_matches?.length || 0, icon: '🛒' },
    { id: 'shop', label: 'Shop', count: (shoppingResult?.products?.length || 0) + (shoppingResult?.shopping_links?.length || 0), icon: '💰', loading: isLoadingShopping },
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
              {shoppingQuery ? (
                <p className="text-xs text-emerald-400 truncate max-w-[150px]">🛒 {shoppingQuery}</p>
              ) : objectLabel ? (
                <p className="text-xs text-gray-500 truncate max-w-[150px]">{objectLabel}</p>
              ) : null}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {searchResult && (
          <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-1">
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
            {/* Products Tab */}
            {activeTab === 'products' && (
              <div className="space-y-2">
                {searchResult?.product_matches && searchResult.product_matches.length > 0 ? (
                  searchResult.product_matches.map((product, idx) => (
                    <ProductCard key={idx} product={product} />
                  ))
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <p className="text-sm">No products found</p>
                    <p className="text-xs mt-1">Try the Shop tab for retailers</p>
                  </div>
                )}
              </div>
            )}

            {/* Shop Links Tab */}
            {activeTab === 'shop' && (
              <div className="space-y-3">
                {isLoadingShopping ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="w-6 h-6 border-2 border-gray-600 border-t-emerald-500 rounded-full animate-spin"></div>
                  </div>
                ) : shoppingResult?.success ? (
                  <>
                    {shoppingResult.products && shoppingResult.products.length > 0 && (
                      <div className="space-y-2 mb-4">
                        <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">With Prices</h4>
                        {shoppingResult.products.slice(0, 8).map((product, idx) => (
                          <a key={idx} href={product.url} target="_blank" rel="noopener noreferrer"
                            className="group block p-2.5 bg-emerald-500/5 hover:bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                            <div className="flex gap-2">
                              {product.image_url && (
                                <img src={product.image_url} alt="" className="w-14 h-14 rounded object-cover flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-200 line-clamp-2 leading-tight">{product.title}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  {product.price && <span className="text-sm font-bold text-emerald-400">{product.price}</span>}
                                  {product.merchant && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded">{product.merchant}</span>
                                  )}
                                </div>
                                {/* Rating, reviews, shipping */}
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[10px]">
                                  {product.rating && (
                                    <span className="flex items-center gap-0.5 text-yellow-400">
                                      ⭐ {product.rating.toFixed(1)}
                                    </span>
                                  )}
                                  {product.reviews_count && (
                                    <span className="text-gray-500">({product.reviews_count.toLocaleString()} reviews)</span>
                                  )}
                                  {product.shipping && (
                                    <span className="text-cyan-400">🚚 {product.shipping}</span>
                                  )}
                                  {product.condition && (
                                    <span className="text-orange-400">📦 {product.condition}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                    {shoppingResult.shopping_links && shoppingResult.shopping_links.length > 0 && (
                      <div className="space-y-1.5">
                        <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Quick Search</h4>
                        {shoppingResult.shopping_links.map((link, idx) => (
                          <ShoppingLinkCard key={idx} link={link} />
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <p className="text-sm">Failed to load</p>
                    <button onClick={() => objectLabel && fetchShoppingLinks(objectLabel)}
                      className="mt-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs">
                      Retry
                    </button>
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
