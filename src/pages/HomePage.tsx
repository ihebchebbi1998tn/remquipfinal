import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Truck, Wrench, CheckCircle, ArrowRight, Package, Phone, Users, BarChart3 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useCart } from "@/contexts/CartContext";
import { categories } from "@/config/products";
import { api, ProductCategory, unwrapApiList } from "@/lib/api";
import { apiProductToStorefront, productDetailHref, type StorefrontProduct } from "@/lib/storefront-product";
import { useCMSPage } from "@/hooks/useApi";
import heroImage from "@/assets/images/hero-truck.jpg";
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

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  Shield,
  Truck,
  Wrench,
  CheckCircle,
  Package,
  Users,
  BarChart3,
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

export default function HomePage() {
  const { t, lang } = useLanguage();
  const { formatPrice } = useCurrency();
  const { addItem } = useCart();
  const [featuredProducts, setFeaturedProducts] = useState<StorefrontProduct[]>([]);
  const [categoriesList, setCategoriesList] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { data: cmsResponse } = useCMSPage("home", lang);
  const sections = useMemo(() => {
    const page = (cmsResponse as { data?: { content?: string } } | undefined)?.data;
    const raw = page?.content;
    if (!raw?.trim()) return {};
    try {
      const j = JSON.parse(raw);
      return (j?.sections ?? {}) as Record<string, { title?: string; description?: string; image_url?: string; content?: string }>;
    } catch {
      return {};
    }
  }, [cmsResponse]);

  const hero = sections.hero ?? {};
  const heroCta = parseJson<{ cta_primary_label?: string; cta_primary_link?: string; cta_secondary_label?: string; cta_secondary_link?: string }>(
    hero.content,
    {}
  );
  const stats = parseJson<{ value: string; label: string }[]>(sections.stats?.content, [
    { value: "500+", label: "SKUs in Stock" },
    { value: "48h", label: "Avg. Delivery" },
    { value: "15+", label: "Years Experience" },
  ]);
  const valueProps = parseJson<{ icon: string; text: string }[]>(sections.value_props?.content, [
    { icon: "Shield", text: "Certified & Tested" },
    { icon: "Truck", text: "Fast Delivery" },
    { icon: "Wrench", text: "Expert Support" },
    { icon: "CheckCircle", text: "In Stock" },
  ]);
  const catIntro = sections.categories_intro ?? {};
  const featIntro = sections.featured_intro ?? {};
  const whyRemquip = sections.why_remquip ?? {};
  const whyData = parseJson<{ subtitle?: string; cards?: { icon: string; title: string; desc: string }[] }>(
    whyRemquip.content,
    { subtitle: "", cards: [] }
  );
  const wholesaleCta = sections.wholesale_cta ?? {};
  const wholesaleData = parseJson<{
    body?: string;
    cta_primary_label?: string;
    cta_primary_link?: string;
    cta_secondary_label?: string;
    cta_secondary_link?: string;
  }>(wholesaleCta.content, {});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Try to fetch from API, fallback to hardcoded data if API fails
        try {
          const featuredResponse = await api.getFeaturedProducts();
          if (featuredResponse.data) {
            setFeaturedProducts(
              featuredResponse.data
                .map((row) => apiProductToStorefront(row as Record<string, unknown>))
                .slice(0, 4)
            );
          }
        } catch {
          setFeaturedProducts([]);
        }

        try {
          const categoriesResponse = await api.getCategories(1, 100, { locale: lang });
          setCategoriesList(unwrapApiList<ProductCategory>(categoriesResponse, categories));
        } catch {
          setCategoriesList(categories);
        }
      } catch {
        // Error handled by individual try blocks
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [lang]);

  return (
    <>
      {/* Hero */}
      <section className="relative min-h-[500px] sm:min-h-[580px] md:min-h-[680px] flex items-center overflow-hidden bg-tertiary">
        <img
          src={heroImage}
          alt="Industrial truck parts"
          className="absolute inset-0 w-full h-full object-cover opacity-20"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-tertiary/96 via-tertiary/75 to-transparent" />

        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <h1
                className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-primary-foreground leading-[1.1] mb-8 tracking-tight"
                style={{ letterSpacing: "-0.02em" }}
              >
                {hero.title || "Industrial-Grade Parts For North American Fleets"}
              </h1>

              <p className="text-lg sm:text-xl text-primary-foreground/80 leading-relaxed mb-12 max-w-2xl font-light">
                {hero.description || "500+ SKUs in stock. 48-hour delivery. Trusted by fleet operators across North America for 15+ years."}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                <Link
                  to={heroCta.cta_primary_link || "/products"}
                  className="inline-flex items-center justify-center gap-2 btn-gradient text-accent-foreground px-9 py-4 rounded-lg font-semibold text-sm uppercase tracking-wider transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
                >
                  {heroCta.cta_primary_label || "Browse Catalog"}
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  to={heroCta.cta_secondary_link || "/register"}
                  className="inline-flex items-center justify-center gap-2 border border-primary-foreground/25 text-primary-foreground px-9 py-4 rounded-lg font-semibold text-sm uppercase tracking-wider hover:border-primary-foreground/50 hover:bg-primary-foreground/5 transition-all"
                >
                  {heroCta.cta_secondary_label || "Wholesale Program"}
                </Link>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-16 md:mt-20 grid grid-cols-3 gap-6 sm:gap-8 max-w-2xl"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="border-l border-accent/40 pl-4 sm:pl-6">
                <p className="text-3xl sm:text-4xl font-bold text-accent font-display mb-1">{stat.value}</p>
                <p className="text-primary-foreground/70 text-xs sm:text-sm font-medium">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Value props */}
      <section className="bg-background border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 py-5 sm:py-6">
            {valueProps.map(({ icon: iconKey, text }) => {
              const Icon = ICON_MAP[iconKey] ?? CheckCircle;
              return (
                <div key={text} className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 text-accent flex-shrink-0" strokeWidth={2} />
                  <span className="text-sm text-foreground">{text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
          >
            <motion.div variants={fadeUp} className="flex items-end justify-between mb-10">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1.5">{catIntro.title || "Browse Solutions"}</p>
                <h2 className="font-display text-xl sm:text-2xl font-semibold text-foreground tracking-tight">{catIntro.description || "Explore Product Categories"}</h2>
              </div>
              <Link to="/products" className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline underline-offset-2">
                {t("products.view_all")} <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
              {(categoriesList.length > 0 ? categoriesList : categories).map((cat) => (
                <motion.div key={cat.id} variants={fadeUp}>
                  <Link
                    to={`/products/${cat.slug || ''}`}
                    className="group block relative overflow-hidden aspect-[4/3] rounded"
                  >
                    {cat.image_url && (
                      <img
                        src={cat.image_url}
                        alt={cat.name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                        loading="lazy"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <span className="text-sm font-semibold text-primary-foreground block">
                        {cat.name}
                      </span>
                      <span className="text-xs text-primary-foreground/70 mt-0.5 group-hover:text-primary-foreground/90 transition-colors">
                        {t("cat.shop_all")} →
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            <Link to="/products" className="sm:hidden flex items-center justify-center gap-1 text-sm font-medium text-accent mt-6">
              {t("products.view_all")} <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Featured products */}
      <section id="products" className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
          >
            <motion.div variants={fadeUp} className="flex items-end justify-between mb-10">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1.5">{featIntro.title || "In High Demand"}</p>
                <h2 className="font-display text-xl sm:text-2xl font-semibold text-foreground tracking-tight">{featIntro.description || "Popular Products"}</h2>
              </div>
              <Link to="/products" className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline underline-offset-2">
                {t("products.view_all")} <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
              {featuredProducts.map((product) => (
                <motion.div key={product.id} variants={fadeUp}>
                  <Link to={productDetailHref(product.id, product.slug)} className="bg-card border border-border rounded overflow-hidden group h-full flex flex-col hover:border-border hover:shadow-sm transition-all cursor-pointer block">
                    <div className="block aspect-square overflow-hidden bg-muted">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground p-2 text-center">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">{product.sku}</p>
                      <span className="text-sm font-medium text-foreground group-hover:text-accent transition-colors line-clamp-2 mt-1 mb-auto leading-snug">
                        {product.name}
                      </span>
                      <div className="mt-4 pt-3 border-t border-border">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-base font-semibold text-foreground">{formatPrice(product.price)}</p>
                          {product.stock > 0 && (
                            <span className="text-[10px] text-success font-medium uppercase tracking-wide">
                              {t("products.in_stock")}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            addItem(product);
                          }}
                          className="w-full btn-gradient text-accent-foreground text-xs py-2.5 rounded font-medium uppercase tracking-wide"
                        >
                          {t("products.add_to_cart")}
                        </button>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            <Link to="/products" className="sm:hidden flex items-center justify-center gap-1 text-sm font-medium text-accent mt-6">
              {t("products.view_all")} <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Why REMQUIP */}
      <section id="about" className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
          >
            <motion.div variants={fadeUp} className="text-center mb-12 max-w-2xl mx-auto">
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1.5">{whyRemquip.title || "Why Choose REMQUIP"}</p>
              <h2 className="font-display text-xl sm:text-2xl font-semibold text-foreground tracking-tight">{whyRemquip.description || "Built for Fleet Operations"}</h2>
              <p className="text-muted-foreground text-sm mt-4 leading-relaxed">
                {whyData.subtitle || "We specialize in quality parts, competitive pricing, and customer service that keeps your fleet running smoothly."}
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8">
              {(whyData.cards?.length ? whyData.cards : [
                { icon: "Package", title: "Extensive Inventory", desc: "500+ SKUs ready to ship. Most items in stock for immediate delivery to fleets across North America." },
                { icon: "Users", title: "Dedicated Support", desc: "Expert team standing by. Get technical guidance, bulk quotes, and personalized service for your fleet needs." },
                { icon: "BarChart3", title: "Proven Track Record", desc: "15+ years serving trucking operations. Trusted by fleet managers for reliability and competitive pricing." },
              ]).map(({ icon: iconKey, title, desc }, i) => {
                const Icon = ICON_MAP[iconKey] ?? Package;
                return (
                  <motion.div key={i} variants={fadeUp}>
                    <div className="h-full p-6 md:p-8 border border-border rounded bg-card hover:border-accent/30 transition-colors">
                      <div className="w-10 h-10 rounded flex items-center justify-center mb-4 bg-accent/10">
                        <Icon className="h-5 w-5 text-accent" strokeWidth={2} />
                      </div>
                      <h3 className="font-display text-base font-semibold text-foreground mb-2">{title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Wholesale CTA */}
      <section id="wholesale" className="border-t border-border overflow-hidden">
        <div className="grid md:grid-cols-2 min-h-[300px] md:min-h-[360px]">
          <div className="flex flex-col justify-center px-4 sm:px-6 lg:px-10 py-12 md:py-16 order-2 md:order-1 max-w-xl">
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-2">{wholesaleCta.title || "Fleet Solutions"}</p>
            <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-semibold text-foreground mb-3 leading-tight tracking-tight">
              {wholesaleCta.description || "Wholesale Programs for Fleet Operators"}
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-6">
              {wholesaleData.body || "Get competitive bulk pricing, dedicated account support, and streamlined ordering for your fleet operation."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to={wholesaleData.cta_primary_link || "/register"}
                className="inline-flex items-center justify-center gap-2 btn-gradient text-accent-foreground px-6 py-3 rounded font-medium text-sm transition-all"
              >
                {wholesaleData.cta_primary_label || "Join Wholesale"} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to={wholesaleData.cta_secondary_link || "/contact"}
                className="inline-flex items-center justify-center gap-2 border border-border text-foreground px-6 py-3 rounded font-medium text-sm hover:bg-muted/50 transition-colors"
              >
                <Phone className="h-4 w-4" /> {wholesaleData.cta_secondary_label || "Contact Sales"}
              </Link>
            </div>
          </div>
          <div className="relative min-h-[200px] md:min-h-full order-1 md:order-2">
            <img
              src={warehouseImage}
              alt="Industrial warehouse"
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </section>
    </>
  );
}
