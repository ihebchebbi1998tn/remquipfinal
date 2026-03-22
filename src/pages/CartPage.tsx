import React from "react";
import { Link } from "react-router-dom";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useCart } from "@/contexts/CartContext";
import { productDetailHref } from "@/lib/storefront-product";

export default function CartPage() {
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();
  const { items, removeItem, updateQuantity, subtotal, tax, shipping, total } = useCart();

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-foreground mb-3 tracking-tight">{t("cart.title")}</h1>
        <p className="text-muted-foreground text-sm mb-8">{t("cart.empty")}</p>
        <Link to="/products" className="inline-block bg-foreground text-background px-6 py-2.5 rounded-md font-medium text-sm hover:opacity-90 transition-opacity">
          {t("cart.continue")}
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 md:py-12">
      <h1 className="font-display text-2xl sm:text-3xl font-semibold text-foreground mb-8 tracking-tight">{t("cart.title")}</h1>
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map(({ product, quantity }) => (
            <div key={product.id} className="flex gap-4 border border-border rounded-lg p-4 bg-card">
              {product.image ? (
                <img src={product.image} alt={product.name} className="w-20 h-20 object-cover rounded-md bg-muted/60 flex-shrink-0" />
              ) : (
                <div className="w-20 h-20 rounded-md bg-muted/60 flex-shrink-0" aria-hidden />
              )}
              <div className="flex-1 min-w-0">
                <Link to={productDetailHref(product.id, product.slug)} className="text-sm font-medium text-foreground hover:text-accent transition-colors line-clamp-1">{product.name}</Link>
                <p className="text-xs text-muted-foreground">{t("products.sku")}: {product.sku}</p>
                <p className="text-sm font-bold mt-1">{formatPrice(product.price)}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button onClick={() => removeItem(product.id)} className="text-muted-foreground hover:text-destructive transition-colors" aria-label={t("cart.remove")}>
                  <Trash2 className="h-4 w-4" />
                </button>
                <div className="flex items-center border border-border rounded-sm">
                  <button onClick={() => updateQuantity(product.id, quantity - 1)} className="px-2 py-1 hover:bg-secondary transition-colors" aria-label="Decrease quantity"><Minus className="h-3 w-3" /></button>
                  <span className="px-3 py-1 text-sm min-w-[32px] text-center">{quantity}</span>
                  <button onClick={() => updateQuantity(product.id, quantity + 1)} className="px-2 py-1 hover:bg-secondary transition-colors" aria-label="Increase quantity"><Plus className="h-3 w-3" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="border border-border rounded-lg p-6 h-fit bg-card">
          <h3 className="font-display font-medium text-sm mb-5">{t("checkout.order_summary")}</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">{t("cart.subtotal")}</span><span className="font-medium">{formatPrice(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t("cart.tax")}</span><span className="font-medium">{formatPrice(tax)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t("cart.shipping")}</span><span className="font-medium">{shipping === 0 ? t("cart.shipping_free") : formatPrice(shipping)}</span></div>
            <hr className="border-border" />
            <div className="flex justify-between text-base font-bold"><span>{t("cart.total")}</span><span>{formatPrice(total)}</span></div>
          </div>
          <Link to="/checkout" className="block mt-6 bg-foreground text-background text-center py-3 rounded-md font-medium hover:opacity-90 transition-opacity">
            {t("cart.checkout")}
          </Link>
          <Link to="/products" className="block mt-3 text-center text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t("cart.continue")}
          </Link>
        </div>
      </div>
    </div>
  );
}
