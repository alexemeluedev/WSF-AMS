import express from "express";
import {
  getCells,
  createCell,
  updateCell,
  deleteCell,
} from "../controllers/cellController.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.use(verifyToken);
router.route("/").get(getCells).post(createCell);
router.route("/:id").put(updateCell).delete(deleteCell);

export default router;
