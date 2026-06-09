// ═══════════════════════════════════════════════════════════════════════════
//  LIGHTFALL BACKGROUND  ─ exact recreation of reactbits.dev/backgrounds/lightfall
//  Radial arcing diagonal streaks fanning out from a top-center vanishing point
//  Deep navy-indigo to dark violet gradient with center blue-purple glow
// ═══════════════════════════════════════════════════════════════════════════

(function initLightfall() {
  const canvas = document.getElementById('canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // ── Config ──────────────────────────────────────────────────────────────
  const COUNT = 240; // dense visual field
  
  // ReactBits palette: white, pale lavender, light cold blue, and vibrant purples
  const COLORS = [
    '#ffffff', '#ffffff', '#ffffff', // white (dominant)
    '#eef2ff', '#e0e7ff',           // cold blue-white
    '#f5f0ff', '#e8dfff',           // pale lavender
    '#c7b3ff', '#b49cff',           // light purple/violet
    '#9b7fe8', '#805cee'            // vibrant violet
  ];

  let W, H;
  let FX, FY; // focal point coords
  let mouse = { x: -9999, y: -9999 };
  let streaks = [];
  let rafId;

  // ── Streak ───────────────────────────────────────────────────────────────
  class Streak {
    constructor(scatter = false) {
      this.reset(scatter);
    }

    reset(scatter = false) {
      // Angle: fan out downwards (roughly from 0.12 * PI to 0.88 * PI)
      // This creates beautiful diagonal angles fanning left and right
      this.theta = (0.12 + Math.random() * 0.76) * Math.PI;

      // Start radius (distance from focal point)
      const maxR = Math.sqrt(W * W + H * H);
      this.r = scatter ? Math.random() * maxR : 10 + Math.random() * 80;

      // Streak properties
      this.len = 60 + Math.random() * 260;
      this.w = 0.3 + Math.random() * 1.5; // fine lines
      this.speed = 1.8 + Math.random() * 4.5;
      
      // Curvature creates arcing path. Left sweeps curve left, right sweeps curve right
      const isLeft = Math.cos(this.theta) < 0;
      this.curvature = (isLeft ? -1 : 1) * (0.00008 + Math.random() * 0.00012);

      this.depth = 0.2 + Math.random() * 0.8;
      this.baseAlpha = 0.07 + this.depth * 0.48;
      
      // Twinkle
      this.twinkSpeed = 0.02 + Math.random() * 0.05;
      this.twinkTime = Math.random() * Math.PI * 2;
      this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    }

    update() {
      this.r += this.speed;
      this.twinkTime += this.twinkSpeed;

      // Base opacity + twinkle oscillation
      this.alpha = this.baseAlpha * (0.6 + 0.4 * Math.sin(this.twinkTime));

      // Coordinate of streak head for mouse distance check
      const headTheta = this.theta + this.curvature * this.r;
      const headX = FX + Math.cos(headTheta) * this.r;
      const headY = FY + Math.sin(headTheta) * this.r;

      // Mouse flaring effect
      const dx = headX - mouse.x;
      const dy = headY - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 220) {
        const boost = (1 - dist / 220) * 0.75;
        this.alpha = Math.min(1.0, this.alpha + boost);
      }

      // Recycle if tail goes off screen
      const tailR = this.r - this.len;
      const tailTheta = this.theta + this.curvature * tailR;
      const tailX = FX + Math.cos(tailTheta) * tailR;
      const tailY = FY + Math.sin(tailTheta) * tailR;

      if (tailY > H + 50 || tailX < -50 || tailX > W + 50) {
        this.reset(false);
      }
    }

    draw() {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter'; // additive blending
      ctx.globalAlpha = this.alpha;

      // Blur for glow
      ctx.shadowBlur = 5 + this.depth * 8;
      ctx.shadowColor = this.color;

      ctx.beginPath();
      const steps = 4;
      let headX, headY, tailX, tailY;

      for (let i = 0; i <= steps; i++) {
        const t = i / steps; // 0 at head, 1 at tail
        const currR = this.r - this.len * t;
        const currTheta = this.theta + this.curvature * currR;
        const px = FX + Math.cos(currTheta) * currR;
        const py = FY + Math.sin(currTheta) * currR;

        if (i === 0) {
          ctx.moveTo(px, py);
          headX = px;
          headY = py;
        } else {
          ctx.lineTo(px, py);
          if (i === steps) {
            tailX = px;
            tailY = py;
          }
        }
      }

      // Gradient from head (opaque) to tail (transparent)
      const grd = ctx.createLinearGradient(headX, headY, tailX, tailY);
      grd.addColorStop(0.0, this.color);
      grd.addColorStop(0.3, hexAlpha(this.color, 0.6));
      grd.addColorStop(1.0, hexAlpha(this.color, 0));

      ctx.strokeStyle = grd;
      ctx.lineWidth = this.w;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();
    }
  }

  // Utility: hex to rgba
  function hexAlpha(hex, a) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  // ── Resize ───────────────────────────────────────────────────────────────
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    // Focal point just above top-center
    FX = W * 0.52;
    FY = -80;
  }

  // ── Render ───────────────────────────────────────────────────────────────
  function render() {
    rafId = requestAnimationFrame(render);

    // Radial gradient background to match reactbits.dev: blue-purple center glow
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    const bgGrd = ctx.createRadialGradient(FX, FY + 100, 50, W / 2, H / 2, Math.max(W, H));
    bgGrd.addColorStop(0, '#251690');       // bright royal blue-purple glow
    bgGrd.addColorStop(0.35, '#120F17');    // exact Lightfall background (#120F17)
    bgGrd.addColorStop(1.0, '#0c0a10');     // dark violet-black edges

    ctx.fillStyle = bgGrd;
    ctx.fillRect(0, 0, W, H);

    // Draw all streaks
    streaks.forEach(s => { s.update(); s.draw(); });

    // Subtle dark vignette overlay
    const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, Math.max(W, H));
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(0.7, 'rgba(0,0,0,0.15)');
    vig.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  }

  // ── Mouse ────────────────────────────────────────────────────────────────
  const landing = document.getElementById('landing');
  if (landing) {
    landing.addEventListener('mousemove', e => {
      const r = landing.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    });
    landing.addEventListener('mouseleave', () => {
      mouse.x = -9999;
      mouse.y = -9999;
    });
  }

  // ── Start ────────────────────────────────────────────────────────────────
  resize();
  streaks = Array.from({ length: COUNT }, () => new Streak(true));
  render();

  window.addEventListener('resize', () => {
    cancelAnimationFrame(rafId);
    resize();
    render();
  });
})();


// ── Scroll & Nav Dots ────────────────────────────────────────────────────────
const container = document.getElementById('scrollContainer');
const sections  = document.querySelectorAll('.section');
const dots      = document.querySelectorAll('.dot');
const navbar    = document.getElementById('navbar');

dots.forEach(dot => {
  dot.addEventListener('click', () => {
    const target = document.getElementById(dot.dataset.target);
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
});

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

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.dataset.section;
      dots.forEach(d => d.classList.toggle('active', d.dataset.target === id));
    }
  });
}, { threshold: 0.4, root: container });

sections.forEach(s => observer.observe(s));

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, root: container });

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
let allClients     = [];
let clientsExpanded = false;

function renderClients(items) {
  const grid        = document.getElementById('clientsGrid');
  const showMoreWrap = document.getElementById('showMoreWrap');
  const showMoreBtn  = document.getElementById('showMoreClients');
  if (!grid) return;

  allClients      = items;
  clientsExpanded = false;

  if (!items.length) {
    grid.innerHTML = '<div class="empty-state">Our clients list is being updated.</div>';
    if (showMoreWrap) showMoreWrap.style.display = 'none';
    return;
  }

  renderClientCards(grid, items.slice(0, 4));

  if (items.length > 4 && showMoreWrap) {
    showMoreWrap.style.display = '';
    showMoreBtn.textContent = `Show More (${items.length - 4} more)`;
  } else if (showMoreWrap) {
    showMoreWrap.style.display = 'none';
  }
}

function renderClientCards(grid, clients) {
  grid.innerHTML = clients.map(client => {
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

document.getElementById('showMoreClients')?.addEventListener('click', () => {
  const grid      = document.getElementById('clientsGrid');
  const btn       = document.getElementById('showMoreClients');
  const section   = document.getElementById('clients');
  const scrollCont = document.getElementById('scrollContainer');
  const moreNote  = document.getElementById('clientsMoreNote');
  if (!grid) return;

  clientsExpanded = !clientsExpanded;

  if (scrollCont) scrollCont.style.scrollSnapType = 'none';

  if (clientsExpanded) {
    renderClientCards(grid, allClients);
    grid.style.maxHeight = 'none';
    btn.textContent = 'Show Less';
    if (moreNote) moreNote.style.display = '';
    if (section) {
      section.style.height      = 'auto';
      section.style.minHeight   = '100vh';
      section.style.scrollSnapAlign = 'none';
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  } else {
    renderClientCards(grid, allClients.slice(0, 4));
    grid.style.maxHeight = '';
    btn.textContent = `Show More (${allClients.length - 4} more)`;
    if (moreNote) moreNote.style.display = 'none';
    if (section) {
      section.style.height      = '';
      section.style.minHeight   = '';
      section.style.scrollSnapAlign = '';
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => {
          if (scrollCont) scrollCont.style.scrollSnapType = '';
        }, 600);
      });
    });
  }
});

// ── Demo Reels (grouped by category) ────────────────────────────────────────
function renderReels(groups) {
  const cont = document.getElementById('reelsGrid');
  if (!cont) return;

  const activeGroups = groups.filter(g => g.reels && g.reels.length > 0);

  if (!activeGroups.length) {
    cont.innerHTML = '<div class="empty-state">Demo reels coming soon!</div>';
    return;
  }

  const tabsHtml = activeGroups.map((g, i) =>
    `<button class="reel-tab${i === 0 ? ' active' : ''}" data-index="${i}">${g.name}</button>`
  ).join('');

  const panelsHtml = activeGroups.map((g, i) => {
    const cards = g.reels.map(item => `
      <a class="reel-card" href="${item.videoUrl || '#'}" target="_blank" rel="noopener noreferrer">
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

    return `<div class="reel-panel${i === 0 ? ' active' : ''}" data-index="${i}">
      ${cards}
    </div>`;
  }).join('');

  cont.innerHTML = `
    <div class="reel-tabs">${tabsHtml}</div>
    <div class="reel-panels">${panelsHtml}</div>`;

  const tabs   = cont.querySelectorAll('.reel-tab');
  const panels = cont.querySelectorAll('.reel-panel');

  tabs.forEach((tab, idx) => {
    tab.addEventListener('click', () => {
      tabs.forEach(t   => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      panels[idx].classList.add('active');
    });
  });
}

// ── Contact ──────────────────────────────────────────────────────────────────
function renderContact(data) {
  const cards = document.getElementById('contactCards');
  if (!cards || !data) return;

  const items = [
    data.phone    && { icon: '📞', label: 'Phone',     val: data.phone,    href: `tel:${data.phone}` },
    data.altPhone && { icon: '📱', label: 'Alt. Phone', val: data.altPhone, href: `tel:${data.altPhone}` },
    data.email    && { icon: '✉️', label: 'Email',     val: data.email,    href: `mailto:${data.email}` },
    data.instagram && { icon: '📸', label: 'Instagram', val: data.instagram, href: `https://instagram.com/${data.instagram.replace('@','')}` },
    data.whatsapp  && { icon: '💬', label: 'WhatsApp',  val: data.whatsapp,  href: `https://wa.me/${data.whatsapp.replace(/\D/g,'')}` },
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
  btn.disabled    = true;
  feedback.textContent  = '';
  feedback.className    = 'form-feedback';

  try {
    const res  = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, message }),
    });
    const data = await res.json();
    if (res.ok) {
      feedback.textContent = '✅ Message sent! We\'ll get back to you soon.';
      feedback.className   = 'form-feedback success';
      e.target.reset();
    } else {
      throw new Error(data.message || 'Something went wrong.');
    }
  } catch (err) {
    feedback.textContent = `❌ ${err.message}`;
    feedback.className   = 'form-feedback error';
  } finally {
    btn.textContent = 'Send Message ✨';
    btn.disabled    = false;
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

navLinks?.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('open');
    navLinks.classList.remove('mobile-open');
    document.body.style.overflow = '';
  });
});

observeRevealEls();
loadAll();
