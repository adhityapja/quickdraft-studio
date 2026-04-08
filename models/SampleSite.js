const mongoose = require('mongoose');

const sampleSiteSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, default: '' },
  preview: { type: String, default: '' },
  description: { type: String, default: '' },
  tags: [{ type: String }],
  order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('SampleSite', sampleSiteSchema);
