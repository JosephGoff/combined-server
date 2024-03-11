import { db_reis } from "../connect.js";

export const getProperties = (req, res) => {
    const q = `SELECT * FROM properties_rows`;

    db_reis.query(q, (err, data) => {
        if (err) return res.status(500).json(err);
        return res.status(200).json(data);
    });
};