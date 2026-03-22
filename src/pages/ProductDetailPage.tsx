import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Minus, Plus, ShoppingCart, CheckCircle, ChevronRight, ChevronLeft,
  ZoomIn, X, Truck, Shield, FileText, Package, Loader2,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useCart } from "@/contexts/CartContext";
import { useProduct, useProducts } from "@/hooks/useApi";
import { unwrapApiList, type Product } from "@/lib/api";
import { apiProductToStorefront, productDetailHref, type StorefrontProduct } from "@/lib/storefront-product";

export default function ProductDetailPage() {
  const { slug: routeParam } = useParams<{ slug: string }>();
  const param = routeParam ?? "";
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();
  const { addItem, freeShippingThreshold } = useCart();
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [isZooming, setIsZooming] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  const { data: productResponse, isLoading, isError } = useProduct(param);
  const { data: productsResponse } = useProducts(1, 100);

  const raw = productResponse?.data as Record<string, unknown> | undefined;
  const product = useMemo(() => (raw ? apiProductToStorefront(raw) : null), [raw]);

  const listRows = unwrapApiList<Product>(productsResponse, []);

  const relatedProducts = useMemo(() => {
    if (!product?.category_id) return [] as StorefrontProduct[];
    return listRows
      .filter((row) => {
        const id = String((row as Record<string, unknown>).id ?? "");
        const cid = String((row as Record<string, unknown>).category_id ?? "");
        return cid === product.category_id && id !== product.id;
      })
      .slice(0, 4)
      .map((row) => apiProductToStorefront(row as Record<string, unknown>));
  }, [listRows, product]);

  const images = useMemo(() => {
    if (!product) return [];
    return product.images.length > 0
      ? product.images
      : product.image
        ? [{ id: "default", url: product.image, alt: product.name, position: 0 }]
        : [];
  }, [product]);

  useEffect(() => {
    setActiveImage(0);
    setQty(1);
    setLightbox(false);
  }, [param, product?.id]);

  useEffect(() => {
    setActiveImage((i) => {
      if (images.length === 0) return 0;
      return Math.min(i, images.length - 1);
    });
    if (images.length === 0) setLightbox(false);
  }, [images.length]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        Loading…
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">
        {t("products.not_found")}
      </div>
    );
  }

  const stockLabel =
    product.stock > 20 ? t("products.in_stock") : product.stock > 0 ? t("products.low_stock") : t("products.out_of_stock");
  const stockClass =
    product.stock > 20 ? "text-success" : product.stock > 0 ? "text-warning" : "text-destructive";

  const specEntries = Object.entries(product.specifications);

  function prevImage() {
    setActiveImage((i) => (i === 0 ? images.length - 1 : i - 1));
  }
  function nextImage() {
    setActiveImage((i) => (i === images.length - 1 ? 0 : i + 1));
  }

  const categoryLinkSlug = product.categorySlug || "all";

  return (
    <>
      <div className="container mx-auto px-4 py-6 md:py-8 pb-28 md:pb-8">
        <nav className="flex items-center text-xs sm:text-sm text-muted-foreground mb-5 gap-1 overflow-x-auto">
          <Link to="/" className="hover:text-foreground transition-colors whitespace-nowrap">
            {t("nav.home")}
          </Link>
          <ChevronRight className="h-3 w-3 flex-shrink-0" />
          <Link
            to={product.categorySlug ? `/products/${product.categorySlug}` : "/products"}
            className="hover:text-foreground transition-colors whitespace-nowrap"
          >
            {product.category || categoryLinkSlug}
          </Link>
          <ChevronRight className="h-3 w-3 flex-shrink-0" />
          <span className="text-foreground truncate">{product.name}</span>
        </nav>

        <div className="grid md:grid-cols-2 gap-6 lg:gap-10">
          <div className="space-y-3">
            <div
              ref={imgRef}
              className={`relative aspect-square bg-secondary rounded-md overflow-hidden group ${
                images.length > 0 ? "cursor-crosshair" : "cursor-default"
              }`}
              onMouseEnter={() => images.length > 0 && setIsZooming(true)}
              onMouseLeave={() => setIsZooming(false)}
              onMouseMove={handleMouseMove}
              onClick={() => images.length > 0 && setLightbox(true)}
            >
              {images.length > 0 ? (
                <img
                  src={images[activeImage].url}
                  alt={images[activeImage].alt}
                  className="w-full h-full object-cover transition-transform duration-200"
                  style={
                    isZooming
                      ? {
                          transform: "scale(2)",
                          transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                        }
                      : undefined
                  }
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm px-4 text-center">
                  No image
                </div>
              )}

              {images.length > 0 && !isZooming && (
                <div className="absolute bottom-3 right-3 bg-foreground/60 text-background text-xs px-2.5 py-1.5 rounded flex items-center gap-1.5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                  <ZoomIn className="h-3.5 w-3.5" /> Hover to zoom
                </div>
              )}

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      prevImage();
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/80 hover:bg-background text-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      nextImage();
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/80 hover:bg-background text-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}

              {images.length > 1 && (
                <div className="absolute top-3 left-3 bg-foreground/50 text-background text-xs px-2 py-1 rounded pointer-events-none">
                  {activeImage + 1} / {images.length}
                </div>
              )}
            </div>

            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {images.map((img, i) => (
                  <button
                    type="button"
                    key={img.id}
                    onClick={() => setActiveImage(i)}
                    className={`w-16 h-16 md:w-[72px] md:h-[72px] rounded overflow-hidden border-2 transition-all flex-shrink-0 ${
                      i === activeImage
                        ? "border-accent ring-1 ring-accent/30"
                        : "border-border hover:border-muted-foreground opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs text-accent font-semibold uppercase tracking-wider mb-1.5">{product.category}</p>
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground leading-tight mb-2">
              {product.name}
            </h1>
            <p className="text-xs text-muted-foreground mb-4">
              {t("products.sku")}: <span className="font-mono">{product.sku}</span>
            </p>

            <div className="flex items-baseline gap-3 mb-1">
              <p className="text-2xl md:text-3xl font-bold text-foreground">{formatPrice(product.price)}</p>
              {product.wholesalePrice > 0 && (
                <p className="text-sm text-muted-foreground line-through">{formatPrice(product.wholesalePrice)}</p>
              )}
            </div>
            {product.wholesalePrice > 0 && (
              <p className="text-xs text-muted-foreground mb-5">{t("products.wholesale_label")}</p>
            )}

            <p className={`text-sm font-medium mb-5 flex items-center gap-1.5 ${stockClass}`}>
              {product.stock > 0 ? <CheckCircle className="h-4 w-4" /> : <Package className="h-4 w-4" />}
              {stockLabel}
              {product.stock > 0 && product.stock <= 20 && (
                <span className="text-xs text-muted-foreground ml-1">
                  ({product.stock} {t("products.remaining")})
                </span>
              )}
            </p>

            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{product.description}</p>

            <div className="hidden md:flex items-center gap-3 mb-5">
              <div className="flex items-center border border-border rounded-sm">
                <button
                  type="button"
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="px-3 py-2.5 hover:bg-secondary transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="px-4 py-2.5 text-sm font-medium min-w-[48px] text-center border-x border-border">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty(qty + 1)}
                  className="px-3 py-2.5 hover:bg-secondary transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => addItem(product, qty)}
                disabled={product.stock === 0}
                className="flex-1 btn-accent py-3 rounded-sm font-semibold uppercase tracking-wide flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ShoppingCart className="h-4 w-4" /> {t("products.add_to_cart")}
              </button>
            </div>

            <Link
              to="/contact"
              className="hidden md:flex w-full text-center justify-center items-center gap-2 border border-border rounded-sm py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors mb-6"
            >
              <FileText className="h-4 w-4" />
              {t("products.request_quote")}
            </Link>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="flex items-center gap-2.5 p-3 bg-secondary/60 rounded-md">
                <Truck className="h-4 w-4 text-accent flex-shrink-0" />
                <span className="text-xs text-muted-foreground leading-tight">
                  {t("products.free_shipping_prefix")} {formatPrice(freeShippingThreshold)}
                </span>
              </div>
              <div className="flex items-center gap-2.5 p-3 bg-secondary/60 rounded-md">
                <Shield className="h-4 w-4 text-accent flex-shrink-0" />
                <span className="text-xs text-muted-foreground leading-tight">{t("products.warranty_note")}</span>
              </div>
            </div>

            {specEntries.length > 0 && (
              <div className="border border-border rounded-md overflow-hidden">
                <h3 className="font-display font-bold text-xs uppercase tracking-wider px-4 py-3 bg-secondary">
                  {t("products.specifications")}
                </h3>
                <div className="divide-y divide-border">
                  {specEntries.map(([key, value]) => (
                    <div key={key} className="flex px-4 py-2.5 text-sm">
                      <span className="w-36 md:w-40 text-muted-foreground flex-shrink-0 text-xs sm:text-sm">{key}</span>
                      <span className="font-medium text-foreground text-xs sm:text-sm">
                        {Array.isArray(value) ? value.join(", ") : value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {product.compatibility && product.compatibility.length > 0 && (
              <div className="border border-border rounded-md overflow-hidden mt-4">
                <h3 className="font-display font-bold text-xs uppercase tracking-wider px-4 py-3 bg-secondary">
                  {t("products.compatibility")}
                </h3>
                <div className="px-4 py-3 flex flex-wrap gap-2">
                  {product.compatibility.map((c) => (
                    <span key={c} className="text-xs bg-secondary text-foreground px-2.5 py-1.5 rounded">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <section className="mt-14">
            <h2 className="section-heading mb-6">{t("products.related")}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
              {relatedProducts.map((rp) => (
                <div key={rp.id} className="product-card group flex flex-col">
                  <Link to={productDetailHref(rp.id, rp.slug)} className="block aspect-square overflow-hidden bg-secondary">
                    {rp.image ? (
                      <img
                        src={rp.image}
                        alt={rp.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground p-2 text-center">
                        No image
                      </div>
                    )}
                  </Link>
                  <div className="p-3 md:p-4 flex flex-col flex-1">
                    <p className="text-[11px] text-muted-foreground mb-0.5">{rp.sku}</p>
                    <Link
                      to={productDetailHref(rp.id, rp.slug)}
                      className="text-sm font-medium text-foreground hover:text-accent transition-colors line-clamp-2 mb-auto"
                    >
                      {rp.name}
                    </Link>
                    <p className="text-sm font-bold text-foreground mt-2">{formatPrice(rp.price)}</p>
                    <button
                      type="button"
                      onClick={() => addItem(rp)}
                      className="mt-2 w-full btn-accent text-xs py-2 rounded-sm font-semibold uppercase tracking-wide"
                    >
                      {t("products.add_to_cart")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-shrink-0">
            <p className="text-lg font-bold text-foreground leading-tight">{formatPrice(product.price)}</p>
            <p className={`text-xs font-medium ${stockClass} flex items-center gap-1`}>
              <CheckCircle className="h-3 w-3" /> {stockLabel}
            </p>
          </div>
          <div className="flex items-center border border-border rounded-sm flex-shrink-0">
            <button
              type="button"
              onClick={() => setQty(Math.max(1, qty - 1))}
              className="px-2.5 py-2 hover:bg-secondary transition-colors"
              aria-label="Decrease"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="px-3 py-2 text-sm font-medium text-center border-x border-border min-w-[36px]">{qty}</span>
            <button
              type="button"
              onClick={() => setQty(qty + 1)}
              className="px-2.5 py-2 hover:bg-secondary transition-colors"
              aria-label="Increase"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => addItem(product, qty)}
            disabled={product.stock === 0}
            className="flex-1 btn-accent py-2.5 rounded-sm font-semibold text-sm uppercase tracking-wide flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <ShoppingCart className="h-4 w-4" /> {t("products.add_to_cart")}
          </button>
        </div>
      </div>

      {lightbox && images.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-foreground/95 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-background/80 hover:text-background transition-colors z-10"
            onClick={() => setLightbox(false)}
            aria-label="Close"
          >
            <X className="h-7 w-7" />
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage();
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/20 hover:bg-background/40 text-background flex items-center justify-center transition-colors"
                aria-label="Previous"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/20 hover:bg-background/40 text-background flex items-center justify-center transition-colors"
                aria-label="Next"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <img
            src={images[activeImage].url}
            alt={images[activeImage].alt}
            className="max-w-full max-h-[85vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {images.length > 1 && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((img, i) => (
                <button
                  type="button"
                  key={img.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImage(i);
                  }}
                  className={`w-12 h-12 rounded overflow-hidden border-2 transition-all ${
                    i === activeImage ? "border-accent opacity-100" : "border-background/30 opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
