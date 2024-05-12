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
import { BranchModel } from "../db/models/BranchModel.js";
import { PlayListModel } from "../db/models/PlayListModel.js";
import * as aws from "../utils/awsS3.js";
import * as api_user from "./api_user.js";
import * as api_game from "./api_game.js";
import config from "../config/config.js";

/**
 * Create a new branch or delete an existing one
 * @param {*} req
 * @param {*} res
 * @param {*} jwt
 * @returns
 */
export async function addBranch(req, res, jwt) {
  const { name, code } = req.body;

  const branches = await util.getBranchesForUser(jwt);
  if (!util.isValidValue(name) || !util.isValidValue(code)) {
    res.status(400).json({ msg: strings.err.branchNameInvalid });
    return;
  }
  if (branches[code] === undefined) {
    util.addBranch(code, name);
    createBranchFolders(res, code);
  } else {
    res.status(400).json({ msg: strings.err.branchAlreadyDefined });
    return;
  }
}

export async function deleteBranch(req, res, jwt) {
  const code = req.params.code;
  const branches = await util.getBranchesForUser(jwt);
  if (!util.isValidValue(code)) {
    res.status(400).json({ msg: strings.err.branchNameInvalid });
    return;
  }
  if (branches[code] !== undefined) util.deleteBranch(code);
  else {
    res.status(400).json({ msg: strings.err.branchAlreadyDefined });
    return;
  }
  deleteBranchFolders(res, code);
}

/**
 * Gallery upload. Handled by Multer
 * @param {*} req
 * @param {*} res
 * @param {*} jwt
 */
export function handleGallery(req, res, jwt, err) {
  if (err == null) res.status(200).json({ msg: strings.ok.actionOK });
  else res.status(400).json({ msg: err.msg });
}

/**
 * Deletes an image from the riddle gallery
 * @param {*} req
 * @param {*} res
 * @param {*} jwt
 * @returns
 */
export function handleGalleryDelete(req, res, jwt) {
  const branchCode = req.params.branchCode;
  if (jwt.role !== Roles.SUPERADMIN) {
    if (branchCode !== jwt.branch) {
      return res.status(400).json({ msg: strings.err.invalidAction });
    }
  }
  const name = req.params.name;
  if (name === "empty.png") {
    res.status(400).json({ msg: strings.err.cannotDeleteThisImage });
    return;
  }
  aws.deleteFile(`riddles/${branchCode}/${name}`, function (err, success) {
    if (success) res.status(200).json({ msg: strings.ok.actionOK });
    else res.status(400).json({ msg: strings.err.imageDeleteErr });
  });

  /*var folder = util.getGalleryFolder(branchCode)
    if (name === 'empty.png') {
        res.status(400).json({msg: "אי אפשר למחוק את התמונה הזאת"});    
        return
    }
    fs.unlinkSync(folder+name)*/
}

/**
 * Not in use!
 * Gets a QR code image from an external API
 * API Documentation: https://goqr.me/api/doc/create-qr-code/
 *
 * Examples:
 * https://api.qrserver.com/v1/create-qr-code/?data=http%3A%2F%2Flocalhost%3A5500%2Fgen%2F%2Fred%2F1&size=300x300&color=ff0000&qzone=1&format=png
 * https://api.qrserver.com/v1/create-qr-code/?data=http%3A%2F%2Flocalhost%3A5500%2Fgen%2F%2Fred%2F1&size=300x300&color=red&qzone=1&format=png
 * @param {*} url
 * @param {*} color
 * @returns
 */
export async function getQRcode(url, color) {
  var uri = encodeURI(url);
  var c = "94c4ff"; // blue
  if (color == "red") c = "ff8f9a";
  else if (color == "green") c = "96dd89";

  var apiQR = `https://api.qrserver.com/v1/create-qr-code/?data=${uri}&size=300x300&color=${c}&qzone=1&format=png`;
  const response = await fetch(apiQR, {
    method: "GET",
    cache: "no-cache",
    referrerPolicy: "no-referrer",
  });

  const image = await response.blob();
  const imgSrc = URL.createObjectURL(image);
  return imgSrc;
}

/**
 *
 * Creates a folder for the new branch
 * @param {*} branchCode
 */
function createBranchFolders(res, branchCode) {
  aws.createFolder("riddles/" + branchCode, function (err, success) {
    if (success) {
      aws.createFolder("maps/" + branchCode, function (err, success) {
        if (success) res.status(200).json({ msg: strings.ok.actionOK });
        else res.status(400).json({ msg: strings.err.branchCreateErr });
      });
    } else res.status(200).json({ msg: strings.err.branchCreateErr });
  });
}

/**
 *
 * @param {*} branchCode
 */
function deleteBranchFolders(res, branchCode) {
  aws.deleteFolder(
    "riddles/" + branchCode,
    function (err, numDeleted, options) {
      aws.deleteFolder(
        "maps/" + branchCode,
        function (err, numDeleted, options) {
          res.status(200).json({ msg: strings.ok.actionOK });
        },
        null
      );
    },
    null
  );
}

export async function getBranchList(req, res, jwt) {
  // check if DB properly connected
  if (!req.app.get("db_connected")) {
    return res.status(500);
  }

  // only super-admins can get data on games not in their branch
  if (jwt.role === Roles.TEACHER || jwt.role === Roles.ADMIN) {
    return res.status(400).json({ msg: strings.err.invalidAction });
  }

  var brch = await BranchModel.find();
  const branches = createBranches(brch);

  var games = await api_game.getEntireGameList(jwt);
  const branchUsers = await api_user.countUsers();
  games.forEach((game) => {
    var br = branches.filter((b) => b.code == game.branchCode);
    if (br.length === 1) br[0].used = true;
  });
  Object.keys(branchUsers).forEach((key) => {
    var br = branches.filter((b) => b.code == key);
    if (br.length === 1) br[0].used = true;
  });
  res.status(200).json({ branches });
}

function createBranches(brch) {
  let b = [];
  brch.forEach((element) => {
    b.push({ name: element.name, code: element.code });
  });
  return b;
}

export async function getPlaylist(req, res, jwt) {
  // check if DB properly connected
  if (!req.app.get("db_connected")) {
    return res.status(500);
  }

  // pagination
  var page = req.params.page;
  const numPerPage = config.app.playListPerPage;
  if (!util.isValidValue(page)) page = 1;

  var playlists = null;
  if (page == 0) {
    // no paging, get all
    playlists = await PlayListModel.find().sort({ order: "asc" });
  } else {
    // send query with pagination
    playlists = await PlayListModel.find()
      .limit(numPerPage)
      .sort({ order: "asc" })
      .skip(numPerPage * (page - 1));
  }
  const totalDocs = await PlayListModel.countDocuments();
  res.status(200).json({ playlists, totalDocs, numPerPage });
}

export async function reorderPlaylist(req, res, jwt) {
  // check if DB properly connected
  if (!req.app.get("db_connected")) {
    return res.status(500);
  }

  var list = req.body;
  if (!util.isValidValue(list)) {
    return res.status(400).json({ msg: strings.err.invalidData });
  }

  var command = [];

  for (var i = 0; i < list.length; i++) {
    var cmd = {
      updateOne: {
        filter: { code: list[i].code },
        update: { $set: { order: list[i].order } },
      },
    };
    command.push(cmd);
  }

  // send query
  PlayListModel.bulkWrite(command)
    .then((data) => {
      res.status(200).json({ msg: strings.ok.actionOK });
    })
    .catch((err) => {
      console.log(err);
      res.status(400).json({ msg: strings.err.actionFailed });
    });
}

export async function addPlaylist(req, res, jwt) {
  // check if DB properly connected
  if (!req.app.get("db_connected")) {
    return res.status(500);
  }

  var list = req.body;
  if (!util.isValidValue(list)) {
    return res.status(400).json({ msg: strings.err.invalidData });
  }

  var model = new PlayListModel(list);
  model
    .save()
    .then((nlist) => {
      if (nlist) {
        res.status(200).json({ msg: strings.ok.actionOK });
      } else res.status(400).json({ msg: strings.err.invalidData });
    })
    .catch((error) => {
      res.status(400).json({ msg: strings.err.duplicatePlaylist });
    });
}

export function editPlaylist(req, res, jwt) {
  // check if DB properly connected
  if (!req.app.get("db_connected")) {
    return res.status(500);
  }

  var list = req.body;
  if (!util.isValidValue(list)) {
    return res.status(400).json({ msg: strings.err.invalidData });
  }

  var filter = {
    code: list.code,
  };

  var update = {
    $set: { topic: list.topic, name: list.name, grade: list.grade },
  };

  const options = {
    upsert: true,
    returnOriginal: false,
    new: true,
  };

  // send query
  PlayListModel.findOneAndUpdate(filter, update, options)
    .then((doc) => {
      if (!doc) {
        res.status(400).json({ Error: strings.err.actionFailed });
      } else res.status(200).json({ msg: strings.ok.actionOK });
    })
    .catch((err) => {
      res.status(400).json({ Error: strings.err.actionFailed });
    });
}

export async function deletePlaylist(req, res, jwt) {
  // check if DB properly connected
  if (!req.app.get("db_connected")) {
    return res.status(500);
  }

  var code = req.params.code;

  var filter = {
    code,
  };

  const options = {};

  // send query
  await PlayListModel.deleteOne(filter, options)
    .then(async (doc) => {
      if (!doc) {
        res.status(400).json({ msg: strings.err.actionFailed });
      } else {
        // need to reorder
        var index = 1;
        var playlists = await PlayListModel.find().sort({ order: "asc" });
        playlists.forEach((pl) => {
          pl.order = index++;
        });
        req.body = playlists;
        reorderPlaylist(req, res, jwt);
      }
    })
    .catch((err) => {
      res.status(400).json({ msg: strings.err.actionFailed });
    });
}
