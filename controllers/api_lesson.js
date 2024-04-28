/**
 * --------------------------
 * Lesson App
 * --------------------------
 * 
 * @desc Controller for lesson operations
 * 
 * Org: Mashar / Kfar-Sava
 * By: Oded Cnaan
 * Date: March 2024
 */
"use strict";
//================ IMPORTS =================
import {Roles, UserModel} from "../db/models/UserModel.js";
import {LsnGroupModel} from "../db/models/LsnGroupModel.js";
import {LsnFormModel} from "../db/models/LsnFormModel.js"
import strings from "../public/lang/strings.js"
import config from "../config/config.js"
import * as util from "../utils/util.js";

export function saveLessonGroups(req, res, jwt) {
    // check if DB properly connected
    if(!req.app.get("db_connected")) {
        return res.status(500);
    }

    var {branch, groups} = req.body
    if (!util.isValidValue(branch) || !util.isValidValue(groups)) {
        return res.status(400).json({msg: strings.err.invalidData})
    }

    groups.forEach(grp => {
        grp.name = grp.name.slice(2)
        if (grp.gid === "-1") {
            grp.gid = util.getUniqueGameUID();
        }
    })

    var filter = {
        branch
    }       
    const options = { 
        upsert: true,
        returnOriginal: false,
        new: true
    }
    var update = {
        $set: {groups}
    }

    LsnGroupModel.findOneAndUpdate(filter, update,options)
    .then(doc => {
        if(!doc) {
            res.status(400).json({Error: strings.err.actionFailed})
        }
        else
            res.status(200).json({msg: strings.ok.actionOK})
    })
    .catch(err => {
        logger.errorM("catch in statusReport",err)
        res.status(400).json({Error: strings.err.actionFailed})
    })
}

/**
 * Save lesson list per user
 * @param {*} req 
 * @param {*} res 
 * @param {*} jwt 
 * @returns 
 */
export function saveLessonList(req, res, jwt) {
    // check if DB properly connected
    if(!req.app.get("db_connected")) {
        return res.status(500);
    }

    var {users} = req.body
    if (!util.isValidValue(users)) {
        return res.status(400).json({msg: strings.err.invalidData})
    }

    var command = []

    for(var i=0; i< users.length; i++) {
        var cmd = { updateOne :
            {
               "filter": {username: users[i].user},
               "update": {"$set": {"lessons": users[i].lessons}}
            }
         }
        command.push(cmd)
    }


    // send query
    UserModel.bulkWrite( command )
    .then(users => {
        res.status(200).json({msg: strings.ok.lsnListSavedOK})
    })
    .catch(err => {
        console.log(err)
        res.status(400).json({msg: strings.err.actionFailed})
    })
}

export async function getLessonGroupList(req, res, jwt, branchCode) {
    // check if DB properly connected
    if(!req.app.get("db_connected")) {
        return res.status(500);
    }

    var filter = {branch: branchCode}           
    // send query with pagination
    var groups = await LsnGroupModel.find(filter)
        .sort({ branch:'desc'})
    return {groups, branch:filter["branch"]}
}

export function createLsnGroupArray(groups) {
    var list = []   
    if (Array.isArray(groups)) {
        if (groups.length === 1) {       
            groups[0].groups.forEach(element => {
                list.push({gid: element.gid, name: element.name})
            });    
        }
    }
    else {
        groups.groups.forEach(element => {
            list.push({gid: element.gid, name: element.name})
        });    
    }
    return list
}

export async function getFormList(req, res, jwt, branchCode) {
    // check if DB properly connected
    if(!req.app.get("db_connected")) {
        return res.status(500);
    }

    var filter = {branch: branchCode}           
    // send query with pagination
    var forms = await LsnFormModel.find(filter)
        .sort({ branch:'desc'})
    var group = await getGroupByBranch(branchCode)
    return {forms, group, branch:filter["branch"]}
}

export async function getGroupByBranch(branch, gid) {
    var group = await LsnGroupModel.findOne({branch})    
    var arr = createLsnGroupArray(group)
    if (util.isValidValue(gid)) {
        var single = arr.filter(item => item.gid == gid)
        if (single.length === 1)
            return {gid: single[0].gid, name: single[0].name}
    }
    return arr;
}

function getGroupFromArray(groups, gid) {
    var single = groups.filter(item => item.gid == gid)
    if (single.length === 1)
        return {gid: single[0].gid, name: single[0].name}
    return null
}

export function createLsnFormList(forms, group) {
    if (forms == null)
        return {}
    var frms = []
    for (var i=0; i < forms.length; i++) {
        var dt = util.isValidValue(forms[i].date) ? util.getDateIL(forms[i].date) : ''
        var f = {uid: forms[i].uid, name: forms[i].name, active: forms[i].active, branchCode: forms[i].branch, branch: util.codeToBranch(forms[i].branch), date: dt,
                group: forms[i].group,qa: util.getQAFromForm(forms[i].qa), title: forms[i].title}
        if (group != null) {
            var g = getGroupFromArray(group,forms[i].group)
            if (g !== null)
                f.groupName = g.name
        }
        frms.push(f)
    }
    return frms
}

export function createEmptyForm(branch) {
    var f = {uid: "-1", name: "שם הטופס", active: false, branchCode: branch, branch: util.codeToBranch(branch), date: util.getDateIL(new Date()),
        group: "", qa: [], title: "כותרת הטופס"}
    return f
}

export async function getForm(uid) {
    var filter = {uid}           
    // send query with pagination
    var form = await LsnFormModel.find(filter)
    return form
}

/**
 * Edit a game
 * 
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
export function editForm(req, res, jwt) {
    // check if DB properly connected
    if(!req.app.get("db_connected")) {
        return res.status(500);
    }

    var {uid} = req.body
    var filter = {
        uid
    }       

    // only super-admins can edit games outside their branch
    if (jwt.role !== Roles.SUPERADMIN) {
        filter["branch"] = jwt.branch
    } 

    // send query
    LsnFormModel.findOne(filter)
    .then(form => {
        if (!form) {
            res.status(400).json({msg: strings.err.formNotFound})
            return
        }
        res.status(200).json({path:`/admin/lsn/editform/${encodeURI(uid)}`})
    }) 
    .catch (error => {
        console.log(error)
        res.status(400).json({msg: strings.err.formNotFound})
    })
}

export function saveForm(req,res, jwt) {
    // check if DB properly connected
    if(!req.app.get("db_connected")) {
        return res.status(500);
    }

    var {uid, form, name, group, active, title, branch} = req.body
    active = (active == "true")
    if (uid === "-1") { // new form
        uid = util.getUniqueGameUID()
    }

    if (form.length == 0) {
        return res.status(400).json({msg: strings.err.formFillAll})
    }

    if (jwt.role !== Roles.SUPERADMIN) {
        if (branch !== jwt.branch) {
            return res.status(400).json({msg: strings.err.formFillAll})
        }
    }

    var filter = {
        uid
    }       

    var date = new Date()

    var update = {
        $set: {qa:form, name, group, active, title, branch, date}
    }

    const options = { 
        upsert: true,
        returnOriginal: false,
        new: true
    };

    // only super-admins can edit games outside their branch
    if (jwt.role !== Roles.SUPERADMIN) {
        filter["branch"] = jwt.branch
    } 

    // send query
    LsnFormModel.findOneAndUpdate(filter, update, options)
    .then(form => {
        if (!form) {
            res.status(400).json({msg: strings.err.formNotFound})
            return
        }
        res.status(200).json({path:`/admin/lsn/editform/${encodeURI(uid)}`, msg: strings.ok.actionOK})
    }) 
    .catch (error => {
        console.log(error)
        res.status(400).json({msg: strings.err.formNotFound})
    })
}