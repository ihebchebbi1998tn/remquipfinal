import React, { useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import ContactMap from "@/components/contact/ContactMap";
import { useContactMap } from "@/hooks/useApi";
import { useCMSPageContent } from "@/hooks/useCMS";
import type { ContactSectionRow } from "@/lib/contactCms";
import { api } from "@/lib/api";
import {
  getSection,
  introFromSection,
  mapCopyFromSection,
  parseLabelsJson,
  parseSidebarJson,
} from "@/lib/contactCms";
import { showSuccessToast, showErrorToast } from "@/lib/toast";

const FALLBACK = {
  latitude: 45.5017,
  longitude: -73.5673,
  zoom: 13,
  marker_title: "REMQUIP",
  address_line: "1000 Rue de la Gauchetière O, Montréal, QC H3B 4W5, Canada",
};

export default function ContactPage() {
  const { t, lang } = useLanguage();
  const { data: mapRes, isLoading: mapLoading } = useContactMap();
  const { data: sections = [] } = useCMSPageContent("contact", lang);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const row = mapRes?.success && mapRes.data ? mapRes.data : null;
  const lat = row?.latitude ?? FALLBACK.latitude;
  const lng = row?.longitude ?? FALLBACK.longitude;
  const zm = row?.zoom ?? FALLBACK.zoom;
  const markerTitle = row?.marker_title ?? FALLBACK.marker_title;
  const addressLine = row?.address_line ?? FALLBACK.address_line;

  const copy = useMemo(() => {
    const rows = sections as ContactSectionRow[];
    const introFb = {
      eyebrow: t("contact.eyebrow"),
      heading: t("contact.title"),
      body: t("contact.intro"),
    };
    const formFb = {
      name: t("contact.name"),
      email: t("contact.email"),
      subject: t("contact.subject"),
      message: t("contact.message"),
      send: t("contact.send"),
    };
    const sideFb = {
      address_label: t("contact.address_label"),
      phone_label: t("contact.phone_label"),
      phone: "+1 (418) 555-0199",
      email_label: t("contact.email_label"),
      email: "info@remquip.ca",
      hours_label: t("contact.hours_label"),
      hours: t("contact.hours_value"),
    };
    const mapFb = {
      heading: t("contact.map_heading"),
      subtitle: t("contact.map_subtitle"),
    };

    return {
      intro: introFromSection(getSection(rows, "intro"), introFb),
      formLabels: parseLabelsJson(getSection(rows, "form_labels")?.content, formFb),
      sidebar: parseSidebarJson(getSection(rows, "sidebar")?.content, sideFb),
      map: mapCopyFromSection(getSection(rows, "map"), mapFb),
    };
  }, [sections, t]);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-16 md:py-20">
      <div className="mb-12 max-w-4xl">
        <p className="section-eyebrow mb-2">{copy.intro.eyebrow}</p>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
          {copy.intro.heading}
        </h1>
        <p className="text-muted-foreground text-sm mt-3 max-w-xl">{copy.intro.body}</p>
      </div>

      <div className="grid gap-12 lg:gap-14 xl:gap-16 lg:grid-cols-12 lg:items-start">
        {/* Left: form + contact details */}
        <div className="space-y-10 lg:col-span-5">
          <form
            className="space-y-5"
            onSubmit={async (e) => {
              e.preventDefault();
              if (submitting) return;
              const name = form.name.trim();
              const email = form.email.trim();
              const subject = form.subject.trim();
              const message = form.message.trim();

              if (!name) return showErrorToast("Name is required");
              if (!email || !/^\S+@\S+\.\S+$/.test(email)) return showErrorToast("Valid email is required");
              if (!message) return showErrorToast("Message is required");

              setSubmitting(true);
              try {
                await api.submitContactLead({ name, email, subject, message });
                setSent(true);
                setForm({ name: "", email: "", subject: "", message: "" });
                showSuccessToast("Thanks. Your request was sent.");
              } catch (err) {
                showErrorToast(err instanceof Error ? err.message : "Failed to send your message");
              } finally {
                setSubmitting(false);
              }
            }}
          >
            <div>
              <label htmlFor="contact-name" className="block text-sm font-medium text-foreground mb-2">
                {copy.formLabels.name}
              </label>
              <input
                id="contact-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border border-border rounded-md px-4 py-2.5 text-sm bg-background text-foreground outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/30 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="contact-email" className="block text-sm font-medium text-foreground mb-2">
                {copy.formLabels.email}
              </label>
              <input
                id="contact-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full border border-border rounded-md px-4 py-2.5 text-sm bg-background text-foreground outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/30 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="contact-subject" className="block text-sm font-medium text-foreground mb-2">
                {copy.formLabels.subject}
              </label>
              <input
                id="contact-subject"
                type="text"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                className="w-full border border-border rounded-md px-4 py-2.5 text-sm bg-background text-foreground outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/30 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="contact-message" className="block text-sm font-medium text-foreground mb-2">
                {copy.formLabels.message}
              </label>
              <textarea
                id="contact-message"
                rows={5}
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                className="w-full border border-border rounded-md px-4 py-2.5 text-sm bg-background text-foreground outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/30 resize-none transition-colors"
              />
            </div>
            {sent ? (
              <div className="text-sm text-muted-foreground">
                Thanks! We will contact you shortly.
              </div>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="bg-foreground text-background px-6 py-2.5 rounded-md font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-70"
              >
                {submitting ? "Sending..." : copy.formLabels.send}
              </button>
            )}
          </form>

          <div className="space-y-6 border-t border-border/70 pt-10">
            <div className="flex gap-4">
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-sm text-foreground">{copy.sidebar.address_label}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{mapLoading ? "…" : addressLine}</p>
              </div>
            </div>
            <div className="flex gap-4">
              <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-sm text-foreground">{copy.sidebar.phone_label}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{copy.sidebar.phone}</p>
              </div>
            </div>
            <div className="flex gap-4">
              <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-sm text-foreground">{copy.sidebar.email_label}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{copy.sidebar.email}</p>
              </div>
            </div>
            <div className="flex gap-4">
              <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-sm text-foreground">{copy.sidebar.hours_label}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{copy.sidebar.hours}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: map */}
        <section
          className="lg:col-span-7 lg:sticky lg:top-24 xl:top-28 space-y-4"
          aria-labelledby="contact-map-heading"
        >
          <div>
            <h2 id="contact-map-heading" className="font-display text-lg font-semibold text-foreground">
              {copy.map.heading}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{copy.map.subtitle}</p>
          </div>
          <ContactMap
            layout="sidebar"
            latitude={lat}
            longitude={lng}
            zoom={zm}
            markerTitle={markerTitle}
            addressLine={addressLine}
            className="shadow-md"
          />
        </section>
      </div>
    </div>
  );
}
