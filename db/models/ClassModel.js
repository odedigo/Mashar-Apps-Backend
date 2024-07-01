"use strict";
//================ IMPORTS =================
import { mongoose, Schema, model } from "mongoose";
import { ExamSchema } from "./ExamModel.js";

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
    enum: ["שיעור", "מבחן", "הכנה למבחן", "אחר", "בוטל", "חג", "בגרות/מתכונת", "יום שיא", "פאבלאב", "מיוחד"],
  },
  note: String,
  equip: String,
  comments: String,
  isDone: Boolean,
});

var ClassLessonSchema = new Schema({
  weekday: Number,
  time: String,
  duration: Number,
});

var Grade = new Schema({
  question: Number,
  subsection: Number,
  grade: Number,
});

var Evaluation = new Schema({
  examEvent: String,
  grade: Number,
  gradeText: String,
  questionGrades: [Grade],
});

var Student = new Schema({
  name: String,
  status: {
    type: String,
    enum: ["פעיל", "עזב", "עבר קבוצה"],
  },
  gender: {
    type: String,
    enum: ["m", "f"],
  },
  school: String,
  classNum: String,
  benefits: String,
  majors: String,
  comments: String,
  evaluation: [Evaluation],
  finals: [Evaluation],
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
  students: [Student],
  examEvents: [ExamSchema],
});
ClassSchema.set("collection", "classes");
// Compile model from schema
const ClassModel = model("ClassModel", ClassSchema);

var PlanTemplateScheme = new Schema({
  name: String,
  grade: String,
  branch: String,
  template: [AnnualPlanSchema],
  version: Number,
});
PlanTemplateScheme.set("collection", "templates");
// Compile model from schema
const PlanTemplateModel = model("PlanTemplateModel", PlanTemplateScheme);

export { ClassModel, PlanTemplateModel };
