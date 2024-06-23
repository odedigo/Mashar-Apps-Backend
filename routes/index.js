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
import * as api_plan from "../controllers/api_plan.js";
import * as api_holiday from "../controllers/api_holidays.js";
import * as util from "../utils/util.js";
import { Roles } from "../db/models/UserModel.js";
import multer from "multer";
import multerS3 from "multer-s3";
import * as awsS3 from "../utils/awsS3.js";
import { config } from "dotenv"; //https://www.npmjs.com/package/dotenv
import strings from "../public/lang/strings.js";

config({ path: "./config.env" });

/**
 * Handle upload to S3
 */
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

/**
 * Register new user
 */
router.post("/api/register", (req, res) => {
  //Err Site
  const jwt = util.validateAdminUser(req, true);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_user.registerUser(req, res, jwt.jwtUser);
});

/**
 * Login
 */
router.post("/api/login", (req, res) => {
  api_user.loginUser(req, res);
});

router.post("/api/logout", (req, res) => {
  /*if (!util.validateAdminUser(req, false).valid) {
    res.status(401).send()
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
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_user.getUserList(req.params.page, req, res, jwt.jwt);
});

/**
 * Get user by username and branch
 */
router.get("/api/userbyusername/:branch/:username", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN, Roles.TEACHER])) {
    res.status(403);
    return;
  }
  api_user.getUserByUsername(req, res, jwt.jwt);
});

/**
 * User list by lesson group
 */
router.get("/api/usersbygroup/:branch/:group", (req, res) => {
  api_user.getUserListByGroup(req, res);
});

/**
 * User list by teachers (isTeacher) by branch
 */
router.get("/api/usersbybranch/:branch", (req, res) => {
  api_user.getUserListByBranch(req, res);
});

/**
 * Delete user
 */
router.delete("/api/user/:username", (req, res) => {
  const jwt = util.validateAdminUser(req, true);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.SUPERADMIN])) {
    res.status(403);
    return;
  }
  api_user.deleteUser(req, res, jwt.jwt);
});

/**
 * Change user password
 */
router.post("/api/user/chgpass", (req, res) => {
  const jwt = util.validateAdminUser(req, true);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_user.changePassword(req, res, jwt.jwt);
});

/**
 * Change user role
 */
router.post("/api/user/role", (req, res) => {
  const jwt = util.validateAdminUser(req, true);
  if (!jwt.valid) return res.status(401).send();
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

/**
 * Save user (edit)
 */
router.post("/api/user/save", (req, res) => {
  const jwt = util.validateAdminUser(req, true);
  if (!jwt.valid) return res.status(401).send();
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
  if (!jwt.valid) return res.status(401).send();
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
  if (!jwt.valid) return res.status(401).send();
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
  if (!jwt.valid) return res.status(401).send()
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
  if (!jwt.valid) return res.status(401).send();
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
  if (!jwt.valid) return res.status(401).send();
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
  if (!jwt.valid) return res.status(401).send();
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
  if (!jwt.valid) return res.status(401).send();
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
  if (!jwt.valid) return res.status(401).send();
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
  if (!jwt.valid) return res.status(401).send();
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
  if (!jwt.valid) return res.status(401).send();
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
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN, Roles.TEACHER])) {
    res.status(403);
    return;
  }
  api_game.uploadMap(req, res, jwt.jwt);
});

/********************** MANAGEMENT ***********************************/

/**
 * Get branch list
 */
router.post("/api/branch/list", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.SUPERADMIN])) {
    res.status(403);
    return;
  }
  api_mng.getBranchList(req, res, jwt.jwt);
});

/**
 * Add branch
 */
router.post("/api/mng/branch", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.SUPERADMIN])) {
    res.status(403);
    return;
  }
  api_mng.addBranch(req, res, jwt.jwt);
});

/**
 * Delete branch
 */
router.delete("/api/mng/branch/:code", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.SUPERADMIN])) {
    res.status(403);
    return;
  }
  api_mng.deleteBranch(req, res, jwt.jwt);
});

/**
 * Upload gallery image
 */
router.put("/api/game/gallery/:branchCode", function (req, res) {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN, Roles.TEACHER])) {
    res.status(403);
    return;
  }
  storageGalS3.single("file")(req, res, function (err) {
    api_mng.handleGallery(req, res, jwt.jwt, err);
  });
});

/**
 * Delete gallary image
 */
router.delete("/api/game/gallery/:name/:branchCode", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_mng.handleGalleryDelete(req, res, jwt.jwt);
});

//////// Schools

/**
 * Get list if schools
 */
router.get("/api/mng/sch/list/:branch", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN, Roles.TEACHER])) {
    res.status(403);
    return;
  }
  api_mng.getSchoolList(req, res, jwt.jwt);
});

/**
 * Get specific school
 */
router.get("/api/mng/sch/single/:branch/:id", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN, Roles.TEACHER])) {
    res.status(403);
    return;
  }
  api_mng.getSchool(req, res, jwt.jwt);
});

/**
 * add school
 */
router.put("/api/mng/sch/:branch", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_mng.addSchool(req, res, jwt.jwt);
});

/**
 * delete school
 */
router.delete("/api/mng/sch/:branch/:id", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_mng.deleteSchool(req, res, jwt.jwt);
});

/**
 * update School
 */
router.post("/api/mng/sch/:branch/:id", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_mng.updateSchool(req, res, jwt.jwt);
});

/*********API ********************* PLANNING AND CLASS ********************/
/**
 * Get list if classes
 */
router.get("/api/pln/cls/list/:branch/:teacher", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN, Roles.TEACHER])) {
    res.status(403);
    return;
  }
  api_plan.getClassList(req, res, jwt.jwt);
});

/**
 * Get specific class
 */
router.get("/api/pln/cls/single/:branch/:id", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN, Roles.TEACHER])) {
    res.status(403);
    return;
  }
  api_plan.getClass(req, res, jwt.jwt);
});

/**
 * add class
 */
router.put("/api/pln/cls/:branch", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_plan.addClass(req, res, jwt.jwt);
});

/**
 * delete class
 */
router.delete("/api/pln/cls/:branch/:id", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_plan.deleteClass(req, res, jwt.jwt);
});

/**
 * update class
 */
router.post("/api/pln/cls/:branch/:id", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_plan.updateClass(req, res, jwt.jwt);
});
/********* API ********** PLAYLIST ****************************************/

/**
 * Get playlists
 */
router.get("/api/playlist/:page", function (req, res) {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN, Roles.TEACHER])) {
    res.status(403);
    return;
  }
  api_mng.getPlaylist(req, res, jwt.jwt);
});

/**
 * Reorder playlists
 */
router.post("/api/playlist/order", function (req, res) {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_mng.reorderPlaylist(req, res, jwt.jwt);
});

/**
 * Add playlist
 */
router.post("/api/playlist/add", function (req, res) {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_mng.addPlaylist(req, res, jwt.jwt);
});

/**
 * Update details of a playlit
 */
router.post("/api/playlist/edit", function (req, res) {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_mng.editPlaylist(req, res, jwt.jwt);
});

/**
 * Delete a playlist
 */
router.delete("/api/playlist/:code", function (req, res) {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_mng.deletePlaylist(req, res, jwt.jwt);
});

/********* API ********** LESSONS GROUPS ****************************************/
/**
 * Gets the list of lesson groups
 */
router.get("/api/lsn/groups/:branchCode/:page", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_lesson.getLessonGroupList(req, res, jwt.jwt);
});

/**
 * Save lesson list for a specific user
 */
router.post("/api/lsn/savelist", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_lesson.saveLessonList(req, res, jwt.jwt);
});

router.post("/api/lsn/savegroups", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_lesson.saveLessonGroups(req, res, jwt.jwt);
});

/**
 * save form
 */
router.post("/api/lsn/groups/save/:branch", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_lesson.saveLessonGroup(req, res, jwt.jwt);
});

router.post("/api/lsn/groups/add/:branch", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_lesson.addLessonGroup(req, res, jwt.jwt);
});

router.delete("/api/lsn/groups/:branch/:gid", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_lesson.deleteLessonGroup(req, res, jwt.jwt);
});

router.get("/api/lsn/avail/:branch/:teacher/:page", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_lesson.getLessonsAvailabilitySingle(req, res, jwt.jwt);
});

router.put("/api/lsn/avail", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_user.setLessonsAvailabilitySingle(req, res, jwt.jwt);
});

/********************** LESSON FORMS ****************************************/

/**
 * Returns a list of forms for this branch
 * If id is specified, only one will be returned.
 * This API does not require login as it is used by students
 */
router.get("/api/lsn/form/:branch/:id?", (req, res) => {
  api_lesson.getForms(req, res);
});

/**
 * Register lesson request by a student
 * This API does not require login as it is used by students
 */
router.put("/api/lsn/reg/:branch", (req, res) => {
  api_lesson.registerLesson(req, res);
});

/**
 * Clone an existing form
 */
router.post("/api/lsn/reglist/:branch/:group?", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN, Roles.TEACHER])) {
    res.status(403);
    return;
  }
  api_lesson.getLessonRegInRange(req, res, jwt.jwt);
});

/**
 * Clone an existing form
 */
router.get("/api/lsn/form/clone/:branch/:id", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_lesson.cloneForm(req, res, jwt.jwt);
});

/**
 * Delete a given form
 */
router.delete("/api/lsn/form/:branch/:id", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_lesson.deleteForm(req, res, jwt.jwt);
});

/**
 * add a new form
 */
router.put("/api/lsn/form/:branch", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_lesson.addForm(req, res, jwt.jwt);
});

/**
 * update details of an existing form
 */
router.post("/api/lsn/form/:branch/:id", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_lesson.updateFormDetails(req, res, jwt.jwt);
});

/**
 * Saves an existing form (edit)
 */
router.put("/api/lsn/form/save/:branch/:id", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_lesson.saveForm(req, res, jwt.jwt);
});

/**
 * Delete a specific registration
 */
router.delete("/api/lsn/reg/single/:id", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN, Roles.TEACHER])) {
    res.status(403);
    return;
  }
  api_lesson.deleteSingleReg(req, res, jwt.jwt);
});

/**
 * Delete all registrations for a specific date and group
 */
router.delete("/api/lsn/reg/all/:branch/:group/:datetime/:email", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN, Roles.TEACHER])) {
    res.status(403);
    return;
  }
  api_lesson.deleteAllReg(req, res, jwt.jwt);
});

/**
 * Delete old registrations
 */
router.delete("/api/lsn/reg/superold/:branch", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [])) {
    res.status(403);
    return;
  }
  api_lesson.deleteSuperAll(req, res, jwt.jwt, true);
});

/**
 * Delete old registrations
 */
router.delete("/api/lsn/reg/superall/:branch", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [])) {
    res.status(403);
    return;
  }
  api_lesson.deleteSuperAll(req, res, jwt.jwt, false);
});

/********************** API HOLIDAYS ****************************************/
/**
 * Get list if holiday calendars
 */
router.get("/api/mng/cal/list/:branch", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN, Roles.TEACHER])) {
    res.status(403);
    return;
  }
  api_holiday.getHolidayCalendars(req, res, jwt.jwt);
});

/**
 * Get specific holiday calendar
 */
router.get("/api/mng/cal/single/:branch/:id", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN, Roles.TEACHER])) {
    res.status(403);
    return;
  }
  api_holiday.getHolidayCalendar(req, res, jwt.jwt);
});

/**
 * add  holiday calendars
 */
router.put("/api/mng/cal/:branch", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_holiday.addHolidayCalendar(req, res, jwt.jwt);
});

/**
 * clone holiday calendar
 */
router.post("/api/mng/cal/clone/:branch", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_holiday.cloneHolidayCalendar(req, res, jwt.jwt);
});

/**
 * delete  holiday calendars
 */
router.delete("/api/mng/cal/:branch/:id", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_holiday.deleteHolidayCalendar(req, res, jwt.jwt);
});

/**
 * update  holiday calendars
 */
router.post("/api/mng/cal/:branch/:id", (req, res) => {
  const jwt = util.validateAdminUser(req, false);
  if (!jwt.valid) return res.status(401).send();
  if (!validateRoleAllowed(req, [Roles.ADMIN])) {
    res.status(403);
    return;
  }
  api_holiday.updateHolidayCalendar(req, res, jwt.jwt);
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
