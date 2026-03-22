import React from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { MapPin, Phone, Mail, Clock } from "lucide-react";

export default function ContactPage() {
  const { t } = useLanguage();

  return (
    <div className="container mx-auto px-4 py-16 md:py-20">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <p className="section-eyebrow mb-2">Get in touch</p>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">{t("contact.title")}</h1>
          <p className="text-muted-foreground text-sm mt-3 max-w-xl">
            Have questions about our products or wholesale programs? Reach out and we'll respond within 24 hours.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-12 md:gap-16">
          <form className="space-y-5">
            <div>
              <label htmlFor="contact-name" className="block text-sm font-medium text-foreground mb-2">{t("contact.name")}</label>
              <input id="contact-name" type="text" className="w-full border border-border rounded-md px-4 py-2.5 text-sm bg-background text-foreground outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/30 transition-colors" />
            </div>
            <div>
              <label htmlFor="contact-email" className="block text-sm font-medium text-foreground mb-2">{t("contact.email")}</label>
              <input id="contact-email" type="email" className="w-full border border-border rounded-md px-4 py-2.5 text-sm bg-background text-foreground outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/30 transition-colors" />
            </div>
            <div>
              <label htmlFor="contact-subject" className="block text-sm font-medium text-foreground mb-2">{t("contact.subject")}</label>
              <input id="contact-subject" type="text" className="w-full border border-border rounded-md px-4 py-2.5 text-sm bg-background text-foreground outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/30 transition-colors" />
            </div>
            <div>
              <label htmlFor="contact-message" className="block text-sm font-medium text-foreground mb-2">{t("contact.message")}</label>
              <textarea id="contact-message" rows={5} className="w-full border border-border rounded-md px-4 py-2.5 text-sm bg-background text-foreground outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/30 resize-none transition-colors" />
            </div>
            <button type="submit" className="bg-foreground text-background px-6 py-2.5 rounded-md font-medium text-sm hover:opacity-90 transition-opacity">
              {t("contact.send")}
            </button>
          </form>

          <div className="space-y-6">
            <div className="flex gap-4">
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-sm text-foreground">{t("contact.address_label")}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">123 Industrial Blvd, Quebec City, QC G1K 1A1, Canada</p>
              </div>
            </div>
            <div className="flex gap-4">
              <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-sm text-foreground">{t("contact.phone_label")}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">+1 (418) 555-0199</p>
              </div>
            </div>
            <div className="flex gap-4">
              <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-sm text-foreground">{t("contact.email_label")}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">info@remquip.ca</p>
              </div>
            </div>
            <div className="flex gap-4">
              <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-sm text-foreground">{t("contact.hours_label")}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{t("contact.hours_value")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
