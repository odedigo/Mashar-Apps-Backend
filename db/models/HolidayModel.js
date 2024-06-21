"use strict";
//================ IMPORTS =================
import { Schema, model } from "mongoose";

var HolidayDataSchema = new Schema({
  name: String,
  from: Date,
  to: Date,
  isVacation: Boolean,
  isLesson: Boolean,
});

var HolidaySchema = new Schema({
  name: String,
  year: String,
  branch: String,
  holidays: [HolidayDataSchema],
});
HolidaySchema.set("collection", "holidays");

// Compile model from schema
const HolidayModel = model("HolidayModel", HolidaySchema);
export { HolidayModel };
