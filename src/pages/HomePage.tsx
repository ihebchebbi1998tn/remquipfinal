import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Shield,
  Truck,
  Wrench,
  CheckCircle,
  ArrowRight,
  Package,
  Phone,
  Users,
  BarChart3,
  ShoppingCart,
  Star,
  CheckCircle2,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { categories } from "@/config/products";
import { api, ProductCategory, unwrapApiList, resolveUploadImageUrl } from "@/lib/api";
import { apiProductToStorefront, productDetailHref, type StorefrontProduct } from "@/lib/storefront-product";
import { useCMSPageContent } from "@/hooks/useCMS";
import { EditableSection } from "@/components/EditableSection";
import LandingThemeScope from "@/components/landing/LandingThemeScope";
import LandingHero, { type HeroCtaContent } from "@/components/landing/LandingHero";
import warehouseImage from "@/assets/images/warehouse-banner.jpg";

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw?.trim()) return fallback;
  try {
    const v = JSON.parse(raw);
    return (v ?? fallback) as T;
  } catch {
    return fallback;
  }
}

const DEFAULT_VALUE_PROPS: { icon: string; text: string }[] = [
  { icon: "Shield", text: "Certified & Tested" },
  { icon: "Truck", text: "Fast Delivery" },
  { icon: "Wrench", text: "Expert Support" },
  { icon: "CheckCircle", text: "In Stock" },
];

const DEFAULT_HERO_SECONDARY: { icon: string; text: string }[] = [
  { icon: "Truck", text: "Fast fulfillment on fleet orders" },
  { icon: "Package", text: "Bulk pricing for authorized partners" },
];

const DEFAULT_TRUST = {
  headline: "Trusted by operators in mining, construction & transportation",
  logos: ["TERRA-CON", "NORSE MARITIME", "ORE-CORP", "HEAVY-CO", "GLOBAL-MIN"],
};

function parseValuePropsContent(content?: string): {
  row: { icon: string; text: string }[];
  heroSecondary: { icon: string; text: string }[];
  trustBar: { headline: string; logos: string[] };
} {
  if (!content?.trim()) {
    return { row: DEFAULT_VALUE_PROPS, heroSecondary: DEFAULT_HERO_SECONDARY, trustBar: DEFAULT_TRUST };
  }
  try {
    const v = JSON.parse(content) as unknown;
    if (Array.isArray(v)) {
      return {
        row: v.length ? (v as { icon: string; text: string }[]) : DEFAULT_VALUE_PROPS,
        heroSecondary: DEFAULT_HERO_SECONDARY,
        trustBar: DEFAULT_TRUST,
      };
    }
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      const row = Array.isArray(o.props)
        ? (o.props as { icon: string; text: string }[])
        : Array.isArray(o.value_props)
          ? (o.value_props as { icon: string; text: string }[])
          : DEFAULT_VALUE_PROPS;
      const heroSecondary = Array.isArray(o.hero_secondary)
        ? (o.hero_secondary as { icon: string; text: string }[])
        : DEFAULT_HERO_SECONDARY;
      const tb = o.trust_bar as { headline?: string; logos?: string[] } | undefined;
      const trustBar =
        tb && typeof tb === "object"
          ? {
              headline: typeof tb.headline === "string" && tb.headline.trim() ? tb.headline.trim() : DEFAULT_TRUST.headline,
              logos: Array.isArray(tb.logos) && tb.logos.length ? tb.logos.map(String) : DEFAULT_TRUST.logos,
            }
          : DEFAULT_TRUST;
      return {
        row: row.length ? row : DEFAULT_VALUE_PROPS,
        heroSecondary: heroSecondary.length ? heroSecondary : DEFAULT_HERO_SECONDARY,
        trustBar,
      };
    }
  } catch {
    /* ignore */
  }
  return { row: DEFAULT_VALUE_PROPS, heroSecondary: DEFAULT_HERO_SECONDARY, trustBar: DEFAULT_TRUST };
}

type SiteHeaderCms = {
  urgency_text?: string;
  urgency_cta_label?: string;
  urgency_cta_href?: string;
  marquee_items?: string[];
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  Shield,
  Truck,
  Wrench,
  CheckCircle,
  Package,
  Users,
  BarChart3,
};

type WhyCard = { icon?: string; title: string; desc: string; role?: string };

export default function HomePage() {
  const { t, lang } = useLanguage();
  const { formatPrice } = useCurrency();
  const { addItem } = useCart();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin" || user?.role === "manager";
  const [featuredProducts, setFeaturedProducts] = useState<StorefrontProduct[]>([]);
  const [featuredLoaded, setFeaturedLoaded] = useState(false);
  const [categoriesList, setCategoriesList] = useState<ProductCategory[]>([]);

  const { data: sectionRows = [] } = useCMSPageContent("home", lang);
  const sections = useMemo(() => {
    return Object.fromEntries(
      sectionRows.map((s: { section_key: string }) => [s.section_key, s])
    ) as Record<string, { title?: string; description?: string; image_url?: string; content?: string }>;
  }, [sectionRows]);

  const hero = sections.hero ?? {};
  const heroCta = useMemo(() => parseJson<HeroCtaContent>(hero.content, {}), [hero.content]);
  const valuePropsParsed = useMemo(() => parseValuePropsContent(sections.value_props?.content), [sections.value_props?.content]);
  const rawValuePropsContent = sections.value_props?.content?.trim() ?? "";
  const catIntro = sections.categories_intro ?? {};
  const featIntro = sections.featured_intro ?? {};
  const catIntroExtras = parseJson<{ view_all_label?: string }>(catIntro.content, {});
  const featIntroExtras = parseJson<{ view_all_label?: string }>(featIntro.content, {});
  const viewAllCategories = catIntroExtras.view_all_label?.trim() || t("products.view_all");
  const viewAllFeatured = featIntroExtras.view_all_label?.trim() || t("products.view_all");
  const whyRemquip = sections.why_remquip ?? {};
  const whyData = parseJson<{ subtitle?: string; cards?: WhyCard[] }>(whyRemquip.content, { subtitle: "", cards: [] });
  const wholesaleCta = sections.wholesale_cta ?? {};
  const wholesaleData = parseJson<{
    body?: string;
    cta_primary_label?: string;
    cta_primary_link?: string;
    cta_secondary_label?: string;
    cta_secondary_link?: string;
    bullets?: { title: string; text: string }[];
    badge_label?: string;
  }>(wholesaleCta.content, {});
  const wholesaleBannerSrc = wholesaleCta.image_url?.trim()
    ? resolveUploadImageUrl(wholesaleCta.image_url.trim())
    : warehouseImage;
  const wholesaleBannerAlt = wholesaleCta.description?.trim()
    ? `${wholesaleCta.title || "Fleet"} — ${wholesaleCta.description.slice(0, 80)}`
    : "Industrial warehouse";

  const siteHeader = sections.site_header ?? {};
  const siteHeaderCms = useMemo(() => parseJson<SiteHeaderCms>(siteHeader.content, {}), [siteHeader.content]);
  const urgencyText = siteHeaderCms.urgency_text?.trim() ?? "";
  const urgencyCtaLabel = siteHeaderCms.urgency_cta_label?.trim() ?? "";
  const urgencyCtaHref = siteHeaderCms.urgency_cta_href?.trim() ?? "/products";
  const marqueeItems = (siteHeaderCms.marquee_items ?? []).map((s) => String(s).trim()).filter(Boolean);

  const defaultWhyCards: WhyCard[] = [
    {
      title: "Marcus Weber",
      role: "Fleet Manager, Global Mining Inc.",
      desc: "Reduced our fleet downtime after switching to REMQUIP assemblies. Technical support is responsive and knowledgeable.",
    },
    {
      title: "Sarah Jensen",
      role: "Procurement Director, Norse Maritime",
      desc: "Inventory visibility and bulk pricing helped us consolidate suppliers. Ordering through the portal is straightforward.",
    },
    {
      title: "Robert Kovic",
      role: "Chief Engineer, Terra-Con Projects",
      desc: "Quality parts and consistent availability keep our heavy equipment running. REMQUIP is a key supplier for our operation.",
    },
  ];

  const wholesaleBullets =
    wholesaleData.bullets && wholesaleData.bullets.length >= 2
      ? wholesaleData.bullets.slice(0, 2)
      : [
          { title: "Logistics & fulfillment", text: "Coordinated shipping and tracking for fleet-scale orders." },
          { title: "Account programs", text: "Wholesale tiers and dedicated support for qualified partners." },
        ];

  const defaultCatalogCategories: ProductCategory[] = useMemo(() => {
    return categories.map((c, idx) => {
      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        image_url: c.image,
        display_order: idx + 1,
        is_active: true,
      } as unknown as ProductCategory;
    });
  }, []);

  const defaultImageBySlug = useMemo(() => {
    const map: Record<string, string> = {};
    defaultCatalogCategories.forEach((c) => {
      const img = String(c.image_url ?? "").trim();
      if (c.slug && img) map[c.slug] = img;
    });
    return map;
  }, [defaultCatalogCategories]);

  // If the DB returns empty image_url for seeded categories, fall back to our bundled defaults.
  const cats = categoriesList.length > 0 ? categoriesList : defaultCatalogCategories;

  useEffect(() => {
    const fetchData = async () => {
      try {
        try {
          const featuredResponse = await api.getFeaturedProducts();
          if (featuredResponse.data) {
            setFeaturedProducts(
              featuredResponse.data
                .map((row) => apiProductToStorefront(row as Record<string, unknown>))
                .slice(0, 4)
            );
          } else {
            setFeaturedProducts([]);
          }
        } catch {
          setFeaturedProducts([]);
        } finally {
          setFeaturedLoaded(true);
        }

        try {
          const categoriesResponse = await api.getCategories(1, 100, { locale: lang });
          const list = unwrapApiList<ProductCategory>(categoriesResponse, defaultCatalogCategories);
          const merged = list.map((cat) => {
            const img = String(cat.image_url ?? "").trim();
            if (img) return cat;
            const fallback = defaultImageBySlug[cat.slug] ?? "";
            return { ...cat, image_url: fallback || cat.image_url };
          });
          setCategoriesList(merged);
        } catch {
          setCategoriesList(defaultCatalogCategories);
        }
      } catch {
        /* handled above */
      }
    };

    fetchData();
  }, [lang, defaultCatalogCategories, defaultImageBySlug]);

  const rawWhyCards = (whyData.cards ?? []).filter((c) => c.desc?.trim());
  const useTestimonialLayout =
    rawWhyCards.length === 0 || rawWhyCards.some((c) => Boolean(c.role?.trim()));
  const displayWhyCards = rawWhyCards.length ? rawWhyCards : defaultWhyCards;

  return (
    <LandingThemeScope>
      {/* Optional urgency + marquee (CMS: site_header JSON) — below global nav */}
      <EditableSection sectionKey="site_header" showEdit={isAdmin}>
        {urgencyText ? (
          <div className="bg-destructive text-destructive-foreground py-2.5 px-4 sm:px-8 flex flex-wrap justify-center items-center gap-4 border-b border-destructive/30">
            <div className="flex items-center gap-2 font-display text-[10px] sm:text-xs font-bold uppercase tracking-widest text-center">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive-foreground opacity-40" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive-foreground" />
              </span>
              {urgencyText}
            </div>
            {urgencyCtaLabel ? (
              <Link
                to={urgencyCtaHref}
                className="bg-background text-foreground px-4 py-1.5 rounded-sm font-display text-[10px] font-bold uppercase tracking-tight hover:opacity-90 transition-opacity"
              >
                {urgencyCtaLabel}
              </Link>
            ) : null}
          </div>
        ) : null}
        {marqueeItems.length > 0 ? (
          <aside className="bg-muted/80 text-foreground py-2 text-center overflow-hidden border-b border-border">
            <div className="landing-marquee-track inline-flex items-center gap-4 whitespace-nowrap px-4 font-display text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em]">
              {[...marqueeItems, ...marqueeItems].map((line, i) => (
                <React.Fragment key={`${line}-${i}`}>
                  <span>{line}</span>
                  <span className="opacity-40">•</span>
                </React.Fragment>
              ))}
            </div>
          </aside>
        ) : null}
      </EditableSection>

      <EditableSection sectionKey="hero" showEdit={isAdmin}>
        <LandingHero hero={hero} heroCta={heroCta} heroSecondary={valuePropsParsed.heroSecondary} />
      </EditableSection>

      {/* Trust bar — CMS via value_props JSON trust_bar + headline */}
      <EditableSection sectionKey="value_props" showEdit={isAdmin}>
        <section className="bg-muted/50 py-10 md:py-12 border-y border-border/80">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
            <p className="font-display text-[10px] font-bold uppercase tracking-[0.35em] text-center text-muted-foreground mb-8 md:mb-10">
              {valuePropsParsed.trustBar.headline}
            </p>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 lg:gap-24 opacity-40 grayscale contrast-125 hover:opacity-70 transition-opacity">
              {valuePropsParsed.trustBar.logos.map((name) => (
                <div key={name} className="font-display text-lg md:text-2xl font-black tracking-tight text-foreground">
                  {name}
                </div>
              ))}
            </div>
            {/* Value row (icons + labels). Works with both legacy array and object CMS formats. */}
            {rawValuePropsContent ? (
              valuePropsParsed.row?.length ? (
              <div className="flex flex-wrap justify-center gap-x-10 gap-y-4 mt-10 pt-8 border-t border-border/60">
                {valuePropsParsed.row.map(({ icon: iconKey, text }) => {
                  const Icon = ICON_MAP[iconKey] ?? CheckCircle;
                  return (
                    <div key={text} className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 text-accent shrink-0" strokeWidth={2} />
                      <span className="landing-value-prop-text text-foreground">{text}</span>
                    </div>
                  );
                })}
              </div>
              ) : null
            ) : null}
          </div>
        </section>
      </EditableSection>

      {/* Core inventory — bento from live categories */}
      <EditableSection sectionKey="categories_intro" showEdit={isAdmin} id="categories">
        <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6 mb-12 md:mb-16">
            <div>
              <h2 className="font-display landing-section-title-xl font-bold uppercase tracking-tight text-foreground">
                {catIntro.description || "Core inventory"}
              </h2>
              <div className="h-1 w-20 bg-accent mt-4" />
              {catIntro.title ? (
                <p className="section-eyebrow mt-3 text-muted-foreground">{catIntro.title}</p>
              ) : null}
            </div>
            <Link
              to="/products"
              className="font-display text-accent uppercase tracking-widest text-xs font-bold inline-flex items-center gap-2 hover:gap-3 transition-all shrink-0"
            >
              {viewAllCategories} <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
          </div>

          {cats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No categories available.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-4 md:gap-6 md:min-h-[640px] lg:min-h-[720px] auto-rows-fr">
              {cats[0] ? (
                <Link
                  key={cats[0].id}
                  to={`/products/${cats[0].slug || ""}`}
                  className="md:col-span-2 md:row-span-2 bg-muted/40 group relative overflow-hidden rounded-sm min-h-[280px] md:min-h-0"
                >
                  {cats[0].image_url ? (
                    <img
                      src={cats[0].image_url}
                      alt={cats[0].name}
                      className="absolute inset-0 w-full h-full object-cover opacity-50 grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                      loading="lazy"
                    />
                  ) : null}
                  <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8 bg-gradient-to-t from-background via-background/50 to-transparent">
                    <span className="font-display text-accent text-xs font-bold tracking-widest mb-2 uppercase">
                      {t("cat.shop_all")}
                    </span>
                    <h3 className="font-display text-2xl md:text-3xl font-black uppercase text-foreground mb-4">
                      {cats[0].name}
                    </h3>
                    <span className="landing-machined-cta w-fit px-6 py-3 rounded-sm font-display text-xs font-bold tracking-widest uppercase inline-flex items-center gap-2 pointer-events-none">
                      {t("products.view_all")} <ArrowRight className="h-4 w-4" strokeWidth={2} />
                    </span>
                  </div>
                </Link>
              ) : null}
              {cats[1] ? (
                <Link
                  key={cats[1].id}
                  to={`/products/${cats[1].slug || ""}`}
                  className="md:col-span-2 md:row-span-1 bg-muted/40 group relative overflow-hidden rounded-sm min-h-[200px]"
                >
                  {cats[1].image_url ? (
                    <img
                      src={cats[1].image_url}
                      alt={cats[1].name}
                      className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                      loading="lazy"
                    />
                  ) : null}
                  <div className="absolute inset-0 flex flex-col justify-end p-6 bg-gradient-to-t from-background/90 via-background/25 to-transparent">
                    <h3 className="font-display text-xl md:text-2xl font-black uppercase text-foreground mb-4">
                      {cats[1].name}
                    </h3>
                    <span className="w-fit px-5 py-2.5 rounded-sm font-display text-xs font-bold tracking-widest uppercase border border-border bg-card/90 backdrop-blur-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
                      {t("cat.shop_all")}
                    </span>
                  </div>
                </Link>
              ) : null}
              {cats.slice(2, 4).map((cat) => (
                <Link
                  key={cat.id}
                  to={`/products/${cat.slug || ""}`}
                  className="md:col-span-1 md:row-span-1 bg-muted/40 group relative overflow-hidden rounded-sm min-h-[200px]"
                >
                  {cat.image_url ? (
                    <img
                      src={cat.image_url}
                      alt={cat.name}
                      className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                      loading="lazy"
                    />
                  ) : null}
                  <div className="absolute inset-0 flex flex-col justify-end p-5 bg-gradient-to-t from-background to-transparent">
                    <h3 className="font-display text-lg font-black uppercase text-foreground mb-3">{cat.name}</h3>
                    <span className="w-fit px-4 py-2 rounded-sm font-display text-[10px] font-bold tracking-widest uppercase border border-border bg-card/90 text-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
                      {t("cat.shop_all")}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </EditableSection>

      {/* Featured products — bordered grid */}
      <EditableSection sectionKey="featured_intro" showEdit={isAdmin} id="products">
        <section className="bg-muted/30 py-16 md:py-24 relative overflow-hidden border-y border-border/80">
          <div className="absolute top-0 left-0 w-16 md:w-24 h-full bg-muted -skew-x-12 -translate-x-8 opacity-60 border-r border-border pointer-events-none hidden md:block" />
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="mb-10 md:mb-12">
              <span className="font-display text-accent font-bold tracking-[0.2em] text-xs uppercase">
                {featIntro.title || t("products.featured")}
              </span>
              <h2 className="font-display landing-section-title-xl font-bold uppercase mt-2 text-foreground">
                {featIntro.description || "Available for immediate dispatch"}
              </h2>
            </div>

            {!featuredLoaded ? (
              <p className="text-sm text-muted-foreground py-8">{t("products.loading")}…</p>
            ) : featuredProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8">
                No featured products to show. Mark products as featured in admin or check your catalog.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border rounded-sm overflow-hidden">
                {featuredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="bg-background p-6 md:p-8 group hover:bg-muted/40 transition-colors flex flex-col h-full min-h-0"
                  >
                    <Link to={productDetailHref(product.id, product.slug)} className="block flex flex-col flex-1 min-h-0">
                      <div className="aspect-square bg-muted mb-5 overflow-hidden relative rounded-sm">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                            No image
                          </div>
                        )}
                        {product.stock > 0 ? (
                          <span className="absolute top-3 right-3 bg-accent text-accent-foreground font-display text-[10px] font-bold px-2 py-1 uppercase rounded-sm">
                            {t("products.in_stock")}
                          </span>
                        ) : (
                          <span className="absolute top-3 right-3 bg-muted-foreground/20 text-foreground font-display text-[10px] font-bold px-2 py-1 uppercase rounded-sm">
                            {t("products.out_of_stock") || "Out of stock"}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 flex-grow">
                        <span className="font-display text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
                          SKU: {product.sku}
                        </span>
                        <h4 className="font-display text-base font-bold uppercase leading-snug text-foreground line-clamp-2">
                          {product.name}
                        </h4>
                        {product.description ? (
                          <p className="font-body text-sm text-muted-foreground line-clamp-2 mt-1">{product.description}</p>
                        ) : null}
                      </div>
                    </Link>
                    <div className="mt-auto pt-5 border-t border-border flex flex-col gap-4">
                      <div className="flex justify-between items-baseline gap-2">
                        <span className="font-display text-2xl font-black text-accent">{formatPrice(product.price)}</span>
                        <Link
                          to={productDetailHref(product.id, product.slug)}
                          className="font-display text-[10px] font-bold uppercase text-muted-foreground hover:text-accent transition-colors underline decoration-accent/30 underline-offset-4 shrink-0"
                        >
                          {t("products.specifications")}
                        </Link>
                      </div>
                      <button
                        type="button"
                        disabled={product.stock <= 0}
                        onClick={() => addItem(product)}
                        className="landing-machined-cta w-full py-3.5 rounded-sm font-display text-xs font-bold uppercase tracking-widest inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none hover:brightness-105 active:scale-[0.98] transition-all"
                      >
                        <ShoppingCart className="h-4 w-4" strokeWidth={2} />
                        {t("products.add_to_cart")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Link
              to="/products"
              className="sm:hidden flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground mt-8 font-medium"
            >
              {viewAllFeatured} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </EditableSection>

      {/* Why / testimonials */}
      <EditableSection sectionKey="why_remquip" showEdit={isAdmin} id="about">
        <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-background">
          <div className="max-w-[1440px] mx-auto">
            <div className="text-center mb-12 md:mb-16 max-w-3xl mx-auto">
              <span className="font-display text-accent font-bold tracking-[0.2em] text-xs uppercase">
                {whyRemquip.title || "Field reports"}
              </span>
              <h2 className="font-display landing-section-title-xl font-bold uppercase mt-2 text-foreground">
                {whyRemquip.description || "Why operators choose REMQUIP"}
              </h2>
              {whyData.subtitle ? (
                <p className="text-sm text-muted-foreground mt-4 leading-relaxed">{whyData.subtitle}</p>
              ) : null}
            </div>

            {useTestimonialLayout ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                {displayWhyCards.map((card, i) => (
                  <div
                    key={`${card.title}-${i}`}
                    className="bg-muted/40 p-6 md:p-8 rounded-sm border border-border border-l-4 border-l-accent"
                  >
                    <div className="flex text-accent mb-4 gap-0.5" aria-hidden>
                      {Array.from({ length: 5 }).map((_, si) => (
                        <Star key={si} className="h-4 w-4 fill-current text-accent" strokeWidth={0} />
                      ))}
                    </div>
                    <p className="text-foreground mb-6 italic leading-relaxed">&ldquo;{card.desc}&rdquo;</p>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center font-display font-black text-xs text-foreground">
                        {card.title
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-xs uppercase text-foreground">{card.title}</h4>
                        {card.role ? (
                          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">{card.role}</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8">
                {displayWhyCards.map(({ icon: iconKey, title, desc }, i) => {
                  const Icon = ICON_MAP[iconKey ?? "Package"] ?? Package;
                  return (
                    <div
                      key={i}
                      className="h-full p-6 md:p-8 border border-border rounded-sm bg-card hover:border-accent/30 transition-colors"
                    >
                      <div className="w-11 h-11 rounded-sm flex items-center justify-center mb-5 bg-muted">
                        <Icon className="h-5 w-5 text-accent" strokeWidth={1.75} />
                      </div>
                      <h3 className="font-display text-base font-bold text-foreground mb-2 uppercase tracking-tight">{title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </EditableSection>

      {/* Wholesale CTA */}
      <EditableSection sectionKey="wholesale_cta" showEdit={isAdmin} id="wholesale">
        <section className="py-16 md:py-24 bg-muted/20 relative overflow-hidden border-t border-border">
          <div className="absolute inset-0 z-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_40%,hsl(var(--accent)/0.12),transparent_55%)]" />
          </div>
          <div className="relative z-10 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-12 gap-0 rounded-sm overflow-hidden border border-border bg-card shadow-xl">
              <div className="p-8 md:p-12 lg:p-20 md:col-span-7 border-l-4 border-accent flex flex-col justify-center order-2 md:order-1">
                <span className="font-display text-accent font-black uppercase tracking-[0.2em] text-xs mb-4 block">
                  {wholesaleCta.title || "Partnership"}
                </span>
                <h2 className="font-display landing-wholesale-heading font-black uppercase mb-5 tracking-tight text-foreground leading-tight">
                  {wholesaleCta.description || "Wholesale programs for fleet operators"}
                </h2>
                <p className="landing-wholesale-body text-muted-foreground mb-8 leading-relaxed">
                  {wholesaleData.body || "Competitive bulk pricing, account support, and streamlined ordering for your operation."}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                  {wholesaleBullets.map((b) => (
                    <div key={b.title} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" strokeWidth={2} />
                      <div>
                        <h4 className="font-display font-bold text-sm uppercase text-foreground">{b.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{b.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    to={wholesaleData.cta_primary_link || "/register"}
                    className="landing-machined-cta inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-sm font-display font-bold text-sm uppercase tracking-widest text-center shadow-md hover:brightness-105 transition-all"
                  >
                    {wholesaleData.cta_primary_label || "Join wholesale"} <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to={wholesaleData.cta_secondary_link || "/contact"}
                    className="inline-flex items-center justify-center gap-2 border border-border bg-background px-8 py-3.5 rounded-sm font-display font-semibold text-sm uppercase tracking-wide hover:bg-muted/80 transition-colors"
                  >
                    <Phone className="h-4 w-4" strokeWidth={2} />{" "}
                    {wholesaleData.cta_secondary_label || "Contact sales"}
                  </Link>
                </div>
              </div>
              <div className="relative min-h-[240px] md:min-h-full md:col-span-5 order-1 md:order-2">
                <img
                  src={wholesaleBannerSrc}
                  alt={wholesaleBannerAlt}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent md:hidden" />
                {wholesaleData.badge_label ? (
                  <div className="hidden lg:flex absolute -bottom-4 -right-4 w-36 h-36 bg-card border border-border rotate-6 items-center justify-center p-4 text-center shadow-lg">
                    <span className="font-display font-black text-[10px] leading-tight uppercase text-muted-foreground">
                      {wholesaleData.badge_label}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </EditableSection>
    </LandingThemeScope>
  );
}
