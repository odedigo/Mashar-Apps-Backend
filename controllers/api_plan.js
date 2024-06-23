/**
 * --------------------------
 * Treasure Hunt Application
 * --------------------------
 *
 * @desc Controller for class and plan actions
 *
 * Org: Mashar / Kfar-Sava
 * By: Oded Cnaan
 * Date: March 2024
 */
"use strict";
//================ IMPORTS =================
import strings from "../public/lang/strings.js";
import * as util from "../utils/util.js";
import { Roles } from "../db/models/UserModel.js";
import { BranchModel } from "../db/models/BranchModel.js";
import { SchoolModel } from "../db/models/SchoolModel.js";
import { ClassModel } from "../db/models/ClassModel.js";
import * as api_user from "./api_user.js";
import config from "../config/config.js";
import { mongoose, model, ObjectId, Types } from "mongoose";

/**
 * Get list of holiday calendars
 * @param {*} req
 * @param {*} res
 * @param {*} jwt
 */
export function getClassList(req, res, jwt) {
  var { branch, teacher } = req.params;

  if (jwt.role !== Roles.SUPERADMIN) branch = jwt.branch;

  ClassModel.find({ branch, teacher })
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
export function getClass(req, res, jwt) {
  var { branch, id } = req.params;

  if (jwt.role !== Roles.SUPERADMIN) branch = jwt.branch;

  var filter = {
    branch,
    _id: id,
  };

  ClassModel.findOne(filter)
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
export function addClass(req, res, jwt) {
  var branch = req.params.branch;
  var cls = req.body;

  if (jwt.role !== Roles.SUPERADMIN) branch = jwt.branch;

  var newCls = _createNewClass(branch, cls);
  var model = new ClassModel(newCls);
  model
    .save()
    .then((nCls) => {
      if (nCls) {
        res.status(200).json({ msg: strings.ok.actionOK });
      } else res.status(400).json({ msg: strings.err.actionFailed });
    })
    .catch((error) => {
      res.status(400).json({ msg: strings.err.actionFailed });
    });
}

/**
 * Delete holiday calendar
 * @param {*} req
 * @param {*} res
 * @param {*} jwt
 */
export function deleteClass(req, res, jwt) {
  var { id, branch } = req.params;
  var _id = new mongoose.Types.ObjectId(id);

  var filter = {
    _id,
    branch,
  };

  if (jwt.role !== Roles.SUPERADMIN) filter.branch = jwt.branch;

  const options = {};

  // send query
  ClassModel.deleteOne(filter)
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
export function updateClass(req, res, jwt) {
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
    $set: { name: cal.name },
  };

  // send query
  ClassModel.findOneAndUpdate(filter, update, options)
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

function _createNewClass(branch, cls) {
  var newCls = {
    branch,
    name: cls.name,
    year: cls.year,
    teacher: cls.teacher,
    school: cls.school,
    grade: cls.grade,
    comments: cls.comments,
    lessons: cls.lessons,
    plan: cls.plan,
    students: cls.students,
  };
  return newCls;
}
