import type { FastifyReply, FastifyRequest } from 'fastify';
import { getFinancialOverview, listDevices, setDeviceStatus } from '../services/admin.service.js';
import { createManualWithdrawal } from '../services/withdrawal.service.js';
import { env } from '../config/env.js';
import { normalizeMoney } from '../utils/money.js';
import { z } from 'zod';

export const manualWithdrawalSchema = z.object({
  destinationPhone: z.string().trim().min(6).max(64),
  amount: z.number().finite().positive(),
  channel: z.enum(['TELEBIRR', 'CBE']),
  notes: z.string().trim().max(512).optional(),
  targetDeviceId: z.string().trim().max(128).optional()
});

export async function manualWithdrawal(request: FastifyRequest, reply: FastifyReply) {
  const parsed = manualWithdrawalSchema.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ success: false, error: 'Invalid manual withdrawal request' });
  try {
    const withdrawal = await createManualWithdrawal({
      userId: env.ADMIN_WITHDRAWAL_USER_ID,
      destinationPhone: parsed.data.destinationPhone,
      amount: normalizeMoney(parsed.data.amount.toFixed(2)),
      channel: parsed.data.channel,
      notes: parsed.data.notes,
      targetDeviceId: parsed.data.targetDeviceId
    });
    return reply.code(202).send({ success: true, withdrawal });
  } catch (error) {
    if (error instanceof Error && error.message === 'WALLET_NOT_FOUND') return reply.code(404).send({ success: false, error: 'Configured gateway wallet not found' });
    if (error instanceof Error && error.message === 'INSUFFICIENT_BALANCE') return reply.code(409).send({ success: false, error: 'Insufficient gateway wallet balance' });
    if (error instanceof Error && error.message === 'TARGET_DEVICE_NOT_FOUND') return reply.code(404).send({ success: false, error: 'Target device is not registered' });
    if (error instanceof Error && error.message === 'TARGET_DEVICE_BLOCKED') return reply.code(409).send({ success: false, error: 'Target device is blocked' });
    request.log.error({ err: error }, 'manual withdrawal creation failed');
    return reply.code(500).send({ success: false, error: 'Unable to create manual withdrawal' });
  }
}

export async function overview(_request: FastifyRequest, reply: FastifyReply) {
  return reply.send({ success: true, overview: await getFinancialOverview() });
}

export async function devices(_request: FastifyRequest, reply: FastifyReply) {
  return reply.send({ success: true, devices: await listDevices() });
}

export async function updateDevice(request: FastifyRequest, reply: FastifyReply) {
  const params = request.params as { deviceId: string };
  const body = request.body as { activeStatus?: boolean };
  if (typeof body.activeStatus !== 'boolean') return reply.code(400).send({ success: false, error: 'activeStatus must be boolean' });
  const device = await setDeviceStatus(params.deviceId, body.activeStatus);
  if (!device) return reply.code(404).send({ success: false, error: 'Device not found' });
  return reply.send({ success: true, device });
}

export async function manualDashboard(_request: FastifyRequest, reply: FastifyReply) {
  return reply.type('text/html').send(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>USSD Gateway Admin</title><style>body{font-family:system-ui;max-width:960px;margin:2rem auto;padding:0 1rem;background:#f5f7fa;color:#17212b}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin:1.5rem 0}.card,form,table{background:white;border:1px solid #dce3ea;border-radius:8px;padding:1rem}.value{font-size:1.6rem;font-weight:700;margin-top:.5rem}table{width:100%;border-collapse:collapse;padding:0}th,td{text-align:left;padding:.8rem;border-bottom:1px solid #edf0f2}button,input,select,textarea{font:inherit;padding:.6rem;box-sizing:border-box}button{border:1px solid #b7c3cf;background:white;border-radius:5px;cursor:pointer}input,select,textarea{width:100%;margin:.3rem 0 1rem}textarea{min-height:5rem}@media(max-width:650px){.grid{grid-template-columns:1fr}}</style></head><body><h1>USSD Gateway Admin</h1><label>Admin API key<input id="key" type="password" autocomplete="off"></label><button onclick="load()">Load dashboard</button><section class="grid"><div class="card">Total Cash-in<div id="cash" class="value">-</div></div><div class="card">Total Withdrawals<div id="withdrawals" class="value">-</div></div><div class="card">Remaining Balance<div id="balance" class="value">-</div></div></section><h2>Direct Withdrawal Request</h2><form onsubmit="submitWithdrawal(event)"><label>Destination phone<input id="phone" required minlength="6"></label><label>Amount<input id="amount" type="number" min="0.01" step="0.01" required></label><label>Channel<select id="channel"><option>TELEBIRR</option><option>CBE</option></select></label><label>Notes<textarea id="notes" maxlength="512"></textarea></label><button type="submit">Create pending withdrawal</button><p id="result"></p></form><h2>Devices</h2><table><thead><tr><th>Device ID</th><th>Phone Model</th><th>Status</th><th>Last Seen</th><th>Action</th></tr></thead><tbody id="devices"></tbody></table><script>async function api(path,options){return fetch(path,{...options,headers:{'content-type':'application/json','x-admin-key':document.querySelector('#key').value,...(options?.headers||{})}}).then(async r=>{const body=await r.json();if(!r.ok)throw Error(body.error||'Request failed');return body})}async function load(){try{const [f,d]=await Promise.all([api('/api/admin/overview'),api('/api/admin/devices')]);cash.textContent=f.overview.total_cash_in;withdrawals.textContent=f.overview.total_withdrawals;balance.textContent=f.overview.remaining_balance;devices.innerHTML=d.devices.map(x=>'<tr><td>'+x.device_id+'</td><td>'+x.phone_model+'</td><td>'+ (x.active_status?'Active':'Blocked')+'</td><td>'+new Date(x.last_seen_at).toLocaleString()+'</td><td><button onclick="toggle(\''+x.device_id+'\','+!x.active_status+')">'+(x.active_status?'Block':'Unblock')+'</button></td></tr>').join('')}catch(e){alert(e.message)}}async function toggle(id,activeStatus){await api('/api/admin/devices/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({activeStatus})});load()}async function submitWithdrawal(e){e.preventDefault();result.textContent='Submitting...';try{const r=await api('/api/admin/withdrawals',{method:'POST',body:JSON.stringify({destinationPhone:phone.value,amount:Number(amount.value),channel:channel.value,notes:notes.value||undefined})});result.textContent='Created '+r.withdrawal.transaction_id; e.target.reset()}catch(e){result.textContent=e.message}}</script></body></html>`);
}

export async function dashboard(_request: FastifyRequest, reply: FastifyReply) {
  return reply.type('text/html').send(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>USSD Gateway Admin</title><style>body{font-family:system-ui;max-width:960px;margin:2rem auto;padding:0 1rem;background:#f5f7fa;color:#17212b}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin:1.5rem 0}.card,table{background:white;border:1px solid #dce3ea;border-radius:8px;padding:1rem}.value{font-size:1.6rem;font-weight:700;margin-top:.5rem}table{width:100%;border-collapse:collapse;padding:0}th,td{text-align:left;padding:.8rem;border-bottom:1px solid #edf0f2}button{padding:.4rem .7rem;border:1px solid #b7c3cf;background:white;border-radius:5px;cursor:pointer}input{padding:.6rem;width:100%;box-sizing:border-box;margin:.5rem 0 1rem}@media(max-width:650px){.grid{grid-template-columns:1fr}}</style></head><body><h1>USSD Gateway Admin</h1><label>Admin API key<input id="key" type="password" autocomplete="off"></label><button onclick="load()">Load dashboard</button><section class="grid"><div class="card">Total Cash-in<div id="cash" class="value">-</div></div><div class="card">Total Withdrawals<div id="withdrawals" class="value">-</div></div><div class="card">Remaining Balance<div id="balance" class="value">-</div></div></section><h2>Devices</h2><table><thead><tr><th>Device ID</th><th>Phone Model</th><th>Status</th><th>Last Seen</th><th>Action</th></tr></thead><tbody id="devices"></tbody></table><script>async function api(path,options){return fetch(path,{...options,headers:{'content-type':'application/json','x-admin-key':document.querySelector('#key').value,...(options?.headers||{})}}).then(async r=>{if(!r.ok)throw Error(await r.text());return r.json()})}async function load(){try{const [f,d]=await Promise.all([api('/api/admin/overview'),api('/api/admin/devices')]);document.querySelector('#cash').textContent=f.overview.total_cash_in;document.querySelector('#withdrawals').textContent=f.overview.total_withdrawals;document.querySelector('#balance').textContent=f.overview.remaining_balance;document.querySelector('#devices').innerHTML=d.devices.map(x=>'<tr><td>'+x.device_id+'</td><td>'+x.phone_model+'</td><td>'+ (x.active_status?'Active':'Blocked')+'</td><td>'+new Date(x.last_seen_at).toLocaleString()+'</td><td><button onclick="toggle(\''+x.device_id+'\','+!x.active_status+')">'+(x.active_status?'Block':'Unblock')+'</button></td></tr>').join('')}catch(e){alert(e.message)}}async function toggle(id,activeStatus){await api('/api/admin/devices/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({activeStatus})});load()}</script></body></html>`);
}