import express from "express";
import { getUser, updateUser, getUsers, deleteUser} from "../controllers/user.js"

const router = express.Router()

router.get("/get", getUsers)
router.get("/find/:userId", getUser)
router.put("/", updateUser)
router.delete("/:id", deleteUser)

export default router