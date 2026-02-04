// Google Apps Script para servir como API simples para a planilha.
// 1) Crie uma Planilha Google e cole o cabeçalho na primeira linha com as colunas fornecidas.
// 2) Crie um novo Project em Extensions → Apps Script e cole este código.
// 3) Em Deploy → New deployment → Web app: Execute as: Me, Who has access: Anyone
// 4) Copie a URL do Web app e cole em app.js (campo URL da API)

const SHEET_NAME = 'dados';
const DEFAULT_PAGE_SIZE = 50; // limite razoável

function doGet(e){
  const action = e.parameter.action || 'list';
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET_NAME);
  if(!sh){ return jsonResponse({success:false,message:'Sheet "'+SHEET_NAME+'" não encontrada'}); }
  const headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];

  if(action==='list'){
    // paginação: ?action=list&page=1&pageSize=25
    const page = Math.max(1, parseInt(e.parameter.page,10) || 1);
    const pageSize = Math.min(Math.max(1, parseInt(e.parameter.pageSize,10) || DEFAULT_PAGE_SIZE), 500);

    // cache with version token (invalidated on writes)
    const props = PropertiesService.getScriptProperties();
    const version = props.getProperty('list_version') || '1';
    const cache = CacheService.getScriptCache();
    const cacheKey = `${version}_list_${page}_${pageSize}`;
    const cached = cache.get(cacheKey);
    if(cached){
      return jsonResponse(JSON.parse(cached));
    }

    const lastRow = sh.getLastRow();
    const lastCol = sh.getLastColumn();
    const totalRows = Math.max(0, lastRow - 1);
    let data = [];
    if(totalRows>0){
      data = sh.getRange(2,1,totalRows,lastCol).getValues();
    }

    const total = data.length;
    const start = (page-1)*pageSize;
    const slice = data.slice(start, start+pageSize);
    const rows = slice.map((r,i)=>{
      const obj = {id: start + i + 2}; // row number in sheet
      headers.forEach((h,idx)=> obj[slug(h)] = r[idx]);
      return obj;
    });

    const resp = {success:true, data:rows, page:page, pageSize:pageSize, total:total};
    cache.put(cacheKey, JSON.stringify(resp), 60); // cache for 60s
    return jsonResponse(resp);
  } else if(action==='read' && e.parameter.id){
    const id = parseInt(e.parameter.id,10);
    const row = sh.getRange(id,1,1,sh.getLastColumn()).getValues()[0];
    const obj = {id}; headers.forEach((h,idx)=> obj[slug(h)] = row[idx]);
    return jsonResponse({success:true,data:obj});
  }
  return jsonResponse({success:false,message:'Ação inválida'});
}

function doPost(e){
  const payload = JSON.parse(e.postData.contents);
  const action = payload.action;
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET_NAME);
  if(!sh) return jsonResponse({success:false,message:'Sheet "'+SHEET_NAME+'" não encontrada'});
  const headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];

  const props = PropertiesService.getScriptProperties();
  const currentVersion = Number(props.getProperty('list_version')||'1');

  if(action==='add'){
    const rec = payload.record || {};
    const row = headers.map(h => rec[slug(h)] || '');
    sh.appendRow(row);
    props.setProperty('list_version', String(currentVersion+1));
    return jsonResponse({success:true});
  }

  if(action==='update'){
    const id = parseInt(payload.id,10);
    const rec = payload.record || {};
    const row = headers.map(h => rec[slug(h)] || '');
    sh.getRange(id,1,1,row.length).setValues([row]);
    props.setProperty('list_version', String(currentVersion+1));
    return jsonResponse({success:true});
  }

  if(action==='delete'){
    const id = parseInt(payload.id,10);
    sh.deleteRow(id);
    props.setProperty('list_version', String(currentVersion+1));
    return jsonResponse({success:true});
  }

  return jsonResponse({success:false,message:'Ação inválida'});
}

function slug(s){ return String(s).toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,''); }

function jsonResponse(obj){
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}