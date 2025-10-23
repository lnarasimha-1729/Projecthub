import express from 'express';
import { createQuery, deleteQuery, getQueries, updateStatus } from '../controllers/QueryController.js';

const queryRouter = express.Router();

queryRouter.post("/query", createQuery)
queryRouter.get("/get-queries",getQueries)
queryRouter.post("/update-status",updateStatus)
queryRouter.delete("/delete-query",deleteQuery)

export default queryRouter;