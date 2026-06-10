import LiquidBackground from 'https://cdn.jsdelivr.net/npm/threejs-components@0.0.27/build/backgrounds/liquid1.min.js';

(function initLiquidBg() {
  const canvas = document.getElementById('canvas');
  if (!canvas) return;

  const app = LiquidBackground(canvas);

  // Load our beautiful custom golden liquid marble texture
  app.loadImage('/assets/liquid_texture.png');
  app.liquidPlane.material.metalness = 0.45;
  app.liquidPlane.material.roughness = 0.45;
  app.liquidPlane.uniforms.displacementScale.value = 5;
  app.setRain(false);
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
