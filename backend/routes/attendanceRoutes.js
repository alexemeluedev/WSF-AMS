import express from "express";
import {
  createAttendance,
  getAttendanceByCell,
  getAttendanceByDate,
  getAttendanceSummary,
  deleteAttendanceSheet,
  resetAllAttendanceData,
  dispatchEmailReport,
} from "../controllers/attendanceController.js";
import { verifyToken, verifyAdmin } from "../middleware/verifyToken.js";

const router = express.Router();

router.post("/", verifyToken, createAttendance);
router.get("/cell/:cellName", verifyToken, getAttendanceByCell);
router.get("/history", verifyToken, getAttendanceByDate);
router.get("/summary", verifyToken, getAttendanceSummary);

// Register the path right above your dynamic wildcard routes
router.post("/dispatch-report", verifyToken, dispatchEmailReport);

// 🔑 THE FIX: Move the explicit static path ABOVE the dynamic parameter path
router.delete(
  "/reset-all-data",
  verifyToken,
  verifyAdmin,
  resetAllAttendanceData,
);

// 🔑 THE FIX: Register the unique identifier deletion route line
router.delete("/:id", verifyToken, verifyAdmin, deleteAttendanceSheet);

export default router;
