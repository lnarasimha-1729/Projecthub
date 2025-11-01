import express from "express"
import { addWorker, clockInWorker, getWorkers, updateTotalHoursWorked, updateWorkerLocation } from "../controllers/WorkerController.js"

const workerRouter = express.Router()

workerRouter.post("/worker",addWorker)
workerRouter.get("/get-workers",getWorkers)
workerRouter.put("/update-hours", updateTotalHoursWorked);
workerRouter.put("/:workerId/location", updateWorkerLocation);
workerRouter.post("/clock-in", clockInWorker);


export default workerRouter;