import { db_social } from "../connect.js"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import moment from "moment";

// Register function
export const register = (req, res) => {
    const q = "SELECT * FROM users WHERE email = ?";
  
    db_social.query(q, [req.body.email], (err, data) => {
      if (err) return res.status(500).json(err);
      if (data.length) return res.status(409).json({ error: "User already exists!" });
  
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(req.body.password, salt);
  
      const q1 =
        "INSERT INTO users (`username`,`email`,`password`,`name`,`profilePic`,`coverPic`,`city`,`website`) VALUE (?)";
      const values1 = [
        req.body.username,
        req.body.email,
        hashedPassword,
        req.body.name,
        req.body.profilePic,
        req.body.coverPic,
        req.body.city,
        req.body.website,
      ];
  
      db_social.query(q1, [values1], (err, data) => {
        if (err) return res.status(500).json(err);
        const newUserId = data.insertId;

        const q2 = "INSERT INTO relationships(`followerUserId`, `followedUserId`) VALUES (?)";
        for (let i=0;i<req.body.ids.length;i++) {
            const values2 = [newUserId, req.body.ids[i]];
  
            db_social.query(q2, [values2], (err, data) => {
                if (err) return res.status(500).json(err);
            });

            db_social.query(q2, [values2.reverse()], (err, data) => {
                if (err) return res.status(500).json(err);
            });

            const q3 = "INSERT INTO messages(`desc`,`createdAt`, `userId`, `receiverId`) VALUES (?)";

            const values3 = [
                "Hi " + values1[0] + "!",
                moment(Date.now()).format("YYYY-MM-DD HH:mm:ss"),
                newUserId,
                req.body.ids[i]
              ];
        
            db_social.query(q3, [values3], (err,data)=>{
                if(err) return res.status(500).json(err)
            });

        }
        return res.status(200).json("User has been created.");
    });
    });
  };
  

// Login Function
export const login = (req,res)=>{
    console.log("Beginning login")
    const q = "SELECT * FROM users WHERE email = ?"

    db_social.query(q,[req.body.email],(err,data)=>{
        // If there is an error
        if (err) {console.log(err)}

        if(err) return res.status(500).json(err)

        // If the data array returned was empty, nothing was found
        if(data.length === 0) return res.status(404).json("User not found!");

        // Otherwise, assume user was found and array with one item was returned - decrypt password
        const checkPassword = bcrypt.compareSync(req.body.password, data[0].password)
        
        // If user entered the wrong password for given username
        if (!checkPassword) return res.status(400).json("Wrong password or username!")
        
        // Otherwise, login was succesfull 
        // Establish a secret key for the user 
        const token = jwt.sign({ id: data[0].id }, "secretkey");

        // destructure data[0] so others is everything except the password
        const {password, ...others} = data[0]
      
        res.status(200).json({...others, accessToken: token});
      })
}

// Logout function
export const logout = (req,res)=>{
    res.status(200).json("User has been logged out")
} 