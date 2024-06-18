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
  frontend: {
    root: "http://mashar-app.s3-website.eu-north-1.amazonaws.com",
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
    playListPerPage: 20,
  },
  s3: {
    root: `https://mashar.s3.eu-north-1.amazonaws.com`, //https://mashar.s3.eu-north-1.amazonaws.com/riddles/aco/cat.png
  },
  email: {
    smtpService: "gmail",
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    smtpSecure: false, // true for port 465
    mailUser: "oded.physics@gmail.com",
    mailFrom: "oded.physics@gmail.com",
    sendOnlyToOded: true,
    lessonTemplate: `
    <!DOCTYPE html>
    <html lang="he" dir="rtl">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=devide-width, initial-scale=1.0">
    <title>אפליקציית מ/שר - שיעורי תיגבור</title>
    </head>
    <body style="font-family:Arial, sans-sarif; padding: 20px">
    <div style="background-color: #c1bfba; text-align:right; direction: rtl">
    רצינו ליידע אתכם שהתלמיד %STUDENT% של <span style="font-weight:bold">%TEACHER%</span> נרשם לשיעור תיגבור עם <span style="font-weight:bold">%TUTOR%</span> בתאריך %DATE% בשעה %TIME%
    </div>
    <div style="text-align:right; direction: rtl; margin-top: 20px;">
    אפשר לראות את רשימת הנרשמים <a href="%LINK%/lsn/reglist" target="mashar">בלינק הזה</a>
    </div>
    </body>
    </html>
    `,
  },
};

export default config;
