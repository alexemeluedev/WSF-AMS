import express from "express";
import {
  login,
  register,
  removeUser,
  getAllUsers,
} from "../controllers/authController.js";
import { verifyToken, verifyAdmin } from "../middleware/verifyToken.js";

const router = express.Router();

router.post("/login", login);
router.post("/register", register);
router.get("/users", verifyToken, verifyAdmin, getAllUsers);
router.delete("/users/:id", verifyToken, verifyAdmin, removeUser);

export default router;
