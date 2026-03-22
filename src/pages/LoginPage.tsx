import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { LogIn, AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!formData.email || !formData.password) {
      setError(t("auth.required_fields") || "Email and password required");
      return;
    }

    setIsLoading(true);
    try {
      console.log("[v0] Login attempt:", { email: formData.email });
      await login(formData.email, formData.password);
      console.log("[v0] Login successful, redirecting to account");
      navigate("/account");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      setError(errorMessage);
      console.error("[v0] Login error:", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-block p-3 rounded-lg bg-accent/10 mb-4">
            <LogIn className="w-6 h-6 text-accent" />
          </div>
          <h1 className="font-display text-3xl font-bold mb-2">{t("auth.login")}</h1>
          <p className="text-muted-foreground text-sm">{t("auth.login_description") || "Sign in to your account"}</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-sm flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">{t("auth.email")}</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="name@example.com"
              disabled={isLoading}
              className="w-full border border-border rounded-sm px-3 py-2.5 text-sm bg-background outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">{t("auth.password")}</label>
              <Link to="/forgot-password" className="text-xs text-accent hover:underline">{t("auth.forgot")}</Link>
            </div>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              disabled={isLoading}
              className="w-full border border-border rounded-sm px-3 py-2.5 text-sm bg-background outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-accent py-2.5 rounded-sm font-semibold uppercase tracking-wide flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("auth.signing_in") || "Signing in..."}
              </>
            ) : (
              <>{t("auth.login")}</>
            )}
          </button>
        </form>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {t("auth.no_account") || "Don't have an account?"}{" "}
            <Link to="/register" className="text-accent font-medium hover:underline">{t("auth.register")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
