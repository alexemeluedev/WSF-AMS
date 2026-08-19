import Cell from "../models/Cell.js";
import Member from "../models/Member.js";
import { logAudit } from "../utils/auditLogger.js";

// export const getCells = async (req, res) => {
//   try {
//     const { zone, search, sortField, sortDirection, page, limit } = req.query;

//     const query = {};
//     if (zone && zone !== "ALL") query.zone = zone;
//     if (search) {
//       query.$or = [
//         { name: { $regex: search, $options: "i" } },
//         { address: { $regex: search, $options: "i" } },
//       ];
//     }

//     // **SAFETY SANITIZATION**: Fallback values protect against NaN errors if string queries break
//     const pageNum = Math.max(1, parseInt(page, 10) || 1);
//     const limitNum = Math.max(1, parseInt(limit, 10) || 5);
//     const skipNum = (pageNum - 1) * limitNum;

//     const totalItems = await Cell.countDocuments(query);

//     const cells = await Cell.find(query)
//       .sort({ [sortField || "name"]: sortDirection === "desc" ? -1 : 1 })
//       .skip(skipNum)
//       .limit(limitNum)
//       .populate("memberCount")
//       .populate({
//         path: "members",
//         model: "Member",
//       })
//       .lean();

//     return res.status(200).json({
//       cells: cells || [],
//       totalPages: Math.ceil(totalItems / limitNum) || 1,
//       currentPage: pageNum,
//       totalItems,
//     });
//   } catch (error) {
//     console.error("Cell controller exception:", error);
//     return res
//       .status(500)
//       .json({ message: "Could not load cells.", error: error.message });
//   }
// };

// @desc    Create new cell and audit

export const getCells = async (req, res) => {
  try {
    const { zone, search, sortField, sortDirection, page, limit } = req.query;

    const query = {};
    if (zone && zone !== "ALL") query.zone = zone;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
      ];
    }

    // **THE FIX**: Allow large pagination overrides explicitly up to 500 records
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    let limitNum = parseInt(limit, 10) || 5;
    if (limitNum === 0 || limitNum > 500) limitNum = 500; // Hard upper ceiling protection

    const skipNum = (pageNum - 1) * limitNum;

    const totalItems = await Cell.countDocuments(query);

    const cells = await Cell.find(query)
      .sort({ [sortField || "name"]: sortDirection === "desc" ? -1 : 1 })
      .skip(skipNum)
      .limit(limitNum)
      .populate("memberCount")
      .populate({
        path: "members",
        model: "Member",
      })
      .lean();

    return res.status(200).json({
      cells: cells || [],
      totalPages: Math.ceil(totalItems / limitNum) || 1,
      currentPage: pageNum,
      totalItems,
    });
  } catch (error) {
    console.error("Cell controller exception:", error);
    return res
      .status(500)
      .json({ message: "Could not load cells.", error: error.message });
  }
};

export const createCell = async (req, res) => {
  try {
    const { name, zone, address } = req.body;
    if (!name || !zone || !address) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const isDuplicate = await Cell.findOne({
      name: { $regex: `^${name.trim()}$`, $options: "i" },
    });
    if (isDuplicate) {
      return res.status(400).json({
        message: `A cell group named "${name.trim()}" already exists.`,
      });
    }

    const cell = await Cell.create({
      name: name.trim(),
      zone,
      address: address.trim(),
    });

    await logAudit({
      req,
      action: "Create cell",
      resourceType: "Cell",
      resourceId: cell._id,
      resourceSummary: cell.name,
      details: `zone=${zone}`,
    });

    return res.status(201).json({ cell });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Could not create cell.", error: error.message });
  }
};

// @desc    Update cell and audit
export const updateCell = async (req, res) => {
  try {
    const cell = await Cell.findById(req.params.id);
    if (!cell) return res.status(404).json({ message: "Cell not found." });

    const updates = req.body;
    if (updates.name) {
      const isDuplicate = await Cell.findOne({
        _id: { $ne: req.params.id },
        name: { $regex: `^${updates.name.trim()}$`, $options: "i" },
      });
      if (isDuplicate)
        return res.status(400).json({ message: "Cell name already exists." });
    }

    Object.assign(cell, updates);
    await cell.save();

    await logAudit({
      req,
      action: "Update cell",
      resourceType: "Cell",
      resourceId: cell._id,
      resourceSummary: cell.name,
      details: `fields=${Object.keys(updates).join(",")}`,
    });

    return res.json({ cell });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Could not update cell.", error: error.message });
  }
};

// @desc    Cascade delete cell, clean up related members, and log audit
export const deleteCell = async (req, res) => {
  try {
    const cell = await Cell.findById(req.params.id);
    if (!cell) return res.status(404).json({ message: "Cell not found." });

    // **CASCADE CLEANUP**: Find and remove all members tied directly to this cell id
    const affectedMembersCount = await Member.countDocuments({
      cell: cell._id,
    });
    await Member.deleteMany({ cell: cell._id });
    await cell.deleteOne();

    await logAudit({
      req,
      action: "Delete cell",
      resourceType: "Cell",
      resourceId: cell._id,
      resourceSummary: cell.name,
      details: `cascade_deleted_members_count=${affectedMembersCount}`,
    });

    return res.json({
      message: "Cell and all associated members removed successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Could not remove cell workspace.",
      error: error.message,
    });
  }
};

export const assignPermanentLeader = async (req, res) => {
  try {
    const { cellName, leaderName, phone } = req.body;

    // Updates the cell profile directly matching against its unique name string
    const updatedCell = await Cell.findOneAndUpdate(
      { name: cellName },
      { $set: { leaderName, phone } },
      { returnDocument: "after", runValidators: true },
    );

    if (!updatedCell) {
      return res
        .status(404)
        .json({ message: "Cell profile could not be found." });
    }

    return res.status(200).json({ cell: updatedCell });
  } catch (error) {
    console.error("Permanent cell assignment error:", error);
    return res
      .status(500)
      .json({ message: "Could not persist permanent structural assignment." });
  }
};
