/**
 * --------------------------
 * Treasure Hunt Application
 * --------------------------
 *
 * @desc Utilities
 *
 * Org: Mashar / Kfar-Sava
 * By: Oded Cnaan
 * Date: March 2024
 */
import emailValidator from "email-validator";
import jwt from "jsonwebtoken";
import { Roles } from "../db/models/UserModel.js";
import { BranchModel } from "../db/models/BranchModel.js";
import * as aws from "../utils/awsS3.js";

/**
 * Generates a unique ID for a game
 * @returns
 */
export function getUniqueGameUID() {
  return Math.floor(1000000 + Math.random() * 9000000).toString(16);
}

/*************** User Authentication *******************/

/**
 * Validates that string is a valid email address
 * @param {*} email
 * @returns
 */
export function validateEmail(email) {
  return emailValidator.validate(email.toLowerCase());
}

/**
 * Create a JWT token
 * @param {*} user
 * @returns
 */
export async function getOneTimeToken(user) {
  const token = jwt.sign({ username: user.username.toLowerCase(), role: user.role, branch: user.branch, branchName: codeToBranch(user.branch), name: user.name }, process.env.JWTSECRET, { expiresIn: "10h" });
  return token;
}

/**
 * Gets time for token expiration
 * @param {*} delta
 * @returns
 */
export function getTokenExpiration(delta) {
  const now = new Date();
  var advanced = null;
  if (delta.min !== undefined) advanced = now.getMinutes() + delta.min;
  if (delta.hour !== undefined) advanced = now.getHours() + delta.hour;
  if (delta.day !== undefined) advanced = now.getDate() + delta.day;
  if (delta.month !== undefined) advanced = now.getMonth() + delta.month;
  now.setDate(advanced);
  return now.toISOString();
}

/**
 * Validates that the JWT token is valid
 * @param {*} token
 * @returns
 */
export function validateToken(headers) {
  let token = headers["x-access-token"] || headers["authorization"];
  if (token === undefined || token == null) return null;
  // Remove Bearer from string
  token = token.replace(/^Bearer\s+/, "");
  if (token === undefined || token == null) return null;

  //var s = token.substring(token.indexOf("=") + 1);
  try {
    console.log("token is", token);
    const decoded = jwt.verify(token, process.env.JWTSECRET);
    console.log("Token is valid", decoded);
    return decoded;
  } catch (error) {
    console.log("JWT Error", error);
    return null;
  }
}

/**
 * Gets the JWT token from the headers
 * @param {*} req
 * @returns
 */
export function getJwt(req) {
  const jwtUser = validateToken(req.headers.cookie);
  return jwtUser;
}

/**
 * Check admin permissions
 * @param {*} req
 * @param {*} validatePage
 * @returns
 */
export function validateAdminUser(req, validatePage = false) {
  const jwtUser = validateToken(req.headers);
  if (!jwtUser) {
    return { valid: false, jwt: null };
  }
  return { valid: true, jwt: jwtUser };
}

/**
 * Check that the admin page is valid
 * @param {*} req
 * @returns
 */
export function validateAdminPage(req) {
  var pages = ["gamelist", "register", "userlist", "editgame", "brnch", "gallery", "lsnlist", "formlist", "reglist", "grplist", "editform"];
  if (req.params.page == undefined) return true;
  return pages.includes(req.params.page);
}

/********************** Branch Functions ****************************/

/**
 * Converts readable branch name to code
 * @param {*} branch
 * @returns
 */
export function branchToCode(branch) {
  if (isValidValue(global.huntBranches)) return Object.keys(global.huntBranches).find((key) => global.huntBranches[key].name === branch);
  return "N/A";
}

/**
 * Converts branch code to readable name
 * @param {*} code
 * @returns
 */
export function codeToBranch(code) {
  if (isValidValue(global.huntBranches)) return global.huntBranches[code].name;
  return "N/A";
}

/**
 * Load all branches from DB and cache them as
 * a global application variable
 */
export function loadBranchesFromDB() {
  if (!isValidValue(global.huntBranches)) {
    BranchModel.find().then((branches) => {
      global.huntBranches = {};
      branches.forEach((brch) => {
        global.huntBranches[brch.code] = { name: brch.name };
      });
    });
  }
}

/**
 * Clears the branches cache
 */
export function clearBranchesCache() {
  global.huntBranches = undefined;
}

/**
 * Add a new branch to the cache
 * @param {*} code
 * @param {*} name
 */
export function addBranch(code, name) {
  BranchModel.create({ name, code })
    .then((doc) => {
      clearBranchesCache();
      loadBranchesFromDB();
    })
    .catch((err) => {
      console.log(err);
    });
}

/**
 * Delete a branch from the cache
 * @param {*} code
 */
export function deleteBranch(code) {
  BranchModel.findOneAndDelete({ code })
    .then((doc) => {
      clearBranchesCache();
      loadBranchesFromDB();
    })
    .catch((err) => {
      console.log(err);
    });
}

export function getBranchesForUser(jwt) {
  if (jwt.role === Roles.SUPERADMIN) return global.huntBranches;
  var code = jwt.branch;
  return { code: global.huntBranches[code] };
}

/******************* Images Related *********************/

/**
 * Get all riddle images for that branch (from S3)
 * @param {*} branch
 * @param {*} cb
 */
export function getRiddleImages(branch, cb) {
  aws.listFolder(
    "riddles/" + branch,
    function (err, keyList, options) {
      var list = keyList.Objects.filter((item) => {
        return item.Key.endsWith(".png") || item.Key.endsWith(".jpg");
      }).map((item) => {
        return item.Key.substring(item.Key.lastIndexOf("/") + 1);
      });
      cb(err, list);
    },
    null
  );
}

/**
 * Delete the map files associted with a specific game
 * @param {*} uid
 * @param {*} branchCode
 */
export function deleteMapFiles(uid, branchCode) {
  var keyList = { Objects: [{ Key: `maps/${branchCode}/${uid}_red.png` }, { Key: `maps/${branchCode}/${uid}_blue.png` }, { Key: `maps/${branchCode}/${uid}_green.png` }] };
  aws.deleteMultipleObjects(keyList, function (err, numDeleted) {});
}

/**
 * Create default map files for a game
 * @param {*} uid
 * @param {*} branchCode
 */
export function createMapFiles(uid, branchCode) {
  aws.copyEmptyToFolder(`maps/${branchCode}`, `${uid}_red.png`, function (err, success) {
    aws.copyEmptyToFolder(`maps/${branchCode}`, `${uid}_blue.png`, function (err, success) {
      aws.copyEmptyToFolder(`maps/${branchCode}`, `${uid}_green.png`, function (err, success) {});
    });
  });
}

/**
 * Sets all team images to empty.png
 * @param {*} team
 * @returns
 */
export function setImagesToEmpty(team) {
  team.riddles.forEach((rdl) => {
    rdl.img = "empty.png";
  });
  return team;
}

/************************** General Utilities ***************************/

export function getWeekday(num) {
  switch (num) {
    case "1":
      return "ראשון";
    case "2":
      return "שני";
    case "3":
      return "שלישי";
    case "4":
      return "רביעי";
    case "5":
      return "חמישי";
    case "6":
      return "שישי";
    case "7":
      return "שבת";
    default:
      return "N/A";
  }
}

export function getWeekdayNum(day) {
  switch (num) {
    case "ראשון":
      return "1";
    case "שני":
      return "2";
    case "שלישי":
      return "3";
    case "רביעי":
      return "4";
    case "חמישי":
      return "5";
    case "שישי":
      return "6";
    case "שבת":
      return "7";
    default:
      return "N/A";
  }
}

/**
 * Gets the date in IL timezone and without milliseconds
 * @param {*} dt
 * @returns
 */
export function getDateIL(dt) {
  var d = new Date(dt).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" });
  return d.substring(0, d.lastIndexOf(":"));
}

/**
 * Formats local date and time in the IL timezone
 * @returns
 */
export function getCurrentDateTime() {
  const now = new Date().toLocaleString("en", { timeZone: "Asia/Jerusalem" });
  return new Date(now).toISOString();
}

/**
 * Replaces {0}, {1} inside string with given arguments
 * First argument is the string
 * @returns string
 */
export function formatString() {
  try {
    let str = arguments[0];
    for (let i = 1; i < arguments.length; i++) {
      if (isValidValue(arguments[i])) str = str.replace("{" + (i - 1) + "}", arguments[i]);
      else str = str.replace("{" + (i - 1) + "}", "");
    }
    return str;
  } catch (err) {
    console.log(err);
    return "N/A";
  }
}

/**
 * Checks if a value is valid
 * @param {*} val
 * @returns
 */
export function isValidValue(val) {
  return val !== undefined && val !== "" && val !== null;
}

export function getQAFromForm(qaArray) {
  if (qaArray == null) return [];

  var list = [];
  qaArray.forEach((item) => {
    var qa = { type: item.type, q: item.q };
    switch (item.type) {
      case "select":
      case "checkbox":
      case "radio":
        qa.options = item.options;
        qa.optionsText = "";
        item.options.forEach((opt) => {
          qa.optionsText += opt.value + "\n";
        });
        break;
      case "text":
      default:
        break;
    }
    qa.typeText = getFormItemType(item.type);
    list.push(qa);
  });
  return list;
}

function getFormItemType(type) {
  switch (type) {
    case "text":
      return "שורת טקסט";
    case "checkbox":
      return "צ'ק בוקס";
    case "raio":
      return "בחירה בודדת - Radio";
    case "select":
      return "בחירה מרשימה";
  }
}
