import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import memberRoutes from "./routes/memberRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import auditRoutes from "./routes/auditRoutes.js";
import cellRoutes from "./routes/cellRoutes.js";
import summaryRoutes from "./routes/summaryRoutes.js";
import zoneRoutes from "./routes/zoneRoutes.js";
import districtRoutes from "./routes/districtRoutes.js";

dotenv.config();

const app = express();

const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, message: "WSF backend is running" });
});

// API Route Mount Points
app.use("/api/cells", cellRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/summary-counts", summaryRoutes);
app.use("/api/zones", zoneRoutes);
app.use("/api/districts", districtRoutes);

export default app;
