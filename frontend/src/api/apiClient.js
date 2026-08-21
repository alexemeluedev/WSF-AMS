// 1. Get the raw URL string from Vercel or your local fallback
const RAW_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// 2. This safely ensures /api is always attached to the end for production
export const API_BASE = RAW_URL.endsWith("/api") ? RAW_URL : `${RAW_URL}/api`;

const getToken = () => localStorage.getItem("wsf_token");

const defaultHeaders = () => {
  const token = localStorage.getItem("wsf_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};
const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...defaultHeaders(),
      ...(options.headers || {}),
    },
  });
  // Safely parse the body first so we can read error details
  const body = await response.json().catch(() => ({}));

  // **CRITICAL SECURITY INTERCEPTOR**
  if (response.status === 401 && body?.code === "TOKEN_EXPIRED") {
    // 1. Wipe the invalid/expired token from the browser database completely
    localStorage.removeItem("wsf_token");
    // **THE FIX**: Dispatch a global browser event to notify React instantly
    window.dispatchEvent(new Event("wsf_session_expired"));
    // 2. Return a rejected promise to stop any further frontend execution loops
    return Promise.reject({
      message: "Session expired. Redirecting to login...",
    });
  }
  // const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.message || response.statusText || "Request failed";
    throw new Error(message);
  }
  return body;
};

export const authService = {
  login: (data) =>
    request("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  register: (data) =>
    request("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  // ✅ ADDED DELETION MAPPER ENDPOINT CONNECTION
  remove: (id) => request(`/auth/users/${id}`, { method: "DELETE" }),
  // ✅ ADD THIS CONNECTOR ROUTE METHOD: Fetches all platform user document structures
  listUsers: () => request("/auth/users"),
};

export const auditService = {
  list: (query = "") => request(`/audit${query}`),
};

export const cellService = {
  // list: (queryString = "") => request(`/cells?${queryString}`),
  list: (params = {}) => {
    const queryString =
      typeof params === "string"
        ? params
        : new URLSearchParams(params).toString();
    return request(`/cells${queryString ? `?${queryString}` : ""}`);
  },
  create: (cellData) =>
    request("/cells", { method: "POST", body: JSON.stringify(cellData) }),
  update: (id, cellData) =>
    request(`/cells/${id}`, { method: "PUT", body: JSON.stringify(cellData) }),
  remove: (id) => request(`/cells/${id}`, { method: "DELETE" }),
};

export const memberService = {
  // Ensure it accepts a query parameter string (e.g., "?cellId=123")
  list: (query = "") => request(`/members${query}`),
  create: (member) =>
    request("/members", { method: "POST", body: JSON.stringify(member) }),
  update: (id, member) =>
    request(`/members/${id}`, { method: "PUT", body: JSON.stringify(member) }),
  remove: (id) => request(`/members/${id}`, { method: "DELETE" }),
};
export const statsService = {
  getSummary: () => request("/summary-counts"),
};

export const zoneService = {
  // Updated to pass pagination fields cleanly down to the express server routing engine
  list: (searchString = "", page = 1, limit = 5) =>
    request(
      `/zones?search=${encodeURIComponent(searchString)}&page=${page}&limit=${limit}`,
    ),
  create: (zoneData) =>
    request("/zones", { method: "POST", body: JSON.stringify(zoneData) }),
  update: (id, zoneData) =>
    request(`/zones/${id}`, { method: "PUT", body: JSON.stringify(zoneData) }),
  remove: (id) => request(`/zones/${id}`, { method: "DELETE" }),
};

export const districtService = {
  list: (search = "") =>
    request(`/districts?search=${encodeURIComponent(search)}`),
  create: (data) =>
    request("/districts", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) =>
    request(`/districts/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id) => request(`/districts/${id}`, { method: "DELETE" }),
};

export const attendanceService = {
  // POST: Saves to your base route path
  save: (payload) =>
    request("/attendance", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // GET: Requests active sheet states via the history query parameter route
  get: (date, cellName) =>
    request(
      `/attendance/history?date=${encodeURIComponent(date)}&cellName=${encodeURIComponent(cellName)}`,
    ),

  // GET: Fetches the log history collection for the modal using the dedicated cell route
  byCell: (cellName) =>
    request(`/attendance/cell/${encodeURIComponent(cellName)}`),

  summary: () => request("/attendance/summary"),
  // 🔑 THE FIX: Append this persistent HTTP DELETE tracking pipeline method row
  removeMember: (id) => request(`/attendance/${id}`, { method: "DELETE" }),
  // 🔑 THE FIX: Append this global master reset action runner
  resetAllData: () =>
    request("/attendance/reset-all-data", { method: "DELETE" }),
  // 🔑 THE FRONT-END MAP FIX:
  dispatchEmailReport: (payload) =>
    request("/attendance/dispatch-report", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
