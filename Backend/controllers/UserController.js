import userModel from "../models/UserModel.js";
import validator from "validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
dotenv.config();

// Create JWT token
const createToken = (id, role, email, name) => {
  return jwt.sign({ id, role, name, email }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// REGISTER USER
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists (email)
    const exists = await userModel.findOne({ email });
    if (exists) {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }

    // Validate email and password
    if (!validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: "Invalid email" });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
    }

    // Check if password already exists (hashed compare)
    const users = await userModel.find({}, "password"); // fetch all user passwords
    for (let u of users) {
      const isSamePassword = await bcrypt.compare(password, u.password);
      if (isSamePassword) {
        return res.status(400).json({ success: false, message: "Password already exists, choose a different one" });
      }
    }

    // ADMIN CHECK
    let role = "worker";
    if (
      email === process.env.ADMIN_EMAIL &&
      password === process.env.ADMIN_PASSWORD
    ) {
      role = "admin";
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = new userModel({
      name,
      email,
      password: hashedPassword,
      role,
    });

    const user = await newUser.save();

    const token = createToken(user._id, user.role, user.email, user.name);

    res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
    });
  } catch (error) {
    console.error("Error in registerUser:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


// LOGIN USER
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: "User does not exist" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid password" });
    }

    // Update role dynamically if admin credentials match
    if (
      email === process.env.ADMIN_EMAIL &&
      process.env.ADMIN_PASSWORD &&
      password === process.env.ADMIN_PASSWORD &&
      user.role !== "admin"
    ) {
      user.role = "admin";
      await user.save();
    }

    const token = createToken(user._id, user.role, user.email, user.name);

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
    });
  } catch (error) {
    console.error("Error in loginUser:", error);
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

    const files = req.files?.image1 || req.files || (req.file ? [req.file] : []);
    if (!files.length) {
      return res.status(400).json({ success: false, message: "No image provided" });
    }

    const imagesUrl = await Promise.all(
      files.map(async (item) => {
        const result = await cloudinary.uploader.upload(item.path, {
          resource_type: "image",
        });
        return result.secure_url;
      })
    );

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

export const getusers = async (req, res) => {
  try {
    const users = await userModel.find();
    res.status(200).json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const { id } = req.params;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: "Name and email are required" });
    }

    if (req.user.id !== id) {
      return res.status(403).json({ success: false, message: "Not authorized to update this profile" });
    }

    const updatedUser = await userModel.findByIdAndUpdate(
      id,
      { name, email },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const token = createToken(updatedUser._id, updatedUser.role, updatedUser.email, updatedUser.name);

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
      token,
    });
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ success: false, message: "Failed to update profile" });
  }
};

export const emailCheck = async (req, res) => {
  try {
    const { email } = req.body;
    console.log(req.body);
    

    // 1️⃣ Validate input
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    // 2️⃣ Search for user by email
    const existingUser = await userModel.findOne({ email });

    // 3️⃣ Return result
    if (existingUser) {
      return res.status(200).json({
        success: true,
        exists: true,
        message: "Email exists in the database",
      });
    } else {
      return res.status(200).json({
        success: true,
        exists: false,
        message: "Email not found in the database",
      });
    }
  } catch (error) {
    console.error("Error in emailCheck:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword)
      return res.status(400).json({ success: false, message: "Missing fields" });

    const hashed = await bcrypt.hash(newPassword, 10);
    const updated = await userModel.updateOne({ email }, { $set: { password: hashed } });

    if (updated.modifiedCount > 0) {
      return res.json({ success: true, message: "Password updated successfully" });
    } else {
      return res.json({ success: false, message: "User not found or password unchanged" });
    }
  } catch (err) {
    console.error("Error changing password:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};



export { registerUser, loginUser };
