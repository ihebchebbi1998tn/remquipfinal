import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api, type AccountApplication, unwrapPagination } from "@/lib/api";
import {
  FileText, Search, Check, X, Eye, Copy, ExternalLink,
  ChevronLeft, ChevronRight, Loader2, Building2, Mail,
  Phone, Clock, AlertCircle, Filter
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pending:  { label: "Pending",  color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/30" },
  approved: { label: "Approved", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
  rejected: { label: "Rejected", color: "text-red-400",     bg: "bg-red-500/10 border-red-500/30" },
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CFG[status] ?? STATUS_CFG.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${c.bg} ${c.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.color.replace("text", "bg")}`} />
      {c.label}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-sm py-1.5 border-b border-[#2a3441]/50 last:border-0">
      <span className="text-slate-500 w-40 flex-shrink-0">{label}</span>
      <span className="text-slate-200">{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export default function AdminApplications() {
  const navigate = useNavigate();
  const [apps, setApps] = useState<AccountApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selected, setSelected] = useState<AccountApplication | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAccountApplications(page, 20, statusFilter || undefined);
      setApps(res.data ?? []);
      const pag = unwrapPagination(res);
      setTotalPages(pag?.pages ?? 1);
    } catch (e) {
      console.error("Failed to load applications", e);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await api.getAccountApplication(id);
      setSelected(res.data ?? null);
    } catch { /* ignore */ } finally { setDetailLoading(false); }
  };

  const handleApprove = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      await api.approveAccountApplication(selected.id);
      setSelected(null);
      fetchList();
    } catch (e) {
      alert("Approval failed: " + (e as Error).message);
    } finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      await api.rejectAccountApplication(selected.id, rejectReason);
      setSelected(null);
      setShowRejectModal(false);
      setRejectReason("");
      fetchList();
    } catch (e) {
      alert("Rejection failed: " + (e as Error).message);
    } finally { setActionLoading(false); }
  };

  const copyFormLink = () => {
    const url = `${window.location.origin}/apply`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  /* ── Detail View ── */
  if (selected) {
    const a = selected;
    const distTypes = Array.isArray(a.distributor_type) ? a.distributor_type.join(", ") : a.distributor_type ?? "";
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
            <ChevronLeft className="h-4 w-4" /> Back to list
          </button>
          <StatusBadge status={a.status} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">{a.company_name}</h2>
            <p className="text-sm text-slate-500 mt-1">Submitted {new Date(a.created_at).toLocaleDateString()} · {a.contact_person}</p>
          </div>
          {a.status === "pending" && (
            <div className="flex gap-3">
              <button onClick={() => setShowRejectModal(true)} disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition-colors disabled:opacity-50">
                <X className="h-4 w-4" /> Reject
              </button>
              <button onClick={handleApprove} disabled={actionLoading}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 transition-colors disabled:opacity-50">
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Approve & Create Account
              </button>
            </div>
          )}
        </div>

        {/* Sections */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Company Info */}
          <div className="bg-[#141a22] border border-[#2a3441] rounded-xl p-5">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#e85d04]" /> Company Information
            </h3>
            <InfoRow label="Company Name" value={a.company_name} />
            <InfoRow label="NEQ / TVA" value={a.neq_tva} />
            <InfoRow label="Contact Person" value={a.contact_person} />
            <InfoRow label="Title" value={a.contact_title} />
            <InfoRow label="Phone" value={a.phone} />
            <InfoRow label="Email" value={a.email} />
            <InfoRow label="Distributor Type" value={distTypes} />
            {a.distributor_type_other && <InfoRow label="Other Type" value={a.distributor_type_other} />}
            <InfoRow label="Trucks" value={a.num_trucks?.toString()} />
            <InfoRow label="Trailers" value={a.num_trailers?.toString()} />
          </div>

          {/* Addresses */}
          <div className="bg-[#141a22] border border-[#2a3441] rounded-xl p-5">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Addresses</h3>
            <InfoRow label="Billing Address" value={a.billing_address} />
            <InfoRow label="Shipping Address" value={a.shipping_address} />
          </div>

          {/* Accounting */}
          <div className="bg-[#141a22] border border-[#2a3441] rounded-xl p-5">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Accounting & Payment</h3>
            <InfoRow label="Accounting Contact" value={a.accounting_contact} />
            <InfoRow label="Accounting Phone" value={a.accounting_phone} />
            <InfoRow label="Billing Email" value={a.billing_email} />
            <InfoRow label="Payment Terms" value={a.payment_terms} />
            <InfoRow label="Payment Method" value={a.payment_method} />
          </div>

          {/* Credit */}
          <div className="bg-[#141a22] border border-[#2a3441] rounded-xl p-5">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Credit References</h3>
            <InfoRow label="Bank Reference" value={a.bank_reference} />
            <InfoRow label="Credit Limit" value={a.credit_limit_requested ? `$${a.credit_limit_requested}` : undefined} />
            <InfoRow label="Supplier Ref 1" value={a.supplier_ref_1} />
            <InfoRow label="Supplier Ref 2" value={a.supplier_ref_2} />
          </div>

          {/* Needs */}
          <div className="bg-[#141a22] border border-[#2a3441] rounded-xl p-5">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Products & Needs</h3>
            <InfoRow label="Parts Needed" value={a.parts_needed} />
            <InfoRow label="Special Requests" value={a.special_requests} />
            <InfoRow label="Sales Rep" value={a.sales_representative} />
          </div>

          {/* Signature */}
          <div className="bg-[#141a22] border border-[#2a3441] rounded-xl p-5">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Authorization</h3>
            <InfoRow label="Signatory" value={a.signatory_name} />
            <InfoRow label="Title" value={a.signatory_title} />
            <InfoRow label="Date" value={a.signature_date} />
            {a.signature_data && (
              <div className="mt-3">
                <p className="text-xs text-slate-500 mb-2">Signature:</p>
                <div className="bg-white rounded-lg p-3 inline-block">
                  <img src={a.signature_data} alt="Signature" className="h-20 object-contain" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rejection reason if rejected */}
        {a.status === "rejected" && a.rejection_reason && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
            <h3 className="text-sm font-bold text-red-400 mb-2">Rejection Reason</h3>
            <p className="text-sm text-slate-300">{a.rejection_reason}</p>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowRejectModal(false)}>
            <div className="bg-[#141a22] border border-[#2a3441] rounded-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-slate-100">Reject Application</h3>
              <p className="text-sm text-slate-400">Optionally provide a reason for rejection:</p>
              <textarea
                className="w-full px-4 py-3 bg-[#1a222c] border border-[#2a3441] rounded-lg text-slate-100 placeholder-slate-500 outline-none focus:border-red-500 resize-none"
                rows={3} value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Reason for rejection..."
              />
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200">Cancel</button>
                <button onClick={handleReject} disabled={actionLoading}
                  className="px-5 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-500 disabled:opacity-50">
                  {actionLoading ? "Rejecting..." : "Confirm Reject"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── List View ── */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Account Applications</h1>
          <p className="text-sm text-slate-500 mt-1">Review and manage customer account applications</p>
        </div>
        <div className="flex gap-3">
          <button onClick={copyFormLink}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#2a3441] text-sm text-slate-300 hover:bg-[#1a222c] transition-colors">
            {linkCopied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            {linkCopied ? "Copied!" : "Copy Form Link"}
          </button>
          <a href="/apply" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#e85d04] text-[#0f1419] text-sm font-bold hover:bg-[#f97316] transition-colors">
            <ExternalLink className="h-4 w-4" /> Open Form
          </a>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-slate-500" />
        {["", "pending", "approved", "rejected"].map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              statusFilter === s
                ? "border-[#e85d04] bg-[#e85d04]/10 text-[#e85d04]"
                : "border-[#2a3441] text-slate-400 hover:border-slate-500"
            }`}>
            {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#141a22] border border-[#2a3441] rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[#e85d04]" />
          </div>
        ) : apps.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500">No applications found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a3441] text-left">
                <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Company</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Contact</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a3441]/50">
              {apps.map(a => (
                <tr key={a.id} className="hover:bg-[#1a222c] transition-colors cursor-pointer" onClick={() => openDetail(a.id)}>
                  <td className="px-5 py-4">
                    <div className="font-medium text-slate-200">{a.company_name}</div>
                    <div className="text-xs text-slate-500">{a.email}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-slate-300">{a.contact_person}</div>
                    {a.phone && <div className="text-xs text-slate-500">{a.phone}</div>}
                  </td>
                  <td className="px-5 py-4"><StatusBadge status={a.status} /></td>
                  <td className="px-5 py-4 text-slate-400">{new Date(a.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-4 text-right">
                    <button className="p-2 rounded-lg hover:bg-[#2a3441] text-slate-400 hover:text-slate-200 transition-colors">
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
            className="p-2 rounded-lg border border-[#2a3441] text-slate-400 hover:bg-[#1a222c] disabled:opacity-30">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
            className="p-2 rounded-lg border border-[#2a3441] text-slate-400 hover:bg-[#1a222c] disabled:opacity-30">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
