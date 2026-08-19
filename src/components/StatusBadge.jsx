import React from "react";

export const StatusBadge = ({ status }) => {
  const styles = {
    Active: "bg-green-100 text-green-800 border-green-200",
    Contractor: "bg-blue-100 text-blue-800 border-blue-200",
    "On Leave": "bg-yellow-100 text-yellow-800 border-yellow-200",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || "bg-gray-100 text-gray-800"}`}
    >
      {status}
    </span>
  );
};
