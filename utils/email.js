/**
 * --------------------------
 * Mashar Application
 * --------------------------
 *
 * @desc Email module
 *
 * Org: Mashar / Kfar-Sava
 * By: Oded Cnaan
 * Date: March 2024
 */

import nodemailer from "nodemailer";
import { google } from "googleapis";
import config from "../config/config.js";

const OAuth2 = google.auth.OAuth2;

/**
 * Sending an email message
 *
 * sendMail({
 *   to: "bar@example.com, baz@example.com", // list of receivers
 *   cc: "someone@example.com"
 *   subject: "Hello", // Subject line
 *   text: "Hello world?", // plain text body
 *   html: "<b>Hello world?</b>", // html body
 * });
 * @param {*} message
 * @returns
 */
let _refreshToken = "";

export async function sendMail(message) {
  /*const myOAuth2Client = new OAuth2(process.env.MAIL_CLIENTID, process.env.MAIL_PASS, "https://developers.google.com/oauthplayground");

  myOAuth2Client.setCredentials({
    refresh_token: _refreshToken === "" ? process.env.MAIL_REFRESH : _refreshToken,
  });
  */
  try {
    /*const googleToken = await myOAuth2Client.refreshAccessToken();
    _refreshToken = googleToken.credentials.refresh_token;*/
    const transporter = nodemailer.createTransport({
      service: config.email.smtpService,
      host: config.email.smtpHost,
      port: config.email.smtpPort,
      secure: config.email.smtpSecure,
      auth: {
        /*type: "OAuth2",
        clientId: process.env.MAIL_CLIENTID,
        clientSecret: process.env.MAIL_PASS,
        accessToken: googleToken.credentials.access_token,
        refreshToken: googleToken.credentials.refresh_token,
        expires: googleToken.credentials.expiry_date,*/
        user: config.email.mailUser,
        pass: process.env.MAIL_PASS,
      },
    });

    message.from = config.email.mailFrom;
    const info = await transporter.sendMail(message);
  } catch (err) {
    console.log(err.command);
    console.log(err.err);
    return null;
  }
}

export function parseEmailTemplate(template, list) {
  list.forEach((item) => {
    template = template.replace(item.key, item.value);
  });
  return template;
}
