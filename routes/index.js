/**
 * --------------------------
 * Treasure Hunt Application
 * --------------------------
 *
 * @desc The main router
 *
 * Org: Mashar / Kfar-Sava
 * By: Oded Cnaan
 * Date: March 2024
 */
"use strict";
//================ IMPORTS =================
import { Router } from "express";
const router = Router();
import * as api_user from "../controllers/api_user.js";
import * as api_game from "../controllers/api_game.js";
import * as api_mng from "../controllers/api_mng.js";
import * as api_lesson from "../controllers/api_lesson.js";
import * as util from "../utils/util.js";
import { Roles } from "../db/models/UserModel.js";
import multer from "multer";
import multerS3 from "multer-s3";
import * as awsS3 from "../utils/awsS3.js";
import { config } from "dotenv"; //https://www.npmjs.com/package/dotenv
import strings from "../public/lang/strings.js";

config({ path: "./config.env" });

const storageGalS3 = multer({
  storage: multerS3({
    s3: awsS3.getS3Client(),
    bucket: "mashar",
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.originalname });
    },
    location: (req, file, cb) => {
      cb("riddles/" + req.headers["x-branch-code"]);
    },
    key: function (req, file, cb) {
      cb(null, "riddles/" + req.headers["x-branch-code"] + "/" + file.originalname);
    },
  }),
  fileFilter: function (req, file, cb) {
    awsS3.keyExists("riddles/" + req.headers["x-branch-code"], file.originalname, function (err, exists) {
      var err = exists ? { msg: "קובץ השם זה כבר קיים " + file.originalname } : null;
      cb(err, !exists);
    });
  },
});
const storageMapS3 = multer({
  storage: multerS3({
    s3: awsS3.getS3Client(),
    bucket: "mashar",
    metadata: function (req, file, cb) {
      cb(null, { fieldName: req.headers["x-path-name"] });
    },
    location: (req, file, cb) => {
      cb("maps/" + req.headers["x-branch-code"]);
    },
    key: function (req, file, cb) {
      cb(null, "maps/" + req.headers["x-branch-code"] + "/" + req.headers["x-path-name"]);
    },
  }),
});

/********* API ********** LOGIN / LOGOUT / REGISTER ****************************************/

router.post("/api/register", (req, res) => {
  //Err Site
  const jwt = util.validateAdminUser(req, true);
  if (!jwt.valid || !validateRoleAllowed(req, [Roles.ADMIN])) {
    res.redirect("/err");
    return;
  }
  api_user.registerUser(req, res, jwt.jwtUser);
});

router.post("/api/login", (req, res) => {
  api_user.loginUser(req, res);
});

router.post("/api/logout", (req, res) => {
  if (!util.validateAdminUser(req, false).valid) {
    res.redirect("/err");
    return;
  }
  api_user.logoutUser(req, res);
});

/********* API ********** USER ACTIONS ****************************************/

router.post("/api/user/del", (req, res) => {
  const jwt = util.validateAdminUser(req, true);
  if (!jwt.valid || !validateRoleAllowed(req, [Roles.SUPERADMIN])) {
    res.redirect("/err");
    return;
  }
  if (req.body.username === undefined) {
    res.status(400).json({ msg: strings.err.usernameNotEmail });
    return;
  }
  api_user.deleteUser(req, res, jwt.jwtUser);
});

router.post("/api/user/chgpass", (req, res) => {
  const jwt = util.validateAdminUser(req, true);
  if (!jwt.valid || !validateRoleAllowed(req, [Roles.ADMIN])) {
    res.redirect("/err");
    return;
  }
  api_user.changePassword(req, res, jwt.jwtUser);
});

router.post("/api/user/role", (req, res) => {
  const jwt = util.validateAdminUser(req, true);
  if (!jwt.valid || !validateRoleAllowed(req, [Roles.ADMIN])) {
    res.redirect("/err");
    return;
  }
  const { username, role } = req.body;
  if (username === undefined || role === undefined) {
    res.status(400).json({ msg: strings.err.actionFailed });
    return;
  }
  api_user.changeRole(req, res, jwt.jwtUser);
});

router.post("/api/user/edit", (req, res) => {
  const jwt = util.validateAdminUser(req, true);
  if (!jwt.valid || !validateRoleAllowed(req, [Roles.ADMIN])) {
    res.redirect("/err");
    return;
  }
  api_user.editUser(req, res, jwt.jwtUser);
});

/********* API ********** GAME ACTIONS ****************************************/

/**
 * Player request to validate a vector
 */
router.post("/api/vector", (req, res) => {
  api_game.validateVector(req, res);
});

/**
 * get game list
 */
router.post("/api/game/list", (req, res) => {
  const jwt = util.validateAdminUser(req, true);
  if (!jwt.valid || !validateRoleAllowed(req, [Roles.ADMIN, Roles.TEACHER])) {
    res.status(400).json({ msg: strings.err.actionFailed });
    return;
  }
  api_game.getGameList(req, res, jwt.jwtUser);
});

/**
 * reset a game
 */
router.post("/api/game/edit", (req, res) => {
  const jwt = util.validateAdminUser(req, true);
  if (!jwt.valid || !validateRoleAllowed(req, [Roles.ADMIN, Roles.TEACHER])) {
    res.status(400).json({ msg: strings.err.actionFailed });
    return;
  }
  api_game.editGame(req, res, jwt.jwtUser);
});

/**
 * start a game
 */
router.post("/api/game/start", (req, res) => {
  const jwt = util.validateAdminUser(req, true);
  if (!jwt.valid || !validateRoleAllowed(req, [Roles.ADMIN, Roles.TEACHER])) {
    res.status(400).json({ msg: strings.err.actionFailed });
    return;
  }
  api_game.startGame(req, res, jwt.jwtUser);
});

/**
 * start a game
 */
router.post("/api/game/stop", (req, res) => {
  const jwt = util.validateAdminUser(req, true);
  if (!jwt.valid || !validateRoleAllowed(req, [Roles.ADMIN, Roles.TEACHER])) {
    res.status(400).json({ msg: strings.err.actionFailed });
    return;
  }
  api_game.stopGame(req, res, jwt.jwtUser);
});

/**
 * Create a new game
 */
router.post("/api/game/create", (req, res) => {
  const jwt = util.validateAdminUser(req, true);
  if (!jwt.valid || !validateRoleAllowed(req, [Roles.ADMIN, Roles.TEACHER])) {
    res.status(400).json({ msg: strings.err.actionFailed });
    return;
  }
  api_game.createGame(req, res, jwt.jwtUser);
});

/**
 * Delete a game
 */
router.post("/api/game/remove", (req, res) => {
  const jwt = util.validateAdminUser(req, true);
  if (!jwt.valid || !validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(400).json({ msg: strings.err.actionFailed });
    return;
  }
  api_game.deleteGame(req, res, jwt.jwtUser);
});

/**
 * Delete a game
 */
router.post("/api/game/clone", (req, res) => {
  const jwt = util.validateAdminUser(req, true);
  if (!jwt.valid || !validateRoleAllowed(req, [Roles.ADMIN, Roles.TEACHER])) {
    res.status(400).json({ msg: strings.err.actionFailed });
    return;
  }
  api_game.cloneGame(req, res, jwt.jwtUser);
});

/**
 * Save a game
 */
router.post("/api/game/save", (req, res) => {
  const jwt = util.validateAdminUser(req, true);
  if (!jwt.valid || !validateRoleAllowed(req, [Roles.ADMIN, Roles.TEACHER])) {
    res.status(400).json({ msg: strings.err.actionFailed });
    return;
  }
  api_game.saveGame(req, res, jwt.jwtUser);
});

/**
 * Upload map image
 */
router.post("/api/game/upmap", storageMapS3.single("file"), (req, res) => {
  const jwt = util.validateAdminUser(req, true);
  if (!jwt.valid || !validateRoleAllowed(req, [Roles.ADMIN, Roles.TEACHER])) {
    res.status(400).json({ msg: strings.err.actionFailed });
    return;
  }
  api_game.uploadMap(req, res, jwt.jwtUser);
});

/********************** MANAGEMENT ***********************************/
router.post("/api/mng/brnch", (req, res) => {
  const jwt = util.validateAdminUser(req, true);
  if (!jwt.valid || !validateRoleAllowed(req, [Roles.SUPERADMIN])) {
    res.status(400).json({ msg: strings.err.actionFailed });
    return;
  }
  api_mng.handleBranch(req, res, jwt.jwtUser);
});

router.post("/api/mng/gal", function (req, res) {
  const jwt = util.validateAdminUser(req, true);
  if (!jwt.valid || !validateRoleAllowed(req, [Roles.TEACHER, Roles.ADMIN])) {
    res.status(400).json({ msg: strings.err.actionFailed });
    return;
  }
  storageGalS3.single("file")(req, res, function (err) {
    api_mng.handleGallery(req, res, jwt.jwtUser, err);
  });
});

router.post("/api/mng/galdel", (req, res) => {
  const jwt = util.validateAdminUser(req, true);
  if (!jwt.valid || !validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(400).json({ msg: strings.err.actionFailed });
    return;
  }
  api_mng.handleGalleryDelete(req, res, jwt.jwtUser);
});

/********* API ********** LESSONS ACTIONS ****************************************/
router.post("/api/lsn/savelist", (req, res) => {
  const jwt = util.validateAdminUser(req, true);
  if (!jwt.valid || !validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(400).json({ msg: strings.err.actionFailed });
    return;
  }
  api_lesson.saveLessonList(req, res, jwt.jwtUser);
});

router.post("/api/lsn/savegroups", (req, res) => {
  const jwt = util.validateAdminUser(req, true);
  if (!jwt.valid || !validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(400).json({ msg: strings.err.actionFailed });
    return;
  }
  api_lesson.saveLessonGroups(req, res, jwt.jwtUser);
});

/**
 * edit form
 */
router.post("/api/lsn/formedit", (req, res) => {
  const jwt = util.validateAdminUser(req, true);
  if (!jwt.valid || !validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(400).json({ msg: strings.err.actionFailed });
    return;
  }
  api_lesson.editForm(req, res, jwt.jwtUser);
});

/**
 * save form
 */
router.post("/api/lsn/saveform", (req, res) => {
  const jwt = util.validateAdminUser(req, true);
  if (!jwt.valid || !validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(400).json({ msg: strings.err.actionFailed });
    return;
  }
  api_lesson.saveForm(req, res, jwt.jwtUser);
});

/********************** TOOLS ****************************************/

/**
 * Checks that the current user has the right to perform the action
 * by his role
 *
 * @param {*} req
 * @param {*} roles
 * @returns
 */
export function validateRoleAllowed(req, roles) {
  const jwtUser = util.validateToken(req.headers.cookie);
  if (!jwtUser) {
    return false;
  }
  return jwtUser.role == Roles.SUPERADMIN || roles.includes(jwtUser.role);
}

export default router;
