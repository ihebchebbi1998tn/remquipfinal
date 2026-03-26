import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { api, unwrapApiList, type Product, type ApiResponse } from "@/lib/api";
import { apiProductToStorefront, productDetailHref, type StorefrontProduct } from "@/lib/storefront-product";
import { RemquipSearchPulse } from "@/components/RemquipLoadingScreen";

interface HeaderSearchProps {
  onMobileClose?: () => void;
  isMobile?: boolean;
}

export function HeaderSearch({ onMobileClose, isMobile = false }: HeaderSearchProps) {
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<StorefrontProduct[]>([]);
  const [showResults, setShowResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setDebouncedQuery("");
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    const timer = window.setTimeout(() => setDebouncedQuery(trimmed), 320);
    return () => window.clearTimeout(timer);
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
          rows.slice(0, 6).map((row) => apiProductToStorefront(row as unknown as Record<string, unknown>))
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
    } else {
      setShowResults(false);
    }
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.length >= 2) {
      navigate(`/products?q=${encodeURIComponent(searchQuery)}`);
      setShowResults(false);
      if (onMobileClose) onMobileClose();
    }
  }

  function selectResult(p: StorefrontProduct) {
    navigate(productDetailHref(p.id, p.slug));
    setShowResults(false);
    setSearchQuery("");
    if (onMobileClose) onMobileClose();
  }

  const trimmedForUi = searchQuery.trim();
  const pendingDebounce = trimmedForUi.length >= 2 && debouncedQuery !== trimmedForUi;
  const showSearchPending = searchLoading || pendingDebounce;

  return (
    <div ref={containerRef} className={`relative ${isMobile ? 'w-full' : 'mx-auto w-full md:max-w-xl lg:max-w-2xl'}`}>
      <form onSubmit={handleSubmit} className="relative z-20 group" role="search">
          <div className={`flex items-center overflow-hidden transition-all duration-300 ${isMobile ? 'bg-background/50' : 'bg-white/10'} backdrop-blur-md border outline-none
          ${showResults && !isMobile ? 'rounded-t-2xl border-b-transparent border-white/20 shadow-lg shadow-[#1f354d]/5' : `rounded-full ${isMobile ? 'border-border hover:border-[#1f354d]/40' : 'border-white/20 hover:border-white/40'} focus-within:ring-2 focus-within:ring-white/20 focus-within:border-white/40`}
        `}>
          <span className={`flex items-center justify-center pl-4 pr-2 ${isMobile ? 'text-muted-foreground/70 group-focus-within:text-accent' : 'text-white/60 group-focus-within:text-white'} transition-colors`} aria-hidden>
            <Search className="h-[18px] w-[18px]" strokeWidth={2.5} />
          </span>
          <input
            type="search"
            autoComplete="off"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
            placeholder={t("nav.search.placeholder")}
            className={`w-full bg-transparent py-2.5 md:py-3 text-[15px] font-medium outline-none ${isMobile ? 'text-foreground placeholder:text-muted-foreground/60' : 'text-white placeholder:text-white/50'} placeholder:font-normal`}
            title={t("nav.search.enter_hint")}
          />
        </div>
      </form>

      {showResults && (
        <div className={`absolute left-0 right-0 top-full z-[100] ${isMobile ? 'mt-1.5 rounded-xl border shadow-md' : 'rounded-b-2xl border border-t-0 shadow-xl shadow-[#1f354d]/5'} bg-card/95 backdrop-blur-xl border-border/60 overflow-hidden transition-all duration-300 transform origin-top animate-in slide-in-from-top-2 fade-in-0`}>
          <div className="max-h-[380px] overflow-y-auto overflow-x-hidden divide-y divide-border/40 scrollbar-thin scrollbar-thumb-border">
            {!showSearchPending && searchResults.length > 0 && (
              <div className="sticky top-0 z-[1] border-b border-border/40 bg-muted/30 px-4 py-2 backdrop-blur-md">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  {t("nav.search.quick_results")}
                </p>
              </div>
            )}
            
            {showSearchPending && <div className="py-8"><RemquipSearchPulse /></div>}
            
            {!showSearchPending && searchResults.map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => selectResult(p)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-all hover:bg-accent/5 group"
              >
                {p.image ? (
                  <img
                    src={p.image}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-lg border border-border/40 object-cover bg-background shadow-sm transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="h-12 w-12 shrink-0 rounded-lg border border-border/40 bg-muted transition-transform group-hover:scale-105" aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground group-hover:text-accent transition-colors">{p.name}</p>
                  <p className="mt-0.5 font-mono text-[11px] font-medium text-muted-foreground">
                    <span className="opacity-70">{p.sku}</span> <span className="mx-1.5 text-border">•</span> <span className="text-foreground/80">{formatPrice(p.price)}</span>
                  </p>
                </div>
                {p.stock > 0 && <CheckCircle className="h-4 w-4 shrink-0 text-success opacity-80" strokeWidth={2.5} />}
              </button>
            ))}

            {!showSearchPending && searchResults.length === 0 && searchQuery.trim().length >= 2 && (
              <div className="px-6 py-10 text-center text-sm font-medium text-muted-foreground flex flex-col items-center gap-2">
                <Search className="h-8 w-8 text-muted-foreground/30 mb-2" />
                {t("products.not_found")}
              </div>
            )}

            {!showSearchPending && searchResults.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  navigate(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
                  setShowResults(false);
                  setSearchQuery("");
                  if (onMobileClose) onMobileClose();
                }}
                className="w-full bg-accent/5 block px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-accent transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {t("nav.search.view_all")} →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
