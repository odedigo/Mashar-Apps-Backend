/**
 * --------------------------
 * Treasure Hunt Application
 * --------------------------
 *
 * @desc connect to a remote MongoDB database
 *
 * Org: Mashar / Kfar-Sava
 * By: Oded Cnaan
 * Date: March 2024
 */
"use strict";
//================ IMPORTS =================
import config from "../config/config.js";
import { connect } from "mongoose";

const connectionParams = {
  autoIndex: true,
};

/**
 * @desc formats the connection URL to MongoDB on Atlas
 * @return string - connection URL
 */
function getDbUri(conf) {
  return `${conf.protocol}://${process.env.DBUSER}:${process.env.DBPASS}@${process.env.DBHOST}/${process.env.DBNAME}?${conf.path}`;
}

/**
 * Connect to DB
 * @param {*} callback
 */
export function connectDB(callback) {
  var url = getDbUri(config.mongodb);
  connect(url, connectionParams)
    .then((aa) => {
      console.log("Connected to the database ");
      callback(true);
    })
    .catch((err) => {
      console.error(`Error connecting to the database. ${err}`);
      callback(false);
    });
}
