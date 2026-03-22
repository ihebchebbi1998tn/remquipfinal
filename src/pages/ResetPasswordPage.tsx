import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { api } from "@/lib/api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { Loader2 } from "lucide-react";

export default function ResetPasswordPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      showErrorToast(t("auth.reset_missing_token"));
      return;
    }
    if (password.length < 8) {
      showErrorToast(t("validation.min_password"));
      return;
    }
    if (password !== confirm) {
      showErrorToast(t("validation.password_mismatch"));
      return;
    }
    setIsLoading(true);
    try {
      await api.resetPassword(token, password);
      showSuccessToast(t("auth.reset_done"));
      navigate("/login", { replace: true });
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : t("auth.reset_error"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <h1 className="font-display text-3xl font-bold text-center mb-4">{t("auth.reset_password")}</h1>
      <p className="text-sm text-muted-foreground text-center mb-8">{t("auth.reset_password_hint")}</p>
      {!token ? (
        <p className="text-sm text-destructive text-center mb-6">{t("auth.reset_missing_token")}</p>
      ) : null}
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium mb-1">{t("auth.new_password")}</label>
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-border rounded-sm px-3 py-2.5 text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t("auth.confirm_password")}</label>
          <input
            type="password"
            name="confirm"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full border border-border rounded-sm px-3 py-2.5 text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !token}
          className="w-full btn-accent py-3 rounded-sm font-semibold uppercase tracking-wide flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {t("auth.reset_password")}
        </button>
        <p className="text-center text-sm text-muted-foreground">
          <Link to="/login" className="text-accent font-medium hover:underline">{t("auth.back_to_login")}</Link>
        </p>
      </form>
    </div>
  );
}
