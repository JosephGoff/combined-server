import express from "express";
import { getRelationships, addRelationship, getAllRelationships, deleteRelationship } from "../controllers/relationship.js"

const router = express.Router()

router.get("/",getRelationships)
router.get("/find",getAllRelationships)
router.post("/",addRelationship)
router.delete("/",deleteRelationship)


export default router