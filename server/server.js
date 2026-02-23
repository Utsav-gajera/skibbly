import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.js";

// initialize express
const app = express();

// connect to database
await connectDB();

// middlewares
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
    credentials: true
  })
);

app.disable("x-powered-by");

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  next();
});

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Auth routes
app.use("/api/auth", authRoutes);


// routes
app.get("/", (req, res) => res.send("API is running"));

// port
const PORT = process.env.PORT || 5000;

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err?.message || err);
  if (res.headersSent) return next(err);
  return res.status(500).json({ message: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
