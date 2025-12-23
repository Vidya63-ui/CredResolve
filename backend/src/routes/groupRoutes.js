import express from "express";
import { body } from "express-validator";
import {
  createGroup,
  getMyGroups,
  addMemberByEmail,
  deleteGroupIfSettled
} from "../controllers/groupController.js";
import { authRequired } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  authRequired,
  [body("name").notEmpty().withMessage("Group name is required")],
  createGroup
);

router.get("/", authRequired, getMyGroups);

router.post(
  "/:groupId/members",
  authRequired,
  [body("email").isEmail().withMessage("Valid email is required")],
  addMemberByEmail
);

router.delete("/:groupId", authRequired, deleteGroupIfSettled);

export default router;


