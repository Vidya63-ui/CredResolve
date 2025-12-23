import mongoose from "mongoose";

// Records when a user settles up with another user within a group
const settlementSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
    from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true }
  },
  { timestamps: true }
);

const Settlement = mongoose.model("Settlement", settlementSchema);

export default Settlement;


