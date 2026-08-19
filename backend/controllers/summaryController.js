import Zone from "../models/Zone.js";
import Cell from "../models/Cell.js";
import Member from "../models/Member.js";
import User from "../models/User.js";
import District from "../models/District.js";

export const getSummaryCounts = async (req, res) => {
  try {
    // Concurrent query engine isolates row documents totals natively
    const [cellCount, memberCount, userCount, zoneCount, districtCount] =
      await Promise.all([
        Cell.countDocuments(),
        Member.countDocuments(),
        User.countDocuments(),
        Zone.countDocuments(),
        District.countDocuments(), // Natively tallies raw document collections index rows cleanly!
      ]);

    return res.status(200).json({
      cells: cellCount,
      members: memberCount,
      users: userCount,
      districts: districtCount,
      zones: zoneCount,
    });
  } catch (error) {
    console.error("Dashboard metrics aggregation failure:", error);
    return res
      .status(500)
      .json({ message: "Failed to compile sidebar telemetry metrics." });
  }
};
