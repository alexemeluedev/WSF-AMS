import District from "../models/District.js";
// import Cell from "../models/Cell.js";
import { logAudit } from "../utils/auditLogger.js"; // Adjust the path based on your setup

// @desc    Get all districts populated with aggregated nested active cells counters
// @route   GET /api/districts
export const getDistricts = async (req, res) => {
  try {
    // const { search, zone } = req.query;
    const { search } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }

    // Populate child zones, going a level deeper to capture cell virtual arrays
    const rawDistricts = await District.find(query)
      .sort({ name: 1 })
      .populate({
        path: "zones",
        populate: { path: "cells" },
      });

    const districts = rawDistricts.map((dist) => {
      const dObj = dist.toObject();

      // Calculate total active cells under all zones belonging to this specific district
      let calculatedCellsCount = 0;
      if (dObj.zones && Array.isArray(dObj.zones)) {
        dObj.zones.forEach((z) => {
          if (z.cells && Array.isArray(z.cells)) {
            calculatedCellsCount += z.cells.length;
          }
        });
      }

      return {
        ...dObj,
        activeCells: calculatedCellsCount,
        dateCreated: dist.createdAt
          ? dist.createdAt.toISOString().split("T")[0]
          : null,
      };
    });

    return res.status(200).json(districts);
  } catch (error) {
    return res.status(500).json({
      message: "Server error logging districts structural layout.",
      error: error.message,
    });
  }
};

// @desc    Create new district and audit
// @route   POST /api/districts
export const createDistrict = async (req, res) => {
  try {
    const { name, code } = req.body;
    const isDuplicate = await District.findOne({
      name: { $regex: `^${name.trim()}$`, $options: "i" },
    });
    if (isDuplicate) {
      return res
        .status(400)
        .json({ message: "District profile name already exists." });
    }

    const newDist = await District.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
    });

    await logAudit({
      req,
      action: "Create district",
      resourceType: "District",
      resourceId: newDist._id,
      resourceSummary: newDist.name,
      details: `code=${newDist.code}`,
    });

    return res.status(201).json(newDist);
  } catch (error) {
    return res
      .status(400)
      .json({ message: "Validation error occurred.", error: error.message });
  }
};

// @desc    Update existing district and audit
// @route   PUT /api/districts/:id
export const updateDistrict = async (req, res) => {
  try {
    const updated = await District.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name.trim(),
        code: req.body.code.trim().toUpperCase(),
      },
      { new: true, runValidators: true },
    );

    if (!updated) {
      return res
        .status(404)
        .json({ message: "District target record not found." });
    }

    await logAudit({
      req,
      action: "Update district",
      resourceType: "District",
      resourceId: updated._id,
      resourceSummary: updated.name,
      details: `code=${updated.code}`,
    });

    return res.status(200).json(updated);
  } catch (error) {
    return res
      .status(400)
      .json({ message: "Update action matrix failed.", error: error.message });
  }
};

// @desc    Delete target district instance and audit
// @route   DELETE /api/districts/:id
export const deleteDistrict = async (req, res) => {
  try {
    const deletedDistrict = await District.findByIdAndDelete(req.params.id);

    if (!deletedDistrict) {
      return res
        .status(404)
        .json({ message: "District target record not found." });
    }

    await logAudit({
      req,
      action: "Delete district",
      resourceType: "District",
      resourceId: deletedDistrict._id,
      resourceSummary: deletedDistrict.name,
      details: `Purged district code: ${deletedDistrict.code}`,
    });

    return res.status(200).json({ message: "District removed successfully." });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Purge process failed.", error: error.message });
  }
};
