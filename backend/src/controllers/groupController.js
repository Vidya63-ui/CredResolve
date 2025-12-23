import { validationResult } from "express-validator";
import Group from "../models/Group.js";
import User from "../models/User.js";
import Expense from "../models/Expense.js";
import Settlement from "../models/Settlement.js";
import { computeNetBalances } from "../utils/balanceUtils.js";

export const createGroup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { name, memberIds } = req.body;
  try {
    const members = Array.isArray(memberIds) ? memberIds : [];
    if (!members.includes(req.user.id.toString())) {
      members.push(req.user.id);
    }
    const validUsers = await User.find({ _id: { $in: members } }).select("_id");
    const validIds = validUsers.map((u) => u._id);
    const group = await Group.create({
      name,
      createdBy: req.user.id,
      members: validIds
    });
    return res.status(201).json(group);
  } catch (err) {
    return res.status(500).json({ message: "Failed to create group" });
  }
};

export const getMyGroups = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user.id }).populate("members", "name email");
    return res.json(groups);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch groups" });
  }
};

export const addMemberByEmail = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { groupId } = req.params;
  const { email } = req.body;

  try {
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }
    // Only members can add others
    if (!group.members.includes(req.user.id)) {
      return res.status(403).json({ message: "Not allowed in this group" });
    }

    const userToAdd = await User.findOne({ email });
    if (!userToAdd) {
      return res.status(404).json({ message: "User with that email not found" });
    }

    const alreadyMember = group.members.some((m) => m.toString() === userToAdd._id.toString());
    if (alreadyMember) {
      return res.status(200).json({ message: "User already a member", group });
    }

    group.members.push(userToAdd._id);
    await group.save();
    const populated = await group.populate("members", "name email");
    return res.status(200).json({ message: "Member added", group: populated });
  } catch (err) {
    return res.status(500).json({ message: "Failed to add member" });
  }
};

export const deleteGroupIfSettled = async (req, res) => {
  const { groupId } = req.params;
  try {
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }
    if (group.createdBy.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: "Only the creator can delete this group" });
    }

    // Verify all balances are settled
    const expenses = await Expense.find({ group: groupId });
    const settlements = await Settlement.find({ group: groupId });
    const balances = computeNetBalances(expenses, settlements);
    const unsettled = Object.values(balances).some((v) => Math.abs(v) > 0.01);
    if (unsettled) {
      return res.status(400).json({ message: "Group cannot be deleted until all balances are settled" });
    }

    // Clean up related documents then delete group
    await Expense.deleteMany({ group: groupId });
    await Settlement.deleteMany({ group: groupId });
    await Group.deleteOne({ _id: groupId });

    return res.json({ message: "Group deleted" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete group" });
  }
};


