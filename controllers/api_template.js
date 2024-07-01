/**
 * --------------------------
 * Treasure Hunt Application
 * --------------------------
 *
 * @desc Controller for management actions
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
import { PlanTemplateModel } from "../db/models/ClassModel.js";
import * as api_user from "./api_user.js";
import * as api_game from "./api_game.js";
import config from "../config/config.js";
import { mongoose, model, ObjectId, Types } from "mongoose";

export function getPlanTemplateList(req, res, jwt) {
  var branch = req.params.branch;

  if (jwt.role !== Roles.SUPERADMIN) branch = jwt.branch;

  PlanTemplateModel.find({ branch })
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

export function getPlanTemplate(req, res, jwt) {
  var { branch, id } = req.params;

  if (jwt.role !== Roles.SUPERADMIN) branch = jwt.branch;

  var filter = {
    branch,
    _id: id,
  };

  PlanTemplateModel.findOne(filter)
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

export function addPlanTemplate(req, res, jwt) {
  var branch = req.params.branch;
  var templ = req.body;

  if (jwt.role !== Roles.SUPERADMIN) branch = jwt.branch;

  var newPlanTemplate = _createNewPlanTemplate(branch, templ);
  var model = new PlanTemplateModel(newPlanTemplate);
  model
    .save()
    .then((nPlanTemplate) => {
      if (nPlanTemplate) {
        res.status(200).json({ msg: strings.ok.actionOK });
      } else res.status(400).json({ msg: strings.err.actionFailed });
    })
    .catch((error) => {
      res.status(400).json({ msg: strings.err.actionFailed });
    });
}

export function deletePlanTemplate(req, res, jwt) {
  var { id, branch } = req.params;
  var _id = new mongoose.Types.ObjectId(id);

  var filter = {
    _id,
    branch,
  };

  if (jwt.role !== Roles.SUPERADMIN) filter.branch = jwt.branch;

  const options = {};

  // send query
  PlanTemplateModel.deleteOne(filter)
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

export function updatePlanTemplate(req, res, jwt) {
  var { id, branch } = req.params;
  var _id = new mongoose.Types.ObjectId(id);
  var templ = req.body;

  var filter = {
    _id,
    branch,
    version: templ.version,
  };

  if (jwt.role !== Roles.SUPERADMIN) filter.branch = jwt.branch;

  const options = {
    upsert: true,
    returnOriginal: false,
    new: true,
  };

  templ.template.forEach((element) => {
    delete element._id;
  });
  const update = {
    $set: { name: templ.name, grade: templ.grade, branch: templ.branch, template: templ.template },
    $inc: { version: 1 },
  };

  // send query
  PlanTemplateModel.findOneAndUpdate(filter, update, options)
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

function _createNewPlanTemplate(branch, templ) {
  var newPlanTemplate = {
    name: templ.name,
    grade: templ.grade,
    branch,
    template: templ.template,
  };
  return newPlanTemplate;
}
