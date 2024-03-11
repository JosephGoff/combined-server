import express from "express";
import { addStory, getStories, deleteStory } from "../controllers/story.js"

const router = express.Router()

router.get("/", getStories)
router.post("/", addStory)
router.delete("/:id", deleteStory)

export default router