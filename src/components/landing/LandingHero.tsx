import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { resolveUploadImageUrl } from "@/lib/api";
import heroImage from "@/assets/images/hero-truck.jpg";

export type HeroSlideInput = { image_url?: string; alt?: string; caption?: string };

export type HeroCtaContent = {
  cta_primary_label?: string;
  cta_primary_link?: string;
  cta_secondary_label?: string;
  cta_secondary_link?: string;
  hero_image_alt?: string;
  eyebrow?: string;
  hero_layout?: string;
  carousel_interval_ms?: number;
  slides?: HeroSlideInput[];
};

type ResolvedSlide = { src: string; alt: string; caption: string };

function buildSlides(
  heroImageUrl: string | undefined,
  fallbackAlt: string,
  cta: HeroCtaContent,
  fallbackAsset: string
): ResolvedSlide[] {
  const fromSlides = (cta.slides ?? [])
    .map((s) => ({
      url: s.image_url?.trim() ?? "",
      alt: s.alt?.trim() || fallbackAlt,
      caption: s.caption?.trim() ?? "",
    }))
    .filter((s) => s.url.length > 0);

  if (fromSlides.length > 0) {
    return fromSlides.map((s) => ({
      src: resolveUploadImageUrl(s.url),
      alt: s.alt,
      caption: s.caption,
    }));
  }

  if (heroImageUrl?.trim()) {
    return [
      {
        src: resolveUploadImageUrl(heroImageUrl.trim()),
        alt: fallbackAlt,
        caption: "",
      },
    ];
  }

  return [{ src: fallbackAsset, alt: fallbackAlt, caption: "" }];
}

function resolveLayout(cta: HeroCtaContent, slideCount: number): "split" | "spotlight" {
  const raw = cta.hero_layout?.toLowerCase()?.trim();
  if (raw === "spotlight") return "spotlight";
  if (raw === "split") return "split";
  return slideCount >= 2 ? "split" : "spotlight";
}

function clampInterval(ms: number | undefined): number {
  const n = typeof ms === "number" && !Number.isNaN(ms) ? ms : 6000;
  return Math.min(90000, Math.max(4000, n));
}

type HeroSection = {
  title?: string;
  description?: string;
  image_url?: string;
};

export default function LandingHero({
  hero,
  heroCta,
}: {
  hero: HeroSection;
  heroCta: HeroCtaContent;
}) {
  const fallbackAlt = heroCta.hero_image_alt?.trim() || "Industrial truck parts";
  const slides = useMemo(
    () => buildSlides(hero.image_url, fallbackAlt, heroCta, heroImage),
    [hero.image_url, fallbackAlt, heroCta]
  );
  const layout = useMemo(() => resolveLayout(heroCta, slides.length), [heroCta, slides.length]);
  const intervalMs = useMemo(() => clampInterval(heroCta.carousel_interval_ms), [heroCta.carousel_interval_ms]);

  const [index, setIndex] = useState(0);
  const safeIndex = slides.length ? index % slides.length : 0;

  useEffect(() => {
    setIndex(0);
  }, [slides.length]);

  useEffect(() => {
    if (layout !== "split" || slides.length <= 1) return;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, intervalMs);
    return () => window.clearInterval(t);
  }, [layout, slides.length, intervalMs]);

  const title = hero.title?.trim() || "Industrial-Grade Parts For North American Fleets";
  const description =
    hero.description?.trim() ||
    "500+ SKUs in stock. 48-hour delivery. Trusted by fleet operators across North America for 15+ years.";
  const eyebrow = heroCta.eyebrow?.trim();

  const primary = {
    label: heroCta.cta_primary_label?.trim() || "Browse Catalog",
    href: heroCta.cta_primary_link?.trim() || "/products",
  };
  const secondary = {
    label: heroCta.cta_secondary_label?.trim() || "Wholesale Program",
    href: heroCta.cta_secondary_link?.trim() || "/register",
  };

  const go = (dir: -1 | 1) => {
    setIndex((i) => (i + dir + slides.length) % slides.length);
  };

  if (layout === "spotlight") {
    const bg = slides[0];
    return (
      <section className="relative min-h-[520px] sm:min-h-[600px] md:min-h-[700px] flex items-center overflow-hidden bg-tertiary">
        <img
          src={bg.src}
          alt={bg.alt}
          className="absolute inset-0 w-full h-full object-cover opacity-[0.22]"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-tertiary/96 via-tertiary/78 to-tertiary/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-tertiary/50 via-transparent to-transparent pointer-events-none" />

        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 max-w-7xl">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
            >
              {eyebrow && (
                <p className="text-primary-foreground/75 text-xs font-semibold uppercase tracking-[0.2em] mb-4">
                  {eyebrow}
                </p>
              )}
              <h1
                className="font-display landing-hero-title font-bold text-primary-foreground mb-6 md:mb-8 tracking-tight"
                style={{ letterSpacing: "-0.02em" }}
              >
                {title}
              </h1>
              <p className="landing-hero-subtitle text-primary-foreground/85 mb-10 md:mb-12 max-w-2xl font-light leading-relaxed">
                {description}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
                <Link
                  to={primary.href}
                  className="inline-flex items-center justify-center gap-2 btn-gradient text-accent-foreground px-9 py-4 rounded-lg font-semibold text-sm uppercase tracking-wider transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  {primary.label}
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  to={secondary.href}
                  className="inline-flex items-center justify-center gap-2 border border-primary-foreground/30 text-primary-foreground px-9 py-4 rounded-lg font-semibold text-sm uppercase tracking-wider hover:border-primary-foreground/55 hover:bg-primary-foreground/5 transition-all"
                >
                  {secondary.label}
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    );
  }

  /* Split layout — copy left, gallery / carousel right */
  return (
    <section className="relative overflow-hidden bg-tertiary min-h-[520px] md:min-h-[640px]">
      <div className="absolute inset-0 bg-gradient-to-br from-tertiary via-tertiary to-tertiary/90" />
      <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent via-transparent to-transparent" />

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20 lg:py-24 max-w-7xl">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          <div className="lg:col-span-5 text-primary-foreground">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              {eyebrow && (
                <p className="text-primary-foreground/70 text-xs font-semibold uppercase tracking-[0.2em] mb-4">
                  {eyebrow}
                </p>
              )}
              <h1
                className="font-display landing-hero-title font-bold mb-5 md:mb-7 tracking-tight"
                style={{ letterSpacing: "-0.02em" }}
              >
                {title}
              </h1>
              <p className="landing-hero-subtitle text-primary-foreground/82 mb-9 md:mb-10 font-light leading-relaxed">
                {description}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Link
                  to={primary.href}
                  className="inline-flex items-center justify-center gap-2 btn-gradient text-accent-foreground px-8 py-3.5 rounded-lg font-semibold text-sm uppercase tracking-wider shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                >
                  {primary.label}
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  to={secondary.href}
                  className="inline-flex items-center justify-center gap-2 border border-primary-foreground/28 text-primary-foreground px-8 py-3.5 rounded-lg font-semibold text-sm uppercase tracking-wider hover:bg-primary-foreground/6 transition-all"
                >
                  {secondary.label}
                </Link>
              </div>
            </motion.div>
          </div>

          <div className="lg:col-span-7">
            <div className="relative mx-auto max-w-xl lg:max-w-none">
              <div className="relative aspect-[4/3] sm:aspect-[16/10] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-primary-foreground/10 bg-black/20">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={safeIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45 }}
                    className="absolute inset-0"
                  >
                    <img
                      src={slides[safeIndex].src}
                      alt={slides[safeIndex].alt}
                      className="w-full h-full object-cover"
                      loading={safeIndex === 0 ? "eager" : "lazy"}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent pointer-events-none" />
                    {slides[safeIndex].caption && (
                      <p className="absolute bottom-4 left-4 right-4 text-sm text-white/95 font-medium drop-shadow-md">
                        {slides[safeIndex].caption}
                      </p>
                    )}
                  </motion.div>
                </AnimatePresence>

                {slides.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => go(-1)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 hover:bg-black/55 text-white p-2 backdrop-blur-sm transition-colors"
                      aria-label="Previous slide"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => go(1)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 hover:bg-black/55 text-white p-2 backdrop-blur-sm transition-colors"
                      aria-label="Next slide"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                      {slides.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setIndex(i)}
                          className={`h-1.5 rounded-full transition-all ${
                            i === safeIndex ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/60"
                          }`}
                          aria-label={`Go to slide ${i + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Decorative secondary frames — static thumbnails for depth (ecommerce look) */}
              {slides.length > 1 && (
                <div className="hidden sm:flex gap-3 mt-4 justify-end pr-1">
                  {slides.slice(0, 3).map((s, i) => (
                    <button
                      key={`${s.src}-${i}`}
                      type="button"
                      onClick={() => setIndex(i)}
                      className={`relative w-20 h-14 md:w-24 md:h-16 rounded-lg overflow-hidden ring-2 transition-all ${
                        i === safeIndex ? "ring-accent opacity-100" : "ring-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={s.src} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
