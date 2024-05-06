/**
 * --------------------------
 * Treasure Hunt Application
 * --------------------------
 *
 * @desc Main NodeJS application
 *
 * Org: Mashar / Kfar-Sava
 * By: Oded Cnaan
 * Date: March 2024
 */
"use strict";
//================ IMPORTS =================
import express from "express";
//import http from 'http';
import { connectDB } from "./db/db.js";
import routing from "./routes/index.js";
import __dirname from "fs";

//Additional
import { HTTPS } from "express-sslify";
import { config } from "dotenv";
import { loadBranchesFromDB } from "./utils/util.js";

let rootPath = ".";
if (!process.cwd().endsWith("server")) rootPath = "./server";
config({ path: `${rootPath}/config.env` });

//Start
const app = express();
app.set("rootPath", rootPath);
if (process.env.ENVIROMENT != "local") {
  app.use(HTTPS({ trustProtoHeader: true }));
}
app.set("port", process.env.PORT || 3000);
app.use("/", express.static("./public"));
//Middlewares

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//Routing
app.use("/", routing); // routing module with all routes, which in turn points to controllers

// DB Status
app.set("db_connected", false);

//Express-Server
connectDB(function (status) {
  // Start server (listen)
  console.log(`DB connection ${status ? "success" : "failed"}`);
  if (!status) {
    console.log("Aborting...");
    return;
  }
  app.listen(app.get("port"), () => {
    console.log(`Server running on port ${app.get("port")}`);
  });
  app.set("db_connected", status); // mark connected or not
  loadBranchesFromDB();
});
