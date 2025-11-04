import express from "express";
import cors from "cors";
import userRouter from "./routes/UserRoute.js";
import connectDB from "./Config/mongodb.js";
import projectRouter from "./routes/ProjectRoute.js";
import workerRouter from "./routes/WorkerRoute.js";
import queryRouter from "./routes/QueryRoute.js";
import clockRouter from "./routes/ClockRoute.js";
import path from "path"
import dotenv from "dotenv";
import connectCloudinary from "./Config/cloudinary.js";
import projectProgressRoutes from "./routes/projectProgressRoutes.js"

dotenv.config();
connectCloudinary()

const app = express();
const port = 4000;
connectDB();

app.use(express.json());
app.use(cors({ origin: "*", credentials: true }));

app.use("/api/user", userRouter);
app.use("/api",projectRouter)
app.use("/api",workerRouter)
app.use("/api",queryRouter)
app.use("/api",clockRouter)
app.use("/api/project-progress", projectProgressRoutes);
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/", (req, res) => {
  res.send("API Working");
});

// Temporary test endpoint
app.get("/api/test-auto-save", async (req, res) => {
  await runDailySaveNow(); // just call the function body
  res.send("Manual auto-save executed!");
});


app.listen(port, () => {
  console.log("Server started on port: " + port);
});

export default app;