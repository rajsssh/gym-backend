// require('dotenv').config();

// module.exports = {
//   port: process.env.PORT || 4000,
//   databaseUrl: process.env.DATABASE_URL
// };


import dotenv from "dotenv";
dotenv.config();

export const ENV = {
  port: process.env.PORT || 4000,
  dbUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || "changeme",
  nodeEnv: process.env.NODE_ENV || "development",
};
