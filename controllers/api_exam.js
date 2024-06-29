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
import { ExamModel } from "../db/models/ExamModel.js";
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
export function getExamList(req, res, jwt) {
  var { year, branch } = req.params;

  if (jwt.role !== Roles.SUPERADMIN) branch = jwt.branch;

  ExamModel.find({ branch, year })
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
 * Get list of holiday calendars
 * @param {*} req
 * @param {*} res
 * @param {*} jwt
 */
export function getExamListFilter(req, res, jwt) {
  var { branch } = req.params;
  var params = req.body;

  if (jwt.role !== Roles.SUPERADMIN) branch = jwt.branch;

  var filter = {
    branch,
  };

  Object.keys(params).forEach((key) => {
    filter[key] = params[key];
  });

  ExamModel.find(filter)
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
export function getExam(req, res, jwt) {
  var { branch, id } = req.params;

  if (jwt.role !== Roles.SUPERADMIN) branch = jwt.branch;

  var filter = {
    branch,
    _id: id,
  };

  ExamModel.findOne(filter)
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
export function addExam(req, res, jwt) {
  var branch = req.params.branch;
  var exam = req.body;

  if (jwt.role !== Roles.SUPERADMIN) branch = jwt.branch;

  var newExam = _createNewExam(branch, exam);
  var model = new ExamModel(newExam);
  model
    .save()
    .then((nExam) => {
      if (nExam) {
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
export function cloneExam(req, res, jwt) {
  var branch = req.params.branch;
  var exam = req.body;

  if (jwt.role !== Roles.SUPERADMIN) branch = jwt.branch;

  ExamModel.find({ branch, _id: exam._id })
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
export function deleteExam(req, res, jwt) {
  var { id, branch } = req.params;
  var _id = new mongoose.Types.ObjectId(id);

  var filter = {
    _id,
    branch,
  };

  if (jwt.role !== Roles.SUPERADMIN) filter.branch = jwt.branch;

  const options = {};

  // send query
  ExamModel.deleteOne(filter)
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
export function updateExam(req, res, jwt) {
  var { id, branch } = req.params;
  var _id = new mongoose.Types.ObjectId(id);
  var exam = req.body;

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
    $set: { name: exam.name, ref: exam.ref, link: exam.link, evalType: exam.evalType, isPrivate: exam.isPrivate, subject: exam.subject, chance: exam.chance, year: exam.year, classGrade: exam.classGrade, questions: exam.questions, period: exam.period, comments: exam.comments, date: exam.date },
  };

  // send query
  ExamModel.findOneAndUpdate(filter, update, options)
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

function _createNewExam(branch, exam) {
  var newExam = {
    branch,
    name: exam.name,
    year: exam.year,
    subject: exam.subject,
    link: exam.link,
    classGrade: exam.classGrade,
    questions: exam.questions,
    comments: exam.comments,
    period: exam.period,
    date: exam.date,
    chance: exam.chance,
    isPrivate: exam.isPrivate,
    evalType: exam.evalType,
    ref: exam.ref,
  };
  return newExam;
}
