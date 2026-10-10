# Briotto Family Airline

The wedding invitation for **Filippo Briotto** and **Victoria Vanity Pamwenatse Akuunda**,
built as mail rather than a web page: a sealed airmail envelope you click open, with a letter
and three boarding passes sitting inside it. You pull out whichever you want — the passes can
be printed.

Three legs, one marriage:

| | Route | When | |
|---|---|---|---|
| 1 | `HOM → ITA` Italy | 21 December 2026 | The party |
| 2 | `ITA → AMS` Amsterdam | 29 December 2026 | The vows — intimate ceremony, no reception |
| 3 | `AMS → WDH` Windhoek, Namibia | 2027, date to be announced | The traditional ceremony |

Every leg flies **1D0**.

## Sending it

**Send a link, not a file.** A `.html` attachment has no app associated with it on most
phones — WhatsApp and mail apps download it and then dead-end. A link opens in any browser.

The invitation is published at an unguessable address:

    https://filippo-victoria-wedding.filippobriotto.workers.dev/56e45cd6399d/#<the guest>

The same files are also on GitHub Pages, at
`https://filippo-briotto.github.io/Filippo-Victoria-Wedding/`, but links go out on the
Cloudflare address because `github.io` cannot be reached from some networks: from Namibia it
fails with `ERR_CONNECTION_FAILED`. Cloudflare publishes `docs/` by itself every time this
branch changes, using [`wrangler.jsonc`](wrangler.jsonc).

Nothing links to it, it carries `noindex,nofollow`, and `docs/robots.txt` tells every crawler
to stay away — so it is reachable only by someone you hand the address to (and by anyone they
forward it to; it is unfindable, not secret). The guest's name and note ride in the fragment,
the part after the `#`, which browsers **never send to the server** — so they exist only in the
link itself and in the reader's browser. GitHub sees a request for the page and nothing more.

### One-time setup

On GitHub: **Settings → Pages → Source: Deploy from a branch**, branch
`claude/wedding-invitation-airline-sjbjl4`, folder `/docs`. Save, wait a minute, and the address
above is live.

To move it to a different unguessable folder later, change `SITE` at the top of
[`assets/invitation.js`](assets/invitation.js) and run `node tools/build-site.js` — every link
minted after that points at the new one, and the old folder can be deleted.

## Minting an invitation

Open **`minter.html`** in any browser — double-click it, no server and no install needed. It is
one self-contained file, so it works anywhere, including a machine that has never seen this
repo. (`index.html` is the same desk but loads its scripts from `assets/`; work on that one and
run `node tools/build-minter.js` to rebuild `minter.html`.)

1. Type the guest's name. The three printed forms (full on the passes, first name in the
   letter, initial + surname on the stub) fill in automatically; overtype any of them if a
   name needs a hand.
2. Write a personal note, or leave it empty and the note block disappears.
3. Pick English or Italiano.
4. **Copy guest link** — that is what you send. **Send the link…** hands it to the OS share
   sheet on a phone; **Open the link** checks it yourself.

The file buttons underneath still work if you ever want a standalone copy — **Download**, or
**Share the file…** on a phone — but a file is the awkward way to send this to a guest. That single file is the whole
   invitation — fonts and artwork travel inside it, it makes no network requests, and it works
   as an email attachment on a plane. Roughly 170 KB.

If your browser blocks the download (Safari sometimes does from `file://`), use **Share**, **Open
in a new tab** and save from there, or **Copy the HTML** and paste it into a file yourself.

`minter.html` needs nothing beside it — no `assets/` folder, no network. If you ever see a banner
saying *“this is the development copy”*, you have opened `index.html` by mistake.

## The guest list

The **Passenger Manifest** is the shared guest list, on the same Pages site as the invitation:

    https://filippo-victoria-wedding.filippobriotto.workers.dev/ffaa3ad351b4/

(It also opens on the GitHub address, which does not work from Namibia.)

It is in a folder of its own, so a guest looking at their link learns nothing about where the list
is. It works on a laptop or a phone, and the other person's changes show up within about 20 seconds.

- **Add passengers** one at a time, or **Paste a list**: one per line, and a phone, email and
  group can go on the same line separated by tabs (straight from a spreadsheet) or semicolons.
- Open a passenger to set the names printed on the invitation, the language and the **personal
  note in the letter**. Their invitation link is built from those, the same way the minting desk
  builds it.
- **Copy message** gives you the link plus a short covering text (edit it once under **Message
  text**, in English and Italian). **WhatsApp** opens a chat with it filled in.
- **Mark as sent** records when, how, and which of you sent it. If you change the name, note or
  language afterwards, the row says *changed since*, because the guest still has the old link.
- **RSVP** per leg (Amsterdam, Windhoek, Italy), **Our notes** for things the guest never sees,
  and **Export CSV** for a spreadsheet copy.

### Where the list is kept

In this repository, on a branch of its own called `guestlist-data`: `guests.json` is the list and
`access.json` is the one GitHub token the page saves with. The repository is public, so both files
are **encrypted** (AES-GCM, with a key derived from the passphrase by PBKDF2) before they leave the
browser. GitHub only ever holds scrambled copies. The branch shares no history with the site, so
saving the list never rebuilds Pages.

**Choose the passphrase carefully and keep it written down.** Without it nobody can open the list,
including you. Use a short sentence rather than a word: anyone who guessed it could open the list.

### Getting in

**Filippo, once:** open the page and type a new passphrase. It says the list is not set up yet and
asks for a GitHub token: [create a fine-grained token](https://github.com/settings/personal-access-tokens/new)
with only the `Filippo-Victoria-Wedding` repository selected, **Contents: Read and write**, and an expiry after the last
wedding date. Paste it, type the passphrase again, and pick your name.

**Victoria:** nothing to set up. She opens the page, types the passphrase and picks her name, and
it stays open on that phone. (A sign-in link made earlier, ending in `#join=…`, still works.)

**When the token expires,** the page says so. Filippo uses **Set up or renew access** on the sign-in
screen with a new token; nobody else has to do anything.

Changes save on their own after a short pause. If you both save at the same moment, the page takes
the other copy, keeps the newest edit of each guest, and saves again, so working on different guests
at the same time loses nothing.

### Changing the page

The source is [`manifest/src.html`](manifest/src.html). `node tools/build-manifest.js` inlines
`assets/invitation.js` into it and writes `docs/ffaa3ad351b4/index.html`. Rebuild after changing
the page, `SITE` or the payload format, so that new links stay in step with the site.

## Changing the wedding details

Everything factual lives in one place: the `LEGS` array at the top of
[`assets/invitation.js`](assets/invitation.js).

```js
{
  id: 'ams',
  from: 'ITA', to: 'AMS',
  seat: '1B', gate: '29', tkt: '2912-2026',
  time: '',   // e.g. '15:00'
  venue: ''   // e.g. 'Stadhuis, Amstel 1'
}
```

Leave `time` and `venue` empty and the pass prints *“full details to follow”*. Fill either in
and it prints instead — so when the Amsterdam venue is booked, one line here updates every
invitation minted from then on. Dates, city names and everything else visible are in `COPY`
just below, in both languages.

## What's in the repo

| | |
|---|---|
| `minter.html` | **the minting desk, one self-contained file** — this is the one to use |
| `index.html` | the same desk, loading its scripts from `assets/` — work on this one |
| `manifest/src.html` | the shared guest list page; built into `docs/ffaa3ad351b4/` |
| `assets/invitation.js` | **the wedding facts**, both languages of copy, the drawn marks |
| `assets/template.js` | the invitation document itself: markup, styles, the envelope |
| `assets/fonts.js` | Cormorant Garamond + Courier Prime, base64'd (generated) |
| `assets/stamp/` | drop artwork here to replace the stamp's drawn flowers |
| `assets/stamp-art.js` | that picture, base64'd (generated) |
| `assets/fonts/` | the source `.woff2` files and their SIL Open Font Licences |
| `example-invitation.html` | a minted sample, for looking at and test-printing |
| `tools/build-fonts.py` | regenerates `assets/fonts.js` from `assets/fonts/` |
| `tools/build-textures.py` | renders the paper, ticket, odelela and linen tiles into `assets/textures.js` |
| `tools/build-flowers.py` | paints the watercolour flowers into `assets/flowers.js` |
| `tools/prepare-stamp-art.py` | fits a round stamp illustration to the frame |
| `tools/build-stamp-art.py` | regenerates `assets/stamp-art.js` from `assets/stamp/` |
| `tools/build-example.js` | regenerates `example-invitation.html` |
| `tools/build-minter.js` | regenerates `minter.html` from `index.html` + `assets/` |
| `tools/build-site.js` | regenerates the published page under `docs/` |
| `docs/` | what GitHub Pages serves — the page, plus a robots.txt that forbids crawling |

The invitation is deliberately plain JavaScript with no build step and no dependencies: open a
file, edit it, reload. The only generated file is `assets/fonts.js`.

## Notes on the invitation

- **The stamp carries the drawing of you two**, with the date on the band underneath. To swap
  the drawing for another one:

      python3 tools/prepare-stamp-art.py <the new picture>
      python3 tools/build-stamp-art.py

  The first crops off the design's own scalloped rim (the frame draws its own perforations, and
  two sets of teeth is one too many) and maps it onto the stamp's paper and ink so the artwork's
  ground and the stamp stock are the same colour with no seam. Delete
  `assets/stamp/couple.png` and rerun the second to fall back to the drawn posy, whose colours
  are the `BLOOM` block at the top of `assets/invitation.js`.
- **The envelope is the same design at every size.** Everything inside it — type, stamp,
  cancellation, wax seal — is sized off one `--w` custom property set to the envelope's own
  width, so a phone gets the same composition as a desktop, just smaller, rather than a
  re-laid-out one.
- **Two envelopes.** `ENVELOPE` at the top of [`assets/invitation.js`](assets/invitation.js) is
  `'quiet'`: plain ivory with a hairline plate rule, a drawn flap and a red wax seal with the
  monogram pressed into it. Set it to `'airmail'` for the striped par avion border and its
  little blue label instead. Everything else is identical.
- **Interaction is physical, not chrome.** There is no navigation bar. Click the envelope to
  break the seal: the flap turns over on its fold, then the letter rises out of the middle
  with the boarding passes lying across it at an angle, their corner sticking out. Pull out
  whichever you want by clicking the paper itself.
  Click the shrunken envelope at the top to put things back; `Esc` does the same, and the paper
  slides back in behind the envelope as it grows.
- **The letter arrives folded and opens on its crease.** The fold is real: two clipped copies of
  the letter, hinged along the middle, with the bottom half folded back behind the top one. It
  swings down, the shadow along the crease lifts, and then the scaffold is thrown away and the
  actual letter takes its place — so print, text selection and screen readers only ever see one
  letter.
- **The letter is two sheets of A4, not one long page.** A zero-width float whose top padding is
  a percentage of the sheet's own width holds each to the proportions of the paper it stands
  for; a long personal note can push the second one taller, as a real second sheet would be.
  Once the letter is open the sheets lie flat, with no crease drawn across them: a line through
  the middle of the page read as a rendering glitch, not as a fold.
- **It is meant to read as paper on a table, not as cards on a page.** Everything lies on a
  plain linen cloth inside a painted floral frame — woven, and a shade deeper than the
  stationery, so the paper stands apart from what it lies on; light falls across each sheet, the cut
  edge catches it, and the far edge curves off. There is deliberately no pool of light over the surface: any such
  overlay is only ever as tall as the viewport, so down a long page it ends in a hard horizontal
  edge across the middle of the ground.
- **The papers are real textures**, rendered by
  [`tools/build-textures.py`](tools/build-textures.py) into `assets/textures.js`: writing stock
  for the letter and the envelope, thinner and whiter ticket stock for the passes, and a linen weave for the cloth underneath. They are built
  in the frequency domain — a random field shaped by a 1/f falloff and inverse-transformed —
  which gives layered scales rather than one uniform fizz, fibre by stretching the falloff along
  an axis, and seamless tiles for free, since an inverse FFT is periodic. Rerun it to change
  them; the tiles are about 10–20 KB each.
- **The flowers are painted, not drawn**, by
  [`tools/build-flowers.py`](tools/build-flowers.py) into `assets/flowers.js`, and they frame the
  surface the mail lies on rather than the stationery: two paintings, each used twice, the second
  pair turned through half a turn so no corner repeats its neighbour. The frame is fixed to the
  viewport — the surface does not scroll, only the mail lying on it does — so a full-page
  screenshot shows it across the top and bare ground below, since a capture stitches together
  shots of a layer that only ever paints one screenful. On screen it is where it should be. Watercolour reads as watercolour because
  of what happens at the edge of a wash, so every petal gets a soft body, a rim of pigment
  settled just inside its boundary, a boundary pushed around by a noise field, and granulation
  over the whole thing; washes composite by multiplication, the way transparent paint layers do,
  and a petal painted over a stem first lifts the stem back toward white so it can cover it.
  Each painting is a JPEG on white shown with `mix-blend-mode: multiply` — white is where no
  pigment landed, so the surface keeps its own texture through them, at a fraction of what an
  alpha PNG of the same art would cost.
- **The odelela print is the Namibian half of the wedding.** It lines the envelope, so it is the
  first thing you see when the flap turns over, and runs as a band down the outside edge of every
  boarding pass. Its palette is not a matter of taste — fuchsia, scarlet, black and blush printed
  *on* white — so it is clustered straight out of the reference invitations rather than picked by
  eye. The tile is a half-drop repeat of concentric rosettes, drawn at three times scale and
  averaged down so the dye edges are soft, then pushed through a weave.
- **The passes are dealt out** of the envelope one after another, landing overlapped and each
  at its own angle, the way tickets fall. They have punched perforations and notched corners
  along the tear line. On paper they straighten up and separate again.
- **Print** gives you the three passes on A4 and nothing else — no envelope, no letter, no
  buttons, no grain.
- Works with JavaScript off (the letter and passes are simply laid out down the page), respects
  `prefers-reduced-motion` — which skips the fold and the deal entirely — and reads down to
  340px wide.
