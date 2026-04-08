const mongoose = require('mongoose');

const deliveredContentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ['Video', 'Reel', 'Design', 'Other'], default: 'Other' },
  description: { type: String, default: '' },
  thumbnail: { type: String, default: '' },
  link: { type: String, default: '' },
  order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('DeliveredContent', deliveredContentSchema);
