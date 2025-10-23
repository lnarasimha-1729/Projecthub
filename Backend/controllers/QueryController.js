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

const updateStatus = async (req, res) => {
  try {
    const { id, status } = req.body;

    // Find the query by ID
    const query = await QueryModel.findById(id);

    if (!query) {
      return res.status(404).json({ message: "Query not found" });
    }
if (status === "Open") query.status = "InProgress";
    else if (status === "InProgress") query.status = "Resolved";

    // Save the updated document
    await query.save();

    res.status(200).json({ message: "Status updated successfully", query });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
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


export { createQuery, getQueries, updateStatus, deleteQuery };