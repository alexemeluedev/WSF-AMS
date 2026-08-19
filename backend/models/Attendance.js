import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      trim: true,
    },
    cellName: {
      type: String,
      required: true,
      trim: true,
    },
    // ADD THESE TWO FIELDS HERE 👇
    leaderName: {
      type: String,
      default: "",
      trim: true,
    },
    leaderPhone: {
      type: String,
      default: "",
      trim: true,
    },
    records: [
      {
        memberId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Member",
        },
        name: String,
        phone: String,
        gender: String,
        status: {
          type: String,
          enum: ["Present", "Absent"],
          required: true,
        },
      },
    ],
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

attendanceSchema.index({ date: 1, cellName: 1 }, { unique: true });

export default mongoose.model("Attendance", attendanceSchema);
