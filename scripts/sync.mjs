import { chromium } from 'playwright';
import { parse } from 'csv-parse/sync';
import admin from 'firebase-admin';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const get = (key) => { const value = process.env[key]; if (!value) throw new Error(`Configure o secret ${key}`); return value; };
const normalizeEmail = s => String(s ?? '').trim().toLowerCase();
const asNumber = s => Number(String(s ?? '0').replace(/\./g, '').replace(',', '.')) || 0;
const asISO = s => { const m = String(s ?? '').match(/^(\d\d)-(\d\d)-(\d{4})(?:\s+(\d\d):(\d\d))?/); return m ? `${m[3]}-${m[2]}-${m[1]}${m[4] ? `T${m[4]}:${m[5]}:00-03:00` : 'T00:00:00-03:00'}` : null; };
const hash = s => createHash('sha256').update(s).digest('hex');

async function exportCSV() {
 const browser = await chromium.launch({ headless:true });
 try {
  const ctx = await browser.newContext({ acceptDownloads:true, locale:'pt-BR' });
  const page = await ctx.newPage();
  await page.goto('https://cms.spott.eco/pt/transactions', {waitUntil:'domcontentloaded',timeout:60000});
  // Seletores devem ser identificados no painel autenticado antes de ativar o agendamento.
  if (!page.url().includes('/transactions') || await page.locator(get('SPOTT_USER_SELECTOR')).count()) {
   await page.locator(get('SPOTT_USER_SELECTOR')).first().fill(get('SPOTT_USER'));
   await page.locator(get('SPOTT_PASS_SELECTOR')).first().fill(get('SPOTT_PASSWORD'));
   await page.locator(get('SPOTT_LOGIN_BUTTON_SELECTOR')).first().click();
   await page.goto('https://cms.spott.eco/pt/transactions', {waitUntil:'domcontentloaded',timeout:60000});
  }
  const [download] = await Promise.all([
   page.waitForEvent('download', {timeout:60000}),
   page.locator(get('SPOTT_EXPORT_SELECTOR')).first().click()
  ]);
  if (!download.suggestedFilename().toLowerCase().endsWith('.csv')) throw new Error('O download não é CSV');
  return await readFile(await download.path(), 'utf8');
 } finally { await browser.close(); }
}

const parseRows = csv => {
 const rows = parse(csv, {columns:true,skip_empty_lines:true,bom:true});
 if (!rows.length || !('E-mail do motorista' in rows[0]) || !('Início da Transação' in rows[0]) || !('Energia' in rows[0])) throw new Error('Cabeçalho CSV não reconhecido');
 const result = new Map();
 for (const r of rows) {
  const email = normalizeEmail(r['E-mail do motorista']);
  const start = asISO(r['Início da Transação']);
  const station = String(r['Carregador'] ?? '').trim();
  if (!email || !start || !station) continue;
  // O CSV fornecido não inclui ID explícito da sessão; combinação abaixo é aproximação.
  const id = hash(`${email}|${station}|${start}`);
  const completed = String(r['Recargas']).trim().toLowerCase() === 'finalizado';
  result.set(id, {email, station, startedAt:start, endedAt:asISO(r['Fim da Transação']), kwh:asNumber(r['Energia']), completed});
 }
 return [...result].map(([id,row])=>({id,...row}));
};

async function main() {
 const account=JSON.parse(get('FIREBASE_SERVICE_ACCOUNT_JSON'));
 admin.initializeApp({credential:admin.credential.cert(account)});
 const db=admin.firestore();
 const csv=process.env.LOCAL_CSV_PATH ? await readFile(process.env.LOCAL_CSV_PATH,'utf8') : await exportCSV();
 const records=parseRows(csv);
 if (!records.length) throw new Error('Nenhuma transação válida encontrada; importação interrompida');
 let saved=0;
 for (let i=0; i<records.length; i+=350) {
  const batch=db.batch();
  for (const r of records.slice(i,i+350)) {
   // Não incluir CPF, nome, número de celular nem CSV bruto no banco.
   const {id,...payload}=r;
   batch.set(db.collection('spott_transactions').doc(id), {...payload,updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
   saved++;
  }
  await batch.commit();
 }
 await db.collection('sync_meta').doc('spott').set({lastSync:admin.firestore.FieldValue.serverTimestamp(),count:saved,status:'ok'},{merge:true});
 console.log(`Sincronização concluída: ${saved} registros. Nenhum CSV publicado.`);
}
main().catch(e=>{console.error('Falha de sincronização:',e.message);process.exitCode=1;});
