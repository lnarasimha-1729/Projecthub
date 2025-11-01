import express from 'express';
import { createQuery, deleteQuery, getQueries, updateQueryStatus } from '../controllers/QueryController.js';

const queryRouter = express.Router();

queryRouter.post("/query", createQuery)
queryRouter.get("/get-queries",getQueries)
queryRouter.post("/update-querystatus",updateQueryStatus)
queryRouter.delete("/delete-query",deleteQuery)

export default queryRouter;