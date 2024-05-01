/**
 * --------------------------
 * Treasure Hunt Application
 * --------------------------
 *
 * @desc Controller for the student's game
 *
 * Org: Mashar / Kfar-Sava
 * By: Oded Cnaan
 * Date: March 2024
 */
"use strict";
//================ IMPORTS =================
import strings from "../public/lang/strings.js";
import * as util from "../utils/util.js";
import { UserModel, Roles } from "../db/models/UserModel.js";
import bcrypt from "bcrypt";
import config from "../config/config.js";

/**
 * Logout
 * @param {*} req
 * @param {*} res
 */
export async function logoutUser(req, res) {
  res.cookie("cred", "", { maxAge: 9000000000, httpOnly: true, secure: true });
  res.redirect("/");
}

/**
 * Login
 * @param {*} req
 * @param {*} res
 */
export async function loginUser(req, res) {
  // Find relevant document in DB that describes the game
  var { username, password } = req.body;
  username = username.toLowerCase();

  var query = {
    username,
  };

  // Async Query
  await UserModel.findOne(query)
    .then((user) => {
      if (user) {
        bcrypt.compare(password, user.password).then(async function (result) {
          if (result) {
            const token = await util.getOneTimeToken(user);
            res.status(200).json({ token });
          } else {
            res.status(400).json({ msg: strings.err.invalidUserPass, redirect: "/login", name: user.name, branch: user.branch });
          }
        });
      } else {
        res.status(400).json({ msg: strings.err.invalidUserPass, redirect: "/login" });
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ success: false, msg: strings.err.userNotFound, redirect: "/login" });
    });
}

export async function registerUser(req, res, jwt) {
  // check if DB properly connected
  if (!req.app.get("db_connected")) {
    return res.status(500);
  }

  // Find relevant document in DB that describes the game
  var { username, password, name, branch, role, email } = req.body;

  if (!util.isValidValue(username) || !util.isValidValue(password) || !util.isValidValue(name) || !util.isValidValue(branch) || !util.isValidValue(role)) {
    return res.status(400).json({ msg: strings.err.formFillAll });
  }
  username = username.toLowerCase();

  if (role === Roles.SUPERADMIN && jwt.role !== Roles.SUPERADMIN) {
    return res.status(400).json({ msg: strings.err.actionErr });
  }

  if (!util.validateEmail(username)) {
    return res.status(400).json({ msg: strings.err.usernameNotEmail });
  }
  if (!util.isValidValue(email)) {
    email = username;
  } else if (!util.validateEmail(email)) {
    return res.status(400).json({ msg: strings.err.emailNotEmail });
  }

  if (password.length < 6) {
    return res.status(400).json({ msg: strings.err.passNotLong });
  }

  await UserModel.findOne({
    username,
  })
    .then((user) => {
      if (user) {
        res.status(400).json({ msg: strings.err.usernameTaken });
        return;
      }
      bcrypt.hash(password, 10).then(async (hash) => {
        await UserModel.create({
          username,
          password: hash,
          name,
          email: email.toLowerCase(),
          branch: util.branchToCode(branch),
          role,
          token: "",
          created: util.getCurrentDateTime(),
        })
          .then((user) => res.status(200).json({ msg: strings.ok.userRegOK }))
          .catch((error) => res.status(400).json({ msg: strings.err.userRegErr }));
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(400).json({ msg: strings.err.userRegErr });
    });
}

export async function getUserList(param, jwt, perPage, forceBranch = null) {
  const numPerPage = perPage;
  var page = param;
  if (!util.isValidValue(page)) page = 1;
  var filter = {};
  if (jwt.role !== Roles.SUPERADMIN) filter["branch"] = jwt.branch;
  else if (util.isValidValue(forceBranch)) {
    filter["branch"] = forceBranch;
  }
  const users = await UserModel.find(filter)
    .limit(numPerPage)
    .skip(numPerPage * (page - 1))
    .sort({ branch: "desc", name: "asc" });
  var numUsers = await UserModel.countDocuments(filter);
  if (users == null) users = [];
  return { users, numUsers };
}

export async function countUsers(branch) {
  var filter = {};
  if (util.isValidValue(branch)) {
    filter["branch"] = branch;
  }
  const users = await UserModel.find(filter);
  var branchUsers = [];
  users.forEach((user) => {
    if (branchUsers[user.branch] !== undefined) branchUsers[user.branch]++;
    else branchUsers[user.branch] = 1;
  });
  return branchUsers;
}

export function createUserList(users) {
  var res = [];
  if (users == null) return res;
  users.forEach((user) => {
    var dt = util.getDateIL(user.created);
    var lsns = [];
    user.lessons.forEach((group) => {
      var grp = {};
      grp.group = group.group;
      grp.timing = [];
      group.timing.forEach((ls) => {
        grp.timing.push({ weekday: ls.weekday, time: ls.time, duration: ls.duration });
      });
      lsns.push(grp);
    });
    res.push({ name: user.name, branchName: util.codeToBranch(user.branch), branch: user.branch, email: user.email, username: user.username.toLowerCase(), role: user.role, created: dt, lessons: lsns });
  });
  return res;
}

export function deleteUser(req, res) {
  var { username } = req.body;

  if (username === undefined) {
    res.status(400).json({ msg: strings.err.usernameInvalid });
    return;
  }
  username = username.toLowerCase();

  UserModel.deleteOne({ username })
    .then((resp) => {
      res.status(200).json({ msg: strings.ok.userDeleteOK });
    })
    .catch((err) => {
      console.log(err);
      res.status(500);
    });
}

export async function changePassword(req, res) {
  var { username, password } = req.body;
  if (username === undefined || password === undefined) {
    res.status(400).json({ msg: strings.err.invalidData });
    return;
  }
  if (!util.validateEmail(username)) {
    return res.status(400).json({ msg: strings.err.usernameNotEmail });
  }
  username = username.toLowerCase();

  if (password.length < 6) {
    return res.status(400).json({ msg: strings.err.passNotLong });
  }

  var filter = {
    username,
  };

  const options = {
    upsert: true,
    returnOriginal: false,
  };

  bcrypt.hash(password, 10).then(async (hash) => {
    await UserModel.findOneAndUpdate(filter, { $set: { password: hash } }, options)
      .then((user) => {
        if (!user) {
          res.status(400).json({ msg: strings.err.failedUpdatingUser });
          return;
        }
        res.status(200).json({ msg: strings.ok.passUpdatedOK });
      })
      .catch((err) => {
        console.log(err);
        res.status(400).json({ msg: strings.err.passUpdateErr });
      });
  });
}

export function changeRole(req, res) {
  var { username, role } = req.body;

  if (username === undefined || role === undefined) {
    res.status(400).json({ msg: strings.err.invalidData });
    return;
  }
  if (!util.validateEmail(username)) {
    return res.status(400).json({ msg: strings.err.usernameInvalid });
  }

  var filter = {
    username: username.toLowerCase(),
  };

  const options = {
    upsert: true,
    returnOriginal: false,
  };

  UserModel.findOneAndUpdate(filter, { $set: { role: role } }, options)
    .then((user) => {
      if (!user) {
        res.status(400).json({ msg: strings.err.failedUpdatingUser });
        return;
      }
      res.status(200).json({ msg: strings.ok.roleUpdateOK });
    })
    .catch((err) => {
      console.log(err);
      res.status(400).json({ msg: strings.err.roleUpdateErr });
    });
}

export function saveUser(req, res, jwt) {
  var { username, role, email } = req.body;

  if (!util.isValidValue(username) || !util.isValidValue(role) || !util.isValidValue(email)) {
    res.status(400).json({ msg: strings.err.invalidData });
    return;
  }
  if (!util.validateEmail(username)) {
    return res.status(400).json({ msg: strings.err.usernameInvalid });
  }
  if (!util.validateEmail(email)) {
    return res.status(400).json({ msg: strings.err.emailNotEmail });
  }

  var filter = {
    username: username.trim().toLowerCase(),
  };

  const options = {
    upsert: true,
    returnOriginal: false,
  };

  UserModel.findOneAndUpdate(filter, { $set: { role: role, email: email.trim().toLowerCase() } }, options)
    .then((user) => {
      if (!user) {
        res.status(400).json({ msg: strings.err.failedUpdatingUser });
        return;
      }
      res.status(200).json({ msg: strings.ok.userUpdateOK });
    })
    .catch((err) => {
      console.log(err);
      res.status(400).json({ msg: strings.err.userUpdateErr });
    });
}
