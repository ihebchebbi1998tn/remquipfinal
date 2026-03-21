import React, { useState } from "react";
import { Plus, Search, Grid3x3, User, CheckCircle, XCircle, AlertCircle, Eye, Edit, Trash2, Copy } from "lucide-react";
import { AdminUser, AdminPage, AccessRecord } from "@/types/admin";

// Mock data
const mockUsers: AdminUser[] = [
  { id: "user-1", name: "Marc Dupont", email: "marc@remquip.ca", role: "admin", status: "active", created: "2024-01-15" },
  { id: "user-2", name: "Julie Martin", email: "julie@remquip.ca", role: "manager", status: "active", created: "2024-02-20" },
  { id: "user-3", name: "Pierre Gagnon", email: "pierre@remquip.ca", role: "manager", status: "active", created: "2024-03-10" },
  { id: "user-4", name: "Sarah Johnson", email: "sarah@remquip.ca", role: "user", status: "active", created: "2024-06-05" },
  { id: "user-5", name: "David Chen", email: "david@remquip.ca", role: "user", status: "inactive", created: "2024-08-12" },
];

const mockPages: AdminPage[] = [
  { id: "page-1", name: "Dashboard", slug: "dashboard", description: "Admin dashboard overview", order: 1, isPublic: false },
  { id: "page-2", name: "Products", slug: "products", description: "Product management", order: 2, isPublic: false },
  { id: "page-3", name: "Inventory", slug: "inventory", description: "Inventory management", order: 3, isPublic: false },
  { id: "page-4", name: "Orders", slug: "orders", description: "Order management", order: 4, isPublic: false },
  { id: "page-5", name: "Customers", slug: "customers", description: "Customer management", order: 5, isPublic: false },
  { id: "page-6", name: "Analytics", slug: "analytics", description: "Analytics & reporting", order: 6, isPublic: false },
];

const mockAccess: AccessRecord[] = [
  { userId: "user-1", pageId: "page-1", canView: true, canEdit: true, canDelete: true, assigned: "2024-01-15" },
  { userId: "user-1", pageId: "page-2", canView: true, canEdit: true, canDelete: true, assigned: "2024-01-15" },
  { userId: "user-1", pageId: "page-3", canView: true, canEdit: true, canDelete: true, assigned: "2024-01-15" },
  { userId: "user-1", pageId: "page-4", canView: true, canEdit: true, canDelete: true, assigned: "2024-01-15" },
  { userId: "user-1", pageId: "page-5", canView: true, canEdit: true, canDelete: true, assigned: "2024-01-15" },
  { userId: "user-1", pageId: "page-6", canView: true, canEdit: true, canDelete: true, assigned: "2024-01-15" },
  { userId: "user-2", pageId: "page-1", canView: true, canEdit: false, canDelete: false, assigned: "2024-02-20" },
  { userId: "user-2", pageId: "page-2", canView: true, canEdit: true, canDelete: false, assigned: "2024-02-20" },
  { userId: "user-2", pageId: "page-3", canView: true, canEdit: true, canDelete: false, assigned: "2024-02-20" },
  { userId: "user-2", pageId: "page-4", canView: true, canEdit: false, canDelete: false, assigned: "2024-02-20" },
  { userId: "user-3", pageId: "page-1", canView: true, canEdit: false, canDelete: false, assigned: "2024-03-10" },
  { userId: "user-3", pageId: "page-2", canView: true, canEdit: false, canDelete: false, assigned: "2024-03-10" },
  { userId: "user-4", pageId: "page-1", canView: true, canEdit: false, canDelete: false, assigned: "2024-06-05" },
];

type ViewMode = "matrix" | "user" | "page";
type PermissionLevel = "none" | "view" | "edit" | "admin";

export default function AdminAccess() {
  const [viewMode, setViewMode] = useState<ViewMode>("matrix");
  const [search, setSearch] = useState("");
  const [accessRecords, setAccessRecords] = useState(mockAccess);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkUsers, setBulkUsers] = useState<string[]>([]);
  const [bulkPages, setBulkPages] = useState<string[]>([]);
  const [bulkPerms, setBulkPerms] = useState({ canView: true, canEdit: false, canDelete: false });

  const handleAccessChange = (userId: string, pageId: string, newAccess: { canView: boolean; canEdit: boolean; canDelete: boolean }) => {
    const existing = accessRecords.find((a) => a.userId === userId && a.pageId === pageId);
    if (existing) {
      setAccessRecords(accessRecords.map((a) => (a.userId === userId && a.pageId === pageId ? { ...a, ...newAccess } : a)));
    } else {
      setAccessRecords([...accessRecords, { userId, pageId, ...newAccess, assigned: new Date().toISOString().split("T")[0] }]);
    }
  };

  const handleRevokeAccess = (userId: string, pageId: string) => {
    setAccessRecords(accessRecords.filter((a) => !(a.userId === userId && a.pageId === pageId)));
  };

  const handleBulkAssign = () => {
    const newRecords = [];
    for (const userId of bulkUsers) {
      for (const pageId of bulkPages) {
        const existing = accessRecords.find((a) => a.userId === userId && a.pageId === pageId);
        if (!existing) {
          newRecords.push({
            userId,
            pageId,
            ...bulkPerms,
            assigned: new Date().toISOString().split("T")[0],
          });
        }
      }
    }
    setAccessRecords([...accessRecords, ...newRecords]);
    setBulkUsers([]);
    setBulkPages([]);
    setShowBulkForm(false);
  };

  const handleDuplicateUserAccess = (fromUserId: string, toUserId: string) => {
    const userAccess = accessRecords.filter((a) => a.userId === fromUserId);
    const newRecords = userAccess.map((a) => ({
      ...a,
      userId: toUserId,
      assigned: new Date().toISOString().split("T")[0],
    }));
    setAccessRecords([...accessRecords, ...newRecords]);
  };

  const getPermissionCount = (userId: string) => {
    return accessRecords.filter((a) => a.userId === userId && a.canView).length;
  };

  const getAccessSummary = (userId: string, pageId: string) => {
    const access = accessRecords.find((a) => a.userId === userId && a.pageId === pageId);
    if (!access) return "none";
    if (access.canDelete) return "admin";
    if (access.canEdit) return "edit";
    if (access.canView) return "view";
    return "none";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold">Access Control</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage which pages each user can access and what actions they can perform.</p>
        </div>
        <button
          onClick={() => setShowBulkForm(!showBulkForm)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Bulk Assign</span>
        </button>
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-2 border-b border-border">
        {[
          { mode: "matrix", label: "Matrix View", icon: Grid3x3 },
          { mode: "user", label: "By User", icon: User },
          { mode: "page", label: "By Page", icon: AlertCircle },
        ].map((tab) => (
          <button
            key={tab.mode}
            onClick={() => setViewMode(tab.mode as ViewMode)}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors text-sm font-medium ${
              viewMode === tab.mode
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bulk Assign Form */}
      {showBulkForm && (
        <div className="dashboard-card border-accent/50">
          <h3 className="font-display font-bold mb-4">Bulk Assign Access</h3>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium block mb-2">Select Users</label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-lg p-2">
                {mockUsers.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bulkUsers.includes(u.id)}
                      onChange={(e) =>
                        setBulkUsers(e.target.checked ? [...bulkUsers, u.id] : bulkUsers.filter((id) => id !== u.id))
                      }
                      className="w-4 h-4 rounded"
                    />
                    {u.name}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">Select Pages</label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-lg p-2">
                {mockPages.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bulkPages.includes(p.id)}
                      onChange={(e) =>
                        setBulkPages(e.target.checked ? [...bulkPages, p.id] : bulkPages.filter((id) => id !== p.id))
                      }
                      className="w-4 h-4 rounded"
                    />
                    {p.name}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">Permissions</label>
              <div className="space-y-3 border border-border rounded-lg p-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkPerms.canView}
                    onChange={(e) => setBulkPerms({ ...bulkPerms, canView: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  Can View
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkPerms.canEdit}
                    onChange={(e) => setBulkPerms({ ...bulkPerms, canEdit: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  Can Edit
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkPerms.canDelete}
                    onChange={(e) => setBulkPerms({ ...bulkPerms, canDelete: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  Can Delete
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleBulkAssign}
              disabled={bulkUsers.length === 0 || bulkPages.length === 0}
              className="flex-1 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              Assign to {bulkUsers.length} users × {bulkPages.length} pages
            </button>
            <button
              onClick={() => setShowBulkForm(false)}
              className="px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* MATRIX VIEW */}
      {viewMode === "matrix" && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-secondary border-b border-border">
                <th className="p-3 text-left font-medium sticky left-0 bg-secondary">User</th>
                {mockPages.map((page) => (
                  <th key={page.id} className="p-2 text-center font-medium text-xs whitespace-nowrap">{page.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockUsers.map((user) => (
                <tr key={user.id} className="border-b border-border hover:bg-secondary/50 transition-colors">
                  <td className="p-3 font-medium sticky left-0 bg-background hover:bg-secondary/50 truncate max-w-[150px]">{user.name}</td>
                  {mockPages.map((page) => {
                    const access = accessRecords.find((a) => a.userId === user.id && a.pageId === page.id);
                    return (
                      <td key={`${user.id}-${page.id}`} className="p-2 text-center">
                        {access ? (
                          <div className="flex items-center justify-center gap-1">
                            {access.canView && <Eye className="h-3.5 w-3.5 text-success" title="View" />}
                            {access.canEdit && <Edit className="h-3.5 w-3.5 text-info" title="Edit" />}
                            {access.canDelete && <Trash2 className="h-3.5 w-3.5 text-destructive" title="Delete" />}
                            <button
                              onClick={() => handleRevokeAccess(user.id, page.id)}
                              className="ml-1 text-xs px-1.5 py-0.5 rounded bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAccessChange(user.id, page.id, { canView: true, canEdit: false, canDelete: false })}
                            className="px-2 py-1 rounded text-xs bg-secondary text-muted-foreground hover:bg-accent hover:text-white transition-colors"
                          >
                            Grant
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* USER VIEW */}
      {viewMode === "user" && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="grid gap-4">
            {mockUsers
              .filter((u) => !search || u.name.toLowerCase().includes(search.toLowerCase()))
              .map((user) => (
                <div key={user.id} className="dashboard-card">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-medium">{user.name}</h3>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        const fromUser = mockUsers[0];
                        handleDuplicateUserAccess(fromUser.id, user.id);
                      }}
                      className="px-2 py-1.5 text-xs rounded border border-border hover:bg-secondary transition-colors flex items-center gap-1"
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </button>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Access: {getPermissionCount(user.id)} pages</p>
                    {mockPages.map((page) => {
                      const access = accessRecords.find((a) => a.userId === user.id && a.pageId === page.id);
                      return (
                        <div key={page.id} className="flex items-center justify-between p-2 border border-border rounded text-sm">
                          <span>{page.name}</span>
                          <div className="flex items-center gap-2">
                            <select
                              value={getAccessSummary(user.id, page.id)}
                              onChange={(e) => {
                                const val = e.target.value as PermissionLevel;
                                if (val === "none") {
                                  handleRevokeAccess(user.id, page.id);
                                } else if (val === "view") {
                                  handleAccessChange(user.id, page.id, { canView: true, canEdit: false, canDelete: false });
                                } else if (val === "edit") {
                                  handleAccessChange(user.id, page.id, { canView: true, canEdit: true, canDelete: false });
                                } else if (val === "admin") {
                                  handleAccessChange(user.id, page.id, { canView: true, canEdit: true, canDelete: true });
                                }
                              }}
                              className="px-2 py-1 rounded border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-accent"
                            >
                              <option value="none">No Access</option>
                              <option value="view">View Only</option>
                              <option value="edit">Edit</option>
                              <option value="admin">Admin</option>
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* PAGE VIEW */}
      {viewMode === "page" && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search pages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="grid gap-4">
            {mockPages
              .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()))
              .map((page) => {
                const pageUsers = mockUsers.filter((u) => accessRecords.some((a) => a.userId === u.id && a.pageId === page.id));
                return (
                  <div key={page.id} className="dashboard-card">
                    <div className="mb-4">
                      <h3 className="font-medium">{page.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{page.description}</p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Access: {pageUsers.length} users</p>
                      {mockUsers.map((user) => {
                        const access = accessRecords.find((a) => a.userId === user.id && a.pageId === page.id);
                        return (
                          <div key={user.id} className="flex items-center justify-between p-2 border border-border rounded text-sm">
                            <span className="text-sm">{user.name}</span>
                            <div className="flex items-center gap-2">
                              {access ? (
                                <>
                                  <div className="flex gap-1 text-xs">
                                    {access.canView && <span className="px-1.5 py-0.5 rounded bg-success/20 text-success">View</span>}
                                    {access.canEdit && <span className="px-1.5 py-0.5 rounded bg-info/20 text-info">Edit</span>}
                                    {access.canDelete && <span className="px-1.5 py-0.5 rounded bg-destructive/20 text-destructive">Delete</span>}
                                  </div>
                                  <button
                                    onClick={() => handleRevokeAccess(user.id, page.id)}
                                    className="px-2 py-1 text-xs rounded border border-destructive text-destructive hover:bg-destructive/10 transition-colors"
                                  >
                                    Remove
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleAccessChange(user.id, page.id, { canView: true, canEdit: false, canDelete: false })}
                                  className="px-2 py-1 text-xs rounded bg-accent text-white hover:bg-accent/90 transition-colors"
                                >
                                  Grant
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
