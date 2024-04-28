/**
 * --------------------------
 * Treasure Hunt Application
 * --------------------------
 * 
 * @desc User model
 * 
 * Org: Mashar / Kfar-Sava
 * By: Oded Cnaan
 * Date: March 2024
 */
"use strict";
//================ IMPORTS =================
import { Schema, model } from 'mongoose';

let Roles = {
    SUPERADMIN: 'SUPER-ADMIN',
    ADMIN: 'ADMIN',
    TEACHER: 'TEACHER'
}
var LessonSchema = new Schema({
    weekday: String,
    time: String,
    duration: String
}, { _id : false })
var GroupSchema = new Schema({
    group: String,
    timing: [LessonSchema]
}, { _id : false })

var UserSchema = new Schema({
    username: {
        type: String,
        unique: true
    },
    password: String,
    created: Date,
    name: String,
    branch: String,
    email: String,
    lessons: {
        type: [GroupSchema],
        default: []
    },
    role: { // teacher, admin
        type:String,
        required: true,
        default: Roles.TEACHER
    }
});
UserSchema.set('collection', 'user');

// Compile model from schema
const UserModel = model('UserModel', UserSchema);
export {UserModel, Roles}