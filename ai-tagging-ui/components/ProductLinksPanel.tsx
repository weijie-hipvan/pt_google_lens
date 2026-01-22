'use client';

import { useState, useEffect } from 'react';
import { VisualSearchResult, WebEntity, ShoppingSearchResult, ShoppingLink } from '@/types/ai';
import { shoppingSearch } from '@/lib/api';

interface ProductLinksPanelProps {
  searchResult: VisualSearchResult | null;
  isLoading: boolean;
  objectLabel?: string;
  onClose: () => void;
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
  const [activeTab, setActiveTab] = useState<'products' | 'similar' | 'tags'>('products');
  const [shoppingResult, setShoppingResult] = useState<ShoppingSearchResult | null>(null);
  const [isLoadingShopping, setIsLoadingShopping] = useState(false);

  // Trigger shopping search when objectLabel changes (user clicks "Find Similar")
  useEffect(() => {
    if (objectLabel && objectLabel !== 'Entire Image' && searchResult?.success) {
      fetchShoppingLinks(objectLabel);
    }
  }, [objectLabel, searchResult?.success]);

  const fetchShoppingLinks = async (query: string) => {
    setIsLoadingShopping(true);
    try {
      const result = await shoppingSearch(query);
      setShoppingResult(result);
    } catch (error) {
      console.error('Shopping search error:', error);
    } finally {
      setIsLoadingShopping(false);
    }
  };

  // Products tab now shows shopping results (with prices) - the most useful for tagging
  const tabs = [
    { id: 'products', label: 'Products', count: shoppingResult?.products?.length || shoppingResult?.shopping_links?.length || 0, icon: '🛒', loading: isLoadingShopping },
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
            {/* Products Tab - Shows shopping results with prices */}
            {activeTab === 'products' && (
              <div className="space-y-3">
                {isLoadingShopping ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="w-6 h-6 border-2 border-gray-600 border-t-emerald-500 rounded-full animate-spin"></div>
                    <span className="ml-2 text-sm text-gray-400">Finding products...</span>
                  </div>
                ) : shoppingResult?.success ? (
                  <>
                    {shoppingResult.products && shoppingResult.products.length > 0 && (
                      <div className="space-y-3">
                        {/* Summary header */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">{shoppingResult.products.length} products found</span>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              const data = shoppingResult.products?.map(p => ({
                                title: p.title,
                                price: p.price,
                                merchant: p.merchant,
                                url: p.url,
                                rating: p.rating,
                                reviews: p.reviews_count,
                                shipping: p.shipping
                              }));
                              navigator.clipboard.writeText(JSON.stringify(data, null, 2));
                            }}
                            className="text-[10px] px-2 py-1 bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30 transition-colors"
                          >
                            📋 Copy All
                          </button>
                        </div>
                        {shoppingResult.products.slice(0, 12).map((product, idx) => (
                          <div key={idx} className="group p-3 bg-emerald-500/5 hover:bg-emerald-500/10 rounded-lg border border-emerald-500/20 hover:border-emerald-500/40 transition-all">
                            <div className="flex gap-3">
                              {product.image_url && (
                                <a href={product.url} target="_blank" rel="noopener noreferrer">
                                  <img src={product.image_url} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0 hover:ring-2 hover:ring-emerald-500 transition-all" />
                                </a>
                              )}
                              <div className="flex-1 min-w-0">
                                <a href={product.url} target="_blank" rel="noopener noreferrer" className="block">
                                  <p className="text-sm font-medium text-gray-200 line-clamp-2 leading-snug group-hover:text-emerald-300 transition-colors">{product.title}</p>
                                </a>
                                
                                {/* Price & Merchant Row */}
                                <div className="flex items-center gap-2 mt-1.5">
                                  {product.price && (
                                    <span className="text-base font-bold text-emerald-400">{product.price}</span>
                                  )}
                                  {product.merchant && (
                                    <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded">{product.merchant}</span>
                                  )}
                                </div>
                                
                                {/* Rating & Reviews Row */}
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs">
                                  {product.rating && (
                                    <span className="flex items-center gap-1 text-yellow-400">
                                      <span>⭐</span> 
                                      <span className="font-medium">{product.rating.toFixed(1)}</span>
                                    </span>
                                  )}
                                  {product.reviews_count && (
                                    <span className="text-gray-500">({product.reviews_count.toLocaleString()} reviews)</span>
                                  )}
                                </div>
                                
                                {/* Shipping & Condition Row */}
                                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                                  {product.shipping && (
                                    <span className="text-cyan-400 flex items-center gap-1">
                                      <span>🚚</span> {product.shipping}
                                    </span>
                                  )}
                                  {product.condition && (
                                    <span className="text-orange-400 flex items-center gap-1">
                                      <span>📦</span> {product.condition}
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              {/* Copy button */}
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const data = {
                                    title: product.title,
                                    price: product.price,
                                    extracted_price: product.extracted_price,
                                    merchant: product.merchant,
                                    url: product.url,
                                    image_url: product.image_url,
                                    rating: product.rating,
                                    reviews_count: product.reviews_count,
                                    shipping: product.shipping,
                                    condition: product.condition
                                  };
                                  navigator.clipboard.writeText(JSON.stringify(data, null, 2));
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-400 hover:text-white transition-all self-start"
                                title="Copy product data"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Show quick search links if no products with prices */}
                    {(!shoppingResult.products || shoppingResult.products.length === 0) && 
                     shoppingResult.shopping_links && shoppingResult.shopping_links.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs text-gray-500 mb-2">No products with prices found. Search on:</p>
                        {shoppingResult.shopping_links.map((link, idx) => (
                          <ShoppingLinkCard key={idx} link={link} />
                        ))}
                      </div>
                    )}
                    {/* Show quick search links below products if both exist */}
                    {shoppingResult.products && shoppingResult.products.length > 0 && 
                     shoppingResult.shopping_links && shoppingResult.shopping_links.length > 0 && (
                      <div className="space-y-1.5 mt-4 pt-3 border-t border-gray-700/50">
                        <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Search More</h4>
                        {shoppingResult.shopping_links.slice(0, 4).map((link, idx) => (
                          <ShoppingLinkCard key={idx} link={link} />
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <p className="text-sm">No products loaded yet</p>
                    <p className="text-xs mt-1 text-gray-600">Click &quot;Find Similar&quot; on an object to search</p>
                    {objectLabel && (
                      <button onClick={() => fetchShoppingLinks(objectLabel)}
                        className="mt-3 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs font-medium transition-colors">
                        🔍 Search for &quot;{objectLabel}&quot;
                      </button>
                    )}
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
