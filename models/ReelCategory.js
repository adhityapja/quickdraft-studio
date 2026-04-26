const mongoose = require('mongoose');

const reelCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('ReelCategory', reelCategorySchema);
