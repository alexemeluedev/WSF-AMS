import Zone from "../models/Zone.js"; // Adjust the path based on your setup
import District from "../models/District.js";
import { logAudit } from "../utils/auditLogger.js"; // Adjust the path based on your setup

// @desc Fetch all zones with pagination, searching, and calculations
// @route GET /api/zones
export const getZones = async (req, res) => {
  try {
    const { search, page, limit } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { headquarters: { $regex: search, $options: "i" } },
      ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 5;
    const skipNum = (pageNum - 1) * limitNum;

    const totalItems = await Zone.countDocuments(query);
    const rawZones = await Zone.find(query)
      .sort({ name: 1 })
      .skip(skipNum)
      .limit(limitNum)
      .populate("district", "name code")
      .populate("totalDistricts")
      .populate({
        path: "cells",
        populate: { path: "memberCount" },
      });

    const zones = rawZones.map((zone) => {
      const zoneObj = zone.toObject();
      const calculatedMemberSum =
        zoneObj.cells?.reduce((acc, currentCell) => {
          return acc + (currentCell.memberCount || 0);
        }, 0) || 0;

      delete zoneObj.cells;
      return {
        ...zoneObj,
        totalMembersCount: calculatedMemberSum,
      };
    });

    return res.status(200).json({
      zones,
      totalPages: Math.ceil(totalItems / limitNum) || 1,
      currentPage: pageNum,
      totalItems,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error tracking zones layout.",
      error: error.message,
    });
  }
};

// @desc Create new zone and audit
// @route POST /api/zones
export const createZone = async (req, res) => {
  try {
    const { name, headquarters, district } = req.body;

    if (!name || !headquarters || !district) {
      return res.status(400).json({
        message: "Name, headquarters, and district linkage are required.",
      });
    }
    const districtExists = await District.findById(district);

    if (!districtExists) {
      return res.status(400).json({
        message: "The specified district does not exist.",
      });
    }

    const isDuplicate = await Zone.findOne({
      name: { $regex: `^${name.trim()}$`, $options: "i" },
    });

    if (isDuplicate) {
      return res
        .status(400)
        .json({ message: `A zone named "${name.trim()}" already exists.` });
    }

    const newZone = await Zone.create({
      name: name.trim(),
      headquarters: headquarters.trim(),
      district,
    });

    await logAudit({
      req,
      action: "Create zone",
      resourceType: "Zone",
      resourceId: newZone._id,
      resourceSummary: newZone.name,
      details: `headquarters=${headquarters.trim()}, district=${district}`,
    });

    return res.status(201).json(newZone);
  } catch (error) {
    return res
      .status(400)
      .json({ message: "Validation error occurred.", error: error.message });
  }
};

// @desc Update existing zone and audit
// @route PUT /api/zones/:id
export const updateZone = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, headquarters, district } = req.body;
    const districtExists = await District.findById(district);

    if (!districtExists) {
      return res.status(400).json({
        message: "The specified district does not exist.",
      });
    }

    const isDuplicate = await Zone.findOne({
      _id: { $ne: id },
      name: { $regex: `^${name.trim()}$`, $options: "i" },
    });

    if (isDuplicate) {
      return res
        .status(400)
        .json({ message: `A zone named "${name.trim()}" already exists.` });
    }

    const updatedZone = await Zone.findByIdAndUpdate(
      id,
      { name: name.trim(), headquarters: headquarters.trim(), district },
      { new: true, runValidators: true },
    );

    if (!updatedZone) {
      return res.status(404).json({ message: "Zone target record not found." });
    }

    await logAudit({
      req,
      action: "Update zone",
      resourceType: "Zone",
      resourceId: updatedZone._id,
      resourceSummary: updatedZone.name,
      details: `headquarters=${headquarters.trim()}, district=${district}`,
    });

    return res.status(200).json(updatedZone);
  } catch (error) {
    return res
      .status(400)
      .json({ message: "Update execution failed.", error: error.message });
  }
};

// @desc Delete target zone instance and audit
// @route DELETE /api/zones/:id
export const deleteZone = async (req, res) => {
  try {
    const deletedZone = await Zone.findByIdAndDelete(req.params.id);

    if (!deletedZone) {
      return res.status(404).json({ message: "Zone target record not found." });
    }

    await logAudit({
      req,
      action: "Delete zone",
      resourceType: "Zone",
      resourceId: deletedZone._id,
      resourceSummary: deletedZone.name,
      details: `Purged zone: ${deletedZone.name}`,
    });

    return res.status(200).json({ message: "Zone removed successfully." });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Purge process failed.", error: error.message });
  }
};
