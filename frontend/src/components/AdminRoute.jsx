import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";

export const AdminRoute = ({ children }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== "admin") {
    return (
      <div className="rounded-3xl bg-rose-50 border border-rose-200 p-8 text-rose-700 shadow-sm">
        <h2 className="text-xl font-semibold mb-2">Admin access required</h2>
        <p className="text-sm">
          This area is restricted to administrators. Please sign in with an
          admin account or contact your system administrator.
        </p>
      </div>
    );
  }

  return children;
};
