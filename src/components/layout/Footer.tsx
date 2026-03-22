import React from "react";
import { Link } from "react-router-dom";
import { Phone, Mail, MapPin } from "lucide-react";
import { useLanguage, localeLabel, localeFlag } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { categories } from "@/config/products";
import FlagIcon from "@/components/FlagIcon";
import { usePublicSettings } from "@/hooks/useApi";

export default function Footer() {
  const { t, lang, setLang } = useLanguage();
  const { currency, setCurrency } = useCurrency();
  const { data: pubRes } = usePublicSettings();
  const pub = (pubRes?.data ?? {}) as Record<string, string>;
  const storeName = pub.store_name || pub.site_name || "REMQUIP";
  const contactEmail = pub.contact_email || "info@remquip.ca";
  const contactPhone = pub.contact_phone || "1-800-555-0199";
  const storeAddress = pub.store_address || "Quebec City, QC, Canada";

  return (
    <footer className="bg-background text-foreground border-t border-border">
      {/* Newsletter */}
      <div className="border-b border-border bg-muted/40">
        <div className="container mx-auto px-4 py-12 md:py-14 text-center">
          <h3 className="font-display text-2xl md:text-3xl font-bold mb-3 tracking-tight text-foreground">
            {t("newsletter.title")}
          </h3>
          <p className="text-muted-foreground text-sm md:text-base mb-6 max-w-lg mx-auto">
            {t("newsletter.subtitle") || "Get exclusive deals and industry insights delivered to your inbox."}
          </p>
          <div className="flex flex-col sm:flex-row max-w-md mx-auto gap-3">
            <input
              type="email"
              placeholder={t("newsletter.placeholder")}
              className="flex-1 px-5 py-3 rounded-lg bg-card border border-border text-foreground text-sm outline-none focus:ring-2 focus:ring-accent focus:border-transparent placeholder:text-muted-foreground transition-all"
            />
            <button
              type="button"
              className="btn-gradient text-accent-foreground px-7 py-3 rounded-lg text-sm font-semibold uppercase tracking-wider whitespace-nowrap transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
            >
              {t("newsletter.cta")}
            </button>
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 md:gap-10 mb-12">
          <div className="lg:col-span-1">
            <h4 className="font-display font-bold text-lg tracking-[0.1em] mb-5 text-primary" style={{ letterSpacing: "-0.02em" }}>
              {storeName}
            </h4>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              Heavy-duty truck parts and equipment supplier. Trusted by fleets across North America.
            </p>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 mt-0.5 flex-shrink-0 text-accent" />
                <span className="whitespace-pre-line text-foreground/90">{storeAddress}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 flex-shrink-0 text-accent" />
                <a href={`tel:${contactPhone.replace(/\s/g, "")}`} className="text-foreground hover:text-accent transition-colors">
                  {contactPhone}
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 flex-shrink-0 text-accent" />
                <a href={`mailto:${contactEmail}`} className="text-foreground hover:text-accent transition-colors">
                  {contactEmail}
                </a>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-display font-semibold uppercase text-xs tracking-widest mb-4 text-foreground">
              {t("footer.categories")}
            </h4>
            <ul className="space-y-2.5">
              {categories.slice(0, 4).map((cat) => (
                <li key={cat.id}>
                  <Link to={`/products/${cat.slug}`} className="text-sm text-muted-foreground hover:text-accent transition-colors font-light">
                    {t(cat.translationKey)}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/products" className="text-sm text-muted-foreground hover:text-accent transition-colors font-light">
                  {t("cat.shop_all")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold uppercase text-xs tracking-widest mb-4 text-foreground">
              {t("footer.information")}
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/about" className="text-sm text-muted-foreground hover:text-accent transition-colors font-light">
                  {t("footer.about")}
                </Link>
              </li>
              <li>
                <Link to="/shipping" className="text-sm text-muted-foreground hover:text-accent transition-colors font-light">
                  {t("footer.shipping")}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm text-muted-foreground hover:text-accent transition-colors font-light">
                  {t("footer.contact")}
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-sm text-muted-foreground hover:text-accent transition-colors font-light">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold uppercase text-xs tracking-widest mb-4 text-foreground">
              {t("footer.legal")}
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/terms" className="text-sm text-muted-foreground hover:text-accent transition-colors font-light">
                  {t("footer.terms")}
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-sm text-muted-foreground hover:text-accent transition-colors font-light">
                  {t("footer.privacy")}
                </Link>
              </li>
              <li>
                <Link to="/refund" className="text-sm text-muted-foreground hover:text-accent transition-colors font-light">
                  {t("footer.refund")}
                </Link>
              </li>
              <li>
                <Link to="/cookie" className="text-sm text-muted-foreground hover:text-accent transition-colors font-light">
                  {t("footer.cookie")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold uppercase text-xs tracking-widest mb-4 text-foreground">{t("language")}</h4>
            <div className="flex gap-2 mb-5">
              {supportedLocales.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLang(loc)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-md transition-all font-medium border ${
                    lang === loc
                      ? "bg-accent text-accent-foreground border-accent shadow-sm"
                      : "text-foreground/80 hover:text-foreground border-border hover:border-accent/50 bg-card"
                  }`}
                >
                  <FlagIcon country={localeFlag(loc)} className="w-4 h-3 rounded-sm overflow-hidden" /> {localeLabel(loc)}
                </button>
              ))}
            </div>

            <h4 className="font-display font-semibold uppercase text-xs tracking-widest mb-4 text-foreground">{t("currency")}</h4>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["CAD", "ca"],
                  ["USD", "us"],
                  ["EUR", "eu"],
                ] as const
              ).map(([code, flag]) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setCurrency(code as "CAD" | "USD" | "EUR")}
                  className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-md transition-all font-medium border ${
                    currency === code
                      ? "bg-accent text-accent-foreground border-accent shadow-sm"
                      : "text-foreground/80 hover:text-foreground border-border hover:border-accent/50 bg-card"
                  }`}
                >
                  <FlagIcon country={flag} className="w-4 h-3 rounded-sm overflow-hidden" /> {code}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border bg-muted/30">
        <div className="container mx-auto px-4 py-6 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} REMQUIP. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
