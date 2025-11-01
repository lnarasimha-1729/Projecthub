// controllers/WorkerController.js
import Worker from "../models/WorkerModel.js";

export const addWorker = async (req, res) => {
  try {
    const { Name, Role, workerType } = req.body;

    if (!Name || !Role) {
      return res.status(400).json({ message: "Name and Role are required" });
    }

    const worker = new Worker({
      Name: Name,              // map to schema
      Role: Role,              // map to schema
      workerType: workerType
    });

    await worker.save();

    res.status(201).json({ message: "Worker created successfully", worker });
  } catch (error) {
    console.error("Error adding worker:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

export const getWorkers = async(req,res)=>{
  try{
    const workers = await Worker.find({})
    res.status(200).json({success:true, workers})
  }
  catch(error){
    res.status(400).json({success:false})
  }
}

export const updateTotalHoursWorked = async (req, res) => {
  try {
    const { workerId, totalHoursWorked } = req.body;
    if (!workerId || totalHoursWorked == null)
      return res.status(400).json({ success: false, message: "Missing fields" });

    const worker = await Worker.findByIdAndUpdate(
      workerId,
      { totalHoursWorked },
      { new: true }
    );

    if (!worker)
      return res.status(404).json({ success: false, message: "Worker not found" });

    res.json({ success: true, worker });
  } catch (err) {
    console.error("Error updating total hours:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// PUT /api/workers/:id/location
export const updateWorkerLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ message: "Missing coordinates" });
    }

    console.log("📍 Updating location for worker:", req.params.workerId, latitude, longitude);

    const worker = await Worker.findByIdAndUpdate(
      req.params.workerId,
      { $set: { location: { latitude, longitude } } },
      { new: true }
    );

    if (!worker) {
      return res.status(404).json({ message: "Worker not found" });
    }

    res.json({ success: true, message: "Location updated", worker });
  } catch (err) {
    console.error("Error updating worker location:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


export const clockInWorker = async (req, res) => {
  try {
    const { workerId, latitude, longitude } = req.body;

    console.log(req.body);
    

    // validate input
    if (!workerId || !latitude || !longitude) {
      return res.status(400).json({ success: false, message: "Missing data" });
    }

    const worker = await Worker.findById(workerId);
    if (!worker) {
      return res.status(404).json({ success: false, message: "Worker not found" });
    }

    // ✅ store lat/long in DB
    worker.clockInTime = new Date();
    worker.isClockedIn = true;
    worker.location = { latitude, longitude };

    await worker.save();

    res.status(200).json({
      success: true,
      message: "Clock-in successful",
      worker,
    });
  } catch (error) {
    console.error("Error during clock-in:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
