"use strict";
//================ IMPORTS =================
import { Schema, model } from "mongoose";

var SchoolPeopleSchema = new Schema({
  role: String,
  name: String,
  phone: String,
  email: String,
  comments: String,
});

var SchoolSchema = new Schema({
  name: String,
  branch: String,
  startYear: Date,
  endYear: Date,
  endSemester: Date,
  sector: {
    type: String,
    enum: ["יהודי", "ערבי", "מעורב"],
  },
  address: String,
  city: String,
  holidayId: String,
  people: [SchoolPeopleSchema],
});
SchoolSchema.set("collection", "schools");

// Compile model from schema
const SchoolModel = model("SchoolModel", SchoolSchema);
export { SchoolModel };
