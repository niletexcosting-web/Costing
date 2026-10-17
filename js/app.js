const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const STORAGE_KEYS = {
  master: 'garmentMasterData_v19',
  costing: 'garmentCostingData_v19',
  settings: 'garmentSettings_v19',
  image: 'garmentProductImage_v19'
};

const DEFAULT_MASTER = {
  currencies: [
    { code: 'USD', name: 'US Dollar', rate: 1 },
    { code: 'EUR', name: 'Euro', rate: 59 },
    { code: 'EGP', name: 'Egyptian Pound', rate: 51 }
  ],
  fabrics: [
    { name: 'PIQUE 100% COTTON 230GSM 20/1', white: 310, medium: 335, dark: 345 },
    { name: 'SINGLE JERSEY 100% COTTON 160 GSM 30/1 YARN', white: 310, medium: 335, dark: 345 },
    { name: 'INTERLOCK 100% COTTON 40/1 YARN 220GSM', white: 410, medium: 435, dark: 445 },
    { name: 'SINGLE JERSEY 100% COTTON 175 GSM 40/1 YARN', white: 310, medium: 335, dark: 345 },
    { name: 'SINGLE JERSEY WITH LYCRA 95% COTTON 5% LYCRA180GSM 36/1 YARN', white: 340, medium: 365, dark: 375 },
    { name: 'THERMAL COTTON 100% COTTON 288GSM', white: 383, medium: 383, dark: 383 },
    { name: 'SINGLE JERSEY 100% COTTON 200 GSM 20/1', white: 310, medium: 335, dark: 345 },
    { name: 'SINGLE JERSEY 100% COTTON 160GSM 30/1 EGYPTIAN COTTON', white: 530, medium: 540, dark: 550 },
    { name: 'Rib 2x2 cotton 100% 24/1 Yarn', white: 0, medium: 0, dark: 0 },
    { name: 'Rib 2x2 95% cotton 5% lycra 24/1 yarn lycra 20Y', white: 0, medium: 0, dark: 0 },
    { name: 'Rib 2x1 95% cotton 5% lycra 30/1 yarn lycra 20Y', white: 0, medium: 0, dark: 0 }
  ],
  yarns: [
    { name: 'YARN 20/1', price: 200 },
    { name: 'YARN 24/1', price: 210 },
    { name: 'YARN 30/1', price: 220 },
    { name: 'YARN 24/1 57%cotton 38% poly 5% lyc', price: 225 }
  ],
  dyeing: [
    { name: 'DYEING LIGHT', price: 65 },
    { name: 'MEDIUM DYE', price: 80 },
    { name: 'DARK DYE', price: 90 },
    { name: 'BLACK DYE', price: 95 }
  ],
  services: [
    { name: 'HEAT FIX', price: 5.5 },
    { name: 'OIL REMOVE', price: 3.25 },
    { name: 'SOFTNESS', price: 8.5 }
  ],
  knitting: [
    { name: 'KNITTING 20', price: 20 },
    { name: 'KNITTING 25', price: 25 },
    { name: 'KNITTING 30', price: 30 },
    { name: 'KNITTING 35', price: 35 }
  ]
};

// >>> الصق رابط Google Apps Script (Web App) هنا مرة واحدة، وهيشتغل على أي جهاز تلقائيًا <<<
const DEFAULT_GAS_URL = '';

const DEFAULT_SETTINGS = { gasUrl: DEFAULT_GAS_URL, minuteRate: 3.5, numberOfMinutes: 7.0 };

let master = JSON.parse(JSON.stringify(DEFAULT_MASTER));
let settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
let costingState = {
  customer: 'DKNY JEANS',
  style: 'DJQT1549 2X2 Rib Crew Nk Short Slv TEE 2X2 RIB, 57% cotton, 38% poly 5% spandex, 250 GSM',
  size: 'M - 3XL', currency: 'USD', rate: 1,
  mode: 'YARN', mainMaterial: 'YARN 24/1 57%cotton 38% poly 5% lyc', color: 'MEDIUM COLOR',
  dyeingService: 'DYEING LIGHT', knittingService: 'KNITTING 35',
  fabricRows: [], trimRows: [], packRows: [], mfgRows: [], adjRows: []
};
let productImageData = '';

function updateDates() {
  const today = new Date();
  const formatted = today.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }) + ' ' + today.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const printEl = document.getElementById('printDate');
  if (printEl) printEl.textContent = formatted;
}

window.addEventListener('beforeprint', updateDates);

let toastTimer;
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast';
  if (type === 'error') toast.classList.add('error');
  if (type === 'info') toast.classList.add('info');
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.classList.remove('show'); }, 2500);
}

function saveAll() {
  saveMasterLocal();
  saveCostingLocal();
  saveSettingsSilent();
  const url = document.getElementById('gasUrl').value.trim();
  if (url) {
    showToast('💾 Saved — syncing to Google Sheets...', 'info');
    saveToGoogleSheets('save', true);
  } else {
    showToast('✓ Saved successfully (local)');
  }
}

function saveSettingsSilent() {
  settings.gasUrl = document.getElementById('gasUrl').value.trim();
  settings.minuteRate = parseFloat(document.getElementById('minuteRate').value) || 3.5;
  settings.numberOfMinutes = parseFloat(document.getElementById('numberOfMinutes').value) || 7.0;
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
}

function init() {
  loadMasterLocal();
  loadSettings();
  loadCostingLocal();
  populateCurrencyDropdown();
  populateMaterialDropdown();
  populateServiceDropdowns();
  populateKnittingDropdown();
  renderFabricRows();
  renderTrimRows();
  renderPackRows();
  renderMfgRows();
  renderAdjRows();
  renderMasterCurrencies();
  renderMasterFabrics();
  renderMasterYarns();
  renderMasterDyeing();
  renderMasterServices();
  renderMasterKnitting();
  updateModeUI();
  calc();
  updateDates();
  setInterval(updateDates, 60000);
  syncMasterFromGoogle(true); // سحب تلقائي عند فتح الملف على أي جهاز
}

function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.top nav button').forEach(b => b.classList.remove('active'));
  if (page === 'costing') {
    document.getElementById('pageCosting').classList.add('active');
    document.getElementById('navCosting').classList.add('active');
  } else if (page === 'master') {
    document.getElementById('pageMaster').classList.add('active');
    document.getElementById('navMaster').classList.add('active');
    renderMasterCurrencies(); renderMasterFabrics(); renderMasterYarns();
    renderMasterDyeing(); renderMasterServices(); renderMasterKnitting();
    document.getElementById('gasUrl').value = settings.gasUrl || '';
    document.getElementById('minuteRate').value = settings.minuteRate;
    document.getElementById('numberOfMinutes').value = settings.numberOfMinutes;
  }
}

function saveMasterLocal() { localStorage.setItem(STORAGE_KEYS.master, JSON.stringify(master)); }
function loadMasterLocal() {
  const saved = localStorage.getItem(STORAGE_KEYS.master);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.currencies && parsed.fabrics && parsed.yarns) {
        master = parsed;
        if (!master.dyeing) master.dyeing = DEFAULT_MASTER.dyeing;
        if (!master.services) master.services = DEFAULT_MASTER.services;
        if (!master.knitting) master.knitting = DEFAULT_MASTER.knitting;
      }
    } catch (e) { console.warn('Master data load error', e); }
  }
  populateCurrencyDropdown();
  populateMaterialDropdown();
  populateServiceDropdowns();
  populateKnittingDropdown();
}
function loadSettings() {
  const saved = localStorage.getItem(STORAGE_KEYS.settings);
  if (saved) {
    try { settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }; }
    catch (e) { console.warn('Settings load error', e); }
  }
  const qp = new URLSearchParams(location.search).get('gas');
  if (qp) settings.gasUrl = qp;
  else if (DEFAULT_GAS_URL) settings.gasUrl = DEFAULT_GAS_URL;
  const gasEl = document.getElementById('gasUrl');
  const minEl = document.getElementById('minuteRate');
  const numEl = document.getElementById('numberOfMinutes');
  if (gasEl) gasEl.value = settings.gasUrl || '';
  if (minEl) minEl.value = settings.minuteRate;
  if (numEl) numEl.value = settings.numberOfMinutes;
}

function collectCostingState() {
  costingState.customer = document.getElementById('customer').value;
  costingState.style = document.getElementById('style').value;
  costingState.size = document.getElementById('size').value;
  costingState.currency = document.getElementById('currency').value;
  costingState.rate = parseFloat(document.getElementById('rate').value) || 1;
  costingState.mode = document.getElementById('mode').value;
  costingState.mainMaterial = document.getElementById('mainMaterial').value;
  costingState.color = document.getElementById('color').value;
  costingState.dyeingService = document.getElementById('dyeingService').value;
  costingState.knittingService = document.getElementById('knittingService').value;

  costingState.fabricRows = [];
  document.querySelectorAll('#fabricRows tr').forEach(tr => {
    costingState.fabricRows.push({
      no: tr.children[0].textContent,
      item: tr.querySelector('.item')?.value || '',
      details: tr.querySelector('.details')?.value || '',
      weight: parseFloat(tr.querySelector('.fw')?.value) || 0,
      type: tr.dataset.type || ''
    });
  });
  costingState.trimRows = [];
  document.querySelectorAll('#trimRows tr').forEach(tr => {
    costingState.trimRows.push({
      no: tr.children[0].textContent,
      item: tr.querySelector('.item')?.value || '',
      details: tr.querySelector('.details')?.value || '',
      consum: parseFloat(tr.querySelector('.consum')?.value) || 0,
      price: parseFloat(tr.querySelector('.upin')?.value) || 0
    });
  });
  costingState.packRows = [];
  document.querySelectorAll('#packRows tr').forEach(tr => {
    costingState.packRows.push({
      no: tr.children[0].textContent,
      item: tr.querySelector('.item')?.value || '',
      details: tr.querySelector('.details')?.value || '',
      consum: parseFloat(tr.querySelector('.consum')?.value) || 0,
      price: parseFloat(tr.querySelector('.upin')?.value) || 0
    });
  });
  costingState.mfgRows = [];
  document.querySelectorAll('#mfgRows tr').forEach(tr => {
    costingState.mfgRows.push({
      no: tr.children[0].textContent,
      item: tr.querySelector('.item')?.value || '',
      details: tr.querySelector('.details')?.value || '',
      consum: parseFloat(tr.querySelector('.consum')?.value) || 0,
      price: parseFloat(tr.querySelector('.upin')?.value) || 0
    });
  });
  costingState.adjRows = [];
  document.querySelectorAll('#adjRows tr').forEach(tr => {
    costingState.adjRows.push({
      item: tr.querySelector('.adjitem')?.value || '',
      pct: parseFloat(tr.querySelector('.pct')?.value) || 0
    });
  });
}

function saveCostingLocal() {
  collectCostingState();
  localStorage.setItem(STORAGE_KEYS.costing, JSON.stringify(costingState));
  if (productImageData) localStorage.setItem(STORAGE_KEYS.image, productImageData);
}

function loadCostingLocal() {
  const saved = localStorage.getItem(STORAGE_KEYS.costing);
  if (saved) {
    try {
      const s = JSON.parse(saved);
      costingState = { ...costingState, ...s };
      document.getElementById('customer').value = s.customer || 'DKNY JEANS';
      document.getElementById('style').value = s.style || '';
      document.getElementById('size').value = s.size || 'M - 3XL';
      document.getElementById('rate').value = s.rate || 1;
      document.getElementById('mode').value = s.mode || 'YARN';
      document.getElementById('color').value = s.color || 'MEDIUM COLOR';
      populateCurrencyDropdown();
      populateMaterialDropdown();
      populateServiceDropdowns();
      populateKnittingDropdown();
      if (s.currency) document.getElementById('currency').value = s.currency;
      if (s.mainMaterial) document.getElementById('mainMaterial').value = s.mainMaterial;
      if (s.dyeingService) document.getElementById('dyeingService').value = s.dyeingService;
      if (s.knittingService) document.getElementById('knittingService').value = s.knittingService;
      if (s.fabricRows) costingState.fabricRows = s.fabricRows;
      if (s.trimRows) costingState.trimRows = s.trimRows;
      if (s.packRows) costingState.packRows = s.packRows;
      if (s.mfgRows) costingState.mfgRows = s.mfgRows;
      if (s.adjRows) costingState.adjRows = s.adjRows;
      renderFabricRows();
      renderTrimRows();
      renderPackRows();
      renderMfgRows();
      renderAdjRows();
      updateModeUI();
      calc();
    } catch (e) { console.warn('Costing load error', e); }
  }
  const img = localStorage.getItem(STORAGE_KEYS.image);
  if (img) {
    productImageData = img;
    const preview = document.getElementById('imgPreview');
    preview.src = img;
    preview.classList.add('show');
    document.getElementById('imgPlaceholder').classList.add('hidden');
  }
}

function clearCosting() {
  if (!confirm('Clear all current costing data? (Master Data will not be affected)')) return;
  document.getElementById('customer').value = '';
  document.getElementById('style').value = '';
  document.getElementById('size').value = '';
  document.getElementById('productImage').value = '';
  productImageData = '';
  const preview = document.getElementById('imgPreview');
  preview.src = ''; preview.classList.remove('show');
  document.getElementById('imgPlaceholder').classList.remove('hidden');
  localStorage.removeItem(STORAGE_KEYS.costing);
  localStorage.removeItem(STORAGE_KEYS.image);
  costingState.fabricRows = [];
  costingState.trimRows = [];
  costingState.packRows = [];
  costingState.mfgRows = [];
  costingState.adjRows = [];
  renderFabricRows();
  renderTrimRows();
  renderPackRows();
  renderMfgRows();
  renderAdjRows();
  calc();
  showToast('✓ Costing cleared', 'info');
}

function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    productImageData = e.target.result;
    const preview = document.getElementById('imgPreview');
    preview.src = productImageData;
    preview.classList.add('show');
    document.getElementById('imgPlaceholder').classList.add('hidden');
    localStorage.setItem(STORAGE_KEYS.image, productImageData);
    showToast('✓ Image loaded');
  };
  reader.readAsDataURL(file);
}

function populateCurrencyDropdown() {
  const sel = document.getElementById('currency');
  const current = sel.value;
  sel.innerHTML = '';
  master.currencies.forEach(c => {
    const o = document.createElement('option');
    o.value = c.code; o.textContent = `${c.code} — ${c.name}`;
    sel.appendChild(o);
  });
  if (current && master.currencies.some(c => c.code === current)) sel.value = current;
  else sel.value = 'USD';
  updateRateFromCurrency();
}
function updateRateFromCurrency() {
  const code = document.getElementById('currency').value;
  const cur = master.currencies.find(c => c.code === code);
  if (cur) {
    document.getElementById('rate').value = cur.rate;
    document.getElementById('currencySymbol').value = cur.code;
  }
}
function getCurrencySymbol() {
  const code = document.getElementById('currency').value;
  const cur = master.currencies.find(c => c.code === code);
  return cur ? cur.code : '$';
}

function populateMaterialDropdown() {
  const sel = document.getElementById('mainMaterial');
  const current = sel.value;
  sel.innerHTML = '';
  const mode = document.getElementById('mode').value;
  if (mode === 'FABRIC') {
    master.fabrics.forEach(f => {
      const o = document.createElement('option');
      o.value = f.name; o.textContent = f.name;
      sel.appendChild(o);
    });
  } else {
    master.yarns.forEach(y => {
      const o = document.createElement('option');
      o.value = y.name; o.textContent = y.name;
      sel.appendChild(o);
    });
  }
  if (current && Array.from(sel.options).some(o => o.value === current)) sel.value = current;
}

function populateServiceDropdowns() {
  const dyeingSel = document.getElementById('dyeingService');
  const curDye = dyeingSel.value;
  dyeingSel.innerHTML = '';
  master.dyeing.forEach(d => {
    const o = document.createElement('option');
    o.value = d.name; o.textContent = `${d.name} (${d.price})`;
    dyeingSel.appendChild(o);
  });
  if (curDye && Array.from(dyeingSel.options).some(o => o.value === curDye)) dyeingSel.value = curDye;
  populateKnittingDropdown();
}

function populateKnittingDropdown() {
  const sel = document.getElementById('knittingService');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '';
  master.knitting.forEach(k => {
    const o = document.createElement('option');
    o.value = k.name; o.textContent = `${k.name} (${k.price})`;
    sel.appendChild(o);
  });
  if (current && Array.from(sel.options).some(o => o.value === current)) sel.value = current;
}

function updateModeUI() {
  const mode = document.getElementById('mode').value;
  const colorRow = document.getElementById('colorRow');
  const dyeingRow = document.getElementById('dyeingRow');
  const knittingRow = document.getElementById('knittingRow');
  const materialLabel = document.getElementById('materialLabel');
  if (mode === 'FABRIC') {
    colorRow.style.display = '';
    dyeingRow.style.display = 'none';
    knittingRow.style.display = 'none';
    materialLabel.textContent = 'FABRIC';
  } else {
    colorRow.style.display = 'none';
    dyeingRow.style.display = '';
    knittingRow.style.display = '';
    materialLabel.textContent = 'YARN';
  }
  populateMaterialDropdown();
  renderFabricRows();
}

function getYarnRawPrice() {
  const yarnName = document.getElementById('mainMaterial').value;
  const yarn = master.yarns.find(y => y.name === yarnName);
  return yarn ? yarn.price : 0;
}
function getFabricRawPrice() {
  const fabName = document.getElementById('mainMaterial').value;
  const color = document.getElementById('color').value;
  const fab = master.fabrics.find(f => f.name === fabName);
  if (!fab) return 0;
  if (color === 'WHITE') return fab.white;
  if (color === 'MEDIUM COLOR') return fab.medium;
  if (color === 'DARK COLORS') return fab.dark;
  return 0;
}
function getDyeingRawPrice() {
  const dyeName = document.getElementById('dyeingService').value;
  const dye = master.dyeing.find(d => d.name === dyeName);
  return dye ? dye.price : 0;
}
function getKnittingRawPrice() {
  const knitName = document.getElementById('knittingService').value;
  const knit = master.knitting.find(k => k.name === knitName);
  return knit ? knit.price : 0;
}

function renderFabricRows() {
  const tb = document.getElementById('fabricRows');
  tb.innerHTML = '';
  const mode = document.getElementById('mode').value;

  if (mode === 'YARN') {
    const yarnName = document.getElementById('mainMaterial').value;
    const dyeName = document.getElementById('dyeingService').value;
    const knitName = document.getElementById('knittingService').value;
    const defaultWeight = 0.215;

    const yarnRows = costingState.fabricRows.length === 3 && costingState.fabricRows[0].type === 'YARN'
      ? costingState.fabricRows
      : [
          { no: '1', item: 'YARN', details: yarnName, weight: defaultWeight, type: 'YARN' },
          { no: '2', item: 'DYEING', details: dyeName, weight: defaultWeight, type: 'DYEING' },
          { no: '3', item: 'KNITTING', details: knitName, weight: defaultWeight, type: 'KNITTING' }
        ];

    yarnRows.forEach((r, i) => {
      const tr = document.createElement('tr');
      tr.dataset.type = r.type || '';
      tr.innerHTML = `
        <td>${esc(r.no || (i+1))}</td>
        <td><input class="item" type="text" value="${esc(r.item || '')}" readonly style="background:#f4f6f8;"></td>
        <td><input class="details" type="text" value="${esc(r.details || '')}" readonly style="background:#f4f6f8;"></td>
        <td><input class="fw" type="number" step="0.001" value="${esc(r.weight || 0)}"></td>
        <td class="dz readonly">0.000</td>
        <td class="up readonly">0.0000</td>
        <td class="cd readonly">$0.00</td>
        <td class="cp readonly">$0.00</td>
        <td class="del-col no-print"><button class="btn-sm btn-del" onclick="this.closest('tr').remove();calc()">×</button></td>
      `;
      tb.appendChild(tr);
    });
  } else {
    const defaultRows = [
      { no: '1', item: 'FABRIC A', details: 'BODY FABRIC', weight: 0.215, type: 'FABRIC' },
      { no: '2', item: 'FABRIC B', details: '', weight: 0, type: 'FABRIC' },
      { no: '3', item: 'FABRIC C', details: '', weight: 0, type: 'FABRIC' }
    ];
    const rows = costingState.fabricRows.length && costingState.fabricRows[0].type === 'FABRIC'
      ? costingState.fabricRows
      : defaultRows;

    rows.forEach((r, i) => {
      const tr = document.createElement('tr');
      tr.dataset.type = 'FABRIC';
      tr.innerHTML = `
        <td>${esc(r.no || (i+1))}</td>
        <td><input class="item" type="text" value="${esc(r.item || '')}" placeholder="ITEM DESCRIPTION"></td>
        <td><input class="details" type="text" value="${esc(r.details || '')}" placeholder="COMPONENT / DETAILS"></td>
        <td><input class="fw" type="number" step="0.001" value="${esc(r.weight || 0)}"></td>
        <td class="dz readonly">0.000</td>
        <td class="up readonly">0.0000</td>
        <td class="cd readonly">$0.00</td>
        <td class="cp readonly">$0.00</td>
        <td class="del-col no-print"><button class="btn-sm btn-del" onclick="this.closest('tr').remove();calc()">×</button></td>
      `;
      tb.appendChild(tr);
    });
  }
  calc();
}

function renderTrimRows() {
  const tb = document.getElementById('trimRows');
  tb.innerHTML = '';
  const defaultTrims = [
    { no: '1', item: 'SEWING THREADS', details: 'METERS / DZ', consum: 232, price: null },
    { no: '2', item: 'MAIN LABEL', details: 'HEAT TRANSFER', consum: 12, price: 0.055 },
    { no: '3', item: 'Neck Tape', details: 'Tape', consum: 12, price: 0.063 },
    { no: '4', item: 'CARE LABEL', details: 'PRINTED CARE TAG', consum: 12, price: 0.04 },
    { no: '5', item: 'TRACKING LABEL', details: 'SECURITY / TRACKING', consum: 12, price: 0.01 },
    { no: '6', item: 'SIZE STRIP STICKER', details: 'SIZE INDICATOR', consum: 12, price: 0 },
    { no: '7', item: 'HANG TAG', details: 'BRAND TAG', consum: 12, price: 0.05 }
  ];
  const rows = costingState.trimRows.length ? costingState.trimRows : defaultTrims;
  rows.forEach((r, i) => {
    const tr = document.createElement('tr');
    const isAuto = (r.price === null || r.price === undefined);
    const priceInput = isAuto
      ? `<td class="upin readonly">0.0000</td>`
      : `<td><input class="upin" type="number" step="0.0001" value="${esc(r.price)}"></td>`;
    tr.innerHTML = `
      <td>${esc(r.no || (i+1))}</td>
      <td><input class="item" type="text" value="${esc(r.item || '')}" placeholder="ITEM DESCRIPTION"></td>
      <td><input class="details" type="text" value="${esc(r.details || '')}" placeholder="COMPONENT / DETAILS"></td>
      <td></td>
      <td><input class="consum" type="number" step="0.01" value="${esc(r.consum || 0)}"></td>
      ${priceInput}
      <td class="cd readonly">$0.00</td>
      <td class="cp readonly">$0.00</td>
      <td class="del-col no-print"><button class="btn-sm btn-del" onclick="this.closest('tr').remove();calc()">×</button></td>
    `;
    tb.appendChild(tr);
  });
  calc();
}

function renderPackRows() {
  const tb = document.getElementById('packRows');
  tb.innerHTML = '';
  const defaultPacks = [
    { no: '1', item: 'POLY BAG', details: 'SINGLE BAG', consum: 12, price: 0.083 },
    { no: '2', item: 'CARTON BOX', details: 'EXPORT CARTON', consum: 12, price: 0.04 },
    { no: '3', item: 'OTHER PACKAGING', details: 'MISCELLANEOUS', consum: 1, price: 1 }
  ];
  const rows = costingState.packRows.length ? costingState.packRows : defaultPacks;
  rows.forEach((r, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${esc(r.no || (i+1))}</td>
      <td><input class="item" type="text" value="${esc(r.item || '')}" placeholder="ITEM DESCRIPTION"></td>
      <td><input class="details" type="text" value="${esc(r.details || '')}" placeholder="COMPONENT / DETAILS"></td>
      <td></td>
      <td><input class="consum" type="number" step="0.01" value="${esc(r.consum || 0)}"></td>
      <td><input class="upin" type="number" step="0.001" value="${esc(r.price || 0)}"></td>
      <td class="cd readonly">$0.00</td>
      <td class="cp readonly">$0.00</td>
      <td class="del-col no-print"><button class="btn-sm btn-del" onclick="this.closest('tr').remove();calc()">×</button></td>
    `;
    tb.appendChild(tr);
  });
  calc();
}

function renderMfgRows() {
  const tb = document.getElementById('mfgRows');
  tb.innerHTML = '';
  const defaultMfg = [
    { no: '1', item: 'CUT & MAKE (C.M)', details: '', auto: true },
    { no: '2', item: 'WASHING', details: 'GARMENT WASH', consum: 0, price: 0, auto: false },
    { no: '3', item: 'PRINTING', details: 'SCREEN / DIGITAL', consum: 0, price: 0, auto: false },
    { no: '4', item: 'EMBROIDERY', details: 'LOGO EMBROIDERY', consum: 12, price: 0.18, auto: false }
  ];
  const rows = costingState.mfgRows.length ? costingState.mfgRows : defaultMfg;
  rows.forEach((r, i) => {
    const tr = document.createElement('tr');
    const isAuto = r.auto === true;
    const consumCell = isAuto
      ? `<td class="consum readonly">0.000</td>`
      : `<td><input class="consum" type="number" step="0.001" value="${esc(r.consum || 0)}"></td>`;
    const priceCell = isAuto
      ? `<td class="upin readonly">0.0000</td>`
      : `<td><input class="upin" type="number" step="0.0001" value="${esc(r.price || 0)}"></td>`;
    tr.innerHTML = `
      <td>${esc(r.no || (i+1))}</td>
      <td><input class="item" type="text" value="${esc(r.item || '')}" placeholder="ITEM DESCRIPTION"></td>
      <td><input class="details" type="text" value="${esc(r.details || '')}" placeholder="COMPONENT / DETAILS"></td>
      ${consumCell}
      ${priceCell}
      <td class="cd readonly">$0.00</td>
      <td class="cp readonly">$0.00</td>
      <td class="del-col no-print"><button class="btn-sm btn-del" onclick="this.closest('tr').remove();calc()">×</button></td>
    `;
    tb.appendChild(tr);
  });
  calc();
}

function renderAdjRows() {
  const tb = document.getElementById('adjRows');
  tb.innerHTML = '';
  const defaultAdj = [
    { item: 'OVERHEAD EXPENSES', pct: 0.14 },
    { item: 'SECOND QUALITY / WASTE ALLOWANCE', pct: 0.05 },
    { item: 'FINANCIAL / BANKING CHARGES', pct: 0 }
  ];
  const rows = costingState.adjRows.length ? costingState.adjRows : defaultAdj;
  rows.forEach((r, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input class="adjitem" type="text" value="${esc(r.item || '')}" placeholder="ADJUSTMENT ITEM"></td>
      <td><input class="pct" type="number" step="0.01" value="${esc(r.pct || 0)}"></td>
      <td class="acd readonly">$0.00</td>
      <td class="acp readonly">$0.00</td>
      <td class="del-col no-print"><button class="btn-sm btn-del" onclick="this.closest('tr').remove();calc()">×</button></td>
    `;
    tb.appendChild(tr);
  });
  calc();
}

function addFabricRow() {
  collectCostingState();
  const mode = document.getElementById('mode').value;
  costingState.fabricRows.push({ no: (costingState.fabricRows.length + 1).toString(), item: '', details: '', weight: 0, type: mode });
  renderFabricRows();
}
function addTrimRow() {
  collectCostingState();
  costingState.trimRows.push({ no: (costingState.trimRows.length + 1).toString(), item: '', details: '', consum: 0, price: 0 });
  renderTrimRows();
}
function addPackRow() {
  collectCostingState();
  costingState.packRows.push({ no: (costingState.packRows.length + 1).toString(), item: '', details: '', consum: 0, price: 0 });
  renderPackRows();
}
function addMfgRow() {
  collectCostingState();
  costingState.mfgRows.push({ no: (costingState.mfgRows.length + 1).toString(), item: '', details: '', consum: 0, price: 0, auto: false });
  renderMfgRows();
}
function addAdjRow() {
  collectCostingState();
  costingState.adjRows.push({ item: '', pct: 0 });
  renderAdjRows();
}

function calc() {
  const rate = parseFloat(document.getElementById('rate').value) || 1;
  const sym = getCurrencySymbol();
  const mode = document.getElementById('mode').value;

  let fabricTotalDZ = 0;
  if (mode === 'YARN') {
    const yarnRaw = getYarnRawPrice();
    const dyeRaw = getDyeingRawPrice();
    const knitRaw = getKnittingRawPrice();
    const rawPrices = { 'YARN': yarnRaw, 'DYEING': dyeRaw, 'KNITTING': knitRaw };

    document.querySelectorAll('#fabricRows tr').forEach(tr => {
      const type = tr.dataset.type || 'YARN';
      const w = parseFloat(tr.querySelector('.fw')?.value) || 0;
      const dz = w * 12;
      const rawPrice = rawPrices[type] || 0;
      const up = rawPrice / rate;
      const cd = dz * up;
      const cp = cd / 12;
      tr.querySelector('.dz').textContent = dz.toFixed(3);
      tr.querySelector('.up').textContent = up.toFixed(4);
      tr.querySelector('.cd').textContent = `${sym} ${cd.toFixed(2)}`;
      tr.querySelector('.cp').textContent = `${sym} ${cp.toFixed(2)}`;
      fabricTotalDZ += cd;
    });
  } else {
    const fabRaw = getFabricRawPrice();
    const up = fabRaw / rate;
    document.querySelectorAll('#fabricRows tr').forEach(tr => {
      const w = parseFloat(tr.querySelector('.fw')?.value) || 0;
      const dz = w * 12;
      const cd = dz * up;
      const cp = cd / 12;
      tr.querySelector('.dz').textContent = dz.toFixed(3);
      tr.querySelector('.up').textContent = up.toFixed(4);
      tr.querySelector('.cd').textContent = `${sym} ${cd.toFixed(2)}`;
      tr.querySelector('.cp').textContent = `${sym} ${cp.toFixed(2)}`;
      fabricTotalDZ += cd;
    });
  }

  let trimTotalDZ = 0;
  document.querySelectorAll('#trimRows tr').forEach(tr => {
    const cons = parseFloat(tr.querySelector('.consum')?.value) || 0;
    const priceCell = tr.querySelector('.upin');
    let u;
    if (priceCell.tagName === 'INPUT') {
      u = parseFloat(priceCell.value) || 0;
    } else {
      u = (27 / 3000) * cons / rate;
      priceCell.textContent = u.toFixed(4);
    }
    const cd = u * 12;
    const cp = cd / 12;
    tr.querySelector('.cd').textContent = `${sym} ${cd.toFixed(2)}`;
    tr.querySelector('.cp').textContent = `${sym} ${cp.toFixed(2)}`;
    trimTotalDZ += cd;
  });

  let packTotalDZ = 0;
  document.querySelectorAll('#packRows tr').forEach(tr => {
    const cons = parseFloat(tr.querySelector('.consum')?.value) || 0;
    const u = parseFloat(tr.querySelector('.upin')?.value) || 0;
    const cd = u * cons;
    const cp = cd / 12;
    tr.querySelector('.cd').textContent = `${sym} ${cd.toFixed(2)}`;
    tr.querySelector('.cp').textContent = `${sym} ${cp.toFixed(2)}`;
    packTotalDZ += cd;
  });

  const minutesSetting = parseFloat(document.getElementById('numberOfMinutes').value) || 7.0;
  const minuteRate = parseFloat(document.getElementById('minuteRate').value) || 3.5;
  const autoConsum = minutesSetting * 12;
  const autoPrice = minuteRate / rate;
  let mfgTotalDZ = 0;
  document.querySelectorAll('#mfgRows tr').forEach(tr => {
    const consumCell = tr.querySelector('.consum');
    const priceCell = tr.querySelector('.upin');
    let cons, u;
    if (consumCell.tagName === 'INPUT') {
      cons = parseFloat(consumCell.value) || 0;
    } else {
      cons = autoConsum;
      consumCell.textContent = cons.toFixed(3);
    }
    if (priceCell.tagName === 'INPUT') {
      u = parseFloat(priceCell.value) || 0;
    } else {
      u = autoPrice;
      priceCell.textContent = u.toFixed(4);
    }
    const cd = u * cons;
    const cp = cd / 12;
    tr.querySelector('.cd').textContent = `${sym} ${cd.toFixed(2)}`;
    tr.querySelector('.cp').textContent = `${sym} ${cp.toFixed(2)}`;
    mfgTotalDZ += cd;
  });

  const directDZ = fabricTotalDZ + trimTotalDZ + packTotalDZ + mfgTotalDZ;
  document.getElementById('directDz').textContent = `${sym} ${directDZ.toFixed(2)}`;
  document.getElementById('directPc').textContent = `${sym} ${(directDZ/12).toFixed(2)}`;

  const adjIds = ['ohDz', 'wasteDz', 'bankDz'];
  const adjPcIds = ['ohPc', 'wastePc', 'bankPc'];
  let totalAdjDZ = 0;
  document.querySelectorAll('#adjRows tr').forEach((tr, i) => {
    const pct = parseFloat(tr.querySelector('.pct')?.value) || 0;
    const valDZ = directDZ * pct;
    const valPC = valDZ / 12;
    tr.querySelector('.acd').textContent = `${sym} ${valDZ.toFixed(2)}`;
    tr.querySelector('.acp').textContent = `${sym} ${valPC.toFixed(2)}`;
    if (adjIds[i]) document.getElementById(adjIds[i]).textContent = `${sym} ${valDZ.toFixed(2)}`;
    if (adjPcIds[i]) document.getElementById(adjPcIds[i]).textContent = `${sym} ${valPC.toFixed(2)}`;
    totalAdjDZ += valDZ;
  });

  const fobDZ = directDZ + totalAdjDZ;
  const fobPC = fobDZ / 12;
  document.getElementById('fobDz').textContent = `${sym} ${fobDZ.toFixed(2)}`;
  document.getElementById('fobPc').textContent = `${sym} ${fobPC.toFixed(2)}`;
  document.getElementById('costPc').textContent = `${sym} ${fobPC.toFixed(2)}`;
}

function renderMasterCurrencies() {
  const tbody = document.querySelector('#currencyTable tbody');
  const search = (document.getElementById('searchCurrency')?.value || '').toLowerCase();
  tbody.innerHTML = '';
  master.currencies.forEach((c, i) => {
    if (search && !c.code.toLowerCase().includes(search) && !c.name.toLowerCase().includes(search)) return;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input value="${esc(c.code)}" onchange="updateCurrency(${i},'code',this.value)"></td>
      <td><input value="${esc(c.name)}" onchange="updateCurrency(${i},'name',this.value)"></td>
      <td><input type="number" step="0.0001" value="${esc(c.rate)}" onchange="updateCurrency(${i},'rate',this.value)"></td>
      <td><button class="btn-sm btn-del" onclick="deleteCurrency(${i})">×</button></td>
    `;
    tbody.appendChild(tr);
  });
}
function addCurrencyRow() { master.currencies.push({ code: '', name: '', rate: 1 }); renderMasterCurrencies(); }
function updateCurrency(i, field, val) {
  if (field === 'rate') val = parseFloat(val) || 0;
  master.currencies[i][field] = val;
  if (field === 'code') populateCurrencyDropdown();
}
function deleteCurrency(i) {
  if (!confirm('Delete this currency?')) return;
  master.currencies.splice(i, 1); renderMasterCurrencies(); populateCurrencyDropdown();
}

function renderMasterFabrics() {
  const tbody = document.querySelector('#fabricTable tbody');
  const search = (document.getElementById('searchFabric')?.value || '').toLowerCase();
  tbody.innerHTML = '';
  master.fabrics.forEach((f, i) => {
    if (search && !f.name.toLowerCase().includes(search)) return;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input value="${esc(f.name)}" onchange="updateFabric(${i},'name',this.value)"></td>
      <td><input type="number" step="0.01" value="${esc(f.white)}" onchange="updateFabric(${i},'white',this.value)"></td>
      <td><input type="number" step="0.01" value="${esc(f.medium)}" onchange="updateFabric(${i},'medium',this.value)"></td>
      <td><input type="number" step="0.01" value="${esc(f.dark)}" onchange="updateFabric(${i},'dark',this.value)"></td>
      <td><button class="btn-sm btn-del" onclick="deleteFabric(${i})">×</button></td>
    `;
    tbody.appendChild(tr);
  });
}
function addFabricMasterRow() { master.fabrics.push({ name: '', white: 0, medium: 0, dark: 0 }); renderMasterFabrics(); }
function updateFabric(i, field, val) {
  if (field !== 'name') val = parseFloat(val) || 0;
  master.fabrics[i][field] = val;
  if (field === 'name') populateMaterialDropdown();
}
function deleteFabric(i) {
  if (!confirm('Delete this fabric?')) return;
  master.fabrics.splice(i, 1); renderMasterFabrics(); populateMaterialDropdown();
}

function renderMasterYarns() {
  const tbody = document.querySelector('#yarnTable tbody');
  const search = (document.getElementById('searchYarn')?.value || '').toLowerCase();
  tbody.innerHTML = '';
  master.yarns.forEach((y, i) => {
    if (search && !y.name.toLowerCase().includes(search)) return;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input value="${esc(y.name)}" onchange="updateYarn(${i},'name',this.value)"></td>
      <td><input type="number" step="0.01" value="${esc(y.price)}" onchange="updateYarn(${i},'price',this.value)"></td>
      <td><button class="btn-sm btn-del" onclick="deleteYarn(${i})">×</button></td>
    `;
    tbody.appendChild(tr);
  });
}
function addYarnRow() { master.yarns.push({ name: '', price: 0 }); renderMasterYarns(); }
function updateYarn(i, field, val) {
  if (field === 'price') val = parseFloat(val) || 0;
  master.yarns[i][field] = val;
  if (field === 'name') populateMaterialDropdown();
}
function deleteYarn(i) {
  if (!confirm('Delete this yarn?')) return;
  master.yarns.splice(i, 1); renderMasterYarns(); populateMaterialDropdown();
}

function renderMasterDyeing() {
  const tbody = document.querySelector('#dyeingTable tbody');
  if (!tbody) return;
  const search = (document.getElementById('searchDyeing')?.value || '').toLowerCase();
  tbody.innerHTML = '';
  master.dyeing.forEach((d, i) => {
    if (search && !d.name.toLowerCase().includes(search)) return;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input value="${esc(d.name)}" onchange="updateDyeing(${i},'name',this.value)"></td>
      <td><input type="number" step="0.01" value="${esc(d.price)}" onchange="updateDyeing(${i},'price',this.value)"></td>
      <td><button class="btn-sm btn-del" onclick="deleteDyeing(${i})">×</button></td>
    `;
    tbody.appendChild(tr);
  });
}
function addDyeingRow() { master.dyeing.push({ name: '', price: 0 }); renderMasterDyeing(); }
function updateDyeing(i, field, val) {
  if (field === 'price') val = parseFloat(val) || 0;
  master.dyeing[i][field] = val;
  if (field === 'name') populateServiceDropdowns();
}
function deleteDyeing(i) {
  if (!confirm('Delete this dyeing?')) return;
  master.dyeing.splice(i, 1); renderMasterDyeing(); populateServiceDropdowns();
}

function renderMasterServices() {
  const tbody = document.querySelector('#serviceTable tbody');
  const search = (document.getElementById('searchService')?.value || '').toLowerCase();
  tbody.innerHTML = '';
  master.services.forEach((s, i) => {
    if (search && !s.name.toLowerCase().includes(search)) return;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input value="${esc(s.name)}" onchange="updateService(${i},'name',this.value)"></td>
      <td><input type="number" step="0.01" value="${esc(s.price)}" onchange="updateService(${i},'price',this.value)"></td>
      <td><button class="btn-sm btn-del" onclick="deleteService(${i})">×</button></td>
    `;
    tbody.appendChild(tr);
  });
}
function addServiceRow() { master.services.push({ name: '', price: 0 }); renderMasterServices(); }
function updateService(i, field, val) {
  if (field === 'price') val = parseFloat(val) || 0;
  master.services[i][field] = val;
}
function deleteService(i) {
  if (!confirm('Delete this service?')) return;
  master.services.splice(i, 1); renderMasterServices();
}

function renderMasterKnitting() {
  const tbody = document.querySelector('#knittingTable tbody');
  if (!tbody) return;
  const search = (document.getElementById('searchKnitting')?.value || '').toLowerCase();
  tbody.innerHTML = '';
  master.knitting.forEach((k, i) => {
    if (search && !k.name.toLowerCase().includes(search)) return;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input value="${esc(k.name)}" onchange="updateKnitting(${i},'name',this.value)"></td>
      <td><input type="number" step="0.01" value="${esc(k.price)}" onchange="updateKnitting(${i},'price',this.value)"></td>
      <td><button class="btn-sm btn-del" onclick="deleteKnitting(${i})">×</button></td>
    `;
    tbody.appendChild(tr);
  });
}
function addKnittingRow() { master.knitting.push({ name: '', price: 0 }); renderMasterKnitting(); }
function updateKnitting(i, field, val) {
  if (field === 'price') val = parseFloat(val) || 0;
  master.knitting[i][field] = val;
  if (field === 'name') populateKnittingDropdown();
}
function deleteKnitting(i) {
  if (!confirm('Delete this knitting?')) return;
  master.knitting.splice(i, 1); renderMasterKnitting(); populateKnittingDropdown();
}

function exportPDF() { window.print(); }

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('currency').addEventListener('change', () => { updateRateFromCurrency(); calc(); });
  document.getElementById('rate').addEventListener('input', calc);
  document.getElementById('minuteRate').addEventListener('input', calc);
  document.getElementById('numberOfMinutes').addEventListener('input', calc);
  document.getElementById('mode').addEventListener('change', () => { updateModeUI(); calc(); });
  document.getElementById('mainMaterial').addEventListener('change', () => {
    if (document.getElementById('mode').value === 'YARN') {
      const rows = document.querySelectorAll('#fabricRows tr');
      if (rows[0]) rows[0].querySelector('.details').value = document.getElementById('mainMaterial').value;
    }
    calc();
  });
  document.getElementById('color').addEventListener('change', calc);
  document.getElementById('dyeingService').addEventListener('change', () => {
    if (document.getElementById('mode').value === 'YARN') {
      const rows = document.querySelectorAll('#fabricRows tr');
      if (rows[1]) rows[1].querySelector('.details').value = document.getElementById('dyeingService').value;
    }
    calc();
  });
  document.getElementById('knittingService').addEventListener('change', () => {
    if (document.getElementById('mode').value === 'YARN') {
      const rows = document.querySelectorAll('#fabricRows tr');
      if (rows[2]) rows[2].querySelector('.details').value = document.getElementById('knittingService').value;
    }
    calc();
  });
  document.addEventListener('input', (e) => {
    if (e.target.matches('.fw, .upin, .min, .pct, #rate, #minuteRate, .consum, .item, .details')) calc();
  });
  document.addEventListener('change', (e) => {
    if (e.target.matches('.fw, .upin, .min, .pct, .consum, .item, .details')) calc();
  });
});

window.showPage = showPage;
window.saveAll = saveAll;
window.clearCosting = clearCosting;
window.handleImageUpload = handleImageUpload;
window.exportPDF = exportPDF;
window.loadMasterLocal = loadMasterLocal;
window.addCurrencyRow = addCurrencyRow;
window.updateCurrency = updateCurrency;
window.deleteCurrency = deleteCurrency;
window.addFabricRow = addFabricRow;
window.addTrimRow = addTrimRow;
window.addPackRow = addPackRow;
window.addMfgRow = addMfgRow;
window.addAdjRow = addAdjRow;
window.addFabricMasterRow = addFabricMasterRow;
window.updateFabric = updateFabric;
window.deleteFabric = deleteFabric;
window.addYarnRow = addYarnRow;
window.updateYarn = updateYarn;
window.deleteYarn = deleteYarn;
window.addDyeingRow = addDyeingRow;
window.updateDyeing = updateDyeing;
window.deleteDyeing = deleteDyeing;
window.addServiceRow = addServiceRow;
window.updateService = updateService;
window.deleteService = deleteService;
window.addKnittingRow = addKnittingRow;
window.updateKnitting = updateKnitting;
window.deleteKnitting = deleteKnitting;
window.renderMasterCurrencies = renderMasterCurrencies;
window.renderMasterFabrics = renderMasterFabrics;
window.renderMasterYarns = renderMasterYarns;
window.renderMasterDyeing = renderMasterDyeing;
window.renderMasterServices = renderMasterServices;
window.renderMasterKnitting = renderMasterKnitting;
window.calc = calc;
