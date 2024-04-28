/**
 * --------------------------
 * Treasure Hunt Application
 * --------------------------
 * 
 * @desc Game model
 * 
 * Org: Mashar / Kfar-Sava
 * By: Oded Cnaan
 * Date: March 2024
 */
"use strict";
//================ IMPORTS =================

import { Schema , model } from 'mongoose';


var RiddleSchema = new Schema({
    index: Number,
    img: String,
    vecSize: [Number],
    vecAngle: [Number],
    riddle: [String]
}, { _id : false });

var GameSchema = new Schema({
    version: {
        type: String,
        default: "1.0"
    },
    date: String,
    active: {
        type: Boolean,
        default: false
    },
    branch: String,
    gameName: {
        type: String,
        unique: true
    },
    readableName: {
        type: String,
        default: "מחפשים את המטמון"
    },
    uid: {
        type: String
    },
    red: {
        team: {
            type: String,
            default: "הקבוצה האדומה"
        },
        color: {
            type: String,
            default: "#c0514d"
        },
        bgColor: {
            type: String,
            default: "#ff8f9a"
        },
        riddles: [RiddleSchema]
    },
    blue: {
        team: {
            type: String,
            default: "הקבוצה הכחולה"
        },
        color: {
            type: String,
            default: "#4f81bd"
        },
        bgColor: {
            type: String,
            default: "#94c4ff"
        },
        riddles: [RiddleSchema]
    },
    green: {
        team: {
            type: String,
            default: "הקבוצה הירוקה"
        },
        color: {
            type: String,
            default: "#9bba59"
        },
        bgColor: {
            type: String,
            default: "#96dd89"
        },
        riddles: [RiddleSchema]
    }
});
GameSchema.set('collection', 'th_treasure');

// Compile model from schema
const GameModel = model('gameModel', GameSchema );
export {GameModel}