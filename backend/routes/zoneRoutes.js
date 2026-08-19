import express from "express";
import {
  getZones,
  createZone,
  updateZone,
  deleteZone,
} from "../controllers/zoneController.js";
import { verifyToken } from "../middleware/verifyToken.js"; // Or wherever your middleware is located

const router = express.Router();

// Mount the CRUD actions to the base path
router.get("/", verifyToken, getZones);
router.post("/", verifyToken, createZone);
router.put("/:id", verifyToken, updateZone);
router.delete("/:id", verifyToken, deleteZone);

export default router;
