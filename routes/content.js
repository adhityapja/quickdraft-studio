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

// ── Contact Form ──────────────────────────────────────────────────────────────
router.post('/contact', async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message)
    return res.status(400).json({ message: 'All fields are required.' });

  try {
    // Get the admin's configured email from SiteSettings
    const contactSetting = await SiteSettings.findOne({ key: 'contact' });
    const toEmail = contactSetting?.value?.email;

    if (!toEmail) {
      return res.status(503).json({ message: 'Contact email not configured yet.' });
    }

    const nodemailer = require('nodemailer');

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"QuickDraft Studio" <${process.env.GMAIL_USER}>`,
      to: toEmail,
      replyTo: `"${name}" <${email}>`,
      subject: `📩 New Inquiry from ${name} — QuickDraft Studio`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#060611;color:#E8E8F0;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.1)">
          <div style="background:linear-gradient(135deg,#7B5BDB,#9b7fe8);padding:28px 32px">
            <h2 style="margin:0;color:#fff;font-size:1.4rem">New Contact Form Message</h2>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:0.9rem">QuickDraft Studio Portfolio</p>
          </div>
          <div style="padding:32px">
            <table style="width:100%;border-collapse:collapse">
              <tr>
                <td style="padding:10px 0;color:rgba(232,232,240,0.6);font-size:0.85rem;width:100px">NAME</td>
                <td style="padding:10px 0;font-weight:700">${name}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;color:rgba(232,232,240,0.6);font-size:0.85rem">EMAIL</td>
                <td style="padding:10px 0"><a href="mailto:${email}" style="color:#9b7fe8">${email}</a></td>
              </tr>
            </table>
            <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:20px 0"/>
            <p style="color:rgba(232,232,240,0.6);font-size:0.85rem;margin-bottom:10px">MESSAGE</p>
            <p style="line-height:1.7;background:rgba(255,255,255,0.04);border-radius:8px;padding:16px;border-left:3px solid #7B5BDB">${message.replace(/\n/g, '<br/>')}</p>
            <p style="color:rgba(232,232,240,0.45);font-size:0.78rem;margin-top:24px">You can reply directly to this email to respond to ${name}.</p>
          </div>
        </div>`,
    });

    res.json({ message: 'Message sent successfully!' });
  } catch (err) {
    console.error('Mail error:', err.message);
    res.status(500).json({ message: 'Failed to send email. Please try again.' });
  }
});

module.exports = router;
