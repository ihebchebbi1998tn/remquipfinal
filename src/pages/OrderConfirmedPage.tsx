import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function OrderConfirmedPage() {
  const { t } = useLanguage();

  return (
    <div className="container mx-auto px-4 py-16 text-center max-w-lg">
      <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
      <h1 className="font-display text-3xl font-bold mb-2">{t("order.confirmed")}</h1>
      <p className="text-muted-foreground mb-2">{t("order.thank_you")}</p>
      <p className="text-sm text-muted-foreground mb-8">{t("order.number")}: #RMQ-{Date.now().toString().slice(-6)}</p>
      <Link to="/products" className="btn-accent px-8 py-3 rounded-sm font-semibold uppercase tracking-wide inline-block">
        {t("cart.continue")}
      </Link>
    </div>
  );
}
