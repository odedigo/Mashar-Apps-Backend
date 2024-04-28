/**
 * --------------------------
 * Mashar Lesson Application
 * --------------------------
 * 
 * @desc Lesson Form model
 * 
 * Org: Mashar / Kfar-Sava
 * By: Oded Cnaan
 * Date: March 2024
 */
"use strict";
//================ IMPORTS =================
import { Schema, model } from 'mongoose';

var OptionsSchema = new Schema({
    value: String,
    option: String
}, { _id : false })

var QASchema = new Schema({
    q: String,
    type: {
        type: String,
        enum: ['text','select','checkbox','radio'],
        default: "text",
        required: true
    },
    options: {
        required: false,
        type: [OptionsSchema]
    }
}, { _id : false })

var LsnFormSchema = new Schema({
    branch: String,
    group: String,
    active: Boolean,
    date: Date,
    name: String,
    uid: String,
    title: String,
    qa: [QASchema]
});
LsnFormSchema.set('collection', 'lesson_form');

// Compile model from schema
const LsnFormModel = model('LsnFormModel', LsnFormSchema);
export {LsnFormModel}