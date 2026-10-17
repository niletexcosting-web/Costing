/**
 * Garment Costing — backend (Google Apps Script bound to the Google Sheet).
 * Run setup() once, then Deploy > New deployment > Web app (Execute as: Me, Access: Anyone).
 * The sheet is the database; every request is authenticated and checked against the user's rights here.
 */
const PERMS = ['costing.create', 'costing.viewAll', 'costing.editAll', 'costing.delete', 'costing.print', 'master.view', 'master.edit'];
const HEADERS = {
  Users: ['username', 'name', 'salt', 'hash', 'role', 'perms', 'active', 'mustChange', 'createdAt', 'lastLogin'],
  Costings: ['id', 'name', 'customer', 'style', 'owner', 'createdAt', 'updatedAt', 'data', 'image'],
  Currencies: ['code', 'name', 'rate'],
  Fabrics: ['name', 'white', 'medium', 'dark'],
  Yarns: ['name', 'price'], Dyeing: ['name', 'price'], Services: ['name', 'price'], Knitting: ['name', 'price'],
  Settings: ['key', 'value']
};
const TEXT_SHEETS = ['Users', 'Costings'];
const SESSION_HOURS = 12;
const SEED = {
 "currencies": [
  {
   "code": "USD",
   "name": "US Dollar",
   "rate": 1
  },
  {
   "code": "EUR",
   "name": "Euro",
   "rate": 59
  },
  {
   "code": "EGP",
   "name": "Egyptian Pound",
   "rate": 51
  }
 ],
 "fabrics": [
  {
   "name": "PIQUE 100% COTTON 230GSM 20/1",
   "white": 310,
   "medium": 335,
   "dark": 345
  },
  {
   "name": "SINGLE JERSEY 100% COTTON 160 GSM 30/1 YARN",
   "white": 310,
   "medium": 335,
   "dark": 345
  },
  {
   "name": "INTERLOCK 100% COTTON 40/1 YARN 220GSM",
   "white": 410,
   "medium": 435,
   "dark": 445
  },
  {
   "name": "SINGLE JERSEY 100% COTTON 175 GSM 40/1 YARN",
   "white": 310,
   "medium": 335,
   "dark": 345
  },
  {
   "name": "SINGLE JERSEY WITH LYCRA 95% COTTON 5% LYCRA180GSM 36/1 YARN",
   "white": 340,
   "medium": 365,
   "dark": 375
  },
  {
   "name": "THERMAL COTTON 100% COTTON 288GSM",
   "white": 383,
   "medium": 383,
   "dark": 383
  },
  {
   "name": "SINGLE JERSEY 100% COTTON 200 GSM 20/1",
   "white": 310,
   "medium": 335,
   "dark": 345
  },
  {
   "name": "SINGLE JERSEY 100% COTTON 160GSM 30/1 EGYPTIAN COTTON",
   "white": 530,
   "medium": 540,
   "dark": 550
  },
  {
   "name": "Rib 2x2 cotton 100% 24/1 Yarn",
   "white": 0,
   "medium": 0,
   "dark": 0
  },
  {
   "name": "Rib 2x2 95% cotton 5% lycra 24/1 yarn lycra 20Y",
   "white": 0,
   "medium": 0,
   "dark": 0
  },
  {
   "name": "Rib 2x1 95% cotton 5% lycra 30/1 yarn lycra 20Y",
   "white": 0,
   "medium": 0,
   "dark": 0
  }
 ],
 "yarns": [
  {
   "name": "YARN 20/1",
   "price": 200
  },
  {
   "name": "YARN 24/1",
   "price": 210
  },
  {
   "name": "YARN 30/1",
   "price": 220
  },
  {
   "name": "YARN 24/1 57%cotton 38% poly 5% lyc",
   "price": 225
  }
 ],
 "dyeing": [
  {
   "name": "DYEING LIGHT",
   "price": 65
  },
  {
   "name": "MEDIUM DYE",
   "price": 80
  },
  {
   "name": "DARK DYE",
   "price": 90
  },
  {
   "name": "BLACK DYE",
   "price": 95
  }
 ],
 "services": [
  {
   "name": "HEAT FIX",
   "price": 5.5
  },
  {
   "name": "OIL REMOVE",
   "price": 3.25
  },
  {
   "name": "SOFTNESS",
   "price": 8.5
  }
 ],
 "knitting": [
  {
   "name": "KNITTING 20",
   "price": 20
  },
  {
   "name": "KNITTING 25",
   "price": 25
  },
  {
   "name": "KNITTING 30",
   "price": 30
  },
  {
   "name": "KNITTING 35",
   "price": 35
  }
 ]
};

/* ---------- setup ---------- */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(HEADERS).forEach(n => {
    const sh = ss.getSheetByName(n) || ss.insertSheet(n);
    if (sh.getLastRow() === 0) { sh.appendRow(HEADERS[n]); sh.setFrozenRows(1); }
  });
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('SECRET')) props.setProperty('SECRET', Utilities.getUuid() + Utilities.getUuid());
  if (!read_('Users').length) {
    const salt = Utilities.getUuid();
    write_('Users', [{ username: 'admin', name: 'Administrator', salt: salt, hash: hash_(salt, 'ChangeMe123!'), role: 'admin', perms: '', active: true, mustChange: true, createdAt: now_(), lastLogin: '' }]);
  }
  if (!read_('Currencies').length) {
    write_('Currencies', SEED.currencies); write_('Fabrics', SEED.fabrics); write_('Yarns', SEED.yarns);
    write_('Dyeing', SEED.dyeing); write_('Services', SEED.services); write_('Knitting', SEED.knitting);
    write_('Settings', [{ key: 'minuteRate', value: 3.5 }, { key: 'numberOfMinutes', value: 7 }]);
  }
  const s1 = ss.getSheetByName('Sheet1');
  if (s1 && s1.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(s1);
  Logger.log('Setup complete. First login: admin / ChangeMe123! (you will be forced to change it).');
}

/* ---------- web entry points ---------- */
function doGet() { return json_({ status: 'ok', service: 'garment-costing' }); }

function doPost(e) {
  const lock = LockService.getScriptLock();
  let out;
  try {
    lock.waitLock(20000);
    const req = JSON.parse(e.postData.contents);
    const fn = ROUTES[req.action];
    if (!fn) throw new Error('Unknown action');
    const me = req.action === 'login' ? null : auth_(req.token);
    out = { status: 'ok', data: fn(req, me) };
  } catch (err) {
    out = err.message === 'AUTH' ? { status: 'auth', error: 'Session expired, please sign in again' } : { status: 'error', error: err.message };
  } finally { try { lock.releaseLock(); } catch (x) {} }
  return json_(out);
}

const ROUTES = {
  login: (r) => {
    const uname = String(r.username || '').trim().toLowerCase();
    const cache = CacheService.getScriptCache(), key = 'fail_' + uname;
    if (Number(cache.get(key) || 0) >= 5) throw new Error('Too many failed attempts. Try again in 10 minutes.');
    const u = read_('Users').find(x => String(x.username).toLowerCase() === uname);
    if (!u || !bool_(u.active) || hash_(u.salt, String(r.password || '')) !== u.hash) {
      cache.put(key, String(Number(cache.get(key) || 0) + 1), 600);
      throw new Error('Invalid username or password');
    }
    cache.remove(key);
    patchUser_(u.username, { lastLogin: now_() });
    return { token: makeToken_(u.username), user: me_(u) };
  },
  me: (r, me) => ({ user: me_(me) }),

  changePassword: (r, me) => {
    const u = read_('Users').find(x => x.username === me.username);
    if (hash_(u.salt, String(r.oldPassword || '')) !== u.hash) throw new Error('Current password is incorrect');
    setPassword_(me.username, r.newPassword, false);
    return true;
  },

  'master.get': () => {
    const st = {}; read_('Settings').forEach(x => st[x.key] = Number(x.value));
    const num = (rows, ks) => rows.map(x => { const o = {}; Object.keys(x).forEach(k => o[k] = ks.indexOf(k) > -1 ? Number(x[k]) || 0 : x[k]); return o; });
    return {
      master: {
        currencies: num(read_('Currencies'), ['rate']), fabrics: num(read_('Fabrics'), ['white', 'medium', 'dark']),
        yarns: num(read_('Yarns'), ['price']), dyeing: num(read_('Dyeing'), ['price']),
        services: num(read_('Services'), ['price']), knitting: num(read_('Knitting'), ['price'])
      },
      settings: { minuteRate: st.minuteRate || 3.5, numberOfMinutes: st.numberOfMinutes || 7 }
    };
  },
  'master.save': (r, me) => {
    need_(me, 'master.edit');
    const m = r.master || {}, keep = (a, k) => (a || []).filter(x => String(x[k] || '').trim() !== '');
    write_('Currencies', keep(m.currencies, 'code')); write_('Fabrics', keep(m.fabrics, 'name'));
    write_('Yarns', keep(m.yarns, 'name')); write_('Dyeing', keep(m.dyeing, 'name'));
    write_('Services', keep(m.services, 'name')); write_('Knitting', keep(m.knitting, 'name'));
    const s = r.settings || {};
    write_('Settings', [{ key: 'minuteRate', value: Number(s.minuteRate) || 3.5 }, { key: 'numberOfMinutes', value: Number(s.numberOfMinutes) || 7 }]);
    return true;
  },

  'costing.list': (r, me) => read_('Costings')
    .filter(x => me.perms.indexOf('costing.viewAll') > -1 || x.owner === me.username)
    .map(x => ({ id: x.id, name: x.name, customer: x.customer, style: x.style, owner: x.owner, updatedAt: x.updatedAt }))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
  'costing.get': (r, me) => {
    const x = read_('Costings').find(c => c.id === r.id);
    if (!x) throw new Error('Costing not found');
    if (x.owner !== me.username) need_(me, 'costing.viewAll');
    return { id: x.id, name: x.name, owner: x.owner, costing: JSON.parse(x.data), image: x.image || '' };
  },
  'costing.save': (r, me) => {
    need_(me, 'costing.create');
    const rows = read_('Costings'), c = r.costing || {}, data = JSON.stringify(c);
    if (data.length > 45000) throw new Error('Costing is too large to save');
    let x = r.id ? rows.find(q => q.id === r.id) : null;
    if (x) { if (x.owner !== me.username) need_(me, 'costing.editAll'); }
    else { x = { id: Utilities.getUuid(), owner: me.username, createdAt: now_() }; rows.push(x); }
    const img = String(r.image || '');
    Object.assign(x, { name: String(r.name || 'Untitled').slice(0, 120), customer: String(c.customer || '').slice(0, 120), style: String(c.style || '').slice(0, 250), updatedAt: now_(), data: data, image: img.length <= 49000 ? img : '' });
    write_('Costings', rows);
    return { id: x.id };
  },
  'costing.delete': (r, me) => {
    const rows = read_('Costings'), x = rows.find(c => c.id === r.id);
    if (!x) throw new Error('Costing not found');
    need_(me, x.owner === me.username ? 'costing.delete' : 'costing.editAll');
    write_('Costings', rows.filter(c => c.id !== r.id));
    return true;
  },

  'users.list': (r, me) => { need_(me, 'users.manage'); return read_('Users').map(u => ({ username: u.username, name: u.name, role: u.role, active: bool_(u.active), mustChange: bool_(u.mustChange), perms: splitPerms_(u.perms), lastLogin: u.lastLogin })); },
  'users.save': (r, me) => {
    need_(me, 'users.manage');
    const p = r.user || {}, uname = String(p.username || '').trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,30}$/.test(uname)) throw new Error('Username: 3-30 chars, letters/numbers/._- only');
    const role = p.role === 'admin' ? 'admin' : 'user';
    const perms = (p.perms || []).filter(x => PERMS.indexOf(x) > -1).join(',');
    const users = read_('Users'); let u = users.find(x => x.username === uname);
    if (!u) {
      if (!r.password) throw new Error('A temporary password is required for new users');
      if (String(r.password).length < 8) throw new Error('Password must be at least 8 characters');
      const salt = Utilities.getUuid();
      u = { username: uname, salt: salt, hash: hash_(salt, String(r.password)), mustChange: true, createdAt: now_(), lastLogin: '' };
      users.push(u);
    }
    Object.assign(u, { name: String(p.name || uname).slice(0, 80), role: role, perms: perms, active: p.active !== false });
    if (!users.some(x => x.role === 'admin' && bool_(x.active))) throw new Error('At least one active admin is required');
    write_('Users', users);
    return true;
  },
  'users.reset': (r, me) => { need_(me, 'users.manage'); setPassword_(String(r.username), r.password, true); return true; },
  'users.delete': (r, me) => {
    need_(me, 'users.manage');
    if (r.username === me.username) throw new Error('You cannot delete your own account');
    const users = read_('Users').filter(x => x.username !== r.username);
    if (!users.some(x => x.role === 'admin' && bool_(x.active))) throw new Error('At least one active admin is required');
    write_('Users', users);
    return true;
  }
};

/* ---------- auth helpers ---------- */
function secret_() { return PropertiesService.getScriptProperties().getProperty('SECRET'); }
function sign_(s) { return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(s, secret_())); }
function makeToken_(u) {
  const p = Utilities.base64EncodeWebSafe(JSON.stringify({ u: u, exp: Date.now() + SESSION_HOURS * 3600000 }));
  return p + '.' + sign_(p);
}
function auth_(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 2 || sign_(parts[0]) !== parts[1]) throw new Error('AUTH');
  const d = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString());
  if (d.exp < Date.now()) throw new Error('AUTH');
  const u = read_('Users').find(x => x.username === d.u);   // re-read every request: rights changes apply instantly
  if (!u || !bool_(u.active)) throw new Error('AUTH');
  return me_(u);
}
function hash_(salt, pw) {
  let h = salt + pw;
  for (let i = 0; i < 500; i++) h = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h + salt));
  return h;
}
function setPassword_(username, pw, mustChange) {
  pw = String(pw || '');
  if (pw.length < 8) throw new Error('Password must be at least 8 characters');
  const salt = Utilities.getUuid();
  patchUser_(username, { salt: salt, hash: hash_(salt, pw), mustChange: mustChange });
}
function patchUser_(username, patch) {
  const users = read_('Users'), u = users.find(x => x.username === username);
  if (!u) throw new Error('User not found');
  Object.assign(u, patch); write_('Users', users);
}
function splitPerms_(s) { return String(s || '').split(',').filter(p => PERMS.indexOf(p) > -1); }
function me_(u) {
  const admin = u.role === 'admin';
  return { username: u.username, name: u.name, role: u.role, mustChange: bool_(u.mustChange), perms: admin ? PERMS.concat(['users.manage']) : splitPerms_(u.perms) };
}
function need_(me, p) { if (me.perms.indexOf(p) < 0) throw new Error('You do not have the right: ' + p); }

/* ---------- sheet helpers ---------- */
function bool_(v) { return v === true || String(v).toLowerCase() === 'true'; }
function now_() { return new Date().toISOString(); }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function read_(n) {
  const v = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(n).getDataRange().getValues();
  if (v.length < 2) return [];
  return v.slice(1).map(r => { const o = {}; v[0].forEach((k, i) => o[k] = r[i]); return o; });
}
function write_(n, rows) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(n), h = HEADERS[n];
  sh.clearContents();
  sh.getRange(1, 1, 1, h.length).setValues([h]);
  if (!rows.length) return;
  const rng = sh.getRange(2, 1, rows.length, h.length);
  if (TEXT_SHEETS.indexOf(n) > -1) rng.setNumberFormat('@');
  // a leading apostrophe stops user text such as "=SUM(...)" from becoming a spreadsheet formula
  rng.setValues(rows.map(o => h.map(k => { const v = o[k] === undefined ? '' : o[k]; return typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v; })));
}
