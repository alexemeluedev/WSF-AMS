import nodemailer from "nodemailer";
import Attendance from "../models/Attendance.js";
import Member from "../models/Member.js";
import { Resend } from "resend";
import { logAudit } from "../utils/auditLogger.js";

export const createAttendance = async (req, res) => {
  try {
    // 1. Extract leaderName and leaderPhone from the incoming request body
    const { date, cellName, records, notes, leaderName, leaderPhone } =
      req.body;

    if (!date || !cellName || !Array.isArray(records)) {
      return res
        .status(400)
        .json({ message: "Date, cellName, and records are required." });
    }

    // 2. Include leader tracking parameters within the atomic update payload
    const attendance = await Attendance.findOneAndUpdate(
      { date, cellName },
      {
        records,
        notes,
        leaderName: leaderName || "", // Ensures fields persist explicitly
        leaderPhone: leaderPhone || "",
        createdBy: req.user?.id,
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );

    await logAudit({
      req,
      action: "Save attendance",
      resourceType: "Attendance",
      resourceId: `${date}_${cellName}`,
      resourceSummary: `cell=${cellName}, date=${date}`,
      details: `records=${records.length}, leader=${leaderName || "None"}`,
    });

    return res.status(201).json({ attendance });
  } catch (error) {
    console.error("Create attendance error", error);
    return res.status(500).json({ message: "Could not save attendance." });
  }
};

export const getAttendanceByCell = async (req, res) => {
  try {
    const { cellName } = req.params;
    const records = await Attendance.find({ cellName }).sort({ date: -1 });
    return res.json({ records });
  } catch (error) {
    console.error("Get attendance error", error);
    return res.status(500).json({ message: "Could not load attendance." });
  }
};

export const getAttendanceByDate = async (req, res) => {
  try {
    const { date, cellName } = req.query;
    const record = await Attendance.findOne({ date, cellName });

    // 3. Include clean blank fallback fields so the frontend doesn't lose structure
    if (!record) {
      return res.status(200).json({
        record: {
          records: [],
          notes: "",
          leaderName: "",
          leaderPhone: "",
        },
      });
    }

    return res.json({ record });
  } catch (error) {
    console.error("Get attendance by date error", error);
    return res.status(500).json({ message: "Could not load attendance." });
  }
};

export const getAttendanceSummary = async (req, res) => {
  try {
    const summaries = await Attendance.aggregate([
      // 1. Separate individual member records objects into independent array lines
      { $unwind: "$records" },

      // 2. Group metrics atomically by cell name and date, counting exact status variations
      {
        $group: {
          _id: {
            cellName: "$cellName",
            date: "$date",
          },
          presentCount: {
            $sum: {
              $cond: [
                { $eq: [{ $toLower: "$records.status" }, "present"] },
                1,
                0,
              ],
            },
          },
          absentCount: {
            $sum: {
              $cond: [
                { $eq: [{ $toLower: "$records.status" }, "absent"] },
                1,
                0,
              ],
            },
          },
          // Maintain your gender demographics totals for the monthly reports page too
          maleCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: [{ $toLower: "$records.status" }, "present"] },
                    { $eq: [{ $toLower: "$records.gender" }, "male"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          femaleCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: [{ $toLower: "$records.status" }, "present"] },
                    { $eq: [{ $toLower: "$records.gender" }, "female"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          childrenCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: [{ $toLower: "$records.status" }, "present"] },
                    { $eq: [{ $toLower: "$records.gender" }, "children"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },

      // 3. Shape the document payload for direct frontend consumption
      {
        $project: {
          _id: 0,
          cellName: "$_id.cellName",
          date: "$_id.date",
          totalPresent: "$presentCount",
          totalAbsent: "$absentCount", // 🔑 THE BACKEND FIX: True database absent counts
          male: "$maleCount",
          female: "$femaleCount",
          children: "$childrenCount",
        },
      },

      // 4. Order list arrays starting with the newest reports
      { $sort: { date: -1, cellName: 1 } },
    ]);

    return res.status(200).json({ summaries });
  } catch (error) {
    console.error("Attendance history database aggregation crash:", error);
    return res
      .status(500)
      .json({ message: "Internal server error calculating summary matrix." });
  }
};

export const deleteAttendanceSheet = async (req, res) => {
  try {
    const { id } = req.params;
    // 🔑 THE CONTROLLER SAFETY GUARD: Catch any system parameters before they hit Mongoose query builders
    if (id === "reset-all-data" || id.includes("reset")) {
      return res
        .status(400)
        .json({ message: "Invalid document id pattern intercepted." });
    }

    let targetQuery = {};

    // 1. DYNAMIC ROUTING RECOVERY: Check if the ID parameter is a composite dashboard string
    if (id.includes("_")) {
      // Split "ELEVATION006_2026-07-01_5" into ["ELEVATION006", "2026-07-01", "5"]
      const [cellName, date] = id.split("_");

      targetQuery = {
        cellName: cellName.trim(),
        date: date.trim(),
      };
    } else {
      // Fallback: If it is a real 24-character hex ID string, query directly by _id
      targetQuery = { _id: id };
    }

    // 2. Clear out the document from your MongoDB collection safely matching by criteria fields
    const deletedSheet = await Attendance.findOneAndDelete(targetQuery);

    if (!deletedSheet) {
      return res.status(404).json({
        message: "This specific attendance report sheet could not be found.",
      });
    }

    // 3. Commit a security audit trail log entry for administrative accountabilities
    if (typeof logAudit === "function") {
      await logAudit({
        req,
        action: "Delete Attendance Record",
        resourceType: "Attendance",
        resourceId: deletedSheet._id,
        resourceSummary: deletedSheet.cellName,
        details: `Permanently removed attendance sheet log data for cell ${deletedSheet.cellName} dated ${deletedSheet.date}`,
      });
    }

    return res
      .status(200)
      .json({ message: "Attendance report deleted successfully." });
  } catch (error) {
    console.error("Express backend deleteAttendanceSheet crash:", error);
    return res.status(500).json({
      message: "Internal server error: Could not process document deletion.",
      error: error.message,
    });
  }
};

// 🔑 BACKEND CONTROLLER: controllers/attendanceController.js
export const resetAllAttendanceData = async (req, res) => {
  try {
    // 🚨 CRITICAL SECTOR: Permanently clear the entire attendance collection from MongoDB
    await Attendance.deleteMany({});

    return res.status(200).json({
      message:
        "Database master reset successful. All historical attendance sheets have been permanently wiped.",
    });
  } catch (error) {
    console.error("Master database reset pipeline failure:", error);
    return res.status(500).json({
      message: "Internal server error performing global system reset.",
    });
  }
};

export const dispatchEmailReport = async (req, res) => {
  try {
    // 🔑 THE ABSOLUTE SOLUTION: Read the live pre-compiled statistics straight from the request body!
    const { destination, targetDate, present, absent, rate, tableRows } =
      req.body;

    if (!destination) {
      return res
        .status(400)
        .json({ message: "Destination email address is required." });
    }

    const displayHeaderDate = targetDate
      ? new Date(targetDate).toLocaleDateString()
      : new Date().toLocaleDateString();

    // 3. BUILD THE TEMPLATE PACKED DIRECTLY WITH YOUR FRONTEND METRICS
    const emailHtmlPayload = `
      <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
        <h2 style="color: #1e1b4b; margin-bottom: 5px;">Zonal Attendance Summary Digest</h2>
        <p style="font-size: 12px; color: #64748b; margin-top: 0;">Compiled automatically on ${displayHeaderDate}</p>
        
        <div style="margin: 20px 0; background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0;">
          <table style="width: 100%; text-align: center; font-size: 13px;">
            <tr>
              <td><span style="font-size: 10px; text-transform: uppercase; color: #94a3b8; font-weight: bold; display: block;">Total Present</span><strong style="font-size: 20px; color: #10b981;">${present || 0}</strong></td>
              <td><span style="font-size: 10px; text-transform: uppercase; color: #94a3b8; font-weight: bold; display: block;">Total Absent</span><strong style="font-size: 20px; color: #ef4444;">${absent || 0}</strong></td>
              <td><span style="font-size: 10px; text-transform: uppercase; color: #94a3b8; font-weight: bold; display: block;">Global Turnout</span><strong style="font-size: 20px; color: #4f46e5;">${rate || 100}%</strong></td>
            </tr>
          </table>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
          <thead>
            <tr style="background: #f1f5f9; color: #475569; font-weight: bold; text-transform: uppercase; font-size: 10px;">
              <th style="padding: 10px;">Cell Center</th>
              <th style="padding: 10px; text-align: center;">Present</th>
              <th style="padding: 10px; text-align: center;">Absent</th>
              <th style="padding: 10px; text-align: center;">Turnout Rate</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || '<tr><td colspan="4" style="padding:15px; text-align:center; color:#94a3b8; font-style:italic;">No records active for this profile window.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    const resendClient = new Resend(process.env.RESEND_API_KEY);

    const { data, error } = await resendClient.emails.send({
      from: "WSF Zonal Management <onboarding@resend.dev>",
      to: [destination.trim()],
      subject: `📊 Zonal Attendance Digest - ${displayHeaderDate}`,
      html: emailHtmlPayload,
    });

    if (error) {
      console.error("❌ Resend SDK reported an operational failure:", error);
      return res
        .status(400)
        .json({ message: "Resend SDK rejected the email request.", error });
    }

    console.log(
      "🚀 Live Email digest dispatched via Resend SDK successfully! ID:",
      data?.id,
    );

    return res.status(200).json({
      message:
        "Automated digest data compiled and dispatched onto headquarters server successfully.",
      messageId: data?.id,
    });
  } catch (error) {
    console.error("Express backend dispatchEmailReport breakdown:", error);
    return res.status(500).json({
      message: "Internal Server Error compiling mail report digest.",
      error: error.message,
    });
  }
};
