import React from "react";
import { Link } from "react-router-dom";
import { Phone, Mail, MapPin } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { categories } from "@/config/products";
import FlagIcon from "@/components/FlagIcon";

export default function Footer() {
  const { t, lang, setLang } = useLanguage();
  const { currency, setCurrency } = useCurrency();

  return (
    <footer className="bg-tertiary text-primary-foreground border-t" style={{borderColor: 'hsla(var(--border), 0.2)'}}>
      {/* Newsletter Section */}
      <div className="bg-tertiary-container/50 backdrop-blur-sm" style={{backgroundColor: 'hsla(var(--primary-container), 0.15)'}}>
        <div className="container mx-auto px-4 py-12 md:py-14 text-center">
          <h3 className="font-display text-2xl md:text-3xl font-bold mb-3 tracking-tight">{t("newsletter.title")}</h3>
          <p className="text-primary-foreground/75 text-sm md:text-base mb-6 max-w-lg mx-auto">{t("newsletter.subtitle") || "Get exclusive deals and industry insights delivered to your inbox."}</p>
          <div className="flex flex-col sm:flex-row max-w-md mx-auto gap-3">
            <input
              type="email"
              placeholder={t("newsletter.placeholder")}
              className="flex-1 px-5 py-3 border rounded-lg bg-primary-foreground/10 text-primary-foreground text-sm outline-none focus:ring-2 focus:ring-accent focus:border-transparent backdrop-blur-sm placeholder:text-primary-foreground/50 transition-all"
              style={{borderColor: 'hsla(var(--primary-foreground), 0.2)'}}
            />
            <button className="btn-gradient text-accent-foreground px-7 py-3 rounded-lg text-sm font-semibold uppercase tracking-wider whitespace-nowrap transition-all shadow-lg hover:shadow-xl transform hover:scale-105">
              {t("newsletter.cta")}
            </button>
          </div>
        </div>
      </div>

      {/* Main footer content */}
      <div className="container mx-auto px-4 py-12 md:py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 md:gap-10 mb-12">
            {/* Company info */}
            <div className="lg:col-span-1">
              <h4 className="font-display font-bold text-lg tracking-[0.1em] mb-5 text-accent" style={{letterSpacing: '-0.02em'}}>REMQUIP</h4>
              <p className="text-sm text-primary-foreground/75 mb-5 leading-relaxed">Heavy-duty truck parts and equipment supplier. Trusted by fleets across North America.</p>
              <div className="space-y-3 text-sm text-primary-foreground/75">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 mt-0.5 flex-shrink-0 text-accent" />
                  <span>Quebec City, QC, Canada</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 flex-shrink-0 text-accent" />
                  <a href="tel:1-800-555-0199" className="hover:text-primary-foreground transition-colors">1-800-555-0199</a>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 flex-shrink-0 text-accent" />
                  <a href="mailto:info@remquip.ca" className="hover:text-primary-foreground transition-colors">info@remquip.ca</a>
                </div>
              </div>
            </div>

            {/* Categories */}
            <div>
              <h4 className="font-display font-semibold uppercase text-xs tracking-widest mb-4 text-primary-foreground">{t("footer.categories")}</h4>
              <ul className="space-y-2.5">
                {categories.slice(0, 4).map((cat) => (
                  <li key={cat.id}>
                    <Link to={`/products/${cat.slug}`} className="text-sm text-primary-foreground/75 hover:text-accent transition-colors font-light">
                      {t(cat.translationKey)}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link to="/products" className="text-sm text-primary-foreground/75 hover:text-accent transition-colors font-light">
                    {t("cat.shop_all")}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Information */}
            <div>
              <h4 className="font-display font-semibold uppercase text-xs tracking-widest mb-4 text-primary-foreground">{t("footer.information")}</h4>
              <ul className="space-y-2.5">
                <li><Link to="/about" className="text-sm text-primary-foreground/75 hover:text-accent transition-colors font-light">{t("footer.about")}</Link></li>
                <li><Link to="/shipping" className="text-sm text-primary-foreground/75 hover:text-accent transition-colors font-light">{t("footer.shipping")}</Link></li>
                <li><Link to="/contact" className="text-sm text-primary-foreground/75 hover:text-accent transition-colors font-light">{t("footer.contact")}</Link></li>
                <li><Link to="/faq" className="text-sm text-primary-foreground/75 hover:text-accent transition-colors font-light">FAQ</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-display font-semibold uppercase text-xs tracking-widest mb-4 text-primary-foreground">{t("footer.legal")}</h4>
              <ul className="space-y-2.5">
                <li><Link to="/terms" className="text-sm text-primary-foreground/75 hover:text-accent transition-colors font-light">{t("footer.terms")}</Link></li>
                <li><Link to="/privacy" className="text-sm text-primary-foreground/75 hover:text-accent transition-colors font-light">{t("footer.privacy")}</Link></li>
                <li><Link to="/refund" className="text-sm text-primary-foreground/75 hover:text-accent transition-colors font-light">{t("footer.refund")}</Link></li>
                <li><Link to="/cookie" className="text-sm text-primary-foreground/75 hover:text-accent transition-colors font-light">{t("footer.cookie")}</Link></li>
              </ul>
            </div>

            {/* Language & Currency */}
            <div>
              <h4 className="font-display font-semibold uppercase text-xs tracking-widest mb-4 text-primary-foreground">{t("language")}</h4>
              <div className="flex gap-2 mb-5">
                {([["en", "us", "EN"], ["fr", "fr", "FR"]] as const).map(([code, flag, label]) => (
                  <button
                    key={code}
                    onClick={() => setLang(code)}
                    className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-md transition-all font-medium ${
                      lang === code
                        ? "bg-accent text-accent-foreground shadow-lg"
                        : "text-primary-foreground/70 hover:text-primary-foreground border border-primary-foreground/20 hover:border-primary-foreground/40"
                    }`}
                  >
                    <FlagIcon country={flag} className="w-4 h-3 rounded-sm overflow-hidden" /> {label}
                  </button>
                ))}
              </div>

              <h4 className="font-display font-semibold uppercase text-xs tracking-widest mb-4 text-primary-foreground">{t("currency")}</h4>
              <div className="flex flex-wrap gap-2">
                {([["CAD", "ca"], ["USD", "us"], ["EUR", "eu"]] as const).map(([code, flag]) => (
                  <button
                    key={code}
                    onClick={() => setCurrency(code as "CAD" | "USD" | "EUR")}
                    className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-md transition-all font-medium ${
                      currency === code
                        ? "bg-accent text-accent-foreground shadow-lg"
                        : "text-primary-foreground/70 hover:text-primary-foreground border border-primary-foreground/20 hover:border-primary-foreground/40"
                    }`}
                  >
                    <FlagIcon country={flag} className="w-4 h-3 rounded-sm overflow-hidden" /> {code}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

      {/* Bottom bar */}
      <div className="border-t backdrop-blur-sm" style={{borderColor: 'hsla(var(--border), 0.2)', backgroundColor: 'hsla(var(--tertiary), 0.5)'}}>
        <div className="container mx-auto px-4 py-6 text-center">
          <p className="text-xs text-primary-foreground/60">© {new Date().getFullYear()} REMQUIP. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
