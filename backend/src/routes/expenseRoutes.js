import express from "express";
import { body } from "express-validator";
import { authRequired } from "../middleware/authMiddleware.js";
import { addExpense, getGroupBalances, settleBetweenUsers } from "../controllers/expenseController.js";

const router = express.Router();

router.post(
  "/",
  authRequired,
  [
    body("groupId").notEmpty().withMessage("Group is required"),
    body("description").notEmpty().withMessage("Description is required"),
    body("amount").isFloat({ gt: 0 }).withMessage("Amount must be > 0"),
    body("splitType").isIn(["EQUAL", "EXACT", "PERCENT"]).withMessage("Invalid split type")
  ],
  addExpense
);

router.get("/:groupId/balances", authRequired, getGroupBalances);

router.post("/:groupId/settle", authRequired, [body("toUserId").notEmpty(), body("amount").isFloat({ gt: 0 })], settleBetweenUsers);

export default router;


