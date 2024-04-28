/**
 * --------------------------
 * Treasure Hunt Application
 * --------------------------
 *
 * @desc Server config
 *
 * Org: Mashar / Kfar-Sava
 * By: Oded Cnaan
 * Date: March 2024
 */
"use strict";
/**
 * Holds general application configuration
 * of the application
 */

const config = {
  version: {
    v: "1.2.0",
    date: "28.4.24",
  },
  mongodb: {
    // DB Atlas access
    protocol: "mongodb+srv",
    dbname: "Mashar",
    clusterURI: "masharcluster.qpsgps5.mongodb.net",
    path: "retryWrites=true&w=majority&appName=MasharCluster",
  },
  app: {
    allowLessons: true,
    isProduction: process.env.NODE_ENV === "production",
    logger_show_info: true,
    report_status: true,
    expiration: 1, // # of days
    gameListPerPage: 20,
    userListPerPage: 20,
    lessonLisrPerPage: 5,
  },
  s3: {
    root: `https://mashar.s3.eu-north-1.amazonaws.com`, //https://mashar.s3.eu-north-1.amazonaws.com/riddles/aco/cat.png
  },
};

export default config;
