import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Truck, Award, Users, MapPin, Phone, Mail, ArrowRight, CheckCircle, Package, Clock, Globe } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import warehouseImage from "@/assets/images/warehouse-banner.jpg";
import fleetImage from "@/assets/images/about-fleet.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

export default function AboutPage() {
  const { t } = useLanguage();

  const milestones = [
    { year: "2025", titleKey: "about.milestone.2025", descKey: "about.milestone.2025.desc" },
    { year: "2025", titleKey: "about.milestone.2025b", descKey: "about.milestone.2025b.desc" },
    { year: "2026", titleKey: "about.milestone.2026", descKey: "about.milestone.2026.desc" },
    { year: "2026", titleKey: "about.milestone.2026b", descKey: "about.milestone.2026b.desc" },
  ];

  const team = [
    { nameKey: "about.team.ceo.name", roleKey: "about.team.ceo.role", descKey: "about.team.ceo.desc" },
    { nameKey: "about.team.ops.name", roleKey: "about.team.ops.role", descKey: "about.team.ops.desc" },
    { nameKey: "about.team.sales.name", roleKey: "about.team.sales.role", descKey: "about.team.sales.desc" },
    { nameKey: "about.team.logistics.name", roleKey: "about.team.logistics.role", descKey: "about.team.logistics.desc" },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative min-h-[360px] sm:min-h-[420px] flex items-center overflow-hidden">
        <img src={warehouseImage} alt="REMQUIP warehouse" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/85 to-primary/40" />
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="text-accent text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] mb-3">{t("about.hero.label")}</p>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-primary-foreground leading-[1.1] mb-4 max-w-2xl">
              {t("about.hero.title")}
            </h1>
            <p className="text-primary-foreground/70 text-base sm:text-lg leading-relaxed max-w-xl">
              {t("about.hero.subtitle")}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-b border-border bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-border">
            {[
              { value: "500+", labelKey: "about.stat.skus" },
              { value: "48h", labelKey: "about.stat.delivery" },
              { value: "15+", labelKey: "about.stat.experience" },
              { value: "3", labelKey: "about.stat.warehouses" },
            ].map(({ value, labelKey }) => (
              <div key={labelKey} className="flex items-center justify-center gap-3 px-4 sm:px-6 py-5">
                <span className="text-xl sm:text-2xl font-bold text-accent font-display">{value}</span>
                <span className="text-xs sm:text-sm text-muted-foreground leading-snug">{t(labelKey)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}>
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <motion.div variants={fadeUp}>
              <p className="text-accent text-xs font-semibold uppercase tracking-[0.15em] mb-2">{t("about.story.label")}</p>
              <h2 className="section-heading text-xl sm:text-2xl md:text-3xl mb-4">{t("about.story.title")}</h2>
              <div className="space-y-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
                <p>{t("about.story.p1")}</p>
                <p>{t("about.story.p2")}</p>
                <p>{t("about.story.p3")}</p>
              </div>
            </motion.div>
            <motion.div variants={fadeUp}>
              <img src={fleetImage} alt="REMQUIP fleet operations" className="w-full h-80 lg:h-96 object-cover rounded-sm" loading="lazy" />
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Values */}
      <section className="bg-secondary/40 border-y border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}>
            <motion.div variants={fadeUp} className="text-center mb-10">
              <p className="text-accent text-xs font-semibold uppercase tracking-[0.15em] mb-1.5">{t("about.values.label")}</p>
              <h2 className="section-heading text-xl sm:text-2xl md:text-3xl">{t("about.values.title")}</h2>
            </motion.div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {[
                { icon: Shield, titleKey: "about.value.quality.title", descKey: "about.value.quality.desc" },
                { icon: Clock, titleKey: "about.value.speed.title", descKey: "about.value.speed.desc" },
                { icon: Users, titleKey: "about.value.partnership.title", descKey: "about.value.partnership.desc" },
                { icon: Globe, titleKey: "about.value.reach.title", descKey: "about.value.reach.desc" },
              ].map(({ icon: Icon, titleKey, descKey }, i) => (
                <motion.div key={i} variants={fadeUp}>
                  <div className="border border-border rounded-sm p-6 h-full bg-card hover:border-accent/30 transition-colors">
                    <div className="w-10 h-10 rounded-sm bg-accent/10 flex items-center justify-center mb-4">
                      <Icon className="h-5 w-5 text-accent" strokeWidth={1.8} />
                    </div>
                    <h3 className="font-display text-sm sm:text-base font-semibold text-foreground mb-2">{t(titleKey)}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{t(descKey)}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Timeline */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}>
          <motion.div variants={fadeUp} className="text-center mb-10">
            <p className="text-accent text-xs font-semibold uppercase tracking-[0.15em] mb-1.5">{t("about.timeline.label")}</p>
            <h2 className="section-heading text-xl sm:text-2xl md:text-3xl">{t("about.timeline.title")}</h2>
          </motion.div>
          <div className="max-w-2xl mx-auto space-y-0">
            {milestones.map((m, i) => (
              <motion.div key={i} variants={fadeUp} className="flex gap-4 md:gap-6">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-accent flex-shrink-0" />
                  {i < milestones.length - 1 && <div className="w-0.5 flex-1 bg-border" />}
                </div>
                <div className="pb-8">
                  <span className="text-xs text-accent font-semibold">{m.year}</span>
                  <h3 className="font-display text-sm font-semibold text-foreground mt-0.5">{t(m.titleKey)}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">{t(m.descKey)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Team */}
      <section className="bg-secondary/40 border-y border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}>
            <motion.div variants={fadeUp} className="text-center mb-10">
              <p className="text-accent text-xs font-semibold uppercase tracking-[0.15em] mb-1.5">{t("about.team.label")}</p>
              <h2 className="section-heading text-xl sm:text-2xl md:text-3xl">{t("about.team.title")}</h2>
            </motion.div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {team.map(({ nameKey, roleKey, descKey }, i) => (
                <motion.div key={i} variants={fadeUp}>
                  <div className="border border-border rounded-sm p-6 bg-card text-center">
                    <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                      <Users className="h-7 w-7 text-accent" />
                    </div>
                    <h3 className="font-display text-sm font-bold text-foreground">{t(nameKey)}</h3>
                    <p className="text-xs text-accent font-medium mt-0.5">{t(roleKey)}</p>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{t(descKey)}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden">
        <img src={warehouseImage} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-primary/85" />
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-primary-foreground mb-3">{t("about.cta.title")}</h2>
          <p className="text-primary-foreground/60 text-sm sm:text-base max-w-lg mx-auto mb-6">{t("about.cta.desc")}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/contact" className="inline-flex items-center justify-center gap-2 bg-accent text-accent-foreground px-7 py-3 rounded-sm font-semibold text-sm uppercase tracking-wide hover:opacity-90 transition-opacity">
              {t("footer.contact")} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/products" className="inline-flex items-center justify-center gap-2 border border-primary-foreground/30 text-primary-foreground px-7 py-3 rounded-sm font-medium text-sm uppercase tracking-wide hover:bg-primary-foreground/10 transition-colors">
              {t("banner.stock.cta")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
