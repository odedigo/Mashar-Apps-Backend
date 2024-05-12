/**
 *
 * @desc Playlist model
 *
 * Org: Mashar / Kfar-Sava
 * By: Oded Cnaan
 * Date: March 2024
 */
"use strict";
//================ IMPORTS =================
import { Schema, model } from "mongoose";

var PlayListSchema = new Schema({
  code: {
    type: String,
    unique: true,
  },
  topic: String,
  name: String,
  order: Number,
  grade: [String],
});
PlayListSchema.set("collection", "yt_playlists");

// Compile model from schema
const PlayListModel = model("PlayListModel", PlayListSchema);
export { PlayListModel };
