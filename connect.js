// import mysql from "mysql2"
// import dotenv from 'dotenv';
// dotenv.config();

// export const db_social = mysql.createConnection({
//     host: process.env.MYSQL_HOST, 
//     port: process.env.MYSQL_PORT,
//     user: process.env.MYSQL_USER,
//     password: process.env.MYSQL_PASSWORD, 
//     database: process.env.MYSQL_DATABASE 
// });

// export const db_reis = db_social
// export const db = db_social

import mysql from 'mysql2';
import dotenv from 'dotenv';
dotenv.config();

export const db_social = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export const db_reis = db_social;
export const db = db_social;