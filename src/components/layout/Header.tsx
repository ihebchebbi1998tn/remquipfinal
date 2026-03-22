import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, ShoppingCart, User, Menu, X, ChevronDown, CheckCircle, Loader2 } from "lucide-react";
import { useLanguage, localeLabel, localeFlag } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useCart } from "@/contexts/CartContext";
import { categories } from "@/config/products";
import FlagIcon from "@/components/FlagIcon";
import { api, unwrapApiList, type ApiResponse, type Product } from "@/lib/api";
import { usePublicSettings } from "@/hooks/useApi";
import { apiProductToStorefront, productDetailHref, type StorefrontProduct } from "@/lib/storefront-product";

export default function Header() {
  const { data: pubRes } = usePublicSettings();
  const pub = (pubRes?.data ?? {}) as Record<string, string>;
  const brandName = pub.store_name || pub.site_name || "REMQUIP";
  const { t, lang, setLang, supportedLocales } = useLanguage();
  const { currency, setCurrency, formatPrice } = useCurrency();
  const { itemCount, lastAddedAt } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [currOpen, setCurrOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<StorefrontProduct[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [mobileSearchFocused, setMobileSearchFocused] = useState(false);
  const [badgeBounce, setBadgeBounce] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const currRef = useRef<HTMLDivElement>(null);

  // Animate badge when items added
  useEffect(() => {
    if (lastAddedAt > 0) {
      setBadgeBounce(true);
      const timer = setTimeout(() => setBadgeBounce(false), 600);
      return () => clearTimeout(timer);
    }
  }, [lastAddedAt]);

  // Close on route change
  useEffect(() => {
    setMobileOpen(false);
    setShowResults(false);
    setSearchQuery("");
  }, [location.pathname]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
      if (currRef.current && !currRef.current.contains(e.target as Node)) setCurrOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false);
      if (mobileSearchRef.current && !mobileSearchRef.current.contains(e.target as Node)) setMobileSearchFocused(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Prevent scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  /** Debounce trimmed query before hitting the catalog API */
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setDebouncedQuery("");
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    const t = window.setTimeout(() => setDebouncedQuery(trimmed), 320);
    return () => window.clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (debouncedQuery.length < 2) return;

    let cancelled = false;
    setSearchLoading(true);
    (async () => {
      try {
        const res = await api.searchProducts(debouncedQuery, 8);
        if (cancelled) return;
        const rows = unwrapApiList<Product>(res as ApiResponse<unknown>, []);
        setSearchResults(
          rows.slice(0, 6).map((row) => apiProductToStorefront(row as Record<string, unknown>))
        );
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    const trimmed = query.trim();
    if (trimmed.length >= 2) {
      setShowResults(true);
      setMobileSearchFocused(true);
    } else {
      setShowResults(false);
      setMobileSearchFocused(false);
    }
  }, []);

  function selectResult(p: StorefrontProduct) {
    navigate(productDetailHref(p.id, p.slug));
    setShowResults(false);
    setMobileSearchFocused(false);
    setSearchQuery("");
    setMobileOpen(false);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.length >= 2) {
      navigate(`/products?q=${encodeURIComponent(searchQuery)}`);
      setShowResults(false);
      setMobileSearchFocused(false);
      setMobileOpen(false);
    }
  }

  const langFlag = localeFlag(lang);
  const currFlag = currency === "CAD" ? "ca" : currency === "USD" ? "us" : "eu";

  const trimmedForUi = searchQuery.trim();
  const pendingDebounce = trimmedForUi.length >= 2 && debouncedQuery !== trimmedForUi;
  const showSearchPending = searchLoading || pendingDebounce;

  const SearchResultsList = ({
    results,
    query,
    loading,
  }: {
    results: StorefrontProduct[];
    query: string;
    loading: boolean;
  }) => (
    <div className="bg-card border border-border rounded-md shadow-xl z-50 max-h-[360px] overflow-y-auto divide-y divide-border">
      {loading && (
        <div className="flex items-center justify-center gap-2 px-4 py-5 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-accent" />
          Searching…
        </div>
      )}
      {!loading &&
        results.map((p) => (
          <button
            type="button"
            key={p.id}
            onClick={() => selectResult(p)}
            className="flex items-center gap-3 w-full px-3 py-3 text-left hover:bg-secondary/80 transition-colors"
          >
            {p.image ? (
              <img src={p.image} alt="" className="w-11 h-11 rounded object-cover bg-secondary flex-shrink-0" />
            ) : (
              <div className="w-11 h-11 rounded bg-secondary border border-border flex-shrink-0" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
              <p className="text-xs text-muted-foreground">
                {p.sku} · {formatPrice(p.price)}
              </p>
            </div>
            {p.stock > 0 && <CheckCircle className="h-3.5 w-3.5 text-success flex-shrink-0" />}
          </button>
        ))}
      {!loading && results.length === 0 && query.length >= 2 && (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">{t("products.not_found")}</div>
      )}
      {!loading && results.length > 0 && (
        <button
          type="button"
          onClick={() => {
            navigate(`/products?q=${encodeURIComponent(query)}`);
            setShowResults(false);
            setSearchQuery("");
          }}
          className="w-full px-4 py-2.5 text-center text-sm text-accent font-medium hover:bg-secondary/60 transition-colors"
        >
          View all results →
        </button>
      )}
    </div>
  );

  return (
    <header className="sticky top-0 z-50 shadow-sm">
      {/* Main bar */}
      <div className="nav-bar border-b border-white/10">
        <div className="container mx-auto px-4 flex items-center justify-between h-14 md:h-[60px] gap-4">
          {/* Logo */}
          <Link to="/" className="font-display text-base md:text-lg font-semibold tracking-[0.12em] text-nav-foreground flex-shrink-0 uppercase">
            {brandName}
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden lg:flex items-center gap-1">
            <Link to="/products" className="px-4 py-2 text-sm font-medium text-nav-foreground/90 hover:text-nav-accent transition-colors">
              {t("nav.products")}
            </Link>
            <Link to="/about" className="px-4 py-2 text-sm font-medium text-nav-foreground/90 hover:text-nav-accent transition-colors">
              {t("nav.about")}
            </Link>
            <Link to="/contact" className="px-4 py-2 text-sm font-medium text-nav-foreground/90 hover:text-nav-accent transition-colors">
              {t("nav.contact")}
            </Link>
          </nav>

          {/* Desktop search */}
          <div className="hidden md:flex flex-1 max-w-sm mx-4 lg:max-w-md" ref={searchRef}>
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-nav-foreground/50 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
                placeholder={t("nav.search.placeholder")}
                className="w-full pl-9 pr-3 py-2 rounded border-0 bg-white/10 text-nav-foreground text-sm focus:ring-1 focus:ring-white/30 outline-none placeholder:text-nav-foreground/50"
              />
              {showResults && (
                <div className="absolute top-full left-0 right-0 mt-1.5">
                  <SearchResultsList
                    results={searchResults}
                    query={searchQuery.trim()}
                    loading={showSearchPending}
                  />
                </div>
              )}
            </form>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Language */}
            <div className="relative hidden md:block" ref={langRef}>
              <button
                onClick={() => { setLangOpen(!langOpen); setCurrOpen(false); }}
                className="flex items-center gap-1.5 text-sm text-nav-foreground hover:text-nav-accent transition-colors px-2 py-1.5 rounded-sm"
                aria-label="Language"
              >
                <FlagIcon country={langFlag} className="w-5 h-3.5 rounded-[2px] overflow-hidden" />
                <span className="hidden lg:inline text-xs font-medium">{lang === "en" ? "EN" : "FR"}</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>
              {langOpen && (
                <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-md shadow-lg py-1 min-w-[140px] z-50 animate-fade-in">
                  {supportedLocales.map((loc) => (
                    <button
                      key={loc}
                      onClick={() => { setLang(loc); setLangOpen(false); }}
                      className="flex items-center gap-2.5 w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors"
                    >
                      <FlagIcon country={localeFlag(loc)} className="w-5 h-3.5 rounded-[2px] overflow-hidden" />
                      {localeLabel(loc)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Currency */}
            <div className="relative hidden md:block" ref={currRef}>
              <button
                onClick={() => { setCurrOpen(!currOpen); setLangOpen(false); }}
                className="flex items-center gap-1.5 text-sm text-nav-foreground hover:text-nav-accent transition-colors px-2 py-1.5 rounded-sm"
                aria-label="Currency"
              >
                <FlagIcon country={currFlag} className="w-5 h-3.5 rounded-[2px] overflow-hidden" />
                <span className="hidden lg:inline text-xs font-medium">{currency}</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>
              {currOpen && (
                <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-md shadow-lg py-1 min-w-[150px] z-50 animate-fade-in">
                  {([["CAD", "ca", "C$"], ["USD", "us", "$"], ["EUR", "eu", "€"]] as const).map(([code, flag, sym]) => (
                    <button
                      key={code}
                      onClick={() => { setCurrency(code as "CAD" | "USD" | "EUR"); setCurrOpen(false); }}
                      className={`flex items-center gap-2.5 w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors ${currency === code ? "font-semibold text-accent" : ""}`}
                    >
                      <FlagIcon country={flag} className="w-5 h-3.5 rounded-[2px] overflow-hidden" />
                      {code} ({sym})
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Account */}
            <Link to="/login" className="hidden md:flex items-center gap-1.5 text-nav-foreground hover:text-nav-accent transition-colors px-2 py-1.5 rounded-sm" aria-label="Sign in">
              <User className="h-4.5 w-4.5" />
              <span className="hidden lg:inline text-xs font-medium">{t("nav.signin")}</span>
            </Link>

            {/* Cart */}
            <Link to="/cart" className="flex items-center text-nav-foreground hover:text-nav-accent transition-colors relative p-1.5 rounded-sm" aria-label="Cart">
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span
                  className={`absolute -top-0.5 -right-0.5 bg-accent text-accent-foreground text-[10px] font-bold rounded-full h-[18px] min-w-[18px] flex items-center justify-center px-1 leading-none transition-transform ${
                    badgeBounce ? "animate-cart-bounce" : ""
                  }`}
                >
                  {itemCount}
                </span>
              )}
            </Link>

            {/* Mobile toggle */}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-nav-foreground p-1" aria-label="Menu">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Category bar (desktop) */}
      <nav className="category-bar hidden md:block">
        <div className="container mx-auto px-4 flex items-center justify-center gap-px">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/products/${cat.slug}`}
              className={`px-4 lg:px-5 py-3 text-xs font-medium transition-colors ${
                location.pathname === `/products/${cat.slug}`
                  ? "bg-category-bar-active text-foreground"
                  : "text-category-bar-foreground/95 hover:bg-white/5"
              }`}
            >
              {t(cat.translationKey)}
            </Link>
          ))}
          <Link
            to="/products"
            className="px-4 lg:px-5 py-3 text-xs font-medium text-category-bar-foreground/95 hover:bg-white/5 transition-colors"
          >
            {t("cat.shop_all")}
          </Link>
        </div>
      </nav>

      {/* ── Mobile menu overlay ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 top-14 z-40 bg-background overflow-y-auto animate-fade-in">
          <div className="px-4 py-4 space-y-4">
            {/* Mobile search */}
            <div ref={mobileSearchRef} className="relative">
              <form onSubmit={handleSearchSubmit}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder={t("nav.search.placeholder")}
                  className="w-full pl-10 pr-4 py-2.5 rounded-md bg-secondary text-foreground text-sm border border-border outline-none focus:ring-2 focus:ring-accent"
                />
              </form>
              {mobileSearchFocused && searchQuery.trim().length >= 2 && (
                <div className="mt-1.5">
                  <SearchResultsList
                    results={searchResults}
                    query={searchQuery.trim()}
                    loading={showSearchPending}
                  />
                </div>
              )}
            </div>

            {/* Main links */}
            <div className="space-y-0.5">
              <Link to="/products" onClick={() => setMobileOpen(false)} className="block py-2.5 px-3 text-sm font-medium text-foreground hover:bg-secondary rounded-md">
                {t("nav.products")}
              </Link>
              <Link to="/about" onClick={() => setMobileOpen(false)} className="block py-2.5 px-3 text-sm font-medium text-foreground hover:bg-secondary rounded-md">
                {t("nav.about")}
              </Link>
              <Link to="/contact" onClick={() => setMobileOpen(false)} className="block py-2.5 px-3 text-sm font-medium text-foreground hover:bg-secondary rounded-md">
                {t("footer.contact")}
              </Link>
            </div>

            <hr className="border-border" />

            {/* Categories */}
            <div className="space-y-0.5">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2 font-medium">{t("footer.categories")}</p>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/products/${cat.slug}`}
                  onClick={() => setMobileOpen(false)}
                  className={`block py-2.5 px-3 text-sm font-medium rounded-md transition-colors ${
                    location.pathname === `/products/${cat.slug}` ? "bg-accent/10 text-accent" : "text-foreground hover:bg-secondary"
                  }`}
                >
                  {t(cat.translationKey)}
                </Link>
              ))}
              <Link to="/products" onClick={() => setMobileOpen(false)} className="block py-2.5 px-3 text-sm font-medium text-foreground hover:bg-secondary rounded-md">
                {t("cat.shop_all")}
              </Link>
            </div>

            <hr className="border-border" />

            {/* Account */}
            <Link to="/login" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 py-2.5 px-3 text-sm font-medium text-foreground hover:bg-secondary rounded-md">
              <User className="h-4 w-4" />
              {t("nav.signin")}
            </Link>

            <hr className="border-border" />

            {/* Language */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-medium">{t("language")}</p>
              <div className="flex gap-2">
                {supportedLocales.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => setLang(loc)}
                    className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-md transition-colors ${
                      lang === loc ? "bg-accent text-accent-foreground font-semibold" : "bg-secondary text-foreground hover:bg-border"
                    }`}
                  >
                    <FlagIcon country={localeFlag(loc)} className="w-5 h-3.5 rounded-[2px] overflow-hidden" /> {localeLabel(loc)}
                  </button>
                ))}
              </div>
            </div>

            {/* Currency */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-medium">{t("currency")}</p>
              <div className="flex gap-2">
                {([["CAD", "ca", "C$"], ["USD", "us", "$"], ["EUR", "eu", "€"]] as const).map(([code, flag, sym]) => (
                  <button
                    key={code}
                    onClick={() => setCurrency(code as "CAD" | "USD" | "EUR")}
                    className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-md transition-colors ${
                      currency === code ? "bg-accent text-accent-foreground font-semibold" : "bg-secondary text-foreground hover:bg-border"
                    }`}
                  >
                    <FlagIcon country={flag} className="w-4 h-3 rounded-[1px] overflow-hidden" /> {code}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
