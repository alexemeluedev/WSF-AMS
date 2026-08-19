import React, { useState, useMemo } from "react";

export const CustomTable = ({
  headers = [],
  rows = [],
  onRowClick,
  onDeleteRow,
  onViewDetails,
  rowsPerPage = 5,
  className = "",
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);

  // Simply track which row index is expanded to show actions
  const [expandedRowId, setExpandedRowId] = useState(null);

  const handleSort = (key, sortable) => {
    if (!sortable) return;
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const filteredRows = useMemo(() => {
    setCurrentPage(1);
    if (!searchTerm) return rows;
    return rows.filter((row) =>
      Object.values(row.cells).some((value) => {
        if (typeof value === "string" || typeof value === "number") {
          return value
            .toString()
            .toLowerCase()
            .includes(searchTerm.toLowerCase());
        }
        if (React.isValidElement(value) && value.props.status) {
          return value.props.status
            .toLowerCase()
            .includes(searchTerm.toLowerCase());
        }
        return false;
      }),
    );
  }, [rows, searchTerm]);

  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows];
    if (sortConfig.key) {
      sorted.sort((a, b) => {
        const aVal = a.cells[sortConfig.key];
        const bVal = b.cells[sortConfig.key];
        const aString = React.isValidElement(aVal) ? "" : String(aVal);
        const bString = React.isValidElement(bVal) ? "" : String(bVal);
        if (aString < bString) return sortConfig.direction === "asc" ? -1 : 1;
        if (aString > bString) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  }, [filteredRows, sortConfig]);

  const totalPages = Math.ceil(sortedRows.length / rowsPerPage) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sortedRows.slice(start, start + rowsPerPage);
  }, [sortedRows, currentPage, rowsPerPage]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(new Set(paginatedRows.map((row) => row.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (e, id) => {
    e.stopPropagation();
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedRows(newSelected);
  };

  const totalColumns = headers.length + 2;

  return (
    <div className="w-full space-y-4">
      {/* Search Bar */}
      {/* <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <input
          type="text"
          placeholder="Search table..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-sm px-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {selectedRows.size > 0 && (
          <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full self-start sm:self-auto">
            {selectedRows.size} Selected
          </span>
        )}
      </div> */}
      {/* ✅ Clean Metadata Capture & Statistics Header Panel */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gray-50/50 border border-gray-200/80 p-4 rounded-xl mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <div>
            <span className="text-xs font-bold text-gray-900 block tracking-tight uppercase">
              Live Directory Scope View
            </span>
            <p className="text-[11px] text-gray-400 font-normal">
              Displaying{" "}
              <strong className="text-gray-700 font-semibold">
                {rows.length}
              </strong>{" "}
              registered membership profile files matching parameter inputs
            </p>
          </div>
        </div>

        {selectedRows.size > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-600 animate-in fade-in duration-100">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
            {selectedRows.size} Profile Records Selected
          </span>
        )}
      </div>

      {/* Main Responsive Table wrapper */}
      <div
        className={`overflow-x-auto border border-gray-200 rounded-lg shadow-sm ${className}`}
      >
        <table className="min-w-full divide-y divide-gray-200 text-left text-sm text-gray-700 table-auto">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold tracking-wider">
            <tr>
              <th className="px-6 py-3 w-4">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={
                    paginatedRows.length > 0 &&
                    selectedRows.size === paginatedRows.length
                  }
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
              </th>
              {headers.map((header) => (
                <th
                  key={header.id}
                  onClick={() => handleSort(header.id, header.sortable)}
                  className={`px-6 py-3 border-b border-gray-200 select-none ${
                    header.sortable
                      ? "cursor-pointer hover:bg-gray-100 transition-colors"
                      : ""
                  }`}
                >
                  <div className="flex items-center space-x-1">
                    <span>{header.label}</span>
                    {header.sortable && sortConfig.key === header.id && (
                      <span>
                        {sortConfig.direction === "asc" ? " ▲" : " ▼"}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              <th className="px-6 py-3 border-b border-gray-200 w-12 text-right">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={totalColumns}
                  className="px-6 py-8 text-center text-gray-400 italic"
                >
                  No records matching search parameters.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row) => {
                const isChecked = selectedRows.has(row.id);
                const isExpanded = expandedRowId === row.id;

                return (
                  <React.Fragment key={row.id}>
                    {/* Main Row */}
                    <tr
                      onClick={() => onRowClick && onRowClick(row)}
                      className={`transition-colors even:bg-gray-50/20 ${
                        isChecked
                          ? "bg-indigo-50/30 hover:bg-indigo-50/50"
                          : "hover:bg-gray-50"
                      } ${onRowClick ? "cursor-pointer" : ""}`}
                    >
                      <td
                        className="px-6 py-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleSelectRow(e, row.id)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                        />
                      </td>
                      {headers.map((header) => (
                        <td
                          key={header.id}
                          className="px-6 py-4 whitespace-nowrap"
                        >
                          {/* {row.cells[header.id]} */}
                          {header.render
                            ? header.render(row.cells[header.id])
                            : row.cells[header.id]}
                        </td>
                      ))}

                      {/* Action Trigger Cell */}
                      <td
                        className="px-6 py-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() =>
                            setExpandedRowId(isExpanded ? null : row.id)
                          }
                          className={`text-sm font-medium px-3 py-1 rounded transition-colors ${
                            isExpanded
                              ? "bg-indigo-100 text-indigo-700"
                              : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          {isExpanded ? "Hide" : "•••"}
                        </button>
                      </td>
                    </tr>

                    {/* Inline Action Row - Appears directly beneath the row, completely safe from containers! */}
                    {isExpanded && (
                      <tr className="bg-indigo-50/30">
                        <td
                          colSpan={totalColumns}
                          className="px-6 py-3 border-b border-indigo-100 text-right"
                        >
                          <div
                            className="flex justify-end gap-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => {
                                onViewDetails && onViewDetails(row);
                                setExpandedRowId(null);
                              }}
                              className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors shadow-sm"
                            >
                              View Details
                            </button>
                            <button
                              onClick={() => {
                                onDeleteRow && onDeleteRow(row);
                                setExpandedRowId(null);
                              }}
                              className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded hover:bg-red-500 transition-colors shadow-sm"
                            >
                              Delete Row
                            </button>
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

      {/* Pagination Command Panels */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-4 px-1">
        <span className="text-xs text-gray-500">
          Page <strong>{currentPage}</strong> of {totalPages} (
          {filteredRows.length} items)
        </span>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
