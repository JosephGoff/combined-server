import { db_social } from "../connect.js";
import jwt from "jsonwebtoken";

export const getRelationships = (req,res) => {
    const q = "SELECT followerUserId FROM relationships WHERE followedUserId = ?";

    db_social.query(q, [req.query.followedUserId], (err,data)=>{
        if(err) return res.status(500).json(err)
        return res.status(200).json(data.map(relationship=>relationship.followerUserId));
    });
};

export const getAllRelationships = (req,res) => {
    const q = "SELECT * FROM relationships";

    db_social.query(q, [], (err,data)=>{
        if(err) return res.status(500).json(err)
        return res.status(200).json(data);
    });
};

export const addRelationship = (req,res) => {
    const token = req.accessToken;
    if(!token) return res.status(401).json("Not logged in!")

    jwt.verify(token, "secretkey", (err,userInfo)=> {
        if(err) return res.status(403).json("Token is invalid!")
       
        const q = "INSERT INTO relationships(`followerUserId`, `followedUserId`) VALUES (?)";

        const values = [
            userInfo.id,
            req.body.userId
          ];
    
          db_social.query(q, [values], (err,data)=>{
            if(err) return res.status(500).json(err)
            return res.status(200).json("Now Following");
        });
    });
};


export const deleteRelationship = (req,res) => {
    const token = req.accessToken;
    if(!token) return res.status(401).json("Not logged in!")

    jwt.verify(token, "secretkey", (err,userInfo)=> {
        if(err) return res.status(403).json("Token is invalid!")
       
        const q = "DELETE FROM relationships WHERE `followerUserId` = ? AND `followedUserId` = ?";

        db_social.query(q, [userInfo.id, req.query.userId], (err,data)=>{
            if(err) return res.status(500).json(err)
            return res.status(200).json("No longer following");
        });
    });
};