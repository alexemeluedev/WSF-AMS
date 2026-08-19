import { useEffect, useMemo, useState } from "react";
import { auditService } from "../api/apiClient";

const ZonalAuditHistory = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 🔑 ADVANCED FILTERS SYSTEM WITH DATE TRACKERS
  const [filters, setFilters] = useState({
    action: "",
    resourceType: "",
    actorEmail: "",
    startDate: "",
    endDate: "",
  });

  // 🔑 PAGINATION METRIC CONFIGURATIONS
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (filters.action) params.set("action", filters.action);
        if (filters.resourceType)
          params.set("resourceType", filters.resourceType);
        if (filters.actorEmail) params.set("actorEmail", filters.actorEmail);

        // 🔄 Append date bounds into your backend query router schema
        if (filters.startDate) params.set("startDate", filters.startDate);
        if (filters.endDate) params.set("endDate", filters.endDate);

        const query = params.toString() ? `?${params.toString()}` : "";
        const response = await auditService.list(query);
        // console.log("Raw logs array length from backend database:", response.logs?.length); // 📊 Check your browser console log!
        setLogs(response.logs || []);

        // 🔄 Reset cursor location on parameter updates
        setCurrentPage(1);
      } catch (err) {
        setError(err.message || "Unable to load audit logs.");
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [filters]);

  // 🔑 CLIENT MATRIX COMPILATION ENGINE
  const totalPages = Math.ceil(logs.length / rowsPerPage) || 1;

  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return logs.slice(startIndex, endIndex);
  }, [logs, currentPage, rowsPerPage]);

  // 🔄 CLEAR CONSOLE PARAMS HANDLER
  const handleClearFilters = () => {
    setFilters({
      action: "",
      resourceType: "",
      actorEmail: "",
      startDate: "",
      endDate: "",
    });
    setCurrentPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-6">
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
        {/* PANEL CONTROL HEADER GRID LAYER */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Admin Audit History
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Audit trail for admin actions, member changes, and attendance
                activity.
              </p>
            </div>

            {/* DYNAMIC VIEW ROW PORTALS DROPDOWN MENU */}
            <div className="flex items-center gap-2 self-start md:self-auto">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Show:
              </span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 focus:border-indigo-500 focus:outline-none cursor-pointer"
              >
                <option value={10}>10 rows</option>
                <option value={25}>25 rows</option>
                <option value={50}>50 rows</option>
              </select>
            </div>
          </div>

          {/* ADVANCED MULTI-PARAMETER DYNAMIC FORM CONTROL PANEL */}
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-6 items-end bg-slate-50/50 border border-slate-100 p-4 rounded-2xl">
            <label className="block">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Action
              </span>
              <input
                type="text"
                value={filters.action}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, action: e.target.value }))
                }
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
                placeholder="Create member"
              />
            </label>

            <label className="block">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Resource
              </span>
              <input
                type="text"
                value={filters.resourceType}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    resourceType: e.target.value,
                  }))
                }
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
                placeholder="Member, User"
              />
            </label>

            <label className="block">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Actor Email
              </span>
              <input
                type="text"
                value={filters.actorEmail}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    actorEmail: e.target.value,
                  }))
                }
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
                placeholder="admin@example.com"
              />
            </label>

            {/* DATE METRIC FIELD INPUTS */}
            <label className="block">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Start Date
              </span>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, startDate: e.target.value }))
                }
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none cursor-pointer"
              />
            </label>

            <label className="block">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                End Date
              </span>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, endDate: e.target.value }))
                }
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none cursor-pointer"
              />
            </label>

            {/* RESET FLUSH BUTTON ACTION CONTROLLERS */}
            <button
              type="button"
              onClick={handleClearFilters}
              className="w-full h-8.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-600 shadow-2xs transition-colors cursor-pointer"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* METADATA SUMMARY BAR SECTOR CONTAINER */}
        <div className="rounded-3xl bg-slate-50 border border-slate-200 p-4 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            {loading
              ? "Loading audit logs..."
              : `Showing ${paginatedLogs.length} of ${logs.length} total audit record${logs.length === 1 ? "" : "s"}.`}
          </p>
          {!loading && logs.length > 0 && (
            <span className="text-xs font-medium text-slate-400">
              Page {currentPage} of {totalPages}
            </span>
          )}
        </div>

        {error ? (
          <div className="rounded-3xl bg-rose-50 border border-rose-200 p-4 text-rose-700">
            {error}
          </div>
        ) : null}

        {/* MAIN DATA VIEW GRID PORTAL */}
        <div className="overflow-x-auto rounded-3xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] tracking-[0.2em]">
              <tr>
                <th className="px-4 py-3 text-left">Timestamp</th>
                <th className="px-4 py-3 text-left">Actor</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Action</th>
                <th className="px-4 py-3 text-left">Resource</th>
                <th className="px-4 py-3 text-left">Summary</th>
                <th className="px-4 py-3 text-left">Details</th>
                <th className="px-4 py-3 text-left">IP</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    Loading audit logs...
                  </td>
                </tr>
              ) : paginatedLogs.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    No audit logs found for the selected filters.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                      {log.actorEmail || "system"}
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                      {log.actorRole || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                      {log.resourceType}
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-45 wrap-break-word">
                      {log.resourceSummary}
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-60 wrap-break-word">
                      {log.details}
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                      {log.ip || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* NAVIGATION PANEL FOOTER */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 pt-4 animate-in fade-in duration-200">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:hover:bg-white cursor-pointer disabled:cursor-not-allowed"
            >
              Previous Page
            </button>

            <div className="hidden sm:flex items-center gap-1.5">
              {[...Array(totalPages)].map((_, index) => {
                const pageNum = index + 1;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      currentPage === pageNum
                        ? "bg-slate-900 text-white shadow-xs"
                        : "text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => prev + 1)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:hover:bg-white cursor-pointer disabled:cursor-not-allowed"
            >
              Next Page
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ZonalAuditHistory;
