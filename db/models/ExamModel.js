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

const SubSection = new Schema(
  {
    maxGrade: Number,
    question: String,
    answer: String,
  },
  { _id: false }
);

const ExamQuestions = new Schema(
  {
    text: String,
    sections: [SubSection],
    totalGrade: Number,
  },
  { _id: false }
);

var Mistake = new Schema({
  owner: String,
  text: String,
});

var Suggestion = new Schema({
  owner: String,
  text: String,
});

var ExamSchema = new Schema({
  name: String,
  date: Date,
  subject: [String],
  branch: String,
  year: String,
  link: String,
  isFinalLink: Boolean,
  classGrade: String,
  period: {
    type: String,
    enum: ["SEM1", "SEM2", "30PER", "OTHER"],
  },
  questions: [ExamQuestions],
  comments: String,
  chance: Number,
  isPrivate: Boolean,
  evalType: String, // manual or not
  ref: String, // ref to branch event
  typicalMistakes: [Mistake],
  suggestions: [Suggestion],
  owner: String,
  version: Number,
});
ExamSchema.set("collection", "exams");

// Compile model from schema
const ExamModel = model("ExamModel", ExamSchema);
export { ExamModel, ExamSchema };
