import React, { useState, useEffect } from "react";
import win2Logo from "../assets/w2.png";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";

function DesktopActions() {
  const [showToast, setShowToast] = useState(false); // **NEW TOAST STATE**
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // ✅ Add a state to store the dynamic text message (place at top of Navbar component)
  const [toastContent, setToastContent] = useState({ title: "", message: "" });

  const handleLogout = (reason = "manual") => {
    // Clear the authentication keys instantly
    localStorage.removeItem("wsf_token");
    setShowToast(true);

    // 🔑 Dynamic messaging configuration layout mapping
    if (reason === "expired") {
      setToastContent({
        title: "Session Expired",
        message:
          "Your security keys have expired. Redirecting you safely back to the login terminal...",
      });
    } else {
      setToastContent({
        title: "Signing Out",
        message:
          "Clearing authentication keys. Redirecting you back to the login screen...",
      });
    }

    // Execute clean redirect after the 3-second alert animation completes
    setTimeout(() => {
      logout(); // Triggers your useAuth context clean up
      setShowToast(false);
      navigate("/login", { replace: true });
    }, 1000);
  };

  // **THE SESSION PROTECTION FIX**: Listen to your apiClient event triggers
  useEffect(() => {
    const handleExpiredSession = () => {
      handleLogout("expired");
    };

    window.addEventListener("wsf_session_expired", handleExpiredSession);
    return () => {
      window.removeEventListener("wsf_session_expired", handleExpiredSession);
    };
  }, []);

  // Strips email domain extensions automatically or displays clean text fallbacks
  const getDisplayName = () => {
    if (!user) return "Guest";
    if (user.name) return user.name;
    if (user.email) {
      // Splits "admin@mail.com" into ["admin", "mail.com"] and captures index 0
      return user.email.split("@")[0];
    }
    return "User";
  };
  return (
    <div className="hidden md:ml-6 md:flex md:items-center md:space-x-4">
      {showToast && (
        <div className="fixed top-5 right-5 z-100 flex items-center gap-3 bg-slate-900 text-white px-5 py-4 rounded-xl shadow-2xl border border-slate-800 transition-all duration-300 transform translate-y-0 animate-in slide-in-from-top-5 max-w-sm">
          {/* High-contrast amber warning shield icon symbol */}
          <div className="flex items-center justify-center bg-amber-500/20 text-amber-400 rounded-full p-2 shrink-0">
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          {/* Notification copy details */}
          <div className="flex flex-col">
            <span className="text-xs font-bold tracking-wide uppercase text-amber-400">
              {toastContent.title}
            </span>
            <p className="text-[11px] text-slate-300 font-medium mt-0.5 leading-normal">
              {toastContent.message}
            </p>
          </div>
        </div>
      )}
      {user ? (
        <>
          <div className="flex items-center gap-3 rounded-full bg-slate-50 px-3 py-2 border border-slate-200">
            {/* <span className="text-sm font-medium text-slate-600">
              Hi, {user?.name || user?.email || "User"}
            </span> */}
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-none mb-0.5">
                Hi,
              </span>
              <span className="text-sm font-bold text-slate-800 truncate max-w-32 capitalize">
                {getDisplayName()}
              </span>
            </div>
            {user.role === "admin" ? (
              // <span className="rounded-full bg-indigo-600 px-2 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-white">
              //   Admin
              // </span>
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></span>
            ) : (
              // ) : null}
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-600">
                Staff
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className=" cursor-pointer rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition-all duration-200"
          >
            Logout
          </button>
        </>
      ) : (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 border border-gray-200">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Browsing as Guest
            </span>
          </div>
          <Link
            to="/login"
            className="text-gray-500 hover:text-gray-900 px-3 py-2 text-sm font-medium transition-colors duration-200"
          >
            Log in
          </Link>
        </div>
      )}
    </div>
  );
}

//  (Navigation Configuration)
const NAV_ITEMS = [
  { label: "Home", href: "/", active: true },
  {
    label: "Features",
    href: "#",
    children: [
      { label: "Districts ", href: "/districts" },
      { label: "Zones ", href: "/zones" },
      { label: "Cells", href: "/cells" },
      { label: "Members", href: "/members" },
    ],
  },
  {
    label: "Tasks",
    href: "#",
    children: [
      { label: "Mark Attendance", href: "/attendances" },
      { label: "Re-Classification", href: "/reclassifiers" },
    ],
  },
  {
    label: "Reports",
    href: "#",
    children: [
      { label: "Zonal Report", href: "/zonalreports" },
      { label: "Zonal Management", href: "/zonalmanagement" },
      { label: "Zonal Auditory", href: "/zonalaudits" },
      { label: "Cell Attendance Summary", href: "/attendancehistory" },
      { label: "Montly Attendance Report", href: "/monthlyreports" },
    ],
  },
  {
    label: "Admin",
    href: "#",
    children: [{ label: "Create User", href: "/admin/create-user" }],
  },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [openMobileDropdown, setOpenMobileDropdown] = useState(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const toggleMobileDropdown = (label) => {
    setOpenMobileDropdown(openMobileDropdown === label ? null : label);
  };

  return (
    // <nav className="sticky top-0 z-50 bg-white/90  shadow-md border-b border-gray-200 transition-all duration-200">
    /* CHANGED: Swapped sticky top-0 for fixed top-0 left-0 w-full to anchor it to the window viewport */
    <nav className="fixed top-0 left-0 w-full z-50 bg-white shadow-md border-b border-gray-200 transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-10">
          {/* Logo and Gradient Text */}
          <div className="flex">
            <div className="shrink-0 flex items-center">
              {/* <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent bg-[size:200%_auto] hover:bg-[right_center] transition-all duration-500 cursor-pointer"> */}
              <Link to="/" className="flex items-center">
                <span className="text-transparent bg-size[200%_auto] hover:bg-position-[right_center] transition-all duration-500 cursor-pointer">
                  <img src={win2Logo} className=" size-7" alt="" />
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:ml-10 md:flex md:space-x-8">
              {NAV_ITEMS.map((item, index) =>
                item.children ? (
                  /* Ti akojọ ba ni Dropdown lórí Desktop */
                  <div
                    key={index}
                    className="relative group flex items-center h-full"
                  >
                    <button className="text-gray-500 group-hover:text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium transition-all duration-200 h-full">
                      {item.label}
                      <svg
                        className="ml-2 h-5 w-5 text-gray-400 group-hover:text-gray-500 transition-transform duration-200 group-hover:rotate-180"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>

                    <div className="absolute z-10 top-full   left-0  w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 opacity-0 pointer-events-none scale-95 group-hover:opacity-100 group-hover:pointer-events-auto group-hover:scale-100 transition-all duration-200 origin-top-left">
                      <div className="py-1">
                        {item.children.map((child, childIdx) => (
                          <Link
                            key={childIdx}
                            to={child.href}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Ti akojọ ba jẹ Link lasan lórí Desktop */
                  <Link
                    key={index}
                    to={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-all duration-200 ${
                      item.active
                        ? "text-gray-900 border-rose-600"
                        : "text-gray-500 border-transparent hover:text-gray-900 hover:border-gray-300"
                    }`}
                  >
                    {item.label}
                  </Link>
                ),
              )}
            </div>
          </div>

          {/* Desktop Action Buttons */}
          <DesktopActions />

          {/* Mobile Menu Toggle Button */}
          <div className="-mr-2 flex items-center md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none transition-colors duration-200"
              aria-expanded={isOpen}
            >
              <span className="relative h-6 w-6">
                <svg
                  className="absolute inset-0 h-6 w-6 stroke-current fill-none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Background Overlay */}
      <div
        onClick={() => {
          setIsOpen(false);
          setOpenMobileDropdown(null);
        }}
        className={`fixed inset-0 bg-black/20 backdrop-blur-md z-40 transition-all duration-300 md:hidden ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      />

      {/* Fullscreen Mobile Drawer */}
      <div
        className={`fixed inset-y-0 right-0 w-full max-w-full sm:max-w-md bg-white z-50 shadow-2xl flex flex-col pt-20 px-6 pb-6 transition-transform duration-300 ease-in-out transform md:hidden ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Close Icon inside the Drawer on top-right */}
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={() => {
              setIsOpen(false);
              setOpenMobileDropdown(null);
            }}
            className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none transition-colors duration-200"
          >
            <svg
              className="h-6 w-6 stroke-current fill-none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Navigation Item Links (Mobile) */}
        <div className="flex flex-col space-y-3 flex-1 overflow-y-auto">
          {NAV_ITEMS.map((item, index) =>
            item.children ? (
              /* Ti akojọ ba ni Dropdown lórí Mobile */
              <div key={index}>
                <button
                  onClick={() => toggleMobileDropdown(item.label)}
                  className="w-full text-left border-l-4 border-transparent text-gray-600 active:bg-indigo-50 active:border-indigo-500 active:text-indigo-700 hover:bg-gray-50 hover:border-indigo-500 hover:text-gray-900 flex justify-between items-center pl-4 pr-2 py-3 text-xl font-medium tracking-wide transition-all duration-200 select-none"
                >
                  <span>{item.label}</span>
                  <svg
                    className={`h-6 w-6 text-gray-400 transition-transform duration-200 ${openMobileDropdown === item.label ? "rotate-180 text-indigo-600" : ""}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                <div
                  /* ✅ FIX: Changed max-h-40 to max-h-96 so long menus like Reports don't cut off */
                  className={`transition-all duration-300 ease-in-out overflow-hidden pl-4 bg-gray-50/50 rounded-r-xl ${openMobileDropdown === item.label ? "max-h-96 opacity-100 mt-1 py-1" : "max-h-0 opacity-0"}`}
                >
                  {item.children.map((child, childIdx) => (
                    <Link
                      key={childIdx}
                      to={child.href}
                      onClick={() => {
                        setIsOpen(false);
                        setOpenMobileDropdown(null);
                      }}
                      className="block pl-4 py-2.5 text-lg text-gray-600 border-l-2 border-transparent active:border-indigo-500 active:text-indigo-700 transition-all"
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              /* Ti akojọ ba jẹ Link lasan lórí Mobile */
              <Link
                key={index}
                to={item.href}
                onClick={() => setIsOpen(false)}
                className={`block pl-4 py-3 border-l-4 text-xl font-medium tracking-wide transition-all duration-200 select-none ${
                  item.active
                    ? "bg-rose-50 border-rose-500 text-rose-700"
                    : "border-transparent text-gray-600 active:bg-indigo-50 active:border-indigo-500 active:text-indigo-700 hover:bg-gray-50 hover:border-indigo-500 hover:text-gray-900"
                }`}
              >
                {item.label}
              </Link>
            ),
          )}

          {/* <Link
            to="/login"
            className="border-l-4 border-transparent text-gray-600 active:bg-indigo-50 active:border-indigo-500 active:text-indigo-700 hover:bg-gray-50 hover:border-indigo-500 hover:text-gray-900 block pl-4 py-3 text-xl font-medium tracking-wide transition-all duration-200 select-none"
            onClick={() => setIsOpen(false)}
          >
            Log in
          </Link> */}
        </div>

        {/* Bottom CTA Block */}
        <div className="pt-6 border-t border-gray-200">
          {user ? (
            <>
              <div className="mb-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 border border-slate-200">
                Signed in as
                <div className="mt-1 font-semibold text-slate-900">
                  {user?.name || user?.email || "Authenticated User"}
                </div>
                {user?.role === "admin" ? (
                  <div className="mt-2 inline-flex items-center rounded-full bg-indigo-600 px-2 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-white">
                    Admin
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => {
                  logout();
                  setIsOpen(false);
                  navigate("/login");
                }}
                className="w-full inline-flex justify-center bg-rose-600 text-white px-4 py-4 rounded-xl text-lg font-medium active:bg-rose-700 hover:bg-rose-700 transition-colors duration-200 shadow-lg shadow-rose-600/20"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="w-full flex justify-center bg-indigo-600 text-white px-4 py-4 rounded-xl text-lg font-medium active:bg-indigo-700 hover:bg-indigo-700 transition-colors duration-200 shadow-lg shadow-indigo-600/20"
              onClick={() => setIsOpen(false)}
            >
              Sign up
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
