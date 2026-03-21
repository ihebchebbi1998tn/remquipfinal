import React, { useState } from "react";
import { Edit, Eye, Plus, Search, FileText, Globe } from "lucide-react";

const cmsPages = [
  { id: "cms-1", title: "Homepage", slug: "/", status: "published", lastModified: "2026-03-10", sections: 6, views: 4280 },
  { id: "cms-2", title: "About Us", slug: "/about", status: "published", lastModified: "2026-03-05", sections: 3, views: 890 },
  { id: "cms-3", title: "Contact", slug: "/contact", status: "published", lastModified: "2026-03-01", sections: 2, views: 1240 },
  { id: "cms-4", title: "Terms & Conditions", slug: "/terms", status: "published", lastModified: "2026-02-20", sections: 1, views: 320 },
  { id: "cms-5", title: "Privacy Policy", slug: "/privacy", status: "published", lastModified: "2026-02-20", sections: 1, views: 280 },
  { id: "cms-6", title: "Shipping Policy", slug: "/shipping", status: "draft", lastModified: "2026-02-15", sections: 1, views: 0 },
  { id: "cms-7", title: "Refund Policy", slug: "/refund", status: "draft", lastModified: "2026-02-15", sections: 1, views: 0 },
];

export default function AdminCMS() {
  const [search, setSearch] = useState("");

  const filtered = cmsPages.filter((p) =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.slug.includes(search.toLowerCase())
  );

  const publishedCount = cmsPages.filter(p => p.status === "published").length;
  const draftCount = cmsPages.filter(p => p.status === "draft").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="font-display font-bold text-lg md:text-xl">CMS Page Editor</h2>
        <button className="btn-accent px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2 self-start">
          <Plus className="h-4 w-4" /> New Page
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <div className="dashboard-card">
          <p className="text-xs md:text-sm text-muted-foreground">Total Pages</p>
          <p className="text-xl md:text-2xl font-bold font-display">{cmsPages.length}</p>
        </div>
        <div className="dashboard-card">
          <div className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-success" />
            <p className="text-xs md:text-sm text-muted-foreground">Published</p>
          </div>
          <p className="text-xl md:text-2xl font-bold font-display text-success">{publishedCount}</p>
        </div>
        <div className="dashboard-card">
          <div className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-warning" />
            <p className="text-xs md:text-sm text-muted-foreground">Drafts</p>
          </div>
          <p className="text-xl md:text-2xl font-bold font-display text-warning">{draftCount}</p>
        </div>
      </div>

      <div className="dashboard-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pages..."
              className="w-full pl-10 pr-4 py-2 border border-border rounded-sm text-sm bg-background outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        {/* Mobile card view */}
        <div className="md:hidden space-y-3">
          {filtered.map((page) => (
            <div key={page.id} className="border border-border rounded-md p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium text-sm">{page.title}</p>
                  <p className="text-xs text-muted-foreground font-mono">{page.slug}</p>
                </div>
                <span className={page.status === "published" ? "badge-success" : "badge-warning"}>{page.status}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{page.sections} sections · {page.views} views</span>
                <span>{page.lastModified}</span>
              </div>
              <div className="flex gap-2 mt-3">
                <button className="flex-1 text-xs py-1.5 border border-border rounded-sm hover:bg-secondary transition-colors flex items-center justify-center gap-1">
                  <Eye className="h-3 w-3" /> Preview
                </button>
                <button className="flex-1 text-xs py-1.5 btn-accent rounded-sm flex items-center justify-center gap-1">
                  <Edit className="h-3 w-3" /> Edit
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="text-left px-3 py-2">Page</th>
                <th className="text-left px-3 py-2">Slug</th>
                <th className="text-right px-3 py-2">Sections</th>
                <th className="text-right px-3 py-2">Views</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Last Modified</th>
                <th className="text-right px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((page) => (
                <tr key={page.id} className="hover:bg-secondary/50 transition-colors">
                  <td className="px-3 py-3 font-medium">{page.title}</td>
                  <td className="px-3 py-3 text-muted-foreground font-mono text-xs">{page.slug}</td>
                  <td className="px-3 py-3 text-right">{page.sections}</td>
                  <td className="px-3 py-3 text-right text-muted-foreground">{page.views.toLocaleString()}</td>
                  <td className="px-3 py-3">
                    <span className={page.status === "published" ? "badge-success" : "badge-warning"}>{page.status}</span>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{page.lastModified}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button className="p-1.5 hover:bg-secondary rounded-sm transition-colors"><Eye className="h-4 w-4" /></button>
                      <button className="p-1.5 hover:bg-secondary rounded-sm transition-colors"><Edit className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CMS structure preview */}
      <div className="dashboard-card">
        <h3 className="font-display font-bold text-sm uppercase mb-4">Content Structure (JSON)</h3>
        <pre className="bg-secondary rounded-sm p-4 text-xs overflow-x-auto text-muted-foreground">
{JSON.stringify({
  page: "homepage",
  sections: [
    { type: "hero", data: { titleKey: "hero.title", subtitleKey: "hero.subtitle", ctaKey: "hero.cta" } },
    { type: "features", data: { items: ["features.experience", "features.fleet", "features.canadian", "features.quality"] } },
    { type: "about", data: { titleKey: "about.title", descriptionKey: "about.description" } },
    { type: "products", data: { titleKey: "products.new", limit: 4 } },
    { type: "banner", data: { titleKey: "banner.stock.title" } },
    { type: "wholesale", data: { titleKey: "wholesale.title" } },
  ],
}, null, 2)}
        </pre>
      </div>
    </div>
  );
}
