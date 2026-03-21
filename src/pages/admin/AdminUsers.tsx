import React, { useState } from "react";
import { Plus, Search, Edit, Trash2, Eye, Check, X, Mail, Shield, Clock } from "lucide-react";
import { AdminUser, UserRole } from "@/types/admin";

const mockUsers: AdminUser[] = [
  { id: "user-1", name: "Marc Dupont", email: "marc@remquip.ca", role: "admin", status: "active", created: "2024-01-15", lastLogin: "2026-03-18" },
  { id: "user-2", name: "Julie Martin", email: "julie@remquip.ca", role: "manager", status: "active", created: "2024-02-20", lastLogin: "2026-03-17" },
  { id: "user-3", name: "Pierre Gagnon", email: "pierre@remquip.ca", role: "manager", status: "active", created: "2024-03-10", lastLogin: "2026-03-16" },
  { id: "user-4", name: "Sarah Johnson", email: "sarah@remquip.ca", role: "user", status: "active", created: "2024-06-05", lastLogin: "2026-03-15" },
  { id: "user-5", name: "David Chen", email: "david@remquip.ca", role: "user", status: "inactive", created: "2024-08-12", lastLogin: "2026-02-20" },
  { id: "user-6", name: "Lisa Rousseau", email: "lisa@remquip.ca", role: "user", status: "active", created: "2025-01-08", lastLogin: "2026-03-10" },
];

const roleColors: Record<UserRole, string> = {
  admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  manager: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  user: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
};

const statusStyles: Record<string, string> = {
  active: "badge-success",
  inactive: "badge-warning",
};

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "">();
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "user" as UserRole });
  const [users, setUsers] = useState(mockUsers);
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = users.filter((u) => {
    const matchesSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = !roleFilter || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleCreateUser = () => {
    if (!formData.name || !formData.email) return;

    if (editingId) {
      setUsers(users.map((u) => u.id === editingId ? { ...u, name: formData.name, email: formData.email, role: formData.role as UserRole } : u));
      setEditingId(null);
    } else {
      setUsers([
        ...users,
        {
          id: `user-${Date.now()}`,
          name: formData.name,
          email: formData.email,
          role: formData.role as UserRole,
          status: "active",
          created: new Date().toISOString().split("T")[0],
        },
      ]);
    }

    setFormData({ name: "", email: "", password: "", role: "user" });
    setShowForm(false);
  };

  const handleEditUser = (user: AdminUser) => {
    setFormData({ name: user.name, email: user.email, password: "", role: user.role });
    setEditingId(user.id);
    setShowForm(true);
  };

  const handleDeleteUser = (userId: string) => {
    setUsers(users.filter((u) => u.id !== userId));
    setSelectedUser(null);
  };

  const handleToggleStatus = (userId: string) => {
    setUsers(
      users.map((u) =>
        u.id === userId
          ? { ...u, status: u.status === "active" ? "inactive" : "active" }
          : u
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Create and manage admin users. Assign page access separately in Access Control.</p>
        </div>
        <button
          onClick={() => { setFormData({ name: "", email: "", password: "", role: "user" }); setEditingId(null); setShowForm(!showForm); }}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add User</span>
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="dashboard-card border-accent/50">
          <h3 className="font-display font-bold mb-4">{editingId ? "Edit User" : "Create New User"}</h3>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Full Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <input
              type="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
            {!editingId && (
              <input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            )}
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="user">User</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
            <div className="flex gap-2">
              <button
                onClick={handleCreateUser}
                className="flex-1 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
              >
                {editingId ? "Update User" : "Create User"}
              </button>
              <button
                onClick={() => { setShowForm(false); setEditingId(null); }}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <select
          value={roleFilter || ""}
          onChange={(e) => setRoleFilter((e.target.value || "") as UserRole | "")}
          className="px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-accent text-sm"
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="user">User</option>
        </select>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length > 0 ? (
          filtered.map((user) => (
            <div
              key={user.id}
              onClick={() => setSelectedUser(user)}
              className="dashboard-card cursor-pointer hover:border-accent transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-medium text-sm truncate">{user.name}</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Mail className="h-3 w-3" />
                    {user.email}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${roleColors[user.role]} font-medium flex items-center gap-1`}>
                  <Shield className="h-3 w-3" />
                  {user.role}
                </span>
              </div>

              <div className="space-y-2 py-3 border-y border-border">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Status</span>
                  <span className={statusStyles[user.status]}>{user.status}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Created</span>
                  <span>{user.created}</span>
                </div>
                {user.lastLogin && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Last Login
                    </span>
                    <span>{user.lastLogin}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditUser(user);
                  }}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs border border-border rounded hover:bg-secondary transition-colors"
                >
                  <Edit className="h-3 w-3" />
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleStatus(user.id);
                  }}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs border border-border rounded hover:bg-secondary transition-colors"
                >
                  {user.status === "active" ? (
                    <>
                      <X className="h-3 w-3" />
                      Disable
                    </>
                  ) : (
                    <>
                      <Check className="h-3 w-3" />
                      Enable
                    </>
                  )}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteUser(user.id);
                  }}
                  className="px-2 py-1.5 text-xs border border-destructive text-destructive rounded hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground">No users found.</p>
          </div>
        )}
      </div>

      {/* Selected User Detail */}
      {selectedUser && (
        <div className="fixed inset-0 bg-foreground/20 flex items-center justify-center z-50 p-4" onClick={() => setSelectedUser(null)}>
          <div
            className="bg-card rounded-lg shadow-lg max-w-md w-full p-6 border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-display font-bold mb-4">{selectedUser.name}</h2>
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{selectedUser.email}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Role</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${roleColors[selectedUser.role]}`}>{selectedUser.role}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className={statusStyles[selectedUser.status]}>{selectedUser.status}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Created</span>
                <span>{selectedUser.created}</span>
              </div>
              {selectedUser.lastLogin && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last Login</span>
                  <span>{selectedUser.lastLogin}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  handleEditUser(selectedUser);
                  setSelectedUser(null);
                }}
                className="flex-1 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => setSelectedUser(null)}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
