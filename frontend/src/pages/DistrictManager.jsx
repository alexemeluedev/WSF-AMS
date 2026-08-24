import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { districtService, zoneService } from "../api/apiClient.js";
import { useStats } from "../contexts/StatsContext.jsx";

export default function DistrictManager() {
  const { refreshStats } = useStats();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedZone, setSelectedZone] = useState("ALL");
  const [selectedDate, setSelectedDate] = useState("");

  const [zonesList, setZonesList] = useState([]);
  const [districts, setDistricts] = useState([]);
  // const [globalLoading, setGlobalLoading] = useState(true);

  // 🔑 PAGINATION STATES
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingDistrict, setEditingDistrict] = useState(null);
  const [districtToDelete, setDistrictToDelete] = useState(null);

  const [formInput, setFormInput] = useState({
    name: "",
    code: "",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isFormSaving, setIsFormSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [validationError, setValidationError] = useState("");

  const [expandedDistrictId, setExpandedDistrictId] = useState(null);

  const toggleExpandDistrict = (districtId) => {
    setExpandedDistrictId(
      expandedDistrictId === districtId ? null : districtId,
    );
  };

  // Load baseline zones indices list for relational linkages filtering dropdown layout checks
  useEffect(() => {
    const fetchZones = async () => {
      try {
        const response = await zoneService.list();
        const data = Array.isArray(response) ? response : response.zones || [];
        setZonesList(data);
      } catch (err) {
        console.error(
          "Failed to build secondary filters context mapping loops:",
          err,
        );
      }
    };
    fetchZones();
  }, []);

  // Lag prevention input debouncer hook
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Load real-time Districts telemetry arrays directly from database endpoint
  const loadDistricts = async (searchStr = "") => {
    try {
      setIsLoading(true);
      const data = await districtService.list(searchStr);
      setDistricts(Array.isArray(data) ? data : data.districts || []);
    } catch (err) {
      toast.error(
        err.message ||
          "Failed synchronization loop validation check on districts indices.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDistricts(debouncedSearch);
  }, [debouncedSearch]);

  const handleSaveDistrict = async (e) => {
    e.preventDefault();
    setValidationError("");
    setIsFormSaving(true);

    try {
      if (editingDistrict) {
        await districtService.update(editingDistrict._id, formInput);
        toast.success("District configuration modified successfully!");
      } else {
        await districtService.create(formInput);
        toast.success("New structural District registered successfully!");
      }
      setIsFormModalOpen(false);
      await refreshStats();
      loadDistricts(debouncedSearch);
    } catch (err) {
      setValidationError(
        err.message || "Execution operation configuration transaction failure.",
      );
    } finally {
      setIsFormSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!districtToDelete) return;
    setIsDeleting(true);
    try {
      await districtService.remove(districtToDelete._id);
      toast.success("District entry purged successfully from root index.");
      setIsDeleteModalOpen(false);
      setDistrictToDelete(null);
      await refreshStats();
      loadDistricts(debouncedSearch);
    } catch (err) {
      toast.error(
        err.message ||
          "Could not complete components deletion pipeline execution.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredDistricts = useMemo(() => {
    return districts.filter((d) => {
      const matchesZone = selectedZone === "ALL" || d.zone === selectedZone;
      const matchesDate = !selectedDate || d.dateCreated === selectedDate;

      return matchesZone && matchesDate;
    });
  }, [districts, selectedZone, selectedDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedZone, selectedDate, searchTerm]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredDistricts.length / rowsPerPage),
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedDistricts = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;

    return filteredDistricts.slice(start, end);
  }, [filteredDistricts, currentPage, rowsPerPage]);

  const startRecord =
    filteredDistricts.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;

  const endRecord = Math.min(
    currentPage * rowsPerPage,
    filteredDistricts.length,
  );

  const getPageNumbers = () => {
    const pages = [];

    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    pages.push(1);

    if (currentPage > 4) {
      pages.push("...");
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 3) {
      pages.push("...");
    }

    pages.push(totalPages);

    return pages;
  };
  return (
    <div className="w-full bg-slate-50 p-4 md:p-6 rounded-2xl border border-slate-100 space-y-4">
      {/* Upper Filters Interface Layout Header Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          {/* Creation Date Picker Filter Layout Box */}
          <div className="flex flex-col w-full sm:w-44">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Filter Creation Date
            </label>
            <div className="relative w-full">
              <span className="absolute left-3 top-2.5 text-slate-400 pointer-events-none">
                📅
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 text-slate-800 rounded-lg text-sm bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Search Bar Input & Registration Link */}
        <div className="flex flex-col sm:flex-row items-stretch xl:items-center gap-2 w-full xl:w-auto flex-1 xl:justify-end">
          <div className="relative w-full xl:w-72">
            <input
              type="text"
              placeholder="Search District name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm h-9.5 text-slate-800 outline-none focus:border-indigo-500"
            />
            <span className="absolute left-3 top-2.5 text-slate-400 text-sm">
              🔍
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingDistrict(null);
              setValidationError("");
              setFormInput({ name: "", code: "" });
              setIsFormModalOpen(true);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg h-9.5 flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
          >
            ➕ Register District
          </button>
        </div>
      </div>

      {/* Grid Elements Table Outputs Viewer Panels wrapper */}
      <div className="bg-white border rounded-xl shadow-sm overflow-visible">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-slate-400">
            Loading districts indices telemetry...
          </div>
        ) : filteredDistricts.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400">
            No district matching active workspace search filters discovered.
          </div>
        ) : (
          // <div className="overflow-visible">
          <div className="w-full overflow-x-auto border border-slate-200 rounded-2xl shadow-xs bg-white">
            {/* <table className="w-full text-left border-collapse"> */}
            <table className="w-full text-left border-collapse min-w-162.5 table-auto">
              <thead>
                <tr className="bg-slate-50 border-b text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">District Name</th>
                  <th className="py-3 px-4">District ID Code</th>
                  <th className="py-3 px-4 text-center">
                    Active Cells (Tally)
                  </th>
                  <th className="py-3 px-4">Date Created</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm text-slate-700">
                {/* {filteredDistricts.map((d) => ( */}
                {paginatedDistricts.map((d) => (
                  <React.Fragment key={d._id || d.id}>
                    {/* <tr key={d._id} className="hover:bg-slate-50/50"> */}
                    <tr className="hover:bg-slate-50/50">
                      {/* <td className="py-4 px-4 font-bold text-indigo-900"> */}
                      <td
                        onClick={() => toggleExpandDistrict(d._id)}
                        className="py-4 px-4 font-bold text-indigo-900 cursor-pointer hover:underline flex items-center gap-2 select-none"
                      >
                        {" "}
                        <span>{expandedDistrictId === d._id ? "▼" : "▶"}</span>
                        {d.name}
                      </td>
                      <td className="py-4 px-4 font-mono text-xs font-semibold text-slate-500">
                        {d.code}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono">
                          {d.activeCells || 0}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-400 font-mono text-xs">
                        {d.dateCreated}
                      </td>

                      <td className="py-4 px-4 text-right relative w-24 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveDropdownId(
                              activeDropdownId === d._id ? null : d._id,
                            )
                          }
                          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium cursor-pointer hover:bg-slate-50"
                        >
                          Actions ▼
                        </button>
                        {activeDropdownId === d._id && (
                          <div className="absolute right-4 top-11 min-w-30 w-32 bg-white border border-slate-200 rounded-lg shadow-xl z-50 py-1 flex flex-col text-left divide-y divide-slate-100">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingDistrict(d);
                                setValidationError("");
                                setFormInput({ name: d.name, code: d.code });
                                setIsFormModalOpen(true);
                                setActiveDropdownId(null);
                              }}
                              className="w-full px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer text-left"
                            >
                              📝 Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDistrictToDelete(d);
                                setIsDeleteModalOpen(true);
                                setActiveDropdownId(null);
                              }}
                              className="w-full px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 cursor-pointer text-left"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {/* **SUB-ROW EXPANSION FOR DETAILED ASSOCIATED ZONES LIST** */}
                    {expandedDistrictId === d._id && (
                      <tr className="bg-slate-50/50 animate-in fade-in duration-150">
                        <td
                          colSpan="5"
                          className="px-8 py-4 border-l-4 border-indigo-500"
                        >
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                              Associated Zones List ({d.name})
                            </h4>

                            {/* Renders zones list returned dynamically via your backend query */}
                            {d.zones && d.zones.length > 0 ? (
                              <ul className="divide-y bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden max-w-xl text-xs">
                                {d.zones.map((zone) => (
                                  <li
                                    key={zone._id}
                                    className="p-3 flex items-center justify-between text-slate-700 font-medium hover:bg-slate-50/50 transition-colors"
                                  >
                                    <span className="flex items-center gap-2">
                                      🌐 {zone.name}
                                    </span>
                                    <span className="text-slate-400 font-normal text-xs">
                                      🏛️ HQ:{" "}
                                      {zone.headquarters || "Not Documented"}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-slate-400 italic bg-white p-3 border border-slate-200 rounded-xl max-w-md shadow-xs">
                                No zone clusters are currently attached to this
                                district profile yet.
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* 🔑 3. BOTTOM PAGINATION NAVIGATION CONTR0L FOOTER BAR */}
        {!isLoading && filteredDistricts.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
              <span>
                Showing {startRecord} – {endRecord} of{" "}
                {filteredDistricts.length} total records
              </span>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
                  Per Page:
                </span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value={5}>5 records</option>
                  <option value={10}>10 records</option>
                  <option value={25}>25 records</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={(prev) =>
                  setCurrentPage((prev) => Math.max(prev - 1, 1))
                }
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                Previous
              </button>

              <div className="hidden md:flex items-center gap-1">
                {/* {[...Array(totalPages)].map((_, index) => {
                  const pageNum = index + 1;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        currentPage === pageNum
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })} */}
                {getPageNumbers().map((page, index) =>
                  page === "..." ? (
                    <span
                      key={`ellipsis-${index}`}
                      className="px-2 text-slate-400 font-semibold"
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        currentPage === page
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      {page}
                    </button>
                  ),
                )}
              </div>

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={(prev) =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* **DYNAMIC DISTRICT FORM MODAL (CREATE / EDIT)** */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              {editingDistrict
                ? "📝 Modify District Profile"
                : "➕ Register New District"}
            </h3>

            {validationError && (
              <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-600 rounded-lg">
                {validationError}
              </div>
            )}

            <form onSubmit={handleSaveDistrict} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  District Name
                </label>
                <input
                  type="text"
                  required
                  value={formInput.name}
                  onChange={(e) =>
                    setFormInput({ ...formInput, name: e.target.value })
                  }
                  placeholder="e.g., Benin District 1"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  District ID Code
                </label>
                <input
                  type="text"
                  required
                  value={formInput.code}
                  onChange={(e) =>
                    setFormInput({ ...formInput, code: e.target.value })
                  }
                  placeholder="e.g., DST-001"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 outline-none focus:border-indigo-500 uppercase"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 text-xs border rounded-lg hover:bg-slate-50 cursor-pointer text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isFormSaving}
                  className="px-4 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium rounded-lg cursor-pointer transition-colors"
                >
                  {isFormSaving ? "Saving..." : "Save Configuration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* **DYNAMIC CONFIRMATION MODAL (DELETE)** */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 space-y-4 shadow-xl text-center">
            <div className="mx-auto w-12 h-12 bg-red-50 text-red-600 flex items-center justify-center rounded-full text-xl">
              ⚠️
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Delete District Profile?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you completely sure you want to remove{" "}
                <strong className="text-slate-800">
                  {districtToDelete?.name}
                </strong>
                ? This will clear its structural dependencies from the root
                metrics dashboard.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDistrictToDelete(null);
                }}
                className="px-4 py-2 text-xs border rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                No, Keep It
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-xs bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-medium rounded-lg cursor-pointer"
              >
                {isDeleting ? "Deleting..." : "Yes, Purge Record"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
