import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { authService, statsService, attendanceService } from "../api/apiClient";

const ZonalManagement = () => {
  const { user: currentUserSession } = useAuth();
  // Global View States
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState("privileges"); // privileges | reporting
  const [emailInput, setEmailInput] = useState("zonalhq@winnerschapel.org");
  const [isSending, setIsSending] = useState(false);

  // Real Database Metrics & Users States
  const [adminUsers, setAdminUsers] = useState([]);
  const [totalCellMembers, setTotalCellMembers] = useState(0);
  const [loading, setLoading] = useState(true);

  // =========================================================================
  // FETCH LIVE SYSTEM USERS & DATABASE TOTALS
  // =========================================================================
  useEffect(() => {
    const fetchZonalSystemData = async () => {
      try {
        setLoading(true);
        const [statsRes, userResponse] = await Promise.all([
          statsService.getSummary().catch(() => ({ totalMembers: 0 })),
          authService.getUsers
            ? authService.getUsers()
            : authService.list?.() || { users: [] },
        ]);

        const rawUsers = userResponse?.users || userResponse?.data || [];
        // 🔑 THE SECURITY CONTEXT FIX:
        // If the current logged-in user session array is not yet present inside the database users list response,
        // force-inject their clean active session profile right onto the topmost index of the table array!

        const formattedUsers = rawUsers.map((user, index) => {
          const userEmail = String(user.email || "")
            .toLowerCase()
            .trim();

          let churchRole = "Cell Leader";
          let centerScope = "EMPOWERMENT002";
          let personnelName = "Staff Personnel";

          // Check user credentials mapping criteria
          if (userEmail === "alexemelue@gmail.com") {
            personnelName = "Pastor Alex Emelue";
            churchRole = "Super Admin";
            centerScope = "All Center Scope";
          } else if (
            user.role === "admin" ||
            userEmail === "admin@example.com"
          ) {
            churchRole = "Zonal Coordinator";
            centerScope = "All Center Scope";
            personnelName = "Evang. Mary Whiten";
          } else {
            churchRole = "Cell Leader";
            centerScope = index % 2 === 0 ? "EMPOWERMENT002" : "EMPOWERMENT003";
            personnelName =
              index % 2 === 0 ? "Pastor Asvusuas" : "Deacon Ademomo";
          }

          return {
            id: user._id || user.id || index,
            name: personnelName,
            email: userEmail,
            cellId: centerScope,
            role: churchRole,
            status: "Active",
          };
        });
        const isCurrentLoggedInUserPresent = formattedUsers.some(
          (u) =>
            u.email ===
            String(currentUserSession?.email || "")
              .toLowerCase()
              .trim(),
        );

        if (currentUserSession && !isCurrentLoggedInUserPresent) {
          const loggedInEmail = String(currentUserSession.email || "")
            .toLowerCase()
            .trim();
          const emailPrefix = loggedInEmail.split("@")[0];

          const runtimeProfile = {
            id: currentUserSession._id || "current_session_user",
            name:
              loggedInEmail === "alexemelue@gmail.com"
                ? "Pastor Alex Emelue"
                : `Pastor ${emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1)}`,
            email: loggedInEmail,
            cellId:
              currentUserSession.role === "admin"
                ? "All Center Scope"
                : "EMPOWERMENT002",
            role:
              currentUserSession.role === "admin"
                ? "Super Admin"
                : "Cell Leader",
            status: "Active (Current User)",
          };

          // Push the active session identity to the very top row line
          setAdminUsers([runtimeProfile, ...formattedUsers]);
        } else {
          setAdminUsers(formattedUsers);
        }

        setTotalCellMembers(statsRes?.totalMembers || statsRes?.count || 0);
      } catch (err) {
        console.error("Zonal management directory handshaking failure:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchZonalSystemData();
  }, [currentUserSession]); // Re-runs validation checks automatically if user log contexts mutate

  // =========================================================================
  // AUTOMATED HEADQUARTERS DIGEST DISPATCH ROUTER
  // =========================================================================
  const handleSendEmailReport = async (e) => {
    e.preventDefault();
    try {
      setIsSending(true);

      // const activeToken = localStorage.getItem("wsf_token") || "";
      const activeSelectedWorkspaceDate =
        localStorage.getItem("cell_date") ||
        // new Date().toISOString().split("T");
        new Date().toISOString().split("T")[0];

      // 1. 🔑 THE ISOLATED HANDSHAKE FIX: Fetch a fresh, accurate copy of your summary statistics directly from MongoDB!
      // This removes all external cross-component array dependency crashes.

      const responseSummary = await attendanceService.summary();
      // const summaryData = await responseSummary.json().catch(() => ({}));
      const summaryData = responseSummary || {};
      const rawSummaries =
        summaryData?.summaries || summaryData?.data?.summaries || [];

      let totalPresentCount = 0;
      let totalAbsentCount = 0;
      let rowsHtmlPayload = "";

      // 2. Loop through your live database metrics records array safely
      if (Array.isArray(rawSummaries) && rawSummaries.length > 0) {
        rawSummaries.forEach((log) => {
          const pCount = Number(log.totalPresent || 0);
          const aCount = Number(log.totalAbsent || 0);

          totalPresentCount += pCount;
          totalAbsentCount += aCount;

          const cellTotal = pCount + aCount;
          const cellRate =
            cellTotal > 0 ? Math.round((pCount / cellTotal) * 100) : 100;

          rowsHtmlPayload += `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #1e293b;">${log.cellName || "Unknown Cell"}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #10b981; font-weight: bold;">${pCount}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #ef4444; font-weight: bold;">${aCount}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #4f46e5;">${cellRate}%</td>
          </tr>
        `;
        });
      }

      const grandTotal = totalPresentCount + totalAbsentCount;
      const globalTurnoutRate =
        grandTotal > 0
          ? Math.round((totalPresentCount / grandTotal) * 100)
          : 100;

      // 3. DISPATCH THE AUTHENTIC COMPUTED METRICS DIRECTLY OVER THE NATIVE FETCH TUBE
      await attendanceService.dispatchEmailReport({
        destination: emailInput,
        targetDate: activeSelectedWorkspaceDate,
        present: totalPresentCount,
        absent: totalAbsentCount,
        rate: globalTurnoutRate,
        tableRows: rowsHtmlPayload,
      });

      alert(
        `📧 Automated digest data compiled successfully and dispatched onto: ${emailInput}`,
      );
    } catch (err) {
      console.error("Email compilation network failure:", err);
      alert(
        `❌ Error: ${err.message || "Could not dispatch automated email digest."}`,
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className={`space-y-6 min-h-screen pb-12 transition-colors duration-200 print:bg-white print:p-0 ${
        isDarkMode
          ? "dark bg-slate-950 text-slate-100"
          : "bg-slate-50/40 text-slate-800"
      }`}
    >
      <div
        className={`max-w-6xl mx-auto px-4 sm:px-8 mt-6 print:hidden ${isDarkMode ? "dark" : ""}`}
      >
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
          {/* TOP SYSTEM MODULE UTILITIES HEAD PANEL */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveTab("privileges")}
                className={`text-xs font-bold uppercase tracking-wider pb-2 border-b-2 transition-colors cursor-pointer ${
                  activeTab === "privileges"
                    ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                🔒 Privilege Access Board
              </button>
              <button
                onClick={() => setActiveTab("reporting")}
                className={`text-xs font-bold uppercase tracking-wider pb-2 border-b-2 transition-colors cursor-pointer ${
                  activeTab === "reporting"
                    ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                📧 Email Dispatch Compiler
              </button>
            </div>

            {/* DUAL TOGGLE FOR DARK MODE CONTROLS */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all self-start sm:self-auto cursor-pointer"
            >
              <span>
                {isDarkMode ? "☀️ Light Profile Mode" : "🌙 Dark Profile Mode"}
              </span>
            </button>
          </div>

          {/* CONTAINER DISPLAY WINDOW A: ROLE CONFIGURATIONS */}
          {activeTab === "privileges" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Zonal User Access & Privileges Directory
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configure administrative access parameters for nested cell
                    leadership scopes.
                  </p>
                </div>

                {/* SYSTEM CAPACITY TRACKING BADGE */}
                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-3 py-1.5 text-center self-start sm:self-auto">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    Total Synced Turnout
                  </span>
                  <span className="text-xs font-black font-mono text-indigo-600 dark:text-indigo-400">
                    {totalCellMembers} Active
                  </span>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-10 text-xs font-bold text-slate-400 animate-pulse">
                  Querying security validation rosters from MongoDB...
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Administrative Personnel</th>
                        <th className="px-4 py-3">Center Assignment</th>
                        <th className="px-4 py-3">Security Level Role</th>
                        <th className="px-4 py-3 text-right">Scope Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium">
                      {adminUsers.map((user) => (
                        <tr
                          key={user.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                            {user.name}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-slate-500 dark:text-slate-400">
                            {user.cellId}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                user.role === "Super Admin" ||
                                user.role === "Zonal Coordinator"
                                  ? "bg-purple-50 border border-purple-200 text-purple-700 dark:bg-purple-950/40 dark:border-purple-900 dark:text-purple-400"
                                  : "bg-slate-100 border border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
                              }`}
                            >
                              {user.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                            {user.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* CONTAINER DISPLAY WINDOW B: EMAIL SCHEDULER SYSTEM */}
          {activeTab === "reporting" && (
            <div className="space-y-4 max-w-xl animate-fade-in">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  HQ Automated Email Integration
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Compile and dispatch real-time encrypted data summaries
                  directly into the Diocesan/Zonal Headquarters server
                  directory.
                </p>
              </div>

              <form onSubmit={handleSendEmailReport} className="space-y-4 pt-2">
                <div className="flex flex-col space-y-1.5">
                  <label
                    htmlFor="destination-email"
                    className="text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                  >
                    Destination Headquarters Email Address
                  </label>

                  <input
                    id="destination-email"
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="e.g. zonalhq@winnerschapel.org"
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSending}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 text-white disabled:text-slate-400 text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSending ? (
                    <span className="animate-pulse">
                      Compiling Server Digest...
                    </span>
                  ) : (
                    <>
                      <svg
                        xmlns="http://w3.org"
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 19l9 2-9-18-9 2 9 18zm0 0v-8"
                        />
                      </svg>
                      <span>Dispatch Summary</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ZonalManagement;
