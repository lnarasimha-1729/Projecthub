import express from "express"
import { addImage, loginUser,registerUser, getProfile } from "../controllers/UserController.js"
import multer from "multer";

const upload = multer({dest : "uploads/"})

const userRouter = express.Router();
userRouter.post("/register", registerUser)
userRouter.post("/login", loginUser)
userRouter.post("/profile", upload.fields([{ name: "image1", maxCount: 1 }]), addImage);
userRouter.get("/profile/:id", getProfile);

export default userRouter;