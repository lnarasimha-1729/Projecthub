import express from "express";
import { askChat } from "../controllers/chatController.js";

const router = express.Router();
router.post("/ask", askChat);

export default router;
