import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Truck, Wrench, CheckCircle, ArrowRight, Package, Phone, Users, BarChart3 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useCart } from "@/contexts/CartContext";
import { categories } from "@/config/products";
import { api, Product, ProductCategory } from "@/lib/api";
import heroImage from "@/assets/images/hero-truck.jpg";
import warehouseImage from "@/assets/images/warehouse-banner.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

export default function HomePage() {
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();
  const { addItem } = useCart();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categoriesList, setCategoriesList] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        console.log('[v0] Fetching featured products and categories');
        
        // Try to fetch from API, fallback to hardcoded data if API fails
        try {
          const featuredResponse = await api.getFeaturedProducts();
          if (featuredResponse.data) {
            setFeaturedProducts(featuredResponse.data.slice(0, 4));
          }
        } catch (err) {
          console.warn('[v0] Featured products API failed, using fallback');
          setFeaturedProducts([]);
        }

        try {
          const categoriesResponse = await api.getCategories();
          if (categoriesResponse.data) {
            setCategoriesList(categoriesResponse.data);
          }
        } catch (err) {
          console.warn('[v0] Categories API failed, using fallback');
          setCategoriesList(categories);
        }
      } catch (err) {
        console.error('[v0] Error fetching homepage data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <>
      {/* ═══ HERO ═══ */}
      <section className="relative min-h-[500px] sm:min-h-[580px] md:min-h-[680px] flex items-center overflow-hidden bg-tertiary">
        <img
          src={heroImage}
          alt="Heavy-duty truck fleet"
          className="absolute inset-0 w-full h-full object-cover opacity-25"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-tertiary/95 via-tertiary/80 to-transparent" />

        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <div className="inline-block mb-6">
                <span className="inline-flex items-center gap-2 bg-accent/15 text-accent px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold uppercase tracking-[0.15em]">
                  <span className="inline-block w-2 h-2 bg-accent rounded-full" />
                  {t("site.tagline")}
                </span>
              </div>
              
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-primary-foreground leading-[1.15] mb-6 tracking-tight" style={{ letterSpacing: '-0.02em' }}>
                {t("hero.title")}
              </h1>
              
              <p className="text-lg sm:text-xl text-primary-foreground/75 leading-relaxed mb-10 max-w-2xl font-light">
                {t("hero.subtitle")}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
                <Link
                  to="/products"
                  className="inline-flex items-center justify-center gap-2 btn-gradient text-accent-foreground px-8 py-4 rounded-lg font-semibold text-sm uppercase tracking-wider transition-all shadow-lg hover:shadow-xl hover:scale-105"
                >
                  {t("banner.stock.cta")}
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 border border-primary-foreground/30 text-primary-foreground px-8 py-4 rounded-lg font-semibold text-sm uppercase tracking-wider hover:bg-primary-foreground/10 transition-all glassmorphism"
                >
                  {t("wholesale.cta")}
                </Link>
              </div>
            </motion.div>
          </div>

          {/* Hero stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-16 md:mt-20 grid grid-cols-3 gap-6 sm:gap-8 max-w-2xl"
          >
            {[
              { value: "500+", label: "SKUs in Stock" },
              { value: "48h", label: "Avg. Delivery" },
              { value: "15+", label: "Years Experience" },
            ].map((stat) => (
              <div key={stat.label} className="border-l border-accent/40 pl-4 sm:pl-6">
                <p className="text-3xl sm:text-4xl font-bold text-accent font-display mb-1">{stat.value}</p>
                <p className="text-primary-foreground/70 text-xs sm:text-sm font-medium">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ VALUE PROPS ═══ */}
      <section className="surface-container">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-0">
            {[
              { icon: Shield, text: t("features.quality") },
              { icon: Truck, text: t("features.canadian") },
              { icon: Wrench, text: t("features.experience") },
              { icon: CheckCircle, text: t("features.fleet") },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 px-4 sm:px-6 py-5 border-r border-b border-border last:border-r-0 lg:last:border-b-0" style={{borderColor: 'hsla(var(--border), 0.3)'}}>
                <Icon className="h-5 w-5 text-accent flex-shrink-0" strokeWidth={1.8} />
                <span className="text-xs sm:text-sm font-medium text-foreground leading-snug">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CATEGORIES ═══ */}
      <section className="surface-section container mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
        >
          <motion.div variants={fadeUp} className="flex items-end justify-between mb-8">
            <div>
              <p className="text-accent text-xs font-semibold uppercase tracking-[0.15em] mb-1.5">{t("footer.categories")}</p>
              <h2 className="section-heading text-xl sm:text-2xl md:text-3xl">Shop by Category</h2>
            </div>
            <Link to="/products" className="hidden sm:flex items-center gap-1.5 text-sm text-accent font-medium hover:underline">
              {t("cat.shop_all")} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {(categoriesList.length > 0 ? categoriesList : categories).map((cat) => (
              <motion.div key={cat.id} variants={fadeUp}>
                <Link
                  to={`/products/${cat.slug || ''}`}
                  className="group block relative rounded-sm overflow-hidden aspect-[4/3]"
                >
                  {cat.image_url && (
                    <img
                      src={cat.image_url}
                      alt={cat.name}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                      loading="lazy"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/85 via-primary/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <span className="text-sm sm:text-base font-bold uppercase tracking-wide text-primary-foreground">
                      {cat.name}
                    </span>
                    <span className="block text-primary-foreground/50 text-xs mt-0.5 group-hover:text-primary-foreground/70 transition-colors">
                      {t("cat.shop_all")} →
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          <Link to="/products" className="sm:hidden flex items-center justify-center gap-1.5 text-sm text-accent font-medium mt-4 hover:underline">
            {t("cat.shop_all")} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </motion.div>
      </section>

      {/* ═══ FEATURED PRODUCTS ═══ */}
      <section className="surface-container-low">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
          >
            <motion.div variants={fadeUp} className="flex items-end justify-between mb-8">
              <div>
                <p className="text-accent text-xs font-semibold uppercase tracking-[0.15em] mb-1.5">{t("products.featured")}</p>
                <h2 className="section-heading text-xl sm:text-2xl md:text-3xl">{t("products.new")}</h2>
              </div>
              <Link to="/products" className="hidden sm:flex items-center gap-1.5 text-sm text-accent font-medium hover:underline">
                {t("products.view_all")} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </motion.div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {featuredProducts.map((product) => (
                <motion.div key={product.id} variants={fadeUp}>
                  <Link to={`/product/${product.slug}`} className="bg-surface-container-lowest rounded-lg overflow-hidden group h-full flex flex-col hover:shadow-md transition-all cursor-pointer block">
                    <div className="block aspect-square overflow-hidden bg-surface-container">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-3 sm:p-4 flex flex-col flex-1">
                      <p className="text-[11px] text-muted-foreground font-mono tracking-wide">{product.sku}</p>
                      <span className="text-sm font-medium text-foreground group-hover:text-accent transition-colors line-clamp-2 mt-1 mb-auto leading-snug">
                        {product.name}
                      </span>
                      <div className="mt-3 pt-3" style={{borderTop: '1px solid hsla(var(--border), 0.2)'}}>
                        <div className="flex items-center justify-between mb-2.5">
                          <p className="text-base font-bold text-foreground">{formatPrice(product.price)}</p>
                          {product.stock > 0 && (
                            <span className="text-[11px] text-success flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-success" />
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
                          className="w-full btn-gradient text-accent-foreground text-xs py-2 rounded-md font-semibold uppercase tracking-wide"
                        >
                          {t("products.add_to_cart")}
                        </button>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            <Link to="/products" className="sm:hidden flex items-center justify-center gap-1.5 text-sm text-accent font-medium mt-4 hover:underline">
              {t("products.view_all")} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ═══ WHY REMQUIP ═══ */}
      <section className="surface-section container mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
        >
          <motion.div variants={fadeUp} className="text-center mb-10">
            <p className="text-accent text-xs font-semibold uppercase tracking-[0.15em] mb-1.5">Why REMQUIP</p>
            <h2 className="section-heading text-xl sm:text-2xl md:text-3xl">{t("about.title")}</h2>
            <p className="text-muted-foreground text-sm sm:text-base mt-3 max-w-2xl mx-auto leading-relaxed">
              {t("about.description")}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
            {[
              { icon: Package, title: t("banner.stock.title"), desc: t("products.free_shipping_note") },
              { icon: Users, title: t("features.fleet"), desc: t("wholesale.description") },
              { icon: BarChart3, title: t("features.experience"), desc: t("wholesale.details") },
            ].map(({ icon: Icon, title, desc }, i) => (
              <motion.div key={i} variants={fadeUp}>
                <div className="rounded-lg p-6 h-full bg-surface-container-lowest hover:shadow-md transition-all" style={{backgroundColor: 'hsl(var(--surface-container-lowest))'}}>
                  <div className="w-10 h-10 rounded-md flex items-center justify-center mb-4" style={{backgroundColor: 'hsla(var(--accent), 0.1)'}}>
                    <Icon className="h-5 w-5 text-accent" strokeWidth={1.8} />
                  </div>
                  <h3 className="font-display text-sm sm:text-base font-semibold text-foreground mb-2 leading-snug">{title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ═══ WHOLESALE CTA ═══ */}
      <section className="relative overflow-hidden bg-tertiary">
        <img
          src={warehouseImage}
          alt="REMQUIP warehouse"
          className="absolute inset-0 w-full h-full object-cover opacity-20"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-tertiary/90 via-tertiary/75 to-transparent" />
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="max-w-xl mx-auto text-center sm:text-left sm:mx-0">
            <p className="text-accent text-xs font-semibold uppercase tracking-[0.15em] mb-2">For Businesses</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-primary-foreground mb-3 leading-tight">
              {t("wholesale.title")}
            </h2>
            <p className="text-primary-foreground/70 text-sm sm:text-base leading-relaxed mb-6 max-w-md">
              {t("wholesale.description")} {t("wholesale.details")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 btn-gradient text-accent-foreground px-7 py-3 rounded-lg font-semibold text-sm uppercase tracking-wide transition-all hover:shadow-lg"
              >
                {t("wholesale.cta")} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 border border-primary-foreground/30 text-primary-foreground px-7 py-3 rounded-lg font-medium text-sm hover:bg-primary-foreground/10 transition-colors"
              >
                <Phone className="h-4 w-4" /> {t("footer.contact")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
