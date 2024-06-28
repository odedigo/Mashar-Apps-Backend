/**
 * --------------------------
 * Treasure Hunt Application
 * --------------------------
 *
 * @desc Exam model
 *
 * Org: Mashar / Kfar-Sava
 * By: Oded Cnaan
 * Date: March 2024
 */
"use strict";
//================ IMPORTS =================
import { Schema, model } from "mongoose";

const ExamGrades = new Schema(
  {
    section: String,
    subsection: String,
    maxGrade: Number,
    answer: String,
  },
  { _id: false }
);

var ExamSchema = new Schema({
  name: String,
  subject: [String],
  branch: String,
  year: String,
  link: String,
  classGrade: String,
  period: String,
  grades: [ExamGrades],
  comments: String,
});
ExamSchema.set("collection", "exams");

// Compile model from schema
const ExamModel = model("ExamModel", ExamSchema);
export { ExamModel };
