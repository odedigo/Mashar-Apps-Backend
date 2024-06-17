/**
 * --------------------------
 * --------------------------
 *
 * @desc Lesson Registration model
 *
 * Org: Mashar / Kfar-Sava
 * By: Oded Cnaan
 * Date: March 2024
 */
"use strict";
//================ IMPORTS =================
import { Schema, model } from "mongoose";

var FormDataShema = new Schema({
  qid: String,
  answer: String,
  question: String,
});

var TeacherSchema = new Schema({
  name: String,
  email: String,
});

var LessonRegSchema = new Schema({
  branch: String,
  lesson_date_time: Date,
  form_id: String,
  group: String,
  groupName: String,
  grade: String,
  teacher: TeacherSchema,
  curTeacher: TeacherSchema,
  data: [FormDataShema],
});
LessonRegSchema.set("collection", "lesson_reg");

// Compile model from schema
const LessonRegModel = model("LessonRegModel", LessonRegSchema);
export { LessonRegModel };
