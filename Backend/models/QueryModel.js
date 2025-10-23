import mongoose from "mongoose"

const QuerySchema = new mongoose.Schema({
  queryTitle: { type: String, required: true },
  queryDescription: { type: String, required: true },
  queryProject: { type: String, required: true },
  queryWorker: { type: String, required: true },
  queryPriority: { type: String, required: true },
  status: { type: String, default: "Open", required: true },
},{
  timestamps : true
});


export default mongoose.model("Query", QuerySchema)