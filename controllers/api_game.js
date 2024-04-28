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
import {GameModel} from "../db/models/GameModel.js";
import {StatusModel} from "../db/models/StatusModel.js"
import {Roles} from "../db/models/UserModel.js";
import strings from "../public/lang/strings.js"
import config from "../config/config.js"
import * as util from "../utils/util.js";
import * as func from "../utils/func.js"
import { Types } from 'mongoose';

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
    if(!req.app.get("db_connected")) {
        return res.status(500);
    }

    // Find relevant document in DB that describes the game
    var {gameName,team,vectorSize,vectorAngle} = req.body
    if (!util.isValidValue(vectorAngle) || !util.isValidValue(vectorSize)) {
        errMsg = strings.js.formEmpty
        res.status(200).json({result: {errMsg, infoMsg:""}})
        return
    }
    
    var query = {
        gameName, 
        active:true
    }
    
    // Async Query
    GameModel.findOne(query)
    .then (gameData => {
        if (gameData) {
            // All good
            var gameJson = JSON.parse(JSON.stringify(gameData))
            var errMsg = ''
            var infoMsg = ''
            var success = -1

            var [success, errMsg, infoMsg] = func._checkVector(req.body, gameJson[team])
            // add report so the teacher can monitor progress
            if (success > -1)
                func._reportStatus({success: true, status:"Correct vector", stage: req.body.index},team, gameJson.uid, gameJson.branch)
            else
                func._reportStatus({success: false, status:"Bad vector", stage: req.body.index},team, gameJson.uid, gameJson.branch)
                
            res.status(200).json({result: {errMsg, infoMsg}})
        }
        else {
            res.status(500).json({result: {errMsg: strings.err.nogame, infoMsg:""}})
        }                                           
    })
    .catch(err => {
        console.log(err)
        res.status(500)
    }) 
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
    if(!req.app.get("db_connected")) {
        return res.status(500);
    }

    // pagination
    var page = req.params.param
    const numPerPage = config.app.gameListPerPage
    if (!util.isValidValue(page))
        page = 1

    var {branch, gameName} = req.body
    var filter = {}       

    // only super-admins can get data on games not in their branch
    if (jwt.role === Roles.TEACHER || jwt.role === Roles.ADMIN) {
        if (util.isValidValue(branch) && branch !== jwt.branch) {
            res.status(400).json({msg: strings.err.invalidAction })
            return 
        }
        // force their branch if not specified
        if (!util.isValidValue(branch))
            filter["branch"] = jwt.branch
    }
    else { // super admins can search for other branches
        if (util.isValidValue(branch))
            filter["branch"] = util.branchToCode(branch)
    } 

    if (util.isValidValue(gameName))
        filter["gameName"] = gameName

    // send query with pagination
    var games = await GameModel.find(filter)
        .limit(numPerPage)
        .skip(numPerPage*(page-1))
        .sort({ branch:'desc', readableName:'asc', active:'desc'})
    var numGames = await GameModel.countDocuments(filter)
    if (util.isValidValue(filter.branch)) {
        filter.branchCode = filter.branch
        delete filter.branch
    }
    const status = await StatusModel.find(filter)
    return {games,status, numGames}
}

/**
 * gets a specific game
 * @param {*} gameName 
 * @param {*} jwt 
 * @returns 
 */
export async function getGame(gameName, jwt) {
    if (!util.isValidValue(gameName))
        return null

    var filter = {
        gameName
    }       

    // only super-admins can get games outside their branch
    if (jwt.role !== Roles.SUPERADMIN) {
        filter["branch"] = jwt.branch
    } 

    // send query
    const game = await GameModel.findOne(filter)
    return game
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
    if(!req.app.get("db_connected")) {
        return res.status(500);
    }

    var {gameName} = req.body
    var filter = {
        gameName
    }       

    // only super-admins can save games outside their branch
    if (jwt.role !== Roles.SUPERADMIN) {
        filter["branch"] = jwt.branch
    } 

    // send query
    GameModel.find(filter)
    .then(game => {
        if (!game || game.length != 1) {
            res.status(400).json({msg: strings.err.gameNotFound})
            return
        }
        var saveData = _formatGameForSave( game[0], req.body)
        var theGame = new GameModel(saveData) // create a Model
        theGame.save() // save it
        .then (ngame => {
            if (ngame)
                res.status(200).json({msg: strings.ok.gameSaved, game: ngame, path: "/admin/th/gamelist"})
            else
                res.status(400).json({msg: game.err.gameNotSaved})
        }) 
        .catch (error => {
            console.log(error)
            res.status(400).json({msg: strings.err.gameNotFound})
        })
    })
    .catch(err => {
        console.log(err)
        res.status(400).json({msg: strings.err.gameNotFound})
    })
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
    if(!req.app.get("db_connected")) {
        return res.status(500);
    }

    var {origGame,newGame, newBranch} = req.body
    var filter = {
        gameName: origGame,        
    }       

    // only super-admins can clone games outside their branch
    if (jwt.role !== Roles.SUPERADMIN) {
        filter["branch"] = jwt.branch
    } 

    // send query
    GameModel.find(filter)
    .then(game => {
        if (!game || game.length != 1) {
            res.status(400).json({msg: strings.err.gameNotFound})
            return
        }
        game[0].gameName = util.getUniqueGameUID()
        game[0].version = "1.0"
        game[0].active = false
        game[0]._id = new Types.ObjectId();
        game[0].date = util.getCurrentDateTime()
        game[0].uid = game[0].gameName
        game[0].readableName = newGame
        if (jwt.role === Roles.SUPERADMIN && util.isValidValue(newBranch)) {
            // super-admin can clone a game to another branch but in this case 
            // we need to set all images to empty
            if (game[0].branch !== newBranch) {
                game[0].red = util.setImagesToEmpty(game[0].red)
                game[0].blue = util.setImagesToEmpty(game[0].blue)
                game[0].green = util.setImagesToEmpty(game[0].green)
            }
            game[0].branch = newBranch
        }        
        
        game[0].isNew = true
        delete game[0]._id
        var theGame = new GameModel(game[0])
        theGame.save()
        .then (ngame => {
            if (ngame) {
                util.createMapFiles(game[0].uid,game[0].branch)
                res.status(200).json({msg: strings.ok.gameCloned, game: ngame})
            }
            else
                res.status(400).json({msg: strings.err.gameNotCloned})
        }) 
        .catch (error => {
            console.log(error)
            res.status(400).json({msg: strings.err.gameNotFound})
        })
    })
    .catch(err => {
        console.log(err)
        res.status(400).json({msg: strings.err.gameNotFound})
    })
}

/**
 * Edit a game
 * 
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
export function editGame(req, res, jwt) {
    // check if DB properly connected
    if(!req.app.get("db_connected")) {
        return res.status(500);
    }

    var {gameName} = req.body
    var filter = {
        gameName
    }       

    // only super-admins can edit games outside their branch
    if (jwt.role !== Roles.SUPERADMIN) {
        filter["branch"] = jwt.branch
    } 

    // send query
    GameModel.findOne(filter)
    .then(game => {
        if (!game) {
            res.status(400).json({msg: strings.err.gameNotFound})
            return
        }
        res.status(200).json({path:`/admin/th/editgame/${encodeURI(gameName)}`})
    }) 
    .catch (error => {
        console.log(error)
        res.status(400).json({msg: strings.err.gameNotFound})
    })
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
    if(!req.app.get("db_connected")) {
        return res.status(500);
    }

    var {gameCode, branch} = req.body
    if (!util.isValidValue(gameCode) || !util.isValidValue(branch)) {
        res.status(400).json({result: {sucess:false, msg: strings.err.noData}})
        return
    }

    var filter = {
        gameCode,
        branchCode: util.branchToCode(branch)
    }       

    var now = util.getCurrentDateTime()    
    var update = {
        $set: {startTime: now, active: true,  "red": [], "green": [], "blue" : []}
    }

    const options = { 
        upsert: true,
        returnOriginal: false,
        new: true
    };

    // send query
    StatusModel.findOneAndUpdate(
        filter, 
        update,
        options
    )
    .then(doc => {
        if(!doc) {
            logger.error("Failed to update team statusReport")
            res.status(400).json({Error: strings.err.startGameErr})
        }
        else
            res.status(200).json({msg: strings.ok.startGameOK})
    })
    .catch(err => {
        logger.errorM("catch in statusReport",err)
        res.status(400).json({Error: strings.err.startGameErr})
    })
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
    if(!req.app.get("db_connected")) {
        return res.status(500);
    }

    var {gameCode, branch} = req.body
    if (!util.isValidValue(gameCode) || !util.isValidValue(branch)) {
        res.status(400).json({result: {sucess:false, msg: strings.err.noData}})
        return
    }

    var filter = {
        gameCode,
        branchCode: util.branchToCode(branch)
    }       

    var now = util.getCurrentDateTime()    
    var update = {
        $set: {active: false}
    }

    const options = { 
        upsert: true,
        returnOriginal: false
    };

    // send query
    StatusModel.findOneAndUpdate(
        filter, 
        update,
        options
    )
    .then(doc => {
        if(!doc) {
            logger.error("Failed to update team statusReport")
            res.status(400).json({msg: strings.err.stopGameErr})
        }
        else
            res.status(200).json({msg: strings.ok.stoptGameOK})
    })
    .catch(err => {
        logger.errorM("catch in statusReport",err)
        res.status(400).json({Error: strings.err.stopGameErr})
    })
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
    if(!req.app.get("db_connected")) {
        return res.status(500);
    }

    var {name, branch} = req.body
    if (!util.isValidValue(name)) {
        res.status(200).json({result: {sucess:false, msg: strings.err.noData}})
        return
    }  

    if (jwt.role !== Roles.SUPERADMIN || !util.isValidValue(branch))
        branch = jwt.branch

    var game = _createNewGame(name, branch)
    var model = GameModel(game)
    model.save()
    .then (ngame => {
        if (ngame) {
            util.createMapFiles(ngame.uid, branch)
            res.status(200).json({msg: strings.ok.gameCreated, game: ngame})
        }
        else
            res.status(400).json({msg: strings.err.gameNotCreated})
    }) 
    .catch (error => {
        res.status(400).json({msg: strings.err.gameNameTaken})
    })
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
    if(!req.app.get("db_connected")) {
        return res.status(500);
    }

    var {gameName, uid, branch} = req.body
    if (!util.isValidValue(uid)) {
        res.status(200).json({result: {sucess:false, msg: strings.err.noData}})
        return
    }  

    var filter = {
        uid        
    }       

    if (jwt.role !== Roles.SUPERADMIN)    
        filter["branch"] = jwt.branch

    const options = {         
    };

    // send query
    await GameModel.deleteOne(
        filter, 
        options
    )
    .then(doc => {
        if(!doc) {         
            res.status(400).json({msg: strings.err.gameDeleteErr})   
        }
        else {
            util.deleteMapFiles(uid, util.branchToCode(branch))
            StatusModel.deleteOne({gameCode: gameName})
            .then(d => {
                res.status(200).json({msg: strings.ok.gameDeleteOK})
            })            
        }
    })
    .catch(err => {
        res.status(400).json({msg: strings.err.gameDeleteErr})   
    })
}

/**
 * The uploading is handled by Multer
 * @param {*} req 
 * @param {*} res 
 * @param {*} jwt 
 */
export function uploadMap(req, res, jwt) {
    res.status(200).json({})
}


/****************** HELPERS ***********************/


/**
 * Converts DB games to an array of objects
 * @param {*} games 
 * @returns 
 */
export function createGameList(games, status) {
    var res = []
    if (games == null)
        return res
    games.forEach(game => {
        var branch = util.codeToBranch(game.branch)
        var active = game.active ? strings.gen.yes : strings.gen.no
        var activeGame = false
        const gameStatus = status.filter(st => st.gameCode === game.uid)
        if (gameStatus.length == 1 && gameStatus[0].active)
            activeGame = true
        var d = util.getDateIL(game.date)
        res.push({gameName:game.gameName, branch , branchCode: util.branchToCode(branch),date: d, version:game.version, active, uid:game.uid,
        readableName: game.readableName, activeGame})
    });
    return res;
}

/**
 * Creates a formatted game object from the DB game
 * @param {*} game 
 * @returns 
 */
export function createGameObj(game) {
    var g = {gameName:game.gameName, branch: game.branch, date: game.date, version:game.version, 
        active: game.active, red:_copyColor(game.red), blue:_copyColor(game.blue), green:_copyColor(game.green),
        uid: game.uid,readableName: game.readableName}
    return g;
}

/******************* INTERNAL **********************/

/**
 * converts a riddle array (DB) to text for textarea with \n
 * @param {*} arr 
 * @returns 
 */
function _convertRiddleToText(arr) {
    var text = ""
    for (var i=0; i< arr.length ; i++) {
        text = `${text}${arr[i].trim()}\n`
    }
    return text
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
        riddles: []
    }
    for (var i=0; i< 5; i++) {
        const text = _convertRiddleToText(col.riddles[i].riddle)
        r.riddles[i] = {
            index: col.riddles[i].index,
            img: _fixRiddleImagePath(col.riddles[i].img),
            vecSize: _convertNumberArray(col.riddles[i].vecSize),
            vecAngle: _convertNumberArray(col.riddles[i].vecAngle),
            text: text,
        }
    }
    return r
}

/**
 * makes sure the path includes only filename
 * @param {*} src 
 * @returns 
 */
function _fixRiddleImagePath(src) {
    if (src.indexOf("/") != -1) {
        src = src.substring(src.indexOf("/")+1)
    }
    return src
}

/**
 * converts a number array (DB) to a string array
 * @param {*} arr 
 * @returns 
 */
function _convertNumberArray(arr) {
    var t = []
    for (var i=0; i<arr.length; i++) {
        t.push(`${arr[i]}`)
    }
    return t
}

/**
 * Formats game data so it could be saved in DB
 * 
 * @param {*} game - the game data in DB
 * @param {*} body - the data to save
 */
function _formatGameForSave( dbData , newData ) {
    dbData.isNew = false
    dbData.version = String((parseFloat(newData.version) + 0.1).toPrecision(2))
    dbData.active = newData.active == 'true' ? true : false
    dbData.date = util.getCurrentDateTime()  
    dbData.branch = dbData.branch,
    
    dbData.readableName = newData.readableName
    
    dbData.red = newData.red
    dbData.blue = newData.blue
    dbData.green = newData.green
    return dbData
}

/**
 * Creates the data for a new game
 * @param {*} gameName 
 * @param {*} branch 
 * @returns 
 */
function _createNewGame(name, branch) {
    var uid = util.getUniqueGameUID()
    var game = {
        isNew: true,
        version: "1.0",
        active: false,
        date: util.getCurrentDateTime(),
        branch, //: util.branchToCode(branch),
        gameName : uid,
        readableName : name,
        uid: uid,
        red: _createTeam('red'),
        blue: _createTeam('blue'),
        green: _createTeam('green')
    }
    return game    
}

/**
 * create a team object
 * @param {*} color 
 * @returns 
 */
function _createTeam(color) {
    var team = {
        riddles: _createEmptyRiddles()
    }
    if (color == 'red') {
        team['color'] = "#c0514d"
        team['bgColor'] = "#ff8f9a"
        team['team'] = strings.gen.redTeam
    }
    else if (color == 'blue') {
        team['color'] = "#4f81bd"
        team['bgColor'] = "#94c4ff"
        team['team'] = strings.gen.blueTeam
    }
    else if (color == 'green') {
        team['color'] = "#9bba59"
        team['bgColor'] = "#96dd89"
        team['team'] = strings.gen.greenTeam
    }
    return team
}

/**
 * create an empty riddle object
 * @returns 
 */
function _createEmptyRiddles() {
    var r = []
    for (var i=1; i<=5; i++) {
        var rdl = {
            index: i,
            img: "empty.png",
            vecSize: [100],
            vecAngle: [30],
            riddle: [strings.riddle.firstLine,strings.riddle.sample1, strings.riddle.sample2, strings.riddle.LastLine] 
        }
        r.push(rdl)
    }
    return r
}

