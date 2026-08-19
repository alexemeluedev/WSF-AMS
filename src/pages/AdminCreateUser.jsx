import { useEffect, useState } from "react";
import { authService } from "../api/apiClient.js";
import { Toast } from "../components/Toast.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useStats } from "../contexts/StatsContext.jsx";

export default function AdminCreateUser() {
  const { refreshStats } = useStats();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "user",
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // 🔑 MASTER DATA POOL FOR ALL DATABASE USERS
  const [allUsers, setAllUsers] = useState([]);
  const [fetchingUsers, setFetchingUsers] = useState(false);

  // 🔄 FETCH ALL USERS FROM THE DATABASE ON MOUNT
  const loadUsersDirectory = async () => {
    try {
      setFetchingUsers(true);
      // Ensure authService.getAllUsers or authService.list is configured in your apiClient
      const response =
        (await authService.listUsers?.()) || (await authService.list?.()) || [];
      const userRecords = response?.users || response?.data || response || [];
      setAllUsers(
        userRecords.map((u) => ({
          id: u._id || u.id,
          email: u.email,
          role: u.role,
        })),
      );
    } catch (err) {
      console.error("Failed to load global user credentials directory:", err);
    } finally {
      setFetchingUsers(false);
    }
  };

  useEffect(() => {
    loadUsersDirectory();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setToast(null);

    const targetEmail = formData.email.trim().toLowerCase();

    try {
      await authService.register({
        email: targetEmail,
        password: formData.password,
        role: formData.role,
      });

      setToast({
        type: "success",
        message: `Account created for ${targetEmail} successfully.`,
      });
      await refreshStats();
      setFormData({ email: "", password: "", role: "user" });
      loadUsersDirectory(); // 🔄 Refresh collection directly from MongoDB
    } catch (error) {
      setToast({
        type: "danger",
        message: error.message || "Unable to create account right now.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveUser = async (userRecord) => {
    if (
      !window.confirm(
        `Completely revoke access and delete profile for ${userRecord.email}?`,
      )
    )
      return;

    try {
      setLoading(true);

      // 🚀 Executes deletion through your backend controller routing middleware rules
      await authService.remove(userRecord.id);

      // ✅ Re-sync interface array cleanly
      setAllUsers((prev) => prev.filter((u) => u.id !== userRecord.id));

      setToast({
        type: "success",
        message: `Account ${userRecord.email} permanently dropped from data clusters.`,
      });
      await refreshStats();
    } catch (error) {
      setToast({
        type: "danger",
        message:
          error.message || "Could not complete account destruction routine.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] rounded-3xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm sm:p-8 space-y-6">
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70 sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.3em] text-indigo-600">
              Admin Control
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">
              Create New Portal User
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              This page is restricted to administrators and uses the existing
              registration controller to create accounts safely.
            </p>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-700">
            Restricted
          </span>
        </div>

        <div className="mb-6 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm text-indigo-700">
          <p className="font-medium">
            Signed in as {user?.email || "Administrator"}
          </p>
          <p className="mt-1 text-indigo-600">
            Only approved admins can create new users from this page.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Email Address
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="new.user@example.com"
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength="6"
              placeholder="Create a secure password"
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Account Role
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300 cursor-pointer"
          >
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>
      </div>

      {/* 🔑 MASTER REGISTERED GLOBAL USERS DIRECTORY VIEW CARD */}
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/40">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
          System Portal Access Users Directory
        </h2>

        {fetchingUsers ? (
          <div className="text-center py-6 text-xs text-slate-400 font-semibold animate-pulse">
            Loading total membership user lists from MongoDB database server...
          </div>
        ) : allUsers.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400 font-medium italic">
            No registered platform application access users found.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {allUsers.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between py-3 text-xs"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-slate-800">
                    {u.email}
                  </span>
                  <span className="text-[10px] text-slate-400 capitalize font-medium">
                    Role Assignment: {u.role}
                  </span>
                </div>
                {/* 🛡️ Hide delete button for the currently active admin session profile */}
                {u.id !== user?.id && u.id !== user?._id ? (
                  <button
                    type="button"
                    onClick={() => handleRemoveUser(u)}
                    className="px-3 py-1.5 text-[11px] font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 rounded-xl transition-all cursor-pointer border border-rose-100"
                  >
                    Remove User
                  </button>
                ) : (
                  <span className="text-[10px] bg-slate-100 text-slate-400 px-2 py-1 rounded-lg font-medium">
                    Current Session
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          duration={4000}
        />
      )}
    </div>
  );
}
