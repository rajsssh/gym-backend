// const express = require('express');
// const env = require('./config/env');
// const routes = require('./routes');
// const errorHandler = require('./middlewares/errorHandler');

// const app = express();

// app.use(express.json());
// app.use('/api', routes);

// app.use(errorHandler);

// module.exports = app;



import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { ENV } from "./config/env.js";
import router from "./routes/index.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import fileUpload from "express-fileupload";
import { startMemberExpiryCron, startPTAutoCompleteCron } from "./config/startMemberExpiry.js";
import { startWhatsAppCronJobs } from "./utils/cronJobs.js";
import os from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: os.tmpdir(),
    limits: { fileSize: 50 * 1024 * 1024 }, // optional 50MB limit
  })
);

// middlewares


app.use(
  cors({
    origin: function (origin, callback) {
      callback(null, true);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(morgan("dev"));

// ✅ Serve uploaded images as static files → http://localhost:4000/uploads/filename.jpg
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// main routes
app.use("/api", router);

// health check route
app.get("/", (req, res) => {
  res.json({ message: "Gym Management API is running" });
});

// error handler (last)
app.use(errorHandler);
startMemberExpiryCron()
startPTAutoCompleteCron()
startWhatsAppCronJobs()

export default app;
