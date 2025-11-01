import QueryModel from "../models/QueryModel.js";

// Create a new query
const createQuery = async (req, res) => {
  try {
    const { queryTitle, queryDescription, queryProject, queryWorker, queryPriority } = req.body;

    const newQuery = new QueryModel({
      queryTitle,
      queryDescription,
      queryProject,
      queryWorker,
      queryPriority
    });

    await newQuery.save();
    res.status(200).json({ message: "Query created successfully", query: newQuery });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Get all queries
const getQueries = async (req, res) => {
  try {
    const queries = await QueryModel.find();
    res.status(200).json({ success: true, queries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateQueryStatus = async (req, res) => {
  try {
    const { id, status } = req.body; // ✅ fix: read from body not params

    const query = await QueryModel.findById(id);
    if (!query) {
      return res.status(404).json({ success: false, message: "Query not found" });
    }

    const validStatuses = ["Open", "Resolved"];

    // ✅ If frontend sends a valid status, use it; else toggle automatically
    if (status && validStatuses.includes(status)) {
      query.status = status;
    } else {
      if (query.status === "Open") query.status = "Resolved";
      else query.status = "Open";
    }

    await query.save();

    res.json({
      success: true,
      message: "✅ Query status updated successfully",
      query,
    });
  } catch (error) {
    console.error("Error in updateQueryStatus:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};




const deleteQuery = async(req,res)=>{
  try{
    const {id} = req.body
    const query = await QueryModel.findByIdAndDelete(id)
    res.status(200).json({success:true, query})
  }
  catch(error){res.status(500).json({success:false})}
}


export { createQuery, getQueries, updateQueryStatus, deleteQuery };