import mongoose from "mongoose";

// splitType: "EQUAL" | "EXACT" | "PERCENT"
const expenseSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    splitType: {
      type: String,
      enum: ["EQUAL", "EXACT", "PERCENT"],
      required: true
    },
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // entries: for each participant: user, amountOwed (positive = owes), percent (for PERCENT type)
    splits: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        amount: { type: Number, required: true },
        percent: { type: Number }
      }
    ]
  },
  { timestamps: true }
);

const Expense = mongoose.model("Expense", expenseSchema);

export default Expense;


