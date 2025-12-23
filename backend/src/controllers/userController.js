import { validationResult } from "express-validator";
import User from "../models/User.js";
import Group from "../models/Group.js";

// Add a friend by email; optional groupId to also add friend into that group (if caller is a member)
export const addFriendByEmail = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, groupId } = req.body;
  const requesterId = req.user.id;

  try {
    const friend = await User.findOne({ email });
    if (!friend) {
      return res.status(404).json({ message: "User with that email not found" });
    }

    if (friend._id.toString() === requesterId.toString()) {
      return res.status(400).json({ message: "Cannot add yourself as a friend" });
    }

    const requester = await User.findById(requesterId);
    const alreadyFriend = requester.friends.some((f) => f.toString() === friend._id.toString());
    if (!alreadyFriend) {
      requester.friends.push(friend._id);
      await requester.save();
    }

    let addedToGroup = false;
    if (groupId) {
      const group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      if (!group.members.includes(requesterId)) {
        return res.status(403).json({ message: "Not allowed to modify this group" });
      }
      const memberAlready = group.members.some((m) => m.toString() === friend._id.toString());
      if (!memberAlready) {
        group.members.push(friend._id);
        await group.save();
        addedToGroup = true;
      }
    }

    const populated = await requester.populate("friends", "name email");
    return res.status(200).json({
      message: addedToGroup ? "Friend added and added to group" : "Friend added",
      friends: populated.friends
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to add friend" });
  }
};

export const getMyFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("friends", "name email");
    return res.json(user.friends || []);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch friends" });
  }
};


