import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { api } from "@/lib/api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      showErrorToast(t("auth.required_fields"));
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.forgotPassword(trimmed);
      const msg =
        (res.data as { message?: string } | undefined)?.message ??
        res.message ??
        t("auth.forgot_generic");
      showSuccessToast(msg);
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : t("auth.forgot_error"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <h1 className="font-display text-3xl font-bold text-center mb-4">{t("auth.forgot")}</h1>
      <p className="text-sm text-muted-foreground text-center mb-8">{t("auth.forgot_description")}</p>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium mb-1">{t("auth.email")}</label>
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-border rounded-sm px-3 py-2.5 text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full btn-accent py-3 rounded-sm font-semibold uppercase tracking-wide flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {t("auth.send_reset_link")}
        </button>
        <p className="text-center text-sm text-muted-foreground">
          <Link to="/login" className="text-accent font-medium hover:underline">{t("auth.back_to_login")}</Link>
        </p>
      </form>
    </div>
  );
}
