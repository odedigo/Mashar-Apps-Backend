/**
 * --------------------------
 * Treasure Hunt Application
 * --------------------------
 * 
 * @desc Internal functions
 * 
 * Org: Mashar / Kfar-Sava
 * By: Oded Cnaan
 * Date: March 2024
 */
"use strict";
//================ IMPORTS =================
import * as logger from "./logger.js"
import strings from "../public/lang/strings.js"
import * as util from "./util.js";
import { StatusModel } from "../db/models/StatusModel.js";
import { UserModel } from "../db/models/UserModel.js";
import config from "../config/config.js"



/**
 * Validates if the queried vector (size and angle) are correct
 * Internal function
 * @param {*} form 
 * @returns boolean
 */
export function _checkVector(body, teamData) {
    var errMsg = ''
    var infoMsg = ''

    // form data
    var vs = body.vectorSize
    var va = body.vectorAngle

    // filter the riddle in the given index
    const rdl = teamData.riddles.filter((rdl) => (rdl.index == body.index) )[0]
    var i = 0

    var success = -1; // may be -1 (error), 0 (success of a single vector) or 1-5 (success of multiple vectors)
    if (rdl.vecSize.length == 1) {
        // single vector 
        success = _checkAnswer(vs, va, rdl.vecSize[0], rdl.vecAngle[0]) ? 0 : -1
    }
    else {        
        // multiple vectors in this riddle
        for (; i < rdl.vecSize.length; i++) {
            if (_checkAnswer(vs,va,  rdl.vecSize[i], rdl.vecAngle[i])) {
                success = i+1 // mark the index of this vector in the array
            }
        }
    }

    // Add message on the page    
    if (success == -1) {
        infoMsg = strings.js.badVector
    }
    else {
        var num = 0
        infoMsg = strings.js.goodVector
        if (success > 0) {
            num = success-1
            infoMsg += `<p>שימו לב שזהו הוקטור ה ${success} ברשימה מתוך ${rdl.vecSize.length}</p>`
        }
        infoMsg += `<p class='vector' style='color:${teamData.color}'> (${rdl.vecSize[num]},${rdl.vecAngle[num]}°)</p>` 
    }
    return [success, errMsg, infoMsg];
}
 
/**
 * Checks if the angle and size in the form match those in the json for this riddle
 * Intenal function
 * 
 * @param {*} formSize 
 * @param {*} formAngle 
 * @param {*} jsonSize 
 * @param {*} jsonAngle 
 * @param {*} index 
 * @returns boolean
 */
function _checkAnswer(formSize, formAngle, jsonSize, jsonAngle) {
    var deltaSize = 5
    var deltaAngle = 5
    if(Math.abs(formSize - jsonSize) > deltaSize || Math.abs(formAngle - jsonAngle) > deltaAngle) {
        return false;
    }
    return true
}

/**
 * Report the status of the last vector check
 * @param {*} data 
 * @param {*} team 
 * @param {*} body 
 * @returns 
 */
export function _reportStatus( data, team, gameCode, branchCode) {
    if (!config.app.report_status)
        return

    if (!util.isValidValue(gameCode) || !util.isValidValue(branchCode)) {
        logger.error("Invalid data (branch or index) in _reportStatus")
        return;
    }

    var filter = {
        branchCode,
        gameCode,
        active: true
    }       

    var info = {}
    info[team] = {success:data.success, status:data.status, "stage": data.stage ,"created": util.getCurrentDateTime()}

    var update = {
        $push: info
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
        }
    })
    .catch(err => {
        logger.errorM("catch in statusReport",err)
    })
}
