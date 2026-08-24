import { useState, useEffect, useRef } from "react";
import Dropdown from "../components/Dropdown";
import { cellService, memberService } from "../api/apiClient";

export const CellMemberReclassifier = () => {
  // Operational state hooks connected to database arrays
  const [cells, setCells] = useState([]); // Master array of structural cell profiles
  const [members, setMembers] = useState([]); // Master roster array of system members
  const [sourceCellId, setSourceCellId] = useState("");
  const [targetCellId, setTargetCellId] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(false);

  // Swipe & drag state hooks
  const scrollContainerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // =========================================================================
  // INITIAL DATABASE LIFECYCLE SYNC
  // =========================================================================
  useEffect(() => {
    const loadMasterData = async () => {
      try {
        setLoading(true);
        // Concurrent data fetching via your standard client services
        const [cellsResponse, membersResponse] = await Promise.all([
          cellService.list(),
          memberService.list(),
        ]);

        const cellsData = cellsResponse?.cells || cellsResponse || [];
        const membersData = membersResponse?.members || membersResponse || [];

        setCells(cellsData);
        setMembers(membersData);

        // Intelligently initialize dropdown states based on loaded database structures
        if (cellsData.length > 0) {
          setSourceCellId(cellsData[0]._id || cellsData[0].id);
          if (cellsData[1]) {
            setTargetCellId(cellsData[1]._id || cellsData[1].id);
          }
        }
      } catch (err) {
        console.error(
          "Failed to load reclassification rosters from database:",
          err,
        );
      } finally {
        setLoading(false);
      }
    };
    loadMasterData();
  }, []);

  // =========================================================================
  // DYNAMIC DERIVED BALANCING LOGIC
  // =========================================================================
  // Group members dynamically by their respective cell ObjectId associations
  const getCellMemberCount = (cellId) => {
    return members.filter((m) => (m.cell?._id || m.cell) === cellId).length;
  };

  // Map database entries to your transformed Dropdown label/value properties
  const dropdownOptions = cells.map((cell) => ({
    value: cell._id || cell.id,
    label: `${cell.name} (${getCellMemberCount(cell._id || cell.id)} Members)`,
  }));

  // Isolate profiles corresponding strictly to our selected Source Cell filter
  const activeSourceMembers = members.filter(
    (m) => (m.cell?._id || m.cell) === sourceCellId,
  );

  // Filter visible profiles based on live text query strings
  const filteredMembers = activeSourceMembers.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.role || "").toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // =========================================================================
  // CORE DATABASE UPDATE DISPATCH PIPELINE
  // =========================================================================
  const handleReclassification = async () => {
    if (
      selectedMembers.length === 0 ||
      sourceCellId === targetCellId ||
      loading
    )
      return;

    try {
      setLoading(true);

      // 1. DISPATCH CONCURRENT NETWORK TRANSLATE UPDATES TO MONGO FOR EACH VISIBLE SELECTION
      await Promise.all(
        selectedMembers.map((memberId) => {
          const rawMemberDoc = members.find(
            (m) => (m._id || m.id) === memberId,
          );
          return memberService.update(memberId, {
            ...rawMemberDoc,
            cell: targetCellId, // Permanently map the cross-cell relational ObjectId reference
          });
        }),
      );

      // 2. RETRIEVE RE-ALLOCATED COPIES FROM SERVER ENGINES TO MAINTAIN SYNC WITH ZERO RELOAD
      const updatedMembersResponse = await memberService.list();
      setMembers(
        updatedMembersResponse?.members || updatedMembersResponse || [],
      );

      // 3. COMPOSE STABLE TIMESTAMED AUDIT TRACKING LOG ENTRIES FOR SCREEN VIEWS
      const sourceCellName =
        cells.find((c) => (c._id || c.id) === sourceCellId)?.name || "Source";
      const targetCellName =
        cells.find((c) => (c._id || c.id) === targetCellId)?.name || "Target";

      const movingMembersDocs = activeSourceMembers.filter((m) =>
        selectedMembers.includes(m._id || m.id),
      );
      const newLogs = movingMembersDocs.map((m) => ({
        id: Math.random().toString(36).substr(2, 9),
        memberName: m.name,
        from: sourceCellName,
        to: targetCellName,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      }));

      setAuditLog((prev) => [...newLogs, ...prev]);

      // Clear operational selection parameters cleanly
      setSelectedMembers([]);
      setSearchQuery("");
    } catch (err) {
      console.error("Reclassification database commitment failure:", err);
    } finally {
      setLoading(false);
    }
  };

  // Drag logic handlers for swipe navigation containers
  const toggleMemberSelection = (id) => {
    // Use functional updates to prevent component calculation clashes
    setSelectedMembers((prev) => {
      const isAlreadySelected = prev.includes(id);
      if (isAlreadySelected) {
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };
  const handleMouseDown = (e) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseLeaveOrUp = () => setIsDragging(false);

  const handleMouseMove = (e) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm max-w-4xl mx-auto space-y-6">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-base font-bold text-slate-900">
          Zonal Membership Reclassification Hub
        </h2>
        <p className="text-xs text-slate-400">
          Select target vectors to shift structural allocations of cell groups
          seamlessly.
        </p>
      </div>

      {/* Control Board Selection Dropdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-40">
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            From Source Cell
          </label>
          <Dropdown
            options={dropdownOptions}
            value={sourceCellId}
            placeholder="Choose source cell..."
            onChange={(val) => {
              setSourceCellId(val);
              setSelectedMembers([]);
              setSearchQuery("");
              if (val === targetCellId) {
                const available = cells.find((c) => (c._id || c.id) !== val);
                if (available) setTargetCellId(available._id || available.id);
              }
            }}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            To Target Cell Destination
          </label>
          <Dropdown
            options={dropdownOptions.map((opt) => ({
              ...opt,
              label:
                opt.value === sourceCellId
                  ? `${opt.label.split(" ")[0]} (Current Source)`
                  : opt.label,
            }))}
            value={targetCellId}
            placeholder="Choose destination cell..."
            disabledOptions={[sourceCellId]}
            onChange={(val) => setTargetCellId(val)}
          />
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <svg
            xmlns="http://w3.org"
            className="h-4 w-4 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
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
          placeholder="Search profiles inside source pool by name or role..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-slate-200 text-xs text-slate-800 rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
        />
      </div>

      {/* Roster Cards and Swipe Containers */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">
            Available Profiles ({filteredMembers.length})
          </span>
          <button
            onClick={handleReclassification}
            disabled={selectedMembers.length === 0 || loading}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl transition-all disabled:opacity-40 disabled:hover:bg-indigo-600 shadow-sm shadow-indigo-100"
          >
            {loading
              ? "Processing..."
              : `Transfer Selected (${selectedMembers.length})`}
          </button>
        </div>

        <div
          ref={scrollContainerRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeaveOrUp}
          onMouseUp={handleMouseLeaveOrUp}
          onMouseMove={handleMouseMove}
          className={`flex gap-3 overflow-x-auto pb-3 pt-1 select-none scrollbar-thin cursor-grab active:cursor-grabbing ${
            isDragging ? "pointer-events-none" : ""
          }`}
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {filteredMembers.length === 0 ? (
            <div className="w-full text-center text-xs text-slate-400 py-8 border border-dashed border-slate-100 rounded-xl bg-slate-50/40">
              No matching profiles found in this source pool.
            </div>
          ) : (
            filteredMembers.map((member) => {
              const mId = member._id || member.id;
              // const mId = member._id || member.id || member.memberId;
              const isChecked = selectedMembers.includes(mId);
              return (
                <div
                  key={mId}
                  // onClick={(e) => {
                  //   e.preventDefault();
                  //   toggleMemberSelection(mId);
                  // }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    toggleMemberSelection(mId);
                  }}
                  className={`flex-none w-48 p-4 border rounded-xl transition-all cursor-pointer relative overflow-hidden ${
                    isChecked
                      ? "border-indigo-500 bg-indigo-50/20 shadow-md shadow-indigo-50"
                      : "border-slate-200/70 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                        member.role === "Cell Leader"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {member.role || "Member"}
                    </span>
                    {/* <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}} // State driven by parent container click wrapper
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 pointer-events-none"
                    /> */}
                    <input
                      type="checkbox"
                      checked={isChecked}
                      readOnly // Tells React the outer card controls this state container
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 pointer-events-none"
                    />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 truncate">
                    {member.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Joined: {member.joined || "N/A"}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Audit Log Terminal view panel */}
      {auditLog.length > 0 && (
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 pb-1">
            Realtime Audit Transfer Log Streams
          </h3>
          <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1 font-mono text-[10px] text-slate-500">
            {auditLog.map((log) => (
              <div
                key={log.id}
                className="flex justify-between items-center py-0.5 border-b border-slate-200/40 last:border-0"
              >
                <span>
                  🟢 Shifted{" "}
                  <strong className="text-slate-700">{log.memberName}</strong>{" "}
                  from <span className="underline">{log.from}</span> →{" "}
                  <span className="font-bold text-indigo-600">{log.to}</span>
                </span>
                <span className="text-slate-400 text-[9px]">{log.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
