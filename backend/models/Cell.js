import mongoose from "mongoose";

const cellSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Cell name is required"],
      unique: true,
      trim: true,
    },
    zone: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Zone cluster assignment is required"],
      // enum: ["EMPOWERMENT002", "EMPOWERMENT003"],
      ref: "Zone",
      trim: true,
    },
    address: {
      type: String,
      required: [true, "Physical location address is required"],
      trim: true,
    },
    // ADD THESE TWO FIELDS FOR PERMANENT LEADER HOUSING 👇
    leaderName: {
      type: String,
      default: "",
      trim: true,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

cellSchema.virtual("memberCount", {
  ref: "Member",
  localField: "_id",
  foreignField: "cell",
  count: true,
});

cellSchema.virtual("members", {
  ref: "Member",
  localField: "_id",
  foreignField: "cell",
});

export default mongoose.model("Cell", cellSchema);
