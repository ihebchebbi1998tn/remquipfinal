import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <h1 className="font-display text-3xl font-bold text-center mb-4">{t("auth.forgot")}</h1>
      <p className="text-sm text-muted-foreground text-center mb-8">{t("auth.forgot_description")}</p>
      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t("auth.email")}</label>
          <input type="email" className="w-full border border-border rounded-sm px-3 py-2.5 text-sm bg-background outline-none focus:ring-2 focus:ring-accent" />
        </div>
        <button type="submit" className="w-full btn-accent py-3 rounded-sm font-semibold uppercase tracking-wide">
          {t("auth.reset_password")}
        </button>
        <p className="text-center text-sm text-muted-foreground">
          <Link to="/login" className="text-accent font-medium hover:underline">{t("auth.back_to_login")}</Link>
        </p>
      </form>
    </div>
  );
}
