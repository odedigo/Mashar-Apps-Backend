/**
 * --------------------------
 * Treasure Hunt Application
 * --------------------------
 * 
 * @desc Branch model
 * 
 * Org: Mashar / Kfar-Sava
 * By: Oded Cnaan
 * Date: March 2024
 */
"use strict";
//================ IMPORTS =================
import { Schema, model } from 'mongoose';

var BranchSchema = new Schema({
    name: String,
    code: String
}, { _id : false });
BranchSchema.set('collection', 'branches');

// Compile model from schema
const BranchModel = model('BranchModel', BranchSchema);
export {BranchModel}