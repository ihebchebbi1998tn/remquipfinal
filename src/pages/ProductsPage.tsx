import React, { useState, useMemo } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { SlidersHorizontal, X, Search, ShoppingCart, Package, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useCart } from "@/contexts/CartContext";
import { categories, products } from "@/config/products";
import { useProducts, useCategories } from "@/hooks/useApi";
import { unwrapApiList, type Product, type ProductCategory } from "@/lib/api";
import { apiProductToStorefront, productDetailHref } from "@/lib/storefront-product";
import { RemquipLoadingScreen } from "@/components/RemquipLoadingScreen";

type SortOption = "featured" | "price_low" | "price_high" | "newest";

const PRICE_RANGES = [
  { min: 0, max: 30, label: "$0 – $30" },
  { min: 30, max: 60, label: "$30 – $60" },
  { min: 60, max: 100, label: "$60 – $100" },
  { min: 100, max: 200, label: "$100 – $200" },
  { min: 200, max: Infinity, label: "$200+" },
];

export default function ProductsPage() {
  const { categorySlug } = useParams<{ categorySlug?: string }>();
  const [searchParams] = useSearchParams();
  const searchFromUrl = searchParams.get("q") || "";
  const { t, lang } = useLanguage();
  const { formatPrice } = useCurrency();
  const { addItem } = useCart();

  const [sort, setSort] = useState<SortOption>("featured");
  const [priceRange, setPriceRange] = useState<number | null>(null);
  const [stockOnly, setStockOnly] = useState(false);
  const [mobileFilters, setMobileFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchFromUrl);

  const { data: productsResponse, isLoading: isLoadingProducts } = useProducts(1, 100);
  const { data: categoriesResponse, isLoading: isLoadingCategories } = useCategories(lang);
  
  const apiProducts: Product[] = unwrapApiList<Product>(productsResponse, products);
  const categoriesList: ProductCategory[] = unwrapApiList<ProductCategory>(categoriesResponse, categories);
  const isLoading = isLoadingProducts || isLoadingCategories;

  const category = categorySlug ? categoriesList.find((c) => c.slug === categorySlug) || categories.find((c) => c.slug === categorySlug) : null;
  const pageTitle = category ? (category.name || (category as any).translationKey) : searchFromUrl ? `Search: "${searchFromUrl}"` : t("cat.shop_all");

  const filtered = useMemo(() => {
    const productList = apiProducts.length > 0 ? apiProducts : products;
    let list = categorySlug ? productList.filter((p) => p.category_id === category?.id || (p as any).categorySlug === categorySlug) : [...productList];

    const q = (searchQuery || searchFromUrl).toLowerCase().trim();
    if (q.length >= 2) {
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    }

    if (priceRange !== null) {
      const range = PRICE_RANGES[priceRange];
      list = list.filter((p) => p.price >= range.min && p.price < range.max);
    }

    if (stockOnly) {
      list = list.filter((p) => {
        const sq = (p as any).stock_quantity ?? (p as any).stock ?? 0;
        return Number(sq) > 0;
      });
    }

    switch (sort) {
      case "price_low": list.sort((a, b) => a.price - b.price); break;
      case "price_high": list.sort((a, b) => b.price - a.price); break;
      case "newest": list.sort((a, b) => {
        const tb = (b as any).created_at ? new Date((b as any).created_at).getTime() : 0;
        const ta = (a as any).created_at ? new Date((a as any).created_at).getTime() : 0;
        return tb - ta;
      }); break;
    }

    return list;
  }, [categorySlug, sort, priceRange, stockOnly, searchQuery, searchFromUrl, apiProducts, category]);

  const hasActiveFilters = priceRange !== null || stockOnly || searchQuery.length >= 2;

  function clearFilters() {
    setPriceRange(null);
    setStockOnly(false);
    setSearchQuery("");
  }

  const filterPanel = (
    <div className="space-y-8 pr-2">
      {/* Search */}
      <div>
        <h3 className="font-display font-bold text-xs uppercase tracking-widest text-muted-foreground mb-4">Search</h3>
        <div className="relative group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-accent transition-colors" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by keyword..."
            className="w-full pl-10 pr-4 py-3 text-sm rounded-xl bg-muted/40 border border-transparent hover:border-border/50 outline-none focus:bg-background focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all font-medium placeholder:font-normal"
          />
        </div>
      </div>

      {/* Categories */}
      <div>
        <h3 className="font-display font-bold text-xs uppercase tracking-widest text-muted-foreground mb-4">{t("footer.categories")}</h3>
        <ul className="space-y-1">
          <li>
            <Link to="/products" className={`group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${!categorySlug ? "bg-accent/10 text-accent" : "text-foreground/80 hover:bg-muted/60 hover:text-foreground"}`}>
              {t("cat.shop_all")}
              {!categorySlug && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
            </Link>
          </li>
          {(categoriesList.length > 0 ? categoriesList : categories).map((cat) => (
            <li key={cat.id}>
              <Link
                to={`/products/${cat.slug}`}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${cat.slug === categorySlug ? "bg-accent/10 text-accent" : "text-foreground/80 hover:bg-muted/60 hover:text-foreground"}`}
              >
                {cat.name || (cat as any).translationKey}
                {cat.slug === categorySlug && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Price range */}
      <div>
        <h3 className="font-display font-bold text-xs uppercase tracking-widest text-muted-foreground mb-4">{t("products.shop_by_price")}</h3>
        <ul className="space-y-1">
          {PRICE_RANGES.map((range, i) => (
            <li key={i}>
              <button
                onClick={() => setPriceRange(priceRange === i ? null : i)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${priceRange === i ? "bg-accent/5" : "hover:bg-muted/40"}`}
              >
                <div className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${priceRange === i ? "border-accent" : "border-border/80"}`}>
                  {priceRange === i && <div className="h-2 w-2 rounded-full bg-accent animate-in zoom-in" />}
                </div>
                <span className={priceRange === i ? "text-foreground font-semibold" : "text-foreground/80"}>{range.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Stock filter */}
      <div>
        <h3 className="font-display font-bold text-xs uppercase tracking-widest text-muted-foreground mb-4">{t("products.availability")}</h3>
        <label className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer hover:bg-muted/40 transition-colors">
          <div className="relative flex items-center justify-center shrink-0">
            <input
              type="checkbox"
              checked={stockOnly}
              onChange={(e) => setStockOnly(e.target.checked)}
              className="peer appearance-none h-4 w-4 border border-border/80 rounded-[4px] checked:bg-accent checked:border-accent transition-all cursor-pointer"
            />
            <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-foreground/90 font-medium">{t("products.in_stock_only")}</span>
        </label>
      </div>

      {hasActiveFilters && (
        <div className="pt-4 border-t border-border">
          <button onClick={clearFilters} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold text-destructive hover:bg-destructive/10 transition-colors">
            <X className="h-4 w-4" strokeWidth={2.5} /> {t("products.clear_filters")}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-background min-h-screen">
      {/* Title Header Section */}
      <div className="bg-muted/30 border-b border-border">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-[radial-gradient(circle_at_100%_0%,hsl(var(--accent)/0.05),transparent_50%)] pointer-events-none" />
          
          <nav className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-4 md:mb-6" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-foreground transition-colors">{t("nav.home")}</Link>
            <ChevronRight className="h-3 w-3 opacity-50" />
            <span className="text-foreground">{pageTitle}</span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
            <div>
              <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-foreground">{pageTitle}</h1>
              {category && category.description && (
                <p className="mt-4 text-muted-foreground text-sm sm:text-base max-w-2xl leading-relaxed">{category.description}</p>
              )}
            </div>
            
            <button onClick={() => setMobileFilters(true)} className="md:hidden flex items-center justify-center gap-2 text-sm font-bold border border-border bg-card shadow-sm rounded-xl px-4 py-3 hover:bg-muted/50 transition-colors w-full sm:w-auto">
              <SlidersHorizontal className="h-4 w-4" /> {t("products.filters")}
              {hasActiveFilters && <span className="h-2 w-2 rounded-full bg-accent ml-1" />}
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="flex gap-8 lg:gap-12 pl-0 lg:pl-4">
          
          {/* Sidebar - desktop */}
          <aside className="hidden md:block w-64 flex-shrink-0 lg:border-r lg:border-border/50 lg:pr-8 py-2">
            {filterPanel}
          </aside>

          {/* Mobile filter drawer */}
          {mobileFilters && (
            <div className="fixed inset-0 z-[110] md:hidden">
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileFilters(false)} />
              <div className="absolute right-0 top-0 bottom-0 w-[85vw] max-w-sm bg-card border-l border-border/50 p-6 overflow-y-auto shadow-2xl animate-slide-in-right">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-display font-black text-xl uppercase tracking-tight text-foreground">{t("products.filters")}</h3>
                  <button onClick={() => setMobileFilters(false)} className="p-2 -mr-2 bg-muted rounded-full hover:bg-muted/80 text-foreground transition-colors"><X className="h-5 w-5" strokeWidth={2.5} /></button>
                </div>
                {filterPanel}
              </div>
            </div>
          )}

          {/* Product grid */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 mb-6 bg-muted/20 px-4 rounded-xl border border-border/40">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <span className="text-foreground">{filtered.length}</span> {t("products.count")}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground hidden sm:inline">{t("products.sort_by")}</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortOption)}
                  className="text-sm font-semibold border-none rounded-lg pl-3 pr-8 py-2 bg-background shadow-sm text-foreground outline-none focus:ring-2 focus:ring-accent/20 cursor-pointer appearance-none relative"
                  style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1em' }}
                >
                  <option value="featured">{t("products.featured")}</option>
                  <option value="price_low">{t("products.price_low")}</option>
                  <option value="price_high">{t("products.price_high")}</option>
                  <option value="newest">{t("products.newest")}</option>
                </select>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-20 px-4 rounded-2xl border border-border border-dashed bg-muted/10">
                <RemquipLoadingScreen variant="embedded" message={t("products.loading")} />
              </div>
            ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 xl:gap-8 auto-rows-fr">
              {filtered.map((product) => {
                const sf = apiProductToStorefront(product as Record<string, unknown>);
                const isOutOfStock = sf.stock === 0;
                
                return (
                  <div key={product.id} className="group relative flex flex-col bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-500 border border-border/60">
                    <Link to={productDetailHref(sf.id, sf.slug)} className="block aspect-[4/3] overflow-hidden bg-muted/40 relative">
                      {sf.image ? (
                        <img 
                           src={sf.image} 
                           alt={product.name} 
                           className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out ${isOutOfStock ? "opacity-50 grayscale" : ""}`} 
                           loading="lazy" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 bg-muted/20">
                          <Package className="h-16 w-16 opacity-30 drop-shadow-sm" strokeWidth={1.5} />
                        </div>
                      )}
                      
                      {/* Dark gradient overlay on hover for pop */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                      
                      {isOutOfStock ? (
                        <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-md text-foreground text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-sm shadow-sm border border-border">
                          {t("products.out_of_stock")}
                        </div>
                      ) : sf.stock <= 20 ? (
                        <div className="absolute top-4 left-4 bg-accent text-accent-foreground text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-sm shadow-md animate-pulse">
                          {t("products.low_stock")}
                        </div>
                      ) : null}
                    </Link>
                    
                    <div className="p-5 sm:p-6 flex flex-col flex-1 relative bg-card z-10">
                      <p className="text-[10px] text-muted-foreground font-display font-black uppercase tracking-widest mb-2 opacity-60 group-hover:opacity-100 transition-opacity">SKU: {product.sku}</p>
                      
                      <Link to={productDetailHref(sf.id, sf.slug)} className="text-sm sm:text-base font-semibold text-foreground hover:text-accent transition-colors line-clamp-2 leading-snug mb-auto font-display">
                        {product.name}
                      </Link>
                      
                      <div className="mt-5 flex items-end justify-between">
                        <p className="text-lg sm:text-xl font-display font-black text-foreground tracking-tight">{formatPrice(sf.price)}</p>
                      </div>
                      
                      {/* Animated Cart Button (Desktop) */}
                      <div className="mt-0 lg:max-h-0 lg:opacity-0 lg:overflow-hidden lg:group-hover:mt-5 lg:group-hover:max-h-[80px] lg:group-hover:opacity-100 transition-all duration-300 ease-out">
                        <button
                          type="button"
                          onClick={() => addItem(sf)}
                          disabled={isOutOfStock}
                          className="w-full bg-foreground text-background text-xs py-3.5 rounded-lg font-display font-black uppercase tracking-widest hover:bg-accent hover:text-accent-foreground active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                        >
                          <ShoppingCart className="h-[18px] w-[18px]" strokeWidth={2.5} /> {t("products.add_to_cart")}
                        </button>
                      </div>
                      
                      {/* Always visible on mobile */}
                      <div className="mt-5 lg:hidden">
                        <button
                          type="button"
                          onClick={() => addItem(sf)}
                          disabled={isOutOfStock}
                          className="w-full bg-foreground text-background text-xs py-3.5 rounded-lg font-display font-black uppercase tracking-widest active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm hover:bg-accent hover:text-accent-foreground"
                        >
                          <ShoppingCart className="h-[18px] w-[18px]" strokeWidth={2.5} /> {t("products.add_to_cart")}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            )}

            {!isLoading && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 px-4 text-center rounded-2xl border border-border border-dashed bg-muted/10">
                <div className="h-20 w-20 bg-card rounded-full flex items-center justify-center shadow-sm mb-6 border border-border/50">
                  <Package className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <h3 className="font-display font-black text-xl uppercase tracking-tight text-foreground mb-2">No products found</h3>
                <p className="text-muted-foreground max-w-sm mb-6">{t("products.not_found")}</p>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="landing-machined-cta inline-flex items-center gap-2 px-6 py-3 rounded-sm font-display font-bold text-xs uppercase tracking-widest text-foreground hover:bg-muted/80 transition-colors">
                    <X className="h-4 w-4" /> {t("products.clear_filters")}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
