const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const protect = require('../middleware/auth');

const SiteSettings = require('../models/SiteSettings');
const Client = require('../models/Client');
const DeliveredContent = require('../models/DeliveredContent');
const SampleSite = require('../models/SampleSite');
const Admin = require('../models/Admin');

// ── Multer Setup ────────────────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/\.(jpeg|jpg|png|webp|gif)$/i.test(file.originalname)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

// ── File Upload ──────────────────────────────────────────────────────────────
router.post('/upload', protect, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// ── Site Settings (about / contact / landing) ────────────────────────────────
router.get('/settings/:key', async (req, res) => {
  try {
    const setting = await SiteSettings.findOne({ key: req.params.key });
    res.json(setting ? setting.value : {});
  } catch { res.status(500).json({ message: 'Server error' }); }
});

router.put('/settings/:key', protect, async (req, res) => {
  try {
    const setting = await SiteSettings.findOneAndUpdate(
      { key: req.params.key },
      { value: req.body },
      { upsert: true, new: true }
    );
    res.json(setting.value);
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// ── Clients ──────────────────────────────────────────────────────────────────
router.get('/clients', async (req, res) => {
  try {
    res.json(await Client.find().sort({ order: 1, createdAt: -1 }));
  } catch { res.status(500).json({ message: 'Server error' }); }
});

router.post('/clients', protect, upload.single('screenshot'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) data.screenshot = `/uploads/${req.file.filename}`;
    res.status(201).json(await Client.create(data));
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/clients/:id', protect, upload.single('screenshot'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) data.screenshot = `/uploads/${req.file.filename}`;
    const client = await Client.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!client) return res.status(404).json({ message: 'Not found' });
    res.json(client);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/clients/:id', protect, async (req, res) => {
  try {
    await Client.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// ── Delivered Content ─────────────────────────────────────────────────────────
router.get('/delivered', async (req, res) => {
  try {
    res.json(await DeliveredContent.find().sort({ order: 1, createdAt: -1 }));
  } catch { res.status(500).json({ message: 'Server error' }); }
});

router.post('/delivered', protect, upload.single('thumbnail'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) data.thumbnail = `/uploads/${req.file.filename}`;
    res.status(201).json(await DeliveredContent.create(data));
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/delivered/:id', protect, upload.single('thumbnail'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) data.thumbnail = `/uploads/${req.file.filename}`;
    const item = await DeliveredContent.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/delivered/:id', protect, async (req, res) => {
  try {
    await DeliveredContent.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// ── Sample Sites ──────────────────────────────────────────────────────────────
router.get('/samples', async (req, res) => {
  try {
    res.json(await SampleSite.find().sort({ order: 1, createdAt: -1 }));
  } catch { res.status(500).json({ message: 'Server error' }); }
});

router.post('/samples', protect, upload.single('preview'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.body.tags && typeof req.body.tags === 'string')
      data.tags = req.body.tags.split(',').map(t => t.trim()).filter(Boolean);
    if (req.file) data.preview = `/uploads/${req.file.filename}`;
    res.status(201).json(await SampleSite.create(data));
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/samples/:id', protect, upload.single('preview'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.body.tags && typeof req.body.tags === 'string')
      data.tags = req.body.tags.split(',').map(t => t.trim()).filter(Boolean);
    if (req.file) data.preview = `/uploads/${req.file.filename}`;
    const item = await SampleSite.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/samples/:id', protect, async (req, res) => {
  try {
    await SampleSite.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// ── Admin Password Change ─────────────────────────────────────────────────────
router.put('/admin/password', protect, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    const { currentPassword, newPassword } = req.body;
    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });
    admin.password = newPassword;
    await admin.save();
    res.json({ message: 'Password updated successfully' });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

module.exports = router;
