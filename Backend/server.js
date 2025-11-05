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
import cron from "node-cron"

import snapshotAllProjects from "./services/progressSnapshot.js"
import ProjectDailyProgress from "./models/ProjectDailyProgress.js";

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
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.post('/api/progress/snapshot', async (req, res) => {
    try {
      const result = await snapshotAllProjects();
      res.json({ ok: true, result });
    } catch (err) {
      console.error(err);
      res.status(500).json({ ok: false, message: err.message });
    }
  });

  // Schedule daily snapshot at 00:00 IST (midnight in Asia/Kolkata)
  // Cron expression: '0 0 * * *' => at minute 0 hour 0 every day
  cron.schedule('0 0 * * *', async () => {
    console.log(`[${new Date().toISOString()}] Running scheduled progress snapshot (IST midnight)`);
    try {
      const r = await snapshotAllProjects();
      console.log('Snapshot result:', r);
    } catch (err) {
      console.error('Snapshot cron error:', err);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

app.get("/", (req, res) => {
  res.send("API Working");
});

app.get("/api/getDailyProgress",async(req,res)=>{
  try{
    const dailyProgress = await ProjectDailyProgress.find()
    res.status(201).json({success:true, dailyProgress})
  }
  catch(error){
    res.status(500).json({success:false, message : error.message})
  }
})


app.listen(port, () => {
  console.log("Server started on port: " + port);
});

export default app;