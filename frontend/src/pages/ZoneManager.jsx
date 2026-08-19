import React, { useState, useEffect } from "react";
import { zoneService, districtService } from "../api/apiClient.js";
import toast from "react-hot-toast";
import { useStats } from "../contexts/StatsContext.jsx";
import Dropdown from "../components/Dropdown.jsx";

export default function ZoneManager() {
  const { refreshStats } = useStats();
  const [searchTerm, setSearchTerm] = useState("");
  const [zones, setZones] = useState([]);
  const [districtsList, setDistrictsList] = useState([]);

  // 1. ADD PAGINATION STATE REGISTRIES
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const rowsPerPage = 5;

  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [zoneToDelete, setZoneToDelete] = useState(null);
  // const [formInput, setFormInput] = useState({ name: "", headquarters: "" });
  const [formInput, setFormInput] = useState({
    name: "",
    headquarters: "",
    district: "",
  });

  const [globalLoading, setGlobalLoading] = useState(true);
  const [isFormSaving, setIsFormSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [validationError, setValidationError] = useState("");

  // 3. FETCH LIVE DISTRICT RECORDS ON WINDOW MOUNT LOAD
  useEffect(() => {
    const fetchDistricts = async () => {
      try {
        const response = await districtService.list();
        const data = Array.isArray(response)
          ? response
          : response.districts || [];
        setDistrictsList(data);
      } catch (err) {
        console.error(
          "Could not load districts for structural selectors:",
          err,
        );
      }
    };
    fetchDistricts();
  }, []);

  const loadZones = async (search = "", page = 1) => {
    try {
      setGlobalLoading(true);
      const data = await zoneService.list(search, page, rowsPerPage);

      // **THE FIX**: Check if data is a raw array, otherwise unpack the pagination object
      if (Array.isArray(data)) {
        setZones(data);
        setTotalPages(1);
        setCurrentPage(1);
        setTotalItems(data.length);
      } else {
        setZones(data.zones || []);
        setTotalPages(data.totalPages || 1);
        setCurrentPage(data.currentPage || 1);
        setTotalItems(data.totalItems || 0);
      }
    } catch (err) {
      toast.error(err.message || "Failed to load zones matrix.");
    } finally {
      setGlobalLoading(false);
    }
  };

  // Reset page position to 1 when a user executes a new search filter
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadZones(searchTerm, 1);
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleSaveZone = async (e) => {
    e.preventDefault();
    setValidationError("");
    setIsFormSaving(true);
    if (!formInput.district) {
      setValidationError(
        "Please explicitly choose a parent district grouping linkage option.",
      );
      setIsFormSaving(false);
      return;
    }
    try {
      if (editingZone) {
        // Passes 'name', 'headquarters', AND 'district' cleanly in the update stream
        await zoneService.update(editingZone._id, formInput);
        toast.success("Zone profile configuration modified!");
      } else {
        // Passes 'name', 'headquarters', AND 'district' cleanly in the creation stream
        await zoneService.create(formInput);
        toast.success("New structural zone registered!");
      }
      await refreshStats();
      setIsFormModalOpen(false);
      if (typeof loadZones === "function") {
        loadZones(searchTerm, currentPage);
      } else {
        window.location.reload();
      }
    } catch (err) {
      setValidationError(err.message || "Operation failed to complete.");
    } finally {
      setIsFormSaving(false);
    }
  };

  const handleDeleteZone = async () => {
    if (!zoneToDelete) return;
    setIsDeleting(true);
    try {
      await zoneService.remove(zoneToDelete._id);
      toast.success("Zone cluster purged successfully.");
      setIsDeleteModalOpen(false);
      setZoneToDelete(null);
      await refreshStats();
      // Adjust page index if the last item on the final page gets deleted
      const nextPage =
        zones.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
      loadZones(searchTerm, nextPage);
    } catch (err) {
      toast.error(err.message || "Could not complete component removal.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full bg-slate-50 p-4 md:p-6 rounded-2xl border border-slate-100 space-y-4">
      {/* Upper Control Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <input
            type="text"
            placeholder="Search zone name or headquarters..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm h-9.5 outline-none text-slate-800"
          />
          <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingZone(null);
            setValidationError("");
            setFormInput({ name: "", headquarters: "", district: "" });
            setIsFormModalOpen(true);
          }}
          className="w-full md:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg h-9.5 whitespace-nowrap cursor-pointer transition-colors"
        >
          ➕ Register New Zone
        </button>
      </div>

      {/* Grid Table Display Wrapper */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-visible">
        {globalLoading ? (
          <div className="p-12 text-center text-sm text-slate-400">
            Loading zones data structure...
          </div>
        ) : zones.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400">
            No zone elements found matching active filters.
          </div>
        ) : (
          // <div className="overflow-visible">
          <>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Zone Cluster Name</th>
                    <th className="py-3 px-4">Parent District Assigned</th>
                    <th className="py-3 px-4">Regional Headquarters Center</th>
                    <th className="py-3 px-4 text-center">Active Cells</th>
                    <th className="py-3 px-4 text-center">Total Members</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm text-slate-700">
                  {zones.map((z) => (
                    <tr key={z._id} className="hover:bg-slate-50/50">
                      <td className="py-4 px-4 font-bold text-indigo-900">
                        {z.name}
                      </td>
                      {/* **NEW PROFESSIONAL DATA CELL BLOCK** */}
                      <td className="py-4 px-4">
                        {z.district ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-700 text-xs sm:text-sm">
                              {z.district.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase mt-0.5">
                              {z.district.code}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs italic text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-slate-500 max-w-sm">
                        {z.headquarters}
                      </td>
                      <td className="py-4 px-4 text-center font-semibold">
                        {z.totalDistricts || 0}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="bg-indigo-50 text-indigo-700 font-mono px-2 py-0.5 rounded text-xs font-semibold">
                          {z.totalMembersCount || 0}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right relative overflow-visible w-28 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveDropdownId(
                              activeDropdownId === z._id ? null : z._id,
                            )
                          }
                          className="px-3 py-1.5 border border-slate-200 bg-white text-slate-700 rounded-lg text-xs font-medium shadow-sm cursor-pointer hover:bg-slate-50"
                        >
                          Actions ▼
                        </button>
                        {activeDropdownId === z._id && (
                          <div className="absolute right-4 top-13 min-w-30 w-32 bg-white border border-slate-200 rounded-lg shadow-xl z-50 py-1 flex flex-col text-left divide-y divide-slate-100">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingZone(z);
                                setValidationError("");
                                setFormInput({
                                  name: z.name,
                                  headquarters: z.headquarters,
                                  // district: z.district?._id || z.district || "", // Safely parses unmarshalled ID values
                                  // **THE FIX**: Checks if the backend populated district as an object or a raw string ID,
                                  // fallback to an empty string if it's currently unassigned.
                                  district:
                                    z.district?._id ||
                                    (typeof z.district === "string"
                                      ? z.district
                                      : ""),
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
                                setZoneToDelete(z);
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
                  ))}
                </tbody>
              </table>
            </div>
            {/* 2. FULL WIDTH PAGINATION CONTAINER: Placed outside the scroll wrapper */}
            <div className="w-full border-t border-slate-200 bg-white p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Left Side Metadata */}
              <div className="text-xs text-slate-500 text-center sm:text-left">
                Showing page{" "}
                <span className="font-semibold text-slate-700">
                  {currentPage}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-700">
                  {totalPages}
                </span>{" "}
                ({totalItems} total items)
              </div>

              {/* Right Side Control Buttons */}
              <div className="flex items-center justify-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => loadZones(searchTerm, currentPage - 1)}
                  className="px-3 py-1.5 border border-slate-200 rounded-md text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white cursor-pointer transition-colors"
                >
                  Previous
                </button>

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => loadZones(searchTerm, currentPage + 1)}
                  className="px-3 py-1.5 border border-slate-200 rounded-md text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white cursor-pointer transition-colors"
                >
                  Next
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
              {editingZone ? "📝 Modify Zone Settings" : "➕ Register New Zone"}
            </h3>

            {validationError && (
              <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-600 rounded-lg">
                {validationError}
              </div>
            )}

            <form onSubmit={handleSaveZone} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                  Zone Cluster Name
                </label>
                <input
                  type="text"
                  required
                  value={formInput.name}
                  onChange={(e) =>
                    setFormInput({ ...formInput, name: e.target.value })
                  }
                  placeholder="e.g., ZONE C"
                  // className="w-full p-2.5 border rounded-lg text-sm bg-slate-50 outline-none focus:border-indigo-500"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                  Regional Headquarters
                </label>
                <input
                  type="text"
                  required
                  value={formInput.headquarters}
                  onChange={(e) =>
                    setFormInput({ ...formInput, headquarters: e.target.value })
                  }
                  placeholder="e.g., Airport Road Annex"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                />
              </div>
              {/* **DYNAMICS DISTRICT DROPDOWN SELECTOR BLOCK** */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Assign Parent District Group Linkage
                </label>

                <Dropdown
                  placeholder="Select Associated District"
                  value={formInput.district}
                  onChange={(val) =>
                    setFormInput({ ...formInput, district: val })
                  }
                  // Map your active database models to labels and values arrays
                  options={districtsList.map((d) => ({
                    label: `${d.name} (${d.code})`,
                    value: d._id,
                  }))}
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

      {/* DYNAMIC CONFIRMATION MODAL (DELETE) */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 space-y-4 shadow-xl text-center">
            <div className="mx-auto w-12 h-12 bg-red-50 text-red-600 flex items-center justify-center rounded-full text-xl">
              ⚠️
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Delete Zone Cluster?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you completely sure you want to remove{" "}
                <strong className="text-slate-800">{zoneToDelete?.name}</strong>
                ? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setZoneToDelete(null);
                }}
                className="px-4 py-2 text-xs border rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                No, Keep It
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteZone}
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
