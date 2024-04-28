/**
 * --------------------------
 * Mashar Lesson Application
 * --------------------------
 * 
 * @desc Lesson Group model
 * 
 * Org: Mashar / Kfar-Sava
 * By: Oded Cnaan
 * Date: March 2024
 */
"use strict";
//================ IMPORTS =================
import { Schema, model } from 'mongoose';

var GroupSchema = new Schema({
    gid: String,
    name: String
}, { _id : false })

var LsnGroupSchema = new Schema({
    branch: String,
    groups: [GroupSchema]
});
LsnGroupSchema.set('collection', 'lesson_groups');

// Compile model from schema
const LsnGroupModel = model('LsnGroupModel', LsnGroupSchema);
export {LsnGroupModel}