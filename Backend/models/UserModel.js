import mongoose from "mongoose";

// Define the schema
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["worker", "admin", "supervisor"] },
    image : {type: [String], default: []}
  },
  { minimize: false }
);

// Check if the model already exists, otherwise create it
const userModel = mongoose.models.User || mongoose.model("User", userSchema);

export default userModel;