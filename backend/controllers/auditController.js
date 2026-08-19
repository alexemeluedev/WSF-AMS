import AuditLog from "../models/AuditLog.js";

export const getAuditLogs = async (req, res) => {
  try {
    const { action, resourceType, page = 1, limit = 20 } = req.query;
    const query = {};
    if (action) query.action = action;
    if (resourceType) query.resourceType = resourceType;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const totalLogs = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    return res.status(200).json({
      logs,
      totalPages: Math.ceil(totalLogs / limitNum),
      currentPage: pageNum,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Could not fetch audit history logs.",
      error: error.message,
    });
  }
};
