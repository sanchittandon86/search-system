import { useEffect, useRef, useState } from "react";
import { getRecommendations, postEvent, searchProducts, SearchParams, TEST_USER_ID } from "../api";
import { Cart } from "../components/Cart";
import { Header } from "../components/Header";
import { Hero } from "../components/Hero";
import { ProductCard } from "../components/ProductCard";
import { ProductDetailModal } from "../components/ProductDetailModal";
import { Recommendations } from "../components/Recommendations";
import { SearchBar } from "../components/SearchBar";
import { CartItem, Product } from "../types";

const DEFAULT_RECOMMENDATION_LIMIT = 4;
const EXPANDED_RECOMMENDATION_LIMIT = 20;

export function StorefrontPage() {
  const [results, setResults] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [recommendationSource, setRecommendationSource] = useState<"personalized" | "fallback" | null>(null);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [recommendationsExpanded, setRecommendationsExpanded] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const productsRef = useRef<HTMLDivElement>(null);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  }

  async function runSearch(params: SearchParams) {
    setSearchLoading(true);
    setSearchError(null);
    try {
      const response = await searchProducts(params);
      setResults(response.results);
      setTotal(response.total);
    } catch (err) {
      setSearchError((err as Error).message);
    } finally {
      setSearchLoading(false);
    }
  }

  async function loadRecommendations(limit: number) {
    setRecommendationsLoading(true);
    try {
      const response = await getRecommendations(TEST_USER_ID, limit);
      setRecommendations(response.recommendations);
      setRecommendationSource(response.source);
    } catch (err) {
      console.warn("failed to load recommendations:", err);
    } finally {
      setRecommendationsLoading(false);
    }
  }

  useEffect(() => {
    runSearch({});
    loadRecommendations(DEFAULT_RECOMMENDATION_LIMIT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch(params: SearchParams) {
    if (params.q) {
      postEvent({ eventType: "SEARCH_PERFORMED", searchQuery: params.q });
    }
    runSearch(params);
  }

  function handleView(product: Product) {
    postEvent({ eventType: "PRODUCT_CLICKED", productId: product.productId });
    setViewingProduct(product);
    postEvent({ eventType: "PRODUCT_VIEWED", productId: product.productId });
  }

  function handleAddToCart(product: Product) {
    postEvent({ eventType: "ADD_TO_CART", productId: product.productId });
    setCart((prev) => {
      const existing = prev.find((item) => item.product.productId === product.productId);
      if (existing) {
        return prev.map((item) =>
          item.product.productId === product.productId ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    showToast(`Added "${product.name}" to cart`);
  }

  function handleRemoveFromCart(productId: string) {
    postEvent({ eventType: "REMOVE_FROM_CART", productId });
    setCart((prev) => prev.filter((item) => item.product.productId !== productId));
  }

  function handleWishlist(product: Product) {
    postEvent({ eventType: "WISHLISTED", productId: product.productId });
    showToast(`Wishlisted "${product.name}"`);
  }

  function handleCheckout() {
    cart.forEach((item) => {
      postEvent({ eventType: "PURCHASED", productId: item.product.productId, metadata: { quantity: item.quantity } });
    });
    setCart([]);
    setCartOpen(false);
    showToast("Order placed (simulated - no real order/payment system, per readme.txt scope)");
  }

  function handleExplore() {
    productsRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function handleViewAllRecommendations() {
    setRecommendationsExpanded(true);
    loadRecommendations(EXPANDED_RECOMMENDATION_LIMIT);
  }

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="storefront">
      <Header cartCount={cartCount} onCartClick={() => setCartOpen(true)} onShopClick={handleExplore} />

      <div className="storefront__layout">
        <main className="storefront__main">
          <Hero onExplore={handleExplore} />

          <div ref={productsRef} className="storefront__search">
            <SearchBar onSearch={handleSearch} />
          </div>

          <h2 className="section-heading">Featured Products</h2>
          {searchError && <p className="error">{searchError}</p>}
          {searchLoading && <p>Loading…</p>}
          {!searchLoading && !searchError && (
            <>
              <p className="results-meta">{total} product(s) found</p>
              <div className="product-grid">
                {results.map((product) => (
                  <ProductCard
                    key={product.productId}
                    product={product}
                    onView={handleView}
                    onAddToCart={handleAddToCart}
                    onWishlist={handleWishlist}
                  />
                ))}
              </div>
            </>
          )}
        </main>

        <Recommendations
          products={recommendations}
          source={recommendationSource}
          loading={recommendationsLoading}
          expanded={recommendationsExpanded}
          onView={handleView}
          onViewAll={handleViewAllRecommendations}
        />
      </div>

      {viewingProduct && (
        <ProductDetailModal
          product={viewingProduct}
          onClose={() => setViewingProduct(null)}
          onAddToCart={(p) => {
            handleAddToCart(p);
            setViewingProduct(null);
          }}
          onWishlist={handleWishlist}
        />
      )}

      {cartOpen && (
        <Cart items={cart} onClose={() => setCartOpen(false)} onRemove={handleRemoveFromCart} onCheckout={handleCheckout} />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
