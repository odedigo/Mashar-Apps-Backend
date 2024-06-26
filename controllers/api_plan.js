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
import { Roles, UserModel } from "../db/models/UserModel.js";
import { SchoolModel } from "../db/models/SchoolModel.js";
import { ClassModel } from "../db/models/ClassModel.js";
import { HolidayModel } from "../db/models/HolidayModel.js";
import { mongoose, model, ObjectId, Types } from "mongoose";
import * as util from "../utils/util.js";
import xlsx from "node-xlsx";

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
    .then((theCls) => {
      if (!theCls) {
        res.status(400).json({ msg: strings.err.actionFailed });
      } else {
        res.status(200).json(theCls);
      }
    })
    .catch((error) => {
      console.log(error);
      res.status(400).json({ msg: strings.err.actionFailed });
    });
}

/**
 * Get a specific class plan
 * @param {*} req
 * @param {*} res
 * @param {*} jwt
 */
export function getClassPlan(req, res, jwt) {
  var { branch, id } = req.params;

  if (jwt.role !== Roles.SUPERADMIN) branch = jwt.branch;

  var filter = {
    branch,
    _id: id,
  };

  ClassModel.findOne(filter)
    .then((classModel) => {
      if (!classModel) {
        res.status(400).json({ msg: strings.err.actionFailed });
      } else {
        var list = [];
        classModel.school.forEach((s) => {
          list.push(s);
        });

        var filter = {
          branch: classModel.branch,
          _id: { $in: list },
        };

        SchoolModel.find(filter)
          .then((schools) => {
            if (!schools) {
              res.status(400).json({ msg: strings.err.actionFailed });
              return;
            }
            var filter = {
              branch: classModel.branch,
              _id: schools[0].holidayId,
            };
            HolidayModel.findOne(filter)
              .then((holiday) => {
                if (!holiday) {
                  res.status(400).json({ msg: strings.err.actionFailed });
                  return;
                }
                // ALL OK
                var clsModel = classModel.toObject();
                //delete clsModel.students;

                res.status(200).json({ classModel: clsModel, schools, holiday });
              })
              .catch((errHol) => {
                res.status(400).json({ msg: strings.err.actionFailed });
              });
          })
          .catch((errSchool) => {
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
 * Get a specific class with info
 * @param {*} req
 * @param {*} res
 * @param {*} jwt
 */
export function getClassInfo(req, res, jwt) {
  var { branch, id } = req.params;

  if (jwt.role !== Roles.SUPERADMIN) branch = jwt.branch;

  var filter = {
    branch,
    _id: id,
  };

  ClassModel.findOne(filter)
    .then((classModel) => {
      if (!classModel) {
        res.status(400).json({ msg: strings.err.actionFailed });
      } else {
        var list = [];
        classModel.school.forEach((s) => {
          list.push(s);
        });

        var filter = {
          branch: classModel.branch,
        };

        SchoolModel.find(filter)
          .then((schools) => {
            if (!schools) {
              res.status(400).json({ msg: strings.err.actionFailed });
              return;
            }
            var filter = {
              branch: classModel.branch,
              username: classModel.teacher,
            };
            UserModel.findOne(filter)
              .then((teach) => {
                if (!teach) {
                  res.status(400).json({ msg: strings.err.actionFailed });
                  return;
                }
                // ALL OK
                var clsModel = classModel.toObject();
                var teacher = {
                  username: teach.username,
                  name: teach.name,
                  email: teach.email,
                };

                res.status(200).json({ classModel: clsModel, schools, teacher });
              })
              .catch((errHol) => {
                res.status(400).json({ msg: strings.err.actionFailed });
              });
          })
          .catch((errSchool) => {
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
  var _id = id; //new mongoose.Types.ObjectId(id);
  var cls = req.body;

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

  cls.examEvents.forEach((e) => {
    //if (e.isPrivate && e.ref == "") e.ref = e._id;
    delete e._id;
  });
  cls.students.forEach((st) => {
    delete st._id;
    st.evaluation.forEach((e) => delete e._id);
  });
  cls.plan.forEach((p) => {
    delete p._id;
  });

  var data = {};
  for (const [key, value] of Object.entries(cls)) {
    if (key !== "_id" && key !== "__v" && key !== "version") data[key] = value;
  }

  const update = {
    $set: data,
    //{ branch, name: cls.name, examEvents: cls.examEvents, year: cls.year, teacher: cls.teacher, school: cls.school, grade: cls.grade, comments: cls.comments, lessons: cls.lessons, plan: cls.plan, students: cls.students },
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
      console.log(err);
      res.status(400).json({ msg: strings.err.actionFailed });
    });
}

/**
 * Update an existing holiday calendar
 * @param {*} req
 * @param {*} res
 * @param {*} jwt
 */
export function updateClassStudent(req, res, jwt) {
  var { id, branch } = req.params;
  var _id = id; //new mongoose.Types.ObjectId(id);
  var student = req.body;

  var filter = {
    _id,
    branch,
    "students._id": student._id,
  };

  if (jwt.role !== Roles.SUPERADMIN) filter.branch = jwt.branch;

  const options = {
    upsert: true,
    returnOriginal: false,
    new: true,
  };

  delete student._id;
  student.evaluation.forEach((e) => delete e._id);

  var data = {};
  for (const [key, value] of Object.entries(student)) {
    let k = `students.$.${key}`;
    if (key !== "_id" && key !== "__v" && key !== "version") data[k] = value;
  }

  const update = {
    $set: data,
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
      console.log(err);
      res.status(400).json({ msg: strings.err.actionFailed });
    });
}

export function importStudents(req, res, jwt) {
  const file = req.file;
  const { school, clsid } = req.body;
  const branch = req.params.branch;

  if (!util.isValidValue(file)) {
    res.status(200).status({ msg: strings.err.actionFailed });
    return;
  }
  let data = xlsx.parse(file.buffer);
  // Data should have a single array item with all the data (one sheet)
  if (!util.isValidValue(data) || data.length !== 1 || !util.isValidValue(data[0].data)) {
    res.status(200).status({ msg: strings.err.actionFailed });
    return;
  }

  var excel = data[0].data;
  var headers = excel[2];

  var students = [];
  for (let row = 3; row < excel.length - 5; row++) {
    var stud = _createStudentFroExcel(excel[row], school);
    students.push(stud);
  }

  var filter = {
    _id: clsid,
    branch,
  };

  if (jwt.role !== Roles.SUPERADMIN) filter.branch = jwt.branch;

  const options = {
    upsert: true,
    returnOriginal: false,
    new: true,
  };

  const update = {
    $push: { students },
  };

  // send query
  ClassModel.findOneAndUpdate(filter, update, options)
    .then((doc) => {
      if (!doc) {
        res.status(400).json({ msg: strings.err.actionFailed });
      } else {
        console.log(doc.students.length);
        res.status(200).json({ msg: strings.ok.actionOK });
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(400).json({ msg: strings.err.actionFailed });
    });
}

function _createStudentFroExcel(rowData, school) {
  var mapping = {
    name: 2,
    gender: 3,
    classNum: 5,
    majors: 20,
  };

  var st = {
    name: rowData[mapping.name],
    gender: rowData[mapping.gender] == "ז" ? "m" : "f",
    classNum: rowData[mapping.classNum],
    majors: rowData[mapping.majors],
    status: "פעיל",
    school,
    benefits: "",
    comments: "יובא ממשוב",
    evaluation: [],
    finals: [],
  };
  return st;
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
    examEvents: cls.examEvents,
  };
  return newCls;
}
