import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { logAudit } from "../utils/auditLogger.js";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not configured.");
}

const createToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "8h" },
  );
};

const decodeAuthToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  const token = authHeader.split(" ")[1];
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
};

export const register = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "User already exists." });
    }

    const userCount = await User.countDocuments();
    let assignedRole = "user";
    let actor = null;

    if (userCount === 0) {
      assignedRole = role === "admin" ? "admin" : "admin";
    } else {
      const payload = decodeAuthToken(req);
      if (!payload) {
        return res
          .status(401)
          .json({ message: "Administrator token required." });
      }
      if (payload.role !== "admin") {
        return res
          .status(403)
          .json({ message: "Administrator privileges required." });
      }
      actor = payload;
      assignedRole = role === "admin" ? "admin" : "user";
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      role: assignedRole,
    });

    await logAudit({
      req,
      actor,
      action: userCount === 0 ? "Initialize admin user" : "Create user",
      resourceType: "User",
      resourceId: user._id,
      resourceSummary: user.email,
      details: `role=${assignedRole}`,
    });

    const token = createToken(user);
    return res.status(201).json({
      user: { id: user._id, email: user.email, role: user.role },
      token,
    });
  } catch (error) {
    console.error("Register error", error);
    return res.status(500).json({ message: "Failed to create user." });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const token = createToken(user);

    await logAudit({
      req,
      actor: { id: user._id, email: user.email, role: user.role },
      action: "User login",
      resourceType: "User",
      resourceId: user._id,
      resourceSummary: user.email,
      details: "Successful login",
    });

    return res.json({
      user: { id: user._id, email: user.email, role: user.role },
      token,
    });
  } catch (error) {
    console.error("Login error", error);
    return res.status(500).json({ message: "Authentication failed." });
  }
};

// @desc    Delete a portal user account with audit trail logging
// @route   DELETE /api/auth/users/:id
// @access  Private/Admin (Enforced by inline token validation)
export const removeUser = async (req, res) => {
  try {
    const { id } = req.params;

    // 🛡️ 1. DECODE AND VALIDATE ADMINISTRATOR TOKEN PRIVILEGES INLINE
    const payload = decodeAuthToken(req);
    if (!payload) {
      return res.status(401).json({ message: "Administrator token required." });
    }
    if (payload.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Administrator privileges required." });
    }

    // 🛡️ 2. SAFETY CHECK: Prevent an active admin from terminating themselves
    if (String(id) === String(payload.userId || payload.id)) {
      return res.status(400).json({
        message:
          "You cannot terminate your own active administrator account session.",
      });
    }

    // 🔄 3. EXECUTE TARGET DELETION FROM DATABASE CLUSTER
    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({
        message:
          "Target user credentials profile not found inside data clusters.",
      });
    }

    // 🔑 4. RECORD ACCOUNT DELETION TRAIL INTO MONGO AUDIT LOG ENTRIES
    await logAudit({
      req,
      actor: payload, // The authenticated admin processing the removal action
      action: "Delete user",
      resourceType: "User",
      resourceId: deletedUser._id,
      resourceSummary: deletedUser.email,
      details: `revoked_role=${deletedUser.role}`,
    });

    return res.status(200).json({
      message: `Account platform clearance for ${deletedUser.email} permanently revoked successfully.`,
    });
  } catch (error) {
    console.error("Remove user error:", error);
    // Add this if you stick with your inline code structure
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ code: "TOKEN_EXPIRED", message: "Session expired." });
    }
    return res.status(500).json({
      message: "Could not execute account destruction sequence routing rules.",
    });
  }
};

// @desc    Get all registered portal users
// @route   GET /api/auth/users
// @access  Private/Admin
export const getAllUsers = async (req, res) => {
  try {
    // Fetch all users, sort by newest, and exclude the password field
    const users = await User.find({})
      .select("-password")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Fetch users error:", error);
    return res.status(500).json({
      message: "Could not retrieve global user credentials directory.",
      error: error.message,
    });
  }
};
