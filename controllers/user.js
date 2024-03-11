import { db_social } from "../connect.js";
import jwt from "jsonwebtoken";

export const getUser = (req,res)=> {
    const userId = req.params.userId;
    const q = "SELECT * FROM users WHERE id = ?"

    db_social.query(q, [userId], (err,data)=>{
        if(err) return res.status(500).json(err)
        
        if(data.length > 0) {
        const { password, ...info } = data[0]
        return res.json(info)
        }
    });
};

export const getUsers = (req,res)=> {
    const q = "SELECT * FROM users"

    db_social.query(q, [], (err,data)=>{
        if(err) return res.status(500).json(err)
        const data2 = []
        for (let i = 0; i < data.length; i++) {
            const { password, ...info } = data[i]
            data2.push(info)
        }
        return res.json(data2)
    });
};

export const updateUser = (req,res)=> {
    const token = req.accessToken;
    if(!token) return res.status(401).json("Not authenticated!")

    jwt.verify(token, "secretkey", (err, userInfo) => {
        if (err) return res.status(403).json("Token is not valid!");
    
        const q = "UPDATE users SET `name`=?,`username`=?,`city`=?,`website`=?,`profilePic`=?,`coverPic`=? WHERE id=?"
        
        db_social.query(q, [
            req.body.name,
            req.body.username, 
            req.body.city,
            req.body.website,
            req.body.profilePic,
            req.body.coverPic,
            userInfo.id
        ], (err, data)=>{
            if(err) return res.status(500).json(err)
            if(data.affectedRows > 0) return res.json("Updated!")
            return res.status(403).json("You can only update your posts.")
        });
    });
};

export const deleteUser = (req,res) => {
    const token = req.accessToken;
    if(!token) return res.status(401).json("Not logged in!")

    jwt.verify(token, "secretkey", (err,userInfo)=> {
        if(err) return res.status(403).json("Token is invalid!")
       
        const q = "DELETE FROM users WHERE `id`= ?";

        db_social.query(q, [userInfo.id], (err,data)=>{
            if(err) return res.status(500).json(err)
            if(data.affectedRows > 0) return res.status(200).json("User has been deleted.");
            return res.status(403).json("No accounts were deleted")
        });
    });
};