/* ── State ─────────────────────────────────────────────────────────────────── */
let token = localStorage.getItem('qd_token') || '';
let currentUser = localStorage.getItem('qd_user') || '';
let deleteCallback = null;

/* ── API Helper ────────────────────────────────────────────────────────────── */
async function api(method, path, body = null, isFormData = false) {
  const headers = { Authorization: `Bearer ${token}` };
  if (!isFormData && body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: isFormData ? body : (body ? JSON.stringify(body) : null)
  });
  if (res.status === 401) { logout(); return null; }
  return res.json();
}

/* ── Auth ──────────────────────────────────────────────────────────────────── */
async function checkAuth() {
  if (!token) return showLogin();
  const data = await fetch('/api/auth/verify', {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json()).catch(() => null);
  if (!data || !data.valid) return showLogin();
  currentUser = data.username;
  showDashboard();
}

function showLogin() {
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');
}

function showDashboard() {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  document.getElementById('topbarUser').textContent = currentUser;
  loadOverview();
}

document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  const errEl = document.getElementById('loginError');
  btn.textContent = 'Signing in...'; btn.disabled = true; errEl.textContent = '';
  const data = await fetch('/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: document.getElementById('loginUser').value,
      password: document.getElementById('loginPass').value
    })
  }).then(r => r.json()).catch(() => ({ message: 'Network error' }));
  btn.textContent = 'Sign In'; btn.disabled = false;
  if (data.token) {
    token = data.token; currentUser = data.username;
    localStorage.setItem('qd_token', token);
    localStorage.setItem('qd_user', currentUser);
    showDashboard();
  } else {
    errEl.textContent = data.message || 'Login failed';
  }
});

function logout() {
  token = ''; currentUser = '';
  localStorage.removeItem('qd_token'); localStorage.removeItem('qd_user');
  showLogin();
}
document.getElementById('logoutBtn').addEventListener('click', logout);

/* ── Navigation ────────────────────────────────────────────────────────────── */
const panelTitles = {
  overview: 'Overview', about: 'About Section',
  delivered: 'Delivered Contents', samples: 'Sample Sites',
  clients: 'Our Clients', reels: 'Demo Reels',
  contact: 'Contact Info', password: 'Change Password'
};

function switchPanel(name) {
  document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`panel-${name}`).classList.remove('hidden');
  document.getElementById(`nb-${name}`)?.classList.add('active');
  document.getElementById('topbarTitle').textContent = panelTitles[name] || name;
  // close any open drawers
  document.querySelectorAll('.drawer').forEach(d => d.classList.add('hidden'));
  // load panel data
  const loaders = {
    overview: loadOverview, about: loadAbout,
    delivered: loadDeliveredList, samples: loadSamplesList,
    clients: loadClientsList, reels: loadReelsList,
    contact: loadContact
  };
  loaders[name]?.();
}

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => switchPanel(btn.dataset.panel));
});

/* ── Overview ──────────────────────────────────────────────────────────────── */
async function loadOverview() {
  const [clients, delivered, samples, reels] = await Promise.all([
    api('GET', '/clients'), api('GET', '/delivered'), api('GET', '/samples'), api('GET', '/demoreels')
  ]);
  document.getElementById('ov-clients').textContent = clients?.length ?? '—';
  document.getElementById('ov-delivered').textContent = delivered?.length ?? '—';
  document.getElementById('ov-samples').textContent = samples?.length ?? '—';
  document.getElementById('ov-reels').textContent = reels?.length ?? '—';
}

/* ── About ─────────────────────────────────────────────────────────────────── */
async function loadAbout() {
  const data = await api('GET', '/settings/about');
  if (!data) return;
  document.getElementById('ab-tagline').value = data.tagline || '';
  document.getElementById('ab-description').value = data.description || '';
  // stats editor
  const statsEditor = document.getElementById('statsEditor');
  const stats = data.stats || [{number:'',label:''},{number:'',label:''},{number:'',label:''},{number:'',label:''}];
  statsEditor.innerHTML = stats.slice(0,4).map((s, i) => `
    <div class="stat-edit-card">
      <label>Stat ${i+1} — Number</label>
      <input type="text" class="stat-num" data-i="${i}" value="${s.number || ''}" placeholder="50+"/>
      <label>Label</label>
      <input type="text" class="stat-lbl" data-i="${i}" value="${s.label || ''}" placeholder="Projects"/>
    </div>`).join('');
}

document.getElementById('aboutForm').addEventListener('submit', async e => {
  e.preventDefault();
  const nums = document.querySelectorAll('.stat-num');
  const lbls = document.querySelectorAll('.stat-lbl');
  const stats = Array.from(nums).map((el, i) => ({ number: el.value, label: lbls[i].value }));
  const payload = {
    tagline: document.getElementById('ab-tagline').value,
    description: document.getElementById('ab-description').value,
    stats
  };
  const res = await api('PUT', '/settings/about', payload);
  showMsg('aboutMsg', res ? 'Saved!' : 'Error saving', !!res);
});

/* ── File Upload Helper ────────────────────────────────────────────────────── */
async function uploadFile(fileInput) {
  if (!fileInput.files[0]) return null;
  const fd = new FormData();
  fd.append('file', fileInput.files[0]);
  const res = await api('POST', '/upload', fd, true);
  return res?.url || null;
}

function previewImage(inputEl, previewEl) {
  inputEl.addEventListener('change', () => {
    const file = inputEl.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    previewEl.innerHTML = `<img src="${url}" alt="preview"/>`;
  });
}

/* ── Delivered Contents ────────────────────────────────────────────────────── */
async function loadDeliveredList() {
  const items = await api('GET', '/delivered');
  const list = document.getElementById('deliveredList');
  if (!items || !items.length) {
    list.innerHTML = '<div class="empty-list">No items yet. Click "+ Add New" to get started.</div>';
    return;
  }
  const EMOJI = { Video:'🎬', Reel:'📱', Design:'🎨', Other:'✨' };
  list.innerHTML = items.map(item => `
    <div class="list-item">
      <div class="list-thumb">
        ${item.thumbnail ? `<img src="${item.thumbnail}" alt="${item.title}"/>` : EMOJI[item.type]||'✨'}
      </div>
      <div class="list-info">
        <div class="list-name">${item.title}</div>
        <div class="list-sub">${item.type} ${item.description ? '· ' + item.description.slice(0,60) + '...' : ''}</div>
      </div>
      <div class="list-actions">
        <button class="btn-icon" onclick="openDeliveredEdit('${item._id}')">Edit</button>
        <button class="btn-icon del" onclick="confirmDel('${item._id}','delivered','${item.title.replace(/'/g,"\\'")}')">Delete</button>
      </div>
    </div>`).join('');
}

document.getElementById('addDeliveredBtn').addEventListener('click', () => openDeliveredDrawer());
document.getElementById('closeDelivered').addEventListener('click', () => document.getElementById('deliveredDrawer').classList.add('hidden'));

function openDeliveredDrawer(data = null) {
  const drawer = document.getElementById('deliveredDrawer');
  document.getElementById('deliveredDrawerTitle').textContent = data ? 'Edit Content' : 'Add Content';
  document.getElementById('d-id').value = data?._id || '';
  document.getElementById('d-title').value = data?.title || '';
  document.getElementById('d-type').value = data?.type || 'Video';
  document.getElementById('d-desc').value = data?.description || '';
  document.getElementById('d-link').value = data?.link || '';
  document.getElementById('d-order').value = data?.order ?? 0;
  document.getElementById('d-thumb-preview').innerHTML = data?.thumbnail
    ? `<img src="${data.thumbnail}" alt="thumb"/>` : '';
  drawer.classList.remove('hidden');
  previewImage(document.getElementById('d-thumb'), document.getElementById('d-thumb-preview'));
}

async function openDeliveredEdit(id) {
  const items = await api('GET', '/delivered');
  const item = items?.find(i => i._id === id);
  if (item) openDeliveredDrawer(item);
}

document.getElementById('deliveredForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const origText = btn.textContent;
  btn.textContent = '⏳ Uploading...';
  btn.disabled = true;
  try {
    const id = document.getElementById('d-id').value;
    const fd = new FormData();
    fd.append('title', document.getElementById('d-title').value);
    fd.append('type', document.getElementById('d-type').value);
    fd.append('description', document.getElementById('d-desc').value);
    fd.append('link', document.getElementById('d-link').value);
    fd.append('order', document.getElementById('d-order').value);
    const fileInput = document.getElementById('d-thumb');
    if (fileInput.files[0]) fd.append('thumbnail', fileInput.files[0]);
    const url = id ? `/api/delivered/${id}` : '/api/delivered';
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers:{Authorization:`Bearer ${token}`}, body: fd }).then(r=>r.json());
    showMsg('deliveredMsg', res?._id ? 'Saved!' : res?.message || 'Error saving', !!res?._id);
    if (res?._id) { loadDeliveredList(); document.getElementById('deliveredDrawer').classList.add('hidden'); }
  } catch (err) {
    showMsg('deliveredMsg', 'Network error: ' + err.message, false);
  } finally {
    btn.textContent = origText;
    btn.disabled = false;
  }
});

/* ── Sample Sites ───────────────────────────────────────────────────────────── */
async function loadSamplesList() {
  const items = await api('GET', '/samples');
  const list = document.getElementById('samplesList');
  if (!items || !items.length) {
    list.innerHTML = '<div class="empty-list">No sample sites yet.</div>'; return;
  }
  list.innerHTML = items.map(item => `
    <div class="list-item">
      <div class="list-thumb">
        ${item.preview ? `<img src="${item.preview}" alt="${item.name}"/>` : '🌐'}
      </div>
      <div class="list-info">
        <div class="list-name">${item.name}</div>
        <div class="list-sub">${item.url || ''} ${item.tags?.length ? '· '+item.tags.join(', ') : ''}</div>
      </div>
      <div class="list-actions">
        <button class="btn-icon" onclick="openSampleEdit('${item._id}')">Edit</button>
        <button class="btn-icon del" onclick="confirmDel('${item._id}','samples','${item.name.replace(/'/g,"\\'")}')">Delete</button>
      </div>
    </div>`).join('');
}

document.getElementById('addSampleBtn').addEventListener('click', () => openSampleDrawer());
document.getElementById('closeSamples').addEventListener('click', () => document.getElementById('samplesDrawer').classList.add('hidden'));

function openSampleDrawer(data = null) {
  const drawer = document.getElementById('samplesDrawer');
  document.getElementById('samplesDrawerTitle').textContent = data ? 'Edit Site' : 'Add Site';
  document.getElementById('s-id').value = data?._id || '';
  document.getElementById('s-name').value = data?.name || '';
  document.getElementById('s-url').value = data?.url || '';
  document.getElementById('s-desc').value = data?.description || '';
  document.getElementById('s-tags').value = data?.tags?.join(', ') || '';
  document.getElementById('s-order').value = data?.order ?? 0;
  document.getElementById('s-preview-preview').innerHTML = data?.preview
    ? `<img src="${data.preview}" alt="preview"/>` : '';
  drawer.classList.remove('hidden');
  previewImage(document.getElementById('s-preview'), document.getElementById('s-preview-preview'));
}

async function openSampleEdit(id) {
  const items = await api('GET', '/samples');
  const item = items?.find(i => i._id === id);
  if (item) openSampleDrawer(item);
}

document.getElementById('samplesForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const origText = btn.textContent;
  btn.textContent = '⏳ Uploading...';
  btn.disabled = true;
  try {
    const id = document.getElementById('s-id').value;
    const fd = new FormData();
    fd.append('name', document.getElementById('s-name').value);
    fd.append('url', document.getElementById('s-url').value);
    fd.append('description', document.getElementById('s-desc').value);
    fd.append('tags', document.getElementById('s-tags').value);
    fd.append('order', document.getElementById('s-order').value);
    const fileInput = document.getElementById('s-preview');
    if (fileInput.files[0]) fd.append('preview', fileInput.files[0]);
    const url = id ? `/api/samples/${id}` : '/api/samples';
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers:{Authorization:`Bearer ${token}`}, body: fd }).then(r=>r.json());
    showMsg('samplesMsg', res?._id ? 'Saved!' : res?.message || 'Error saving', !!res?._id);
    if (res?._id) { loadSamplesList(); document.getElementById('samplesDrawer').classList.add('hidden'); }
  } catch (err) {
    showMsg('samplesMsg', 'Network error: ' + err.message, false);
  } finally {
    btn.textContent = origText;
    btn.disabled = false;
  }
});

/* ── Clients ────────────────────────────────────────────────────────────────── */
async function loadClientsList() {
  const items = await api('GET', '/clients');
  const list = document.getElementById('clientsList');
  if (!items || !items.length) {
    list.innerHTML = '<div class="empty-list">No clients yet.</div>'; return;
  }
  list.innerHTML = items.map(item => `
    <div class="list-item">
      <div class="list-thumb">
        ${item.screenshot ? `<img src="${item.screenshot}" alt="${item.name}"/>` : '📷'}
      </div>
      <div class="list-info">
        <div class="list-name">${item.name}</div>
        <div class="list-sub">${item.instagramHandle}${item.videoLink ? ' · 🎥 Video' : ''}</div>
      </div>
      <div class="list-actions">
        <button class="btn-icon" onclick="openClientEdit('${item._id}')">Edit</button>
        <button class="btn-icon del" onclick="confirmDel('${item._id}','clients','${item.name.replace(/'/g,"\\'")}')">Delete</button>
      </div>
    </div>`).join('');
}

document.getElementById('addClientBtn').addEventListener('click', () => openClientDrawer());
document.getElementById('closeClients').addEventListener('click', () => document.getElementById('clientsDrawer').classList.add('hidden'));

function openClientDrawer(data = null) {
  const drawer = document.getElementById('clientsDrawer');
  document.getElementById('clientsDrawerTitle').textContent = data ? 'Edit Client' : 'Add Client';
  document.getElementById('c-id').value = data?._id || '';
  document.getElementById('c-name').value = data?.name || '';
  document.getElementById('c-handle').value = data?.instagramHandle || '';
  document.getElementById('c-video').value = data?.videoLink || '';
  document.getElementById('c-order').value = data?.order ?? 0;
  document.getElementById('c-screen-preview').innerHTML = data?.screenshot
    ? `<img src="${data.screenshot}" alt="screenshot"/>` : '';
  drawer.classList.remove('hidden');
  previewImage(document.getElementById('c-screen'), document.getElementById('c-screen-preview'));
}

async function openClientEdit(id) {
  const items = await api('GET', '/clients');
  const item = items?.find(i => i._id === id);
  if (item) openClientDrawer(item);
}

document.getElementById('clientsForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const origText = btn.textContent;
  btn.textContent = '⏳ Uploading...';
  btn.disabled = true;
  try {
    const id = document.getElementById('c-id').value;
    const fd = new FormData();
    fd.append('name', document.getElementById('c-name').value);
    fd.append('instagramHandle', document.getElementById('c-handle').value);
    fd.append('videoLink', document.getElementById('c-video').value);
    fd.append('order', document.getElementById('c-order').value);
    const fileInput = document.getElementById('c-screen');
    if (fileInput.files[0]) fd.append('screenshot', fileInput.files[0]);
    const url = id ? `/api/clients/${id}` : '/api/clients';
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers:{Authorization:`Bearer ${token}`}, body: fd }).then(r=>r.json());
    showMsg('clientsMsg', res?._id ? 'Saved!' : res?.message || 'Error saving', !!res?._id);
    if (res?._id) { loadClientsList(); document.getElementById('clientsDrawer').classList.add('hidden'); }
  } catch (err) {
    showMsg('clientsMsg', 'Network error: ' + err.message, false);
  } finally {
    btn.textContent = origText;
    btn.disabled = false;
  }
});

/* ── Demo Reels ─────────────────────────────────────────────────────────────── */
async function loadReelsList() {
  const items = await api('GET', '/demoreels');
  const list = document.getElementById('reelsList');
  if (!items || !items.length) {
    list.innerHTML = '<div class="empty-list">No demo reels yet. Click "+ Add New" to get started.</div>'; return;
  }
  list.innerHTML = items.map(item => `
    <div class="list-item">
      <div class="list-thumb">
        ${item.thumbnail ? `<img src="${item.thumbnail}" alt="${item.title}"/>` : '🎬'}
      </div>
      <div class="list-info">
        <div class="list-name">${item.title}</div>
        <div class="list-sub">${item.videoUrl ? item.videoUrl.slice(0,50) + '...' : ''}</div>
      </div>
      <div class="list-actions">
        <button class="btn-icon" onclick="openReelEdit('${item._id}')">Edit</button>
        <button class="btn-icon del" onclick="confirmDel('${item._id}','demoreels','${item.title.replace(/'/g,"\\'")}')">Delete</button>
      </div>
    </div>`).join('');
}

document.getElementById('addReelBtn').addEventListener('click', () => openReelDrawer());
document.getElementById('closeReels').addEventListener('click', () => document.getElementById('reelsDrawer').classList.add('hidden'));

function openReelDrawer(data = null) {
  const drawer = document.getElementById('reelsDrawer');
  document.getElementById('reelsDrawerTitle').textContent = data ? 'Edit Demo Reel' : 'Add Demo Reel';
  document.getElementById('r-id').value = data?._id || '';
  document.getElementById('r-title').value = data?.title || '';
  document.getElementById('r-videourl').value = data?.videoUrl || '';
  document.getElementById('r-desc').value = data?.description || '';
  document.getElementById('r-order').value = data?.order ?? 0;
  document.getElementById('r-thumb-preview').innerHTML = data?.thumbnail
    ? `<img src="${data.thumbnail}" alt="thumb"/>` : '';
  drawer.classList.remove('hidden');
  previewImage(document.getElementById('r-thumb'), document.getElementById('r-thumb-preview'));
}

async function openReelEdit(id) {
  const items = await api('GET', '/demoreels');
  const item = items?.find(i => i._id === id);
  if (item) openReelDrawer(item);
}

document.getElementById('reelsForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const origText = btn.textContent;
  btn.textContent = '⏳ Uploading...';
  btn.disabled = true;
  try {
    const id = document.getElementById('r-id').value;
    const fd = new FormData();
    fd.append('title', document.getElementById('r-title').value);
    fd.append('videoUrl', document.getElementById('r-videourl').value);
    fd.append('description', document.getElementById('r-desc').value);
    fd.append('order', document.getElementById('r-order').value);
    const fileInput = document.getElementById('r-thumb');
    if (fileInput.files[0]) fd.append('thumbnail', fileInput.files[0]);
    const url = id ? `/api/demoreels/${id}` : '/api/demoreels';
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers:{Authorization:`Bearer ${token}`}, body: fd }).then(r=>r.json());
    showMsg('reelsMsg', res?._id ? 'Saved!' : res?.message || 'Error saving', !!res?._id);
    if (res?._id) { loadReelsList(); document.getElementById('reelsDrawer').classList.add('hidden'); }
  } catch (err) {
    showMsg('reelsMsg', 'Network error: ' + err.message, false);
  } finally {
    btn.textContent = origText;
    btn.disabled = false;
  }
});

/* ── Contact ────────────────────────────────────────────────────────────────── */
async function loadContact() {
  const data = await api('GET', '/settings/contact');
  if (!data) return;
  document.getElementById('ct-phone').value = data.phone || '';
  document.getElementById('ct-altphone').value = data.altPhone || '';
  document.getElementById('ct-email').value = data.email || '';
  document.getElementById('ct-insta').value = data.instagram || '';
  document.getElementById('ct-whatsapp').value = data.whatsapp || '';
  document.getElementById('ct-address').value = data.address || '';
}

document.getElementById('contactForm').addEventListener('submit', async e => {
  e.preventDefault();
  const res = await api('PUT', '/settings/contact', {
    phone: document.getElementById('ct-phone').value,
    altPhone: document.getElementById('ct-altphone').value,
    email: document.getElementById('ct-email').value,
    instagram: document.getElementById('ct-insta').value,
    whatsapp: document.getElementById('ct-whatsapp').value,
    address: document.getElementById('ct-address').value
  });
  showMsg('contactMsg', res ? 'Saved!' : 'Error saving', !!res);
});

/* ── Password Change ────────────────────────────────────────────────────────── */
document.getElementById('passwordForm').addEventListener('submit', async e => {
  e.preventDefault();
  const newPass = document.getElementById('pw-new').value;
  const confirm = document.getElementById('pw-confirm').value;
  if (newPass !== confirm) {
    showMsg('pwMsg', 'Passwords do not match', false); return;
  }
  const res = await api('PUT', '/admin/password', {
    currentPassword: document.getElementById('pw-current').value,
    newPassword: newPass
  });
  showMsg('pwMsg', res?.message || 'Error', res?.message?.includes('updated'));
  if (res?.message?.includes('updated')) e.target.reset();
});

/* ── Delete Confirm ─────────────────────────────────────────────────────────── */
function confirmDel(id, type, name) {
  document.getElementById('confirmText').textContent = `Delete "${name}"? This cannot be undone.`;
  document.getElementById('confirmModal').classList.remove('hidden');
  deleteCallback = async () => {
    await api('DELETE', `/${type}/${id}`);
    document.getElementById('confirmModal').classList.add('hidden');
    const loaders = { clients: loadClientsList, delivered: loadDeliveredList, samples: loadSamplesList, demoreels: loadReelsList };
    loaders[type]?.();
  };
}
document.getElementById('confirmDelete').addEventListener('click', () => deleteCallback?.());
document.getElementById('cancelDelete').addEventListener('click', () => {
  document.getElementById('confirmModal').classList.add('hidden');
});

/* ── Utility ────────────────────────────────────────────────────────────────── */
function showMsg(id, msg, success) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = 'save-msg ' + (success ? 'success' : 'error');
  setTimeout(() => { el.textContent = ''; el.className = 'save-msg'; }, 5000);
}

/* ── Init ───────────────────────────────────────────────────────────────────── */
checkAuth();
