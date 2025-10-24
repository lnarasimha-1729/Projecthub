import userModel from "../models/UserModel.js";
import validator from "validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import {v2 as cloudinary} from "cloudinary"
dotenv.config();

// Create JWT token
const createToken = (id, role, email, name) => {
  return jwt.sign({ id, role, name, email }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// REGISTER USER
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const exists = await userModel.findOne({ email });
    if (exists) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    // Validate email and password
    if (!validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: "Invalid email" });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Determine role: admin if matches env, otherwise user
    const role = (email === process.env.ADMIN_EMAIL) ? "admin" : email?.split("@")[0]?.split(".")[1] || "".toLowerCase();

    // Create new user
    const newUser = new userModel({
      name,
      email,
      password: hashedPassword,
      role,
    });

    const user = await newUser.save();

    // Generate JWT using role from DB
    const token = createToken(user._id, user.role, user.email, user.name);

    res.status(201).json({ success: true, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// LOGIN USER
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: "User does not exist" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    // Ensure role from DB is correct
    // Optional: update role if admin email changed
    if (email === process.env.ADMIN_EMAIL && user.role !== "admin") {
      user.role = "admin";
      await user.save();
    }

    // Generate JWT with correct role
    const token = createToken(user._id, user.role, user.email);

    res.status(200).json({ success: true, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addImage = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: "User ID required" });
    }

    const user = await userModel.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // handle single or multiple images
    const files = req.files?.image1 || req.files || (req.file ? [req.file] : []);

    if (!files.length) {
      return res.status(400).json({ success: false, message: "No image provided" });
    }

    // Upload all images to Cloudinary
    const imagesUrl = await Promise.all(
      files.map(async (item) => {
        const result = await cloudinary.uploader.upload(item.path, {
          resource_type: "image",
        });
        return result.secure_url;
      })
    );

    // Push new images into user's existing image array
    user.image.push(...imagesUrl);

    await user.save();

    res.status(200).json({
      success: true,
      message: "Image(s) uploaded successfully",
      images: user.image,
    });
  } catch (error) {
    console.error("Error in addImage:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// backend/controllers/profileController.js
export const getProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userModel.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Error in getProfile:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


export { registerUser, loginUser };