import React, { useState, useEffect } from "react";
import { attendanceService, cellService } from "../api/apiClient";
// Incorporating standard responsive chart nodes
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const ZonalReport = () => {
  // Operational state containers linked directly to database queries
  const [zonalCellsData, setZonalCellsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0], // Default to current date string
  );

  // =========================================================================
  // REAL-TIME DATABASE LIFECYCLE AGGREGATION SYNC
  // =========================================================================
  useEffect(() => {
    const fetchZonalMetrics = async () => {
      try {
        setLoading(true);

        // 1. Fetch master lists from structural database collections concurrently
        const [cellsResponse, summariesResponse] = await Promise.all([
          cellService.list(),
          attendanceService.summary(),
        ]);

        const rawCells = cellsResponse?.cells || cellsResponse || [];

        let rawSummaries = [];
        if (Array.isArray(summariesResponse)) {
          rawSummaries = summariesResponse;
        } else if (summariesResponse?.summaries) {
          rawSummaries = summariesResponse.summaries;
        } else if (summariesResponse?.data) {
          rawSummaries = summariesResponse.data;
        }

        // 2. Map structural cell records to active session attendance arrays dynamically
        const aggregatedRoster = rawCells.map((cell) => {
          const currentCellName = (cell.name || "").trim().toLowerCase();

          // Match by standardized cellName and clean YYYY-MM-DD date strings
          const matchingDayLogs = rawSummaries.filter((s) => {
            if (!s || !s.cellName) return false;

            const dbCellName = String(s.cellName).trim().toLowerCase();

            let dbDateClean = "";
            if (s.date) {
              dbDateClean = String(s.date).includes("T")
                ? s.date.split("T")[0]
                : String(s.date);
            }

            let selectedDateClean = String(selectedDate).includes("T")
              ? selectedDate.split("T")[0]
              : String(selectedDate);

            return (
              dbCellName === currentCellName &&
              dbDateClean === selectedDateClean
            );
          });

          let presentCount = 0;
          let absentCount = 0;

          // **THE CRITICAL FIX**: Extract properties exactly matching your database keys
          matchingDayLogs.forEach((log) => {
            presentCount += log.totalPresent || log.present || 0;
            absentCount += log.totalAbsent || log.absent || 0;
          });

          const totalCapacity = presentCount + absentCount;
          const calculatedRate =
            totalCapacity > 0
              ? Math.round((presentCount / totalCapacity) * 100)
              : 0;

          return {
            id: cell._id || cell.id,
            name: cell.name,
            present: presentCount,
            absent: absentCount,
            rate: calculatedRate,
          };
        });

        setZonalCellsData(aggregatedRoster);
      } catch (err) {
        console.error("Zonal analytics matrix compilation failure:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchZonalMetrics();
  }, [selectedDate]);

  // =========================================================================
  // MATHEMATICAL TOTAL REGIONAL SUMMATIONS
  // =========================================================================
  const zoneTotalPresent = zonalCellsData.reduce(
    (acc, curr) => acc + curr.present,
    0,
  );
  const zoneTotalAbsent = zonalCellsData.reduce(
    (acc, curr) => acc + curr.absent,
    0,
  );
  const zonalAverageRate =
    zoneTotalPresent + zoneTotalAbsent > 0
      ? Math.round(
          (zoneTotalPresent / (zoneTotalPresent + zoneTotalAbsent)) * 100,
        )
      : 0;

  // Custom tooltips formatter to align visual elements with workspace metrics styling
  const CustomChartTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-lg space-y-1 text-xs">
          <p className="font-bold text-slate-800">{payload[0].payload.name}</p>
          <p className="text-emerald-600 font-medium">
            Present:{" "}
            <strong className="font-semibold">{payload[0].value}</strong>
          </p>
          <p className="text-rose-600 font-medium">
            Absent:{" "}
            <strong className="font-semibold">{payload[1].value}</strong>
          </p>
          <p className="text-indigo-600 font-medium border-t border-slate-100 pt-1 mt-1">
            Attendance Rate:{" "}
            <strong className="font-black">{payload[2].value}%</strong>
          </p>
        </div>
      );
    }
    return null;
  };
  return (
    <div className="max-w-6xl mx-auto px-4 pt-6 sm:px-8 print:p-0 space-y-6">
      {/* Specialized Zonal Matrix Layout Print Overrides */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
      @media print {
        nav, aside, header, button, .no-print, [class*="no-print"] {
          display: none !important;
        }
        html, body, #root, main, .max-w-6xl {
          position: static !important;
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
          color: black !important;
        }
        .zonal-scroll-container {
          max-height: none !important;
          overflow: visible !important;
          display: block !important;
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .grid {
          display: flex !important;
          flex-wrap: wrap !important;
          flex-direction: row !important;
          width: 100% !important;
          gap: 16px !important;
        }
        .grid > div {
          flex: 0 0 calc(50% - 8px) !important;
          width: calc(50% - 8px) !important;
          box-sizing: border-box !important;
          page-break-inside: avoid !important;
          background: white !important;
          border: 1px solid #cbd5e1 !important;
          padding: 16px !important;
          border-radius: 12px !important;
        }
        .grid > div > div.flex {
          display: flex !important;
          flex-direction: row !important;
          justify-content: space-between !important;
          align-items: center !important;
          width: 100% !important;
          margin-bottom: 8px !important;
        }
        .grid > div > div.text-\\[11px\\] {
          display: flex !important;
          flex-direction: row !important;
          justify-content: space-between !important;
          width: 100% !important;
          margin-top: 12px !important;
        }
      }
    `,
        }}
      />
      {/* Date Picker Input Row Filter (Hidden on Paper Output) */}
      <div className="flex justify-between items-center bg-slate-50 border border-slate-200/80 p-4 rounded-2xl no-print print:hidden">
        <div className="space-y-0.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Filter Report Calendar Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-white border border-slate-200 text-xs text-slate-800 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
          />
        </div>
        <button
          onClick={() => window.print()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all"
        >
          🖨️ Print Matrix Report
        </button>
      </div>

      {/* CORE SUMMARY REPORT CARD PANEL LAYOUT */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 print:border-none print:shadow-none print:p-0">
        <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 print:border-b-2 print:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 ">
              Specialized Zonal Summary Report Matrix
            </h2>
            <p className="text-xs text-slate-400">
              Comprehensive analytics overview across all active cell center
              data streams for{" "}
              <strong className="font-semibold text-slate-700">
                {selectedDate}
              </strong>
            </p>
          </div>

          {/* Header Stats Grid */}
          <div className="flex gap-4 text-right print:text-left">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">
                Total Present
              </p>
              <p className="text-sm font-black text-emerald-600">
                {zoneTotalPresent}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">
                Total Absent
              </p>
              <p className="text-sm font-black text-rose-600">
                {zoneTotalAbsent}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">
                Avg Attendance
              </p>
              <p className="text-sm font-black text-indigo-600">
                {zonalAverageRate}%
              </p>
            </div>
          </div>
        </div>
        {/* ========================================================================= */}
        {/* RECHARTS DATA VISUALIZATION GRAPH SECTION (HIDDEN ON PRINT IF DESIRED)    */}
        {/* ========================================================================= */}
        {!loading && zonalCellsData.length > 0 && (
          <div className="w-full bg-slate-50/50 border border-slate-100 rounded-xl p-4 no-print">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4">
              Visual Performance Overview By Cell Group
            </p>
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={zonalCellsData}
                  margin={{ top: 10, right: -10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f1f5f9"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  {/* Left Y-Axis for Attendance Counts Volume */}
                  <YAxis
                    yAxisId="left"
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  {/* Right Y-Axis for Efficiency Target Lines Percentage */}
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    iconSize={10}
                    wrapperStyle={{ fontSize: "11px", fontWeight: 500 }}
                  />

                  {/* Visual Node Columns */}
                  <Bar
                    yAxisId="left"
                    dataKey="present"
                    name="Present Count"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    barSize={16}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="absent"
                    name="Absent Count"
                    fill="#f43f5e"
                    radius={[4, 4, 0, 0]}
                    barSize={16}
                  />

                  {/* Overlay Analytics Trend Target Line */}
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="rate"
                    name="Attendance Rate"
                    stroke="#4f46e5"
                    strokeWidth={3}
                    dot={{ fill: "#4f46e5", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {/* Loading and Grid Content Elements */}
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 font-medium">
            Analyzing database data metrics...
          </div>
        ) : zonalCellsData.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 font-medium">
            No cell metrics available for this specific date tracking matrix.
          </div>
        ) : (
          <div className="zonal-scroll-container grid grid-cols-1 md:grid-cols-2 gap-4">
            {zonalCellsData.map((cell) => (
              <div
                key={cell.id}
                className="border border-slate-100 rounded-xl p-4 bg-slate-50/50"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-700">
                    {cell.name}
                  </h3>
                  <span
                    className={`text-xs font-black ${cell.rate >= 70 ? "text-emerald-600" : cell.rate >= 50 ? "text-amber-500" : "text-rose-500"}`}
                  >
                    {cell.rate}%
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-2 flex justify-between">
                  <span>
                    Present:{" "}
                    <strong className="text-emerald-600 font-semibold">
                      {cell.present}
                    </strong>
                  </span>
                  <span>
                    Absent:{" "}
                    <strong className="text-rose-600 font-semibold">
                      {cell.absent}
                    </strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ZonalReport;
