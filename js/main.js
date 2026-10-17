/* main.js — login, rights, Google Sheet persistence, costings list, user admin.
   Loaded after app.js: functions below replace the original single-file versions. */
let ME = null, currentCostingId = null, listCache = [], usersCache = [];
const $ = id => document.getElementById(id);
const can = p => !!(ME && ME.perms.includes(p));
const PERM_LABELS = {
  'costing.create': 'Create/edit own costings', 'costing.viewAll': 'View all costings', 'costing.editAll': 'Edit/delete all costings',
  'costing.delete': 'Delete own costings', 'costing.print': 'Print / PDF', 'master.view': 'View Master Sheet', 'master.edit': 'Edit Master Sheet'
};
const fmtDate = d => d ? new Date(d).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '';
const fail = e => showToast('⚠ ' + e.message, 'error');

/* ---------- login / session ---------- */
function showLogin() { $('appWrap').classList.add('hidden'); $('loginScreen').classList.remove('hidden'); }
async function doLogin(ev) {
  ev.preventDefault(); $('loginErr').textContent = ''; $('loginBtn').disabled = true;
  try {
    const r = await api('login', { username: $('loginUser').value.trim(), password: $('loginPass').value });
    setToken(r.data.token); $('loginPass').value = ''; await enterApp(r.data.user);
  } catch (e) { $('loginErr').textContent = e.message; } finally { $('loginBtn').disabled = false; }
}
function logout() { clearToken(); location.reload(); }
async function enterApp(user) {
  ME = user;
  await loadMaster();
  $('loginScreen').classList.add('hidden'); $('appWrap').classList.remove('hidden');
  $('whoami').textContent = ME.name || ME.username;
  applyPerms(); bootApp(); showPage('costing');
  if (ME.mustChange) openPwd(true);
}
function applyPerms() {
  document.querySelectorAll('[data-perm]').forEach(el => el.style.display = can(el.dataset.perm) ? '' : 'none');
  $('pageMaster').classList.toggle('ro', !can('master.edit'));
}
window.addEventListener('DOMContentLoaded', async () => {
  if (!getToken()) return showLogin();
  try { const r = await api('me'); await enterApp(r.data.user); } catch (e) { showLogin(); }
});

/* ---------- password ---------- */
function openPwd(force) {
  ['pwOld', 'pwNew', 'pwNew2'].forEach(i => $(i).value = '');
  $('pwdNote').textContent = force ? 'You must set a new password before continuing.' : '';
  $('pwdCancel').classList.toggle('hidden', !!force); $('pwdModal').classList.remove('hidden');
}
function closePwd() { $('pwdModal').classList.add('hidden'); }
async function submitPwd() {
  if ($('pwNew').value !== $('pwNew2').value) return ($('pwdNote').textContent = 'Passwords do not match');
  try { await api('changePassword', { oldPassword: $('pwOld').value, newPassword: $('pwNew').value }); ME.mustChange = false; closePwd(); showToast('✓ Password changed'); }
  catch (e) { $('pwdNote').textContent = e.message; }
}

/* ---------- navigation ---------- */
function showPage(page) {
  if ((page === 'master' && !can('master.view')) || (page === 'users' && !can('users.manage'))) page = 'costing';
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.top nav button').forEach(b => b.classList.remove('active'));
  $('page' + page[0].toUpperCase() + page.slice(1)).classList.add('active');
  const nb = $('nav' + page[0].toUpperCase() + page.slice(1)); if (nb) nb.classList.add('active');
  if (page === 'master') { renderAllMaster(); }
  if (page === 'list') loadList().catch(fail);
  if (page === 'users') loadUsers().catch(fail);
}

/* ---------- master data ---------- */
async function loadMaster() {
  const d = (await api('master.get')).data;
  master = d.master; settings.minuteRate = d.settings.minuteRate; settings.numberOfMinutes = d.settings.numberOfMinutes;
  $('minuteRate').value = settings.minuteRate; $('numberOfMinutes').value = settings.numberOfMinutes;
}
function renderAllMaster() { renderMasterCurrencies(); renderMasterFabrics(); renderMasterYarns(); renderMasterDyeing(); renderMasterServices(); renderMasterKnitting(); }
function bootApp() {
  populateCurrencyDropdown(); populateMaterialDropdown(); populateServiceDropdowns(); populateKnittingDropdown();
  renderFabricRows(); renderTrimRows(); renderPackRows(); renderMfgRows(); renderAdjRows();
  renderAllMaster(); updateModeUI(); calc(); updateDates();
}
async function saveMaster() {
  try {
    await api('master.save', { master, settings: { minuteRate: parseFloat($('minuteRate').value) || 3.5, numberOfMinutes: parseFloat($('numberOfMinutes').value) || 7 } });
    showToast('✓ Master data saved to Google Sheet');
  } catch (e) { fail(e); }
}
async function reloadMaster() {
  try { collectCostingState(); const img = productImageData; await loadMaster(); applyCosting(costingState, img); renderAllMaster(); showToast('✓ Master data reloaded', 'info'); }
  catch (e) { fail(e); }
}

/* ---------- costings ---------- */
function showImg(src) {
  productImageData = src || '';
  $('imgPreview').src = productImageData; $('imgPreview').classList.toggle('show', !!src);
  $('imgPlaceholder').classList.toggle('hidden', !!src);
}
function handleImageUpload(ev) {   // shrinks the photo so it fits in one spreadsheet cell
  const f = ev.target.files[0]; if (!f) return;
  const fr = new FileReader(), img = new Image();
  fr.onload = () => { img.src = fr.result; };
  img.onload = () => {
    const s = Math.min(1, 320 / Math.max(img.width, img.height)), c = document.createElement('canvas');
    c.width = img.width * s; c.height = img.height * s; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    let q = .75, out = c.toDataURL('image/jpeg', q);
    while (out.length > 45000 && q > .3) { q -= .1; out = c.toDataURL('image/jpeg', q); }
    showImg(out);
  };
  fr.readAsDataURL(f);
}
function applyCosting(c, img) {
  costingState = { ...costingState, ...c }; const s = costingState;
  $('customer').value = s.customer || ''; $('style').value = s.style || ''; $('size').value = s.size || '';
  $('mode').value = s.mode || 'YARN'; $('color').value = s.color || 'MEDIUM COLOR';
  populateCurrencyDropdown(); populateMaterialDropdown(); populateServiceDropdowns(); populateKnittingDropdown();
  if (s.currency) $('currency').value = s.currency;
  if (s.mainMaterial) $('mainMaterial').value = s.mainMaterial;
  if (s.dyeingService) $('dyeingService').value = s.dyeingService;
  if (s.knittingService) $('knittingService').value = s.knittingService;
  $('rate').value = s.rate || 1; $('currencySymbol').value = $('currency').value;
  renderTrimRows(); renderPackRows(); renderMfgRows(); renderAdjRows(); updateModeUI(); calc();
  showImg(img || '');
}
function newCosting() {
  if (!confirm('Start a new blank costing? Unsaved changes will be lost.')) return;
  currentCostingId = null; $('productImage').value = ''; $('curName').textContent = 'New costing';
  applyCosting({ customer: '', style: '', size: '', currency: 'USD', mode: 'YARN', mainMaterial: '', dyeingService: '', knittingService: '', color: 'MEDIUM COLOR', rate: 1,
    fabricRows: [], trimRows: [], packRows: [], mfgRows: [], adjRows: [] }, '');
}
async function saveCosting(asNew) {
  collectCostingState();
  const name = prompt('Costing name:', costingState.name || [costingState.customer, costingState.style.slice(0, 40)].filter(Boolean).join(' - '));
  if (!name) return;
  costingState.name = name;
  try {
    const r = await api('costing.save', { id: asNew ? null : currentCostingId, name, costing: costingState, image: productImageData });
    currentCostingId = r.data.id; $('curName').textContent = name; showToast('✓ Saved to Google Sheet');
  } catch (e) { fail(e); }
}
async function openCosting(id) {
  try {
    const d = (await api('costing.get', { id })).data;
    currentCostingId = d.id; $('curName').textContent = d.name; applyCosting(d.costing, d.image); showPage('costing');
  } catch (e) { fail(e); }
}
async function deleteCosting(id) {
  if (!confirm('Delete this costing permanently?')) return;
  try { await api('costing.delete', { id }); if (id === currentCostingId) currentCostingId = null; await loadList(); } catch (e) { fail(e); }
}
async function loadList() { listCache = (await api('costing.list')).data; renderList(); }
function renderList() {
  const q = $('searchCosting').value.toLowerCase();
  const canDel = r => r.owner === ME.username ? can('costing.delete') : can('costing.editAll');
  $('costingList').innerHTML = listCache.filter(r => !q || (r.name + r.customer + r.style + r.owner).toLowerCase().includes(q)).map(r =>
    `<tr><td>${esc(r.name)}</td><td>${esc(r.customer)}</td><td>${esc(r.style)}</td><td>${esc(r.owner)}</td><td>${fmtDate(r.updatedAt)}</td>
     <td><button class="btn-sm btn-add" onclick="openCosting('${esc(r.id)}')">Open</button> ${canDel(r) ? `<button class="btn-sm btn-del" onclick="deleteCosting('${esc(r.id)}')">×</button>` : ''}</td></tr>`
  ).join('') || '<tr><td colspan="6">No costings yet</td></tr>';
}

/* ---------- user administration ---------- */
const permBoxes = (sel, cls, disabled) => Object.keys(PERM_LABELS).map(p =>
  `<td><input type="checkbox" class="${cls}" data-p="${p}"${sel.includes(p) ? ' checked' : ''}${disabled ? ' disabled' : ''}></td>`).join('');
async function loadUsers() {
  usersCache = (await api('users.list')).data;
  $('userHead').innerHTML = '<tr><th>Username</th><th>Name</th><th>Role</th><th>Active</th>' +
    Object.values(PERM_LABELS).map(l => `<th>${l}</th>`).join('') + '<th>Last login</th><th>Actions</th></tr>';
  $('nuPerms').innerHTML = Object.entries(PERM_LABELS).map(([p, l]) =>
    `<label class="perm-chip"><input type="checkbox" class="nu-perm" data-p="${p}"${['costing.create', 'costing.print'].includes(p) ? ' checked' : ''}>${l}</label>`).join('');
  $('userRows').innerHTML = usersCache.map(u =>
    `<tr data-u="${esc(u.username)}"><td><b>${esc(u.username)}</b></td><td><input class="u-name" value="${esc(u.name)}"></td>
     <td><select class="u-role" onchange="roleChanged(this)"><option value="user"${u.role === 'user' ? ' selected' : ''}>User</option><option value="admin"${u.role === 'admin' ? ' selected' : ''}>Admin</option></select></td>
     <td><input type="checkbox" class="u-active"${u.active ? ' checked' : ''}></td>${permBoxes(u.perms, 'u-perm', u.role === 'admin')}
     <td>${fmtDate(u.lastLogin)}</td>
     <td><button class="btn-sm btn-add" onclick="saveUser(this)">Save</button> <button class="btn-sm warn" onclick="resetUser(this)">Reset PW</button> <button class="btn-sm btn-del" onclick="deleteUser(this)">×</button></td></tr>`).join('');
}
function roleChanged(sel) { sel.closest('tr').querySelectorAll('.u-perm').forEach(c => c.disabled = sel.value === 'admin'); }
async function saveUser(btn) {
  const r = btn.closest('tr');
  try {
    await api('users.save', { user: { username: r.dataset.u, name: r.querySelector('.u-name').value, role: r.querySelector('.u-role').value,
      active: r.querySelector('.u-active').checked, perms: [...r.querySelectorAll('.u-perm:checked')].map(c => c.dataset.p) } });
    showToast('✓ User saved'); loadUsers();
  } catch (e) { fail(e); }
}
async function addUser() {
  try {
    await api('users.save', { password: $('nuPass').value, user: { username: $('nuUser').value, name: $('nuName').value, role: $('nuRole').value, active: true,
      perms: [...document.querySelectorAll('.nu-perm:checked')].map(c => c.dataset.p) } });
    ['nuUser', 'nuName', 'nuPass'].forEach(i => $(i).value = ''); showToast('✓ User created — they must change the password at first login'); loadUsers();
  } catch (e) { fail(e); }
}
async function resetUser(btn) {
  const u = btn.closest('tr').dataset.u, pw = prompt(`New temporary password for "${u}" (8+ characters):`);
  if (!pw) return;
  try { await api('users.reset', { username: u, password: pw }); showToast('✓ Password reset — user must change it at next login'); } catch (e) { fail(e); }
}
async function deleteUser(btn) {
  const u = btn.closest('tr').dataset.u;
  if (!confirm(`Delete user "${u}"? Their saved costings stay in the sheet.`)) return;
  try { await api('users.delete', { username: u }); loadUsers(); } catch (e) { fail(e); }
}
