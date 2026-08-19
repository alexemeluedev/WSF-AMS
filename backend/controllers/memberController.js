import Member from "../models/Member.js";
import Cell from "../models/Cell.js"; // Importing the Cell model for relational validation Checks
import { logAudit } from "../utils/auditLogger.js";

export const getMembers = async (req, res) => {
  try {
    const { cell } = req.query; // 🔑 Read query parameter string from front-end
    let filterCriteria = {};

    // If the frontend explicitly passed a cell name filter, inject it safely
    if (cell && cell.trim() !== "") {
      // 1. SAFELY DETERMINE FILTRATION TARGET PROPERTIES
      // Check if the query parameter string is a valid 24-character hex Mongoose ObjectId signature
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(cell);
      if (isValidObjectId) {
        // Direct assignment match if client submitted an object identifier reference
        filterCriteria.cell = cell; // Matches by Cell ObjectId or unique selector string
      } else {
        // If the client submitted a plain text human name tag instead, find the matching cell first
        const cellRecord = await Cell.findOne({ name: cell });

        if (cellRecord) {
          filterCriteria.cell = cellRecord._id; // Target by the found ObjectId reference
        } else {
          // Force an empty array return instead of crashing if no matching cell profile exists
          return res.json({ members: [] });
        }
      }
    }
    // Relational Patch: .populate("cell", "name zone") maps out structural cell info automatically
    const members = await Member.find(filterCriteria)
      .populate("cell", "name zone")
      .sort({ createdAt: -1 });
    await logAudit({
      req,
      action: "List members",
      resourceType: "Member",
      resourceId: cell || "ALL_CELLS", // Logs the target cell parameter or defaults to global tracking
      resourceSummary: cell
        ? `Filtered roster for cell: ${cell}`
        : "Viewed global members directory",
      details: `recordsFetched=${members.length}, filterActive=${!!cell}`,
    });
    return res.json({ members });
  } catch (error) {
    console.error("Get members error", error);
    return res.status(500).json({ message: "Could not load members." });
  }
};
export const createMember = async (req, res) => {
  try {
    const { name, phone, cell, gender, status } = req.body;
    if (!name || !phone || !cell) {
      return res
        .status(400)
        .json({ message: "Name, phone, and cell assignment are required." });
    }

    // 1. SAFELY LOCATE CELL BY OBJECT ID OR TEXT NAME KEY MATCHES
    let targetCell = null;
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(cell);

    if (isValidObjectId) {
      targetCell = await Cell.findById(cell);
    } else {
      // Plain text fallback parameter lookup layer
      targetCell = await Cell.findOne({ name: cell });
    }

    // Guard Clause validation layer
    if (!targetCell) {
      return res
        .status(404)
        .json({ message: "Assigned cell group not found." });
    }

    // 2. RUN WRITE TRANSACTION WITH RESOLVED OBJECT ID MATCH PINPOINT KEYS
    const member = await Member.create({
      name,
      phone,
      cell: targetCell._id, // 🔑 ENFORCES DYNAMIC SYSTEM WRITES VIA VALID OBJECT ID MATCHES
      gender,
      status,
    });

    await logAudit({
      req,
      action: "Create member",
      resourceType: "Member",
      resourceId: member._id,
      resourceSummary: member.name,
      details: `cellId=${targetCell._id}, cellName=${targetCell.name}, status=${status}`,
    });

    return res.status(201).json({ member });
  } catch (error) {
    console.error("Create member error", error);
    return res.status(500).json({ message: "Could not create member." });
  }
};
export const updateMember = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ message: "Member not found." });
    }
    const updates = req.body;
    // Safety Layer: Handle cell reassignments gracefully if a cell string is present
    if (updates.cell) {
      let targetCell = null;
      // Check if the incoming string is a valid 24-character Mongoose ObjectId signature
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(updates.cell);
      if (isValidObjectId) {
        targetCell = await Cell.findById(updates.cell);
      } else {
        // Plain text fallback parameter lookup layer
        targetCell = await Cell.findOne({ name: updates.cell });
      }

      if (!targetCell) {
        return res
          .status(404)
          .json({ message: "New assigned cell group not found." });
      }

      // 🔑 CRITICAL: Enforce writing the resolved database ObjectId to your updates object
      updates.cell = targetCell._id;
    }

    Object.assign(member, updates);
    await member.save();
    await logAudit({
      req,
      action: "Update member",
      resourceType: "Member",
      resourceId: member._id,
      resourceSummary: member.name,
      details: `fields=${Object.keys(updates).join(",")}`,
    });

    return res.json({ member });
  } catch (error) {
    console.error("Update member error", error);
    return res.status(500).json({ message: "Could not update member." });
  }
};

export const deleteMember = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ message: "Member not found." });
    }
    // CRITICAL BUG FIX: member.remove() is deprecated in modern Mongoose and throws errors.
    // Use deleteOne() to execute database removal reliably.
    await member.deleteOne();

    await logAudit({
      req,
      action: "Delete member",
      resourceType: "Member",
      resourceId: member._id,
      resourceSummary: member.name,
      details: `phone=${member.phone}, cellId=${member.cell}`,
    });

    // return res.json({ message: "Member deleted." });
    // Ensure your backend controller ends exactly like this:
    return res.status(200).json({ message: "Member deleted successfully." });
  } catch (error) {
    console.error("Delete member error", error);
    return res.status(500).json({ message: "Could not remove member." });
  }
};
