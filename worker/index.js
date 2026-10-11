/* Briotto Family Airline -- the check-in desk.
 *
 * The site itself is static (docs/, served as Workers static assets). This
 * worker answers under /api/, keeps the guests' check-ins, and serves the short
 * invitation links:
 *
 *   POST /api/checkin          a guest checks in, or changes their answers
 *   GET  /api/checkin/<ref>    a guest's own answers, so the invitation can show
 *                              them again on another phone (never the message)
 *   GET  /api/checkins         every check-in, for the Passenger Manifest only
 *   PUT  /api/invites          the Passenger Manifest publishes what each short
 *                              link should say (names, language, note)
 *   GET  /<code>               a short link: the invitation, with that guest's
 *                              name and note already in it
 *
 * A short link carries only its code. What it says is kept here, so the guest's
 * names and note sit in Cloudflare next to their check-in -- unlike the long
 * links, which carry them in the fragment and never send them anywhere. Long
 * links keep working exactly as before.
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
const MAX_INVITES = 2000;

/* The published invitation, which a short link is served from. Has to match
   SITE in assets/invitation.js; tools/build-site.js checks that it does. */
const INVITATION_PAGE = '/56e45cd6399d/';

/* A short link's code: eight characters, no 0/o or 1/l to mix up. Made by the
   manifest (inviteCode in manifest/src.html). */
const isCode = (code) => typeof code === 'string' && /^[a-km-np-z2-9]{8}$/.test(code);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
};

const desk = (env) => env.CHECKINS.get(env.CHECKINS.idFromName('checkins'));

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, CORS)
  });
}

const isRef = (ref) => typeof ref === 'string' && /^[A-Za-z0-9_-]{32}$/.test(ref);
const text = (v, max) => String(v == null ? '' : v).replace(/\r\n?/g, '\n').trim().slice(0, max);

/* What a short link says, cleaned: the same fields a long link carries in its
   fragment (see linkFor in manifest/src.html), plus when it was last changed. */
function cleanInvite(v) {
  if (!v || typeof v !== 'object') return null;
  return {
    t: text(v.t, 200), n: text(v.n, 4000), l: v.l === 'it' ? 'it' : 'en',
    f: text(v.f, 200), r: text(v.r, 200), s: text(v.s, 200),
    u: Number(v.u) || 0
  };
}

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

  /* Short links. An older copy never overwrites a newer one, so a phone that
     has not caught up with the list cannot undo an edit made on the other. One
     just as new does: that is the manifest saying the same guest differently,
     after its own rules for printing names changed. */
  async publish(invites) {
    let count = (await this.ctx.storage.get('invites')) || 0;
    let saved = 0;
    for (const [code, invite] of Object.entries(invites)) {
      const old = await this.ctx.storage.get('i:' + code);
      if (old && (old.u || 0) > invite.u) continue;
      if (!old) {
        if (count >= MAX_INVITES) break;
        count++;
      }
      await this.ctx.storage.put('i:' + code, invite);
      saved++;
    }
    await this.ctx.storage.put('invites', count);
    return saved;
  }

  async invite(code) {
    return (await this.ctx.storage.get('i:' + code)) || null;
  }
}

/* Is this a token that can push to the wedding repository? That is, is it the
   Passenger Manifest, which may read every check-in and publish short links.
   Remembered for a few minutes per isolate, so the manifest polling does not
   hammer GitHub. */
const granted = new Map();
async function isManifest(request) {
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

  if (path === 'checkin' && request.method === 'POST') {
    const raw = await request.text();
    if (raw.length > 8000) return json({ error: 'too large' }, 413);
    let body = null;
    try { body = JSON.parse(raw); } catch (e) {}
    const c = cleanCheckin(body);
    if (!c) return json({ error: 'not a check-in' }, 400);
    const entry = await desk(env).record(c);
    if (!entry) return json({ error: 'the desk is full' }, 507);
    return json({ ok: true, at: entry.at });
  }

  const own = /^checkin\/([^/]+)$/.exec(path);
  if (own && request.method === 'GET') {
    if (!isRef(own[1])) return json({ error: 'not found' }, 404);
    const entry = await desk(env).one(own[1]);
    if (!entry) return json({});   /* not checked in yet: nothing to show */
    return json({ legs: entry.legs, people: entry.people, at: entry.at, hasMessage: !!entry.message });
  }

  if (path === 'checkins' && request.method === 'GET') {
    if (!(await isManifest(request))) return json({ error: 'not allowed' }, 401);
    return json({ checkins: await desk(env).all() });
  }

  if (path === 'invites' && request.method === 'PUT') {
    if (!(await isManifest(request))) return json({ error: 'not allowed' }, 401);
    const raw = await request.text();
    if (raw.length > 2000000) return json({ error: 'too large' }, 413);
    let body = null;
    try { body = JSON.parse(raw); } catch (e) {}
    if (!body || !body.invites || typeof body.invites !== 'object') return json({ error: 'no invites' }, 400);
    const invites = {};
    for (const [code, v] of Object.entries(body.invites)) {
      const invite = cleanInvite(v);
      if (isCode(code) && invite) invites[code] = invite;
    }
    return json({ ok: true, saved: await desk(env).publish(invites) });
  }

  return json({ error: 'not found' }, 404);
}

/* A short link: the published invitation, with the guest written into it. An
   unknown code gets the site's ordinary not-found, so guessing at codes turns
   up nothing -- the invitation stays as unfindable as its folder. */
async function shortLink(request, env, code) {
  const invite = await desk(env).invite(code);
  if (!invite) return env.ASSETS.fetch(request);
  const page = await env.ASSETS.fetch(new Request(new URL(INVITATION_PAGE, request.url)));
  if (!page.ok) return page;
  const data = JSON.stringify({ code, data: invite }).replace(/</g, '\\u003c');
  const html = (await page.text()).replace('<body>', () => '<body>\n<script>window.INVITE = ' + data + ';</script>');
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      /* the names and note can be edited, so never serve an old copy */
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
      'Referrer-Policy': 'no-referrer'
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const m = /^\/api\/(.*)$/.exec(url.pathname);
    if (m) return api(request, env, m[1].replace(/\/+$/, ''));
    const code = /^\/([^/]+)\/?$/.exec(url.pathname);
    if (code && isCode(code[1]) && request.method === 'GET') return shortLink(request, env, code[1]);
    return env.ASSETS.fetch(request);
  }
};
