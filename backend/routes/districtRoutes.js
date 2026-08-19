import express from "express";
import {
  getDistricts,
  createDistrict,
  updateDistrict,
  deleteDistrict,
} from "../controllers/districtController.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();
router.get("/", verifyToken, getDistricts);
router.post("/", verifyToken, createDistrict);
router.put("/:id", verifyToken, updateDistrict);
router.delete("/:id", verifyToken, deleteDistrict);

export default router;
