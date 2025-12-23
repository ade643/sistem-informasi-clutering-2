import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const db = new Sequelize(
  process.env.DB_NAME || "db_sis", 
  process.env.DB_USER || "root", 
  process.env.DB_PASSWORD || "", 
  {
    host: process.env.DB_HOST || "localhost",
    dialect: "mysql",
    logging: console.log,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

export default db;