const Admin = require('../models/Admin');
const SiteSettings = require('../models/SiteSettings');
const Client = require('../models/Client');
const DeliveredContent = require('../models/DeliveredContent');
const SampleSite = require('../models/SampleSite');

module.exports = async function seed() {
  // Default Admin
  const adminExists = await Admin.findOne({ username: 'admin' });
  if (!adminExists) {
    await Admin.create({ username: 'admin', password: 'quickdraft2024' });
    console.log('✅ Default admin → username: admin | password: quickdraft2024');
  }

  // About Settings
  if (!(await SiteSettings.findOne({ key: 'about' }))) {
    await SiteSettings.create({
      key: 'about',
      value: {
        tagline: 'We Craft Digital Experiences',
        description: 'QuickDraft Studio is a creative agency specializing in web development, video editing, social media content, and digital branding. We help businesses build a powerful online presence and tell their story with impact.',
        stats: [
          { number: '50+', label: 'Projects Delivered' },
          { number: '30+', label: 'Happy Clients' },
          { number: '3+', label: 'Years Experience' },
          { number: '100%', label: 'Client Satisfaction' }
        ]
      }
    });
  }

  // Contact Settings
  if (!(await SiteSettings.findOne({ key: 'contact' }))) {
    await SiteSettings.create({
      key: 'contact',
      value: {
        phone: '+91 9600726470',
        email: 'hello@quickdraft.studio',
        instagram: '@quickdraft.studio',
        whatsapp: '+91 9600726470',
        address: 'Tamil Nadu, India'
      }
    });
  }

  // Dummy Clients
  if ((await Client.countDocuments()) === 0) {
    await Client.insertMany([
      { name: 'Creative Brand Co', instagramHandle: '@creativebrand.co', order: 1 },
      { name: 'FoodieHub India', instagramHandle: '@foodiehub.india', order: 2 },
      { name: 'StyleForward Studio', instagramHandle: '@styleforward.studio', order: 3 },
      { name: 'TechNova Labs', instagramHandle: '@technova.labs', order: 4 }
    ]);
    console.log('✅ Seeded dummy clients');
  }

  // Dummy Delivered Content
  if ((await DeliveredContent.countDocuments()) === 0) {
    await DeliveredContent.insertMany([
      { title: 'Brand Story Reel', type: 'Reel', description: 'A 60-second brand story reel crafted for Instagram & Facebook.', order: 1 },
      { title: 'Product Showcase Video', type: 'Video', description: 'High-quality product demo video for e-commerce launch.', order: 2 },
      { title: 'Social Media Pack', type: 'Design', description: '10 branded post templates for Instagram feed.', order: 3 },
      { title: 'Client Testimonial Reel', type: 'Reel', description: 'Testimonial compilation reel for social proof.', order: 4 }
    ]);
    console.log('✅ Seeded dummy delivered content');
  }

  // Dummy Sample Sites
  if ((await SampleSite.countDocuments()) === 0) {
    await SampleSite.insertMany([
      { name: 'Restaurant Website', description: 'Modern restaurant site with menu & reservation system.', tags: ['Restaurant', 'Web Design'], order: 1 },
      { name: 'Photography Portfolio', description: 'Clean minimal portfolio for a professional photographer.', tags: ['Portfolio', 'Photography'], order: 2 },
      { name: 'Fitness Studio Landing', description: 'High-energy landing page for a fitness brand.', tags: ['Fitness', 'Landing Page'], order: 3 }
    ]);
    console.log('✅ Seeded dummy sample sites');
  }
};
