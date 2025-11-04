import express from "express"
import { addImage, loginUser,registerUser, getProfile, getusers, updateUserProfile, emailCheck, changePassword } from "../controllers/UserController.js"
import multer from "multer";
import verifyToken from "../middleware/Auth.js"

const upload = multer({dest : "uploads/"})

const userRouter = express.Router();
userRouter.post("/register", registerUser)
userRouter.post("/login", loginUser)
userRouter.post("/profile", upload.fields([{ name: "image1", maxCount: 1 }]), addImage);
userRouter.get("/profile/:id", getProfile);
userRouter.put("/profile/:id", verifyToken, updateUserProfile);
userRouter.get("/get-users", getusers)
userRouter.post("/checkEmail",emailCheck)
userRouter.post("/change-password", changePassword);

export default userRouter;