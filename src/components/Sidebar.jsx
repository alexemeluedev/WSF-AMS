import React from "react";
import { useStats } from "../contexts/StatsContext.jsx"; // 1. Hook into global stats instead of local fetch

const Sidebar = () => {
  const { stats, loading } = useStats(); // 2. Consume real-time stats directly

  const menuItems = [
    {
      label: "Cells Count",
      badge: loading ? "..." : stats.cells.toLocaleString(),
      badgeColor: "bg-gray-500 text-white",
    },
    {
      label: "Member Count",
      badge: loading ? "..." : stats.members.toLocaleString(),
      badgeColor: "bg-gray-500 text-white",
    },
    {
      label: "District Count",
      badge: loading ? "..." : stats.districts.toLocaleString(),
      badgeColor: "bg-gray-500 text-white",
    },
    {
      label: "Zone Count",
      badge: loading ? "..." : stats.zones.toLocaleString(),
      badgeColor: "bg-gray-500 text-white",
    },
    {
      label: "User Count",
      badge: loading ? "..." : stats.users.toLocaleString(),
      badgeColor: "bg-gray-500 text-white",
    },
  ];

  return (
    <aside className="bg-white rounded-2xl border-2 border-gray-200/80 p-4 w-full sm:sticky sm:top-25 max-sm:mt-5 shadow-sm">
      <p className="text-xs text-center font-bold uppercase tracking-wider text-indigo-950 mb-2 px-2">
        Winners Chapel km6 Benin Sapele road
      </p>

      <ul>
        {menuItems.map((item, index) => (
          <li
            key={index}
            className="flex items-center justify-between py-3.5 w-full border-b border-gray-100 last:border-b-0 hover:bg-gray-50/80 active:bg-gray-100 transition-all duration-150 cursor-pointer group"
          >
            <span className="text-gray-600 group-hover:text-gray-900 font-medium text-sm">
              {item.label}
            </span>
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-md shadow-sm min-w-10 text-center ${item.badgeColor}`}
            >
              {item.badge}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default Sidebar;
