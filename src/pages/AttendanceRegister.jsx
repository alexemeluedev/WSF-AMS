import React, { useState, useMemo, useEffect } from "react";
import { useStats } from "../contexts/StatsContext.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import {
  memberService,
  attendanceService,
  cellService,
} from "../api/apiClient.js";
import Dropdown from "../components/Dropdown.jsx";
// Sub-Component: Dynamic Status Indicator Badge
const Badge = ({ text, color = "indigo" }) => {
  const themes = {
    indigo:
      "bg-indigo-50 border-indigo-200 text-indigo-700 print:bg-white print:text-black print:border-none print:px-0",
    red: "bg-red-50 border-red-200 text-red-700 print:bg-white print:text-black print:border-none print:px-0",
    slate:
      "bg-slate-100 border-slate-300 text-slate-700 print:bg-white print:text-black print:border-none print:px-0",
    emerald:
      "bg-emerald-50 border-emerald-200 text-emerald-700 print:bg-white print:text-black print:border-none print:px-0",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${themes[color]}`}
    >
      {text}
    </span>
  );
};

export const AttendanceRegister = () => {
  const { user } = useAuth();
  const { refreshStats } = useStats();
  // Stores the live cell elements loaded from the database
  const [cellsList, setCellsList] = useState([]);
  const [attendanceSheetData, setAttendanceSheetData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    return (
      localStorage.getItem("cell_date") ||
      new Date().toISOString().split("T")[0]
    );
  });
  const [selectedCell, setSelectedCell] = useState(() => {
    return localStorage.getItem("cell_loc") || ""; // Leave blank so fetchCells can initialize it if empty
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMembers, setSelectedMembers] = useState(new Set());
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [globalLoading, setGlobalLoading] = useState(true);

  // HISTORICAL SAVED STATES
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [historicalLogs, setHistoricalLogs] = useState([]);
  const [logSearchQuery, setLogSearchQuery] = useState("");

  // STATE TRACKING FOR ACTIVE CELL LEADER ASSIGNMENT
  const [assignedLeaderState, setAssignedLeaderState] = useState(null);
  const [isAssigningLeader, setIsAssigningLeader] = useState(false);

  const itemsPerPage = 4; // Paginated limits per view viewport

  const [members, setMembers] = useState([]);
  // Tracks the active states of the co-ordinator visitation check options
  const [visitationLogs, setVisitationLogs] = useState({
    zonalVisit: false,
    districtVisit: false,
    provincialVisit: false,
  });

  const [attendance, setAttendance] = useState({});

  // Modal Overlay and Interactive Notification Feedback States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [formInput, setFormInput] = useState({
    name: "",
    phone: "",
    sex: "MALE",
  });
  const [savedSessions, setSavedSessions] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);

  // =================================================================
  // SYNCHRONIZATION SIDE EFFECTS (USEEFFECT PIPELINES)
  // =================================================================
  useEffect(() => {
    const syncAttendanceData = async () => {
      try {
        setGlobalLoading(true);

        // 1. DISPATCH TO VERIFIED RE-MAPPED ENDPOINT PATH
        const response = await attendanceService.get(
          selectedDate,
          selectedCell,
        );

        // 2. BACKEND RESPONSE NORMALIZATION
        // If backend returns a raw array wrapper or an object containing a record
        const activeRecord = Array.isArray(response)
          ? response[0]
          : response?.record || response;

        if (activeRecord && Array.isArray(activeRecord.records)) {
          const structuralMap = {};

          activeRecord.records.forEach((rec) => {
            if (rec.memberId) {
              structuralMap[rec.memberId] = rec.status;
            }
          });

          setAttendance(structuralMap);

          // SYNCHRONIZE AUXILIARY CHECKBOX STATES
          setVisitationLogs({
            zonalVisit: !!activeRecord.zonalVisit,
            districtVisit: !!activeRecord.districtVisit,
            provincialVisit: !!activeRecord.provincialVisit,
          });
        } else {
          // Fallback clean profile state
          setAttendance({});
          setVisitationLogs({
            zonalVisit: false,
            districtVisit: false,
            provincialVisit: false,
          });
        }
      } catch (error) {
        console.error("Error refreshing historical attendance matrix:", error);
        setAttendance({});
        setVisitationLogs({
          zonalVisit: false,
          districtVisit: false,
          provincialVisit: false,
        });
      } finally {
        setGlobalLoading(false);
      }
    };

    if (
      selectedDate &&
      selectedCell &&
      selectedCell.trim() !== "" &&
      !selectedCell.includes("-- Select")
    ) {
      syncAttendanceData();
    } else {
      setAttendance({});
      setVisitationLogs({
        zonalVisit: false,
        districtVisit: false,
        provincialVisit: false,
      });
    }
  }, [selectedDate, selectedCell]);
  useEffect(() => {
    const fetchCells = async () => {
      try {
        const response = await cellService.list();

        let structuredCells = [];
        if (Array.isArray(response)) {
          structuredCells = response;
        } else if (response && Array.isArray(response.cells)) {
          structuredCells = response.cells;
        } else if (response && response.data && Array.isArray(response.data)) {
          structuredCells = response.data;
        }

        setCellsList(structuredCells);

        // 🔑 THE FIX: Only select the first cell if localStorage is empty
        const savedCell = localStorage.getItem("cell_loc");
        if (structuredCells.length > 0 && !savedCell && !selectedCell) {
          const defaultCell = structuredCells[0].name || structuredCells[0]._id;
          setSelectedCell(defaultCell);
          localStorage.setItem("cell_loc", defaultCell);
        } else if (savedCell && !selectedCell) {
          setSelectedCell(savedCell);
        }
      } catch (err) {
        console.error(
          "Could not mount cell records onto selector arrays:",
          err,
        );
      }
    };

    fetchCells();
  }, []);

  useEffect(() => {
    const loadExistingRoster = async () => {
      try {
        setGlobalLoading(true);
        setExpandedRowId(null); // Reset option rows when switching views

        // Requesting the backend records using your updated api client method
        const response = await attendanceService.get(
          selectedDate,
          selectedCell,
        );

        // Look inside the response envelope returned by your getAttendanceByDate controller
        if (
          response &&
          response.record &&
          Array.isArray(response.record.records)
        ) {
          const rosterMap = {};

          // Map the array into a flat key-value state pair: { "member_id_1": "Present" }
          response.record.records.forEach((rec) => {
            rosterMap[rec.memberId] = rec.status;
          });

          setAttendance(rosterMap);
        } else {
          // Fall back to a clean sheet if your controller returned an empty payload
          setAttendance({});
        }
      } catch (error) {
        console.error("Failed to load historical cell roster sheets:", error);
        setAttendance({}); // Clean fallback on query faults
      } finally {
        setGlobalLoading(false);
      }
    };

    if (selectedDate && selectedCell) {
      loadExistingRoster();
    }
  }, [selectedDate, selectedCell]); // Fires instantly every single time the date or cell changes

  useEffect(() => {
    const checkSessionOverrides = () => {
      const isOverrideActive = localStorage.getItem("is_history_override");
      // **THE DROPDOWN UNLOCK TRICK**:
      // If the override is active, allow the state initializer to read it once, then immediately destroy it.
      if (isOverrideActive === "true") {
        localStorage.removeItem("is_history_override");
      } else {
        // If the user manually refreshes the browser, clear everything so they get fresh default states
        localStorage.removeItem("cell_date");
        localStorage.removeItem("cell_loc");
      }
    };

    checkSessionOverrides();
  }, []);

  useEffect(() => {
    const loadMembersForSelectedCell = async () => {
      // 1. HARD GUARD: If no cell is selected yet, clear the roster view and stop execution
      if (!selectedCell || selectedCell.trim() === "") {
        setMembers([]);
        setGlobalLoading(false);
        return;
      }

      try {
        setGlobalLoading(true);

        // 2. FILTER QUERY: Pass the selected cell name as a query string down your API client request pipeline
        const response = await memberService.list(
          `?cell=${encodeURIComponent(selectedCell)}`,
        );

        // Handle array unpack layouts safely based on your backend response envelope
        const data = Array.isArray(response)
          ? response
          : response.members || [];

        const normalizedMembers = data.map((member) => ({
          ...member,
          id: member._id || member.id, // Guarantee unified ID bindings
        }));

        setMembers(normalizedMembers);
      } catch (error) {
        console.error(
          "Failed to load members for the active cell scope:",
          error,
        );
        setToastMessage({
          text:
            error.message || "Could not load filtered cell directory members.",
          type: "error",
        });
      } finally {
        setGlobalLoading(false);
      }
    };

    loadMembersForSelectedCell();
  }, [selectedCell]); // 🔑 CRITICAL: Re-runs instantly every single time the cell location dropdown changes

  useEffect(() => {
    localStorage.setItem("cell_date", selectedDate);
    localStorage.setItem("cell_loc", selectedCell);
  }, [selectedDate, selectedCell]);

  // =================================================================
  // DYNAMIC METRIC ARRAYS EVALUATION (USEMEMO COMPUTATIONS)
  // =================================================================
  const analytics = useMemo(() => {
    const total = members.length;
    let presentCount = 0;
    let absentCount = 0;

    members.forEach((m) => {
      if (attendance[m.id] === "Present") presentCount++;
      if (attendance[m.id] === "Absent") absentCount++;
    });

    const unmarkedCount = total - (presentCount + absentCount);
    const attendanceRate =
      total > 0 ? Math.round((presentCount / total) * 100) : 0;

    return { total, presentCount, absentCount, unmarkedCount, attendanceRate };
  }, [members, attendance]);

  const filteredMembers = useMemo(() => {
    if (!searchTerm) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.phone.includes(searchTerm),
    );
  }, [members, searchTerm]);

  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage) || 1;
  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMembers.slice(start, start + itemsPerPage);
  }, [filteredMembers, currentPage]);

  // =================================================================
  //  ACTION CONTROLLER LOGIC PIPELINES
  // =================================================================
  const handleAttendanceChange = (memberId, status) => {
    setAttendance((prev) => {
      if (prev[memberId] === status) {
        const next = { ...prev };
        delete next[memberId];
        return next;
      }
      return { ...prev, [memberId]: status };
    });
  };

  const handleDeleteMember = async (member) => {
    const memberId = member._id || member.id;

    // 1. SYSTEM DIALOG CONFIRMATION LAYER
    if (
      !confirm(
        `🚨 WARNING: Are you sure you want to permanently remove "${member.name}" from the database directory?`,
      )
    ) {
      return; // Hard stop if user clicks cancel
    }

    try {
      setGlobalLoading(true);
      // 2. DISPATCH THE NETWORK DELETE REQUEST
      // Calls memberService.remove which passes your security headers and token wrapper
      await memberService.remove(memberId);

      // 3. UI STATE SYNCING: Drop the member instantly from the active view array rows
      setMembers((prev) => prev.filter((m) => (m._id || m.id) !== memberId));
      await refreshStats();
      setToastMessage({
        text: `🗑️ Member "${member.name}" successfully purged from the registry.`,
        type: "success",
      });
    } catch (error) {
      console.error("Failed to drop member profile entry:", error);
      setToastMessage({
        text: error.message || "Could not remove member from the database.",
        type: "error",
      });
    } finally {
      setGlobalLoading(false);
      setExpandedRowId(null); // Close the option drawer sub-panel overlay
    }
  };

  // REGISTRATION METADATA BRAND CARD DATA RESOLVER
  const activeCellMetadata = (() => {
    // 1. DYNAMIC ARRAY DETECTION SAFETY GUARDS
    let sourceArray = [];
    if (typeof cells !== "undefined" && Array.isArray(cells))
      sourceArray = cells;
    else if (typeof cellList !== "undefined" && Array.isArray(cellList))
      sourceArray = cellList;
    else if (typeof cellsList !== "undefined" && Array.isArray(cellsList))
      sourceArray = cellsList;
    else if (typeof cellOptions !== "undefined" && Array.isArray(cellOptions))
      sourceArray = cellOptions;

    // 2. QUERY MATCH AGAINST SELECTED TEXT KEY NAME OR DATABASE ID
    return (
      sourceArray.find(
        (c) => c?.name === selectedCell || c?._id === selectedCell,
      ) || null
    );
  })();

  const handleSaveCellLeaderAssignment = async (memberId) => {
    const selectedLeader = filteredMembers.find(
      (m) => m.id === memberId || m._id === memberId,
    );

    if (!selectedLeader || !activeCellMetadata?._id) return;

    try {
      setGlobalLoading(true);

      const response = await cellService.update(activeCellMetadata._id, {
        ...activeCellMetadata,
        leaderName: selectedLeader.name,
        phone: selectedLeader.phone || "",
      });

      if (response && response.cell) {
        // 1. UPDATE THE LOCAL MASTER ARRAY STATE CACHE IMMEDIATELY
        // This forces the IIFE array to recognize the changes permanently
        if (typeof setCells === "function") {
          setCells((prev) =>
            prev.map((c) => (c._id === response.cell._id ? response.cell : c)),
          );
        } else if (typeof setCellList === "function") {
          setCellList((prev) =>
            prev.map((c) => (c._id === response.cell._id ? response.cell : c)),
          );
        } else if (typeof setCellsList === "function") {
          setCellsList((prev) =>
            prev.map((c) => (c._id === response.cell._id ? response.cell : c)),
          );
        }

        // 2. Set local display text
        setAssignedLeaderState({
          name: response.cell.leaderName,
          phone: response.cell.phone || "",
        });

        setIsAssigningLeader(false);

        setToastMessage({
          text: `👑 ${selectedLeader.name} assigned as permanent Cell Leader successfully!`,
          type: "success",
        });
      }
    } catch (error) {
      console.error("Leader assignment pipeline failure:", error);
    } finally {
      setGlobalLoading(false);
    }
  };

  // Alias wrapper to satisfy the missing layout reference and forward the execution context
  const handleSaveAttendanceToDatabase = async (memberId) => {
    return await handleSaveCellLeaderAssignment(memberId);
  };

  const handleSubmitFullAttendance = async (e) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();

    // 1. DATE CONSTRAINT FALLBACK: Use selected date or default to current date string
    const activeDateValue =
      selectedDate || new Date().toISOString().split("T")[0];

    // 2. CELL CONSTRAINT GUARD: Enforce that an active cell is selected
    if (!selectedCell || selectedCell === "") {
      setToastMessage({
        text: "⚠️ Constraint Violation: You must select a Cell before marking attendance.",
        type: "error",
      });
      return;
    }

    // 3. TARGET MEMBERS ROSTER DETECTION:
    // Dynamically find where your list of members is loaded
    const baseMembersRoster =
      (typeof filteredMembers !== "undefined" && Array.isArray(filteredMembers)
        ? filteredMembers
        : null) ||
      (typeof records !== "undefined" && Array.isArray(records)
        ? records
        : null) ||
      attendanceSheetData?.records ||
      [];

    // MEMBER LOADING GUARD: Ensure rows exist on the grid
    if (!baseMembersRoster || baseMembersRoster.length === 0) {
      setToastMessage({
        text: "⚠️ Constraint Violation: No member records loaded to mark.",
        type: "error",
      });
      return;
    }

    //  STRICT STATUS VALUE CONSTRAINT GUARD:
    // We check your live 'attendance' object state to see if EVERY member has a chosen toggle status
    const allRowsManuallyMarked = baseMembersRoster.every((member) => {
      const memberId = member._id || member.id || member.memberId;
      // Reads straight from your handleAttendanceChange object state storage:
      const markedStatus = attendance && attendance[memberId];
      return markedStatus === "Present" || markedStatus === "Absent";
    });

    if (!allRowsManuallyMarked) {
      setToastMessage({
        text: "⚠️ Constraint Violation: Please ensure all members are explicitly marked as Present or Absent before saving.",
        type: "error",
      });
      return;
    }

    // 5 PACK RECORDS FOR THE BACKEND:
    // Convert your object state updates back into the structured array array your MongoDB expects
    const formattedRecordsPayload = baseMembersRoster.map((member) => {
      const memberId = member._id || member.id || member.memberId;
      return {
        memberId: memberId,
        name: member.name,
        phone: member.phone || "",
        gender: member.gender || "",
        status: attendance[memberId], // injects "Present" or "Absent" cleanly
      };
    });

    try {
      setGlobalLoading(true);

      const updatedPayload = {
        date: activeDateValue,
        cellName: selectedCell,
        records: formattedRecordsPayload, // Sends the fully tracked updates array
        notes:
          typeof notes !== "undefined"
            ? notes
            : attendanceSheetData?.notes || "",
        leaderName: assignedLeaderState?.name || "",
        leaderPhone: assignedLeaderState?.phone || "",
      };

      // Commit changes straight to the Express backend database
      const response = await attendanceService.save(updatedPayload);

      if (response) {
        if (typeof setAttendanceSheetData === "function") {
          setAttendanceSheetData(response.attendance);
        }

        setToastMessage({
          text: `📁 Attendance sheet for ${selectedCell} on ${activeDateValue} saved successfully!`,
          type: "success",
        });
        // // **THE FIX**: Reset attendance input tracking states after successful submission
        // if (typeof setAttendance === "function") {
        //   setAttendance({}); // Wipes out the individual member "Present"/"Absent" selections
        // }
        // if (typeof setSelectedCell === "function") {
        //   setSelectedCell(""); // Clears chosen cell selector field dropdown context
        // }
        // if (typeof setNotes === "function") {
        //   setNotes(""); // Resets text inputs tracking temporary session annotations
        // }
      }
    } catch (error) {
      console.error("Full attendance submission failure:", error);
      setToastMessage({
        text: "Failed to save attendance report.",
        type: "error",
      });
    } finally {
      setGlobalLoading(false);
    }
  };
  const loadSavedSessionsSummary = () => {
    const sessions = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("cell_att_saved_")) {
        try {
          const attData = JSON.parse(localStorage.getItem(key) || "{}");
          const parts = key.split("_");
          let pCount = 0;
          let aCount = 0;
          Object.values(attData).forEach((val) => {
            if (val === "Present") pCount++;
            if (val === "Absent") aCount++;
          });
          sessions.push({
            key: key,
            date: parts[3] || "Unknown Date",
            cell: parts[4] || "Unknown Cell",
            stats: { present: pCount, absent: aCount },
          });
        } catch (e) {
          console.error("Error logs reading error", e);
        }
      }
    }
    setSavedSessions(sessions);
  };

  useEffect(() => {
    loadSavedSessionsSummary();
  }, [attendance]);

  const handleLoadHistoricalSession = (sessionKey) => {
    try {
      const attData = JSON.parse(localStorage.getItem(sessionKey) || "{}");
      const parts = sessionKey.split("_");
      setSelectedDate(parts[3]);
      setSelectedCell(parts[4]);
      setAttendance(attData);
      setToastMessage({
        text: `⚡ Restored logs dataset for ${parts[3]}!`,
        type: "success",
      });
    } catch (e) {
      setToastMessage({
        text: "⚠️ Failure reading document recovery keys.",
        type: "error",
      });
    }
  };

  const handleSaveMemberForm = async (e) => {
    e.preventDefault();
    setToastMessage(null);
    // 1. HARD GUARD: Stop the form if the user hasn't opened an active cell directory yet
    if (!selectedCell || selectedCell === "") {
      setToastMessage({
        text: "⚠️ Please select a cell location before adding or editing members!",
        type: "error",
      });
      return;
    }

    // 2. CONSTRUCT BINDING DATA PACKET
    const memberPayload = {
      // ...formInput,
      // // Links this specific profile transaction record to your open cell view window context
      // zone: selectedCell, // Or cellName: selectedCell, depending on your backend Schema key
      name: formInput.name,
      phone: formInput.phone,
      gender: formInput.gender,

      // 🔑 THE FIX: Map your frontend 'selectedCell' to the exact key name your backend expects
      cellAssignment: selectedCell, // Replace 'cellAssignment' with 'cellId' or whatever key your backend uses
      cell: selectedCell, // Keep this fallback as a backup layer
    };
    try {
      if (editingMember) {
        const response = await memberService.update(
          editingMember.id || editingMember._id,
          memberPayload,
        );

        setMembers((prev) =>
          prev.map((m) =>
            (m.id || m._id) === (editingMember.id || editingMember._id)
              ? { ...m, ...response.member }
              : m,
          ),
        );
        setToastMessage({
          text: "👤 Member profile modified successfully!",
          type: "success",
        });
      } else {
        // Creation execution stream: Now sends the cell linkage field down to the Node.js database pipes
        const response = await memberService.create(memberPayload);
        const newMember = {
          ...response.member,
          id: response.member._id || response.member.id,
        };

        setMembers((prev) => [newMember, ...prev]);
        await refreshStats();
        setToastMessage({
          text: `🎉 Member successfully added to ${selectedCell}!`,
          type: "success",
        });
      }
      setIsModalOpen(false);
      setEditingMember(null);
    } catch (error) {
      console.error("Member save failed", error);
      setToastMessage({
        text: error.message || "Could not save member.",
        type: "error",
      });
    }
  };

  const handleEditMemberTrigger = (member) => {
    setEditingMember(member);
    setFormInput({ name: member.name, phone: member.phone, sex: member.sex });
    setIsModalOpen(true);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked)
      setSelectedMembers(new Set(paginatedMembers.map((m) => m.id)));
    else setSelectedMembers(new Set());
  };

  const handleSelectRow = (id) => {
    const next = new Set(selectedMembers);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedMembers(next);
  };

  const handleBulkDelete = async () => {
    // 1. BARRIER LAYOUT CHECK: Stop if no checkboxes are active
    if (!selectedMembers || selectedMembers.size === 0) {
      setToastMessage({
        text: "⚠️ Please check the checkboxes of members you wish to delete first!",
        type: "error",
      });
      return;
    }

    // 2. INDEPENDENT BULK GUARD: Warn about mass loss of records
    const confirmBulk = window.confirm(
      `🚨 CRITICAL WARNING: You are about to permanently purge ${selectedMembers.size} selected member records from MongoDB. This action CANNOT be undone. Proceed?`,
    );
    if (!confirmBulk) return;

    try {
      setGlobalLoading(true);

      // Convert Set collection storage items to a map array list
      const idsToDelete = Array.from(selectedMembers);

      // 3. BACKEND NETWORK SYNC: Sends individual delete events to your server concurrently
      await Promise.all(idsToDelete.map((id) => memberService.remove(id)));

      // 4. STATE SYNC: Filter the UI array to strip matching IDs completely
      setMembers((prev) =>
        prev.filter(
          (m) => !selectedMembers.has(m.id) && !selectedMembers.has(m._id),
        ),
      );

      const deletedCount = selectedMembers.size;
      setSelectedMembers(new Set()); // Clear selection hooks checkbox parameters

      setToastMessage({
        text: `🎉 Bulk operation complete! ${deletedCount} records permanently removed from MongoDB.`,
        type: "success",
      });
      await refreshStats();
    } catch (err) {
      console.error("Bulk database deletion execution failed:", err);
      setToastMessage({
        text:
          err.message ||
          "Mass removal transaction failed on the backend server.",
        type: "error",
      });
    } finally {
      setGlobalLoading(false);
    }
  };

  // ATTENDANCE ANALYTICS STATUS CARDS
  // This logic is rendering the pipeline to compute real-time statistics.
  // 1. EXTRACT TOTAL LOADED MEMBERS FROM FILTERED LIST
  const totalLoadedMembers = filteredMembers ? filteredMembers.length : 0;

  // 2. COMPUTE LIVE METRICS BASED ON THE CURRENT ATTENDANCE STATE RENDER PIPELINE
  const presentCount = filteredMembers.filter(
    (m) => attendance[m.id || m._id] === "Present",
  ).length;

  const absentCount = filteredMembers.filter(
    (m) => attendance[m.id || m._id] === "Absent",
  ).length;

  // 3. UNMARKED MEMBERS ARE THOSE WHO HAVE NOT BEEN EXPLICITLY CHECKED AS PRESENT OR ABSENT
  const unmarkedCount = filteredMembers.filter(
    (m) => !attendance[m.id || m._id],
  ).length;

  // 4. CALCULATE RATE MATHEMATICALLY GUARDING AGAINST DIVISION BY ZERO
  const attendanceRate =
    totalLoadedMembers > 0
      ? Math.round((presentCount / totalLoadedMembers) * 100)
      : 0;
  //  DETERMINE IF CURRENT STATE DIFFERS FROM LOCALSTORAGE PERSISTENCE
  const hasUnsavedChanges = (() => {
    const savedData = localStorage.getItem(
      `cell_att_saved_${selectedDate}_${selectedCell}`,
    );
    if (!savedData) return Object.keys(attendance).length > 0;
    return JSON.stringify(attendance) !== savedData;
  })();

  // HISTORICAL SAVED SESSIONS LOGS SUMMARY (STATE & MODAL INTEGRATION)
  // FILTERED HISTORICAL LOGS COMPUTE PIPELINE
  const filteredHistoricalLogs = Array.isArray(historicalLogs)
    ? historicalLogs.filter((log) => {
        // const query = logSearchQuery.toLowerCase().trim();
        const query = (logSearchQuery || "").toLowerCase().trim();
        if (!query) return true;
        const targetDate = String(log.date || "").toLowerCase();
        const targetStatus = String(log.syncStatus || "").toLowerCase();

        return targetDate.includes(query) || targetStatus.includes(query);
      })
    : [];

  // REVISED STATE HOOKS & SESSION RESTORE PIPELINE
  const handleRestoreHistoricalSession = (selectedLog) => {
    if (!selectedLog || !selectedLog.rawRecords) {
      setToastMessage({
        text: "⚠️ System Error: Unable to restore an empty or corrupted log record.",
        type: "error",
      });
      return;
    }

    // 1. RE-CONSTRUCT THE ATTENDANCE STATE OBJECT MAP
    const restoredAttendanceState = {};
    selectedLog.rawRecords.forEach((record) => {
      if (record.memberId) {
        restoredAttendanceState[record.memberId] = record.status;
      }
    });

    // 2. DISPATCH RESTORED DATA METRICS TO LIVED APPLICATION STATES
    setSelectedDate(selectedLog.rawDateString);
    setAttendance(restoredAttendanceState);

    // 3. SYNCHRONIZE LOCALSTORAGE STATE SO HASUNSAVEDCHANGES EVALUATES ACCURATELY
    localStorage.setItem(
      `cell_att_saved_${selectedLog.rawDateString}_${selectedCell}`,
      JSON.stringify(restoredAttendanceState),
    );

    // 4. TERMINATE MODAL SUB-WINDOW VIEW AND RE-ROUTE USER FOCUS
    setIsLogModalOpen(false);
    setLogSearchQuery("");

    setToastMessage({
      text: `📂 Restored database log roster from ${selectedLog.date}!`,
      type: "success",
    });
  };

  const fetchHistoricalLogs = async () => {
    if (
      !selectedCell ||
      selectedCell.trim() === "" ||
      selectedCell.includes("-- Select")
    ) {
      setHistoricalLogs([]);
      return;
    }

    try {
      setGlobalLoading(true);

      const response = await attendanceService.byCell(selectedCell);
      // console.log("SERVER RAW RESPONSE ARRIVED:", response);

      // 1. EXTRACT DATA SEAMLESSLY FROM THE RECORDS PROPERTY ENVELOPE
      // This targets response.records directly based on your console output log
      const rawSessionsArray =
        response && Array.isArray(response.records)
          ? response.records
          : Array.isArray(response)
            ? response
            : [];

      // 2. MAP AND NORMALIZE FIELD PROPERTIES FOR THE UI SLIDE-OUT PANEL
      const processedLogs = rawSessionsArray.map((session, idx) => {
        const rawDate = session.date || "";
        // Clean parsing strategy supporting both plain dates and full ISO strings
        const displayDate =
          typeof rawDate === "string" && rawDate.includes("T")
            ? rawDate.split("T")[0]
            : rawDate;

        return {
          id: session._id || session.id || `historical_session_index_${idx}`,
          date: displayDate || "Unknown Date",
          rawDateString: displayDate || "",
          cellName: session.cellName || selectedCell,
          // Fallback calculations looking directly into individual row item configurations
          present: Array.isArray(session.records)
            ? session.records.filter((r) => r.status === "Present").length
            : 0,
          absent: Array.isArray(session.records)
            ? session.records.filter((r) => r.status === "Absent").length
            : 0,
          syncStatus: "Synced",
          rawRecords: session.records || [], // Preserved payload for your data restoration engine
        };
      });

      // console.log("FINAL PARSED LOGS STORED IN STATE:", processedLogs);
      setHistoricalLogs(processedLogs);
    } catch (error) {
      console.error("Critical logs transaction pipeline failed:", error);
      setToastMessage({
        text: "Failed to retrieve historical cell logs from the server database.",
        type: "error",
      });
    } finally {
      setGlobalLoading(false);
    }
  };

  useEffect(() => {
    setIsAssigningLeader(false);

    // Directly references the updated tracking properties from your master array evaluation data (IIFE)
    if (activeCellMetadata) {
      setAssignedLeaderState({
        name: activeCellMetadata.leaderName || "Unassigned Profile",
        phone: activeCellMetadata.phone || "",
      });
    } else {
      setAssignedLeaderState(null);
    }
  }, [selectedCell, activeCellMetadata]); // Listens tightly to dropdown updates

  const handleMasterAppDataReset = async () => {
    // 🔒 SECURITY GUARDRAILS: Double confirmation gates stop accidental data destruction
    const firstConfirm = window.confirm(
      "🚨 CRITICAL WARNING: You are about to execute a GLOBAL HARD RESET. This will permanently erase EVERY SINGLE attendance sheet logged across all cells from the cloud database. Proceed?",
    );
    if (!firstConfirm) return;

    const secondConfirm = window.confirm(
      "🛑 FINAL VERIFICATION: This action CANNOT BE UNDONE. All monthly statistics, history logs, and turnout rate charts will be wiped to absolute zero. Are you 100% sure?",
    );
    if (!secondConfirm) return;

    try {
      setGlobalLoading(true);

      // 1. Trigger the master backend route to clear out MongoDB collections
      await attendanceService.resetAllData();

      // 2. Complete clean-up of local storage configurations
      localStorage.clear();

      alert(
        "💥 System successfully wiped to factory default state! All cell metrics have been reset to zero.",
      );

      // 3. Force route redirection back to base login terminal to re-authenticate session loops safely
      window.location.href = "/login";
    } catch (err) {
      console.error("Global system reset tool failure:", err);
      alert(
        `❌ Error: ${err.message || "Could not execute data clearing parameters."}`,
      );
    } finally {
      setLoading(false);
    }
  };

  // 🔑 PLACE THIS CLEAN WORKING RESET HANDLER INSIDE YOUR REGISTER COMPONENT:
  const handleResetActiveSheetToggles = async () => {
    if (!selectedCell) {
      alert(
        "ℹ️ Please select a cell location first to clear its worksheet matrix.",
      );
      return;
    }

    const confirmed = window.confirm(
      `🔄 MASTER RESET WORKSHEET: Are you sure you want to completely erase all saved data logs for [${selectedCell}] on [${selectedDate}] inside the database and reset the selection?`,
    );
    if (!confirmed) return;

    try {
      setGlobalLoading(true);

      // 🔑 THE PERSISTENCE FIX: Uses your working save service to overwrite MongoDB records with an empty array
      await attendanceService.save({
        date: selectedDate,
        cellName: selectedCell,
        records: [], // Overwrites the database sheet records array to empty natively
      });

      // Clear out your saved historical local storage keys
      localStorage.removeItem("cell_date");
      localStorage.removeItem("cell_loc");
      localStorage.removeItem("is_history_override");

      // Force the dropdown selector back to "-- Select a Cell Location --"
      setSelectedCell("");

      // Wipe out your checkboxes lookup state object completely
      setAttendance({});

      // Reset top dashboard statistical counter boxes back to absolute zero frame states
      if (typeof setSummaryTotals === "function") {
        setSummaryTotals({
          grandTotal: 0,
          male: 0,
          female: 0,
          children: 0,
          emptyLogs: 0,
        });
      }

      if (typeof setExpandedRowId === "function") setExpandedRowId(null);

      alert(
        `✨ Database updated! [${selectedCell}] worksheet has been wiped clean and reset to default.`,
      );
    } catch (err) {
      console.error(
        "Failed to execute targeted register worksheet database clear:",
        err,
      );
      alert(
        `❌ Error: ${err.message || "Could not clear data logs off the cloud server."}`,
      );
    } finally {
      setGlobalLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8 bg-slate-50/50 min-h-screen space-y-6 antialiased font-sans print:bg-white print:p-0 print:space-y-2">
      <style
        dangerouslySetInnerHTML={{
          __html: `
      @media print {
        /* 1. Hide the global navigation layout frames completely */
        nav, aside, header, button, .no-print, [class*="Navbar"], [class*="Sidebar"] {
          display: none !important;
        }

        /* 2. Reset the main application container frames to take up full page width */
        html, body, #root, main {
          position: static !important;
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          background: white !important;
          color: black !important;
        }

        /* 3. Break the MainLayout's 30%/70% sidebar grid wrapper structure */
        div.grid:has(aside), 
        .min-h-screen.w-full > div.grid {
          display: block !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        /* 4. Force your main container card to take up 100% of the paper width */
        .bg-white.border {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 100% !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          margin: 0 !important;
        }
      }
    `,
        }}
      />
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col xl:flex-row xl:items-end justify-between gap-4 print:hidden">
        {/* Group 1: Date and Cell Location */}
        <div className="flex flex-col sm:flex-row items-stretch xl:items-end gap-3 w-full xl:w-auto no-print">
          {/* Date Section with Calendar Icon */}
          <div className="flex flex-col w-full xl:w-48">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              {" "}
              Select Date{" "}
            </label>
            <div className="relative w-full">
              <span className="absolute left-3 top-2.5 text-slate-400 text-sm pointer-events-none">
                {" "}
                📅{" "}
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  const nextDate = e.target.value;
                  setSelectedDate(nextDate);
                  localStorage.setItem("cell_date", nextDate); // Keeps storage sync intact
                }}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
              />
            </div>
          </div>

          {/* Dropdown Section */}
          <div className="flex flex-col w-full xl:w-64">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              {" "}
              Select Cell Location{" "}
            </label>
            <Dropdown
              placeholder="Select Active Cell"
              value={selectedCell || ""}
              onChange={(val) => {
                // 🔑 THE UI FLASH FIX: Instantly flush checkbox visual states whenever changing cell filters
                setAttendance({});

                if (!val) {
                  setSelectedCell("");
                  localStorage.removeItem("cell_date");
                  localStorage.removeItem("cell_loc");
                  localStorage.removeItem("is_history_override");
                  return;
                }

                setSelectedCell(val);
                localStorage.setItem("cell_loc", val);
              }}
              options={[
                {
                  label: "-- Select a Cell Location --",
                  value: "",
                  disabled: true,
                },
                ...cellsList.map((c) => ({
                  label: c.name,
                  value: c.name,
                })),
              ]}
            />
          </div>
        </div>

        {/* Group 2: Search Input and Add Button */}
        <div className="flex flex-col sm:flex-row items-stretch xl:items-center gap-2 w-full xl:w-auto no-print">
          <div className="relative w-full xl:w-64">
            <input
              type="text"
              placeholder="Find member in cell..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="absolute left-3 top-2.5 text-slate-400 text-sm">
              {" "}
              🔍{" "}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingMember(null);
              setFormInput({ name: "", phone: "", sex: "MALE" });
              setIsModalOpen(true);
            }}
            className="w-full sm:w-auto px-4  py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg transition-colors shadow-sm whitespace-nowrap h-9.5 flex items-center justify-center"
          >
            + Add Member
          </button>
        </div>
      </div>

      {/* LIVE STATUS SYNC ANNOUNCER */}
      <div className="flex items-center justify-between px-1 no-print">
        <div className="text-xs font-medium text-slate-500">
          Live Dashboard Analytics
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          {hasUnsavedChanges ? (
            <>
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-amber-600">
                You have unsaved changes on this screen
              </span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-emerald-600">
                All metrics synced with database roster
              </span>
            </>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6 no-print">
        {/* CARD 1: PRESENT COUNT */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
            Present
          </div>
          <div className="text-2xl font-bold text-emerald-900 mt-1">
            {presentCount}
          </div>
          <div className="text-xs text-emerald-500 mt-1">
            Confirmed attending
          </div>
        </div>

        {/* CARD 2: ABSENT COUNT */}
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-rose-600 uppercase tracking-wider">
            Absent
          </div>
          <div className="text-2xl font-bold text-rose-900 mt-1">
            {absentCount}
          </div>
          <div className="text-xs text-rose-500 mt-1">Marked as away</div>
        </div>

        {/* CARD 3: UNMARKED COUNT */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
            Unmarked
          </div>
          <div className="text-2xl font-bold text-amber-900 mt-1">
            {unmarkedCount}
          </div>
          <div className="text-xs text-amber-500 mt-1">
            Awaiting status input
          </div>
        </div>

        {/* CARD 4: ATTENDANCE RATIO RATE */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm no-print">
          <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
            Attendance Rate
          </div>
          <div className="text-2xl font-bold text-blue-900 mt-1">
            {attendanceRate}%
          </div>
          <div className="text-xs text-blue-500 mt-1">
            Of total {totalLoadedMembers} loaded roster
          </div>
        </div>
      </div>

      {/* HISTORICAL DETAILED SUMMARY ENTRIES BOARD (Hidden on Print) */}
      {/* THE MAIN INTERFACE BUTTON TRIGER LAYER */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 my-6 flex items-center justify-between no-print">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Historical Roster Logs
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Review previously committed sessions for this cell destination.
          </p>
        </div>
        <button
          onClick={() => {
            fetchHistoricalLogs();
            setIsLogModalOpen(true);
          }}
          className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all"
        >
          View Session History ({historicalLogs.length})
        </button>
      </div>

      {/* MODAL OVERLAY PORTAL CONTAINER */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-sm">
          {/* Slide-out Panel Wrapper */}
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-slide-in p-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Saved Sessions History
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cell: {selectedCell || "All Locations"}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsLogModalOpen(false);
                  setLogSearchQuery("");
                }}
                className="text-slate-400 hover:text-slate-600 text-sm font-medium p-1"
              >
                ✕ Close
              </button>
            </div>
            {/* FILTER BAR SECTION */}
            <div className="my-4">
              <div className="relative">
                <input
                  type="text"
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  placeholder="🔍 Search logs by date (YYYY-MM-DD)..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                {logSearchQuery && (
                  <button
                    onClick={() => setLogSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs px-1"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Modal Scrollable Contents */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {filteredHistoricalLogs.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-400">
                  {historicalLogs.length === 0
                    ? "No historical database records logs registered yet."
                    : "No historical records match your search filter."}
                </div>
              ) : (
                filteredHistoricalLogs.map((log) => (
                  <div
                    key={log.id}
                    className="border border-slate-100 rounded-lg p-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-slate-800">
                        {/* {log.date} */}
                        {Array.isArray(log.date)
                          ? log.date[0]
                          : String(log.date || "")}
                      </span>
                      <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        {log.syncStatus}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-dashed border-slate-100 text-[11px]">
                      <div className="text-slate-500">
                        Present:{" "}
                        <strong className="text-emerald-600">
                          {log.present}
                        </strong>
                      </div>
                      <div className="text-slate-500">
                        Absent:{" "}
                        <strong className="text-rose-600">{log.absent}</strong>
                      </div>
                    </div>
                    {/* RESTORATION INTERFACE EVENT TRIGGER ACTION */}
                    <button
                      onClick={() => handleRestoreHistoricalSession(log)}
                      className="w-full bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 py-1.5 rounded-md text-[11px] font-semibold transition-all shadow-none flex items-center justify-center gap-1"
                    >
                      📂 Load into Live Grid
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: REGISTRATION METADATA BRAND CARD */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden print:border-none print:shadow-none">
        <div className="border-b border-slate-100 bg-linear-to-r from-slate-50 to-white px-6 py-5 flex items-center gap-4 print:border-b-2 print:border-slate-800 print:px-0 print:py-1">
          <div className="h-12 w-12 rounded-xl bg-red-600 flex items-center justify-center shadow-md shadow-red-200 print:hidden">
            <span className="text-white font-black text-xl tracking-tighter">
              W
            </span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight print:text-2xl">
              Winners Chapel International
            </h1>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider print:text-slate-700">
              Cell Attendance Register Report — Active Date:{" "}
              <strong className="font-bold font-mono text-black">
                {selectedDate}
              </strong>
            </p>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 print:px-0 print:py-3 print:grid-cols-2">
          <div className="lg:col-span-2 space-y-4 print:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:grid-cols-2">
              {/* CELL NAME CONTAINER */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl print:bg-white print:border-none print:p-0">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider print:text-black">
                  Cell Name
                </span>
                <span className="text-sm font-bold text-slate-800">
                  {activeCellMetadata?.name || selectedCell || "--"}
                </span>
              </div>

              {/* ASSIGNED CELL LEADER POPULATION BOX WITH DROPDOWN MAPPING SHORTCUT */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl print:bg-white print:border-none print:p-0 relative group">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider print:text-black">
                      Assigned Leader
                    </span>
                    <span className="text-sm font-bold text-slate-800 block mt-0.5">
                      {assignedLeaderState?.name ||
                        activeCellMetadata?.leaderName ||
                        activeCellMetadata?.leader ||
                        "Unassigned Profile"}
                      {assignedLeaderState?.phone || activeCellMetadata?.phone
                        ? ` (${assignedLeaderState?.phone || activeCellMetadata?.phone})`
                        : ""}
                    </span>
                  </div>

                  {/* ASSIGNMENT CONTROL SELECT BUTTON INTERFACE PANEL */}
                  <button
                    onClick={() => setIsAssigningLeader(!isAssigningLeader)}
                    className="text-[10px] bg-slate-200/80 hover:bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded transition-all print:hidden"
                  >
                    {isAssigningLeader ? "Cancel" : "Assign Leader"}
                  </button>
                </div>

                {/* DYNAMIC LIST INTERFACE ACTION OVERLAY POPUP */}
                {isAssigningLeader && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 shadow-xl rounded-xl z-30 p-2 max-h-48 overflow-y-auto">
                    <div className="text-[10px] font-bold text-slate-400 uppercase p-1.5 border-b border-slate-100">
                      Select Active Member Roster
                    </div>
                    {!filteredMembers || filteredMembers.length === 0 ? (
                      <div className="text-xs text-slate-400 p-2 text-center">
                        No loaded members available.
                      </div>
                    ) : (
                      filteredMembers.map((member) => (
                        <button
                          key={member.id || member._id}
                          onClick={() =>
                            handleSaveCellLeaderAssignment(
                              member.id || member._id,
                            )
                          }
                          className="w-full text-left text-xs font-semibold px-2 py-1.5 hover:bg-slate-50 rounded-lg text-slate-700 block transition-colors truncate"
                        >
                          👤 {member.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* CELL LOCATION DESCRIPTION */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl print:bg-white print:border-none print:p-0">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider print:text-black">
                Cell Location Address Context
              </span>
              <p className="text-xs font-medium text-slate-600 leading-relaxed mt-0.5 print:text-black print:text-sm">
                {activeCellMetadata?.address ||
                  activeCellMetadata?.location ||
                  "No address context description registered in database repository profile."}
              </p>
            </div>
          </div>

          {/* CO-ORDINATOR VISITATION LOGS RE-ENTRY WRAPPER */}
          <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-4 space-y-3 print:hidden">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 pb-1.5">
              Co-ordinator Visitation Logs
            </span>
            <div className="space-y-2.5">
              <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!visitationLogs.zonalVisit}
                  onChange={(e) =>
                    setVisitationLogs({
                      ...visitationLogs,
                      zonalVisit: e.target.checked,
                    })
                  }
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span>Zonal Co-ordinator's Visit</span>
              </label>
              <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!visitationLogs.districtVisit}
                  onChange={(e) =>
                    setVisitationLogs({
                      ...visitationLogs,
                      districtVisit: e.target.checked,
                    })
                  }
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span>District Co-ordinator's Visit</span>
              </label>
              <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!visitationLogs.provincialVisit}
                  onChange={(e) =>
                    setVisitationLogs({
                      ...visitationLogs,
                      provincialVisit: e.target.checked,
                    })
                  }
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span>Prov. Co-ordinator's Visit</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* ACTIONS SUB-TOOLBAR PANEL (Hidden on Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            // onClick={handleSaveAttendanceToDatabase}
            onClick={handleSubmitFullAttendance}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
          >
            ✓ Save Attendance Roster
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 border border-slate-300 text-slate-600 bg-white hover:bg-slate-50 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors shadow-sm"
          >
            🖨️ Print Report
          </button>

          {/* DYNAMIC CSV EXPORTER FOR EXCEL */}
          <button
            type="button"
            onClick={() => {
              const headersCSV = "S/N,Member Name,Phone,Sex,Status\n";
              const rowsCSV = members
                .map((m, idx) => {
                  // 1. Establish the correct database row unique ID variable reference
                  const memberId = m._id || m.id;

                  // 2. Map database 'gender' field securely to your Sex column output row string
                  const sexField = m.gender || m.sex || "N/A";

                  // 3. Match your live toggles object state context accurately
                  const statusField =
                    attendance && attendance[memberId]
                      ? attendance[memberId]
                      : "Unmarked";

                  return `"${idx + 1}","${m.name}","${m.phone}","${sexField}","${statusField}"`;
                })
                .join("\n");

              const blob = new Blob([headersCSV + rowsCSV], {
                type: "text/csv;charset=utf-8;",
              });
              const link = document.createElement("a");
              link.href = URL.createObjectURL(blob);
              link.setAttribute(
                "download",
                `Attendance_${selectedDate}_${selectedCell}.csv`,
              );
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);

              setToastMessage({
                text: "📊 Data exported successfully to CSV!",
                type: "success",
              });
            }}
            className="px-3 py-2 border border-slate-300 text-slate-600 bg-white hover:bg-slate-50 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors shadow-sm"
          >
            📥 Export Excel/CSV
          </button>

          {user.role == "admin" && (
            <button
              type="button"
              onClick={handleResetActiveSheetToggles}
              className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-100 text-xs font-bold rounded-xl transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto uppercase tracking-wide"
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <span>Clear Sheet Data</span>
            </button>
          )}
          {user.role == "admin" && (
            <button
              type="button"
              onClick={handleMasterAppDataReset}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto uppercase tracking-wide"
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <span>Reset App Data</span>
            </button>
          )}

          {selectedMembers.size > 0 && (
            <button
              type="button"
              onClick={handleBulkDelete}
              className="px-3 py-2 bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors"
            >
              ✕ Delete Selected Members ({selectedMembers.size})
            </button>
          )}
        </div>
        <div className="self-end sm:self-auto">
          <Badge
            text={`${filteredMembers.length} Active Records`}
            color="indigo"
          />
        </div>
      </div>

      {/* SECTION 5: DATA GRID & ATTENDANCE REGISTER MATRIX */}
      <div className="w-full overflow-x-auto border border-slate-200 bg-white rounded-2xl shadow-sm print:border-none print:shadow-none">
        <table className="min-w-full divide-y divide-slate-200 text-left text-xs text-slate-700 table-auto print:divide-y-2 print:divide-slate-800">
          <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider select-none border-b border-slate-200 print:bg-white print:text-black">
            <tr>
              <th className="px-6 py-4 w-4 print:hidden">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={
                    paginatedMembers.length > 0 &&
                    selectedMembers.size === paginatedMembers.length
                  }
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
              </th>
              <th className="px-4 py-4 w-12 text-center">S/N</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-500 print:text-black">
                Member Name
              </th>
              <th className="px-6 py-4">Phone Record</th>
              <th className="px-6 py-4 w-20 text-center">Sex</th>
              <th className="px-6 py-4 w-32 text-center print:w-40">
                Abs/Pre Status
              </th>
              <th className="px-6 py-4 w-20 text-right print:hidden">
                Actions
              </th>
            </tr>
          </thead>

          {/* INTEGRATED ZEBRA STRIPING IN THE BODY FOR CLEAN VISUALS */}
          <tbody className="divide-y divide-slate-200 bg-white print:divide-slate-300">
            {paginatedMembers.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-8 text-center text-gray-400 italic"
                >
                  No cell entries registered.
                </td>
              </tr>
            ) : (
              paginatedMembers.map((member, index) => {
                const isChecked = selectedMembers.has(member.id);
                const isExpanded = expandedRowId === member.id;
                const currentStatus = attendance[member.id];
                const serialNum = (currentPage - 1) * itemsPerPage + index + 1;

                return (
                  <React.Fragment key={member.id}>
                    <tr
                      className={`transition-colors hover:bg-slate-50/60 even:bg-slate-50/40 ${isChecked ? "bg-indigo-50/20" : ""} print:bg-white`}
                    >
                      <td className="px-6 py-4 print:hidden">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleSelectRow(member.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                        />
                      </td>
                      <td className="px-4 py-4 font-bold text-slate-400 text-center print:text-black">
                        {serialNum}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 text-sm">
                          {member.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-medium font-mono print:text-black">
                        {member.phone}
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        {/* FIXED FIELD HOOK: Read directly from your schema's structural gender key */}
                        <Badge
                          text={member.gender || member.sex || "Unspecified"}
                          color={
                            String(member.gender).toUpperCase() === "MALE" ||
                            String(member.sex).toUpperCase() === "MALE"
                              ? "indigo"
                              : "slate"
                          }
                        />
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50/50 print:border-none print:p-0 print:bg-white">
                          <button
                            type="button"
                            onClick={() =>
                              handleAttendanceChange(member.id, "Present")
                            }
                            className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md tracking-wider transition-all print:text-xs print:font-black ${
                              currentStatus === "Present"
                                ? "bg-emerald-600 text-white shadow-sm print:text-emerald-700"
                                : "text-slate-400 hover:text-slate-600 print:hidden"
                            }`}
                          >
                            {currentStatus === "Present" ? "✔ PRESENT" : "P"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleAttendanceChange(member.id, "Absent")
                            }
                            className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md tracking-wider transition-all print:text-xs print:font-black ${
                              currentStatus === "Absent"
                                ? "bg-red-500 text-white shadow-sm print:text-red-600"
                                : "text-slate-400 hover:text-slate-600 print:hidden"
                            }`}
                          >
                            {currentStatus === "Absent" ? "✘ ABSENT" : "A"}
                          </button>
                          {!currentStatus && (
                            <span className="hidden print:inline text-xs text-slate-400 italic">
                              Unmarked / Absent
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Options Toggle Trigger Cell */}
                      <td className="px-6 py-4 text-right whitespace-nowrap print:hidden">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedRowId(isExpanded ? null : member.id)
                          }
                          className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-colors ${
                            isExpanded
                              ? "bg-indigo-100 text-indigo-700"
                              : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                          }`}
                        >
                          {isExpanded ? "Hide" : "Options"}
                        </button>
                      </td>
                    </tr>

                    {/* INLINE OPTION DRAWER PANEL (Safe from clipping container bounds) */}
                    {isExpanded && (
                      <tr className="print:hidden bg-slate-50/40">
                        <td
                          colSpan={7}
                          className="px-6 py-3 bg-linear-to-b from-slate-50/30 to-white border-b border-slate-100"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-[11px] font-medium italic">
                              Administrative shortcuts for active member data
                              records
                            </span>
                            <div className="flex items-center gap-2">
                              {/* 1. FIXED EDIT PROFILE BUTTON LINKED DIRECTLY INSIDE THE ATTENDANCE REGISTER */}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMember(member); // Store the member being edited
                                  setFormInput({
                                    name: member.name || "",
                                    phone: member.phone || "",
                                    sex: member.gender || member.sex || "Male",
                                  }); // Load their data into inputs
                                  setIsModalOpen(true); // Open the modal form window
                                  setExpandedRowId(null); // Close the inline row drawer
                                }}
                                className="px-3 py-1 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-md hover:bg-slate-50 shadow-sm transition-colors"
                              >
                                ✏️ Edit Profile
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteMember(member)}
                                className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-md hover:bg-red-700 shadow-sm transition-colors"
                              >
                                🗑️ Delete Member
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION PANEL FOOTER CONTROL (Hidden on Print) */}
      <div className="flex items-center justify-between border-t border-slate-200 pt-4 px-1 print:hidden">
        <span className="text-xs text-slate-500 font-medium">
          Page <strong className="text-slate-800">{currentPage}</strong> of{" "}
          {totalPages} ({filteredMembers.length} matches found)
        </span>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 select-none transition-colors"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 select-none transition-colors"
          >
            Next
          </button>
        </div>
      </div>

      {/* POPUP OVERLAY DATA ADD/EDIT MEMBER MODAL (Hidden on Print) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsModalOpen(false)}
          ></div>
          <div className="relative transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-xl transition-all sm:w-full sm:max-w-md z-10 w-full border border-slate-100 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              {/* Dynamic Title change based on whether adding or editing */}
              <h3 className="text-base font-bold text-slate-900">
                {editingMember
                  ? "Modify Member Profile"
                  : "Register New Cell Member"}
              </h3>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveMemberForm} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formInput.name || ""}
                  onChange={(e) =>
                    setFormInput({ ...formInput, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border text-slate-900 border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. John Doe"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Active Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={formInput.phone || ""}
                  onChange={(e) =>
                    setFormInput({ ...formInput, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 border text-slate-900 border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  placeholder="e.g. 8084786505"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Gender Classification
                </label>
                <select
                  // value={formInput.sex}
                  value={formInput.gender || "Male"}
                  onChange={(e) =>
                    setFormInput({ ...formInput, sex: e.target.value })
                  }
                  className="w-full px-3 py-2 border text-slate-900 border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="MALE">MALE</option>
                  <option value="FEMALE">FEMALE</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-400 uppercase tracking-wider">
                  Assigned Church Cell Destination
                </label>
                <input
                  type="text"
                  disabled
                  // 🔑 LOGIC: Checks both name matches and ID fallback properties safely
                  value={
                    cellsList.find(
                      (c) => c.name === selectedCell || c._id === selectedCell,
                    )?.name ||
                    selectedCell ||
                    "No Active Cell Selected"
                  }
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-100 rounded-lg text-sm text-slate-500 font-bold outline-none cursor-not-allowed select-none"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition-colors"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FLOATING ACTION STATUS TOAST FEED ALERT BARS */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 print:hidden">
          <div
            className={`p-4 rounded-xl border shadow-xl text-sm font-semibold flex items-center gap-3 ${
              toastMessage.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            <p>{toastMessage.text}</p>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="ml-2 font-bold text-slate-400 hover:text-slate-600"
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
