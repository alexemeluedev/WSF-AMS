import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { attendanceService } from "../api/apiClient";

const AttendanceHistory = () => {
  const navigate = useNavigate();

  // Unified state managers connected to your live database endpoints
  const [historyRawData, setHistoryRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination Configuration Hooks
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  // =========================================================================
  // REAL-TIME CHRONOLOGICAL DATABASE HISTORY FETCH ENGINE
  // =========================================================================
  useEffect(() => {
    const loadDatabaseHistory = async () => {
      try {
        setLoading(true);
        const response = await attendanceService.summary();

        // Safely unpacks both raw responses and potential Axios data wrappers
        let rawSummaries = [];
        if (response && response.summaries) {
          rawSummaries = response.summaries;
        } else if (response && response.data && response.data.summaries) {
          rawSummaries = response.data.summaries;
        } else if (Array.isArray(response)) {
          rawSummaries = response;
        } else if (response && response.data && Array.isArray(response.data)) {
          rawSummaries = response.data;
        }

        setHistoryRawData(rawSummaries);
      } catch (error) {
        console.error("Database history retrieval network failure:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDatabaseHistory();
  }, []);

  // =========================================================================
  // MEMOIZED PARSING ENGINE FORCES RE-RENDERS AS SOON AS DATA ARRIVES
  // =========================================================================
  const processedLogs = useMemo(() => {
    if (
      !historyRawData ||
      !Array.isArray(historyRawData) ||
      historyRawData.length === 0
    ) {
      return [];
    }

    return historyRawData
      .map((record, index) => {
        // Read the exact computed numbers directly from your backend payload keys
        const presentTotal = Number(record.totalPresent || 0);
        const absentTotal = Number(record.totalAbsent || 0);

        const totalTracked = presentTotal + absentTotal;
        const turnoutRate =
          totalTracked > 0
            ? Math.round((presentTotal / totalTracked) * 100)
            : 0;

        const cellCodeName = record.cellName || record.cell || "Unknown Cell";
        const logSheetDate = record.date || "Unknown Date";
        const uniqueCompositeKey = `${cellCodeName}_${logSheetDate}_${index}`;

        return {
          id: record._id || record.id || uniqueCompositeKey,
          date: logSheetDate,
          cell: cellCodeName,
          present: presentTotal,
          absent: absentTotal,
          totalMarked: totalTracked,
          rate: turnoutRate,
        };
      })
      .sort((a, b) => {
        if (!a.date || !b.date) return 0;
        return String(b.date).localeCompare(String(a.date));
      });
  }, [historyRawData]);

  // =========================================================================
  // HISTORICAL REGISTER SELECTION RELOAD REDIRECTION PIPE
  // =========================================================================
  const handleRestoreHistoricalSessionData = (targetDate, targetCell) => {
    // 1. Set the loaded parameters so the main page displays the correct statistics
    localStorage.setItem("cell_date", targetDate);
    localStorage.setItem("cell_loc", targetCell);

    // 2. **THE LOCKING DROPDOWN FIX**: Mark this as a temporary override session loop
    localStorage.setItem("is_history_override", "true");

    alert(
      `⚡ Historical Register worksheet for [${targetCell}] on [${targetDate}] loaded successfully! Redirecting to tracking terminal.`,
    );

    navigate("/attendances");
  };

  // Filter matrix elements based on search query strings
  const filteredHistory = processedLogs.filter(
    (log) =>
      log.cell.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.date.includes(searchQuery),
  );

  // Pagination Calculations
  const totalPages = Math.ceil(filteredHistory.length / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedData = filteredHistory.slice(startIndex, endIndex);

  // Reset pagination page pointer back to first index on query typing updates
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 p-3 sm:p-6 md:p-8 antialiased font-sans text-slate-800">
      <div className="max-w-6xl mx-auto space-y-5 sm:space-y-6">
        {/* HEADER CONTROLS VIEW PANEL */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between no-print">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Comprehensive Attendance History & Date Review
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Audit turnouts, track trends, and quickly reload active registers
              from any historical date.
            </p>
          </div>

          {/* SEARCH HISTORY INPUT FIELD */}
          <div className="relative flex items-center w-full sm:w-64">
            <span className="absolute left-3 text-slate-400 pointer-events-none">
              <svg
                xmlns="http://w3.org"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search by cell or date..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-indigo-500 focus:bg-white transition"
            />
          </div>
        </div>

        {/* DATA MANAGEMENT WORKSPACE MATRIX PANEL */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          {loading ? (
            <div className="text-center py-20 text-xs font-bold text-slate-400 animate-pulse">
              Fetching chronological audit indexes from MongoDB...
            </div>
          ) : paginatedData.length === 0 ? (
            <div className="text-center py-20 text-xs font-semibold text-slate-400 italic">
              No historical log matching sheets found in database collections
              catalog.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse table-auto text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-[10px] tracking-wider text-slate-400">
                    <tr>
                      <th className="px-6 py-4">Marked Register Date</th>
                      <th className="px-6 py-4">Cell Location Code</th>
                      <th className="px-6 py-4 text-center">Present Total</th>
                      <th className="px-6 py-4 text-center">Absent Tracked</th>
                      <th className="px-6 py-4 text-center">
                        Turnout Rate Progression
                      </th>
                      <th className="px-6 py-4 text-right no-print">
                        Data Action Node
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-700">
                    {paginatedData.map((log) => (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-50/60 transition cursor-pointer"
                      >
                        <td className="px-6 py-4 font-bold text-slate-900 font-mono whitespace-nowrap">
                          {log.date}
                        </td>
                        <td className="px-6 py-4 font-bold text-indigo-600 uppercase tracking-tight">
                          {log.cell}
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-emerald-600 font-mono">
                          {log.present} Members
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-rose-500 font-mono">
                          {log.absent} Members
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="font-black text-slate-800 font-mono">
                              {log.rate}%
                            </span>
                            <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden inline-block print:hidden">
                              <div
                                style={{ width: `${log.rate}%` }}
                                className={`h-full rounded-full ${log.rate >= 75 ? "bg-emerald-500" : "bg-amber-500"}`}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap no-print">
                          <button
                            type="button"
                            onClick={() =>
                              handleRestoreHistoricalSessionData(
                                log.date,
                                log.cell,
                              )
                            }
                            className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold rounded-lg text-[10px] uppercase tracking-wider hover:bg-indigo-100 transition shadow-2xs cursor-pointer"
                          >
                            Load Sheet
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* BOX-STYLE FOOTER PAGINATION CONTAINER - PREVENTS PAGE CLUTTERING */}
              <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-500">
                <p className="text-center sm:text-left text-slate-500">
                  Showing{" "}
                  <span className="text-slate-800 font-bold font-mono">
                    {Math.min(startIndex + 1, filteredHistory.length)}
                  </span>{" "}
                  to{" "}
                  <span className="text-slate-800 font-bold font-mono">
                    {Math.min(endIndex, filteredHistory.length)}
                  </span>{" "}
                  of{" "}
                  <span className="text-slate-800 font-bold font-mono">
                    {filteredHistory.length}
                  </span>{" "}
                  records
                </p>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-300 transition shadow-2xs cursor-pointer disabled:cursor-not-allowed"
                  >
                    ◀
                  </button>

                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const pageNumber = idx + 1;
                    return (
                      <button
                        key={pageNumber}
                        onClick={() => setCurrentPage(pageNumber)}
                        className={`w-8 h-8 text-[11px] font-bold rounded-lg border transition shadow-2xs cursor-pointer ${
                          currentPage === pageNumber
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}

                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-300 transition shadow-2xs cursor-pointer disabled:cursor-not-allowed"
                  >
                    ▶
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceHistory;
