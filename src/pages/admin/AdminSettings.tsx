import React, { useState } from "react";
import { Save, CheckCircle } from "lucide-react";

export default function AdminSettings() {
  const [saved, setSaved] = useState<string | null>(null);

  function handleSave(section: string) {
    setSaved(section);
    setTimeout(() => setSaved(null), 2000);
  }

  return (
    <div className="space-y-6">
      <h2 className="font-display font-bold text-lg md:text-xl">Settings</h2>

      <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
        {/* General */}
        <div className="dashboard-card">
          <h3 className="font-display font-bold text-sm uppercase mb-4">General</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Store Name</label>
              <input defaultValue="REMQUIP" className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contact Email</label>
              <input defaultValue="info@remquip.ca" className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input defaultValue="+1 (418) 555-0199" className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Address</label>
              <textarea defaultValue="1234 Boulevard Industriel, Québec, QC G1K 7P4" rows={2} className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-accent resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Default Currency</label>
                <select defaultValue="CAD" className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background outline-none">
                  <option>CAD</option><option>USD</option><option>EUR</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Default Language</label>
                <select defaultValue="en" className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background outline-none">
                  <option value="en">English</option><option value="fr">Français</option>
                </select>
              </div>
            </div>
            <button onClick={() => handleSave("general")} className="btn-accent px-6 py-2 rounded-sm text-sm font-medium flex items-center gap-2">
              {saved === "general" ? <><CheckCircle className="h-4 w-4" /> Saved!</> : <><Save className="h-4 w-4" /> Save Changes</>}
            </button>
          </div>
        </div>

        {/* Tax & Shipping */}
        <div className="dashboard-card">
          <h3 className="font-display font-bold text-sm uppercase mb-4">Tax & Shipping</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">GST Rate (%)</label>
              <input defaultValue="5.0" type="number" step="0.01" className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">QST Rate (%)</label>
              <input defaultValue="9.975" type="number" step="0.001" className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Free Shipping Threshold (CAD)</label>
              <input defaultValue="500" type="number" className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Flat Shipping Rate (CAD)</label>
              <input defaultValue="25" type="number" className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <button onClick={() => handleSave("tax")} className="btn-accent px-6 py-2 rounded-sm text-sm font-medium flex items-center gap-2">
              {saved === "tax" ? <><CheckCircle className="h-4 w-4" /> Saved!</> : <><Save className="h-4 w-4" /> Save Changes</>}
            </button>
          </div>
        </div>

        {/* Integrations */}
        <div className="dashboard-card">
          <h3 className="font-display font-bold text-sm uppercase mb-4">Integrations</h3>
          <div className="space-y-3">
            {[
              { name: "Stripe", status: "Not Connected", desc: "Payment processing" },
              { name: "PayPal", status: "Not Connected", desc: "Alternative payments" },
              { name: "Purolator API", status: "Not Connected", desc: "Shipping rates & tracking" },
              { name: "SendGrid", status: "Not Connected", desc: "Transactional emails" },
            ].map((integration) => (
              <div key={integration.name} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <span className="text-sm font-medium">{integration.name}</span>
                  <p className="text-xs text-muted-foreground">{integration.desc}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge-warning text-xs">{integration.status}</span>
                  <button className="text-xs text-accent font-medium hover:underline">Connect</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className="dashboard-card">
          <h3 className="font-display font-bold text-sm uppercase mb-4">Email Notifications</h3>
          <div className="space-y-3">
            {[
              { label: "New Order Confirmation", enabled: true },
              { label: "Order Shipped Notification", enabled: true },
              { label: "Low Stock Alert", enabled: true },
              { label: "New Customer Registration", enabled: false },
              { label: "Weekly Sales Summary", enabled: false },
            ].map((notif) => (
              <label key={notif.label} className="flex items-center justify-between py-2 cursor-pointer">
                <span className="text-sm">{notif.label}</span>
                <input type="checkbox" defaultChecked={notif.enabled} className="rounded-sm border-border accent-accent h-4 w-4" />
              </label>
            ))}
            <button onClick={() => handleSave("notif")} className="btn-accent px-6 py-2 rounded-sm text-sm font-medium flex items-center gap-2">
              {saved === "notif" ? <><CheckCircle className="h-4 w-4" /> Saved!</> : <><Save className="h-4 w-4" /> Save Changes</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
