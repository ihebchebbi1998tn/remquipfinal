import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { CreditCard, Building, Landmark, Loader2, ChevronRight, MapPin, ShieldCheck, ArrowLeft, PackageCheck } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useCart } from "@/contexts/CartContext";
import { useCreateOrder, useCreateStripeSession } from "@/hooks/useApi";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { loadStripe } from "@stripe/stripe-js";

// Initialize Stripe with the publishable key from your settings
const stripePromise = loadStripe('pk_test_51TEVPS2Rz0p3EiIyZbOjZ3dUdtoQUt0adBMXcntWYZzcG0A7vGdGE5KNCxOoH3oquGN1ClqUTltPMmCAY0e4InWn00eVZeWtdK');

export default function CheckoutPage() {
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();
  const { items, subtotal, tax, shipping, total, clearCart } = useCart();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form data state to collect across steps
  const [billingData, setBillingData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    taxId: "",
    address: "",
    city: "",
    province: "",
    postal: "",
    country: "",
  });
  
  const [shippingData, setShippingData] = useState({
    company: "",
    address: "",
    city: "",
    province: "",
    postal: "",
    country: "",
  });
  
  const [paymentMethod, setPaymentMethod] = useState("stripe");
  
  const createOrderMutation = useCreateOrder();
  const createStripeSessionMutation = useCreateStripeSession();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (items.length === 0) {
      navigate("/cart");
    }
  }, [items.length, navigate]);

  const handlePlaceOrder = async () => {
    setIsSubmitting(true);
    
    try {
      const orderData = {
        customer_email: billingData.email,
        billing_address: {
          first_name: billingData.firstName,
          last_name: billingData.lastName,
          company: billingData.company,
          phone: billingData.phone,
          address_line1: billingData.address,
          city: billingData.city,
          state: billingData.province,
          postal_code: billingData.postal,
          country: billingData.country,
        },
        shipping_address: {
          company: shippingData.company || billingData.company,
          address_line1: shippingData.address || billingData.address,
          city: shippingData.city || billingData.city,
          state: shippingData.province || billingData.province,
          postal_code: shippingData.postal || billingData.postal,
          country: shippingData.country || billingData.country,
        },
        items: items.map(({ product, quantity }) => ({
          product_id: product.id,
          product_name: product.name,
          quantity,
          unit_price: product.price,
          subtotal: product.price * quantity,
        })),
        subtotal,
        tax_amount: tax,
        shipping_amount: shipping,
        total_amount: total,
        payment_method: paymentMethod,
        status: "pending" as const,
        payment_status: "pending" as const,
        notes: billingData.taxId ? `Tax ID: ${billingData.taxId}` : undefined,
      };

      // 1. Create order in the backend (status=pending)
      const newOrder = await createOrderMutation.mutateAsync(orderData);
      const orderId = newOrder?.id || newOrder?.data?.id;

      if (!orderId) {
        throw new Error("Order ID not returned");
      }
      
      // 2. If payment method is Stripe, create a checkout session
      if (paymentMethod === "stripe") {
        toast({
          title: "Order Processed",
          description: "Redirecting to secure payment gateway...",
        });

        const sessionResponse = await createStripeSessionMutation.mutateAsync(orderId);
        const { sessionId } = sessionResponse.data || sessionResponse;
        
        if (sessionId) {
          const stripe = await stripePromise;
          if (stripe) {
            const { error } = await stripe.redirectToCheckout({ sessionId });
            if (error) {
              console.error("Stripe routing error:", error);
              throw new Error(error.message);
            }
          }
        }
        return; // Early return to let redirect happen (keep cart intact)
      }

      // 3. For other payment methods (like invoice/transfer), clear cart and show confirmation
      toast({
        title: "Order Processed",
        description: "Your equipment logistics are being finalized.",
      });
      
      clearCart();
      navigate("/order-confirmed");
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Logistics Error",
        description: error instanceof Error ? error.message : "Failed to initialize order sequence. Please retry.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleBillingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };
  
  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(3);
  };

  if (items.length === 0) return null;

  const InputField = ({ label, name, type = "text", required = true, value, onChange, onBlur, placeholder }: { label: string; name: string; type?: string; required?: boolean; value: string; onChange: (v: string) => void; onBlur?: () => void; placeholder?: string }) => (
    <div className="group relative">
      <label className="absolute -top-3 left-3 bg-background px-2 text-[10px] font-display font-black uppercase tracking-widest text-muted-foreground group-focus-within:text-accent transition-colors z-10">
        {label}
      </label>
      <input 
        type={type} 
        name={name} 
        required={required} 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className="w-full bg-transparent border-2 border-border/60 hover:border-border rounded-xl px-4 py-4 text-sm font-medium text-foreground outline-none focus:border-accent transition-all shadow-sm"
      />
    </div>
  );

  const handleEmailBlur = async () => {
    if (billingData.email && billingData.email.includes('@')) {
      try {
        await api.saveCart({
          email: billingData.email,
          cart_data: { items, subtotal, tax, shipping, total }
        });
      } catch (error) {
        console.error('Failed to track cart:', error);
      }
    }
  };

  const steps = [
    { id: 1, name: t("checkout.billing") },
    { id: 2, name: t("checkout.shipping") },
    { id: 3, name: t("checkout.payment") },
    { id: 4, name: t("checkout.review") },
  ];

  return (
    <div className="bg-background min-h-screen text-foreground font-sans lowercase-buttons">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-20 lg:py-24">
        
        {/* Modern Minimal Header */}
        <header className="mb-12 md:mb-20 flex flex-col md:flex-row md:items-end md:justify-between gap-8 border-b border-border pb-12">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px w-6 bg-accent/60" />
              <span className="font-display font-black uppercase tracking-[0.3em] text-[10px] text-accent"> Secure Procurement Pipeline </span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-tighter leading-none">
              {t("checkout.title")}
            </h1>
          </div>
          
          {/* Progress Indicator */}
          <nav className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            {steps.map((s, i) => (
              <React.Fragment key={s.id}>
                <div 
                  className={`flex items-center gap-2 shrink-0 transition-opacity ${step >= s.id ? "opacity-100" : "opacity-30"}`}
                >
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-display font-black text-xs border-2 ${step >= s.id ? "border-accent bg-accent text-white shadow-[0_0_15px_rgba(var(--accent-rgb),0.3)]" : "border-border text-muted-foreground"}`}>
                    {s.id}
                  </span>
                  <span className="text-[10px] font-display font-black uppercase tracking-widest hidden sm:block">{s.name}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`h-[2px] w-6 bg-border mx-2 shrink-0 ${step > s.id ? "bg-accent" : "bg-border transition-colors duration-500"}`} />
                )}
              </React.Fragment>
            ))}
          </nav>
        </header>

        <div className="grid lg:grid-cols-12 gap-12 lg:gap-20 items-start">
          
          {/* Main Form Area */}
          <div className="lg:col-span-8">
            <div className="bg-card/30 backdrop-blur-sm border border-border/80 rounded-[2.5rem] p-8 sm:p-12 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-[100px] rounded-full pointer-events-none" />
              
              {/* Step 1: Billing */}
              {step === 1 && (
                <form onSubmit={handleBillingSubmit} className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="space-y-8">
                    <h2 className="font-display font-black text-2xl uppercase tracking-tight flex items-center gap-4">
                        <span className="text-accent">01.</span> {t("checkout.billing")}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      <InputField label={t("checkout.first_name")} name="firstName" value={billingData.firstName} onChange={(v) => setBillingData({...billingData, firstName: v})} placeholder="John" />
                      <InputField label={t("checkout.last_name")} name="lastName" value={billingData.lastName} onChange={(v) => setBillingData({...billingData, lastName: v})} placeholder="Doe" />
                      <InputField label={t("checkout.email")} name="email" type="email" value={billingData.email} onChange={(v) => setBillingData({...billingData, email: v})} onBlur={handleEmailBlur} placeholder="procurement@corp.com" />
                      <InputField label={t("checkout.phone")} name="phone" value={billingData.phone} onChange={(v) => setBillingData({...billingData, phone: v})} placeholder="+1 555-0100" />
                      <div className="sm:col-span-2">
                        <InputField label={t("checkout.company")} name="company" required={false} value={billingData.company} onChange={(v) => setBillingData({...billingData, company: v})} placeholder="Enterprise Logistics Inc" />
                      </div>
                      <div className="sm:col-span-2">
                         <InputField label={t("checkout.tax_id")} name="taxId" required={false} value={billingData.taxId} onChange={(v) => setBillingData({...billingData, taxId: v})} placeholder="VAT/Tax ID (Optional)" />
                      </div>
                      <div className="sm:col-span-2">
                        <InputField label={t("checkout.address")} name="address" value={billingData.address} onChange={(v) => setBillingData({...billingData, address: v})} placeholder="123 Industrial Dr" />
                      </div>
                      <InputField label={t("checkout.city")} name="city" value={billingData.city} onChange={(v) => setBillingData({...billingData, city: v})} placeholder="Montreal" />
                      <InputField label={t("checkout.province")} name="province" value={billingData.province} onChange={(v) => setBillingData({...billingData, province: v})} placeholder="Quebec" />
                      <InputField label={t("checkout.postal")} name="postal" value={billingData.postal} onChange={(v) => setBillingData({...billingData, postal: v})} placeholder="H3B 4W5" />
                      <InputField label={t("checkout.country")} name="country" value={billingData.country} onChange={(v) => setBillingData({...billingData, country: v})} placeholder="Canada" />
                    </div>
                  </div>
                  <button type="submit" className="group bg-foreground text-background px-10 py-5 rounded-2xl font-display font-black uppercase tracking-[0.2em] text-[11px] hover:bg-accent hover:shadow-2xl transition-all flex items-center justify-between w-full sm:w-auto ml-auto">
                    <span>{t("checkout.continue")}</span>
                    <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform ml-4" strokeWidth={3} />
                  </button>
                </form>
              )}

              {/* Step 2: Shipping */}
              {step === 2 && (
                <form onSubmit={handleShippingSubmit} className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="space-y-8">
                    <h2 className="font-display font-black text-2xl uppercase tracking-tight flex items-center gap-4">
                        <span className="text-accent">02.</span> {t("checkout.shipping")}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      <div className="sm:col-span-2">
                        <InputField label={t("checkout.company")} name="shipCompany" required={false} value={shippingData.company} onChange={(v) => setShippingData({...shippingData, company: v})} placeholder="Recipient Company" />
                      </div>
                      <div className="sm:col-span-2">
                        <InputField label={t("checkout.address")} name="shipAddress" value={shippingData.address} onChange={(v) => setShippingData({...shippingData, address: v})} placeholder="Delivery Address" />
                      </div>
                      <InputField label={t("checkout.city")} name="shipCity" value={shippingData.city} onChange={(v) => setShippingData({...shippingData, city: v})} placeholder="City" />
                      <InputField label={t("checkout.province")} name="shipProvince" value={shippingData.province} onChange={(v) => setShippingData({...shippingData, province: v})} placeholder="Province" />
                      <InputField label={t("checkout.postal")} name="shipPostal" value={shippingData.postal} onChange={(v) => setShippingData({...shippingData, postal: v})} placeholder="Postal Code" />
                      <InputField label={t("checkout.country")} name="shipCountry" value={shippingData.country} onChange={(v) => setShippingData({...shippingData, country: v})} placeholder="Country" />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6">
                    <button type="button" onClick={() => setStep(1)} className="group flex items-center gap-3 text-xs font-display font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
                      <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> {t("checkout.back")}
                    </button>
                    <button type="submit" className="group bg-foreground text-background px-10 py-5 rounded-2xl font-display font-black uppercase tracking-[0.2em] text-[11px] hover:bg-accent hover:shadow-2xl transition-all flex items-center justify-between w-full sm:w-auto">
                      <span>{t("checkout.continue")}</span>
                      <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform ml-4" strokeWidth={3} />
                    </button>
                  </div>
                </form>
              )}

              {/* Step 3: Payment */}
              {step === 3 && (
                <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="space-y-8">
                    <h2 className="font-display font-black text-2xl uppercase tracking-tight flex items-center gap-4">
                        <span className="text-accent">03.</span> {t("checkout.payment")}
                    </h2>
                    <div className="space-y-4">
                      {[
                        { key: "checkout.payment_stripe", value: "stripe", icon: CreditCard, desc: "Instant clearance via secure gateway." },
                        { key: "checkout.payment_paypal", value: "paypal", icon: Building, desc: "Enterprise account settlement." },
                        { key: "checkout.payment_bank", value: "bank", icon: Landmark, desc: "Direct wire transfer protocols." },
                      ].map(({ key, value, icon: Icon, desc }) => (
                        <label 
                          key={key} 
                          className={`group flex items-center gap-6 border-2 rounded-2xl p-6 cursor-pointer transition-all ${paymentMethod === value ? "border-accent bg-accent/5 ring-4 ring-accent/10" : "border-border/60 hover:border-border hover:bg-white/5"}`}
                        >
                          <div className="relative flex items-center justify-center">
                            <input 
                              type="radio" 
                              name="payment" 
                              value={value}
                              checked={paymentMethod === value}
                              onChange={(e) => setPaymentMethod(e.target.value)}
                              className="sr-only" 
                            />
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${paymentMethod === value ? "border-accent bg-accent" : "border-border"}`}>
                                {paymentMethod === value && <div className="w-2 h-2 rounded-full bg-white shadow-lg" />}
                            </div>
                          </div>
                          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center border border-border group-hover:scale-110 transition-transform">
                            <Icon className={`h-6 w-6 ${paymentMethod === value ? "text-accent" : "text-muted-foreground"}`} />
                          </div>
                          <div className="flex-1">
                            <span className="block text-sm font-black uppercase tracking-tight">{t(key)}</span>
                            <p className="text-[10px] text-muted-foreground font-medium mt-1 uppercase tracking-tighter opacity-80">{desc}</p>
                          </div>
                          {value !== "stripe" && <span className="text-[9px] font-black text-white/40 bg-white/5 px-2 py-1 rounded uppercase tracking-[0.2em]">{t("checkout.payment_coming")}</span>}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6">
                    <button type="button" onClick={() => setStep(2)} className="group flex items-center gap-3 text-xs font-display font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
                      <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> {t("checkout.back")}
                    </button>
                    <button onClick={() => setStep(4)} className="group bg-foreground text-background px-10 py-5 rounded-2xl font-display font-black uppercase tracking-[0.2em] text-[11px] hover:bg-accent hover:shadow-2xl transition-all flex items-center justify-between w-full sm:w-auto">
                      <span>{t("checkout.continue")}</span>
                      <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform ml-4" strokeWidth={3} />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Final Review */}
              {step === 4 && (
                <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                        <h2 className="font-display font-black text-2xl uppercase tracking-tight flex items-center gap-4">
                            <span className="text-accent">04.</span> Final Authorization
                        </h2>
                        <ShieldCheck className="h-8 w-8 text-accent animate-pulse" />
                    </div>
                    
                    <div className="space-y-6">
                      <div className="bg-muted/40 rounded-3xl p-8 border border-border/60">
                         <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-6">Equipment Manifest</h4>
                         <div className="space-y-4">
                            {items.map(({ product, quantity }) => (
                                <div key={product.id} className="flex justify-between items-end border-b border-border/40 pb-4">
                                    <div>
                                        <p className="text-sm font-black uppercase tracking-tight">{product.name}</p>
                                        <p className="text-[10px] text-muted-foreground mt-1 uppercase font-medium">Batch Units: {quantity}</p>
                                    </div>
                                    <span className="text-sm font-black text-foreground">{formatPrice(product.price * quantity)}</span>
                                </div>
                            ))}
                         </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-6">
                         <div className="p-6 border border-border/60 rounded-3xl bg-white/5">
                            <div className="flex items-center gap-2 text-accent mb-3">
                                <PackageCheck className="h-4 w-4" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Delivery Protocol</span>
                            </div>
                            <p className="text-xs font-bold leading-relaxed opacity-80">
                                {shippingData.company || billingData.company}<br />
                                {shippingData.address || billingData.address}<br />
                                {shippingData.city || billingData.city}, {shippingData.province || billingData.province}
                            </p>
                         </div>
                         <div className="p-6 border border-border/60 rounded-3xl bg-white/5">
                            <div className="flex items-center gap-2 text-accent mb-3">
                                <CreditCard className="h-4 w-4" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Settlement Layer</span>
                            </div>
                            <p className="text-xs font-black uppercase tracking-widest opacity-80">
                                {paymentMethod === 'stripe' ? 'Instant Clearance (Stripe)' : paymentMethod}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-2 font-medium">Auto-invoice generated upon sequence completion.</p>
                         </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6">
                    <button 
                      type="button" 
                      onClick={() => setStep(3)} 
                      disabled={isSubmitting}
                      className="group flex items-center gap-3 text-xs font-display font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    >
                      <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> {t("checkout.back")}
                    </button>
                    <button 
                      onClick={handlePlaceOrder} 
                      disabled={isSubmitting}
                      className="group bg-accent text-white px-12 py-6 rounded-2xl font-display font-black uppercase tracking-[0.2em] text-[12px] shadow-[0_0_20px_rgba(var(--accent-rgb),0.3)] hover:shadow-[0_0_40px_rgba(var(--accent-rgb),0.5)] transition-all flex items-center justify-between w-full sm:w-auto active:scale-[0.98] disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <span className="flex items-center gap-4"><Loader2 className="h-5 w-5 animate-spin" /> SECURING TRANSIT...</span>
                        ) : (
                            <>
                                <span>{t("checkout.place_order")}</span>
                                <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform ml-6" strokeWidth={3} />
                            </>
                        )}
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer Notice */}
            <div className="mt-8 flex items-center justify-center gap-6 opacity-40">
                <div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all cursor-default">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" alt="Stripe" className="h-4" />
                </div>
                <div className="h-1 w-1 rounded-full bg-border" />
                <span className="text-[9px] font-black uppercase tracking-widest">SSL Secure End-to-End Encryption</span>
            </div>
          </div>

          {/* Sidebar Summary */}
          <div className="lg:col-span-4 sticky top-24">
            <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-2xl group-hover:bg-accent/10 transition-colors pointer-events-none" />
              
              <h3 className="font-display font-black text-[10px] uppercase tracking-[0.3em] text-accent mb-8">{t("checkout.order_summary")}</h3>
              
              <div className="space-y-6">
                <div className="flex justify-between items-center group/row">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest group-hover/row:text-foreground transition-colors">{t("cart.subtotal")}</span>
                  <span className="text-sm font-black">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center group/row">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest group-hover/row:text-foreground transition-colors">{t("cart.tax")} (GST/HST)</span>
                  <span className="text-sm font-black">{formatPrice(tax)}</span>
                </div>
                <div className="flex justify-between items-center group/row">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest group-hover/row:text-foreground transition-colors">{t("cart.shipping")}</span>
                  <span className={`text-sm font-black ${shipping === 0 ? "text-success" : ""}`}>
                    {shipping === 0 ? "PROMO FREE" : formatPrice(shipping)}
                  </span>
                </div>
                
                <div className="my-8 border-t-4 border-double border-border" />
                
                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-[10px] font-display font-black uppercase tracking-[0.2em] text-accent block mb-1">Total Procurement Cost</span>
                    <p className="text-3xl font-display font-black uppercase tracking-tighter text-foreground leading-none">{formatPrice(total)}</p>
                  </div>
                </div>

                {/* Helpful icons */}
                <div className="mt-10 grid grid-cols-2 gap-4">
                    <div className="flex flex-col items-center gap-3 p-4 bg-muted/20 rounded-2xl text-center border border-border/40 group/sub">
                        <MapPin className="h-4 w-4 text-muted-foreground group-hover/sub:text-accent transition-colors" />
                        <span className="text-[8px] font-black uppercase tracking-widest">Logistics Tracking</span>
                    </div>
                    <div className="flex flex-col items-center gap-3 p-4 bg-muted/20 rounded-2xl text-center border border-border/40 group/sub">
                        <ShieldCheck className="h-4 w-4 text-muted-foreground group-hover/sub:text-accent transition-colors" />
                        <span className="text-[8px] font-black uppercase tracking-widest">Assigned Support</span>
                    </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
