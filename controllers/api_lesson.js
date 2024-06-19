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
import { LessonRegModel } from "../db/models/LsnRegModel.js";
import strings from "../public/lang/strings.js";
import config from "../config/config.js";
import * as util from "../utils/util.js";
import * as api_user from "../controllers/api_user.js";
import { model } from "mongoose";
import { Types } from "mongoose";
import { sendMail, parseEmailTemplate } from "../utils/email.js";

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

/**
 * Gets the list of lesson groups
 * @param {*} req
 * @param {*} res
 * @param {*} jwt
 * @returns
 */
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

/**
 * Register lesson request by a student
 * This API does not require login as it is used by students
 */
export function regiserLesson(req, res) {}

/**
 * Returns a list of forms for this branch
 * If id is specified, only one will be returned.
 */
export async function getForms(req, res) {
  // check if DB properly connected
  if (!req.app.get("db_connected")) {
    return res.status(500);
  }

  var filter = { branch: req.params.branch };

  if (util.isValidValue(req.params.id)) filter["uid"] = req.params.id;

  // send query with pagination
  var forms = await LsnFormModel.find(filter);
  var groups = await getGroupByBranch(filter.branch);
  res.status(200).json({ forms, groups });
}

/**
 * Clone an existing form
 */
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
      form[0].qa.forEach((q) => {
        q.qid = util.getUniqueGameUID();
      });
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

/**
 * Delete a given form
 */
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

/**
 * add a new form
 */
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

/**
 * update details of an existing form
 */
export function updateFormDetails(req, res, jwt) {
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
      var saveData = _updateFormDetails(filter.branch, req.body, theForm);
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

/**
 * Saves an existing form (edit)
 */
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
  form.qa.forEach((item) => {
    if (item.qid === "") item.qid = util.getUniqueGameUID();
  });
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

function _updateFormDetails(branch, form, existingForm) {
  existingForm.group = form.group;
  existingForm.active = form.active;
  (existingForm.date = util.getCurrentDateTime()), (existingForm.name = form.name);
  return existingForm;
}

/*************************** LESSON REGISTRATION **************************/

export function registerLesson(req, res) {
  const formData = req.body;
  const branch = req.params.branch;

  // check if DB properly connected
  if (!req.app.get("db_connected")) {
    return res.status(500);
  }

  var data = _createLessonReg(formData);
  var model = LessonRegModel(data);
  model
    .save()
    .then((reg) => {
      if (reg) {
        var templateValues = _getTemplateValues(formData);
        var to = config.email.sendOnlyToOded ? "oded.cnaan@gmail.com" : `${formData.curTeacher.email},${formData.teacher.email}`;
        sendMail({
          to,
          subject: "עדכון שיעורי תיגבור",
          html: parseEmailTemplate(config.email.lessonTemplate, templateValues),
        });
        res.status(200).json({ msg: strings.ok.actionOK });
      } else res.status(400).json({ msg: strings.err.actionFailed });
    })
    .catch((error) => {
      res.status(400).json({ msg: strings.err.actionFailed });
    });
}

function _getTemplateValues(formData) {
  try {
    var list = [];
    const student = formData.data.filter((q) => {
      return q.type == "student";
    });
    list.push({ key: "%STUDENT%", value: student[0].answer });
    list.push({ key: "%TEACHER%", value: formData.curTeacher.name });
    list.push({ key: "%TUTOR%", value: formData.teacher.name });
    list.push({
      key: "%DATE%",
      value: new Date(formData.lesson_date_time).toLocaleDateString("he-IL", {
        timeZone: "Asia/Jerusalem",
      }),
    });
    list.push({
      key: "%TIME%",
      value: new Date(formData.lesson_date_time).toLocaleTimeString("he-IL", {
        timeZone: "Asia/Jerusalem",
      }),
    });
    list.push({ key: "%LINK%", value: config.frontend.root });
    return list;
  } catch (err) {
    console.log(err);
    return "";
  }
}

function _createLessonReg(formData) {
  var data = {
    branch: formData.branch,
    lesson_date_time: new Date(formData.lesson_date_time),
    form_id: formData.uid,
    group: formData.group,
    groupName: formData.groupName,
    grade: formData.grade,
    data: formData.data,
    teacher: formData.teacher,
    curTeacher: formData.curTeacher,
  };
  return data;
}

export function getLessonRegInRange(req, res, jwt) {
  // check if DB properly connected
  if (!req.app.get("db_connected")) {
    return res.status(500);
  }

  const { group, branch } = req.params;
  const { from, to } = req.body;
  var fromDate = new Date(`${from}T00:00:00.000Z`);
  var toDate = new Date(`${to}T00:00:00.000Z`);

  var filter = {
    branch,
    lesson_date_time: { $gte: fromDate, $lt: toDate },
  };
  if (util.isValidValue(group)) filter["group"] = group;

  LessonRegModel.find(filter)
    .then((docs) => {
      if (docs) {
        res.status(200).json(docs);
      } else {
        res.status(400).json({ msg: strings.err.actionFailed });
      }
    })
    .catch((error) => {
      res.status(400).json({ msg: strings.err.actionFailed });
    });
}

export function deleteSingleReg(req, res, jwt) {
  // check if DB properly connected
  if (!req.app.get("db_connected")) {
    return res.status(500);
  }

  var { id } = req.params;

  var filter = {
    _id: id,
  };
  if (jwt.role !== Roles.SUPERADMIN) filter.branch = jwt.branch;

  const options = {};

  // send query
  LessonRegModel.findByIdAndDelete(id)
    .then((doc) => {
      if (!doc || doc.deleteCount == 0) {
        res.status(400).json({ msg: strings.err.actionFailed });
      } else {
        res.status(200).json({ msg: strings.ok.actionOK });
      }
    })
    .catch((err) => {
      res.status(400).json({ msg: strings.err.actionFailed });
    });
}

export function deleteAllReg(req, res, jwt) {
  // check if DB properly connected
  if (!req.app.get("db_connected")) {
    return res.status(500);
  }

  var { branch, group, datetime, email } = req.params;

  var filter = {
    branch,
    group,
    "teacher.email": email,
    lesson_date_time: datetime,
  };
  if (jwt.role !== Roles.SUPERADMIN) filter.branch = jwt.branch;

  const options = {};

  // send query
  LessonRegModel.deleteMany(filter)
    .then((doc) => {
      if (!doc || doc.deleteCount == 0) {
        res.status(400).json({ msg: strings.err.actionFailed });
      } else {
        res.status(200).json({ msg: strings.ok.actionOK });
      }
    })
    .catch((err) => {
      res.status(400).json({ msg: strings.err.actionFailed });
    });
}

export function deleteSuperAll(req, res, jwt, onlyOld) {
  // check if DB properly connected
  if (!req.app.get("db_connected")) {
    return res.status(500);
  }

  var { branch } = req.params;

  var filter = {
    branch,
  };
  if (jwt.role !== Roles.SUPERADMIN) filter.branch = jwt.branch;

  if (onlyOld) {
    filter["lesson_date_time"] = { $lt: new Date() };
  }

  // send query
  LessonRegModel.deleteMany(filter)
    .then((doc) => {
      if (!doc || doc.deleteCount == 0) {
        res.status(400).json({ msg: strings.err.actionFailed });
      } else {
        res.status(200).json({ msg: strings.ok.actionOK });
      }
    })
    .catch((err) => {
      res.status(400).json({ msg: strings.err.actionFailed });
    });
}
