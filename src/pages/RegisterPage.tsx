import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { UserPlus, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function RegisterPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.firstName.trim()) newErrors.firstName = t("validation.required") || "First name required";
    if (!formData.lastName.trim()) newErrors.lastName = t("validation.required") || "Last name required";
    if (!formData.email.trim()) newErrors.email = t("validation.required") || "Email required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = t("validation.invalid_email") || "Invalid email";
    if (!formData.password) newErrors.password = t("validation.required") || "Password required";
    else if (formData.password.length < 8) newErrors.password = t("validation.min_password") || "Password must be at least 8 characters";
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = t("validation.password_mismatch") || "Passwords don't match";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // const response = await fetch('/api/auth/register', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     first_name: formData.firstName,
      //     last_name: formData.lastName,
      //     email: formData.email,
      //     company_name: formData.company || null,
      //     phone: formData.phone || null,
      //     password: formData.password
      //   })
      // });
      // const data = await response.json();
      // if (!response.ok) throw new Error(data.message);
      
      // Simulate successful registration
      setSuccess(true);
      setTimeout(() => {
        navigate("/login?email=" + encodeURIComponent(formData.email));
      }, 2000);
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : "Registration failed" });
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md text-center">
          <div className="inline-block p-3 rounded-lg bg-success/10 mb-4">
            <CheckCircle className="w-6 h-6 text-success" />
          </div>
          <h2 className="font-display text-2xl font-bold mb-3">{t("auth.register_success") || "Account Created!"}</h2>
          <p className="text-muted-foreground mb-6">{t("auth.check_email") || "Check your email to verify your account, then sign in."}</p>
          <Link to="/login" className="btn-accent px-6 py-2 rounded-sm font-semibold inline-block">
            {t("auth.go_to_login") || "Go to Login"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-block p-3 rounded-lg bg-accent/10 mb-4">
            <UserPlus className="w-6 h-6 text-accent" />
          </div>
          <h1 className="font-display text-3xl font-bold mb-2">{t("auth.register")}</h1>
          <p className="text-muted-foreground text-sm">{t("auth.create_account") || "Create your account to get started"}</p>
        </div>

        {errors.submit && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-sm flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive">{errors.submit}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t("checkout.first_name")}</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="John"
                disabled={isLoading}
                className={`w-full border rounded-sm px-3 py-2.5 text-sm bg-background outline-none focus:ring-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  errors.firstName ? "border-destructive focus:ring-destructive" : "border-border focus:ring-accent"
                }`}
              />
              {errors.firstName && <p className="text-xs text-destructive mt-1">{errors.firstName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t("checkout.last_name")}</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Doe"
                disabled={isLoading}
                className={`w-full border rounded-sm px-3 py-2.5 text-sm bg-background outline-none focus:ring-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  errors.lastName ? "border-destructive focus:ring-destructive" : "border-border focus:ring-accent"
                }`}
              />
              {errors.lastName && <p className="text-xs text-destructive mt-1">{errors.lastName}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t("auth.email")}</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="name@example.com"
              disabled={isLoading}
              className={`w-full border rounded-sm px-3 py-2.5 text-sm bg-background outline-none focus:ring-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                errors.email ? "border-destructive focus:ring-destructive" : "border-border focus:ring-accent"
              }`}
            />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t("checkout.company")} ({t("optional") || "Optional"})</label>
            <input
              type="text"
              name="company"
              value={formData.company}
              onChange={handleChange}
              placeholder="Your Company"
              disabled={isLoading}
              className="w-full border border-border rounded-sm px-3 py-2.5 text-sm bg-background outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t("checkout.phone")} ({t("optional") || "Optional"})</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+1 (555) 000-0000"
              disabled={isLoading}
              className="w-full border border-border rounded-sm px-3 py-2.5 text-sm bg-background outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t("auth.password")}</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              disabled={isLoading}
              className={`w-full border rounded-sm px-3 py-2.5 text-sm bg-background outline-none focus:ring-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                errors.password ? "border-destructive focus:ring-destructive" : "border-border focus:ring-accent"
              }`}
            />
            {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
            <p className="text-xs text-muted-foreground mt-1">{t("validation.password_hint") || "Min 8 characters"}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t("auth.confirm_password")}</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              disabled={isLoading}
              className={`w-full border rounded-sm px-3 py-2.5 text-sm bg-background outline-none focus:ring-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                errors.confirmPassword ? "border-destructive focus:ring-destructive" : "border-border focus:ring-accent"
              }`}
            />
            {errors.confirmPassword && <p className="text-xs text-destructive mt-1">{errors.confirmPassword}</p>}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-accent py-2.5 rounded-sm font-semibold uppercase tracking-wide flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("auth.creating") || "Creating account..."}
              </>
            ) : (
              <>{t("auth.register")}</>
            )}
          </button>
        </form>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {t("auth.has_account") || "Already have an account?"}{" "}
            <Link to="/login" className="text-accent font-medium hover:underline">{t("auth.login")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
