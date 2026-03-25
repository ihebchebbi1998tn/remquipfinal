import React, { useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import SignatureCanvas from "react-signature-canvas";
import { api } from "@/lib/api";
import {
  Building2, User, Phone, Mail, MapPin, CreditCard, FileText, PenTool,
  ChevronRight, ChevronLeft, Check, Loader2, Truck, AlertCircle, Copy
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface FormData {
  company_name: string;
  neq_tva: string;
  contact_person: string;
  contact_title: string;
  phone: string;
  email: string;
  distributor_type: string[];
  distributor_type_other: string;
  num_trucks: string;
  num_trailers: string;
  billing_address: string;
  shipping_address: string;
  accounting_contact: string;
  accounting_phone: string;
  billing_email: string;
  payment_terms: string;
  payment_method: string;
  bank_reference: string;
  credit_limit_requested: string;
  supplier_ref_1: string;
  supplier_ref_2: string;
  parts_needed: string;
  special_requests: string;
  sales_representative: string;
  signatory_name: string;
  signatory_title: string;
  signature_date: string;
}

const INITIAL_FORM: FormData = {
  company_name: "", neq_tva: "", contact_person: "", contact_title: "",
  phone: "", email: "", distributor_type: [], distributor_type_other: "",
  num_trucks: "", num_trailers: "", billing_address: "", shipping_address: "",
  accounting_contact: "", accounting_phone: "", billing_email: "",
  payment_terms: "", payment_method: "", bank_reference: "",
  credit_limit_requested: "", supplier_ref_1: "", supplier_ref_2: "",
  parts_needed: "", special_requests: "", sales_representative: "",
  signatory_name: "", signatory_title: "",
  signature_date: new Date().toISOString().slice(0, 10),
};

const STEPS = [
  { label: "Company", icon: Building2 },
  { label: "Addresses", icon: MapPin },
  { label: "Payment", icon: CreditCard },
  { label: "Credit", icon: FileText },
  { label: "Products", icon: Truck },
  { label: "Signature", icon: PenTool },
];

const DISTRIBUTOR_OPTIONS = [
  { value: "reseller", label: "Revendeur / Reseller" },
  { value: "logistics", label: "Logistique / Logistics Co." },
  { value: "garage", label: "Garage / Repair Shop" },
  { value: "other", label: "Autre / Other" },
];

const PAYMENT_TERMS_OPTIONS = [
  { value: "on_delivery", label: "Paiement à la livraison / On Delivery" },
  { value: "net_15", label: "Net 15 jours / Net 15 Days" },
  { value: "net_30", label: "Net 30 jours / Net 30 Days" },
  { value: "on_order", label: "Paiement à la commande / On Order" },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: "transfer", label: "Virement / Transfer" },
  { value: "cheque", label: "Chèque / Cheque" },
  { value: "credit_card", label: "Carte de crédit / Credit Card" },
  { value: "other", label: "Autre / Other" },
];

/* ------------------------------------------------------------------ */
/*  Shared Input Components                                            */
/* ------------------------------------------------------------------ */
function FormField({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-300">
        {label} {required && <span className="text-orange-500">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass = "w-full px-4 py-3 bg-[#1a222c] border border-[#2a3441] rounded-lg text-slate-100 placeholder-slate-500 outline-none focus:border-[#e85d04] focus:ring-1 focus:ring-[#e85d04]/40 transition-all duration-200";
const textareaClass = inputClass + " resize-none";

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-lg bg-[#e85d04]/10 border border-[#e85d04]/20 flex items-center justify-center">
        <Icon className="h-5 w-5 text-[#e85d04]" />
      </div>
      <h3 className="text-lg font-bold text-slate-100">{title}</h3>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export default function CustomerApplicationPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const sigRef = useRef<SignatureCanvas | null>(null);

  const set = useCallback((field: keyof FormData, value: string | string[]) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => { const next = { ...prev }; delete next[field]; return next; });
  }, []);

  /* Validation per step */
  const validateStep = (s: number): Record<string, string> => {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (!form.company_name.trim()) e.company_name = "Required";
      if (!form.contact_person.trim()) e.contact_person = "Required";
      if (!form.email.trim()) e.email = "Required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
    }
    if (s === 5) {
      if (!form.signatory_name.trim()) e.signatory_name = "Required";
      if (!signatureData) e.signature = "Please sign the form";
    }
    return e;
  };

  const goNext = () => {
    const errs = validateStep(step);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setStep(Math.min(step + 1, STEPS.length - 1));
  };
  const goBack = () => setStep(Math.max(step - 1, 0));

  const handleSubmit = async () => {
    const errs = validateStep(step);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = { ...form };
      payload.signature_data = signatureData;
      if (form.num_trucks) payload.num_trucks = parseInt(form.num_trucks, 10);
      if (form.num_trailers) payload.num_trailers = parseInt(form.num_trailers, 10);
      if (form.credit_limit_requested) payload.credit_limit_requested = parseFloat(form.credit_limit_requested);
      const res = await api.submitAccountApplication(payload as any);
      setSubmittedId(res.data?.id ?? null);
      setSubmitted(true);
    } catch (err: any) {
      setErrors({ _submit: err?.userMessage || err?.message || "Submission failed. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Success screen ── */
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center p-4">
        <div className="max-w-lg text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center">
            <Check className="h-10 w-10 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-slate-100">Application Submitted!</h1>
          <p className="text-slate-400 text-lg">
            Thank you for your application. Our team will review your information and get back to you shortly.
            A confirmation email has been sent to <strong className="text-slate-200">{form.email}</strong>.
          </p>
          {submittedId && (
            <p className="text-sm text-slate-500">Reference: <code className="text-[#e85d04]">{submittedId.slice(0, 8)}</code></p>
          )}
          <Link to="/" className="inline-block mt-4 px-8 py-3 bg-[#e85d04] text-[#0f1419] font-bold rounded-lg hover:bg-[#f97316] transition-colors">
            Return to REMQUIP
          </Link>
        </div>
      </div>
    );
  }

  /* ── Form steps ── */
  return (
    <div className="min-h-screen bg-[#0f1419]">
      {/* Header */}
      <header className="border-b border-[#2a3441] bg-[#141a22]">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <Link to="/" className="text-2xl font-black tracking-wider text-slate-100 hover:text-[#e85d04] transition-colors">REMQUIP</Link>
            <p className="text-xs text-slate-500 mt-1">Pièces de remorques & camions | Trailer & Truck Parts</p>
          </div>
          <div className="text-right">
            <h1 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Formulaire d'ouverture de compte client</h1>
            <p className="text-xs text-slate-500">Customer Account Application Form</p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Step indicators */}
        <div className="flex items-center justify-center gap-1 mb-10">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isDone = i < step;
            return (
              <React.Fragment key={i}>
                <button
                  type="button"
                  onClick={() => { if (isDone) setStep(i); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                    isActive ? "bg-[#e85d04]/10 border border-[#e85d04] text-[#e85d04]"
                    : isDone ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 cursor-pointer hover:bg-emerald-500/20"
                    : "bg-[#1a222c] border border-[#2a3441] text-slate-500"
                  }`}
                >
                  {isDone ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`w-6 h-0.5 ${isDone ? "bg-emerald-500/40" : "bg-[#2a3441]"}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Form card */}
        <div className="bg-[#141a22] border border-[#2a3441] rounded-xl p-6 sm:p-8 space-y-6">

          {/* Step 0: Company Information */}
          {step === 0 && (
            <>
              <SectionTitle icon={Building2} title="1. Informations de l'entreprise / Company Information" />
              <div className="grid sm:grid-cols-2 gap-5">
                <FormField label="Raison sociale / Company Name" required>
                  <input className={inputClass} value={form.company_name} onChange={e => set("company_name", e.target.value)} placeholder="Company Name" />
                  {errors.company_name && <p className="text-xs text-red-400 mt-1">{errors.company_name}</p>}
                </FormField>
                <FormField label="No d'entreprise / NEQ / TVA">
                  <input className={inputClass} value={form.neq_tva} onChange={e => set("neq_tva", e.target.value)} placeholder="NEQ / TVA" />
                </FormField>
                <FormField label="Personne contact / Contact Person" required>
                  <input className={inputClass} value={form.contact_person} onChange={e => set("contact_person", e.target.value)} placeholder="Full Name" />
                  {errors.contact_person && <p className="text-xs text-red-400 mt-1">{errors.contact_person}</p>}
                </FormField>
                <FormField label="Titre / Fonction / Title">
                  <input className={inputClass} value={form.contact_title} onChange={e => set("contact_title", e.target.value)} placeholder="Title / Position" />
                </FormField>
                <FormField label="Téléphone / Phone">
                  <input className={inputClass} type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+1 (xxx) xxx-xxxx" />
                </FormField>
                <FormField label="Courriel / Email" required>
                  <input className={inputClass} type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="email@company.com" />
                  {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
                </FormField>
              </div>

              <FormField label="Type de distributeur / Distributor Type">
                <div className="flex flex-wrap gap-3 mt-1">
                  {DISTRIBUTOR_OPTIONS.map(opt => (
                    <label key={opt.value} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-all text-sm ${
                      form.distributor_type.includes(opt.value)
                        ? "border-[#e85d04] bg-[#e85d04]/10 text-[#e85d04]"
                        : "border-[#2a3441] bg-[#1a222c] text-slate-400 hover:border-slate-500"
                    }`}>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={form.distributor_type.includes(opt.value)}
                        onChange={() => {
                          const arr = form.distributor_type.includes(opt.value)
                            ? form.distributor_type.filter(v => v !== opt.value)
                            : [...form.distributor_type, opt.value];
                          set("distributor_type", arr);
                        }}
                      />
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                        form.distributor_type.includes(opt.value) ? "border-[#e85d04] bg-[#e85d04]" : "border-slate-600"
                      }`}>
                        {form.distributor_type.includes(opt.value) && <Check className="h-3 w-3 text-white" />}
                      </div>
                      {opt.label}
                    </label>
                  ))}
                </div>
              </FormField>

              {form.distributor_type.includes("other") && (
                <FormField label="Préciser / Specify">
                  <input className={inputClass} value={form.distributor_type_other} onChange={e => set("distributor_type_other", e.target.value)} placeholder="Please specify..." />
                </FormField>
              )}

              <div className="grid sm:grid-cols-2 gap-5">
                <FormField label="Nombre de camions / Number of Trucks">
                  <input className={inputClass} type="number" min="0" value={form.num_trucks} onChange={e => set("num_trucks", e.target.value)} placeholder="0" />
                </FormField>
                <FormField label="Nombre de remorques / Number of Trailers">
                  <input className={inputClass} type="number" min="0" value={form.num_trailers} onChange={e => set("num_trailers", e.target.value)} placeholder="0" />
                </FormField>
              </div>
            </>
          )}

          {/* Step 1: Addresses */}
          {step === 1 && (
            <>
              <SectionTitle icon={MapPin} title="2. Adresses / Addresses" />
              <FormField label="Adresse de facturation / Billing Address">
                <textarea className={textareaClass} rows={3} value={form.billing_address} onChange={e => set("billing_address", e.target.value)} placeholder="Full billing address..." />
              </FormField>
              <FormField label="Adresse de livraison / Shipping Address">
                <textarea className={textareaClass} rows={3} value={form.shipping_address} onChange={e => set("shipping_address", e.target.value)} placeholder="Full shipping address (leave empty if same as billing)..." />
              </FormField>
              <button type="button" className="text-sm text-[#e85d04] hover:underline"
                onClick={() => set("shipping_address", form.billing_address)}>
                ↳ Same as billing address
              </button>
            </>
          )}

          {/* Step 2: Accounting & Payment */}
          {step === 2 && (
            <>
              <SectionTitle icon={CreditCard} title="3. Comptabilité et paiement / Accounting & Payment" />
              <div className="grid sm:grid-cols-2 gap-5">
                <FormField label="Contact comptabilité / Accounting Contact">
                  <input className={inputClass} value={form.accounting_contact} onChange={e => set("accounting_contact", e.target.value)} placeholder="Name" />
                </FormField>
                <FormField label="Téléphone / Accounting Phone">
                  <input className={inputClass} type="tel" value={form.accounting_phone} onChange={e => set("accounting_phone", e.target.value)} placeholder="+1 (xxx) xxx-xxxx" />
                </FormField>
              </div>
              <FormField label="Courriel de facturation / Billing Email">
                <input className={inputClass} type="email" value={form.billing_email} onChange={e => set("billing_email", e.target.value)} placeholder="accounting@company.com" />
              </FormField>

              <FormField label="Conditions de paiement / Payment Terms">
                <div className="grid sm:grid-cols-2 gap-3 mt-1">
                  {PAYMENT_TERMS_OPTIONS.map(opt => (
                    <label key={opt.value} className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all text-sm ${
                      form.payment_terms === opt.value ? "border-[#e85d04] bg-[#e85d04]/10 text-[#e85d04]" : "border-[#2a3441] bg-[#1a222c] text-slate-400 hover:border-slate-500"
                    }`}>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${form.payment_terms === opt.value ? "border-[#e85d04]" : "border-slate-600"}`}>
                        {form.payment_terms === opt.value && <div className="w-2 h-2 rounded-full bg-[#e85d04]" />}
                      </div>
                      <input type="radio" className="hidden" name="payment_terms" value={opt.value} checked={form.payment_terms === opt.value}
                        onChange={e => set("payment_terms", e.target.value)} />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </FormField>

              <FormField label="Mode de paiement préféré / Payment Method">
                <div className="grid sm:grid-cols-2 gap-3 mt-1">
                  {PAYMENT_METHOD_OPTIONS.map(opt => (
                    <label key={opt.value} className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all text-sm ${
                      form.payment_method === opt.value ? "border-[#e85d04] bg-[#e85d04]/10 text-[#e85d04]" : "border-[#2a3441] bg-[#1a222c] text-slate-400 hover:border-slate-500"
                    }`}>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${form.payment_method === opt.value ? "border-[#e85d04]" : "border-slate-600"}`}>
                        {form.payment_method === opt.value && <div className="w-2 h-2 rounded-full bg-[#e85d04]" />}
                      </div>
                      <input type="radio" className="hidden" name="payment_method" value={opt.value} checked={form.payment_method === opt.value}
                        onChange={e => set("payment_method", e.target.value)} />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </FormField>
            </>
          )}

          {/* Step 3: Credit References */}
          {step === 3 && (
            <>
              <SectionTitle icon={FileText} title="4. Références de crédit / Credit References" />
              <div className="grid sm:grid-cols-2 gap-5">
                <FormField label="Référence bancaire / Bank Reference">
                  <input className={inputClass} value={form.bank_reference} onChange={e => set("bank_reference", e.target.value)} placeholder="Bank name & account details" />
                </FormField>
                <FormField label="Limite de crédit demandée / Credit Limit Requested">
                  <input className={inputClass} type="number" min="0" step="0.01" value={form.credit_limit_requested} onChange={e => set("credit_limit_requested", e.target.value)} placeholder="$0.00" />
                </FormField>
              </div>
              <FormField label="Référence fournisseur 1 / Supplier Reference 1">
                <textarea className={textareaClass} rows={2} value={form.supplier_ref_1} onChange={e => set("supplier_ref_1", e.target.value)} placeholder="Supplier name, contact, phone..." />
              </FormField>
              <FormField label="Référence fournisseur 2 / Supplier Reference 2">
                <textarea className={textareaClass} rows={2} value={form.supplier_ref_2} onChange={e => set("supplier_ref_2", e.target.value)} placeholder="Supplier name, contact, phone..." />
              </FormField>
            </>
          )}

          {/* Step 4: Products & Needs */}
          {step === 4 && (
            <>
              <SectionTitle icon={Truck} title="5. Besoins / Products & Needs" />
              <FormField label="Types de pièces recherchées / Types of Parts Needed">
                <textarea className={textareaClass} rows={3} value={form.parts_needed} onChange={e => set("parts_needed", e.target.value)}
                  placeholder="Brakes, suspension, axles, lighting, body parts..." />
              </FormField>
              <FormField label="Demandes particulières / Special Requests">
                <textarea className={textareaClass} rows={3} value={form.special_requests} onChange={e => set("special_requests", e.target.value)}
                  placeholder="Any specific requirements or notes..." />
              </FormField>
              <FormField label="Représentant / Sales Representative">
                <input className={inputClass} value={form.sales_representative} onChange={e => set("sales_representative", e.target.value)}
                  placeholder="If you were referred by a specific sales rep..." />
              </FormField>
            </>
          )}

          {/* Step 5: Validation / Signature */}
          {step === 5 && (
            <>
              <SectionTitle icon={PenTool} title="6. Validation / Authorization" />

              {/* Review Summary */}
              <div className="bg-[#1a222c] border border-[#2a3441] rounded-lg p-5 mb-6 space-y-3">
                <h4 className="font-bold text-sm text-slate-300 uppercase tracking-wider mb-3">Application Summary</h4>
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div><span className="text-slate-500">Company:</span> <span className="text-slate-200">{form.company_name}</span></div>
                  <div><span className="text-slate-500">NEQ/TVA:</span> <span className="text-slate-200">{form.neq_tva || "—"}</span></div>
                  <div><span className="text-slate-500">Contact:</span> <span className="text-slate-200">{form.contact_person}</span></div>
                  <div><span className="text-slate-500">Email:</span> <span className="text-slate-200">{form.email}</span></div>
                  <div><span className="text-slate-500">Phone:</span> <span className="text-slate-200">{form.phone || "—"}</span></div>
                  <div><span className="text-slate-500">Payment:</span> <span className="text-slate-200">{form.payment_terms || "—"}</span></div>
                  <div><span className="text-slate-500">Credit Limit:</span> <span className="text-slate-200">{form.credit_limit_requested ? `$${form.credit_limit_requested}` : "—"}</span></div>
                  <div><span className="text-slate-500">Trucks/Trailers:</span> <span className="text-slate-200">{form.num_trucks || 0} / {form.num_trailers || 0}</span></div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <FormField label="Nom du signataire / Signatory Name" required>
                  <input className={inputClass} value={form.signatory_name} onChange={e => set("signatory_name", e.target.value)} placeholder="Full name of signatory" />
                  {errors.signatory_name && <p className="text-xs text-red-400 mt-1">{errors.signatory_name}</p>}
                </FormField>
                <FormField label="Titre / Fonction / Title">
                  <input className={inputClass} value={form.signatory_title} onChange={e => set("signatory_title", e.target.value)} placeholder="Title / Position" />
                </FormField>
              </div>

              <FormField label="Date">
                <input className={inputClass} type="date" value={form.signature_date} onChange={e => set("signature_date", e.target.value)} />
              </FormField>

              <FormField label="Signature" required>
                <div className="border border-[#2a3441] rounded-lg overflow-hidden bg-white">
                  <SignatureCanvas
                    ref={sigRef}
                    penColor="#0f1419"
                    canvasProps={{ className: "w-full", style: { height: 160, width: "100%" } }}
                    onEnd={() => {
                      if (sigRef.current) setSignatureData(sigRef.current.toDataURL("image/png"));
                    }}
                  />
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <button type="button" className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                    onClick={() => { sigRef.current?.clear(); setSignatureData(null); }}>
                    Clear Signature
                  </button>
                  {errors.signature && <p className="text-xs text-red-400">{errors.signature}</p>}
                </div>
              </FormField>
            </>
          )}

          {/* Error message */}
          {errors._submit && (
            <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {errors._submit}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-[#2a3441]">
            <button type="button" onClick={goBack} disabled={step === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border border-[#2a3441] text-slate-300 hover:bg-[#1a222c] transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>

            <span className="text-xs text-slate-500">Step {step + 1} of {STEPS.length}</span>

            {step < STEPS.length - 1 ? (
              <button type="button" onClick={goNext}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold bg-[#e85d04] text-[#0f1419] hover:bg-[#f97316] transition-colors">
                Next <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors disabled:opacity-50">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {submitting ? "Submitting..." : "Submit Application"}
              </button>
            )}
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-slate-600 mt-8">
          Merci de nous retourner ce formulaire complété / Please complete this application form
          <br />© 2025 REMQUIP — Pièces de remorques & camions | Trailer & Truck Parts
        </p>
      </div>
    </div>
  );
}
