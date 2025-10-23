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