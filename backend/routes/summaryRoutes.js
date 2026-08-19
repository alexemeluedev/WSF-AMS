import { verifyToken } from "../middleware/verifyToken.js";
import { getSummaryCounts } from "../controllers/summaryController.js";
import express from "express";

const router = express.Router();

router.get("/", verifyToken, getSummaryCounts);
export default router;
