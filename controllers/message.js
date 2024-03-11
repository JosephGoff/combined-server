import { db_social } from "../connect.js"
import jwt from "jsonwebtoken";
import moment from "moment";

export const getMessages = (req, res) => {
    const token = req.accessToken;
    if (!token) return res.status(401).json("Not logged in!");
  
    jwt.verify(token, "secretkey", (err, userInfo) => {
      if (err) return res.status(403).json("Token is invalid!");
  
      const q = `
        SELECT m.*, u.id AS userId, u.username, u.name, u.profilePic
        FROM messages AS m
        JOIN users AS u ON u.id = m.userId
        ORDER BY m.createdAt DESC
      `;
  
      db_social.query(q, (err, data) => {
        if (err) return res.status(500).json(err);
        return res.status(200).json(data);
      });
    });
  };

export const addMessage = (req,res) => {
    const token = req.accessToken;
    if(!token) return res.status(401).json("Not logged in!")

    jwt.verify(token, "secretkey", (err,userInfo)=> {
        if(err) return res.status(403).json("Token is invalid!")
       
        const q = "INSERT INTO messages(`desc`, `img`, `createdAt`, `userId`, `receiverId`) VALUES (?)";

        const values = [
            req.body.desc,
            req.body.img,
            moment(Date.now()).format("YYYY-MM-DD HH:mm:ss"),
            userInfo.id,
            req.body.receiverId
          ];
    
          db_social.query(q, [values], (err,data)=>{
            if(err) return res.status(500).json(err)
            return res.status(200).json("Message has been created.");
        });
    });
};

export const deleteMessage = (req,res) => {
    const token = req.accessToken;
    if(!token) return res.status(401).json("Not logged in!")

    jwt.verify(token, "secretkey", (err,userInfo)=> {
        if(err) return res.status(403).json("Token is invalid!")
       
        const q = "DELETE FROM posts WHERE `id`=? AND `userId` = ?";
    
        db_social.query(q, [req.params.id, userInfo.id], (err,data)=>{
            if(err) return res.status(500).json(err)
            if(data.affectedRows > 0) return res.status(200).json("Post has been deleted.");
            return res.status(403).json("You can only delete your posts.")
        });
    });
};