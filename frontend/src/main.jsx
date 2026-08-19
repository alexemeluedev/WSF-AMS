import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { StatsProvider } from "./contexts/StatsContext.jsx"; // Import the stats provider

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Toaster position="top-right" reverseOrder={false} />
    <AuthProvider>
      <StatsProvider>
        <App />
      </StatsProvider>
    </AuthProvider>
  </StrictMode>,
);
