import AuditLog from "../models/AuditLog.js";

export const logAudit = async ({
  req,
  actor,
  action,
  resourceType,
  resourceId,
  resourceSummary,
  details,
}) => {
  try {
    const actorId = actor?.id || req?.user?.id || null;
    const actorEmail = actor?.email || req?.user?.email || "";
    const actorRole = actor?.role || req?.user?.role || "user";
    const ip = req?.headers["x-forwarded-for"]
      ? req.headers["x-forwarded-for"].split(",")[0].trim()
      : req?.ip || "";
    const userAgent = req?.headers["user-agent"] || "";

    await AuditLog.create({
      actorId,
      actorEmail,
      actorRole,
      action,
      resourceType,
      resourceId: resourceId?.toString() || "",
      resourceSummary: resourceSummary || "",
      details: details || "",
      ip,
      userAgent,
    });
  } catch (error) {
    console.error("Audit log error", error);
  }
};
