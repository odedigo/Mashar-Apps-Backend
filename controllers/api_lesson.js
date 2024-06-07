/**
 * --------------------------
 * Lesson App
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
import { Roles, UserModel } from "../db/models/UserModel.js";
import { LsnGroupModel } from "../db/models/LsnGroupModel.js";
import { LsnFormModel } from "../db/models/LsnFormModel.js";
import strings from "../public/lang/strings.js";
import config from "../config/config.js";
import * as util from "../utils/util.js";
import * as api_user from "../controllers/api_user.js";
import { model } from "mongoose";
import { response } from "express";
import { Types } from "mongoose";

export function saveLessonGroups(req, res, jwt) {
  // check if DB properly connected
  if (!req.app.get("db_connected")) {
    return res.status(500);
  }

  var { branch, groups } = req.body;
  if (!util.isValidValue(branch) || !util.isValidValue(groups)) {
    return res.status(400).json({ msg: strings.err.invalidData });
  }

  groups.forEach((grp) => {
    grp.name = grp.name.slice(2);
    if (grp.gid === "-1") {
      grp.gid = util.getUniqueGameUID();
    }
  });

  var filter = {
    branch,
  };
  const options = {
    upsert: true,
    returnOriginal: false,
    new: true,
  };
  var update = {
    $set: { groups },
  };

  LsnGroupModel.findOneAndUpdate(filter, update, options)
    .then((doc) => {
      if (!doc) {
        res.status(400).json({ Error: strings.err.actionFailed });
      } else res.status(200).json({ msg: strings.ok.actionOK });
    })
    .catch((err) => {
      res.status(400).json({ Error: strings.err.actionFailed });
    });
}

/**
 * Saves a single edited group
 * @param {*} req
 * @param {*} res
 * @param {*} jwt
 */
export function saveLessonGroup(req, res, jwt) {
  // check if DB properly connected
  if (!req.app.get("db_connected")) {
    return res.status(500);
  }

  var group = req.body;
  var branch = req.params.branch;

  if (!util.isValidValue(branch) || !util.isValidValue(group) || !util.isValidValue(group.gid)) {
    return res.status(400).json({ msg: strings.err.invalidData });
  }

  var filter = {
    branch,
    "groups.gid": group.gid,
  };
  const options = {
    upsert: true,
    returnOriginal: false,
    new: true,
  };
  var update = {
    $set: { "groups.$.name": group.name, "groups.$.grade": group.grade, "groups.$.active": group.active },
  };

  LsnGroupModel.findOneAndUpdate(filter, update, options)
    .then((doc) => {
      if (!doc) {
        res.status(400).json({ Error: strings.err.actionFailed });
      } else res.status(200).json({ msg: strings.ok.actionOK });
    })
    .catch((err) => {
      res.status(400).json({ Error: strings.err.actionFailed });
    });
}

/**
 * add a new item to the groups array
 * @param {*} req
 * @param {*} res
 * @param {*} jwt
 * @returns
 */
export function addLessonGroup(req, res, jwt) {
  // check if DB properly connected
  if (!req.app.get("db_connected")) {
    return res.status(500);
  }

  var group = req.body;
  var branch = req.params.branch;

  if (!util.isValidValue(group)) {
    return res.status(400).json({ msg: strings.err.invalidData });
  }
  group.gid = util.getUniqueGameUID();

  // check that this branch has an entry in DB
  LsnGroupModel.findOne({ branch })
    .then((doc) => {
      if (doc) {
        _addLsnGroup(req, res, jwt, group, branch);
      } else {
        // create one
        model = new LsnGroupModel({ branch, groups: [] });
        model
          .save()
          .then((grp) => {
            _addLsnGroup(req, res, jwt, group, branch);
          })
          .catch((err) => {
            return res.status(400).json({ msg: strings.err.invalidData });
          });
      }
    })
    .catch((error) => {
      return res.status(400).json({ msg: strings.err.invalidData });
    });
}

export function deleteLessonGroup(req, res, jwt) {
  // check if DB properly connected
  if (!req.app.get("db_connected")) {
    return res.status(500);
  }

  var { branch, gid } = req.params;

  var filter = {
    branch,
  };
  const options = {};
  const update = { $pull: { groups: { gid } } };

  LsnGroupModel.updateOne(filter, update, options)
    .then(async (doc) => {
      if (doc.modifiedCount === 1) {
        res.status(200).json({ msg: strings.ok.actionOK });
      } else {
        res.status(400).json({ msg: strings.err.actionFailed });
      }
    })
    .catch((err) => {
      res.status(400).json({ msg: strings.err.actionFailed });
    });
}

function _addLsnGroup(req, res, jwt, group, branch) {
  var filter = { branch };
  const options = {
    upsert: true,
    returnOriginal: false,
    new: true,
  };
  var update = {
    $push: { groups: { gid: group.gid, name: group.name, grade: group.grade, active: group.active } },
  };
  LsnGroupModel.updateOne(filter, update, options)
    .then((response) => {
      res.status(200).json({ msg: strings.ok.actionOK });
    })
    .catch((er) => {
      res.status(400).json({ msg: strings.err.actionFailed });
    });
}
/**
 * Save lesson list per user
 * @param {*} req
 * @param {*} res
 * @param {*} jwt
 * @returns
 */
export function saveLessonList(req, res, jwt) {
  // check if DB properly connected
  if (!req.app.get("db_connected")) {
    return res.status(500);
  }

  var { users } = req.body;
  if (!util.isValidValue(users)) {
    return res.status(400).json({ msg: strings.err.invalidData });
  }

  var command = [];

  for (var i = 0; i < users.length; i++) {
    var cmd = {
      updateOne: {
        filter: { username: users[i].user },
        update: { $set: { lessons: users[i].lessons } },
      },
    };
    command.push(cmd);
  }

  // send query
  UserModel.bulkWrite(command)
    .then((users) => {
      res.status(200).json({ msg: strings.ok.lsnListSavedOK });
    })
    .catch((err) => {
      console.log(err);
      res.status(400).json({ msg: strings.err.actionFailed });
    });
}

export async function getLessonGroupList(req, res, jwt) {
  // check if DB properly connected
  if (!req.app.get("db_connected")) {
    return res.status(500);
  }

  var { branchCode, page } = req.params;
  if (!util.isValidValue(page)) page = 1;

  var numPerPage = config.app.userListPerPage;

  var filter = { branch: branchCode };
  // send query with pagination
  var lsnGroups = await LsnGroupModel.find(filter)
    /*.limit(numPerPage)
    .skip(numPerPage * (page - 1))*/
    .sort({ branch: "desc" });
  //var total = await LsnGroupModel.countDocuments(filter);
  var groups = createLsnGroupArray(lsnGroups);
  var total = groups.length;
  res.status(200).json({ groups: groups, total, numPerPage, branch: filter["branch"] });
}

async function _getLessonGroupList(branchCode, page, jwt) {
  if (!util.isValidValue(page)) page = 1;

  var numPerPage = config.app.userListPerPage;

  var filter = { branch: branchCode };
  // send query with pagination
  var lsnGroups = await LsnGroupModel.find(filter)
    /*.limit(numPerPage)
    .skip(numPerPage * (page - 1))*/
    .sort({ branch: "desc" });
  //var total = await LsnGroupModel.countDocuments(filter);
  var groups = createLsnGroupArray(lsnGroups);
  var total = groups.length;
  return { groups: groups, totalGroups: total, numGroupsPerPage: numPerPage };
}

export function createLsnGroupArray(groups) {
  var list = [];
  if (Array.isArray(groups)) {
    if (groups.length === 1) {
      groups[0].groups.forEach((element) => {
        list.push({ gid: element.gid, name: element.name, grade: element.grade, active: element.active });
      });
    }
  } else {
    groups.groups.forEach((element) => {
      list.push({ gid: element.gid, name: element.name, grade: element.grade, active: element.active });
    });
  }
  return list;
}

export async function getLessonsAvailability(req, res, jwt) {
  var branchCode = req.params.branch;
  var teacher = req.params.teacher;
  // SUPER-ADMIN can see all images.
  // Others can view only from their branch so we redirect
  // them to their section
  if (jwt.role !== Roles.SUPERADMIN && branchCode != jwt.branch) {
    branchCode = jwt.branch;
  }

  const { groups, totalGroups, numGroupsPerPage } = await _getLessonGroupList(branchCode, 1, jwt);
  res.status(200).json({ users: ausers, groups, numPerPage: config.app.userListPerPage, totalDocs: 1 });
}

export async function getLessonsAvailabilitySingle(req, res, jwt) {
  var branchCode = req.params.branch;
  var teacher = req.params.teacher;
  // SUPER-ADMIN can see all images.
  // Others can view only from their branch so we redirect
  // them to their section
  if (jwt.role !== Roles.SUPERADMIN && branchCode != jwt.branch) {
    branchCode = jwt.branch;
  }

  const user = await api_user._getUser(branchCode, teacher);
  const { groups, totalGroups, numGroupsPerPage } = await _getLessonGroupList(branchCode, 1, jwt);
  res.status(200).json({ groups, user });
}

export async function getGroupByBranch(branch, gid) {
  var group = await LsnGroupModel.findOne({ branch });
  var arr = createLsnGroupArray(group);
  if (util.isValidValue(gid)) {
    var single = arr.filter((item) => item.gid == gid);
    if (single.length === 1) return { gid: single[0].gid, name: single[0].name };
  }
  return arr;
}

function getGroupFromArray(groups, gid) {
  var single = groups.filter((item) => item.gid == gid);
  if (single.length === 1) return { gid: single[0].gid, name: single[0].name };
  return null;
}

export function createLsnFormList(forms, group) {
  if (forms == null) return {};
  var frms = [];
  for (var i = 0; i < forms.length; i++) {
    var dt = util.isValidValue(forms[i].date) ? util.getDateIL(forms[i].date) : "";
    var f = { uid: forms[i].uid, name: forms[i].name, active: forms[i].active, branchCode: forms[i].branch, branch: util.codeToBranch(forms[i].branch), date: dt, group: forms[i].group, qa: util.getQAFromForm(forms[i].qa), title: forms[i].title };
    if (group != null) {
      var g = getGroupFromArray(group, forms[i].group);
      if (g !== null) f.groupName = g.name;
    }
    frms.push(f);
  }
  return frms;
}

export function createEmptyForm(branch) {
  var f = { uid: "-1", name: "שם הטופס", active: false, branchCode: branch, branch: util.codeToBranch(branch), date: util.getDateIL(new Date()), group: "", qa: [], title: "כותרת הטופס" };
  return f;
}

export async function getForm(uid) {
  var filter = { uid };
  // send query with pagination
  var form = await LsnFormModel.find(filter);
  return form;
}

/////////////// FORMS

export async function getForms(req, res, jwt) {
  // check if DB properly connected
  if (!req.app.get("db_connected")) {
    return res.status(500);
  }

  var filter = { branch: req.params.branch };
  if (jwt.role !== Roles.SUPERADMIN) filter.branch = jwt.branch;

  if (util.isValidValue(req.params.id)) filter["uid"] = req.params.id;

  // send query with pagination
  var forms = await LsnFormModel.find(filter);
  var groups = await getGroupByBranch(filter.branch);
  res.status(200).json({ forms, groups });
}

export async function cloneForm(req, res, jwt) {
  // check if DB properly connected
  if (!req.app.get("db_connected")) {
    return res.status(500);
  }

  var filter = {
    branch: req.params.branch,
    uid: req.params.id,
  };
  if (jwt.role !== Roles.SUPERADMIN) filter.branch = jwt.branch;

  // send query
  LsnFormModel.find(filter)
    .then((form) => {
      if (!form || form.length != 1) {
        res.status(400).json({ msg: strings.err.invalidData });
        return;
      }
      form[0].uid = util.getUniqueGameUID();
      form[0].active = false;
      form[0]._id = new Types.ObjectId();
      form[0].date = util.getCurrentDateTime();
      form[0].name += " - עותק";
      form[0].isNew = true;
      delete form[0]._id;
      var theform = new LsnFormModel(form[0]);
      theform
        .save()
        .then((nform) => {
          if (nform) {
            res.status(200).json(nform);
          } else res.status(400).json({ msg: strings.err.actionFailed });
        })
        .catch((error) => {
          console.log(error);
          res.status(400).json({ msg: strings.err.actionFailed });
        });
    })
    .catch((err) => {
      console.log(err);
      res.status(400).json({ msg: strings.err.actionFailed });
    });
}

export async function deleteForm(req, res, jwt) {
  // check if DB properly connected
  if (!req.app.get("db_connected")) {
    return res.status(500);
  }

  var filter = {
    uid: req.params.id,
    branch: req.params.branch,
  };

  if (jwt.role !== Roles.SUPERADMIN) filter.branch = jwt.branch;

  const options = {};

  // send query
  await LsnFormModel.deleteOne(filter, options)
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

export async function addForm(req, res, jwt) {
  // check if DB properly connected
  if (!req.app.get("db_connected")) {
    return res.status(500);
  }

  var form = req.body;
  var branch = req.params.branch;

  if (jwt.role !== Roles.SUPERADMIN || !util.isValidValue(branch)) branch = jwt.branch;

  var theForm = _createNewForm(branch, form, true);
  var model = new LsnFormModel(theForm);
  model
    .save()
    .then((nForm) => {
      if (nForm) {
        res.status(200).json({ msg: strings.ok.actionOK });
      } else res.status(400).json({ msg: strings.err.actionFailed });
    })
    .catch((error) => {
      res.status(400).json({ msg: strings.err.actionFailed });
    });
}

export function saveForm(req, res, jwt) {
  // check if DB properly connected
  if (!req.app.get("db_connected")) {
    return res.status(500);
  }

  var filter = {
    uid: req.params.id,
    branch: req.params.branch,
  };

  // only super-admins can save games outside their branch
  if (jwt.role !== Roles.SUPERADMIN) {
    filter["branch"] = jwt.branch;
  }

  // send query
  LsnFormModel.findOne(filter)
    .then((theForm) => {
      if (!theForm) {
        res.status(400).json({ msg: strings.err.invalidData });
        return;
      }
      var saveData = _createNewForm(filter.branch, req.body, false);
      var model = new LsnFormModel(saveData); // create a Model
      model.isNew = false;
      delete model._id;
      model._id = theForm.id;
      model
        .save() // save it
        .then((nForm) => {
          if (nForm) res.status(200).json({ msg: strings.ok.actionOK });
          else res.status(400).json({ msg: game.err.actionFailed });
        })
        .catch((error) => {
          console.log(error);
          res.status(400).json({ msg: strings.err.actionFailed });
        });
    })
    .catch((err) => {
      console.log(err);
      res.status(400).json({ msg: strings.err.actionFailed });
    });
}

function _createNewForm(branch, form, isNew) {
  var form = {
    branch,
    group: form.group,
    active: form.active,
    date: util.getCurrentDateTime(),
    name: form.name,
    title: form.title !== "" ? form.title : "כותרת",
    subtitle: form.subtitle !== "" ? form.subtitle : "תת כותרת",
    qa: form.qa,
    desc: form.desc,
  };
  if (isNew) form["uid"] = util.getUniqueGameUID();
  return form;
}
