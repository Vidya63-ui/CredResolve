import { validationResult } from "express-validator";
import Expense from "../models/Expense.js";
import Group from "../models/Group.js";
import Settlement from "../models/Settlement.js";
import { computeNetBalances, simplifyDebts } from "../utils/balanceUtils.js";

export const addExpense = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { groupId, description, amount, splitType, participants } = req.body;

  try {
    const group = await Group.findById(groupId);
    if (!group || !group.members.includes(req.user.id)) {
      return res.status(403).json({ message: "Not allowed in this group" });
    }

    if (!Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({ message: "Participants required" });
    }

    let splits = [];
    if (splitType === "EQUAL") {
      const share = amount / participants.length;
      splits = participants.map((userId) => ({ user: userId, amount: share }));
    } else if (splitType === "EXACT") {
      const total = participants.reduce((sum, p) => sum + (p.amount || 0), 0);
      if (Math.abs(total - amount) > 0.01) {
        return res.status(400).json({ message: "Exact amounts must sum to total" });
      }
      splits = participants.map((p) => ({ user: p.userId, amount: p.amount }));
    } else if (splitType === "PERCENT") {
      const total = participants.reduce((sum, p) => sum + (p.percent || 0), 0);
      if (Math.abs(total - 100) > 0.01) {
        return res.status(400).json({ message: "Percents must sum to 100" });
      }
      splits = participants.map((p) => ({
        user: p.userId,
        percent: p.percent,
        amount: (amount * p.percent) / 100
      }));
    } else {
      return res.status(400).json({ message: "Invalid split type" });
    }

    const expense = await Expense.create({
      description,
      amount,
      splitType,
      group: groupId,
      paidBy: req.user.id,
      splits
    });

    return res.status(201).json(expense);
  } catch (err) {
    return res.status(500).json({ message: "Failed to add expense" });
  }
};

export const getGroupBalances = async (req, res) => {
  const { groupId } = req.params;
  try {
    const group = await Group.findById(groupId).populate("members", "name email");
    if (!group || !group.members.some((m) => m._id.toString() === req.user.id.toString())) {
      return res.status(403).json({ message: "Not allowed in this group" });
    }

    const expenses = await Expense.find({ group: groupId });
    const settlements = await Settlement.find({ group: groupId });

    const balances = computeNetBalances(expenses, settlements);
    const simplified = simplifyDebts(balances);

    return res.json({
      members: group.members,
      balances,
      simplified
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch balances" });
  }
};

export const settleBetweenUsers = async (req, res) => {
  const { groupId } = req.params;
  const { toUserId, amount } = req.body;
  try {
    const group = await Group.findById(groupId);
    if (!group || !group.members.includes(req.user.id) || !group.members.includes(toUserId)) {
      return res.status(403).json({ message: "Not allowed in this group" });
    }

    const settlement = await Settlement.create({
      group: groupId,
      from: req.user.id,
      to: toUserId,
      amount
    });
    return res.status(201).json(settlement);
  } catch (err) {
    return res.status(500).json({ message: "Failed to settle" });
  }
};


