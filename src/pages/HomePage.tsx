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
              <div className="inline-block mb-8">
                <span className="inline-flex items-center gap-2 bg-accent/20 text-accent px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold uppercase tracking-[0.1em]">
                  <span className="inline-block w-2 h-2 bg-accent rounded-full" />
                  Premium Truck Parts & Equipment
                </span>
              </div>
              
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-primary-foreground leading-[1.1] mb-8 tracking-tight" style={{ letterSpacing: '-0.02em' }}>
                Industrial-Grade Parts For North American Fleets
              </h1>
              
              <p className="text-lg sm:text-xl text-primary-foreground/80 leading-relaxed mb-12 max-w-2xl font-light">
                500+ SKUs in stock. 48-hour delivery. Trusted by fleet operators across North America for 15+ years.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                <Link
                  to="/products"
                  className="inline-flex items-center justify-center gap-2 btn-gradient text-accent-foreground px-9 py-4 rounded-lg font-semibold text-sm uppercase tracking-wider transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
                >
                  Browse Catalog
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 border border-primary-foreground/25 text-primary-foreground px-9 py-4 rounded-lg font-semibold text-sm uppercase tracking-wider hover:border-primary-foreground/50 hover:bg-primary-foreground/5 transition-all"
                >
                  Wholesale Program
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
              { icon: Shield, text: "Certified & Tested" },
              { icon: Truck, text: "Fast Delivery" },
              { icon: Wrench, text: "Expert Support" },
              { icon: CheckCircle, text: "In Stock" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 px-4 sm:px-6 py-6 border-r border-b border-border last:border-r-0 lg:last:border-b-0" style={{borderColor: 'hsla(var(--border), 0.25)'}}>
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
          <motion.div variants={fadeUp} className="flex items-end justify-between mb-10">
            <div>
              <p className="text-accent text-xs font-semibold uppercase tracking-[0.1em] mb-2">Browse Solutions</p>
              <h2 className="section-heading text-xl sm:text-2xl md:text-3xl font-display font-bold">Explore Product Categories</h2>
            </div>
            <Link to="/products" className="hidden sm:flex items-center gap-1.5 text-sm text-accent font-medium hover:gap-2 transition-all">
              View All <ArrowRight className="h-4 w-4" />
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
            <motion.div variants={fadeUp} className="flex items-end justify-between mb-10">
              <div>
                <p className="text-accent text-xs font-semibold uppercase tracking-[0.1em] mb-2">In High Demand</p>
                <h2 className="section-heading text-xl sm:text-2xl md:text-3xl font-display font-bold">Popular Products</h2>
              </div>
              <Link to="/products" className="hidden sm:flex items-center gap-1.5 text-sm text-accent font-medium hover:gap-2 transition-all">
                View All <ArrowRight className="h-4 w-4" />
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
          <motion.div variants={fadeUp} className="text-center mb-12">
            <p className="text-accent text-xs font-semibold uppercase tracking-[0.1em] mb-2">Why Choose REMQUIP</p>
            <h2 className="section-heading text-xl sm:text-2xl md:text-3xl font-display font-bold">Built for Fleet Operations</h2>
            <p className="text-muted-foreground text-sm sm:text-base mt-4 max-w-2xl mx-auto leading-relaxed">
              We specialize in quality parts, competitive pricing, and customer service that keeps your fleet running smoothly.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8">
            {[
              { icon: Package, title: "Extensive Inventory", desc: "500+ SKUs ready to ship. Most items in stock for immediate delivery to fleets across North America." },
              { icon: Users, title: "Dedicated Support", desc: "Expert team standing by. Get technical guidance, bulk quotes, and personalized service for your fleet needs." },
              { icon: BarChart3, title: "Proven Track Record", desc: "15+ years serving trucking operations. Trusted by fleet managers for reliability and competitive pricing." },
            ].map(({ icon: Icon, title, desc }, i) => (
              <motion.div key={i} variants={fadeUp}>
                <div className="rounded-lg p-8 h-full bg-surface-container-lowest hover:shadow-lg transition-all" style={{backgroundColor: 'hsl(var(--surface-container-lowest))'}}>
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-5" style={{backgroundColor: 'hsla(var(--accent), 0.12)'}}>
                    <Icon className="h-6 w-6 text-accent" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-display text-base sm:text-lg font-semibold text-foreground mb-3 leading-snug">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
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
          alt="Industrial warehouse"
          className="absolute inset-0 w-full h-full object-cover opacity-18"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-tertiary/92 via-tertiary/70 to-transparent" />
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24">
          <div className="max-w-2xl">
            <p className="text-accent text-xs font-semibold uppercase tracking-[0.1em] mb-3">Fleet Solutions</p>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-primary-foreground mb-4 leading-tight">
              Wholesale Programs for Fleet Operators
            </h2>
            <p className="text-primary-foreground/75 text-base sm:text-lg leading-relaxed mb-8 max-w-xl">
              Get competitive bulk pricing, dedicated account support, and streamlined ordering for your fleet operation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 btn-gradient text-accent-foreground px-8 py-4 rounded-lg font-semibold text-sm uppercase tracking-wide transition-all hover:shadow-lg hover:-translate-y-0.5"
              >
                Join Wholesale <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 border border-primary-foreground/25 text-primary-foreground px-8 py-4 rounded-lg font-semibold text-sm uppercase tracking-wide hover:border-primary-foreground/50 hover:bg-primary-foreground/5 transition-all"
              >
                <Phone className="h-4 w-4" /> Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
