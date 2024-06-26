/**
 * --------------------------
 * Treasure Hunt Application
 * --------------------------
 *
 * @desc Controller for game operations
 *
 * Org: Mashar / Kfar-Sava
 * By: Oded Cnaan
 * Date: March 2024
 */
"use strict";
//================ IMPORTS =================
import { GameModel } from "../db/models/GameModel.js";
import { StatusModel } from "../db/models/StatusModel.js";
import { Roles } from "../db/models/UserModel.js";
import strings from "../public/lang/strings.js";
import config from "../config/config.js";
import * as util from "../utils/util.js";
import * as func from "../utils/func.js";
import { Types } from "mongoose";

/**
 * Checks if the result vector is valid or not
 * Called by the student's form
 *
 * @param {*} req
 * @param {*} res
 * @returns
 */
export function validateVector(req, res) {
  // check if DB properly connected
  if (!req.app.get("db_connected")) {
    return res.status(500);
  }

  // Find relevant document in DB that describes the game
  var { uid, team, index, vectorSize, vectorAngle } = req.params;
  if (!util.isValidValue(vectorAngle) || !util.isValidValue(vectorSize)) {
    var errMsg = strings.js.formEmpty;
    res.status(200).json({ result: { errMsg, infoMsg: "" } });
    return;
  }

  var query = {
    uid,
    active: true,
  };

  // Async Query
  GameModel.findOne(query)
    .then((gameData) => {
      if (gameData) {
        // All good
        var gameJson = JSON.parse(JSON.stringify(gameData));
        var errMsg = "";
        var infoMsg = "";
        var success = -1;

        var [success, errMsg, infoMsg] = func._checkVector(req.params, gameJson[team]);
        // add report so the teacher can monitor progress
        if (success > -1) func._reportStatus({ success: true, status: "Correct vector", stage: req.body.index }, team, gameJson.uid, gameJson.branch);
        else func._reportStatus({ success: false, status: "Bad vector", stage: req.body.index }, team, gameJson.uid, gameJson.branch);

        res.status(200).json({ result: { errMsg, infoMsg } });
      } else {
        res.status(500).json({ result: { errMsg: strings.err.nogame, infoMsg: "" } });
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500);
    });
}

/**
 * get game list
 *
 * @param {*} req
 * @param {*} res
 * @returns
 */
export async function getGameList(req, res, jwt) {
  // check if DB properly connected
  if (!req.app.get("db_connected")) {
    return res.status(500);
  }

  // pagination
  var page = req.params.page;
  var branch = req.params.branch;
  const numPerPage = config.app.gameListPerPage;
  if (!util.isValidValue(page)) page = 1;

  // only super-admins can get data on games not in their branch
  if (jwt.role === Roles.TEACHER || jwt.role === Roles.ADMIN) {
    if (util.isValidValue(branch) && branch !== jwt.branch) {
      res.status(400).json({ msg: strings.err.invalidAction });
      return;
    }
  }
  if (!util.isValidValue(branch)) filter["branch"] = jwt.branch;

  var filter = { branch };

  // send query with pagination
  var games = await GameModel.find(filter)
    .limit(numPerPage)
    .skip(numPerPage * (page - 1))
    .sort({ branch: "desc", readableName: "asc", active: "desc" });
  var numGames = await GameModel.countDocuments(filter);
  if (util.isValidValue(filter.branch)) {
    filter.branchCode = filter.branch;
    delete filter.branch;
  }
  const status = await StatusModel.find(filter);
  const result = createGameList(games, status);

  res.status(200).json({ games: result, total: numGames, numPerPage });
}

/**
 *
 * @param {*} jwt
 * @returns
 */
export async function getEntireGameList(jwt) {
  // send query with pagination
  var games = await GameModel.find({});
  var numGames = await GameModel.countDocuments({});
  const status = await StatusModel.find({});
  const result = createGameList(games, status);
  return result;
}
/**
 * gets a specific game
 * @param {*} gameName
 * @param {*} jwt
 * @returns
 */
export function getGame(req, res) {
  var uid = req.params.uid;
  if (!util.isValidValue(uid)) return null;

  var filter = {
    uid,
  };

  // only super-admins can get games outside their branch
  /*  if (jwt.role !== Roles.SUPERADMIN) {
    filter["branch"] = jwt.branch;
  }*/

  // send query
  GameModel.findOne(filter)
    .then((theGame) => {
      var g = createGameObj(theGame, true);
      res.status(200).json(g);
    })
    .catch((err) => {
      res.status(400).json({ msg: strings.err.gameNotFound });
    });
}

export function getGameAndStatus(req, res, jwt) {
  var uid = req.params.uid;
  if (!util.isValidValue(uid)) return null;

  var filter = {
    uid,
  };

  // only super-admins can get games outside their branch
  if (jwt.role !== Roles.SUPERADMIN) {
    filter["branch"] = jwt.branch;
  }

  // send query
  GameModel.findOne(filter)
    .then((theGame) => {
      var g = createGameObj(theGame, true);
      _calcGameStatus(uid)
        .then((status) => {
          res.status(200).json({ game: g, status });
        })
        .catch((err) => {
          res.status(400).json({ msg: strings.err.gameNotFound });
        });
    })
    .catch((err) => {
      res.status(400).json({ msg: strings.err.gameNotFound });
    });
}

/**
 * Gte riddle image list
 * @param {*} req
 * @param {*} res
 * @param {*} jwt
 */
export function getImageList(req, res, jwt) {
  util.getRiddleImages(req.params.branchCode, function (err, list) {
    if (err == null) return res.status(200).json(list);
    return res.status(400);
  });
}

/**
 * Save a game
 * @param {*} req
 * @param {*} res
 * @param {*} jwt
 * @returns
 */
export function saveGame(req, res, jwt) {
  // check if DB properly connected
  if (!req.app.get("db_connected")) {
    return res.status(500);
  }

  var uid = req.params.uid;
  var filter = {
    uid,
  };

  // only super-admins can save games outside their branch
  if (jwt.role !== Roles.SUPERADMIN) {
    filter["branch"] = jwt.branch;
  }

  // send query
  GameModel.find(filter)
    .then((game) => {
      if (!game || game.length != 1) {
        res.status(400).json({ msg: strings.err.gameNotFound });
        return;
      }
      var saveData = _formatGameForSave(game[0], req.body);
      var theGame = new GameModel(saveData); // create a Model
      theGame
        .save() // save it
        .then((ngame) => {
          if (ngame) res.status(200).json({ game: ngame });
          else res.status(400).json({ msg: game.err.gameNotSaved });
        })
        .catch((error) => {
          console.log(error);
          res.status(400).json({ msg: strings.err.gameNotFound });
        });
    })
    .catch((err) => {
      console.log(err);
      res.status(400).json({ msg: strings.err.gameNotFound });
    });
}

/**
 * Clones a game
 *
 * @param {*} req
 * @param {*} res
 * @returns
 */
export function cloneGame(req, res, jwt) {
  // check if DB properly connected
  if (!req.app.get("db_connected")) {
    return res.status(500);
  }

  var { origGame, newGame, newBranch } = req.body.clone;
  var filter = {
    gameName: origGame,
  };

  // only super-admins can clone games outside their branch
  if (jwt.role !== Roles.SUPERADMIN) {
    filter["branch"] = jwt.branch;
  }

  // send query
  GameModel.find(filter)
    .then((game) => {
      if (!game || game.length != 1) {
        res.status(400).json({ msg: strings.err.gameNotFound });
        return;
      }
      game[0].gameName = util.getUniqueGameUID();
      game[0].version = "1.0";
      game[0].active = false;
      game[0]._id = new Types.ObjectId();
      game[0].date = util.getCurrentDateTime();
      game[0].uid = game[0].gameName;
      game[0].readableName = newGame;
      if (jwt.role === Roles.SUPERADMIN && util.isValidValue(newBranch)) {
        // super-admin can clone a game to another branch but in this case
        // we need to set all images to empty
        if (game[0].branch !== newBranch) {
          game[0].red = util.setImagesToEmpty(game[0].red);
          game[0].blue = util.setImagesToEmpty(game[0].blue);
          game[0].green = util.setImagesToEmpty(game[0].green);
        }
        game[0].branch = newBranch;
      }

      game[0].isNew = true;
      delete game[0]._id;
      var theGame = new GameModel(game[0]);
      theGame
        .save()
        .then((ngame) => {
          if (ngame) {
            util.createMapFiles(game[0].uid, game[0].branch);
            var g = createGameObj(ngame, true);
            res.status(200).json(g);
          } else res.status(400).json({ msg: strings.err.gameNotCloned });
        })
        .catch((error) => {
          console.log(error);
          res.status(400).json({ msg: strings.err.gameNotFound });
        });
    })
    .catch((err) => {
      console.log(err);
      res.status(400).json({ msg: strings.err.gameNotFound });
    });
}

/**
 * Start a game (or resets an existing one)
 *
 * @param {*} req
 * @param {*} res
 * @returns
 */
export function startGame(req, res, jwt) {
  // check if DB properly connected
  if (!req.app.get("db_connected")) {
    return res.status(500);
  }

  var { gameCode, branch } = req.params;
  if (!util.isValidValue(gameCode) || !util.isValidValue(branch)) {
    res.status(400).json({ result: { sucess: false, msg: strings.err.noData } });
    return;
  }

  var filter = {
    gameCode,
    branchCode: branch,
  };

  var now = util.getCurrentDateTime();
  var update = {
    $set: { startTime: now, active: true, red: [], green: [], blue: [] },
  };

  const options = {
    upsert: true,
    returnOriginal: false,
    new: true,
  };

  // send query
  StatusModel.findOneAndUpdate(filter, update, options)
    .then((doc) => {
      if (!doc) {
        res.status(400).json({ Error: strings.err.startGameErr });
      } else res.status(200).json({ msg: strings.ok.startGameOK });
    })
    .catch((err) => {
      res.status(400).json({ Error: strings.err.startGameErr });
    });
}

/**
 * Stop a game
 *
 * @param {*} req
 * @param {*} res
 * @returns
 */
export function stopGame(req, res, jwt) {
  // check if DB properly connected
  if (!req.app.get("db_connected")) {
    return res.status(500);
  }

  var { gameCode, branch } = req.params;
  if (!util.isValidValue(gameCode) || !util.isValidValue(branch)) {
    res.status(400).json({ result: { sucess: false, msg: strings.err.noData } });
    return;
  }

  var filter = {
    gameCode,
    branchCode: branch,
  };

  var now = util.getCurrentDateTime();
  var update = {
    $set: { active: false },
  };

  const options = {
    upsert: true,
    returnOriginal: false,
  };

  // send query
  StatusModel.findOneAndUpdate(filter, update, options)
    .then((doc) => {
      if (!doc) {
        logger.error("Failed to update team statusReport");
        res.status(400).json({ msg: strings.err.stopGameErr });
      } else res.status(200).json({ msg: strings.ok.stoptGameOK });
    })
    .catch((err) => {
      logger.errorM("catch in statusReport", err);
      res.status(400).json({ Error: strings.err.stopGameErr });
    });
}

/**
 * Creates a new game
 *
 * @param {*} req
 * @param {*} res
 * @returns
 */
export async function createGame(req, res, jwt) {
  // check if DB properly connected
  if (!req.app.get("db_connected")) {
    return res.status(500);
  }

  var { name, branch } = req.body;
  if (!util.isValidValue(name)) {
    res.status(200).json({ result: { sucess: false, msg: strings.err.noData } });
    return;
  }

  if (jwt.role !== Roles.SUPERADMIN || !util.isValidValue(branch)) branch = jwt.branch;

  var game = _createNewGame(name, branch);
  var model = GameModel(game);
  model
    .save()
    .then((ngame) => {
      if (ngame) {
        util.createMapFiles(ngame.uid, branch);
        var g = createGameObj(ngame, true);
        res.status(200).json(g);
      } else res.status(400).json({ msg: strings.err.gameNotCreated });
    })
    .catch((error) => {
      res.status(400).json({ msg: strings.err.gameNameTaken });
    });
}

/**
 * Delete game
 *
 * @param {*} req
 * @param {*} res
 * @returns
 */
export async function deleteGame(req, res, jwt) {
  // check if DB properly connected
  if (!req.app.get("db_connected")) {
    return res.status(500);
  }

  var { uid, branch } = req.params;
  if (!util.isValidValue(uid)) {
    res.status(400).json({ msg: strings.err.noData });
    return;
  }

  var filter = {
    uid,
  };

  if (jwt.role !== Roles.SUPERADMIN) filter["branch"] = jwt.branch;

  const options = {};

  // send query
  await GameModel.deleteOne(filter, options)
    .then((doc) => {
      if (!doc) {
        res.status(400).json({ msg: strings.err.gameDeleteErr });
      } else {
        util.deleteMapFiles(uid, util.branchToCode(branch));
        StatusModel.deleteOne({ gameCode: uid }).then((d) => {
          res.status(200).json({ msg: strings.ok.gameDeleteOK });
        });
      }
    })
    .catch((err) => {
      res.status(400).json({ msg: strings.err.gameDeleteErr });
    });
}

/**
 * The uploading is handled by Multer
 * @param {*} req
 * @param {*} res
 * @param {*} jwt
 */
export function uploadMap(req, res, jwt) {
  res.status(200).json({});
}

/****************** HELPERS ***********************/

/**
 * Converts DB games to an array of objects
 * @param {*} games
 * @returns
 */
export function createGameList(games, status) {
  var res = [];
  if (games == null) return res;
  games.forEach((game) => {
    var branch = util.codeToBranch(game.branch);
    var active = Boolean(game.active);
    var activeGame = false;
    const gameStatus = status.filter((st) => st.gameCode === game.uid);
    if (gameStatus.length == 1 && gameStatus[0].active) activeGame = true;
    var d = util.getDateIL(game.date);
    res.push({ gameName: game.gameName, branch, branchCode: util.branchToCode(branch), date: d, version: game.version, active, uid: game.uid, readableName: game.readableName, activeGame });
  });
  return res;
}

/**
 * Creates a formatted game object from the DB game
 * @param {*} game
 * @returns
 */
export function createGameObj(game, outFormat = false) {
  var g = { gameName: game.gameName, branch: game.branch, date: game.date, version: game.version, active: game.active, red: _copyColor(game.red), blue: _copyColor(game.blue), green: _copyColor(game.green), uid: game.uid, readableName: game.readableName };
  if (outFormat) {
    g.branchCode = g.branch;
    g.branch = util.codeToBranch(g.branchCode);
    var d = util.getDateIL(g.date);
    g.date = d;
  }
  return g;
}

/******************* INTERNAL **********************/

/**
 * converts a riddle array (DB) to text for textarea with \n
 * @param {*} arr
 * @returns
 */
function _convertRiddleToText(arr) {
  var text = "";
  for (var i = 0; i < arr.length; i++) {
    text = `${text}${arr[i].trim()}\n`;
  }
  return text;
}

function _convertTextToRiddle(text) {
  var rid = [];
  var arr = text.split("\n");
  arr.forEach((line) => {
    if (line.trim() !== "") rid.push(line.trim());
  });
  return rid;
}

function _convertRiddlesForSave(riddles) {
  riddles.forEach((rdl) => {
    rdl.riddle = _convertTextToRiddle(rdl.text);
  });
  return riddles;
}

/**
 * makes a copy of team data
 * @param {*} col
 * @returns
 */
function _copyColor(col) {
  var r = {
    team: col.team,
    color: col.color,
    bgColor: col.bgColor,
    riddles: [],
  };
  for (var i = 0; i < 5; i++) {
    const text = _convertRiddleToText(col.riddles[i].riddle);
    r.riddles[i] = {
      index: col.riddles[i].index,
      img: _fixRiddleImagePath(col.riddles[i].img),
      vecSize: _convertNumberArray(col.riddles[i].vecSize),
      vecAngle: _convertNumberArray(col.riddles[i].vecAngle),
      text: text,
    };
  }
  return r;
}

/**
 * makes sure the path includes only filename
 * @param {*} src
 * @returns
 */
function _fixRiddleImagePath(src) {
  if (src.indexOf("/") != -1) {
    src = src.substring(src.indexOf("/") + 1);
  }
  return src;
}

/**
 * converts a number array (DB) to a string array
 * @param {*} arr
 * @returns
 */
function _convertNumberArray(arr) {
  var t = [];
  for (var i = 0; i < arr.length; i++) {
    t.push(`${arr[i]}`);
  }
  return t;
}

/**
 * Formats game data so it could be saved in DB
 *
 * @param {*} game - the game data in DB
 * @param {*} body - the data to save
 */
function _formatGameForSave(dbData, newData) {
  dbData.isNew = false;
  dbData.version = String((parseFloat(newData.version) + 0.1).toPrecision(2));
  dbData.active = newData.active == "true" ? true : false;
  dbData.date = util.getCurrentDateTime();
  dbData.branch = dbData.branch;
  dbData.readableName = newData.readableName;

  newData.red.riddles = _convertRiddlesForSave(newData.red.riddles);
  newData.blue.riddles = _convertRiddlesForSave(newData.blue.riddles);
  newData.green.riddles = _convertRiddlesForSave(newData.green.riddles);

  dbData.red = newData.red;
  dbData.blue = newData.blue;
  dbData.green = newData.green;
  return dbData;
}

/**
 * Creates the data for a new game
 * @param {*} gameName
 * @param {*} branch
 * @returns
 */
function _createNewGame(name, branch) {
  var uid = util.getUniqueGameUID();
  var game = {
    isNew: true,
    version: "1.0",
    active: false,
    date: util.getCurrentDateTime(),
    branch, //: util.branchToCode(branch),
    gameName: uid,
    readableName: name,
    uid: uid,
    red: _createTeam("red"),
    blue: _createTeam("blue"),
    green: _createTeam("green"),
  };
  return game;
}

/**
 * create a team object
 * @param {*} color
 * @returns
 */
function _createTeam(color) {
  var team = {
    riddles: _createEmptyRiddles(),
  };
  if (color == "red") {
    team["color"] = "#c0514d";
    team["bgColor"] = "#ff8f9a";
    team["team"] = strings.gen.redTeam;
  } else if (color == "blue") {
    team["color"] = "#4f81bd";
    team["bgColor"] = "#94c4ff";
    team["team"] = strings.gen.blueTeam;
  } else if (color == "green") {
    team["color"] = "#9bba59";
    team["bgColor"] = "#96dd89";
    team["team"] = strings.gen.greenTeam;
  }
  return team;
}

/**
 * create an empty riddle object
 * @returns
 */
function _createEmptyRiddles() {
  var r = [];
  for (var i = 1; i <= 5; i++) {
    var rdl = {
      index: i,
      img: "empty.png",
      vecSize: [100],
      vecAngle: [30],
      riddle: [strings.riddle.firstLine, strings.riddle.sample1, strings.riddle.sample2, strings.riddle.LastLine],
    };
    r.push(rdl);
  }
  return r;
}

/********** GAME STATUS */

async function _calcGameStatus(uid, branchCode) {
  const status = await _getGameStatus(uid, branchCode);
  if (!status.active) {
    return { started: false };
  }
  return {
    started: true,
    startTime: status.startTime,
    red: await _calcTeamStatus(status.red),
    blue: await _calcTeamStatus(status.blue),
    green: await _calcTeamStatus(status.green),
  };
}

async function _getGameStatus(gameCode, branchCode) {
  var info = {
    active: false,
    startTime: "",
    red: [],
    blue: [],
    green: [],
  };
  // check if DB properly connected
  if (!util.isValidValue(gameCode)) {
    return info;
  }

  var filter = {
    gameCode,
  };

  const status = await StatusModel.find(filter);
  if (status.length !== 1) return info;

  return {
    active: status[0].active,
    startTime: util.getDateIL(status[0].startTime),
    red: status[0].red,
    blue: status[0].blue,
    green: status[0].green,
  };
}

async function _calcTeamStatus(team) {
  var teamInfo = {
    stage: 1,
    success: false,
    numTries: 0,
  };

  if (team.length == 0) return teamInfo;

  teamInfo.stage = team[team.length - 1].stage;
  for (var i = team.length - 1; i >= 0; i--) {
    if (team[i].stage < teamInfo.stage) break;
    if (team[i].success) {
      teamInfo.success = true;
    }
    teamInfo.numTries++;
  }
  return teamInfo;
}
