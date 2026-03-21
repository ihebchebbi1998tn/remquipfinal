import React from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { MapPin, Phone, Mail, Clock } from "lucide-react";

export default function ContactPage() {
  const { t } = useLanguage();

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="font-display text-3xl font-bold text-center mb-10">{t("contact.title")}</h1>
      <div className="grid md:grid-cols-2 gap-10 max-w-4xl mx-auto">
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t("contact.name")}</label>
            <input type="text" className="w-full border border-border rounded-sm px-3 py-2.5 text-sm bg-background outline-none focus:ring-2 focus:ring-accent" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("contact.email")}</label>
            <input type="email" className="w-full border border-border rounded-sm px-3 py-2.5 text-sm bg-background outline-none focus:ring-2 focus:ring-accent" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("contact.subject")}</label>
            <input type="text" className="w-full border border-border rounded-sm px-3 py-2.5 text-sm bg-background outline-none focus:ring-2 focus:ring-accent" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("contact.message")}</label>
            <textarea rows={5} className="w-full border border-border rounded-sm px-3 py-2.5 text-sm bg-background outline-none focus:ring-2 focus:ring-accent resize-none" />
          </div>
          <button type="submit" className="btn-accent px-8 py-3 rounded-sm font-semibold uppercase tracking-wide">{t("contact.send")}</button>
        </form>

        <div className="space-y-6">
          <div className="flex gap-3">
            <MapPin className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-sm">{t("contact.address_label")}</h3>
              <p className="text-sm text-muted-foreground">123 Industrial Blvd, Quebec City, QC G1K 1A1, Canada</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Phone className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-sm">{t("contact.phone_label")}</h3>
              <p className="text-sm text-muted-foreground">+1 (418) 555-0199</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Mail className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-sm">{t("contact.email_label")}</h3>
              <p className="text-sm text-muted-foreground">info@remquip.ca</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Clock className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-sm">{t("contact.hours_label")}</h3>
              <p className="text-sm text-muted-foreground">{t("contact.hours_value")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
