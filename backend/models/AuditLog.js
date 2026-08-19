import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Links to your User authentication schema if applicable
      default: null,
    },
    actorEmail: {
      type: String,
      default: "",
      trim: true,
    },
    actorRole: {
      type: String,
      default: "user",
      trim: true,
    },
    action: {
      type: String,
      required: [true, "Audit action type is required"],
      trim: true,
    },
    resourceType: {
      type: String,
      required: [true, "Targeted resource schema type is required"], // e.g. "Member", "Cell"
      trim: true,
    },
    resourceId: {
      type: String, // String type accommodates unformatted IDs or clean text logs
      default: "",
      trim: true,
    },
    resourceSummary: {
      type: String,
      default: "",
      trim: true,
    },
    details: {
      type: String,
      default: "",
      trim: true,
    },
    ip: {
      type: String,
      default: "",
      trim: true,
    },
    userAgent: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Only logs creation timestamps for historical immutability
  },
);

// Performance Optimization: Indexes speed up admin dashboard filtering
auditLogSchema.index({ action: 1, resourceType: 1 });
auditLogSchema.index({ actorEmail: 1 });

// Add this line directly to models/AuditLog.js to auto-delete entries after 90 days
auditLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 },
);

export default mongoose.model("AuditLog", auditLogSchema);

// Critical Security Tip for ProductionSince your logger evaluates req.headers["x-forwarded-for"] to track remote client IPs, ensure your Express configuration file has app.set("trust proxy", true); activated if you plan to deploy your Node server behind a reverse proxy gateway like Nginx, Heroku, or Render. Without this line, Express might ignore the headers or read your proxy server's local address (127.0.0.1) instead of the true client browser IP.
