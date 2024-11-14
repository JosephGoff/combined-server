import { db_social } from "../connect.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import moment from "moment";

// Register function
export const register = (req, res) => {
  const q = "SELECT * FROM users WHERE email = ?";

  db.query(q, [req.body.email], (err, data) => {
    if (err) return res.status(500).json(err);
    if (data.length)
      return res.status(409).json({ error: "User already exists!" });

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

    db.query(q1, [values1], (err, data) => {
      if (err) return res.status(500).json(err);
      const newUserId = data.insertId;

      const relationshipPromises = req.body.ids.map((id) => {
        const values2 = [newUserId, id];
        const values2Reversed = [id, newUserId];

        return new Promise((resolve, reject) => {
          db.query(
            "INSERT INTO relationships(`followerUserId`, `followedUserId`) VALUES (?)",
            [values2],
            (err) => {
              if (err) return reject(err);
              db.query(
                "INSERT INTO relationships(`followerUserId`, `followedUserId`) VALUES (?)",
                [values2Reversed],
                (err) => {
                  if (err) return reject(err);
                  resolve();
                }
              );
            }
          );
        });
      });

      const messagePromises = req.body.ids.map((id) => {
        const values3 = [
          `Hi ${values1[0]}!`,
          moment(Date.now()).format("YYYY-MM-DD HH:mm:ss"),
          newUserId,
          id,
        ];

        return new Promise((resolve, reject) => {
          db.query(
            "INSERT INTO messages(`desc`,`createdAt`, `userId`, `receiverId`) VALUES (?)",
            [values3],
            (err) => {
              if (err) return reject(err);
              resolve();
            }
          );
        });
      });

      Promise.all([...relationshipPromises, ...messagePromises])
        .then(() => {
          res.status(200).json("User has been created.");
        })
        .catch((error) => {
          res.status(500).json(error);
        });
    });
  });
};

// Login Function
export const login = (req, res) => {
  console.log("Beginning login");
  const q = "SELECT * FROM users WHERE email = ?";

  db_social.query(q, [req.body.email], (err, data) => {
    // If there is an error
    if (err) {
      console.log(err);
    }

    if (err) return res.status(500).json(err);

    // If the data array returned was empty, nothing was found
    if (data.length === 0) return res.status(404).json("User not found!");

    // Otherwise, assume user was found and array with one item was returned - decrypt password
    const checkPassword = bcrypt.compareSync(
      req.body.password,
      data[0].password
    );

    // If user entered the wrong password for given username
    if (!checkPassword)
      return res.status(400).json("Wrong password or username!");

    // Otherwise, login was succesfull
    // Establish a secret key for the user
    const token = jwt.sign({ id: data[0].id }, "secretkey");

    // destructure data[0] so others is everything except the password
    const { password, ...others } = data[0];

    res.status(200).json({ ...others, accessToken: token });
  });
};

// Logout function
export const logout = (req, res) => {
  res.status(200).json("User has been logged out");
};
