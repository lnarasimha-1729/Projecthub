import express from "express"
import { addWorker, getWorkers } from "../controllers/WorkerController.js"

const workerRouter = express.Router()

workerRouter.post("/worker",addWorker)
workerRouter.get("/get-workers",getWorkers)

export default workerRouter;