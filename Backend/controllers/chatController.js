import axios from "axios";
import Project from "../models/ProjectModel.js";
import Query from "../models/QueryModel.js";
import Worker from "../models/WorkerModel.js";
import ClockEntries from "../models/ClockModel.js";
import User from "../models/UserModel.js";
import DailyProjectProgress from "../models/ProjectDailyProgress.js";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export const askChat = async (req, res) => {
  try {
    const { question } = req.body;

    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const todayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

    // 1️⃣ Fetch including Queries
    const [
      projects,
      workers,
      users,
      clockEntries,
      progress,
      todayClockIns,
      queries
    ] = await Promise.all([
      Project.find().limit(15).lean(),
      Worker.find().limit(15).lean(),
      User.find().limit(15).lean(),
      ClockEntries.find().sort({ time: -1 }).limit(30).lean(),
      DailyProjectProgress.find().sort({ date: -1 }).limit(10).lean(),
      ClockEntries.find({
        time: { $gte: todayStart, $lte: todayEnd },
        type: /clock-in/i,
      }).lean(),
      Query.find().sort({ createdAt: -1 }).limit(20).lean() // ⭐ NEW
    ]);

    // 2️⃣ Format Project Data
    const projectContext = projects
      .map(
        (p, i) =>
          `${i + 1}. Project: ${p.projectName || "Unnamed"} | Status: ${p.projectStatus} | Supervisor: ${
            Array.isArray(p.supervisors) ? p.supervisors.join(", ") : p.supervisors || "N/A"
          }`
      )
      .join("\n");

    // 3️⃣ Format Worker Data
    const workerContext = workers
      .map((w, i) => `${i + 1}. Worker: ${w.Name || w.name || "Unnamed"} | Type: ${w.workerType || "Unknown"}`)
      .join("\n");

    // 4️⃣ Format User Data
    const userContext = users
      .map((u, i) => `${i + 1}. User: ${u.name || "Unnamed"} | Role: ${u.role || "User"}`)
      .join("\n");

    // 5️⃣ Format Clock Entries
    const allClockContext = clockEntries
      .map(
        (c, i) =>
          `${i + 1}. Worker: ${c.worker || "Unknown"} | Project: ${c.project || "N/A"} | Type: ${
            c.type
          } | Time: ${new Date(c.time).toLocaleString()}`
      )
      .join("\n");

    const todayClockContext =
      todayClockIns.length > 0
        ? todayClockIns
            .map(
              (c, i) =>
                `${i + 1}. Worker: ${c.worker || "Unknown"} | Project: ${c.project || "N/A"} | Time: ${new Date(
                  c.time
                ).toLocaleTimeString()}`
            )
            .join("\n")
        : "No clock-ins found today.";

    // 6️⃣ Format Progress Data
    const progressContext = progress
      .map(
        (p, i) =>
          `${i + 1}. Project: ${p.projectName || "Unnamed"} | Progress: ${p.progress || 0}% | Date: ${new Date(
            p.date
          ).toLocaleDateString()}`
      )
      .join("\n");

    // ⭐ 7️⃣ Format Query Data
    const queryContext =
      queries.length > 0
        ? queries
            .map(
              (q, i) =>
                `${i + 1}. Query: ${q.question || "—"} | Asked By: ${
                  q.askedBy || "Unknown"
                } | Status: ${q.status || "Pending"} | Date: ${new Date(q.createdAt).toLocaleDateString()}`
            )
            .join("\n")
        : "No queries found.";

    // ⭐ ADD QUERY SECTION
    const combinedContext = `
TODAY'S DATE: ${new Date().toLocaleDateString()}

PROJECTS:
${projectContext}

WORKERS:
${workerContext}

USERS:
${userContext}

TODAY'S CLOCK-INS:
${todayClockContext}

ALL CLOCK ENTRIES (LATEST):
${allClockContext}

PROJECT PROGRESS:
${progressContext}

QUERIES:
${queryContext}
`;

    // 8️⃣ Send to OpenRouter
    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: "meta-llama/llama-3.1-8b-instruct",
        messages: [
          {
  role: "system",
  content: `
You are a smart assistant for a Project Management Dashboard.

Your job: ALWAYS provide the best possible answer using the available system data.

IMPORTANT BEHAVIOR:
- Never reply "No data available for that specific item" unless absolutely nothing matches.
- If a field name does not exist (e.g., "query title"), interpret it:
    - "query title" means "query question"
    - "ticket", "issue", "problem" all mean "query"
    - "staff" means "workers"
    - "employees" means "workers"
- If a question is unclear, give the closest meaningful result from the data.
- Use plain text only (no markdown formatting).
- If the question refers to "all queries", "list queries", "query titles", or similar:
    Use the QUERIES section.
- If a worker/project/query/date is not found at all, THEN and ONLY THEN say:
    "No matching data found."

YOUR GOAL:
Always produce a useful, clear answer based on available data.
Never reject the question unless the system truly has no related data.
`
},
          {
            role: "user",
            content: `
Here is the current system data:
${combinedContext}

Now answer this question clearly:
"${question}"
`
          },
        ],
        max_tokens: 150,
        temperature: 0.3,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const answer = response.data?.choices?.[0]?.message?.content || "No response received.";
    res.json({ answer });

  } catch (err) {
    console.error("💥 Chat error:", err.response?.data || err.message);
    res.status(500).json({
      error: err.response?.data || err.message || "Failed to get answer",
    });
  }
};
