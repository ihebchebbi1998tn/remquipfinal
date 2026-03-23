import React, { useEffect, useMemo, useRef, useState } from "react";
import { Save, CheckCircle, Loader2, Upload, Trash2, ExternalLink } from "lucide-react";
import { RemquipLoadingScreen } from "@/components/RemquipLoadingScreen";
import {
  useAdminSettingsList,
  usePatchSettingsBulk,
  useRegistryFiles,
  useUploadRegistryFile,
  useDeleteRegistryFile,
} from "@/hooks/useApi";
import { unwrapApiList, resolveBackendUploadUrl } from "@/lib/api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPageError, AdminPageLoading } from "@/components/admin/AdminPageState";

type SettingRow = { setting_key: string; setting_value: string | null };

function rowsToMap(rows: SettingRow[]): Record<string, string> {
  const m: Record<string, string> = {};
  for (const r of rows) {
    m[r.setting_key] = String(r.setting_value ?? "");
  }
  return m;
}

export default function AdminSettings() {
  const { data: adminRes, isLoading: loadingSettings, isError, refetch } = useAdminSettingsList();
  const patchBulk = usePatchSettingsBulk();
  const uploadReg = useUploadRegistryFile();
  const deleteReg = useDeleteRegistryFile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rows = useMemo(() => {
    const d = adminRes?.data;
    return Array.isArray(d) ? (d as SettingRow[]) : [];
  }, [adminRes]);

  const [values, setValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<string | null>(null);
  const seeded = useRef(false);

  useEffect(() => {
    if (rows.length === 0) return;
    if (!seeded.current) {
      setValues(rowsToMap(rows));
      seeded.current = true;
    }
  }, [rows]);

  const v = (key: string, fallback = "") => values[key] ?? fallback;

  const setK = (key: string, val: string) => setValues((prev) => ({ ...prev, [key]: val }));

  async function saveKeys(section: string, keys: string[]) {
    const payload: Record<string, string> = {};
    for (const k of keys) {
      if (values[k] !== undefined) payload[k] = values[k];
    }
    try {
      await patchBulk.mutateAsync(payload);
      showSuccessToast("Saved.");
      setSaved(section);
      setTimeout(() => setSaved(null), 2000);
      refetch();
    } catch (e) {
      showErrorToast(e instanceof Error ? e.message : "Save failed");
    }
  }

  const { data: filesRes, isLoading: filesLoading, refetch: refetchFiles } = useRegistryFiles(30, 0);
  const files = unwrapApiList<Record<string, unknown>>(filesRes, []);

  const handleRegistryFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    uploadReg.mutate(
      { file, uploadType: "admin_misc" },
      {
        onSuccess: () => {
          showSuccessToast("File registered.");
          refetchFiles();
        },
        onError: (err: unknown) => showErrorToast(err instanceof Error ? err.message : "Upload failed"),
      }
    );
  };

  if (loadingSettings && rows.length === 0) {
    return <AdminPageLoading message="Loading settings" />;
  }

  if (isError) {
    return (
      <AdminPageError
        message="Could not load settings. Ensure you are logged in as admin."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Settings" />

      <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
        <div className="dashboard-card">
          <h3 className="font-display font-bold text-sm uppercase mb-4">General</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Store name</label>
              <input
                value={v("store_name", "REMQUIP")}
                onChange={(e) => setK("store_name", e.target.value)}
                className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contact email</label>
              <input
                type="email"
                value={v("contact_email")}
                onChange={(e) => setK("contact_email", e.target.value)}
                className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                value={v("contact_phone")}
                onChange={(e) => setK("contact_phone", e.target.value)}
                className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Address</label>
              <textarea
                value={v("store_address")}
                onChange={(e) => setK("store_address", e.target.value)}
                rows={2}
                className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-accent resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Default currency</label>
                <select
                  value={v("default_currency", "CAD")}
                  onChange={(e) => setK("default_currency", e.target.value)}
                  className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background outline-none"
                >
                  <option>CAD</option>
                  <option>USD</option>
                  <option>EUR</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Default language</label>
                <select
                  value={v("default_language", "en")}
                  onChange={(e) => setK("default_language", e.target.value)}
                  className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background outline-none"
                >
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                  <option value="es">Español</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Supported locales</label>
              <input
                value={(() => {
                  const raw = v("supported_locales", '["en","fr"]');
                  try {
                    const arr = JSON.parse(raw);
                    return Array.isArray(arr) ? arr.map((x: unknown) => String(x)).join(", ") : raw;
                  } catch {
                    return raw;
                  }
                })()}
                onChange={(e) => {
                  const s = e.target.value.trim();
                  const arr = s ? s.split(/[\s,]+/).map((x) => x.trim().toLowerCase()).filter(Boolean) : ["en", "fr"];
                  setK("supported_locales", JSON.stringify([...new Set(arr)]));
                }}
                placeholder="en, fr, es, de"
                className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-accent font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Comma-separated locale codes for CMS, categories, and banners. First is default.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={v("portal_email_notifications_default", "1") === "1"}
                onChange={(e) => setK("portal_email_notifications_default", e.target.checked ? "1" : "0")}
                className="rounded-sm border-border accent-accent h-4 w-4"
              />
              Default “email notifications” for new portal users
            </label>
            <button
              type="button"
              disabled={patchBulk.isLoading}
              onClick={() =>
                saveKeys("general", [
                  "store_name",
                  "contact_email",
                  "contact_phone",
                  "store_address",
                  "default_currency",
                  "default_language",
                  "supported_locales",
                  "portal_email_notifications_default",
                ])
              }
              className="btn-accent px-6 py-2 rounded-sm text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {saved === "general" ? (
                <>
                  <CheckCircle className="h-4 w-4" /> Saved!
                </>
              ) : patchBulk.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="h-4 w-4" /> Save changes
                </>
              )}
            </button>
          </div>
        </div>

        <div className="dashboard-card">
          <h3 className="font-display font-bold text-sm uppercase mb-4">Tax & shipping</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">GST rate (%)</label>
              <input
                type="text"
                value={v("tax_gst_rate", "5.0")}
                onChange={(e) => setK("tax_gst_rate", e.target.value)}
                className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">QST rate (%)</label>
              <input
                type="text"
                value={v("tax_qst_rate", "9.975")}
                onChange={(e) => setK("tax_qst_rate", e.target.value)}
                className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Free shipping threshold (CAD)</label>
              <input
                type="text"
                value={v("free_shipping_threshold", "500")}
                onChange={(e) => setK("free_shipping_threshold", e.target.value)}
                className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Flat shipping rate (CAD)</label>
              <input
                type="text"
                value={v("flat_shipping_rate", "25")}
                onChange={(e) => setK("flat_shipping_rate", e.target.value)}
                className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <button
              type="button"
              disabled={patchBulk.isLoading}
              onClick={() =>
                saveKeys("tax", ["tax_gst_rate", "tax_qst_rate", "free_shipping_threshold", "flat_shipping_rate"])
              }
              className="btn-accent px-6 py-2 rounded-sm text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {saved === "tax" ? (
                <>
                  <CheckCircle className="h-4 w-4" /> Saved!
                </>
              ) : patchBulk.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="h-4 w-4" /> Save changes
                </>
              )}
            </button>
          </div>
        </div>

        <div className="dashboard-card">
          <h3 className="font-display font-bold text-sm uppercase mb-4">Email notification toggles</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Outbound mail uses OVH SMTP (HTML templates). Shipped and status updates go to the customer; the toggles below apply. Admin alerts use the recipient below.
          </p>
          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Alert recipient (admin)</label>
              <input
                type="email"
                className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background"
                placeholder="Uses contact email if empty"
                value={v("notif_recipient_email", "")}
                onChange={(e) => setK("notif_recipient_email", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">From address</label>
              <input
                type="email"
                className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background"
                placeholder="Uses contact email if empty"
                value={v("notif_from_email", "")}
                onChange={(e) => setK("notif_from_email", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-3">
            {[
              { key: "notif_new_order", label: "New order confirmation" },
              { key: "notif_order_shipped", label: "Order shipped" },
              { key: "notif_order_status", label: "Order status updates (non-shipped)" },
              { key: "notif_low_stock", label: "Low stock alert" },
              { key: "notif_new_customer", label: "New customer registration" },
              { key: "notif_weekly_summary", label: "Weekly sales summary" },
            ].map((n) => (
              <label key={n.key} className="flex items-center justify-between py-2 cursor-pointer">
                <span className="text-sm">{n.label}</span>
                <input
                  type="checkbox"
                  checked={v(n.key, "0") === "1"}
                  onChange={(e) => setK(n.key, e.target.checked ? "1" : "0")}
                  className="rounded-sm border-border accent-accent h-4 w-4"
                />
              </label>
            ))}
            <button
              type="button"
              disabled={patchBulk.isLoading}
              onClick={() =>
                saveKeys("notif", [
                  "notif_recipient_email",
                  "notif_from_email",
                  "notif_new_order",
                  "notif_order_shipped",
                  "notif_order_status",
                  "notif_low_stock",
                  "notif_new_customer",
                  "notif_weekly_summary",
                ])
              }
              className="btn-accent px-6 py-2 rounded-sm text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {saved === "notif" ? (
                <>
                  <CheckCircle className="h-4 w-4" /> Saved!
                </>
              ) : patchBulk.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="h-4 w-4" /> Save changes
                </>
              )}
            </button>
          </div>
        </div>

        <div className="dashboard-card">
          <h3 className="font-display font-bold text-sm uppercase mb-4">File registry</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Generic uploads (`file_uploads`). Images for products still use product image upload.
          </p>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleRegistryFile} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadReg.isLoading}
            className="mb-4 px-4 py-2 border border-border rounded-sm text-sm font-medium flex items-center gap-2 hover:bg-secondary disabled:opacity-50"
          >
            {uploadReg.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload file
          </button>
          {filesLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : files.length === 0 ? (
            <p className="text-sm text-muted-foreground">No files in registry yet.</p>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {files.map((f) => {
                const id = String(f.id ?? "");
                const path = String(f.file_path ?? "");
                const name = String(f.original_filename ?? path);
                return (
                  <li key={id} className="flex items-center justify-between gap-2 text-sm border border-border rounded-sm px-2 py-1.5">
                    <a
                      href={resolveBackendUploadUrl(path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline truncate flex items-center gap-1 min-w-0"
                    >
                      {name}
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </a>
                    <button
                      type="button"
                      title="Remove"
                      disabled={deleteReg.isLoading}
                      onClick={() => {
                        if (!confirm("Remove this file from the registry and disk?")) return;
                        deleteReg.mutate(id, {
                          onSuccess: () => {
                            showSuccessToast("Removed.");
                            refetchFiles();
                          },
                          onError: (err: unknown) =>
                            showErrorToast(err instanceof Error ? err.message : "Delete failed"),
                        });
                      }}
                      className="p-1 text-destructive hover:bg-destructive/10 rounded-sm"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
