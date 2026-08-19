import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";

export const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const hasToken = localStorage.getItem("wsf_token");
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <svg
          className="animate-spin h-8 w-8 text-indigo-600"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    );
  }

  if (!user || !hasToken) {
    return <Navigate to="/login" replace />;
  }
  return children;
};
