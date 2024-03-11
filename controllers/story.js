import { db_social } from "../connect.js"
import jwt from "jsonwebtoken";
import moment from "moment";

export const getStories = (req,res) => {

    const userId = req.query.userId
    const token = req.accessToken;
    if(!token) return res.status(401).json("Not logged in!")

    jwt.verify(token, "secretkey", (err,userInfo)=> {
        if(err) return res.status(403).json("Token is invalid!")

        const q = `
            SELECT s.*, u.id AS userId, u.username, u.name, u.profilePic
            FROM stories AS s
            JOIN users AS u ON u.id = s.userId
            ORDER BY s.createdAt DESC
        `;

        db_social.query(q, (err,data)=>{
            if(err) return res.status(500).json(err)
            return res.status(200).json(data);
        });
    });
};

export const addStory = (req,res) => {
    const token = req.accessToken;
    if(!token) return res.status(401).json("Not logged in!")

    jwt.verify(token, "secretkey", (err,userInfo)=> {
        if(err) return res.status(403).json("Token is invalid!")
       
        const q = "INSERT INTO stories(`img`, `createdAt`, `userId`) VALUES (?)";

        const values = [
            req.body.img,
            moment(Date.now()).format("YYYY-MM-DD HH:mm:ss"),
            userInfo.id,
          ];
    
        db_social.query(q, [values], (err,data)=>{
            if(err) return res.status(500).json(err)
            return res.status(200).json("Story has been posted");
        });
    });
};

export const deleteStory = (req,res) => {
    const token = req.accessToken;
    if(!token) return res.status(401).json("Not logged in!")

    jwt.verify(token, "secretkey", (err,userInfo)=> {
        if(err) return res.status(403).json("Token is invalid!")
       
        const q = "DELETE FROM stories WHERE `id`=? AND `userId` = ?";
    
        db_social.query(q, [req.params.id, userInfo.id], (err,data)=>{
            if(err) return res.status(500).json(err)
            if(data.affectedRows > 0) return res.status(200).json("Story has been deleted.");
            return res.status(403).json("You can only delete your stories.")
        });
    });
};