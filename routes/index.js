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
      cb("riddles/" + req.params.branchCode);
    },
    key: function (req, file, cb) {
      cb(null, "riddles/" + req.params.branchCode + "/" + file.originalname);
    },
  }),
  fileFilter: function (req, file, cb) {
    awsS3.keyExists("riddles/" + req.params.branchCode, file.originalname, function (err, exists) {
      var err = exists ? { msg: "קובץ בשם זה כבר קיים " + file.originalname } : null;
      cb(err, !exists);
    });
  },
});
const storageMapS3 = multer({
  storage: multerS3({
    s3: awsS3.getS3Client(),
    bucket: "mashar",
    metadata: function (req, file, cb) {
      cb(null, { fieldName: `${req.params.uid}_${req.params.teamColor}.png` });
    },
    location: (req, file, cb) => {
      cb(`maps/${req.params.branchCode}`);
    },
    key: function (req, file, cb) {
      cb(null, `maps/${req.params.branchCode}/${req.params.uid}_${req.params.teamColor}.png`);
    },
  }),
});

/********* API ********** LOGIN / LOGOUT / REGISTER ****************************************/

router.post("/api/register", (req, res) => {
  //Err Site
  const jwt = util.validateAdminUser(req, true);
  if (!jwt.valid) return res.status(401);
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_user.registerUser(req, res, jwt.jwtUser);
});

router.post("/api/login", (req, res) => {
  api_user.loginUser(req, res);
});

router.post("/api/logout", (req, res) => {
  /*if (!util.validateAdminUser(req, false).valid) {
    res.status(401);
    return;
  }*/
  api_user.logoutUser(req, res);
});

/********* API ********** USER ACTIONS ****************************************/

/**
 * User list
 */
router.get("/api/users/:page/:branch?", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401);
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_user.getUserList(req.params.page, req, res, jwt.jwt);
});

router.delete("/api/user/:username", (req, res) => {
  const jwt = util.validateAdminUser(req, true);
  if (!jwt.valid) return res.status(401);
  if (!validateRoleAllowed(req, [Roles.SUPERADMIN])) {
    res.status(403);
    return;
  }
  api_user.deleteUser(req, res, jwt.jwt);
});

router.post("/api/user/chgpass", (req, res) => {
  const jwt = util.validateAdminUser(req, true);
  if (!jwt.valid) return res.status(401);
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_user.changePassword(req, res, jwt.jwt);
});

router.post("/api/user/role", (req, res) => {
  const jwt = util.validateAdminUser(req, true);
  if (!jwt.valid) return res.status(401);
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  const { username, role } = req.body;
  if (username === undefined || role === undefined) {
    res.status(400).json({ msg: strings.err.actionFailed });
    return;
  }
  api_user.changeRole(req, res, jwt.jwt);
});

router.post("/api/user/save", (req, res) => {
  const jwt = util.validateAdminUser(req, true);
  if (!jwt.valid) return res.status(401);
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_user.saveUser(req, res, jwt.jwt);
});

/********* API ********** GAME ACTIONS ****************************************/

/**
 * Player request to validate a vector
 */
router.get("/api/vector/:uid/:team/:index/:vectorSize/:vectorAngle", (req, res) => {
  api_game.validateVector(req, res);
});

/**
 * get game list
 */
router.post("/api/game/list/:page/:branch?", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401);
  if (!validateRoleAllowed(req, [Roles.ADMIN, Roles.TEACHER])) {
    res.status(403);
    return;
  }
  api_game.getGameList(req, res, jwt.jwt);
});

/**
 * get image list
 */
router.get("/api/game/imglist/:branchCode", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401);
  if (!validateRoleAllowed(req, [Roles.ADMIN, Roles.TEACHER])) {
    res.status(403);
    return;
  }
  api_game.getImageList(req, res, jwt.jwt);
});

/**
 * get game
 */
router.get("/api/game/:uid", (req, res) => {
  /*const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401);
  if (!validateRoleAllowed(req, [Roles.ADMIN, Roles.TEACHER])) {
    res.status(403);
    return;
  }*/
  api_game.getGame(req, res);
});

/**
 * get game
 */
router.get("/api/game/status/:uid", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401);
  if (!validateRoleAllowed(req, [Roles.ADMIN, Roles.TEACHER])) {
    res.status(403);
    return;
  }
  api_game.getGameAndStatus(req, res, jwt.jwt);
});

/**
 * start a game
 */
router.get("/api/game/start/:gameCode/:branch", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401);
  if (!validateRoleAllowed(req, [Roles.ADMIN, Roles.TEACHER])) {
    res.status(403);
    return;
  }
  api_game.startGame(req, res, jwt.jwt);
});

/**
 * start a game
 */
router.get("/api/game/stop/:gameCode/:branch", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401);
  if (!validateRoleAllowed(req, [Roles.ADMIN, Roles.TEACHER])) {
    res.status(403);
    return;
  }
  api_game.stopGame(req, res, jwt.jwt);
});

/**
 * Create a new game
 */
router.post("/api/game/create", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401);
  if (!validateRoleAllowed(req, [Roles.ADMIN, Roles.TEACHER])) {
    res.status(403);
    return;
  }
  api_game.createGame(req, res, jwt.jwt);
});

/**
 * Delete a game
 */
router.delete("/api/game/:uid/:branch?", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401);
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_game.deleteGame(req, res, jwt.jwt);
});

/**
 * Delete a game
 */
router.post("/api/game/clone", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401);
  if (!validateRoleAllowed(req, [Roles.ADMIN, Roles.TEACHER])) {
    res.status(403);
    return;
  }
  api_game.cloneGame(req, res, jwt.jwt);
});

/**
 * Save a game
 */
router.put("/api/game/:uid", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401);
  if (!validateRoleAllowed(req, [Roles.ADMIN, Roles.TEACHER])) {
    res.status(403);
    return;
  }
  api_game.saveGame(req, res, jwt.jwt);
});

/**
 * Upload map image
 */
router.post("/api/game/upmap/:uid/:branchCode/:teamColor", storageMapS3.single("file"), (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401);
  if (!validateRoleAllowed(req, [Roles.ADMIN, Roles.TEACHER])) {
    res.status(403);
    return;
  }
  api_game.uploadMap(req, res, jwt.jwt);
});

/********************** MANAGEMENT ***********************************/

router.post("/api/branch/list", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401);
  if (!validateRoleAllowed(req, [Roles.SUPERADMIN])) {
    res.status(403);
    return;
  }
  api_mng.getBranchList(req, res, jwt.jwt);
});

router.post("/api/mng/branch", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401);
  if (!validateRoleAllowed(req, [Roles.SUPERADMIN])) {
    res.status(403);
    return;
  }
  api_mng.addBranch(req, res, jwt.jwt);
});

router.delete("/api/mng/branch/:code", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401);
  if (!validateRoleAllowed(req, [Roles.SUPERADMIN])) {
    res.status(403);
    return;
  }
  api_mng.deleteBranch(req, res, jwt.jwt);
});

router.put("/api/game/gallery/:branchCode", function (req, res) {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401);
  if (!validateRoleAllowed(req, [Roles.ADMIN, Roles.TEACHER])) {
    res.status(403);
    return;
  }
  storageGalS3.single("file")(req, res, function (err) {
    api_mng.handleGallery(req, res, jwt.jwt, err);
  });
});

router.delete("/api/game/gallery/:name/:branchCode", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401);
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_mng.handleGalleryDelete(req, res, jwt.jwt);
});

router.get("/api/playlist/:page", function (req, res) {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401);
  if (!validateRoleAllowed(req, [Roles.ADMIN, Roles.TEACHER])) {
    res.status(403);
    return;
  }
  api_mng.getPlaylist(req, res, jwt.jwt);
});

router.post("/api/playlist/order", function (req, res) {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401);
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_mng.reorderPlaylist(req, res, jwt.jwt);
});

router.post("/api/playlist/add", function (req, res) {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401);
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_mng.addPlaylist(req, res, jwt.jwt);
});

router.post("/api/playlist/edit", function (req, res) {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401);
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_mng.editPlaylist(req, res, jwt.jwt);
});

router.delete("/api/playlist/:code", function (req, res) {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401);
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_mng.deletePlaylist(req, res, jwt.jwt);
});

/********* API ********** LESSONS ACTIONS ****************************************/
router.get("/api/lsn/groups/:branchCode/:page", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401);
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_lesson.getLessonGroupList(req, res, jwt.jwt);
});

router.post("/api/lsn/savelist", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401);
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_lesson.saveLessonList(req, res, jwt.jwt);
});

router.post("/api/lsn/savegroups", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401);
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_lesson.saveLessonGroups(req, res, jwt.jwt);
});

/**
 * save form
 */
router.post("/api/lsn/saveform", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401);
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_lesson.saveForm(req, res, jwt.jwt);
});

router.post("/api/lsn/groups/save/:branch", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401);
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_lesson.saveLessonGroup(req, res, jwt.jwt);
});

router.post("/api/lsn/groups/add/:branch", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401);
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_lesson.addLessonGroup(req, res, jwt.jwt);
});

router.delete("/api/lsn/groups/:branch/:gid", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401);
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_lesson.deleteLessonGroup(req, res, jwt.jwt);
});

router.get("/api/lsn/avail/:branch/:page", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401);
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_lesson.getLessonsAvailability(req, res, jwt.jwt);
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
  const jwtUser = util.validateToken(req.headers);
  if (!jwtUser) {
    return false;
  }
  return jwtUser.role == Roles.SUPERADMIN || roles.includes(jwtUser.role);
}

export default router;
