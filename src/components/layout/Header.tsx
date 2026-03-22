import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, ShoppingCart, User, Menu, X, ChevronDown, CheckCircle, Loader2, Truck, Pencil } from "lucide-react";
import { useLanguage, localeLabel, localeFlag } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { categories } from "@/config/products";
import FlagIcon from "@/components/FlagIcon";
import { api, unwrapApiList, type ApiResponse, type Product, resolveUploadImageUrl } from "@/lib/api";
import { usePublicSettings } from "@/hooks/useApi";
import { useCMSPageContent } from "@/hooks/useCMS";
import { apiProductToStorefront, productDetailHref, type StorefrontProduct } from "@/lib/storefront-product";

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw?.trim()) return fallback;
  try {
    const v = JSON.parse(raw);
    return (v ?? fallback) as T;
  } catch {
    return fallback;
  }
}

export default function Header() {
  const { data: pubRes } = usePublicSettings();
  const pub = (pubRes?.data ?? {}) as Record<string, string>;
  const brandName = pub.store_name || pub.site_name || "REMQUIP";
  const { user } = useAuth();
  const canEditHeader =
    user?.role === "admin" || user?.role === "super_admin" || user?.role === "manager";
  const { t, lang, setLang, supportedLocales } = useLanguage();
  const { data: homeCmsSections = [] } = useCMSPageContent("home", lang);
  const headerBlock = useMemo(
    () =>
      (homeCmsSections as { section_key: string; content?: string; image_url?: string }[]).find(
        (s) => s.section_key === "site_header"
      ),
    [homeCmsSections]
  );
  const headerCms = useMemo(
    () =>
      parseJson<{
        announcement?: string;
        announcement_link_url?: string;
        announcement_link_label?: string;
        trust_chips?: string[];
      }>(headerBlock?.content, {}),
    [headerBlock?.content]
  );
  const announcement = headerCms.announcement?.trim() ?? "";
  const announcementHref = headerCms.announcement_link_url?.trim() ?? "";
  const announcementLinkLabel = headerCms.announcement_link_label?.trim() ?? "";
  const trustChips = (headerCms.trust_chips ?? []).map((c) => c.trim()).filter(Boolean).slice(0, 4);
  const logoUrl = headerBlock?.image_url?.trim() ? resolveUploadImageUrl(headerBlock.image_url.trim()) : "";
  const showAnnouncement = announcement.length > 0;
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
    <div className="site-header-search-panel z-50 max-h-[380px] overflow-y-auto divide-y divide-border/70">
      {!loading && results.length > 0 && (
        <div className="sticky top-0 z-[1] border-b border-border/60 bg-muted/50 px-3 py-2 backdrop-blur-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t("nav.search.quick_results")}
          </p>
        </div>
      )}
      {loading && (
        <div className="flex items-center justify-center gap-2.5 px-4 py-6 text-sm text-muted-foreground">
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
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/70"
          >
            {p.image ? (
              <img
                src={p.image}
                alt=""
                className="h-12 w-12 shrink-0 rounded-lg border border-border/50 object-cover bg-muted shadow-sm"
              />
            ) : (
              <div className="h-12 w-12 shrink-0 rounded-lg border border-border/60 bg-muted" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
              <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                {p.sku} · {formatPrice(p.price)}
              </p>
            </div>
            {p.stock > 0 && <CheckCircle className="h-4 w-4 shrink-0 text-success" strokeWidth={2} />}
          </button>
        ))}
      {!loading && results.length === 0 && query.length >= 2 && (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">{t("products.not_found")}</div>
      )}
      {!loading && results.length > 0 && (
        <button
          type="button"
          onClick={() => {
            navigate(`/products?q=${encodeURIComponent(query)}`);
            setShowResults(false);
            setSearchQuery("");
          }}
          className="w-full border-t border-border/60 bg-muted/25 px-4 py-3 text-center text-sm font-semibold text-accent transition-colors hover:bg-muted/45"
        >
          View all results →
        </button>
      )}
    </div>
  );

  const path = location.pathname;
  const navLinkClass = (to: string, exact?: boolean) => {
    const active = exact ? path === to : path === to || (to !== "/" && path.startsWith(to));
    return [
      "relative whitespace-nowrap px-1 py-2 text-[13px] font-medium tracking-wide transition-colors border-b-2 -mb-px",
      active
        ? "text-nav-foreground border-nav-accent"
        : "text-nav-foreground/65 border-transparent hover:text-nav-foreground hover:border-white/20",
    ].join(" ");
  };

  /* Main bar can be two rows on small screens (identity + search); keep menu below shell */
  const mobileOverlayTop = showAnnouncement ? "top-[10rem]" : "top-[7rem]";

  const headerEditLink = canEditHeader ? (
    <Link
      to="/admin/landing#section-site_header"
      className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/[0.06] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-nav-foreground/85 hover:bg-white/[0.11] hover:text-nav-foreground transition-colors shrink-0"
      title="Edit site header in Admin → Landing"
    >
      <Pencil className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden />
      Edit header
    </Link>
  ) : null;

  return (
    <header className="site-header-shell">
      {showAnnouncement && (
        <div className="site-header-announcement border-b border-white/10">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 py-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1 text-[11px] sm:text-xs text-nav-foreground/90 text-center sm:text-left">
                <Truck className="h-3.5 w-3.5 text-accent shrink-0 hidden sm:inline" aria-hidden />
                <span className="font-medium tracking-wide">{announcement}</span>
                {announcementHref && announcementLinkLabel && (
                  <Link
                    to={announcementHref}
                    className="text-accent font-semibold hover:underline underline-offset-2 sm:ml-1"
                  >
                    {announcementLinkLabel}
                  </Link>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 min-w-0">
                {headerEditLink}
                {trustChips.length > 0 && (
                  <div className="hidden md:flex items-center flex-wrap justify-end gap-2">
                    {trustChips.map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-nav-foreground/80"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Primary row — retail-style: identity | search | utilities */}
      <div className="site-header-main nav-bar">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap md:flex-nowrap items-center gap-y-2 gap-x-3 md:gap-x-4 lg:gap-x-6 min-h-[52px] md:min-h-[56px] py-2 md:py-2.5 border-b border-white/[0.07]">
            {/* Brand + primary nav */}
            <div className="flex min-w-0 flex-1 md:flex-none items-center justify-between md:justify-start gap-4 lg:gap-8">
              <Link
                to="/"
                className="flex items-center gap-2.5 min-w-0 shrink-0 group transition-opacity hover:opacity-95"
              >
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt=""
                    className="h-8 md:h-[38px] w-auto max-w-[120px] sm:max-w-[168px] object-contain object-left"
                  />
                ) : null}
                <span
                  className={`font-display font-semibold tracking-[0.06em] text-nav-foreground uppercase truncate max-w-[7rem] sm:max-w-none ${
                    logoUrl ? "text-xs sm:text-[16px]" : "text-[15px] md:text-[17px]"
                  }`}
                >
                  {brandName}
                </span>
              </Link>
              <nav className="hidden lg:flex items-center gap-5 border-l border-white/10 pl-6 ml-1" aria-label="Principal">
                <Link to="/products" className={navLinkClass("/products")}>
                  {t("nav.products")}
                </Link>
                <Link to="/about" className={navLinkClass("/about", true)}>
                  {t("nav.about")}
                </Link>
                <Link to="/contact" className={navLinkClass("/contact", true)}>
                  {t("nav.contact")}
                </Link>
              </nav>
            </div>

            {/* Search — full-width row on tablet; centered column on desktop */}
            <div
              className="order-last md:order-none w-full md:w-auto md:flex-1 md:min-w-0 md:max-w-none flex justify-stretch md:px-2 lg:px-4"
              ref={searchRef}
            >
              <form onSubmit={handleSearchSubmit} className="relative mx-auto w-full md:max-w-xl lg:max-w-2xl" role="search">
                <div className="site-header-search-bar">
                  <div className="flex min-w-0 flex-1 items-center gap-2.5 py-1 pl-3 pr-1 sm:gap-3 sm:pl-4">
                    <span className="site-header-search-icon-wrap" aria-hidden>
                      <Search className="h-4 w-4" strokeWidth={2} />
                    </span>
                    <input
                      type="search"
                      autoComplete="off"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
                      placeholder={t("nav.search.placeholder")}
                      className="site-header-search-input"
                    />
                  </div>
                  <button
                    type="submit"
                    className="site-header-search-submit self-center"
                    disabled={searchQuery.trim().length < 2}
                  >
                    {t("nav.search.button")}
                  </button>
                </div>
                {showResults && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-2 sm:mt-2.5">
                    <SearchResultsList
                      results={searchResults}
                      query={searchQuery.trim()}
                      loading={showSearchPending}
                    />
                  </div>
                )}
              </form>
            </div>

            {/* Locale, currency, account, cart */}
            <div className="flex flex-shrink-0 items-center gap-0 sm:gap-0.5 md:gap-1 md:border-l md:border-white/12 md:pl-3 lg:pl-4">
            {!showAnnouncement && headerEditLink ? (
              <span className="hidden md:inline-flex mr-1 lg:mr-2">{headerEditLink}</span>
            ) : null}
            {/* Language */}
            <div className="relative hidden md:block" ref={langRef}>
              <button
                type="button"
                onClick={() => { setLangOpen(!langOpen); setCurrOpen(false); }}
                className="flex items-center gap-1.5 rounded-md px-2 py-2 text-sm text-nav-foreground/90 transition-colors hover:bg-white/[0.08] hover:text-nav-foreground"
                aria-label="Language"
                aria-expanded={langOpen}
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
                type="button"
                onClick={() => { setCurrOpen(!currOpen); setLangOpen(false); }}
                className="flex items-center gap-1.5 rounded-md px-2 py-2 text-sm text-nav-foreground/90 transition-colors hover:bg-white/[0.08] hover:text-nav-foreground"
                aria-label="Currency"
                aria-expanded={currOpen}
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
            <Link
              to="/login"
              className="hidden items-center gap-1.5 rounded-md px-2 py-2 text-nav-foreground/90 transition-colors hover:bg-white/[0.08] hover:text-nav-foreground md:flex"
              aria-label={t("nav.signin")}
            >
              <User className="h-[18px] w-[18px]" strokeWidth={2} />
              <span className="hidden text-xs font-medium lg:inline">{t("nav.signin")}</span>
            </Link>

            <Link
              to="/cart"
              className="relative flex items-center rounded-md p-2 text-nav-foreground/90 transition-colors hover:bg-white/[0.08] hover:text-nav-foreground"
              aria-label="Cart"
            >
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
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="rounded-md p-2 text-nav-foreground transition-colors hover:bg-white/[0.08] md:hidden"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-5 w-5" strokeWidth={2} /> : <Menu className="h-5 w-5" strokeWidth={2} />}
            </button>
          </div>
        </div>
        </div>
      </div>

      {/* Category strip — tab-style navigation */}
      <nav className="site-header-category-strip category-bar hidden md:block" aria-label={t("footer.categories")}>
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-start gap-1 overflow-x-auto py-0 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-t border-white/[0.06]">
            {categories.map((cat) => {
              const catPath = `/products/${cat.slug}`;
              const catActive = path === catPath;
              return (
                <Link
                  key={cat.id}
                  to={catPath}
                  className={`site-header-cat-link flex-shrink-0 whitespace-nowrap px-3 lg:px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors border-b-2 -mb-px ${
                    catActive
                      ? "text-foreground border-accent bg-category-bar-active/30"
                      : "text-category-bar-foreground/75 border-transparent hover:text-foreground hover:border-white/15 hover:bg-white/[0.04]"
                  }`}
                >
                  {t(cat.translationKey)}
                </Link>
              );
            })}
            <Link
              to="/products"
              className={`site-header-cat-link flex-shrink-0 whitespace-nowrap px-3 lg:px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors border-b-2 -mb-px ${
                path === "/products"
                  ? "text-foreground border-accent bg-category-bar-active/30"
                  : "text-category-bar-foreground/75 border-transparent hover:text-foreground hover:border-white/15 hover:bg-white/[0.04]"
              }`}
            >
              {t("cat.shop_all")}
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Mobile menu overlay ── */}
      {mobileOpen && (
        <div className={`md:hidden fixed inset-0 z-40 bg-background overflow-y-auto animate-fade-in ${mobileOverlayTop}`}>
          <div className="px-4 py-4 space-y-4">
            {canEditHeader && (
              <Link
                to="/admin/landing#section-site_header"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-md border border-border bg-secondary text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <Pencil className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                Edit header
              </Link>
            )}
            {/* Mobile search */}
            <div ref={mobileSearchRef} className="relative">
              <form onSubmit={handleSearchSubmit} className="flex min-h-[48px] items-stretch overflow-hidden rounded-full border border-border bg-background shadow-sm transition-[box-shadow,ring] focus-within:ring-2 focus-within:ring-accent/25" role="search">
                <div className="flex min-w-0 flex-1 items-center gap-2.5 py-1 pl-3 pr-1">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Search className="h-4 w-4" strokeWidth={2} aria-hidden />
                  </span>
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder={t("nav.search.placeholder")}
                    className="min-w-0 flex-1 border-0 bg-transparent py-2 text-[15px] text-foreground outline-none placeholder:text-muted-foreground/75"
                  />
                </div>
                <button
                  type="submit"
                  className="my-1 mr-1 shrink-0 self-center rounded-full bg-accent px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-accent-foreground shadow-sm transition-[filter,opacity] hover:brightness-105 disabled:opacity-40"
                  disabled={searchQuery.trim().length < 2}
                >
                  {t("nav.search.button")}
                </button>
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
