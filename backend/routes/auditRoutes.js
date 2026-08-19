import express from "express";
import { verifyToken, verifyAdmin } from "../middleware/verifyToken.js";
import { getAuditLogs } from "../controllers/auditController.js";

const router = express.Router();

router.get("/", verifyToken, verifyAdmin, getAuditLogs);

export default router;
