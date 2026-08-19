import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useStats } from "../contexts/StatsContext.jsx";
import { CustomTable } from "../components/CustomTable";
import { Toast } from "../components/Toast";
import { StatusBadge } from "../components/StatusBadge";
import { MemberModal } from "../components/MemberModal.jsx";
import { ConfirmationDialog } from "../components/ConfirmationDialog";
import { memberService } from "../api/apiClient.js";

const Home = () => {
  const { user: currentUserSession } = useAuth();
  const { refreshStats } = useStats();
  // State managers
  const [membersDataList, setMembersDataList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState(null);

  // Modal controls
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    mobilePhone: "",
    assignedCell: "ELEVATION006",
    gender: "Male",
    status: "Active",
  });

  const columns = [
    { id: "name", label: "Member Name", sortable: true },
    { id: "cell", label: "Assigned Cell Group", sortable: true },
    { id: "role", label: "Leadership Role", sortable: true },
    {
      id: "status",
      label: "Roster Status",
      sortable: false,
      // ✅ Add a render handler that outputs the component strictly inside the <td> tag
      render: (value) => <StatusBadge status={value} />,
    },
  ];

  // Ingestion engine
  const loadChurchDirectory = async () => {
    try {
      setLoading(true);

      const response = memberService.list
        ? await memberService.list()
        : (await memberService.getAll?.()) || { members: [] };

      const rawMembers = response?.members || response?.data || response || [];

      const formattedMembers = rawMembers.map((m, idx) => ({
        id: m._id || m.id || idx,
        cells: {
          name: m.name || m.fullName || "Church Member",
          // cell: m.assignedCell || m.cellName || "Unassigned Center",
          cell:
            m.cell?.name || m.cell?.cellName || String(m.cell || "Unassigned"),
          role: m.leadershipRole || m.role || "Member",
          // status: m.isActive !== false ? "Active" : "Inactive", // 🔑 Store only raw string text here!
          status: m.status || "Active",
        },
        raw: {
          ...m,
          phone: m.phone || "",
          cellId: m.cell?._id || m.cell || "", // Retain the pure structural ObjectId for select forms
          gender: m.gender || "Male",
          status: m.status || "Active",
        },
      }));
      setMembersDataList(formattedMembers);
    } catch (error) {
      console.error(
        "Failed to load regional tracking records registry:",
        error,
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChurchDirectory();
  }, []);

  const triggerToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleAddNew = () => {
    setSelectedRecord(null);
    setFormData({
      name: "",
      mobilePhone: "",
      assignedCell: "",
      gender: "Male",
      status: "Active",
    });
    setIsFormOpen(true);
  };

  const handleEditTrigger = (row) => {
    setSelectedRecord(row);
    setIsFormOpen(true);
  };

  const handleViewDetailsTrigger = (row) => {
    setSelectedRecord(row); // Save active database reference node
    // Repopulate form payload states with safe clean defaults from raw mongo parameters
    setFormData({
      name: row.raw?.name || row.cells?.name || "",
      phone: row.raw?.phone || "",
      cell: row.raw?.cellId || "", // Pass the raw ObjectId to make dropdown selectors auto-bind perfectly
      gender: row.raw?.gender || "Male",
      status: row.raw?.status || row.cells?.status || "Active",
    });
    setIsFormOpen(true);
  };
  const handleSaveRecord = async (savedRow) => {
    try {
      setLoading(true);
      const payload = {
        name: (savedRow?.cells?.name || "").trim(),
        phone: (savedRow?.cells?.phone || "").trim(),
        cell: savedRow?.cells?.cell || null,
        gender: savedRow?.cells?.gender || "Male",
        status: savedRow?.cells?.status || "Active",
      };
      const isExistingRecord =
        selectedRecord && !String(selectedRecord.id).startsWith("seed_");
      if (isExistingRecord) {
        await memberService.update(selectedRecord.id, payload);
        triggerToast(
          "Member profile updated successfully inside MongoDB!",
          "success",
        );
      } else {
        // await memberService.save(payload);
        await memberService.create(payload);
        triggerToast(
          "New member record registered safely into the database!",
          "success",
        );
      }
      await refreshStats();
      setIsFormOpen(false);
      loadChurchDirectory();
      setSelectedRecord(null); // Clear tracking target references safely
    } catch (err) {
      console.error("Database tracking persist failure:", err);
      triggerToast(
        "Could not commit document mutations to cloud cluster.",
        "danger",
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = useMemo(() => {
    if (!searchQuery) return membersDataList;
    return membersDataList.filter(
      (r) =>
        r.cells.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.cells.cell.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.cells.role.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [searchQuery, membersDataList]);

  const handleDeleteTrigger = async (row) => {
    if (
      window.confirm(
        `Are you sure you want to completely remove ${row.cells.name}?`,
      )
    ) {
      try {
        setLoading(true);
        await memberService.remove(row.id);
        triggerToast(
          "Member record removed safely from directory cluster.",
          "success",
        );
        await refreshStats();
        loadChurchDirectory(); // Refresh data grid
      } catch (err) {
        console.error("Failed to execute data cluster removal:", err);
        triggerToast("Could not purge record from database cluster.", "danger");
      } finally {
        setLoading(false);
      }
    }
  };
  return (
    <div className="w-full min-h-screen bg-gray-50/50 p-3 sm:p-6 md:p-8 antialiased font-sans text-gray-800">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* 1. JUMBOTRON HEADER PANEL CARD */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200/80 p-6 md:p-10 w-full mx-auto transition-all duration-300 hover:shadow-sm">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            Getting Started
          </span>

          <h1 className="text-3xl font-bold md:text-4xl lg:text-5xl tracking-tight text-gray-900 leading-tight mb-4">
            Winners Cell Register
          </h1>

          <p className="text-sm md:text-base text-gray-600 max-w-5xl font-normal leading-relaxed mb-8">
            Seamlessly track attendance across zones, districts, and provinces
            while managing comprehensive member profiles in real time. Monitor
            engagement metrics effortlessly across all structural levels down to
            individual local centers. Capture structural information instantly
            and drive regional success with precision.
          </p>

          <div className="flex flex-col sm:flex-row sm:justify-start items-center gap-3">
            <button
              type="button"
              onClick={handleAddNew}
              className="w-full sm:w-auto px-5 py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl transition shadow-xs cursor-pointer text-sm"
            >
              Register Member
            </button>
            <button
              type="button"
              onClick={() =>
                document.getElementById("regional-search")?.focus()
              }
              className="w-full sm:w-auto px-5 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold rounded-xl transition cursor-pointer text-sm"
            >
              Find Cell Scope
            </button>
          </div>
        </div>

        {/* 2. REGIONAL DIRECTORY SEARCH FILTER CONTAINER */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200/80 p-5 w-full mx-auto transition-all duration-300 hover:shadow-sm">
          <div className="text-left w-full mb-6">
            <h2 className="text-xl font-bold tracking-tight text-gray-900 mb-1">
              Find Members & Regional Records
            </h2>
            <p className="text-xs text-gray-400 font-normal">
              Quickly search across all provinces, districts, zones, and
              attendance files using names or identifier tokens.
            </p>
          </div>

          <div className="w-full">
            <label
              htmlFor="regional-search"
              className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 px-1"
            >
              Search Directory
            </label>

            <div className="relative flex items-center group w-full">
              <div className="absolute left-4 text-gray-400 pointer-events-none group-focus-within:text-blue-500 transition-colors">
                <svg
                  xmlns="http://w3.org"
                  className="h-5 w-5"
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
              </div>

              <input
                type="text"
                id="regional-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by member name, cell location code, or leadership title..."
                className="w-full pl-12 pr-28 py-3.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl font-medium placeholder-gray-400 text-xs focus:outline-hidden focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
              />

              <button className="absolute right-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg text-xs transition-colors cursor-pointer">
                Search
              </button>
            </div>
          </div>
        </div>

        {/* 3. LIVE GRID VIEW */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
          {/* Scenario A: User hasn't typed anything yet */}
          {!searchQuery.trim() ? (
            <div className="text-center py-20 text-xs font-semibold text-gray-400">
              Type a member name or cell code in the search directory box above
              to display records.
            </div>
          ) : loading ? (
            <div className="text-center py-20 text-xs font-bold text-gray-400 animate-pulse">
              Querying live membership profiles from MongoDB cluster...
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-20 text-xs font-semibold text-gray-400 italic">
              No matching structural member profiles found inside directory
              logs.
            </div>
          ) : (
            <CustomTable
              headers={columns}
              rows={filteredRecords}
              onRowClick={handleEditTrigger}
              onViewDetails={handleViewDetailsTrigger} //{/* ✅ Added View handler
              onDeleteRow={handleDeleteTrigger} //{/* ✅ Synced correct prop name */}
            />
          )}
        </div>

        {/* =========================================================================
          4. GLOBAL SYSTEM POPUP INTERCEPTORS CONTROLLER OVERLAYS
          ========================================================================= */}
        {isFormOpen && (
          <MemberModal
            isOpen={isFormOpen}
            onClose={() => {
              setIsFormOpen(false);
              setSelectedRecord(null);
            }}
            onSave={handleSaveRecord}
            initialData={selectedRecord}
          />
        )}

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </div>
  );
};

export default Home;
