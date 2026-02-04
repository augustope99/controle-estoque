/* App JavaScript - Versão Standalone (IndexedDB)
   - CRUD, busca, filtros, paginação, ordenação
   - Importar / Exportar CSV
   - Impressão (PDF via Print)
*/

const COLUMNS = [
  "Especialista / Exceutivo","EC","Qtde de POS","Acelere?","Filial","Marca","Codigo do Cliente","CNPJ","RAZÃO SOCIAL","NOME FANTASIA","E-MAIL","USUÁRIO","QUEM SUGERIU?","PRINCIPAL CONTATO","WHATSAPP","DATA DE RECEBIMENTO DE DOCS","Comprovante Bancário","TERMO ADESÃO","Data subida na Mobbuy","Subir no Onbording","Quem Cadastrou?","Análise Compliance","ESPECIALISTA ATRIBUIDA NO RETAGUARDA?","Data POS recebido pelo cliente","Data Treinamento Portal","Data Treinamento POS","Canal de Boas-Vindas","Quem contatou?","Data Bem-Vindo","OBSERVAÇÕES"
];

const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
const headers = COLUMNS.map(c=>({key:slug(c),label:c}));

// DB
const DB_NAME = 'estoque_db_v1';
const STORE = 'records';

function openDB(){
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if(!db.objectStoreNames.contains(STORE)){
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function addRecord(rec){
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    store.add(rec);
    tx.oncomplete = () => res(true);
    tx.onerror = () => rej(tx.error);
  });
}

async function updateRecord(id, rec){
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const getReq = store.get(Number(id));
    getReq.onsuccess = ()=>{
      const current = getReq.result || {};
      const merged = {...current, ...rec, id: Number(id)};
      store.put(merged);
    };
    tx.oncomplete = () => res(true);
    tx.onerror = () => rej(tx.error);
  });
}

async function deleteRecordDB(id){
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    store.delete(Number(id));
    tx.oncomplete = () => res(true);
    tx.onerror = () => rej(tx.error);
  });
}

async function getAllRecords(){
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const req = store.getAll();
    req.onsuccess = ()=> res(req.result || []);
    req.onerror = ()=> rej(req.error);
  });
}

// UI state
let currentPage = 1;
let pageSize = Number(localStorage.getItem('pageSize') || 100);
let totalRecords = 0;
let sortBy = null; // key
let sortDir = 1; // 1 asc, -1 desc
let records = [];

// Elements
const refreshBtn = document.getElementById('refreshBtn');
const addNewBtn = document.getElementById('addNew');
const syncBtn = document.getElementById('syncBtn');
const tableWrap = document.getElementById('tableWrap');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const form = document.getElementById('recordForm');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');
const pageSizeEl = document.getElementById('pageSize');
const searchInput = document.getElementById('searchInput');
const filterFilial = document.getElementById('filterFilial');
const filterMarca = document.getElementById('filterMarca');
const filterCNPJ = document.getElementById('filterCNPJ');
const importFile = document.getElementById('importFile');
const importBtn = document.getElementById('importBtn');
const exportBtn = document.getElementById('exportBtn');
const printBtn = document.getElementById('printBtn');

console.log('Elementos encontrados:', {
  importFile: !!importFile,
  importBtn: !!importBtn,
  exportBtn: !!exportBtn,
  printBtn: !!printBtn
});

pageSizeEl.value = pageSize;

// debounce
function debounce(fn, wait=300){ let t; return (...args)=>{ clearTimeout(t); t = setTimeout(()=>fn.apply(this,args), wait); }; }
const fetchAndRenderDebounced = debounce(fetchAndRender, 200);

pageSizeEl.addEventListener('change', e=>{pageSize=Number(e.target.value);localStorage.setItem('pageSize',pageSize);currentPage=1;fetchAndRenderDebounced();});
refreshBtn.addEventListener('click', fetchAndRenderDebounced);
addNewBtn.addEventListener('click', ()=>openForm());
syncBtn.addEventListener('click', ()=>{
  if(confirm('Conecte a VPN antes de sincronizar. Continuar?')) {
    sincronizarDados();
  }
});
searchInput.addEventListener('input', debounce(()=>{currentPage=1;fetchAndRenderDebounced();}, 300));
filterFilial.addEventListener('change', ()=>{currentPage=1;fetchAndRenderDebounced();});
filterMarca.addEventListener('change', ()=>{currentPage=1;fetchAndRenderDebounced();});
filterCNPJ.addEventListener('change', ()=>{currentPage=1;fetchAndRenderDebounced();});

cancelBtn.addEventListener('click', closeModal);

// render loop
async function fetchAndRender(){
  const all = await getAllRecords();

  // apply search
  const q = (searchInput.value||'').trim().toLowerCase();
  let filtered = all.filter(r=>{
    if(q){
      const hay = headers.map(h=>String(r[h.key]||'').toLowerCase()).join(' ');
      if(!hay.includes(q)) return false;
    }
    if(filterFilial.value && String(r['filial']||'')!==filterFilial.value) return false;
    if(filterMarca.value && String(r['marca']||'')!==filterMarca.value) return false;
    if(filterCNPJ.value && String(r['cnpj']||'')!==filterCNPJ.value) return false;
    return true;
  });

  // sort
  if(sortBy){
    filtered.sort((a,b)=>{
      const A = String(a[sortBy]||'').toLowerCase();
      const B = String(b[sortBy]||'').toLowerCase();
      return A>B?sortDir:(A<B?-sortDir:0);
    });
  }

  totalRecords = filtered.length;
  const start = (currentPage-1)*pageSize;
  const pageData = pageSize >= 9999 ? filtered : filtered.slice(start, start+pageSize);
  records = pageData;

  populateFilters(all);
  renderTable();
  renderPagination();
}

function populateFilters(all){
  // unique values
  const set = (arr,key)=>Array.from(new Set(arr.map(r=>r[key]||'').filter(v=>v))).sort();
  const filials = set(all,'filial');
  const marcas = set(all,'marca');
  const cnpjs = set(all,'cnpj');

  fillSelect(filterFilial, filials);
  fillSelect(filterMarca, marcas);
  fillSelect(filterCNPJ, cnpjs);
}

function fillSelect(sel, arr){
  const cur = sel.value;
  sel.innerHTML = '<option value="">— Todas —</option>' + arr.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
  if(cur) sel.value = cur;
}

function renderTable(){
  if(!records || records.length===0){
    tableWrap.innerHTML = '<div class="card" style="padding:12px;background:#fff;border-radius:8px">Nenhum registro.</div>';
    return;
  }
  let html = '<table class="table"><thead><tr>';
  const visible = headers.slice(0,8);
  visible.forEach(h=>{
    html+=`<th data-key="${h.key}" class="sortable">${h.label} <span class="sorthint">${sortBy===h.key?(sortDir===1?'▲':'▼'):' '}</span></th>`;
  });
  html+='<th>Ações</th></tr></thead><tbody>';
  records.forEach(rec=>{
    html+='<tr>';
    visible.forEach(h=>html+=`<td>${escapeHtml(rec[h.key]||'')}</td>`);
    html+=`<td class="actions">`;
    html+=`<button data-id="${rec.id}" class="view">👁️</button>`;
    html+=`<button data-id="${rec.id}" class="edit">✏️</button>`;
    html+=`<button data-id="${rec.id}" class="del">🗑️</button>`;
    html+='</td></tr>';
  });
  html+='</tbody></table>';
  html+=`<div style="margin-top:8px;color:#6b7280">Mostrando <strong>${records.length}</strong> de <strong>${totalRecords}</strong> registros na página.</div>`;
  tableWrap.innerHTML = html;

  // attach events
  tableWrap.querySelectorAll('.view').forEach(b=>b.addEventListener('click', e=>viewRecord(e.target.dataset.id)));
  tableWrap.querySelectorAll('.edit').forEach(b=>b.addEventListener('click', e=>editRecord(e.target.dataset.id)));
  tableWrap.querySelectorAll('.del').forEach(b=>b.addEventListener('click', e=>{ if(confirm('Confirmar exclusão?')){ deleteRecordDB(e.target.dataset.id).then(()=>fetchAndRenderDebounced()); } }));

  tableWrap.querySelectorAll('th.sortable').forEach(th=>th.addEventListener('click', ()=>{
    const k = th.dataset.key; if(sortBy===k) sortDir = -sortDir; else { sortBy=k; sortDir=1; } fetchAndRenderDebounced();
  }));
}

function renderPagination(){
  const totalPages = pageSize >= 9999 ? 1 : Math.max(1, Math.ceil(totalRecords / pageSize));
  let pag = document.getElementById('pagination');
  if(!pag){ pag = document.createElement('div'); pag.id='pagination'; pag.style.marginTop='10px'; document.querySelector('main').appendChild(pag); }
  pag.innerHTML = '';
  
  if(pageSize >= 9999) {
    const info = document.createElement('span'); 
    info.style.margin='0 8px'; 
    info.style.color='#374151'; 
    info.textContent = `Mostrando todos os ${totalRecords} registros`;
    pag.appendChild(info);
    return;
  }
  
  const prev = document.createElement('button'); prev.textContent = '◀'; prev.disabled = currentPage<=1; prev.onclick = ()=>{ currentPage = Math.max(1, currentPage-1); fetchAndRenderDebounced(); };
  const next = document.createElement('button'); next.textContent = '▶'; next.disabled = currentPage>=totalPages; next.onclick = ()=>{ currentPage = Math.min(totalPages, currentPage+1); fetchAndRenderDebounced(); };
  const info = document.createElement('span'); info.style.margin='0 8px'; info.style.color='#374151'; info.textContent = `Página ${currentPage} / ${totalPages}`;
  pag.appendChild(prev);
  pag.appendChild(info);
  pag.appendChild(next);
}

function openForm(defaults={}, isEdit=false){
  form.innerHTML = '';
  
  // Organizar campos em seções
  const sections = [
    {
      title: 'Informações Básicas',
      fields: ['especialista_exceutivo', 'ec', 'qtde_de_pos', 'acelere', 'filial', 'marca']
    },
    {
      title: 'Dados do Cliente', 
      fields: ['codigo_do_cliente', 'cnpj', 'razao_social', 'nome_fantasia', 'e_mail', 'usuario']
    },
    {
      title: 'Contatos e Sugestões',
      fields: ['quem_sugeriu', 'principal_contato', 'whatsapp', 'quem_contatou']
    },
    {
      title: 'Documentação e Datas',
      fields: ['data_de_recebimento_de_docs', 'comprovante_bancario', 'termo_adesao', 'data_subida_na_mobbuy']
    },
    {
      title: 'Processo e Treinamento',
      fields: ['subir_no_onbording', 'quem_cadastrou', 'analise_compliance', 'especialista_atribuida_no_retaguarda']
    },
    {
      title: 'Entrega e Finalização',
      fields: ['data_pos_recebido_pelo_cliente', 'data_treinamento_portal', 'data_treinamento_pos', 'canal_de_boas_vindas', 'data_bem_vindo']
    },
    {
      title: 'Observações',
      fields: ['observacoes']
    }
  ];
  
  sections.forEach(section => {
    // Título da seção
    const sectionTitle = document.createElement('h3');
    sectionTitle.textContent = section.title;
    sectionTitle.style.cssText = 'margin: 16px 0 8px 0; color: #dc2626; border-bottom: 1px solid #333; padding-bottom: 4px;';
    form.appendChild(sectionTitle);
    
    // Campos da seção
    section.fields.forEach(fieldKey => {
      const header = headers.find(h => h.key === fieldKey);
      if (!header) return;
      
      const val = defaults[header.key] || '';
      const isDate = String(header.key).includes('data') || String(header.key).includes('date');
      const isTextArea = header.key === 'observacoes' || header.key === 'razao_social';
      
      let field;
      if (isTextArea) {
        field = `<textarea name="${header.key}" rows="3">${escapeHtml(val)}</textarea>`;
      } else if (isDate) {
        field = `<input type="date" name="${header.key}" value="${toISODate(val)}"/>`;
      } else {
        field = `<input name="${header.key}" value="${escapeHtml(val)}" ${header.key === 'codigo_do_cliente' ? 'onblur="handleClienteLookup(this)"' : ''}${header.key === 'cnpj' ? 'onblur="handleCNPJLookup(this)"' : ''}/>`;
      }
      
      form.insertAdjacentHTML('beforeend', `<div class="form-row"><label>${header.label}${field}</label></div>`);
    });
  });
  
  modalTitle.textContent = isEdit ? 'Editar Cliente' : 'Novo Cliente';
  modal.classList.remove('hidden');
  
  saveBtn.onclick = async (e)=>{
    e.preventDefault();
    const fd = new FormData(form);
    const obj = {};
    headers.forEach(h=>obj[h.key]=fd.get(h.key) || '');
    const errors = validateRecord(obj);
    if(errors.length){ alert('Erros: ' + errors.join('; ')); return; }
    if(isEdit){ await updateRecord(defaults.id, obj); } else { await addRecord(obj); }
    closeModal();
    setTimeout(()=>fetchAndRenderDebounced(), 200);
  };
}

function closeModal(){ modal.classList.add('hidden'); }

function viewRecord(id){
  getAllRecords().then(list=>{
    const rec = list.find(r=>String(r.id)===String(id));
    if(!rec) return;
    form.innerHTML = '';
    headers.forEach(h=>{
      const val = rec[h.key]||'';
      form.insertAdjacentHTML('beforeend', `<div class="form-row"><label>${h.label}<textarea readonly>${escapeHtml(val)}</textarea></label></div>`);
    });
    modalTitle.textContent = 'Visualizar registro';
    saveBtn.style.display='none';
    modal.classList.remove('hidden');
    cancelBtn.onclick = ()=>{ saveBtn.style.display=''; closeModal(); };
  });
}

function editRecord(id){
  getAllRecords().then(list=>{
    const rec = list.find(r=>String(r.id)===String(id));
    if(!rec) return;
    openForm(rec, true);
  });
}

// Validation
function validateRecord(obj){
  const errs = [];
  if(!obj['codigo_do_cliente'] || !obj['codigo_do_cliente'].trim()) errs.push('Codigo do Cliente é obrigatório');
  if(obj['e_mail'] && !validateEmail(obj['e_mail'])) errs.push('E-mail inválido');
  if(obj['cnpj'] && !validateCNPJ(obj['cnpj'])) errs.push('CNPJ inválido');
  // additional date checks
  headers.forEach(h=>{
    if(String(h.key).includes('data') && obj[h.key]){
      if(!isValidDate(obj[h.key])) errs.push(`${h.label} inválida`);
    }
  });
  return errs;
}
function validateEmail(v){ return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v); }
function isValidDate(v){ return !isNaN(Date.parse(v)); }
// CNPJ validation (simple algorithm)
function validateCNPJ(cnpj){
  const cleaned = (cnpj||'').replace(/\D/g,'');
  if(cleaned.length!==14) return false;
  if(/^([0-9])\1+$/.test(cleaned)) return false;
  const calc = (t)=>{
    let sum=0, pos=t-7;
    for(let i=t;i>=1;i--){ sum += Number(cleaned[t-i]) * pos--; if(pos<2) pos=9; }
    const res = sum%11<2?0:11-(sum%11);
    return res;
  };
  const d1 = calc(12); const d2 = calc(13);
  return d1===Number(cleaned[12]) && d2===Number(cleaned[13]);
}

function toISODate(v){ if(!v) return ''; try{ const d = new Date(v); if(isNaN(d)) return ''; return d.toISOString().slice(0,10);}catch(e){return '';} }

// Import / Export CSV
async function handleImport(){
  console.log('handleImport chamado');
  const f = importFile.files[0];
  if(!f){ alert('Selecione um arquivo CSV ou Excel (.csv/.xlsx/.xls)'); return; }
  console.log('Arquivo selecionado:', f.name);
  const fname = (f.name||'').toLowerCase();
  let txt = '';

  try{
    if(fname.endsWith('.csv') || fname.endsWith('.txt')){
      txt = await f.text();
    } else if(fname.endsWith('.xlsx') || fname.endsWith('.xls')){
      if(typeof XLSX === 'undefined'){
        alert('Biblioteca XLSX não carregada. Recarregue a página.');
        return;
      }
      // read as array buffer
      const ab = await new Promise((res, rej)=>{ const r=new FileReader(); r.onload = e=>res(e.target.result); r.onerror = ()=>rej(r.error); r.readAsArrayBuffer(f); });
      const data = new Uint8Array(ab);
      const wb = XLSX.read(data, {type:'array'});
      const sheets = wb.SheetNames;
      if(!sheets || sheets.length===0){ alert('Planilha vazia'); return; }
      if(sheets.length>1){
        const ok = confirm(`Arquivo contém ${sheets.length} planilhas: ${sheets.join(', ')}. Usar a primeira (${sheets[0]})?`);
        if(!ok) return;
      }
      const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sheets[0]]);
      txt = csv;
    } else {
      alert('Formato não suportado. Use CSV ou Excel (.xlsx/.xls)'); return;
    }
  }catch(err){ console.error(err); alert('Erro ao ler o arquivo: '+(err.message||err)); return; }

  const rows = txt.split(/\r?\n/).filter(r=>r.trim());
  if(rows.length===0){ alert('Arquivo vazio'); return; }

  // parse header robustly
  const hdr = parseCsvLine(rows.shift());

  // preview first 3 lines (most recent CSV lines)
  const preview = rows.slice(0,3).map(r=>parseCsvLine(r));

  // show mapping modal (with preview) and wait for mapping
  const mapping = await showColumnMappingModal(hdr, preview);
  if(!mapping){ alert('Importação cancelada'); return; }

  // process rows
  let imported = 0;
  for(const r of rows){
    const cols = parseCsvLine(r);
    const obj = {};
    hdr.forEach((h,idx)=>{
      const target = mapping[h];
      if(target && target!=='__ignore'){
        obj[target] = cols[idx] || '';
      }
    });
    const errors = validateRecord(obj);
    if(errors.length){ console.warn('Registro ignorado por erros:', errors, obj); continue; }
    await addRecord(obj);
    imported++;
  }
  alert(`Importação finalizada (${imported} registros importados)`);
  fetchAndRenderDebounced();
}

// CSV parser que respeita aspas
function parseCsvLine(line){
  const res = []; let cur=''; let inQuotes=false;
  for(let i=0;i<line.length;i++){
    const ch = line[i];
    if(ch==='"'){
      if(inQuotes && line[i+1]==='"'){ cur+='"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if(ch===',' && !inQuotes){ res.push(cur); cur=''; }
    else { cur += ch; }
  }
  res.push(cur);
  return res.map(s=>s.trim());
}

// Modal de mapeamento
function showColumnMappingModal(csvHeaders, previewRows=[]){
  return new Promise((resolve)=>{
    const modal = document.getElementById('mapModal');
    const form = document.getElementById('mapForm');
    form.innerHTML = '';

    // build selects for each csv header
    csvHeaders.forEach((h, idx)=>{
      const row = document.createElement('div'); row.className = 'form-row';
      const label = document.createElement('label'); label.style.flex='1';
      const title = document.createElement('div'); title.textContent = `CSV: ${h}`;
      const select = document.createElement('select'); select.dataset.csv = h; select.style.marginTop='6px';

      // 'Ignorar' option
      const optIgnore = document.createElement('option'); optIgnore.value='__ignore'; optIgnore.textContent='— Ignorar —'; select.appendChild(optIgnore);
      // options: map to each header
      headers.forEach(H=>{
        const opt = document.createElement('option'); opt.value = H.key; opt.textContent = H.label; select.appendChild(opt);
      });

      // try auto-select by slug match
      const s = slug(h);
      const matched = headers.find(H=>H.key===s);
      if(matched) select.value = matched.key;

      label.appendChild(title);
      label.appendChild(select);
      row.appendChild(label);
      form.appendChild(row);

      // when changed, avoid duplicate selection by disabling option in others
      select.addEventListener('change', ()=>{
        const chosen = Array.from(form.querySelectorAll('select')).map(s=>s.value).filter(v=>v&&v!=='__ignore');
        form.querySelectorAll('select').forEach(sel=>{
          Array.from(sel.options).forEach(opt=>{
            if(opt.value!=='' && opt.value!=='__ignore'){
              opt.disabled = chosen.includes(opt.value) && sel.value!==opt.value;
            }
          });
        });
      });
    });

    // preview area
    if(previewRows && previewRows.length){
      const previewWrap = document.createElement('div'); previewWrap.style.marginTop='12px';
      const tbl = document.createElement('table'); tbl.className='table';
      const thead = document.createElement('thead');
      const trh = document.createElement('tr');
      csvHeaders.forEach(h=>{ const th=document.createElement('th'); th.textContent = h; trh.appendChild(th); });
      thead.appendChild(trh); tbl.appendChild(thead);
      const tb = document.createElement('tbody');
      previewRows.forEach(row=>{
        const tr = document.createElement('tr');
        row.forEach(c=>{ const td = document.createElement('td'); td.textContent = c; tr.appendChild(td); });
        tb.appendChild(tr);
      });
      tbl.appendChild(tb);
      const previewTitle = document.createElement('div'); previewTitle.style.marginTop='6px'; previewTitle.style.color='#6b7280'; previewTitle.textContent = 'Pré‑visualização (primeiras linhas)';
      previewWrap.appendChild(previewTitle); previewWrap.appendChild(tbl);
      form.appendChild(previewWrap);
    }

    // attach buttons
    const confirm = document.getElementById('mapConfirm');
    const cancel = document.getElementById('mapCancel');

    const onConfirm = ()=>{
      const mapping = {};
      Array.from(form.querySelectorAll('select')).forEach(sel=> mapping[sel.dataset.csv] = sel.value);
      modal.classList.add('hidden');
      confirm.removeEventListener('click', onConfirm);
      cancel.removeEventListener('click', onCancel);
      resolve(mapping);
    };
    const onCancel = ()=>{ modal.classList.add('hidden'); confirm.removeEventListener('click', onConfirm); cancel.removeEventListener('click', onCancel); resolve(null); };

    confirm.addEventListener('click', onConfirm);
    cancel.addEventListener('click', onCancel);
    modal.classList.remove('hidden');
  });
}

async function handleExport(){
  const all = await getAllRecords();
  const q = (searchInput.value||'').trim().toLowerCase();
  let filtered = all.filter(r=>{
    if(q){ const hay = headers.map(h=>String(r[h.key]||'').toLowerCase()).join(' '); if(!hay.includes(q)) return false; }
    if(filterFilial.value && String(r['filial']||'')!==filterFilial.value) return false;
    if(filterMarca.value && String(r['marca']||'')!==filterMarca.value) return false;
    if(filterCNPJ.value && String(r['cnpj']||'')!==filterCNPJ.value) return false;
    return true;
  });
  const csv = [COLUMNS.join(',')].concat(filtered.map(r=>COLUMNS.map(h=>`"${String(r[slug(h)]||'').replace(/"/g,'""')}"`).join(','))).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'export.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

function handlePrint(){
  const w = window.open('','_blank');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Relatório</title><style>body{font-family:Arial,Helvetica,sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f3f4f6}</style></head><body><h1>Relatório</h1>${tableWrap.innerHTML}</body></html>`;
  w.document.write(html); w.document.close(); w.focus(); setTimeout(()=>w.print(), 500);
}

// Sincronização automática diária
let clientesCache = JSON.parse(localStorage.getItem('clientesCache') || 'null');
let ultimaSync = localStorage.getItem('ultimaSync');

// Verificar se precisa sincronizar (diariamente às 9h)
function verificarSincronizacao() {
  const agora = new Date();
  const hoje = agora.toDateString();
  const ultimaSyncDate = ultimaSync ? new Date(ultimaSync).toDateString() : null;
  
  // Se nunca sincronizou ou se é um novo dia e já passou das 9h
  if (!ultimaSyncDate || (ultimaSyncDate !== hoje && agora.getHours() >= 9)) {
    sincronizarDados();
  }
}

// Sincronizar dados do SAP HANA
async function sincronizarDados() {
  try {
    console.log('Iniciando sincronização com SAP HANA...');
    
    const response = await fetch('/.netlify/functions/sap-hana?action=sync', {
      method: 'GET'
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        clientesCache = data.data;
        localStorage.setItem('clientesCache', JSON.stringify(clientesCache));
        localStorage.setItem('ultimaSync', new Date().toISOString());
        console.log(`Sincronização concluída: ${data.data.total_clientes} clientes`);
        
        // Mostrar notificação de sucesso
        mostrarNotificacao(`✅ Dados sincronizados: ${data.data.total_clientes} clientes`, 'success');
      }
    } else {
      console.warn('Erro na sincronização, usando dados locais');
      mostrarNotificacao('⚠️ Erro na sincronização, usando dados locais', 'warning');
    }
  } catch (error) {
    console.warn('Erro na sincronização:', error);
    mostrarNotificacao('⚠️ Erro na sincronização, usando dados locais', 'warning');
  }
}

// Mostrar status da sincronização na interface
function mostrarStatusSync() {
  const statusDiv = document.createElement('div');
  statusDiv.id = 'syncStatus';
  statusDiv.style.cssText = `
    position: fixed; top: 10px; left: 50%; transform: translateX(-50%);
    padding: 8px 16px; border-radius: 20px; font-size: 12px;
    z-index: 1000; color: white;
  `;
  
  if (ultimaSync) {
    const dataSync = new Date(ultimaSync);
    const agora = new Date();
    const diffHoras = Math.floor((agora - dataSync) / (1000 * 60 * 60));
    
    if (diffHoras < 24) {
      statusDiv.style.background = '#059669';
      statusDiv.textContent = `✅ Dados atualizados (${diffHoras}h atrás)`;
    } else {
      statusDiv.style.background = '#d97706';
      statusDiv.textContent = `⚠️ Dados desatualizados (${Math.floor(diffHoras/24)} dias)`;
    }
  } else {
    statusDiv.style.background = '#dc2626';
    statusDiv.textContent = '❌ Dados não sincronizados';
  }
  
  // Remover status anterior
  const oldStatus = document.getElementById('syncStatus');
  if (oldStatus) oldStatus.remove();
  
  document.body.appendChild(statusDiv);
  
  // Remover após 5 segundos
  setTimeout(() => statusDiv.remove(), 5000);
}

// Busca automática no SAP HANA por código do cliente
async function searchClienteBySAPHANA(codigoCliente) {
  if (!codigoCliente || !codigoCliente.trim()) return null;
  
  try {
    // Primeiro, buscar no cache local
    if (clientesCache && clientesCache.clientes) {
      const cliente = clientesCache.clientes.find(c => 
        c.codigo_do_cliente.toLowerCase() === codigoCliente.toLowerCase()
      );
      if (cliente) {
        console.log('Cliente encontrado no cache local');
        return cliente;
      }
    }
    
    // Se não encontrou no cache, buscar no SAP HANA
    const response = await fetch('/.netlify/functions/sap-hana', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        codigo: codigoCliente.trim()
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        console.log(`Cliente encontrado no ${data.source}`);
        return data.cliente;
      }
    }
    
    // Fallback: buscar nos registros locais
    return await searchClienteLocal(codigoCliente);
    
  } catch (error) {
    console.warn('Erro ao buscar dados no SAP HANA:', error);
    return await searchClienteLocal(codigoCliente);
  }
}

// Busca local como fallback
async function searchClienteLocal(codigoCliente) {
  try {
    const all = await getAllRecords();
    const cliente = all.find(r => 
      String(r.codigo_do_cliente).toLowerCase() === String(codigoCliente).toLowerCase()
    );
    return cliente || null;
  } catch (error) {
    return null;
  }
}

// Função para lidar com busca por código do cliente
async function handleClienteLookup(input) {
  const codigo = input.value.trim();
  if (!codigo) return;
  
  input.style.backgroundColor = '#333';
  input.disabled = true;
  
  const clienteData = await searchClienteBySAPHANA(codigo);
  
  input.disabled = false;
  input.style.backgroundColor = '#000';
  
  if (clienteData) {
    fillCompanyData(clienteData);
    mostrarNotificacao('✅ Dados do cliente preenchidos automaticamente!', 'success');
  } else {
    mostrarNotificacao('⚠️ Cliente não encontrado. Verifique o código.', 'warning');
  }
}

// Função para preencher campos automaticamente
function fillCompanyData(data) {
  Object.keys(data).forEach(key => {
    const input = form.querySelector(`[name="${key}"]`);
    if (input && !input.value) {
      input.value = data[key];
      input.style.backgroundColor = '#1a4d1a'; // Verde escuro para indicar preenchimento automático
    }
  });
}

// Busca automática de dados por CNPJ (ReceitaWS)
async function searchCompanyByCNPJ(cnpj) {
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  if (cleanCNPJ.length !== 14) return null;
  
  try {
    const response = await fetch(`https://www.receitaws.com.br/v1/cnpj/${cleanCNPJ}`);
    if (!response.ok) throw new Error('API indisponível');
    
    const data = await response.json();
    if (data.status === 'ERROR') throw new Error(data.message);
    
    return {
      razao_social: data.nome || '',
      nome_fantasia: data.fantasia || data.nome || '',
      cnpj: data.cnpj || '',
      e_mail: data.email || '',
      principal_contato: data.telefone || ''
    };
  } catch (error) {
    console.warn('Erro ao buscar dados do CNPJ:', error);
    return null;
  }
}

// Função para lidar com busca por CNPJ
async function handleCNPJLookup(input) {
  const cnpj = input.value.trim();
  if (!cnpj || !validateCNPJ(cnpj)) return;
  
  input.style.backgroundColor = '#333';
  input.disabled = true;
  
  const companyData = await searchCompanyByCNPJ(cnpj);
  
  input.disabled = false;
  input.style.backgroundColor = '#000';
  
  if (companyData) {
    fillCompanyData(companyData);
    mostrarNotificacao('✅ Dados da empresa preenchidos automaticamente!', 'success');
  } else {
    mostrarNotificacao('⚠️ Não foi possível buscar os dados da empresa. Verifique o CNPJ.', 'warning');
  }
}

// Mostrar notificações
function mostrarNotificacao(mensagem, tipo = 'info') {
  const notif = document.createElement('div');
  notif.style.cssText = `
    position: fixed; top: 20px; right: 20px; z-index: 9999;
    padding: 12px 20px; border-radius: 8px; color: white;
    background: ${tipo === 'success' ? '#059669' : tipo === 'warning' ? '#d97706' : '#2563eb'};
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  notif.textContent = mensagem;
  document.body.appendChild(notif);
  
  setTimeout(() => notif.remove(), 5000);
}

function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// helpers
function toCSVRow(arr){ return arr.map(v=>`"${String(v||'').replace(/"/g,'""')}"`).join(','); }

// initial seed from template CSV if empty
function initializeApp() {
  (async ()=>{
    const all = await getAllRecords();
    if(all.length===0){
      // try to load dados_template.csv via fetch
      try{
        const res = await fetch('dados_template.csv');
        if(res.ok){ const txt = await res.text(); const rows = txt.split(/\r?\n/).filter(r=>r.trim()); const hdr = parseCsvLine(rows.shift());
          for(const r of rows){ const cols = parseCsvLine(r); const obj = {}; hdr.forEach((k,i)=> obj[k]=cols[i]||''); await addRecord(obj); }
        }
      }catch(e){ /* ignore */ }
    }
    fetchAndRenderDebounced();
  })();
}

// register service worker (PWA)
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js').then(()=>console.log('Service Worker registrado')).catch(e=>console.warn('SW falhou',e));
}

// Aguardar tudo carregar
window.addEventListener('load', function() {
  console.log('Página carregada completamente');
  
  // Verificar se os elementos existem
  const elements = {
    importFile: document.getElementById('importFile'),
    importBtn: document.getElementById('importBtn'),
    exportBtn: document.getElementById('exportBtn'),
    printBtn: document.getElementById('printBtn')
  };
  
  console.log('Elementos encontrados:', elements);
  
  // Adicionar event listeners apenas se os elementos existirem
  if(elements.importBtn) {
    elements.importBtn.addEventListener('click', ()=>{
      console.log('Botão importar clicado');
      handleImport();
    });
    console.log('Event listener do botão importar adicionado');
  } else {
    console.error('Botão importar não encontrado!');
  }
  
  if(elements.exportBtn) {
    elements.exportBtn.addEventListener('click', ()=>{
      console.log('Botão exportar clicado');
      handleExport();
    });
  }
  
  if(elements.printBtn) {
    elements.printBtn.addEventListener('click', ()=>{
      console.log('Botão imprimir clicado');
      handlePrint();
    });
  }
  
  // Inicializar a aplicação
  initializeApp();
  
  // Mostrar status da sincronização
  mostrarStatusSync();
  
  // Verificar sincronização se for de manhã
  const agora = new Date();
  if (agora.getHours() >= 9 && agora.getHours() <= 10) {
    setTimeout(verificarSincronizacao, 2000);
  }
});