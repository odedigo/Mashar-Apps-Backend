"use strict";
//================ IMPORTS =================
import { mongoose, Schema, model } from "mongoose";

var HwMonitorSchema = new Schema({
  student: String,
  isDone: Boolean,
  comments: String,
  grade: Number,
});

var AnnualPlanSchema = new Schema({
  subject: String,
  name: String,
  when: Date,
  duration: Number,
  isOnline: Boolean,
  contents: String,
  homework: String,
  homeworkMonitoring: [HwMonitorSchema],
  hasExperiment: Boolean,
  event: {
    type: String,
    enum: ["שיעור", "מבחן", "הכנה למבחן", "אחר", "בוטל", "חג", "בגרות/מתכונת", "יום שיא"],
  },
  equip: String,
  comments: String,
});

var ClassLessonSchema = new Schema({
  weekday: Number,
  time: String,
  duration: Number,
});

var ClassSchema = new Schema({
  teacher: String,
  year: String,
  school: [String],
  branch: String,
  name: String,
  grade: {
    type: String,
    emum: ["10", "11", "12"],
  },
  comments: String,
  lessons: [ClassLessonSchema],
  plan: [AnnualPlanSchema],
  students: [String],
});
ClassSchema.set("collection", "classes");

// Compile model from schema
const ClassModel = model("ClassModel", ClassSchema);
export { ClassModel };
