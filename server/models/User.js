import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        passwordHash: { type: String, required: true },
        image: { type: String, default: "" }
    },
    { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;