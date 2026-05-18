import { Router } from "express";
import { v4 as uuid } from "uuid";
export const feedbackRoutes = Router();
const feedbacks = [];
feedbackRoutes.post("/", (req, res) => {
    const { jobId, type, detail } = req.body;
    const record = {
        feedbackId: `fb_${uuid().slice(0, 8)}`,
        jobId,
        type: type || "general",
        detail,
        createdAt: new Date().toISOString(),
    };
    feedbacks.push(record);
    console.log("Feedback received:", JSON.stringify(record));
    res.status(201).json({ feedbackId: record.feedbackId, message: "Feedback recorded" });
});
