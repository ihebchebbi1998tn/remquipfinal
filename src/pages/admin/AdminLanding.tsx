import React, { useState } from "react";
import {
  Loader2,
  Globe,
  Save,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  LayoutTemplate,
} from "lucide-react";
import { useCMSPageContent, useUpdateCMSContent } from "@/hooks/useCMS";
import { useStorefrontRates } from "@/hooks/useApi";
import { localeLabel } from "@/contexts/LanguageContext";
import { showSuccessToast, showErrorToast } from "@/lib/toast";

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero (headline & CTAs)",
  stats: "Stats bar",
  value_props: "Value propositions",
  categories_intro: "Categories section intro",
  featured_intro: "Featured products intro",
  why_remquip: "Why REMQUIP cards",
  wholesale_cta: "Wholesale CTA",
};

function parseJson<T>(raw: string, fallback: T): T {
  if (!raw?.trim()) return fallback;
  try {
    const v = JSON.parse(raw);
    return (v ?? fallback) as T;
  } catch {
    return fallback;
  }
}

function SectionCard({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left font-medium hover:bg-muted/50 transition-colors"
      >
        <span>{title}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && <div className="p-4 pt-0 space-y-4 border-t border-border">{children}</div>}
    </div>
  );
}

export default function AdminLanding() {
  const { data: storefront } = useStorefrontRates();
  const supportedLocales =
    (storefront as { data?: { supported_locales?: string[] } } | undefined)?.data?.supported_locales ?? [
      "en",
      "fr",
    ];
  const defaultLocale = supportedLocales[0] ?? "en";
  const [activeLocale, setActiveLocale] = useState(defaultLocale);

  const { data: sections = [], isLoading, isError } = useCMSPageContent("home", activeLocale);
  const updateMutation = useUpdateCMSContent();

  const sectionMap = Object.fromEntries(
    sections.map((s: { section_key: string }) => [s.section_key, s])
  ) as Record<string, { id: string; title: string; description: string; image_url: string; content: string }>;

  const handleSave = async (
    sectionKey: string,
    payload: { title?: string; description?: string; image_url?: string; content?: string }
  ) => {
    const s = sectionMap[sectionKey];
    if (!s?.id) return;
    try {
      await updateMutation.mutateAsync({
        id: s.id,
        data: payload,
        locale: activeLocale !== defaultLocale ? activeLocale : undefined,
      });
      showSuccessToast("Section updated");
    } catch {
      showErrorToast("Failed to update");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
        <span className="text-muted-foreground">Loading landing content...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-2" />
        <p className="text-muted-foreground">Failed to load landing content.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-lg md:text-xl flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5" />
            Landing Page Content
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Edit all texts on the homepage. Changes apply per language.
          </p>
        </div>
        {supportedLocales.length > 1 && (
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <select
              value={activeLocale}
              onChange={(e) => setActiveLocale(e.target.value)}
              className="px-3 py-2 border border-border rounded-sm text-sm bg-background"
            >
              {supportedLocales.map((l) => (
                <option key={l} value={l}>
                  {localeLabel(l)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* Hero */}
        {sectionMap.hero && (
          <SectionCard title={SECTION_LABELS.hero} defaultOpen>
            <HeroSectionForm section={sectionMap.hero} onSave={(d) => handleSave("hero", d)} loading={updateMutation.isPending} />
          </SectionCard>
        )}

        {/* Stats */}
        {sectionMap.stats && (
          <SectionCard title={SECTION_LABELS.stats}>
            <StatsSectionForm section={sectionMap.stats} onSave={(d) => handleSave("stats", d)} loading={updateMutation.isPending} />
          </SectionCard>
        )}

        {/* Value props */}
        {sectionMap.value_props && (
          <SectionCard title={SECTION_LABELS.value_props}>
            <ValuePropsSectionForm section={sectionMap.value_props} onSave={(d) => handleSave("value_props", d)} loading={updateMutation.isPending} />
          </SectionCard>
        )}

        {/* Categories intro */}
        {sectionMap.categories_intro && (
          <SectionCard title={SECTION_LABELS.categories_intro}>
            <IntroSectionForm section={sectionMap.categories_intro} onSave={(d) => handleSave("categories_intro", d)} loading={updateMutation.isPending} />
          </SectionCard>
        )}

        {/* Featured intro */}
        {sectionMap.featured_intro && (
          <SectionCard title={SECTION_LABELS.featured_intro}>
            <IntroSectionForm section={sectionMap.featured_intro} onSave={(d) => handleSave("featured_intro", d)} loading={updateMutation.isPending} />
          </SectionCard>
        )}

        {/* Why REMQUIP */}
        {sectionMap.why_remquip && (
          <SectionCard title={SECTION_LABELS.why_remquip}>
            <WhyRemquipSectionForm section={sectionMap.why_remquip} onSave={(d) => handleSave("why_remquip", d)} loading={updateMutation.isPending} />
          </SectionCard>
        )}

        {/* Wholesale CTA */}
        {sectionMap.wholesale_cta && (
          <SectionCard title={SECTION_LABELS.wholesale_cta}>
            <WholesaleCtaSectionForm section={sectionMap.wholesale_cta} onSave={(d) => handleSave("wholesale_cta", d)} loading={updateMutation.isPending} />
          </SectionCard>
        )}

        {sections.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No landing sections found. Run the database migration to seed the home page content.
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const Input = rows ? "textarea" : "input";
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
      />
    </div>
  );
}

function HeroSectionForm({
  section,
  onSave,
  loading,
}: {
  section: { title: string; description: string; content: string };
  onSave: (d: { title?: string; description?: string; content?: string }) => void;
  loading: boolean;
}) {
  const cta = parseJson<{ cta_primary_label?: string; cta_primary_link?: string; cta_secondary_label?: string; cta_secondary_link?: string }>(
    section.content,
    {}
  );
  const [title, setTitle] = useState(section.title);
  const [desc, setDesc] = useState(section.description);
  const [primaryLabel, setPrimaryLabel] = useState(cta.cta_primary_label ?? "Browse Catalog");
  const [primaryLink, setPrimaryLink] = useState(cta.cta_primary_link ?? "/products");
  const [secondaryLabel, setSecondaryLabel] = useState(cta.cta_secondary_label ?? "Wholesale Program");
  const [secondaryLink, setSecondaryLink] = useState(cta.cta_secondary_link ?? "/register");

  const save = () => {
    onSave({
      title,
      description: desc,
      content: JSON.stringify({
        cta_primary_label: primaryLabel,
        cta_primary_link: primaryLink,
        cta_secondary_label: secondaryLabel,
        cta_secondary_link: secondaryLink,
      }),
    });
  };

  return (
    <div className="space-y-4">
      <Field label="Headline" value={title} onChange={setTitle} placeholder="Industrial-Grade Parts..." />
      <Field label="Subtitle" value={desc} onChange={setDesc} placeholder="500+ SKUs in stock..." rows={2} />
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Primary CTA label" value={primaryLabel} onChange={setPrimaryLabel} />
        <Field label="Primary CTA link" value={primaryLink} onChange={setPrimaryLink} />
        <Field label="Secondary CTA label" value={secondaryLabel} onChange={setSecondaryLabel} />
        <Field label="Secondary CTA link" value={secondaryLink} onChange={setSecondaryLink} />
      </div>
      <button
        type="button"
        onClick={save}
        disabled={loading}
        className="btn-accent px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2 disabled:opacity-50"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        <Save className="h-4 w-4" /> Save
      </button>
    </div>
  );
}

function StatsSectionForm({
  section,
  onSave,
  loading,
}: {
  section: { content: string };
  onSave: (d: { content?: string }) => void;
  loading: boolean;
}) {
  const items = parseJson<{ value: string; label: string }[]>(section.content, [
    { value: "500+", label: "SKUs in Stock" },
    { value: "48h", label: "Avg. Delivery" },
    { value: "15+", label: "Years Experience" },
  ]);
  const [stats, setStats] = useState(items);

  const update = (i: number, key: "value" | "label", v: string) => {
    const next = [...stats];
    next[i] = { ...next[i], [key]: v };
    setStats(next);
  };

  const save = () => onSave({ content: JSON.stringify(stats) });

  return (
    <div className="space-y-4">
      {stats.map((s, i) => (
        <div key={i} className="flex gap-3 items-center">
          <input
            value={s.value}
            onChange={(e) => update(i, "value", e.target.value)}
            placeholder="500+"
            className="w-24 px-3 py-2 border border-border rounded-sm text-sm bg-background"
          />
          <input
            value={s.label}
            onChange={(e) => update(i, "label", e.target.value)}
            placeholder="SKUs in Stock"
            className="flex-1 px-3 py-2 border border-border rounded-sm text-sm bg-background"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={save}
        disabled={loading}
        className="btn-accent px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2 disabled:opacity-50"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        <Save className="h-4 w-4" /> Save
      </button>
    </div>
  );
}

function ValuePropsSectionForm({
  section,
  onSave,
  loading,
}: {
  section: { content: string };
  onSave: (d: { content?: string }) => void;
  loading: boolean;
}) {
  const items = parseJson<{ icon: string; text: string }[]>(section.content, [
    { icon: "Shield", text: "Certified & Tested" },
    { icon: "Truck", text: "Fast Delivery" },
    { icon: "Wrench", text: "Expert Support" },
    { icon: "CheckCircle", text: "In Stock" },
  ]);
  const [props, setProps] = useState(items);
  const icons = ["Shield", "Truck", "Wrench", "CheckCircle", "Package", "Users", "BarChart3"];

  const update = (i: number, key: "icon" | "text", v: string) => {
    const next = [...props];
    next[i] = { ...next[i], [key]: v };
    setProps(next);
  };

  const save = () => onSave({ content: JSON.stringify(props) });

  return (
    <div className="space-y-4">
      {props.map((p, i) => (
        <div key={i} className="flex gap-3 items-center">
          <select
            value={p.icon}
            onChange={(e) => update(i, "icon", e.target.value)}
            className="w-32 px-3 py-2 border border-border rounded-sm text-sm bg-background"
          >
            {icons.map((ic) => (
              <option key={ic} value={ic}>{ic}</option>
            ))}
          </select>
          <input
            value={p.text}
            onChange={(e) => update(i, "text", e.target.value)}
            placeholder="Certified & Tested"
            className="flex-1 px-3 py-2 border border-border rounded-sm text-sm bg-background"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={save}
        disabled={loading}
        className="btn-accent px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2 disabled:opacity-50"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        <Save className="h-4 w-4" /> Save
      </button>
    </div>
  );
}

function IntroSectionForm({
  section,
  onSave,
  loading,
}: {
  section: { title: string; description: string };
  onSave: (d: { title?: string; description?: string }) => void;
  loading: boolean;
}) {
  const [title, setTitle] = useState(section.title);
  const [desc, setDesc] = useState(section.description);

  const save = () => onSave({ title, description: desc });

  return (
    <div className="space-y-4">
      <Field label="Eyebrow / small label" value={title} onChange={setTitle} />
      <Field label="Heading" value={desc} onChange={setDesc} />
      <button
        type="button"
        onClick={save}
        disabled={loading}
        className="btn-accent px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2 disabled:opacity-50"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        <Save className="h-4 w-4" /> Save
      </button>
    </div>
  );
}

function WhyRemquipSectionForm({
  section,
  onSave,
  loading,
}: {
  section: { title: string; description: string; content: string };
  onSave: (d: { title?: string; description?: string; content?: string }) => void;
  loading: boolean;
}) {
  const data = parseJson<{ subtitle?: string; cards?: { icon: string; title: string; desc: string }[] }>(
    section.content,
    { subtitle: "", cards: [] }
  );
  const [title, setTitle] = useState(section.title);
  const [desc, setDesc] = useState(section.description);
  const [subtitle, setSubtitle] = useState(data.subtitle ?? "");
  const [cards, setCards] = useState(
    data.cards?.length ? data.cards : [
      { icon: "Package", title: "Extensive Inventory", desc: "500+ SKUs ready to ship..." },
      { icon: "Users", title: "Dedicated Support", desc: "Expert team standing by..." },
      { icon: "BarChart3", title: "Proven Track Record", desc: "15+ years serving..." },
    ]
  );
  const icons = ["Package", "Users", "BarChart3", "Shield", "Truck", "Wrench", "CheckCircle"];

  const updateCard = (i: number, key: "icon" | "title" | "desc", v: string) => {
    const next = [...cards];
    next[i] = { ...next[i], [key]: v };
    setCards(next);
  };

  const save = () =>
    onSave({
      title,
      description: desc,
      content: JSON.stringify({ subtitle, cards }),
    });

  return (
    <div className="space-y-4">
      <Field label="Eyebrow" value={title} onChange={setTitle} />
      <Field label="Heading" value={desc} onChange={setDesc} />
      <Field label="Subtitle" value={subtitle} onChange={setSubtitle} rows={2} />
      {cards.map((c, i) => (
        <div key={i} className="p-3 rounded border border-border space-y-2">
          <div className="flex gap-2">
            <select
              value={c.icon}
              onChange={(e) => updateCard(i, "icon", e.target.value)}
              className="w-28 px-2 py-1.5 border border-border rounded-sm text-sm bg-background"
            >
              {icons.map((ic) => (
                <option key={ic} value={ic}>{ic}</option>
              ))}
            </select>
            <input
              value={c.title}
              onChange={(e) => updateCard(i, "title", e.target.value)}
              placeholder="Card title"
              className="flex-1 px-3 py-2 border border-border rounded-sm text-sm bg-background"
            />
          </div>
          <textarea
            value={c.desc}
            onChange={(e) => updateCard(i, "desc", e.target.value)}
            placeholder="Card description"
            rows={2}
            className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={save}
        disabled={loading}
        className="btn-accent px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2 disabled:opacity-50"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        <Save className="h-4 w-4" /> Save
      </button>
    </div>
  );
}

function WholesaleCtaSectionForm({
  section,
  onSave,
  loading,
}: {
  section: { title: string; description: string; content: string };
  onSave: (d: { title?: string; description?: string; content?: string }) => void;
  loading: boolean;
}) {
  const data = parseJson<{
    body?: string;
    cta_primary_label?: string;
    cta_primary_link?: string;
    cta_secondary_label?: string;
    cta_secondary_link?: string;
  }>(section.content, {});
  const [title, setTitle] = useState(section.title);
  const [desc, setDesc] = useState(section.description);
  const [body, setBody] = useState(data.body ?? "");
  const [primaryLabel, setPrimaryLabel] = useState(data.cta_primary_label ?? "Join Wholesale");
  const [primaryLink, setPrimaryLink] = useState(data.cta_primary_link ?? "/register");
  const [secondaryLabel, setSecondaryLabel] = useState(data.cta_secondary_label ?? "Contact Sales");
  const [secondaryLink, setSecondaryLink] = useState(data.cta_secondary_link ?? "/contact");

  const save = () =>
    onSave({
      title,
      description: desc,
      content: JSON.stringify({
        body,
        cta_primary_label: primaryLabel,
        cta_primary_link: primaryLink,
        cta_secondary_label: secondaryLabel,
        cta_secondary_link: secondaryLink,
      }),
    });

  return (
    <div className="space-y-4">
      <Field label="Eyebrow" value={title} onChange={setTitle} />
      <Field label="Heading" value={desc} onChange={setDesc} />
      <Field label="Body text" value={body} onChange={setBody} rows={3} />
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Primary CTA label" value={primaryLabel} onChange={setPrimaryLabel} />
        <Field label="Primary CTA link" value={primaryLink} onChange={setPrimaryLink} />
        <Field label="Secondary CTA label" value={secondaryLabel} onChange={setSecondaryLabel} />
        <Field label="Secondary CTA link" value={secondaryLink} onChange={setSecondaryLink} />
      </div>
      <button
        type="button"
        onClick={save}
        disabled={loading}
        className="btn-accent px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2 disabled:opacity-50"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        <Save className="h-4 w-4" /> Save
      </button>
    </div>
  );
}
