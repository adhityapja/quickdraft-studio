// ── Liquid Background (same lib as CodePen, dark-purple texture) ─────────────
import LiquidBackground from 'https://cdn.jsdelivr.net/npm/threejs-components@0.0.27/build/backgrounds/liquid1.min.js';

/**
 * Build a 512×512 dark-purple environment texture on a canvas
 * and return it as a data-URL so LiquidBackground can load it.
 * This replaces the rainbow `liquid.webp` from the original CodePen.
 */
function makePurpleTexture() {
  const SIZE = 512;
  const c    = document.createElement('canvas');
  c.width    = SIZE;
  c.height   = SIZE;
  const g    = c.getContext('2d');

  // ── base gradient ──
  const base = g.createLinearGradient(0, 0, SIZE, SIZE);
  base.addColorStop(0.00, '#0b0620');
  base.addColorStop(0.30, '#1e0d45');
  base.addColorStop(0.60, '#0f0730');
  base.addColorStop(1.00, '#060611');
  g.fillStyle = base;
  g.fillRect(0, 0, SIZE, SIZE);

  // ── glowing accent blobs ──
  const blobs = [
    { x: 160, y: 150, r: 230, c0: 'rgba(123,91,219,0.60)',  c1: 'rgba(123,91,219,0)' },
    { x: 390, y: 340, r: 210, c0: 'rgba(80,40,200,0.45)',   c1: 'rgba(80,40,200,0)'  },
    { x: 280, y: 430, r: 180, c0: 'rgba(160,110,255,0.35)', c1: 'rgba(160,110,255,0)'},
    { x: 430, y: 90,  r: 160, c0: 'rgba(90,50,185,0.40)',   c1: 'rgba(90,50,185,0)'  },
    { x:  60, y: 380, r: 150, c0: 'rgba(200,150,255,0.20)', c1: 'rgba(200,150,255,0)'},
  ];
  blobs.forEach(b => {
    const rad = g.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    rad.addColorStop(0, b.c0);
    rad.addColorStop(1, b.c1);
    g.fillStyle = rad;
    g.fillRect(0, 0, SIZE, SIZE);
  });

  return c.toDataURL('image/jpeg', 0.95);
}

// ── init the Three.js liquid ──────────────────────────────────────────────────
const bg = LiquidBackground(document.getElementById('canvas'));
bg.loadImage(makePurpleTexture());
bg.liquidPlane.material.metalness = 0.82;
bg.liquidPlane.material.roughness = 0.18;
bg.liquidPlane.uniforms.displacementScale.value = 5;
bg.setRain(false);

// ── Scroll & Nav Dots ────────────────────────────────────────────────────────
const container = document.getElementById('scrollContainer');
const sections = document.querySelectorAll('.section');
const dots = document.querySelectorAll('.dot');
const navbar = document.getElementById('navbar');

// Dot click → scroll to section
dots.forEach(dot => {
  dot.addEventListener('click', () => {
    const target = document.getElementById(dot.dataset.target);
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
});

// Navbar link click → scroll within container
document.querySelectorAll('.nav-links a, .landing-cta a').forEach(a => {
  a.addEventListener('click', e => {
    const href = a.getAttribute('href');
    if (href && href.startsWith('#')) {
      e.preventDefault();
      const target = document.getElementById(href.slice(1));
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// IntersectionObserver → active dot tracking only
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.dataset.section;
      dots.forEach(d => d.classList.toggle('active', d.dataset.target === id));
    }
  });
}, { threshold: 0.4, root: container });

sections.forEach(s => observer.observe(s));

// Separate observer for .reveal elements — triggers as soon as element enters viewport
// This fixes mobile where the section header can be above-viewport when section loads
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target); // stop watching once visible
    }
  });
}, { threshold: 0.1, root: container });

// Observe all current .reveal elements + re-observe after content loads
function observeRevealEls() {
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
}

// ── Load Content from API ────────────────────────────────────────────────────
async function loadAll() {
  try {
    const [about, delivered, samples, clients, reels, contact] = await Promise.all([
      fetch('/api/settings/about').then(r => r.json()),
      fetch('/api/delivered').then(r => r.json()),
      fetch('/api/samples').then(r => r.json()),
      fetch('/api/clients').then(r => r.json()),
      fetch('/api/demoreels/grouped').then(r => r.json()),
      fetch('/api/settings/contact').then(r => r.json()),
    ]);
    renderAbout(about);
    renderDelivered(delivered);
    renderSamples(samples);
    renderClients(clients);
    renderReels(reels);
    renderContact(contact);
    // Re-observe after dynamic content is injected
    observeRevealEls();
  } catch (err) {
    console.warn('API not reachable, showing defaults:', err.message);
  }
}

// ── About ────────────────────────────────────────────────────────────────────
function renderAbout(data) {
  if (!data || !Object.keys(data).length) return;
  const desc = document.getElementById('aboutDescription');
  if (desc && data.description) desc.textContent = data.description;
  if (data.tagline) {
    const tagEl = document.getElementById('landingTagline');
    if (tagEl) tagEl.textContent = data.tagline;
  }
  if (data.stats && data.stats.length) {
    const grid = document.getElementById('statsGrid');
    if (grid) {
      grid.innerHTML = data.stats.map(s => `
        <div class="stat-card">
          <div class="stat-number">${s.number}</div>
          <div class="stat-label">${s.label}</div>
        </div>`).join('');
    }
  }
}

// ── Delivered ────────────────────────────────────────────────────────────────
const TYPE_EMOJI = { Video: '🎬', Reel: '📱', Design: '🎨', Other: '✨' };

function renderDelivered(items) {
  const grid = document.getElementById('deliveredGrid');
  if (!grid) return;
  if (!items.length) {
    grid.innerHTML = '<div class="empty-state">No delivered content yet. Check back soon!</div>';
    return;
  }
  grid.innerHTML = items.map(item => `
    <div class="content-card">
      <div class="card-thumb">
        ${item.thumbnail
          ? `<img src="${item.thumbnail}" alt="${item.title}" loading="lazy"/>`
          : `<span>${TYPE_EMOJI[item.type] || '✨'}</span>`}
      </div>
      <div class="card-body">
        <span class="card-type type-${item.type}">${item.type}</span>
        <div class="card-title">${item.title}</div>
        <div class="card-desc">${item.description}</div>
        ${item.link ? `<a href="${item.link}" target="_blank" rel="noopener" class="site-link" style="margin-top:8px">View ↗</a>` : ''}
      </div>
    </div>`).join('');
}

// ── Samples ──────────────────────────────────────────────────────────────────
function renderSamples(items) {
  const grid = document.getElementById('samplesGrid');
  if (!grid) return;
  if (!items.length) {
    grid.innerHTML = '<div class="empty-state">Sample sites coming soon!</div>';
    return;
  }
  grid.innerHTML = items.map(item => `
    <div class="site-card">
      <div class="site-preview">
        ${item.preview
          ? `<img src="${item.preview}" alt="${item.name}" loading="lazy"/>`
          : `<span>🌐</span>`}
      </div>
      <div class="site-body">
        <div class="site-name">${item.name}</div>
        <div class="site-desc">${item.description}</div>
        ${item.tags && item.tags.length
          ? `<div class="site-tags">${item.tags.map(t => `<span class="site-tag">${t}</span>`).join('')}</div>`
          : ''}
        ${item.url ? `<a href="${item.url}" target="_blank" rel="noopener" class="site-link">Visit Site ↗</a>` : ''}
      </div>
    </div>`).join('');
}

// ── Clients ──────────────────────────────────────────────────────────────────
let allClients = [];
let clientsExpanded = false;

function renderClients(items) {
  const grid = document.getElementById('clientsGrid');
  const showMoreWrap = document.getElementById('showMoreWrap');
  const showMoreBtn = document.getElementById('showMoreClients');
  if (!grid) return;

  allClients = items;
  clientsExpanded = false;

  if (!items.length) {
    grid.innerHTML = '<div class="empty-state">Our clients list is being updated.</div>';
    if (showMoreWrap) showMoreWrap.style.display = 'none';
    return;
  }

  // Show first 4 initially
  renderClientCards(grid, items.slice(0, 4));

  // Show/hide "Show More" button
  if (items.length > 4 && showMoreWrap) {
    showMoreWrap.style.display = '';
    showMoreBtn.textContent = `Show More (${items.length - 4} more)`;
  } else if (showMoreWrap) {
    showMoreWrap.style.display = 'none';
  }
}

function renderClientCards(grid, clients) {
  grid.innerHTML = clients.map(client => {
    const igUrl = `https://instagram.com/${client.instagramHandle.replace('@', '')}`;
    return `
      <div class="client-card">
        <div class="client-screenshot">
          ${client.screenshot
            ? `<img src="${client.screenshot}" alt="${client.name}" loading="lazy"/>`
            : `<div class="ig-placeholder">
                <div class="ig-icon">📷</div>
                <span style="font-size:0.8rem">${client.instagramHandle}</span>
               </div>`}
        </div>
        <div class="client-footer">
          <div class="client-name">${client.name}</div>
          <div class="client-handle">${client.instagramHandle}</div>
        </div>
        ${client.videoLink
          ? `<a class="client-video-link" href="${client.videoLink}" target="_blank" rel="noopener">▶ Watch Video ↗</a>`
          : ''}
      </div>`;
  }).join('');
}

// Show More / Show Less toggle
document.getElementById('showMoreClients')?.addEventListener('click', () => {
  const grid = document.getElementById('clientsGrid');
  const btn = document.getElementById('showMoreClients');
  if (!grid) return;

  clientsExpanded = !clientsExpanded;

  if (clientsExpanded) {
    renderClientCards(grid, allClients);
    grid.style.maxHeight = 'none';
    btn.textContent = 'Show Less';
  } else {
    renderClientCards(grid, allClients.slice(0, 4));
    grid.style.maxHeight = '';
    btn.textContent = `Show More (${allClients.length - 4} more)`;
  }
});

// ── Demo Reels (grouped by category) ───────────────────────────────────────
function renderReels(groups) {
  const container = document.getElementById('reelsGrid');
  if (!container) return;
  if (!groups.length || groups.every(g => !g.reels.length)) {
    container.innerHTML = '<div class="empty-state">Demo reels coming soon!</div>';
    return;
  }

  const tabsHtml = groups.map((g, i) =>
    `<button class="reel-tab${i === 0 ? ' active' : ''}" data-cat="${g._id}">${g.name}</button>`
  ).join('');

  const panelsHtml = groups.map((g, i) => {
    const cards = g.reels.map(item => `
      <a class="reel-card" href="${item.videoUrl}" target="_blank" rel="noopener">
        <div class="reel-thumb">
          ${item.thumbnail
            ? `<img src="${item.thumbnail}" alt="${item.title}" loading="lazy"/>`
            : `<span>🎬</span>`}
          <div class="reel-play-overlay">
            <div class="reel-play-icon">▶</div>
          </div>
        </div>
        <div class="reel-body">
          <div class="reel-title">${item.title}</div>
          ${item.description ? `<div class="reel-desc">${item.description}</div>` : ''}
        </div>
      </a>`).join('');

    return `<div class="reel-panel${i === 0 ? ' active' : ''}" data-cat="${g._id}">
      ${cards || '<div class="empty-state">No reels in this category yet.</div>'}
    </div>`;
  }).join('');

  container.innerHTML = `
    <div class="reel-tabs">${tabsHtml}</div>
    <div class="reel-panels">${panelsHtml}</div>`;

  container.querySelectorAll('.reel-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.reel-tab').forEach(t => t.classList.remove('active'));
      container.querySelectorAll('.reel-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      container.querySelector(`.reel-panel[data-cat="${tab.dataset.cat}"]`)?.classList.add('active');
    });
  });
}

// ── Contact ──────────────────────────────────────────────────────────────────
function renderContact(data) {
  const cards = document.getElementById('contactCards');
  if (!cards || !data) return;

  const items = [
    data.phone && { icon: '📞', label: 'Phone', val: data.phone, href: `tel:${data.phone}` },
    data.altPhone && { icon: '📱', label: 'Alt. Phone', val: data.altPhone, href: `tel:${data.altPhone}` },
    data.email && { icon: '✉️', label: 'Email', val: data.email, href: `mailto:${data.email}` },
    data.instagram && { icon: '📸', label: 'Instagram', val: data.instagram, href: `https://instagram.com/${data.instagram.replace('@','')}` },
    data.whatsapp && { icon: '💬', label: 'WhatsApp', val: data.whatsapp, href: `https://wa.me/${data.whatsapp.replace(/\\D/g,'')}` },
  ].filter(Boolean);

  cards.innerHTML = items.map(item => `
    <a class="contact-card" href="${item.href}" target="_blank" rel="noopener">
      <div class="contact-icon">${item.icon}</div>
      <div>
        <div class="contact-info-label">${item.label}</div>
        <div class="contact-info-val">${item.val}</div>
      </div>
    </a>`).join('');
}

// ── Contact Form ─────────────────────────────────────────────────────────────
document.getElementById('contactForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const btn      = document.getElementById('sendBtn');
  const feedback = document.getElementById('formFeedback');
  const name     = document.getElementById('cfName').value.trim();
  const email    = document.getElementById('cfEmail').value.trim();
  const message  = document.getElementById('cfMessage').value.trim();

  btn.textContent = 'Sending...';
  btn.disabled = true;
  feedback.textContent = '';
  feedback.className = 'form-feedback';

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, message }),
    });

    const data = await res.json();

    if (res.ok) {
      feedback.textContent = '✅ Message sent! We\'ll get back to you soon.';
      feedback.className = 'form-feedback success';
      e.target.reset();
    } else {
      throw new Error(data.message || 'Something went wrong.');
    }
  } catch (err) {
    feedback.textContent = `❌ ${err.message}`;
    feedback.className = 'form-feedback error';
  } finally {
    btn.textContent = 'Send Message ✨';
    btn.disabled = false;
  }
});

// ── Misc ─────────────────────────────────────────────────────────────────────
document.getElementById('year').textContent = new Date().getFullYear();

// ── Hamburger Menu ───────────────────────────────────────────────────────────
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('navLinks');

hamburger?.addEventListener('click', () => {
  hamburger.classList.toggle('open');
  navLinks.classList.toggle('mobile-open');
  document.body.style.overflow = navLinks.classList.contains('mobile-open') ? 'hidden' : '';
});

// Close menu when any nav link is clicked
navLinks?.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('open');
    navLinks.classList.remove('mobile-open');
    document.body.style.overflow = '';
  });
});

observeRevealEls(); // observe static .reveal elements on page load
loadAll();
