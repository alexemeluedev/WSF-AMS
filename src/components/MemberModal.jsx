import React, { useState, useEffect } from "react";
import { cellService } from "../api/apiclient"; // Adjust path to your file destination

export const MemberModal = ({ isOpen, onClose, onSave, initialData }) => {
  // 1. STATE INITIALIZATION SYNCHRONIZED WITH MONGOOSE FIELDS
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    cell: "",
    gender: "Male",
    status: "Active",
  });

  const [cellOptions, setCellOptions] = useState([]);
  const [loadingCells, setLoadingCells] = useState(false);

  // 2. FETCH CELL SELECTION OPTIONS FROM MONGO CLUSTER
  useEffect(() => {
    const fetchCellList = async () => {
      try {
        setLoadingCells(true);
        // Call explicit endpoint from apiclient
        const data = await cellService.list();
        const rawCells = data?.cells || data?.data || data || [];
        setCellOptions(rawCells);
      } catch (err) {
        console.error("Failed to load cell groups selection links:", err);
      } finally {
        setLoadingCells(false);
      }
    };

    if (isOpen) {
      fetchCellList();
    }
  }, [isOpen]);

  // 3. UNPACK PREVIOUS DATA MODEL DYNAMICALLY ON EDIT OR NEW FORM TRIGGER
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          name: initialData.raw?.name || initialData.cells?.name || "",
          phone: initialData.raw?.phone || "",
          // Fall back to unpopulated ID string if nested reference doesn't exist
          cell: initialData.raw?.cell?._id || initialData.raw?.cell || "",
          gender: initialData.raw?.gender || "Male",
          status: initialData.raw?.status || "Active",
        });
      } else {
        // Safe baseline layout for brand new member creations
        setFormData({
          name: "",
          phone: "",
          cell: "",
          gender: "Male",
          status: "Active",
        });
      }
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    // Package pure normalized keys array back up to top-level runtime interceptors
    onSave({
      id: initialData ? initialData.id : null,
      cells: {
        name: formData.name,
        phone: formData.phone,
        cell: formData.cell,
        gender: formData.gender,
        status: formData.status,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Background Dim Backdrop Panel overlay click rules */}
      <div
        className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      ></div>

      {/* Main Structural Input Windows Wrapper */}
      <div className="relative transform overflow-hidden rounded-2xl bg-white p-6 md:p-8 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md z-10 w-full border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header Layout */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 tracking-tight">
              {initialData ? "Update Member Profile" : "Register New Member"}
            </h3>
            <p className="text-xs text-gray-400 font-normal mt-0.5">
              Ensure all parameters line up with active records.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors w-8 h-8 rounded-full flex items-center justify-center font-semibold text-lg cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Input Target Forms Fields Map */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* A. NAME FIELD */}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 px-0.5">
              Full Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Bro. Alex Emelue"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 text-gray-900 rounded-xl font-medium text-xs focus:outline-hidden focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
            />
          </div>

          {/* B. PHONE NUMBER FIELD */}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 px-0.5">
              Mobile Contact Phone
            </label>
            <input
              type="tel"
              required
              placeholder="e.g. +2348030000000"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 text-gray-900 rounded-xl font-medium text-xs focus:outline-hidden focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
            />
          </div>

          {/* C. RELATIONAL CELL ASSIGNMENT FIELD */}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 px-0.5">
              Assigned Regional Cell Group
            </label>
            <select
              required
              value={formData.cell}
              onChange={(e) =>
                setFormData({ ...formData, cell: e.target.value })
              }
              className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 text-gray-900 rounded-xl font-medium text-xs focus:outline-hidden focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
            >
              <option value="" disabled hidden>
                {loadingCells
                  ? "Loading cells list from server..."
                  : "Select Center Group Placement..."}
              </option>
              {cellOptions.map((cellItem) => (
                <option key={cellItem._id} value={cellItem._id}>
                  {cellItem.name || cellItem.cellName} (
                  {cellItem._id.substring(18)})
                </option>
              ))}
            </select>
          </div>

          {/* D. GENDER GROUP ENUM FIELD */}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 px-0.5">
              Gender Grouping
            </label>
            <select
              value={formData.gender}
              onChange={(e) =>
                setFormData({ ...formData, gender: e.target.value })
              }
              className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 text-gray-900 rounded-xl font-medium text-xs focus:outline-hidden focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* E. STATUS ENUM FIELD */}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 px-0.5">
              Roster Status
            </label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
              className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 text-gray-900 rounded-xl font-medium text-xs focus:outline-hidden focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Action Trigger Buttons Footer Layout */}
          <div className="pt-4 flex justify-end gap-2 border-t border-gray-50 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-gray-500 hover:text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition cursor-pointer"
            >
              Cancel Close
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold text-white bg-gray-900 hover:bg-gray-800 rounded-xl shadow-xs transition cursor-pointer"
            >
              {initialData ? "Apply Modification" : "Commit Record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
