// finallised code
import React, { useState, useRef, useEffect } from "react";
import { useStats } from "../contexts/StatsContext.jsx";
import { useLocation } from "react-router-dom";
import { memberService, cellService } from "../api/apiClient.js";
import Dropdown from "../components/Dropdown.jsx";

export default function MemberManager() {
  const location = useLocation();
  const { refreshStats } = useStats();

  // 1. Core State Hooks
  const [members, setMembers] = useState([]);
  const [cellsDropdown, setCellsDropdown] = useState([]); // Dynamic DB Cell references array
  const [selectedCell, setSelectedCell] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [globalLoading, setGlobalLoading] = useState(true);
  const itemsPerPage = 5;

  // Intercept Navigation State from CellManager Deep-Link
  const [selectedCellFilter, setSelectedCellFilter] = useState(
    location.state?.filterCellId || null,
  );
  const [filterCellName, setFilterCellName] = useState(
    location.state?.filterCellName || "",
  );

  // Modal and Popover Visibility Triggers
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [memberToDelete, setMemberToDelete] = useState(null);

  // Unified Form Inputs Schema Data Map
  const [formInput, setFormInput] = useState({
    name: "",
    attendance: "Present",
    cell: "", // Stores selected MongoDB ObjectId string reference
    phone: "",
    status: "Active",
    gender: "Male",
  });

  const [isFormSaving, setIsFormSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [validationError, setValidationError] = useState("");

  const dropdownRef = useRef(null);

  // Synchronize deep-link data route tracking context flags
  useEffect(() => {
    if (location.state?.filterCellId) {
      setSelectedCellFilter(location.state.filterCellId);
      setFilterCellName(location.state.filterCellName);
      setSelectedCell(location.state.filterCellId); // Sync upper toolbar filter dropdown
    }
  }, [location.state]);

  const loadDashboardData = async () => {
    try {
      // 1. Build a dynamic query string for your members list request
      let queryParams = "";
      if (selectedCell && selectedCell !== "ALL") {
        queryParams = `?cellId=${selectedCell}`;
      }

      // CRITICAL PATCH: Ensure your request maps to your active memberService endpoint parameter string wrapper
      const response = await memberService.list(queryParams);
      const normalized = (response.members || []).map((member) => ({
        ...member,
        id: member._id || member.id,
      }));
      setMembers(normalized);

      // 2. Fetch the cell references to keep the toolbar select dropdown options hydrated
      // **THE CRITICAL FRONTEND FIX**: Use your authenticated client service wrapper instead of raw fetch
      const dataCells = await cellService.list("limit=100");
      setCellsDropdown(dataCells.cells || []);
    } catch (error) {
      // Check if the error is a session expiration before logging it
      if (error?.message && error.message.includes("Session expired")) {
        // Silently ignore this error because the Header component already handles the redirect
        return;
      }

      // Log all other actual database or network connection errors normally
      console.error("Failed to sync member workspace variables:", error);
    } finally {
      setGlobalLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [selectedCell]);

  // Dropdown reference listener for closing layout overlay when clicking out
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdownId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 3. Modal Actions State Handlers
  const openRegisterModal = () => {
    setEditingMember(null);
    setValidationError("");
    setFormInput({
      name: "",
      attendance: "Present",
      cell: cellsDropdown[0]?._id || "",
      phone: "",
      status: "Active",
      gender: "Male",
    });
    setIsFormModalOpen(true);
  };

  const openEditModal = (member) => {
    setEditingMember(member);
    setValidationError("");
    setFormInput({
      name: member.name,
      attendance: member.attendance || "Present",
      cell: member.cell?._id || member.cell || "",
      phone: member.phone,
      status: member.status,
      gender: member.gender,
    });
    setActiveDropdownId(null);
    setIsFormModalOpen(true);
  };

  const openDeleteModal = (member) => {
    setMemberToDelete(member);
    setActiveDropdownId(null);
    setIsDeleteModalOpen(true);
  };

  const handleSaveMember = async (e) => {
    e.preventDefault();
    setValidationError("");

    const isDuplicate = members.some(
      (m) =>
        m.phone.trim() === formInput.phone.trim() &&
        (!editingMember || m.id !== editingMember.id),
    );

    if (isDuplicate) {
      setValidationError(
        `A member with phone number "${formInput.phone}" already exists.`,
      );
      return;
    }

    setIsFormSaving(true);
    try {
      if (editingMember) {
        const response = await memberService.update(
          editingMember.id,
          formInput,
        );
        const updated = {
          ...response.member,
          id: response.member._id || response.member.id,
        };
        setMembers((prev) =>
          prev.map((m) => (m.id === editingMember.id ? updated : m)),
        );
      } else {
        const response = await memberService.create(formInput);
        const created = {
          ...response.member,
          id: response.member._id || response.member.id,
        };
        setMembers((prev) => [created, ...prev]);
      }
      await refreshStats();
      setIsFormModalOpen(false);
      loadDashboardData(); // Refresh UI layout relational populate layers
    } catch (error) {
      console.error("Member save failed", error);
      setValidationError(error.message || "Unable to save member.");
    } finally {
      setIsFormSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await memberService.remove(memberToDelete.id);
      await refreshStats();
      setMembers((prev) => prev.filter((m) => m.id !== memberToDelete.id));
      setIsDeleteModalOpen(false);
      setMemberToDelete(null);
    } catch (error) {
      console.error("Delete member failed", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  // 4. Client Side Sorting & Data Processing Filter Pipeline
  const filteredMembers = members.filter((m) => {
    // Structural Match: Check fallback parameters for string inputs or ObjectId formats
    const cellIdString = m.cell?._id || m.cell || "";
    const matchesCell = selectedCell === "ALL" || cellIdString === selectedCell;
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.phone.includes(searchTerm);
    return matchesCell && matchesSearch;
  });

  const sortedMembers = [...filteredMembers].sort((a, b) => {
    let valA = ("" + (a[sortField] || "")).toLowerCase();
    let valB = ("" + (b[sortField] || "")).toLowerCase();
    if (valA < valB) return sortDirection === "asc" ? -1 : 1;
    if (valA > valB) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentMembers = sortedMembers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedMembers.length / itemsPerPage);

  const renderSortIcon = (field) => {
    if (sortField !== field)
      return <span className="text-slate-300 ml-1">↕</span>;
    return sortDirection === "asc" ? (
      <span className="text-indigo-600 ml-1">↑</span>
    ) : (
      <span className="text-indigo-600 ml-1">↓</span>
    );
  };

  if (globalLoading) {
    return (
      <div className="w-full min-h-100 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-100 p-8">
        <svg
          className="animate-spin h-10 w-10 text-indigo-600 mb-4"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <p className="text-sm font-medium text-slate-500">
          Loading Member Workspaces...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-50 p-4 md:p-6 rounded-2xl border border-slate-100 space-y-4 relative">
      {/* Deep-Link Clear Action Overlay Pill Notification */}
      {selectedCellFilter && (
        <div className="flex justify-between items-center bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs font-semibold text-indigo-800 animate-in fade-in duration-150">
          <span>
            Viewing members routed inside:{" "}
            <span className="underline font-bold">{filterCellName}</span>
          </span>
          <button
            onClick={() => {
              setSelectedCellFilter(null);
              setFilterCellName("");
              setSelectedCell("ALL");
              window.history.replaceState({}, document.title);
            }}
            className="px-2 py-1 bg-white hover:bg-indigo-100 border border-indigo-200 rounded text-indigo-700 font-bold transition-colors cursor-pointer"
          >
            ✕ Reset Filter
          </button>
        </div>
      )}

      {/* Header Toolbar Section Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div className="flex flex-col w-full xl:w-72">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Select Cell
          </label>
          <Dropdown
            placeholder="Filter by Zone"
            value={selectedCell}
            onChange={(val) => {
              setSelectedCell(val);
            }}
            // 3. Map your array to include the "All Zones" baseline object choice
            options={[
              { label: "All Cells", value: "ALL" },
              ...cellsDropdown.map((c) => ({
                label: c.name,
                value: c._id,
              })),
            ]}
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch xl:items-center gap-2 w-full xl:w-auto flex-1 xl:justify-end">
          <div className="relative w-full xl:w-80">
            <input
              type="text"
              placeholder="Search with name or phone..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-9.5"
            />
            <span className="absolute left-3 top-2.5 text-slate-400 text-sm">
              🔍
            </span>
          </div>

          <button
            type="button"
            onClick={openRegisterModal}
            className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg shadow-sm whitespace-nowrap h-9.5 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>➕</span> Induct New Member
          </button>
        </div>
      </div>

      {/* Primary Data Display Table Roster */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-visible">
        <div className="w-full overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-175 text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none">
                <th
                  onClick={() => handleSort("name")}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100"
                >
                  Full Name {renderSortIcon("name")}
                </th>
                <th className="py-3 px-4">Contact Phone</th>
                <th className="py-3 px-4">Assigned Cell</th>
                <th
                  onClick={() => handleSort("gender")}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 text-center"
                >
                  Gender {renderSortIcon("gender")}
                </th>
                <th
                  onClick={() => handleSort("status")}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 text-center"
                >
                  Status {renderSortIcon("status")}
                </th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {currentMembers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-400">
                    No member accounts matched your scope parameters.
                  </td>
                </tr>
              ) : (
                currentMembers.map((member) => (
                  <tr
                    key={member.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-4 px-4 font-semibold text-slate-900">
                      {member.name}
                    </td>
                    <td className="py-4 px-4 text-slate-500">{member.phone}</td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-1 bg-indigo-50 rounded-md text-xs font-medium text-indigo-700">
                        {member.cell?.name || "Unassigned"}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">{member.gender}</td>
                    <td className="py-4 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${member.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                      >
                        {member.status}
                      </span>
                    </td>
                    {/* **CRITICAL POPUP POSITION FIX**: Kept relative but isolated within structural limits */}
                    <td
                      className="py-4 px-4 text-right relative"
                      ref={activeDropdownId === member.id ? dropdownRef : null}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setActiveDropdownId(
                            activeDropdownId === member.id ? null : member.id,
                          )
                        }
                        className="px-2 py-1 text-slate-400 hover:text-slate-600 font-bold tracking-widest cursor-pointer"
                      >
                        •••
                      </button>
                      {activeDropdownId === member.id && (
                        <div className="absolute right-4 top-10 w-32 bg-white border border-slate-200 shadow-md rounded-lg z-30 py-1 text-left">
                          <button
                            onClick={() => openEditModal(member)}
                            className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 text-slate-700 font-medium"
                          >
                            Edit Info
                          </button>
                          <button
                            onClick={() => openDeleteModal(member)}
                            className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 text-rose-600 font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination Tracker Workspace */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center p-4 border-t border-slate-100 bg-slate-50/50 select-none">
            <span className="text-xs text-slate-500">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="px-3 py-1 bg-white border border-slate-200 rounded text-xs font-medium disabled:opacity-50 cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(p + 1, totalPages))
                }
                className="px-3 py-1 bg-white border border-slate-200 rounded text-xs font-medium disabled:opacity-50 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Form Action Dialog Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-100 rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              {editingMember
                ? "Modify Member Core Details"
                : "Induct New Member"}
            </h3>
            <form onSubmit={handleSaveMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Identity Name
                </label>
                <input
                  type="text"
                  required
                  value={formInput.name}
                  onChange={(e) =>
                    setFormInput({ ...formInput, name: e.target.value })
                  }
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 border text-slate-900 border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mobile Contact Phone
                </label>
                <input
                  type="text"
                  required
                  value={formInput.phone}
                  onChange={(e) =>
                    setFormInput({ ...formInput, phone: e.target.value })
                  }
                  placeholder="e.g. +234..."
                  className="w-full px-3 py-2 border text-slate-900 border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Cell Registry
                </label>
                <select
                  value={formInput.cell}
                  onChange={(e) =>
                    setFormInput({ ...formInput, cell: e.target.value })
                  }
                  className="w-full px-3 py-2 border text-slate-900 border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="" disabled>
                    Select a Cell Group
                  </option>
                  {cellsDropdown.map((cell) => (
                    <option key={cell._id} value={cell._id}>
                      {cell.name} ({cell.zone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Gender Grouping
                  </label>
                  <select
                    value={formInput.gender}
                    onChange={(e) =>
                      setFormInput({ ...formInput, gender: e.target.value })
                    }
                    className="w-full px-3 py-2 border text-slate-900 border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status Flag
                  </label>
                  <select
                    value={formInput.status}
                    onChange={(e) =>
                      setFormInput({ ...formInput, status: e.target.value })
                    }
                    className="w-full px-3 py-2 border text-slate-900 border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {validationError && (
                <p className="text-xs font-medium text-rose-500 bg-rose-50 p-2 rounded-lg">
                  {validationError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  disabled={isFormSaving}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isFormSaving}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm cursor-pointer disabled:bg-indigo-400"
                >
                  {isFormSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Destructive Removal Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-100 rounded-2xl max-w-sm w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Expel Member Record
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Are you sure you want to permanently delete member record{" "}
              <span className="font-semibold text-slate-800">
                "{memberToDelete?.name}"
              </span>
              ? This action cannot be reversed.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Keep Record
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg shadow-sm cursor-pointer disabled:bg-rose-400"
              >
                {isDeleting ? "Expelling..." : "Expel Member"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
