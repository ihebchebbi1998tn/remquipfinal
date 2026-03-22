import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { CreditCard, Building, Landmark, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useCart } from "@/contexts/CartContext";
import { useCreateOrder } from "@/hooks/useApi";
import { toast } from "@/hooks/use-toast";

export default function CheckoutPage() {
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();
  const { items, subtotal, tax, shipping, total, clearCart } = useCart();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  
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

  useEffect(() => {
    if (items.length === 0) {
      navigate("/cart");
    }
  }, [items.length, navigate]);

  const handlePlaceOrder = async () => {
    setIsSubmitting(true);
    
    try {
      // Prepare order data for API
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

      await createOrderMutation.mutateAsync(orderData);
      
      toast({
        title: t("checkout.order_success") || "Order placed successfully!",
        description: t("checkout.order_confirmation_sent") || "A confirmation email has been sent.",
      });
      
      clearCart();
      navigate("/order-confirmed");
    } catch (error) {
      console.error("[v0] Order creation failed:", error);
      toast({
        title: t("checkout.order_error") || "Order failed",
        description: t("checkout.order_error_desc") || "There was an error placing your order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handlers to save form data when moving between steps
  const handleBillingSubmit = () => {
    const form = document.querySelector('input[name="firstName"]')?.closest('div')?.parentElement;
    if (form) {
      const getValue = (name: string) => (form.querySelector(`input[name="${name}"]`) as HTMLInputElement)?.value || "";
      setBillingData({
        firstName: getValue("firstName"),
        lastName: getValue("lastName"),
        email: getValue("email"),
        phone: getValue("phone"),
        company: getValue("company"),
        taxId: getValue("taxId"),
        address: getValue("address"),
        city: getValue("city"),
        province: getValue("province"),
        postal: getValue("postal"),
        country: getValue("country"),
      });
    }
    setStep(2);
  };
  
  const handleShippingSubmit = () => {
    const form = document.querySelector('input[name="shipCompany"]')?.closest('div')?.parentElement;
    if (form) {
      const getValue = (name: string) => (form.querySelector(`input[name="${name}"]`) as HTMLInputElement)?.value || "";
      setShippingData({
        company: getValue("shipCompany"),
        address: getValue("shipAddress"),
        city: getValue("shipCity"),
        province: getValue("shipProvince"),
        postal: getValue("shipPostal"),
        country: getValue("shipCountry"),
      });
    }
    setStep(3);
  };

  if (items.length === 0) return null;

  const InputField = ({ label, name, type = "text", required = true }: { label: string; name: string; type?: string; required?: boolean }) => (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">{label}</label>
      <input type={type} name={name} required={required} className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background text-foreground outline-none focus:ring-2 focus:ring-accent" />
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-8">{t("checkout.title")}</h1>

      {/* Steps */}
      <div className="flex gap-4 mb-8">
        {[
          { num: 1, label: t("checkout.billing") },
          { num: 2, label: t("checkout.shipping") },
          { num: 3, label: t("checkout.payment") },
          { num: 4, label: t("checkout.review") },
        ].map(({ num, label }) => (
          <div key={num} className={`flex items-center gap-2 ${num <= step ? "text-foreground" : "text-muted-foreground"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${num <= step ? "bg-accent text-accent-foreground" : "bg-secondary"}`}>{num}</div>
            <span className="text-sm font-medium hidden md:block">{label}</span>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {step === 1 && (
            <div className="border border-border rounded-sm p-6">
              <h2 className="font-display font-bold text-lg mb-4">{t("checkout.billing")}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label={t("checkout.first_name")} name="firstName" />
                <InputField label={t("checkout.last_name")} name="lastName" />
                <InputField label={t("checkout.email")} name="email" type="email" />
                <InputField label={t("checkout.phone")} name="phone" />
                <div className="sm:col-span-2"><InputField label={t("checkout.company")} name="company" required={false} /></div>
                <div className="sm:col-span-2"><InputField label={t("checkout.tax_id")} name="taxId" required={false} /></div>
                <div className="sm:col-span-2"><InputField label={t("checkout.address")} name="address" /></div>
                <InputField label={t("checkout.city")} name="city" />
                <InputField label={t("checkout.province")} name="province" />
                <InputField label={t("checkout.postal")} name="postal" />
                <InputField label={t("checkout.country")} name="country" />
              </div>
              <button onClick={handleBillingSubmit} className="mt-6 btn-accent px-8 py-2.5 rounded-sm font-semibold uppercase tracking-wide">
                {t("checkout.continue")}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="border border-border rounded-sm p-6">
              <h2 className="font-display font-bold text-lg mb-4">{t("checkout.shipping")}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2"><InputField label={t("checkout.company")} name="shipCompany" required={false} /></div>
                <div className="sm:col-span-2"><InputField label={t("checkout.address")} name="shipAddress" /></div>
                <InputField label={t("checkout.city")} name="shipCity" />
                <InputField label={t("checkout.province")} name="shipProvince" />
                <InputField label={t("checkout.postal")} name="shipPostal" />
                <InputField label={t("checkout.country")} name="shipCountry" />
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(1)} className="px-6 py-2.5 rounded-sm border border-border text-sm font-medium hover:bg-secondary transition-colors">{t("checkout.back")}</button>
                <button onClick={handleShippingSubmit} className="btn-accent px-8 py-2.5 rounded-sm font-semibold uppercase tracking-wide">{t("checkout.continue")}</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="border border-border rounded-sm p-6">
              <h2 className="font-display font-bold text-lg mb-4">{t("checkout.payment")}</h2>
              <div className="space-y-3">
                {[
                  { key: "checkout.payment_stripe", value: "stripe", icon: CreditCard },
                  { key: "checkout.payment_paypal", value: "paypal", icon: Building },
                  { key: "checkout.payment_bank", value: "bank", icon: Landmark },
                ].map(({ key, value, icon: Icon }) => (
                  <label key={key} className="flex items-center gap-3 border border-border rounded-sm p-4 cursor-pointer hover:bg-secondary/50 transition-colors">
                    <input 
                      type="radio" 
                      name="payment" 
                      value={value}
                      checked={paymentMethod === value}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="accent-accent" 
                    />
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">{t(key)}</span>
                    {value !== "stripe" && <span className="text-xs text-muted-foreground ml-auto">({t("checkout.payment_coming")})</span>}
                  </label>
                ))}
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(2)} className="px-6 py-2.5 rounded-sm border border-border text-sm font-medium hover:bg-secondary transition-colors">{t("checkout.back")}</button>
                <button onClick={() => setStep(4)} className="btn-accent px-8 py-2.5 rounded-sm font-semibold uppercase tracking-wide">{t("checkout.continue")}</button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="border border-border rounded-sm p-6">
              <h2 className="font-display font-bold text-lg mb-4">{t("checkout.review")}</h2>
              <div className="space-y-3 mb-6">
                {items.map(({ product, quantity }) => (
                  <div key={product.id} className="flex justify-between text-sm">
                    <span>{product.name} x{quantity}</span>
                    <span className="font-medium">{formatPrice(product.price * quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setStep(3)} 
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-sm border border-border text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-50"
                >
                  {t("checkout.back")}
                </button>
                <button 
                  onClick={handlePlaceOrder} 
                  disabled={isSubmitting}
                  className="btn-accent px-8 py-2.5 rounded-sm font-semibold uppercase tracking-wide flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isSubmitting ? t("checkout.processing") || "Processing..." : t("checkout.place_order")}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Order summary */}
        <div className="border border-border rounded-sm p-6 h-fit">
          <h3 className="font-display font-bold text-sm uppercase mb-4">{t("checkout.order_summary")}</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">{t("cart.subtotal")}</span><span>{formatPrice(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t("cart.tax")}</span><span>{formatPrice(tax)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t("cart.shipping")}</span><span>{shipping === 0 ? t("cart.shipping_free") : formatPrice(shipping)}</span></div>
            <hr className="border-border" />
            <div className="flex justify-between font-bold text-base"><span>{t("cart.total")}</span><span>{formatPrice(total)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
