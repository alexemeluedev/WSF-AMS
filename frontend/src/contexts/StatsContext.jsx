import React, { createContext, useContext, useState, useEffect } from "react";
import { statsService } from "../api/apiClient.js"; // Verify path casing

const StatsContext = createContext(null);

export function StatsProvider({ children }) {
  const [stats, setStats] = useState({
    cells: 0,
    members: 0,
    districts: 0,
    zones: 0,
    users: 0,
  });
  const [loading, setLoading] = useState(true);

  // Function to pull fresh totals from the backend
  const refreshStats = async () => {
    // 🔑 THE RESOLUTION: Immediate exit loop boundary protection
    // If the user has logged out or token is cleared, stop the background fetch completely!
    const currentActiveToken = localStorage.getItem("wsf_token");
    if (!currentActiveToken) {
      return;
    }
    try {
      const data = await statsService.getSummary();
      setStats({
        cells: data.cells || 0,
        members: data.members || 0,
        districts: data.districts || 0,
        zones: data.zones || 0,
        users: data.users || 0,
      });
    } catch (err) {
      console.error("Could not sync real-time sidebar statistics:", err);
    } finally {
      setLoading(false);
    }
  };

  // Automatically fetch metrics once on system boot
  useEffect(() => {
    refreshStats();
  }, []);

  return (
    <StatsContext.Provider value={{ stats, loading, refreshStats }}>
      {children}
    </StatsContext.Provider>
  );
}

export function useStats() {
  const context = useContext(StatsContext);
  if (!context) {
    throw new Error(
      "useStats must be wrapped explicitly within a StatsProvider layout container.",
    );
  }
  return context;
}
