import express from "express";
import { body } from "express-validator";
import { addFriendByEmail, getMyFriends } from "../controllers/userController.js";
import { authRequired } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/friends", authRequired, getMyFriends);

router.post(
  "/friends",
  authRequired,
  [body("email").isEmail().withMessage("Valid email is required")],
  addFriendByEmail
);

export default router;


