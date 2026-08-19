import mongoose from "mongoose";

const zoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Zone cluster name is required."],
      unique: true,
      trim: true,
    },
    headquarters: {
      type: String,
      required: [true, "Regional headquarters center is required."],
      trim: true,
    },
    // **ADD THIS DEPENDENCY BINDING RULE**:
    district: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "District",
      required: [
        true,
        "A zone cluster must explicitly belong to a parent district group.",
      ],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

zoneSchema.virtual("totalDistricts", {
  ref: "Cell",
  localField: "_id",
  foreignField: "zone",
  count: true,
});

zoneSchema.virtual("cells", {
  ref: "Cell",
  localField: "_id",
  foreignField: "zone",
});

export default mongoose.model("Zone", zoneSchema);
