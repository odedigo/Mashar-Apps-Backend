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
import { Schema, model } from "mongoose";
import { getDateIL } from "../../utils/util.js";

var OptionsSchema = new Schema(
  {
    value: String,
    option: String,
  },
  { _id: false }
);

var ValidationSchema = new Schema(
  {
    required: {
      type: Boolean,
      required: true,
    },
    minlength: {
      type: Number,
      required: false,
    },
  },
  { _id: false }
);

var QASchema = new Schema(
  {
    q: String,
    type: {
      type: String,
      enum: ["text", "select", "checkbox", "radio"],
      default: "text",
      required: true,
    },
    options: {
      required: false,
      type: [OptionsSchema],
    },
    validation: ValidationSchema,
    qid: {
      type: String,
      unique: true,
      required: true,
    },
  },
  { _id: false }
);

var LsnFormSchema = new Schema({
  branch: String,
  group: String,
  active: Boolean,
  date: String,
  name: String,
  uid: String,
  title: String,
  subtitle: String,
  desc: String,
  qa: [QASchema],
});
LsnFormSchema.set("collection", "lesson_form");
LsnFormSchema.post("find", function (doc) {
  translateDateToIL(doc);
});
LsnFormSchema.post("save", function (doc) {
  translateDateToIL(doc);
});

function translateDateToIL(docs) {
  if (Array.isArray(docs)) {
    docs.forEach((d) => {
      d.date = getDateIL(d.date);
    });
  } else docs.date = getDateIL(docs.date);
}
// Compile model from schema
const LsnFormModel = model("LsnFormModel", LsnFormSchema);
export { LsnFormModel };
