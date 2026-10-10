/* Briotto Family Airline -- the check-in desk.
 *
 * The site itself is static (docs/, served as Workers static assets). This
 * worker only answers under /api/, and keeps the guests' check-ins:
 *
 *   POST /api/checkin          a guest checks in, or changes their answers
 *   GET  /api/checkin/<ref>    a guest's own answers, so the invitation can show
 *                              them again on another phone (never the message)
 *   GET  /api/checkins         every check-in, for the Passenger Manifest only
 *
 * A check-in is filed under <ref>, a fingerprint of the guest's invitation link
 * (see checkinRef in assets/invitation.js). The link itself never comes here.
 *
 * Reading the full list needs the GitHub token the manifest already uses: it is
 * let in if GitHub says that token can push to the wedding repository. So there
 * is no second password to set up or keep, and renewing the manifest's token
 * renews this too.
 *
 * The check-ins live in one Durable Object (SQLite storage), which Cloudflare
 * creates by itself on the first deploy -- nothing to set up in the dashboard.
 */
import { DurableObject } from 'cloudflare:workers';

/* the repository the manifest saves to; whoever can push to it can read replies */
const REPO = 'Filippo-Briotto/Filippo-Victoria-Wedding';

const LEGS = ['ita', 'ams', 'wdh'];
const MAX_CHECKINS = 3000;     /* far more than the guest list; a cap on junk */
const MAX_MESSAGE = 2000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
};

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, CORS)
  });
}

const isRef = (ref) => typeof ref === 'string' && /^[A-Za-z0-9_-]{32}$/.test(ref);
const text = (v, max) => String(v == null ? '' : v).replace(/\r\n?/g, '\n').trim().slice(0, max);

/* Everything a guest can send, cleaned; null if it is not a check-in at all. */
function cleanCheckin(body) {
  if (!body || typeof body !== 'object' || !isRef(body.ref)) return null;
  const legs = {};
  let answered = 0;
  for (const id of LEGS) {
    const v = body.legs && body.legs[id];
    legs[id] = v === 'yes' || v === 'no' ? v : '';
    if (legs[id]) answered++;
  }
  if (!answered) return null;
  const people = Math.min(20, Math.max(1, parseInt(body.people, 10) || 1));
  return {
    ref: body.ref,
    name: text(body.name, 200),
    lang: body.lang === 'it' ? 'it' : 'en',
    legs,
    people,
    message: text(body.message, MAX_MESSAGE),
    keepMessage: body.keepMessage === true
  };
}

export class CheckIns extends DurableObject {
  async record(c) {
    const key = 'c:' + c.ref;
    const old = await this.ctx.storage.get(key);
    if (!old) {
      const count = (await this.ctx.storage.get('count')) || 0;
      if (count >= MAX_CHECKINS) return null;
      await this.ctx.storage.put('count', count + 1);
    }
    const now = Date.now();
    const entry = {
      ref: c.ref,
      name: c.name || (old ? old.name : ''),
      lang: c.lang,
      legs: c.legs,
      people: c.people,
      /* an empty box on a second check-in leaves the first message standing */
      message: c.message || (c.keepMessage && old ? old.message : ''),
      at: now,
      firstAt: old ? old.firstAt || old.at : now,
      times: old ? (old.times || 1) + 1 : 1
    };
    await this.ctx.storage.put(key, entry);
    return entry;
  }

  async one(ref) {
    return (await this.ctx.storage.get('c:' + ref)) || null;
  }

  async all() {
    const list = await this.ctx.storage.list({ prefix: 'c:' });
    return Array.from(list.values());
  }
}

/* Is this a token that can push to the wedding repository? Remembered for a few
   minutes per isolate, so the manifest polling does not hammer GitHub. */
const granted = new Map();
async function mayRead(request) {
  const m = /^Bearer\s+(\S+)$/.exec(request.headers.get('Authorization') || '');
  if (!m) return false;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(m[1]));
  const id = btoa(String.fromCharCode(...new Uint8Array(digest)));
  const until = granted.get(id);
  if (until && until > Date.now()) return true;
  const r = await fetch('https://api.github.com/repos/' + REPO, {
    headers: {
      'Authorization': 'Bearer ' + m[1],
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'briotto-family-airline-checkin'
    }
  });
  if (!r.ok) return false;
  const repo = await r.json();
  const ok = !!(repo.permissions && (repo.permissions.push || repo.permissions.admin));
  if (ok) granted.set(id, Date.now() + 10 * 60 * 1000);
  return ok;
}

async function api(request, env, path) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  const desk = env.CHECKINS.get(env.CHECKINS.idFromName('checkins'));

  if (path === 'checkin' && request.method === 'POST') {
    const raw = await request.text();
    if (raw.length > 8000) return json({ error: 'too large' }, 413);
    let body = null;
    try { body = JSON.parse(raw); } catch (e) {}
    const c = cleanCheckin(body);
    if (!c) return json({ error: 'not a check-in' }, 400);
    const entry = await desk.record(c);
    if (!entry) return json({ error: 'the desk is full' }, 507);
    return json({ ok: true, at: entry.at });
  }

  const own = /^checkin\/([^/]+)$/.exec(path);
  if (own && request.method === 'GET') {
    if (!isRef(own[1])) return json({ error: 'not found' }, 404);
    const entry = await desk.one(own[1]);
    if (!entry) return json({});   /* not checked in yet: nothing to show */
    return json({ legs: entry.legs, people: entry.people, at: entry.at, hasMessage: !!entry.message });
  }

  if (path === 'checkins' && request.method === 'GET') {
    if (!(await mayRead(request))) return json({ error: 'not allowed' }, 401);
    return json({ checkins: await desk.all() });
  }

  return json({ error: 'not found' }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const m = /^\/api\/(.*)$/.exec(url.pathname);
    if (m) return api(request, env, m[1].replace(/\/+$/, ''));
    return env.ASSETS.fetch(request);
  }
};
