import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Member name is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    // **RELATIONAL LINK**: Binds document explicitly to the Cell Model by ID
    cell: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cell",
      required: [true, "A member must be explicitly assigned to a cell group"],
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      default: "Male",
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  { timestamps: true },
);

export default mongoose.model("Member", memberSchema);
