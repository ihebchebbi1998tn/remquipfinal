import React, { useState } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import type { User } from "@/lib/api";
import { LogIn, AlertCircle, Loader2 } from "lucide-react";

/** Same rules as AdminLayout — only these roles may open /admin. */
function isStaffRole(role: User["role"]): boolean {
  return role === "admin" || role === "super_admin" || role === "manager";
}

/** Avoid open redirects — only same-app paths. */
function safeInternalPath(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const p = raw.trim();
  if (!p.startsWith("/") || p.startsWith("//")) return null;
  return p;
}

export default function LoginPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
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
      const user = await login(formData.email, formData.password);

      const fromState = (location.state as { from?: { pathname: string; search?: string } } | null)?.from;
      const fromPath = fromState ? `${fromState.pathname}${fromState.search ?? ""}` : null;
      const redirectParam =
        safeInternalPath(searchParams.get("redirect")) ?? safeInternalPath(searchParams.get("returnUrl"));

      // After visiting /admin while logged out, AdminLayout sends state.from — return staff to admin
      if (fromPath?.startsWith("/admin") || redirectParam?.startsWith("/admin")) {
        if (isStaffRole(user.role)) {
          const dest = fromPath?.startsWith("/admin") ? fromPath : redirectParam!;
          navigate(dest, { replace: true });
          return;
        }
        navigate("/account", { replace: true });
        return;
      }

      if (fromPath) {
        navigate(fromPath, { replace: true });
        return;
      }

      if (redirectParam) {
        navigate(redirectParam, { replace: true });
        return;
      }

      navigate("/account", { replace: true });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      setError(errorMessage);
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
