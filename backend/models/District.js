import mongoose from "mongoose";

const districtSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "District profile name is required."],
      unique: true,
      trim: true,
    },
    code: {
      type: String,
      required: [true, "District identification code string is required."],
      unique: true,
      trim: true,
      uppercase: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual Linkage: Count how many zones point to this District ID
districtSchema.virtual("zonesCount", {
  ref: "Zone",
  localField: "_id",
  foreignField: "district",
  count: true,
});

// Virtual Linkage: Fetch actual structural child zones to aggregate deep elements
districtSchema.virtual("zones", {
  ref: "Zone",
  localField: "_id",
  foreignField: "district",
});

export default mongoose.model("District", districtSchema);
