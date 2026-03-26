// ============================================================
// REPORT TYPES — shared across all report templates
// ============================================================

export type ReportType = 'quote' | 'invoice' | 'delivery_slip';
export type ReportLang = 'fr' | 'en';
export type TaxMethod = 'GST_QST' | 'HST' | 'GST_PST' | 'GST_ONLY' | 'none';

export interface TaxBreakdown {
  gst?: number;   // 5%
  qst?: number;   // 9.975% (Quebec)
  hst?: number;   // 13–15% depending on province
  pst?: number;   // 6–8% depending on province
}

export interface ReportItem {
  description: string;
  sku?: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  notes?: string;
}

export interface ReportCompany {
  name: string;
  address: string;
  city?: string;
  phone?: string;
  email?: string;
  gst_number?: string;
  qst_number?: string;
  hst_number?: string;
  logo_url?: string;
}

export interface ReportCustomer {
  name: string;
  company?: string;
  address?: string;
  city?: string;
  phone?: string;
  email: string;
  tax_number?: string;
}

export interface ReportData {
  type: ReportType;
  lang: ReportLang;
  documentNumber: string;
  issueDate: string;
  validUntil?: string;
  dueDate?: string;
  company: ReportCompany;
  customer: ReportCustomer;
  items: ReportItem[];
  taxMethod: TaxMethod;
  subtotal: number;
  discount: number;
  shipping: number;
  taxBreakdown: TaxBreakdown;
  total: number;
  notes?: string;
  paymentTerms?: string;
}

// ============================================================
// TAX METHOD CONFIG
// ============================================================

export interface TaxMethodConfig {
  label: string;
  description: string;
  rates: { name: string; rate: number; key: keyof TaxBreakdown }[];
}

export const TAX_METHODS: Record<TaxMethod, TaxMethodConfig> = {
  GST_QST: {
    label: 'GST + QST (Québec)',
    description: 'Federal (GST 5%) + Quebec (QST 9.975%)',
    rates: [
      { name: 'TPS / GST', rate: 0.05, key: 'gst' },
      { name: 'TVQ / QST', rate: 0.09975, key: 'qst' },
    ],
  },
  HST: {
    label: 'HST (ON/NB/NS/NL/PEI)',
    description: 'Harmonized Sales Tax — 13% (Ontario) / 15% (Maritime provinces)',
    rates: [
      { name: 'TVH / HST (13%)', rate: 0.13, key: 'hst' },
    ],
  },
  GST_PST: {
    label: 'GST + PST (BC/SK/MB)',
    description: 'Federal (GST 5%) + Provincial (PST 7%)',
    rates: [
      { name: 'TPS / GST', rate: 0.05, key: 'gst' },
      { name: 'TVP / PST', rate: 0.07, key: 'pst' },
    ],
  },
  GST_ONLY: {
    label: 'GST Only (AB/YT/NT/NU)',
    description: 'Federal tax only — 5%',
    rates: [
      { name: 'TPS / GST', rate: 0.05, key: 'gst' },
    ],
  },
  none: {
    label: 'No Tax / Export',
    description: 'Tax-exempt or international',
    rates: [],
  },
};

export function computeTaxBreakdown(taxableAmount: number, method: TaxMethod): TaxBreakdown {
  const breakdown: TaxBreakdown = {};
  const config = TAX_METHODS[method];
  for (const r of config.rates) {
    breakdown[r.key] = Math.round(taxableAmount * r.rate * 100) / 100;
  }
  return breakdown;
}

export function totalTax(breakdown: TaxBreakdown): number {
  return Object.values(breakdown).reduce((s: number, v) => s + (v ?? 0), 0);
}

// ============================================================
// TRANSLATIONS
// ============================================================

export type TranslationKey =
  | 'quote' | 'invoice' | 'delivery_slip'
  | 'quote_to' | 'invoice_to' | 'deliver_to'
  | 'date' | 'valid_until' | 'due_date' | 'doc_number'
  | 'bill_from' | 'bill_to' | 'ship_to'
  | 'item' | 'sku' | 'qty' | 'unit_price' | 'total'
  | 'subtotal' | 'discount' | 'shipping' | 'tax' | 'grand_total'
  | 'notes' | 'payment_terms' | 'thank_you' | 'page'
  | 'prepared_by' | 'signature' | 'approved_by' | 'received_by'
  | 'items_ordered' | 'no_prices_shown' | 'confidential'
  | 'tax_reg_number' | 'gst_number' | 'qst_number'
  | 'validity' | 'contact' | 'phone' | 'email' | 'address';

export const translations: Record<ReportLang, Record<TranslationKey, string>> = {
  en: {
    quote: 'QUOTE',
    invoice: 'INVOICE',
    delivery_slip: 'DELIVERY SLIP',
    quote_to: 'Quote to',
    invoice_to: 'Invoice to',
    deliver_to: 'Deliver to',
    date: 'Date',
    valid_until: 'Valid Until',
    due_date: 'Due Date',
    doc_number: 'Document #',
    bill_from: 'From',
    bill_to: 'Bill To',
    ship_to: 'Ship To',
    item: 'Item',
    sku: 'SKU',
    qty: 'Qty',
    unit_price: 'Unit Price',
    total: 'Total',
    subtotal: 'Subtotal',
    discount: 'Discount',
    shipping: 'Shipping',
    tax: 'Tax',
    grand_total: 'TOTAL',
    notes: 'Notes & Terms',
    payment_terms: 'Payment Terms',
    thank_you: 'Thank you for your business!',
    page: 'Page',
    prepared_by: 'Prepared by',
    signature: 'Authorized Signature',
    approved_by: 'Approved by',
    received_by: 'Received by',
    items_ordered: 'Items Ordered',
    no_prices_shown: 'Prices not shown on delivery slip',
    confidential: 'CONFIDENTIAL',
    tax_reg_number: 'Tax Registration No.',
    gst_number: 'GST/HST #',
    qst_number: 'QST #',
    validity: 'This quote is valid for 30 days from the issue date.',
    contact: 'Contact',
    phone: 'Phone',
    email: 'Email',
    address: 'Address',
  },
  fr: {
    quote: 'DEVIS',
    invoice: 'FACTURE',
    delivery_slip: 'BON DE LIVRAISON',
    quote_to: 'Devis à',
    invoice_to: 'Facturé à',
    deliver_to: 'Livrer à',
    date: 'Date',
    valid_until: "Valide jusqu'au",
    due_date: "Date d'échéance",
    doc_number: 'Numéro',
    bill_from: 'De',
    bill_to: 'Facturer à',
    ship_to: 'Livrer à',
    item: 'Article',
    sku: 'Référence',
    qty: 'Qté',
    unit_price: 'Prix unitaire',
    total: 'Total',
    subtotal: 'Sous-total',
    discount: 'Remise',
    shipping: 'Transport',
    tax: 'Taxes',
    grand_total: 'TOTAL',
    notes: 'Notes et conditions',
    payment_terms: 'Modalités de paiement',
    thank_you: 'Merci pour votre confiance !',
    page: 'Page',
    prepared_by: 'Préparé par',
    signature: 'Signature autorisée',
    approved_by: 'Approuvé par',
    received_by: 'Reçu par',
    items_ordered: 'Articles commandés',
    no_prices_shown: 'Les prix ne figurent pas sur le bon de livraison',
    confidential: 'CONFIDENTIEL',
    tax_reg_number: 'N° enregistrement fiscal',
    gst_number: 'TPS/TVH #',
    qst_number: 'TVQ #',
    validity: 'Ce devis est valable 30 jours à compter de la date d\'émission.',
    contact: 'Contact',
    phone: 'Téléphone',
    email: 'Courriel',
    address: 'Adresse',
  },
};

export function t(lang: ReportLang, key: TranslationKey): string {
  return translations[lang][key] ?? key;
}

export function fmtDate(dateStr: string, lang: ReportLang): string {
  try {
    return new Date(dateStr).toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function fmtCurrency(amount: number, lang: ReportLang): string {
  return new Intl.NumberFormat(lang === 'fr' ? 'fr-CA' : 'en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
  }).format(amount);
}
