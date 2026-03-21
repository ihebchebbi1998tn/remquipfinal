import React, { useState, useMemo } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { SlidersHorizontal, X, Search } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useCart } from "@/contexts/CartContext";
import { categories, products } from "@/config/products";

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
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();
  const { addItem } = useCart();

  const [sort, setSort] = useState<SortOption>("featured");
  const [priceRange, setPriceRange] = useState<number | null>(null);
  const [stockOnly, setStockOnly] = useState(false);
  const [mobileFilters, setMobileFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchFromUrl);

  const category = categorySlug ? categories.find((c) => c.slug === categorySlug) : null;
  const pageTitle = category ? t(category.translationKey) : searchFromUrl ? `Search: "${searchFromUrl}"` : t("cat.shop_all");

  const filtered = useMemo(() => {
    let list = categorySlug ? products.filter((p) => p.categorySlug === categorySlug) : [...products];

    // Apply search query (from URL or local)
    const q = (searchQuery || searchFromUrl).toLowerCase().trim();
    if (q.length >= 2) {
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.compatibility && p.compatibility.some(c => c.toLowerCase().includes(q)))
      );
    }

    if (priceRange !== null) {
      const range = PRICE_RANGES[priceRange];
      list = list.filter((p) => p.price >= range.min && p.price < range.max);
    }

    if (stockOnly) {
      list = list.filter((p) => p.stock > 0);
    }

    switch (sort) {
      case "price_low": list.sort((a, b) => a.price - b.price); break;
      case "price_high": list.sort((a, b) => b.price - a.price); break;
      case "newest": list.sort((a, b) => b.id.localeCompare(a.id)); break;
    }

    return list;
  }, [categorySlug, sort, priceRange, stockOnly, searchQuery, searchFromUrl]);

  const hasActiveFilters = priceRange !== null || stockOnly || searchQuery.length >= 2;

  function clearFilters() {
    setPriceRange(null);
    setStockOnly(false);
    setSearchQuery("");
  }

  const filterPanel = (
    <div className="space-y-4">
      {/* Search within results */}
      <div className="border border-border rounded-sm p-4">
        <h3 className="font-display font-bold text-sm uppercase mb-3">Search</h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by keyword..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-sm bg-background outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="border border-border rounded-sm p-4">
        <h3 className="font-display font-bold text-sm uppercase mb-3">{t("footer.categories")}</h3>
        <ul className="space-y-2">
          <li>
            <Link to="/products" className={`text-sm transition-colors ${!categorySlug ? "text-accent font-medium" : "text-muted-foreground hover:text-foreground"}`}>
              {t("cat.shop_all")}
            </Link>
          </li>
          {categories.map((cat) => (
            <li key={cat.id}>
              <Link
                to={`/products/${cat.slug}`}
                className={`text-sm transition-colors ${cat.slug === categorySlug ? "text-accent font-medium" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t(cat.translationKey)}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Price range */}
      <div className="border border-border rounded-sm p-4">
        <h3 className="font-display font-bold text-sm uppercase mb-3">{t("products.shop_by_price")}</h3>
        <ul className="space-y-1.5">
          {PRICE_RANGES.map((range, i) => (
            <li key={i}>
              <button
                onClick={() => setPriceRange(priceRange === i ? null : i)}
                className={`text-sm transition-colors w-full text-left ${priceRange === i ? "text-accent font-medium" : "text-muted-foreground hover:text-foreground"}`}
              >
                {range.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Stock filter */}
      <div className="border border-border rounded-sm p-4">
        <h3 className="font-display font-bold text-sm uppercase mb-3">{t("products.availability")}</h3>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={stockOnly}
            onChange={(e) => setStockOnly(e.target.checked)}
            className="rounded-sm border-border accent-accent"
          />
          <span className="text-muted-foreground">{t("products.in_stock_only")}</span>
        </label>
      </div>

      {hasActiveFilters && (
        <button onClick={clearFilters} className="text-sm text-accent hover:underline flex items-center gap-1">
          <X className="h-3 w-3" /> {t("products.clear_filters")}
        </button>
      )}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground mb-4">
        <Link to="/" className="hover:text-foreground transition-colors">{t("nav.home")}</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{pageTitle}</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold uppercase">{pageTitle}</h1>
        <button onClick={() => setMobileFilters(true)} className="md:hidden flex items-center gap-2 text-sm border border-border rounded-sm px-3 py-2">
          <SlidersHorizontal className="h-4 w-4" /> {t("products.filters")}
        </button>
      </div>

      <div className="flex gap-6 lg:gap-8">
        {/* Sidebar - desktop */}
        <aside className="hidden md:block w-56 flex-shrink-0">
          {filterPanel}
        </aside>

        {/* Mobile filter drawer */}
        {mobileFilters && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-foreground/50" onClick={() => setMobileFilters(false)} />
            <div className="absolute right-0 top-0 bottom-0 w-72 bg-background p-4 overflow-y-auto shadow-lg animate-slide-in-right">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-lg">{t("products.filters")}</h3>
                <button onClick={() => setMobileFilters(false)}><X className="h-5 w-5" /></button>
              </div>
              {filterPanel}
            </div>
          </div>
        )}

        {/* Product grid */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <span className="text-sm text-muted-foreground">{filtered.length} {t("products.count")}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">{t("products.sort_by")}:</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="text-sm border border-border rounded-sm px-3 py-1.5 bg-background text-foreground outline-none"
              >
                <option value="featured">{t("products.featured")}</option>
                <option value="price_low">{t("products.price_low")}</option>
                <option value="price_high">{t("products.price_high")}</option>
                <option value="newest">{t("products.newest")}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
            {filtered.map((product) => (
              <div key={product.id} className="product-card group">
                <div className="aspect-square overflow-hidden bg-secondary relative">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  {product.stock === 0 && (
                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                      <span className="text-sm font-medium text-destructive uppercase">{t("products.out_of_stock")}</span>
                    </div>
                  )}
                  {product.stock > 0 && product.stock <= 20 && (
                    <span className="absolute top-2 left-2 badge-warning text-xs">{t("products.low_stock")}</span>
                  )}
                </div>
                <div className="p-3 md:p-4">
                  <Link to={`/product/${product.slug}`} className="text-sm font-medium text-foreground hover:text-accent transition-colors line-clamp-2 uppercase">
                    {product.name}
                  </Link>
                  <p className="text-xs text-muted-foreground mt-1">{product.sku}</p>
                  <p className="text-sm font-bold text-foreground mt-1">{formatPrice(product.price)}</p>
                  <button
                    onClick={() => addItem(product)}
                    disabled={product.stock === 0}
                    className="mt-2 w-full btn-accent text-xs py-2 rounded-sm font-medium uppercase tracking-wide disabled:opacity-50"
                  >
                    {t("products.add_to_cart")}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <p>{t("products.not_found")}</p>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="mt-2 text-sm text-accent hover:underline">
                  {t("products.clear_filters")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
