import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import authRoutes from "./routes/authRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import userRoutes from "./routes/userRoutes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Lightweight health endpoint for API readiness
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Expense Sharing API" });
});

app.use("/api/auth", authRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/users", userRoutes);

// If the frontend has been built, serve it as static files so a single service can serve both
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDist = path.resolve(__dirname, "../../frontend/dist");

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // For SPA routing, serve index.html for all unmatched routes
  app.get("*", (req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/expense_sharing";

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    // Safety: drop legacy unique index on `username` in `users` collection if it exists.
    try {
      const conn = mongoose.connection;
      const indexes = await conn.db.collection("users").indexes();
      const hasUsernameIndex = indexes.some((idx) => idx.name === "username_1");
      if (hasUsernameIndex) {
        await conn.db.collection("users").dropIndex("username_1");
        console.log("Dropped legacy index username_1 on users collection");
      }
    } catch (idxErr) {
      // Log and continue; registration should still work even if this fails
      console.warn("Could not drop username_1 index (may not exist):", idxErr.message);
    }

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  });


