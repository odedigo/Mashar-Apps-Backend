/**
 * --------------------------
 * Treasure Hunt Application
 * --------------------------
 * 
 * @desc Status model
 * 
 * Org: Mashar / Kfar-Sava
 * By: Oded Cnaan
 * Date: March 2024
 */
"use strict";
//================ IMPORTS =================
import { Schema, model } from 'mongoose';

const StatusEvent = new Schema({
    created: Date,
    stage: Number,
    status: String,
    success: Boolean,
}, { _id : false })

var StatusSchema = new Schema({
    gameCode: {
        type: String,
        unique: true
    },
    startTime: Date,
    active: Boolean,
    branchCode: String,
    red: [StatusEvent],
    green: [StatusEvent],
    blue: [StatusEvent]
});
StatusSchema.set('collection', 'th_status');

// Compile model from schema
const StatusModel = model('StatusModel', StatusSchema);
export {StatusModel}