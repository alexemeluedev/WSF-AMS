import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { zoneService, cellService, memberService } from "../api/apiClient.js";
import { useStats } from "../contexts/StatsContext.jsx"; // 1. Import hook
import Dropdown from "../components/Dropdown.jsx";

export default function CellManager() {
  const { refreshStats } = useStats(); //
  const navigate = useNavigate();

  // 1. Data Pipe, Filtering & Sorting State
  const [cells, setCells] = useState([]);
  const [zonesList, setZonesList] = useState([]);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedZone, setSelectedZone] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");

  // Pagination & Loading States
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const rowsPerPage = 5;
  const [isLoading, setIsLoading] = useState(true);
  const [activeDropdownId, setActiveDropdownId] = useState(null);

  // Form Mutation States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [expandedCellId, setExpandedCellId] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [cellToDelete, setCellToDelete] = useState(null);
  const [validationError, setValidationError] = useState("");
  const [isFormSaving, setIsFormSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formInput, setFormInput] = useState({
    name: "",
    zone: "",
    address: "",
  });

  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isMemberSaving, setIsMemberSaving] = useState(false);
  const [memberFormInput, setMemberFormInput] = useState({
    name: "",
    phone: "",
    cell: "",
    gender: "Male",
    status: "Active",
  });

  //  Fetch Sync Pipeline for Zones Dropdown
  useEffect(() => {
    const fetchDropdownOptions = async () => {
      try {
        const response = await zoneService.list();
        const zonesData = Array.isArray(response)
          ? response
          : response.zones || [];
        setZonesList(zonesData);
      } catch (err) {
        console.error("Could not populate filter dropdown indices:", err);
      }
    };
    fetchDropdownOptions();
  }, []);

  //  Debounce Input Tracking to Stop Table Interface Lag
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const loadCells = async (zoneId = "ALL", search = "", page = 1) => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        search: search,
        page: page,
        limit: rowsPerPage,
        sortField: sortField,
        sortDirection: sortDirection,
      });

      if (zoneId !== "ALL") {
        queryParams.append("zone", zoneId);
      }

      // **THE FIX**: Pass ONLY the string serialization without an accidental duplicate "?"
      const data = await cellService.list(queryParams.toString());

      if (Array.isArray(data)) {
        setCells(data);
        setTotalPages(1);
        setCurrentPage(1);
        setTotalItems(data.length);
      } else {
        setCells(data.cells || []);
        setTotalPages(data.totalPages || 1);
        setCurrentPage(data.currentPage || 1);
        setTotalItems(data.totalItems || 0);
      }
    } catch (err) {
      toast.error(
        err.message || "Failed to load matching database cell registries.",
      );
      setCells([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Lifecycle Watch Hook to sync rows seamlessly when dependencies update
  useEffect(() => {
    loadCells(selectedZone, debouncedSearch, 1);
  }, [selectedZone, debouncedSearch, sortField, sortDirection]);

  //  Save Mutation Submission Block
  const handleSaveCell = async (e) => {
    e.preventDefault();
    setValidationError("");
    // FORCED VALIDATION: Traps empty strings before hitting your backend API
    if (!formInput.zone || formInput.zone.trim() === "") {
      setValidationError("Please explicitly choose a parent zone option.");
      return; // Hard stop
    }

    setIsFormSaving(true);

    try {
      if (editingCell) {
        await cellService.update(editingCell._id, formInput);
        toast.success("Cell group configuration modified successfully!");
      } else {
        await cellService.create(formInput);
        toast.success("New cell group registered successfully!");
      }
      await refreshStats();
      setIsFormModalOpen(false);
      loadCells(selectedZone, debouncedSearch, currentPage);
    } catch (err) {
      setValidationError(err.message || "Failed execution layout operation.");
    } finally {
      setIsFormSaving(false);
    }
  };

  //  Purge Cell Transaction Execution Block
  const handleDeleteCell = async () => {
    if (!cellToDelete) return;
    setIsDeleting(true);
    try {
      await cellService.remove(cellToDelete._id);
      toast.success("Cell group purged successfully.");
      setIsDeleteModalOpen(false);
      setCellToDelete(null);

      const nextPage =
        cells.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
      await refreshStats();
      loadCells(selectedZone, debouncedSearch, nextPage);
    } catch (err) {
      toast.error(
        err.message || "Could not complete component removal transaction.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleExpandCell = (cellId) => {
    setExpandedCellId(expandedCellId === cellId ? null : cellId);
  };

  return (
    <div className="w-full bg-slate-50 p-4 md:p-6 rounded-2xl border border-slate-100 space-y-4">
      {/* Header Controls Block */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        {/* Dropdown Filter */}
        <div className="flex flex-col w-full xl:w-72">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Select Zone
          </label>
          {/* <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 h-9.5 outline-none cursor-pointer"
          >
            <option value="ALL">All Zones</option>
            {zonesList.map((z) => (
              <option key={z._id} value={z._id}>
                {z.name}
              </option>
            ))}
          </select> */}
          <Dropdown
            placeholder="Filter by Zone"
            value={selectedZone} // 1. Hooks up to your table filter state variable
            onChange={(val) => {
              setSelectedZone(val); // 2. Triggers the loadCells filter correctly
            }}
            // 3. Map your array to include the "All Zones" baseline object choice
            options={[
              { label: "All Zones", value: "ALL" },
              ...zonesList.map((z) => ({
                label: z.name,
                value: z._id,
              })),
            ]}
          />
        </div>

        {/* Search and Action Row */}
        <div className="flex flex-col sm:flex-row items-stretch xl:items-center gap-2 w-full xl:w-auto flex-1 xl:justify-end">
          <div className="relative w-full xl:w-80">
            <input
              type="text"
              placeholder="Search with Cell name or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 h-9.5 text-slate-800"
            />
            <span className="absolute left-3 top-2.5 text-slate-400 text-sm">
              🔍
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingCell(null);
              setValidationError("");
              setFormInput({
                name: "",
                // zone: zonesList[0]?._id || "",
                zone: "",
                address: "",
              });
              setIsFormModalOpen(true);
            }}
            className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg shadow-sm h-9.5 whitespace-nowrap cursor-pointer transition-colors"
          >
            ➕ Register New Cell
          </button>
        </div>
      </div>

      {/* Main Grid View Table Layout Card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-visible">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-slate-400">
            Syncing cells directory table...
          </div>
        ) : cells.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400">
            No cell registries matching active selection profiles found.
          </div>
        ) : (
          // <div className="overflow-visible">
          <>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-150">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th
                      className="py-3 px-4 cursor-pointer select-none"
                      onClick={() => {
                        setSortField("name");
                        setSortDirection(
                          sortDirection === "asc" ? "desc" : "asc",
                        );
                      }}
                    >
                      Cell Name{" "}
                      {sortField === "name" &&
                        (sortDirection === "asc" ? "▲" : "▼")}
                    </th>
                    <th className="py-3 px-4">Address</th>
                    <th className="py-3 px-4 text-center">Members Count</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {cells.map((cell) => (
                    <React.Fragment key={cell._id}>
                      <tr className="hover:bg-slate-50/70 transition-colors">
                        {/* <td */}
                        {/* Flex was broken inside a TD, removed flex layout directly from TD and wrapped content in a clean div block */}
                        <td className="py-4 px-4 font-semibold text-indigo-900 whitespace-nowrap">
                          <div
                            onClick={() => toggleExpandCell(cell._id)}
                            className="py-4 px-4 font-semibold text-indigo-900 whitespace-nowrap cursor-pointer hover:underline flex items-center gap-2"
                          >
                            <span>
                              {expandedCellId === cell._id ? "▼" : "▶"}
                            </span>
                            {cell.name}
                          </div>
                        </td>
                        {/* Forced address cells to maintain space rather than compressing into 1-letter vertical stacks */}
                        <td className="py-4 px-4 min-w-62.5 max-w-md text-slate-500 leading-relaxed">
                          {cell.address}
                        </td>
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <span className="inline-flex items-center justify-center bg-indigo-50 text-indigo-700 font-mono text-xs font-bold px-2.5 py-1 rounded-full min-w-6 shadow-xs">
                            {cell.memberCount || 0}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right relative overflow-visible w-28 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveDropdownId(
                                activeDropdownId === cell._id ? null : cell._id,
                              )
                            }
                            className="px-3 py-1.5 border border-slate-200 bg-white text-slate-700 rounded-lg text-xs font-medium shadow-sm cursor-pointer hover:bg-slate-50"
                          >
                            Actions ▼
                          </button>
                          {activeDropdownId === cell._id && (
                            <div className="absolute right-4 top-13 min-w-30 w-32 bg-white border border-slate-200 rounded-lg shadow-xl z-50 py-1 flex flex-col text-left divide-y divide-slate-100">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCell(cell);
                                  setValidationError("");
                                  setFormInput({
                                    name: cell.name,
                                    zone: cell.zone?._id || cell.zone || "",
                                    address: cell.address,
                                  });
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
                                  setCellToDelete(cell);
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

                      {/* EXPANDABLE SUB-ROW DIRECTORY */}
                      {expandedCellId === cell._id && (
                        <tr className="bg-slate-50/50 animate-in fade-in duration-150">
                          <td
                            colSpan="4"
                            className="px-8 py-4 border-l-4 border-indigo-500"
                          >
                            {/* Nested table contents will perfectly adjust match layout now */}
                            <div className="space-y-3 min-w-150">
                              <div className="flex items-center justify-between max-w-2xl">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                  Active Members Directory ({cell.name})
                                </h4>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMemberFormInput({
                                      name: "",
                                      phone: "",
                                      cell: cell._id,
                                      gender: "Male",
                                      status: "Active",
                                    });
                                    setIsMemberModalOpen(true);
                                  }}
                                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer flex items-center gap-1 transition-colors bg-indigo-50 hover:bg-indigo-100/80 px-2.5 py-1 rounded-md"
                                >
                                  ➕ Induct New Member
                                </button>
                              </div>

                              {cell.members && cell.members.length > 0 ? (
                                <ul className="divide-y bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden max-w-2xl text-xs">
                                  {cell.members.map((m) => (
                                    <li
                                      key={m._id}
                                      className="p-3 flex items-center justify-between text-slate-700 font-medium hover:bg-slate-50/50 transition-colors"
                                    >
                                      <span className="flex items-center gap-2">
                                        👤 {m.name} ({m.gender})
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 rounded text-[10px] ${m.status === "Active" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"}`}
                                      >
                                        {m.status}
                                      </span>
                                      <span className="text-slate-400 font-normal font-mono">
                                        {m.phone || "No Phone"}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-xs text-slate-400 italic bg-white p-3 border rounded-xl max-w-md shadow-xs">
                                  No registered members currently indexed to
                                  this cell node.
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

              {/* Pagination Controls */}
              {/* <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-t border-slate-200 rounded-b-xl text-xs text-slate-500">
              <div>
                Showing page{" "}
                <strong className="text-slate-700">{currentPage}</strong> of{" "}
                <strong className="text-slate-700">{totalPages}</strong> (
                {totalItems} total records)
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() =>
                    loadCells(selectedZone, debouncedSearch, currentPage - 1)
                  }
                  className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs transition-colors"
                >
                  ◀ Previous
                </button>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    loadCells(selectedZone, debouncedSearch, currentPage + 1)
                  }
                  className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs transition-colors"
                >
                  Next ▶
                </button>
              </div>
            </div> */}
            </div>

            {/* <div className=" bg-slate-50 px-4 py-3 flex items-center justify-between border-t border-slate-200 rounded-b-xl text-xs text-slate-500"> */}
            <div className="w-full border-t border-slate-200 bg-white p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* <div> */}
              <div className="text-xs text-slate-500 text-center sm:text-left">
                Showing page{" "}
                <strong className="text-slate-700">{currentPage}</strong> of{" "}
                <strong className="text-slate-700">{totalPages}</strong> (
                {totalItems} total records)
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() =>
                    loadCells(selectedZone, debouncedSearch, currentPage - 1)
                  }
                  className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs transition-colors"
                >
                  ◀ Previous
                </button>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    loadCells(selectedZone, debouncedSearch, currentPage + 1)
                  }
                  className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs transition-colors"
                >
                  Next ▶
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* DYNAMIC FORM MODAL (CREATE / EDIT) */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              {editingCell ? "📝 Modify Cell Settings" : "➕ Register New Cell"}
            </h3>
            {validationError && (
              <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-600 rounded-lg">
                {validationError}
              </div>
            )}
            <form onSubmit={handleSaveCell} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Cell Name
                </label>
                <input
                  type="text"
                  required
                  value={formInput.name}
                  onChange={(e) =>
                    setFormInput({ ...formInput, name: e.target.value })
                  }
                  placeholder="e.g., EMPOWERMENT004"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Zone Assignment
                </label>
                {/* <select
                  required
                  value={formInput.zone}
                  onChange={(e) =>
                    setFormInput({ ...formInput, zone: e.target.value })
                  }
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="" disabled>
                    -- Select Structural Parent Zone --
                  </option>
                  {zonesList.map((z) => (
                    <option key={z._id} value={z._id}>
                      {z.name}
                    </option>
                  ))}
                </select> */}
                <Dropdown
                  placeholder="Select Parent Zone"
                  // value={formInput.zone}
                  value={formInput.zone || ""}
                  onChange={(val) => setFormInput({ ...formInput, zone: val })}
                  options={zonesList.map((z) => ({
                    label: z.name,
                    value: z._id,
                  }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Physical Location Address
                </label>
                <textarea
                  required
                  rows="3"
                  value={formInput.address}
                  onChange={(e) =>
                    setFormInput({ ...formInput, address: e.target.value })
                  }
                  placeholder="Enter street location..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 outline-none focus:border-indigo-500 resize-none"
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
                  className="px-4 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium rounded-lg cursor-pointer"
                >
                  {isFormSaving ? "Saving..." : "Save Configuration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DYNAMIC CONFIRMATION MODAL (DELETE) */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 space-y-4 shadow-xl text-center">
            <div className="mx-auto w-12 h-12 bg-red-50 text-red-600 flex items-center justify-center rounded-full text-xl">
              ⚠️
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Delete Cell Group Profile?
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Are you sure you want to remove{" "}
              <strong className="text-slate-800">{cellToDelete?.name}</strong>?
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setCellToDelete(null);
                }}
                className="px-4 py-2 text-xs border rounded-lg hover:bg-slate-50 cursor-pointer text-slate-700"
              >
                No, Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteCell}
                className="px-4 py-2 text-xs bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-medium rounded-lg cursor-pointer"
              >
                {isDeleting ? "Deleting..." : "Yes, Purge Record"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DYNAMIC MEMBER INDUCTION MODAL */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              👤 Induct New Cell Member
            </h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsMemberSaving(true);
                try {
                  await memberService.create(memberFormInput);
                  toast.success("Member inducted successfully!");
                  setIsMemberModalOpen(false);
                  refreshStats(); // 👈 INSTANT OVERHEAD COUNTER UPDATE (No Page Refresh Required!)
                  loadCells(selectedZone, debouncedSearch, currentPage);
                } catch (err) {
                  toast.error(
                    err.message || "Failed to complete structural induction.",
                  );
                } finally {
                  setIsMemberSaving(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Full Identity Name
                </label>
                <input
                  type="text"
                  required
                  value={memberFormInput.name}
                  onChange={(e) =>
                    setMemberFormInput({
                      ...memberFormInput,
                      name: e.target.value,
                    })
                  }
                  placeholder="e.g., John Doe"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Mobile Contact Phone
                </label>
                <input
                  type="tel"
                  required
                  value={memberFormInput.phone}
                  onChange={(e) =>
                    setMemberFormInput({
                      ...memberFormInput,
                      phone: e.target.value,
                    })
                  }
                  placeholder="e.g., +234..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Gender Grouping
                </label>
                <select
                  value={memberFormInput.gender}
                  onChange={(e) =>
                    setMemberFormInput({
                      ...memberFormInput,
                      gender: e.target.value,
                    })
                  }
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Status Flag
                </label>
                <select
                  value={memberFormInput.status}
                  onChange={(e) =>
                    setMemberFormInput({
                      ...memberFormInput,
                      status: e.target.value,
                    })
                  }
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsMemberModalOpen(false)}
                  className="px-4 py-2 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isMemberSaving}
                  className="px-4 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium rounded-lg cursor-pointer"
                >
                  {isMemberSaving ? "Inducting..." : "Complete Induction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
