import express from "express";
import { getProperties } from "../controllers/properties.js"

const router = express.Router()

router.get("/", getProperties)

export default router