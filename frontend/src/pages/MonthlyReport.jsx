import React, { useState, useEffect } from "react";
// import { attendanceService } from "../api/apiclient"; // Adjust path to your apiclient file
import { attendanceService } from "../api/apiClient"; // Adjust path to your apiclient file

const MonthlyReport = () => {
  // Configurable search/filter metrics
  const [attendanceDate, setAttendanceDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`; // Initializes cleanly to the current year-month string format
  });
  const [searchQuery, setSearchQuery] = useState("");

  // Visibility and item tracking states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedRowData, setSelectedRowData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Pagination Config State Hooks
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  // Live structural database state manager array
  const [reportMatrixData, setReportMatrixData] = useState([]);
  // =========================================================================
  // CHRONOLOGICAL BACKEND MONTHLY METRICS FETCH ENGINE
  // =========================================================================
  useEffect(() => {
    const loadMonthlyRosters = async () => {
      try {
        setLoading(true);

        // This hits summary analytics pipeline endpoint the backend
        const response = await attendanceService.summary();
        const rawSummaries = response?.summaries || [];

        const formattedMatrix = rawSummaries
          .filter((item) => item.date && item.date.startsWith(attendanceDate))
          .map((record, index) => {
            return {
              id: record.id || `${record.cellName}_${record.date}_${index}`,
              name: record.cellName,
              // 🔑 LIVE DATABASE SYNCHRONIZED PROPERTIES:
              male: record.male || 0,
              female: record.female || 0,
              children: record.children || 0,
              total: record.totalPresent || 0,
              date: record.date,
            };
          });
        setReportMatrixData(formattedMatrix);
        setCurrentPage(1); // Reset page pointers on calendar pivots
      } catch (err) {
        console.error("Monthly aggregate extraction failure:", err);
      } finally {
        setLoading(false);
      }
    };

    loadMonthlyRosters();
  }, [attendanceDate]);

  // Handle updates or corrections added from drawers or modals
  const handleAddNewRow = (newRowPayload) => {
    setReportMatrixData((prev) => [newRowPayload, ...prev]);
  };

  // Mathematical summary reductions calculated dynamically from backend elements
  const summaryTotals = reportMatrixData.reduce(
    (acc, curr) => {
      acc.male += curr.male;
      acc.female += curr.female;
      acc.children += curr.children;
      acc.grandTotal += curr.total;
      if (curr.total === 0) acc.emptyLogs += 1;
      return acc;
    },
    { male: 0, female: 0, children: 0, grandTotal: 0, emptyLogs: 0 },
  );

  // Filter matrix elements based on search query strings
  const filteredMatrix = reportMatrixData.filter((row) =>
    row.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Page index math calculations
  const totalPages = Math.ceil(filteredMatrix.length / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedData = filteredMatrix.slice(startIndex, endIndex);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const downloadTableCSV = () => {
    if (filteredMatrix.length === 0) return;
    const csvHeaders = [
      "Cell Name",
      "Male Attendance",
      "Female Attendance",
      "Children Attendance",
      "Total Sum",
      "Date Marked",
    ];
    const csvRows = filteredMatrix.map((row) => [
      `"${row.name}"`,
      row.male,
      row.female,
      row.children,
      row.total,
      `"${row.date}"`,
    ]);
    const csvStringContent = [
      csvHeaders.join(","),
      ...csvRows.map((e) => e.join(",")),
    ].join("\n");
    const blobFile = new Blob([csvStringContent], {
      type: "text/csv;charset=utf-8;",
    });
    const temporaryLink = document.createElement("a");
    const blobURL = URL.createObjectURL(blobFile);
    temporaryLink.setAttribute("href", blobURL);
    temporaryLink.setAttribute(
      "download",
      `Attendance_Report_${attendanceDate}.csv`,
    );
    temporaryLink.style.visibility = "hidden";
    document.body.appendChild(temporaryLink);
    temporaryLink.click();
    document.body.removeChild(temporaryLink);
  };

  return (
    <div className="bg-slate-50 min-h-screen p-3 sm:p-6 md:p-8 font-sans antialiased text-slate-800">
      <div className="max-w-6xl mx-auto space-y-5 sm:space-y-6">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between no-print">
          {/* TITLE CARD DESCRIPTION HEADER */}
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
              <svg
                xmlns="http://w3.org"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Check Attendance Pool
              </label>
              <span className="text-xs font-semibold text-slate-600 block mt-0.5">
                Filter datasets chronologically
              </span>
            </div>
          </div>

          {/* ACTIONS CONTROLS WRAPPER: FLEX-WRAP DYNAMICALLY ELIMINATES VERTICAL OVERFLOWS */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* 1. SEARCH TEXT FIELD BOX */}
            <div className="relative flex items-center w-full min-w-32.5 sm:flex-1 md:w-52 lg:w-60">
              <span className="absolute left-3 text-slate-400 pointer-events-none">
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
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search cell groups..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-indigo-500 focus:bg-white transition"
              />
            </div>

            {/* 2. CHRONOLOGICAL MONTH SELECTOR CALENDAR BAR */}
            <div className="w-full sm:w-auto sm:flex-1 md:flex-none">
              <input
                type="month"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 focus:bg-white transition"
              />
            </div>

            {/* 3. EXPORT TO EXCEL / CSV BUTTON STRIP */}
            <div className="w-[calc(50%-6px)] sm:w-auto sm:flex-none">
              <button
                onClick={downloadTableCSV}
                disabled={filteredMatrix.length === 0}
                className="w-full px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 text-white disabled:text-slate-400 text-xs font-bold rounded-xl transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                <svg
                  xmlns="http://w3.org"
                  className="h-3.5 w-3.5 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                <span className="whitespace-nowrap">Export CSV</span>
              </button>
            </div>

            {/* 4. LOG ENTRY MODAL DRAWER INJECT ACTION BUTTON */}
            <div className="w-[calc(50%-6px)] sm:w-auto sm:flex-none">
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="w-full px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <svg
                  xmlns="http://w3.org"
                  className="h-3.5 w-3.5 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span className="whitespace-nowrap">Log Entry</span>
              </button>
            </div>
          </div>
        </div>

        {/* DYNAMIC METRIC CARDS - STACKS NATIVELY ON MOBILE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200/70 p-4 sm:p-5 rounded-2xl shadow-xs flex items-center gap-4">
            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 shrink-0">
              <svg
                xmlns="http://w3.org"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Total Attendance
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">
                {summaryTotals.grandTotal}
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200/70 p-4 sm:p-5 rounded-2xl shadow-xs flex items-center gap-4">
            <div className="p-3 bg-sky-50 rounded-xl text-sky-600 shrink-0">
              <svg
                xmlns="http://w3.org"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <div className="w-full">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Adult Breakdown
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-base sm:text-lg font-bold text-slate-800 font-mono">
                  {summaryTotals.male}{" "}
                  <span className="text-[9px] font-semibold text-slate-400 uppercase">
                    M
                  </span>
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-base sm:text-lg font-bold text-slate-800 font-mono">
                  {summaryTotals.female}{" "}
                  <span className="text-[9px] font-semibold text-slate-400 uppercase">
                    W
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200/70 p-4 sm:p-5 rounded-2xl shadow-xs flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 shrink-0">
              <svg
                xmlns="http://w3.org"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Children Total
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">
                {summaryTotals.children}
              </span>
            </div>
          </div>

          <div
            className={`border p-4 sm:p-5 rounded-2xl shadow-xs flex items-center gap-4 transition-colors ${
              summaryTotals.emptyLogs > 0
                ? "bg-amber-50/40 border-amber-200 text-amber-800"
                : "bg-white border-slate-200/70 text-slate-400"
            }`}
          >
            <div
              className={`p-3 rounded-xl shrink-0 ${summaryTotals.emptyLogs > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}
            >
              <svg
                xmlns="http://w3.org"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Zero Total Logs
              </span>
              <span
                className={`text-xl sm:text-2xl font-black tracking-tight font-mono ${summaryTotals.emptyLogs > 0 ? "text-amber-700" : "text-slate-400"}`}
              >
                {summaryTotals.emptyLogs}
              </span>
            </div>
          </div>
        </div>

        {/* WORKSPACE SHEET COMPONENT CARD */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col items-center text-center space-y-2.5 bg-linear-to-b from-slate-50/50 to-white">
            <div className="w-11 h-11 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-center text-rose-500 shadow-2xs">
              <svg
                xmlns="http://w3.org"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A8 8 0 0117.657 18.657z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 uppercase">
                Monthly Attendance Reports
              </h1>
              <p className="text-xs font-medium text-indigo-600 mt-0.5 tracking-wide">
                Active Cycle Window: {attendanceDate}
              </p>
            </div>
          </div>

          {/* LOADING AND EMPTY BALANCING GUARDS */}
          {loading ? (
            <div className="text-center py-20 text-xs font-bold text-slate-400 animate-pulse">
              Compiling monthly relational database aggregates across cell
              streams...
            </div>
          ) : paginatedData.length === 0 ? (
            <div className="text-center py-20 text-xs font-semibold text-slate-400">
              No matching transactional attendance sheets found for this month
              range.
            </div>
          ) : (
            <>
              {/* DESKTOP VIEW TABLE LAYER - HIDDEN ON MOBILE PORTS */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200/60 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-5">Cell Name</th>
                      <th className="py-3 px-4 text-center">Male</th>
                      <th className="py-3 px-4 text-center">Female</th>
                      <th className="py-3 px-4 text-center">Children</th>
                      <th className="py-3 px-4 text-center">Total</th>
                      <th className="py-3 px-5">Date Marked</th>
                      <th className="py-3 px-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-600">
                    {paginatedData.map((row) => {
                      const isVoid = row.total === 0;
                      return (
                        <tr
                          key={row.id}
                          className={`transition-colors hover:bg-slate-50/70 ${isVoid ? "bg-amber-50/15" : ""}`}
                        >
                          <td className="py-3.5 px-5 font-bold text-slate-900 uppercase tracking-tight">
                            {row.name}
                          </td>
                          <td
                            className={`py-3.5 px-4 text-center font-mono ${isVoid ? "text-slate-300" : "text-slate-700"}`}
                          >
                            {row.male}
                          </td>
                          <td
                            className={`py-3.5 px-4 text-center font-mono ${isVoid ? "text-slate-300" : "text-slate-700"}`}
                          >
                            {row.female}
                          </td>
                          <td
                            className={`py-3.5 px-4 text-center font-mono ${isVoid ? "text-slate-300" : "text-slate-700"}`}
                          >
                            {row.children}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono ${isVoid ? "bg-slate-100 text-slate-400" : "bg-indigo-50 text-indigo-700"}`}
                            >
                              {row.total}
                            </span>
                          </td>
                          <td className="py-3.5 px-5 text-slate-500 font-medium whitespace-nowrap">
                            {row.date}
                          </td>
                          <td className="py-3.5 px-5 text-right whitespace-nowrap">
                            <button
                              onClick={() => setSelectedRowData(row)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-lg text-[11px] font-bold transition shadow-2xs cursor-pointer"
                            >
                              <span>View Details</span>
                              <svg
                                xmlns="http://w3.org"
                                className="h-3 w-3 text-slate-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2.5}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </button>
                            {/* 🗑️ NEW: DEDICATED INDIVIDUAL RECORD DELETION TRASH ACTION */}
                            {/* <button
                              onClick={() =>
                                handleDeleteSingleAttendance(
                                  row.id,
                                  row.name,
                                  row.date,
                                )
                              }
                              className="inline-flex items-center justify-center p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-100 transition shadow-2xs cursor-pointer"
                              title="Delete Record"
                            >
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
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button> */}
                            <button
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();

                                const confirmed = window.confirm(
                                  `⚠️ WARNING: Are you sure you want to permanently delete the attendance sheet for ${row.name} on ${row.date}?`,
                                );
                                if (!confirmed) return;

                                try {
                                  setLoading(true);
                                  const activeToken =
                                    localStorage.getItem("wsf_token") || "";

                                  // 🔑 THE FIX: Absolute URL string routing forces the network tab to bypass local file caching
                                  const response = await fetch(
                                    `http://localhost:5000/api/attendance/${row.id}`,
                                    {
                                      method: "DELETE",
                                      headers: {
                                        "Content-Type": "application/json",
                                        Authorization: activeToken
                                          ? `Bearer ${activeToken}`
                                          : "",
                                      },
                                    },
                                  );

                                  if (response.ok) {
                                    // Sync frontend view rows state immediately on success
                                    setReportMatrixData((prev) =>
                                      prev.filter((item) => item.id !== row.id),
                                    );
                                    alert(
                                      "🗑️ Attendance sheet deleted successfully!",
                                    );
                                  } else {
                                    alert(
                                      `❌ Error: Server rejected deletion request (Status ${response.status}).`,
                                    );
                                  }
                                } catch (err) {
                                  console.error(
                                    "Absolute path deletion failure:",
                                    err,
                                  );
                                  alert(
                                    "❌ Error: Network connection breakdown during deletion request.",
                                  );
                                } finally {
                                  setLoading(false);
                                }
                              }}
                              className="inline-flex items-center justify-center p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-100 transition shadow-2xs cursor-pointer"
                              title="Delete Record"
                            >
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
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* SMART MOBILE CARDS VIEW COMPONENT LAYER - HIDDEN ON DESKTOP PORTS */}
              <div className="block md:hidden divide-y divide-slate-100 bg-slate-50/40">
                {paginatedData.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs italic">
                    No matching records found
                  </div>
                ) : (
                  paginatedData.map((row) => {
                    const isVoid = row.total === 0;
                    return (
                      <div
                        key={row.id}
                        className={`p-4 space-y-3 transition-colors ${isVoid ? "bg-amber-50/15" : "bg-white"}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 uppercase tracking-tight">
                            {row.name}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full font-mono ${isVoid ? "bg-slate-100 text-slate-400" : "bg-indigo-50 text-indigo-700"}`}
                          >
                            {row.total} Total
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 border border-slate-100 rounded-xl p-2 bg-slate-50/50 text-center text-[11px] font-medium text-slate-500">
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 uppercase">
                              Men
                            </span>
                            <span className="font-mono font-bold text-slate-700">
                              {row.male}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 uppercase">
                              Women
                            </span>
                            <span className="font-mono font-bold text-slate-700">
                              {row.female}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 uppercase">
                              Kids
                            </span>
                            <span className="font-mono font-bold text-slate-700">
                              {row.children}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-slate-400 font-medium">
                            {row.date}
                          </span>
                          <button
                            onClick={() => setSelectedRowData(row)}
                            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 shadow-2xs flex items-center gap-1 cursor-pointer"
                          >
                            <span>Details</span>
                            <svg
                              xmlns="http://w3.org"
                              className="h-2.5 w-2.5 text-slate-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* BOX-STYLE FOOTER PAGINATION - FULLY RESPONSIVE */}
              <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-500">
                <p className="text-center sm:text-left text-slate-500">
                  Showing{" "}
                  <span className="text-slate-800 font-bold font-mono">
                    {Math.min(startIndex + 1, filteredMatrix.length)}
                  </span>{" "}
                  to{" "}
                  <span className="text-slate-800 font-bold font-mono">
                    {Math.min(endIndex, filteredMatrix.length)}
                  </span>{" "}
                  of{" "}
                  <span className="text-slate-800 font-bold font-mono">
                    {filteredMatrix.length}
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
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
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
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* SMART MOBILE CARDS VIEW COMPONENT LAYER - HIDDEN ON DESKTOP PORTS
        <div className="block md:hidden divide-y divide-slate-100 bg-slate-50/40">
          {paginatedData.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs italic">
              No matching records found
            </div>
          ) : (
            paginatedData.map((row) => {
              const isVoid = row.total === 0;
              return (
                <div
                  key={row.id}
                  className={`p-4 space-y-3 transition-colors ${isVoid ? "bg-amber-50/15" : "bg-white"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-tight">
                      {row.name}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full font-mono ${isVoid ? "bg-slate-100 text-slate-400" : "bg-indigo-50 text-indigo-700"}`}
                    >
                      {row.total} Total
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 border border-slate-100 rounded-xl p-2 bg-slate-50/50 text-center text-[11px] font-medium text-slate-500">
                    <div>
                      <span className="block text-[9px] font-bold text-slate-400 uppercase">
                        Men
                      </span>
                      <span className="font-mono font-bold text-slate-700">
                        {row.male}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold text-slate-400 uppercase">
                        Women
                      </span>
                      <span className="font-mono font-bold text-slate-700">
                        {row.female}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold text-slate-400 uppercase">
                        Kids
                      </span>
                      <span className="font-mono font-bold text-slate-700">
                        {row.children}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400 font-medium">
                      {row.date}
                    </span>
                    <button
                      onClick={() => setSelectedRowData(row)}
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 shadow-2xs flex items-center gap-1 cursor-pointer"
                    >
                      <span>Details</span>
                      <svg
                        xmlns="http://w3.org"
                        className="h-2.5 w-2.5 text-slate-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div> */}
      </div>

      {/* INLINE DESIGN REPLACEMENT: RE-ENGINEERED MARKED INFO MODAL OVERLAY       */}

      {/* ========================================================================= */}
      {selectedRowData && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-xl w-full max-w-md p-6 space-y-4 relative animate-scale-up">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                  {selectedRowData.name} Log Profile
                </h3>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Session Records Snapshot: {selectedRowData.date}
                </p>
              </div>
              <button
                onClick={() => setSelectedRowData(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xs p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Brothers
                </span>
                <span className="text-base font-black text-slate-800 mt-0.5 block font-mono">
                  {selectedRowData.male}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Sisters
                </span>
                <span className="text-base font-black text-slate-800 mt-0.5 block font-mono">
                  {selectedRowData.female}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Children
                </span>
                <span className="text-base font-black text-slate-800 mt-0.5 block font-mono">
                  {selectedRowData.children}
                </span>
              </div>
            </div>

            <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 flex justify-between items-center">
              <div>
                <span className="block text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                  Total Present
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Summed across all rows
                </span>
              </div>
              <span className="text-xl font-black text-indigo-700 bg-white border border-indigo-200/50 rounded-xl px-4 py-1.5 shadow-xs font-mono">
                {selectedRowData.total}
              </span>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedRowData(null)}
                className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* INLINE DESIGN REPLACEMENT: RE-ENGINEERED SLIDING ATTENDANCE LOG DRAWER    */}
      {/* ========================================================================= */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
          />
          <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10 sm:pl-16">
            <div className="pointer-events-auto w-screen max-w-md transform bg-white p-6 shadow-2xl border-l border-slate-200 flex flex-col justify-between animate-slide-in">
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                      Manual Attendance Entry
                    </h2>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Inject direct numerical tallies onto summary log scopes.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* <form
                  id="drawer-log-form"
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const data = new FormData(e.target);
                    const nameVal = data.get("cell_name")?.toUpperCase();
                    const mVal = Number(data.get("male_count") || 0);
                    const fVal = Number(data.get("female_count") || 0);
                    const cVal = Number(data.get("child_count") || 0);

                    if (!nameVal) return;

                    handleAddNewRow({
                      id: Math.random().toString(36).substr(2, 9),
                      name: nameVal,
                      male: mVal,
                      female: fVal,
                      children: cVal,
                      total: mVal + fVal + cVal,
                      date: new Date().toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      }),
                    });
                    setIsDrawerOpen(false);
                  }}
                > */}
                <form
                  id="drawer-log-form"
                  className="space-y-4"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      setLoading(true);
                      const data = new FormData(e.target);
                      const nameVal = data
                        .get("cell_name")
                        ?.toUpperCase()
                        .trim();
                      const mCount = Number(data.get("male_count") || 0);
                      const fCount = Number(data.get("female_count") || 0);
                      const cCount = Number(data.get("child_count") || 0);

                      if (!nameVal) return;

                      // 1. GENERATE A VIRTUAL MEMBERS ARRAY PACKED WITH THE MANUAL COUNTS
                      // This bypasses the empty results bug by satisfying your model's strict validation
                      const virtualRecords = [];

                      // Pack Virtual Brothers
                      for (let i = 0; i < mCount; i++) {
                        virtualRecords.push({
                          name: `Virtual Brother ${i + 1}`,
                          gender: "Male",
                          status: "Present",
                        });
                      }

                      // Pack Virtual Sisters
                      for (let i = 0; i < fCount; i++) {
                        virtualRecords.push({
                          name: `Virtual Sister ${i + 1}`,
                          gender: "Female",
                          status: "Present",
                        });
                      }

                      // Pack Virtual Children
                      for (let i = 0; i < cCount; i++) {
                        virtualRecords.push({
                          name: `Virtual Child ${i + 1}`,
                          gender: "Children",
                          status: "Present",
                        });
                      }

                      // 2. DISPATCH THE BALANCED TRACKING RECORD STRAIGHT TO MONGODB
                      // Uses the current calendar month view fallback to set the date accurately
                      const targetSubmissionDate = attendanceDate
                        ? `${attendanceDate}-01`
                        : new Date().toISOString().split("T")[0];

                      const response = await attendanceService.save({
                        date: targetSubmissionDate,
                        cellName: nameVal,
                        records: virtualRecords, // Injects the generated compliant roster array
                        notes:
                          "Manually entered numerical log entry overview summary slip.",
                      });

                      if (response) {
                        // 3. FORCE RE-FETCH SERVER RESULTS TO UPDATE THE SCREEN INSTANTLY
                        const updatedResponse =
                          await attendanceService.summary();
                        const rawSummaries = updatedResponse?.summaries || [];

                        const formattedMatrix = rawSummaries
                          .filter(
                            (item) =>
                              item.date && item.date.startsWith(attendanceDate),
                          )
                          .map((record, index) => {
                            let maleCount = 0;
                            let femaleCount = 0;
                            let childrenCount = 0;

                            if (Array.isArray(record.demographics)) {
                              const mMatch = record.demographics.find(
                                (d) =>
                                  (d.gender || d._id)?.toLowerCase() === "male",
                              );
                              const fMatch = record.demographics.find(
                                (d) =>
                                  (d.gender || d._id)?.toLowerCase() ===
                                  "female",
                              );
                              const cMatch = record.demographics.find(
                                (d) =>
                                  (d.gender || d._id)?.toLowerCase() ===
                                    "children" ||
                                  (d.gender || d._id)?.toLowerCase() ===
                                    "child",
                              );

                              maleCount = mMatch ? mMatch.count : 0;
                              femaleCount = fMatch ? fMatch.count : 0;
                              childrenCount = cMatch ? cMatch.count : 0;
                            }

                            return {
                              id:
                                record.id ||
                                `${record.cellName}_${record.date}_${index}`,
                              name: record.cellName,
                              male: maleCount,
                              female: femaleCount,
                              children: childrenCount,
                              total:
                                record.totalPresent ||
                                maleCount + femaleCount + childrenCount ||
                                0,
                              date: record.date,
                            };
                          });

                        setReportMatrixData(formattedMatrix);
                        setIsDrawerOpen(false);

                        // setToastMessage({
                        //   text: `📁 Attendance summary for ${nameVal} logged to database successfully!`,
                        //   type: "success",
                        // });
                        if (typeof setToastMessage !== "undefined") {
                          setToastMessage({
                            text: `📁 Attendance summary for ${nameVal} logged to database successfully!`,
                            type: "success",
                          });
                        } else {
                          alert(
                            `📁 Attendance summary for ${nameVal} logged to database successfully!`,
                          );
                        }
                      }
                    } catch (err) {
                      console.error("Manual log drawer submission crash:", err);
                      // setToastMessage({
                      //   text: "Failed to log manual entry. Check if sheet already exists for this date.",
                      //   type: "error",
                      // });
                      if (typeof setToastMessage !== "undefined") {
                        setToastMessage({
                          text: "Failed to log manual entry. Check if sheet already exists for this date.",
                          type: "error",
                        });
                      } else {
                        alert(
                          "⚠️ Failed to log manual entry. Check if a sheet already exists for this date.",
                        );
                      }
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Target Cell Group Name
                    </label>
                    <input
                      required
                      name="cell_name"
                      type="text"
                      placeholder="e.g. ELEVATION 006"
                      className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:bg-white transition uppercase"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Brothers
                      </label>
                      <input
                        name="male_count"
                        type="number"
                        min="0"
                        defaultValue="0"
                        className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:bg-white transition font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Sisters
                      </label>
                      <input
                        name="female_count"
                        type="number"
                        min="0"
                        defaultValue="0"
                        className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:bg-white transition font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Children
                      </label>
                      <input
                        name="child_count"
                        type="number"
                        min="0"
                        defaultValue="0"
                        className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:bg-white transition font-mono"
                      />
                    </div>
                  </div>
                </form>
              </div>

              <div className="border-t border-slate-100 pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="drawer-log-form"
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-sm text-center cursor-pointer"
                >
                  Commit Log
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthlyReport;
