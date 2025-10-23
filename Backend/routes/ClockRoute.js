import express from "express"
import { addClockEntry, getClockEntries } from "../controllers/ClockController.js";

const clockRouter = express.Router()

clockRouter.post("/clock",addClockEntry)
clockRouter.get("/get-clocks",getClockEntries)

export default clockRouter;