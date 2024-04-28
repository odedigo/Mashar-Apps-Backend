/**
 * --------------------------
 * Treasure Hunt Application
 * --------------------------
 * 
 * @desc Logger functions that provide access to the console
 * 
 * Org: Mashar / Kfar-Sava
 * By: Oded Cnaan
 * Date: March 2024
 */
"use strict";
//================ IMPORTS =================
import colors from 'colors';
import conf from "../config/config.js";
var padding = 100;

const config = conf.config

/** 
 * @desc writes INFO messages to the console
 * @param str - the message
 * @param where - the location in the code from which the call was made
 */
export function info(str) {
    if (str == undefined)
        str = "undefined";
    if (config.app.logger_show_info) {                   
        if (typeof str === "object") {
            str = JSON.stringify(str, null, 4)+ "\n";
        }
        console.log(getTime().gray+" INFO: ".green  + str.green.padEnd(padding)+ "[".gray+debugLine().gray+"] ".gray);
    }
}

export function infoM() {
    for (var i=0; i<arguments.length; i++) {
        info(arguments[i])
    }
}

/** 
 * @desc writes INFO messages to the console
 * @param str - the message
 * @param where - the location in the code from which the call was made
 */
export function debug(str) {
    if (str == undefined)
        str = "undefined";
    if (!(process.env.NODE_ENV === 'production')) {                   
        if (typeof str === "object") {
            str = JSON.stringify(str, null, 4) + "\n";
        }
        console.debug(getTime().gray+" DEBUG: ".yellow  + str.yellow.padEnd(padding)+ " [".gray+debugLine().gray+"] ".gray);
    }
}

export function debugM() {
    for (var i=0; i<arguments.length; i++) {
        debug(arguments[i])
    }
}

/** 
 * @desc writes ERROR messages to the console
 * @param str - the message
 * @param where - the location in the code from which the call was made
 */
export function error(str) {
    if (str == undefined)
        str = "undefined";
    if (typeof str === "object") {
        str = JSON.stringify(str, null, 4)+ "\n";
    }
    console.log(getTime().gray+" ERROR: ".bgRed.white + str.red.padEnd(padding) + " [".gray+debugLine().gray+"] ".gray );
}

export function errorM() {
    for (var i=0; i<arguments.length; i++) {
        error(arguments[i])
    }
}

/** 
 * @desc writes a seperator to the console
 */
export function separator() {
    console.log("============================================ ".gray+config.app.name.white+" ============================================".gray);
}

/**
 * Extracts the file and line where the call was made of 
 */
function debugLine() {
    let e = new Error();
    let frame = e.stack.split("\n")[3];
    let lineNumber = frame.split(":")[2];
    let functionName = frame.split(" ")[5];
    return functionName + ":" + lineNumber;
}

function getTime() {
    var d = new Date();
    return timePadZero(d.getHours()) +":"+timePadZero(d.getMinutes())+":"+timePadZero(d.getSeconds());
}

export function getMinEmail() {
    logger.debug("min "+config.validation.email_min_len);
    return config.validation.email_min_len;
}   

export function getMaxEmail() {
    logger.debug("max "+config.validation.email_max_len);
    return config.validation.email_max_len;
}   

function timePadZero(t) {
    if (t<10)
        return " "+t;
    return t;
}