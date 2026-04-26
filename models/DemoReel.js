const mongoose = require('mongoose');

const demoReelSchema = new mongoose.Schema({
  title: { type: String, required: true },
  videoUrl: { type: String, required: true },
  thumbnail: { type: String, default: '' },
  description: { type: String, default: '' },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'ReelCategory', required: true },
  order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('DemoReel', demoReelSchema);
