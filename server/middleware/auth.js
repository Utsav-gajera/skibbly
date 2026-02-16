import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const requireAuth = async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Missing access token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).lean();
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    req.user = { id: user._id.toString(), name: user.name, email: user.email, image: user.image };
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid access token" });
  }
};
