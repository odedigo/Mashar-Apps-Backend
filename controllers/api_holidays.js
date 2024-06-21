/**
 * --------------------------
 * Holiday App
 * --------------------------
 *
 * @desc Controller for lesson operations
 *
 * Org: Mashar / Kfar-Sava
 * By: Oded Cnaan
 * Date: March 2024
 */
"use strict";
//================ IMPORTS =================
import { HolidayModel } from "../db/models/HolidayModel.js";
import { Roles, UserModel } from "../db/models/UserModel.js";
import strings from "../public/lang/strings.js";
import config from "../config/config.js";
import * as util from "../utils/util.js";
import { mongoose, model, ObjectId, Types } from "mongoose";

/**
 * Get list of holiday calendars
 * @param {*} req
 * @param {*} res
 * @param {*} jwt
 */
export function getHolidayCalendars(req, res, jwt) {
  var branch = req.params.branch;

  if (jwt.role !== Roles.SUPERADMIN) branch = jwt.branch;

  HolidayModel.find({ branch })
    .then((docs) => {
      if (!docs) {
        res.status(400).json({ msg: strings.err.actionFailed });
      } else res.status(200).json(docs);
    })
    .catch((error) => {
      console.log(error);
      res.status(400).json({ msg: strings.err.actionFailed });
    });
}

/**
 * Get a specific holiday calendar
 * @param {*} req
 * @param {*} res
 * @param {*} jwt
 */
export function getHolidayCalendar(req, res, jwt) {
  var { branch, id } = req.params;

  if (jwt.role !== Roles.SUPERADMIN) branch = jwt.branch;

  var filter = {
    branch,
    _id: id,
  };

  HolidayModel.findOne(filter)
    .then((docs) => {
      if (!docs) {
        res.status(400).json({ msg: strings.err.actionFailed });
      } else res.status(200).json(docs);
    })
    .catch((error) => {
      console.log(error);
      res.status(400).json({ msg: strings.err.actionFailed });
    });
}

/**
 * Add a holiday calendar
 * @param {*} req
 * @param {*} res
 * @param {*} jwt
 */
export function addHolidayCalendar(req, res, jwt) {
  var branch = req.params.branch;
  var cal = req.body;

  if (jwt.role !== Roles.SUPERADMIN) branch = jwt.branch;

  var newCal = _createNewCalendar(branch, cal);
  var model = new HolidayModel(newCal);
  model
    .save()
    .then((nCal) => {
      if (nCal) {
        res.status(200).json({ msg: strings.ok.actionOK });
      } else res.status(400).json({ msg: strings.err.actionFailed });
    })
    .catch((error) => {
      res.status(400).json({ msg: strings.err.actionFailed });
    });
}

/**
 * Add a holiday calendar
 * @param {*} req
 * @param {*} res
 * @param {*} jwt
 */
export function cloneHolidayCalendar(req, res, jwt) {
  var branch = req.params.branch;
  var cal = req.body;

  if (jwt.role !== Roles.SUPERADMIN) branch = jwt.branch;

  HolidayModel.find({ branch, _id: cal._id })
    .then((docs) => {
      if (!docs || docs.length !== 1) {
        res.status(400).json({ msg: strings.err.actionFailed });
      } else {
        docs[0]._id = new mongoose.Types.ObjectId();
        docs[0].isNew = true;
        docs[0].name += " - עותק";
        docs[0]
          .save()
          .then((succ) => {
            res.status(200).json(docs);
          })
          .catch((err) => {
            console.log(error);
            res.status(400).json({ msg: strings.err.actionFailed });
          });
      }
    })
    .catch((error) => {
      console.log(error);
      res.status(400).json({ msg: strings.err.actionFailed });
    });
}

/**
 * Delete holiday calendar
 * @param {*} req
 * @param {*} res
 * @param {*} jwt
 */
export function deleteHolidayCalendar(req, res, jwt) {
  var { id, branch } = req.params;
  var _id = new mongoose.Types.ObjectId(id);

  var filter = {
    _id,
    branch,
  };

  if (jwt.role !== Roles.SUPERADMIN) filter.branch = jwt.branch;

  const options = {};

  // send query
  HolidayModel.deleteOne(filter)
    .then((doc) => {
      if (!doc || doc.deletedCount !== 1) {
        res.status(400).json({ msg: strings.err.actionFailed });
      } else {
        res.status(200).json({ msg: strings.ok.actionOK });
      }
    })
    .catch((err) => {
      res.status(400).json({ msg: strings.err.actionFailed });
    });
}

/**
 * Update an existing holiday calendar
 * @param {*} req
 * @param {*} res
 * @param {*} jwt
 */
export function updateHolidayCalendar(req, res, jwt) {
  var { id, branch } = req.params;
  var _id = new mongoose.Types.ObjectId(id);
  var cal = req.body;

  var filter = {
    _id,
    branch,
  };

  if (jwt.role !== Roles.SUPERADMIN) filter.branch = jwt.branch;

  const options = {
    upsert: true,
    returnOriginal: false,
    new: true,
  };

  const update = {
    $set: { name: cal.name, from: cal.from, to: cal.to, holidays: cal.holidays },
  };

  // send query
  HolidayModel.findOneAndUpdate(filter, update, options)
    .then((doc) => {
      if (!doc) {
        res.status(400).json({ msg: strings.err.actionFailed });
      } else {
        res.status(200).json({ msg: strings.ok.actionOK });
      }
    })
    .catch((err) => {
      res.status(400).json({ msg: strings.err.actionFailed });
    });
}

function _createNewCalendar(branch, cal) {
  var newCal = {
    branch,
    name: cal.name,
    year: cal.year,
    holidays: cal.holidays,
  };
  return newCal;
}
