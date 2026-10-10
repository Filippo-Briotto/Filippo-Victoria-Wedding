/* Briotto Family Airline -- the invitation document.
 *
 * buildDocument() returns one complete, standalone HTML file: an envelope you
 * click open, from which you can pop out either the letter or the three
 * boarding passes, with a print option for the passes. Everything travels
 * inside the file -- fonts as base64, marks as inline SVG -- so it works from
 * an email attachment with no network at all.
 *
 * Requires assets/invitation.js (facts + copy + drawing helpers) to be loaded first.
 */
(function () {
  'use strict';

  var I = window.INVITATION;
  var esc = I.esc;

  function fieldCell(label, value, extraClass) {
    return '' +
      '<div class="field' + (extraClass ? ' ' + extraClass : '') + '">' +
        '<span class="field__label">' + esc(label) + '</span>' +
        '<span class="field__value">' + esc(value) + '</span>' +
      '</div>';
  }

  function planeGlyph() {
    return '<svg class="plane" viewBox="0 0 56 20" width="56" height="20" aria-hidden="true">' +
      '<path d="M2 10 H50" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="2 4" opacity=".55"/>' +
      '<path d="M50 10 L24 1.5 L29 10 L24 18.5 Z" fill="currentColor"/>' +
      '</svg>';
  }

  /* Small per-pass irregularities. Real tickets never land dead square, and
     three identical rectangles read as a table rather than as paper. */
  var TILTS = [
    { from: '-3.2deg', rest: '-0.85deg' },
    { from: '2.6deg', rest: '0.7deg' },
    { from: '-2deg', rest: '-0.45deg' }
  ];

  function pass(leg, t, names, index) {
    var legCopy = t.legs[leg.id];
    var detail = leg.venue || leg.time
      ? [leg.time, leg.venue].filter(Boolean).join(' · ')
      : t.detailsToFollow;

    var tilt = TILTS[index % TILTS.length];

    return '' +
    '<article class="pass paper" tabindex="0" aria-label="' + esc(t.boardingPass + ' — ' + legCopy.toCity) + '"' +
      ' style="--from-tilt:' + tilt.from + ';--rest-tilt:' + tilt.rest +
      ';--deal-delay:' + (0.14 + index * 0.13).toFixed(2) + 's">' +
      '<div class="pass__main">' +
        '<header class="pass__brand">' +
          '<span class="pass__mark">' + I.roundelSvg(30) + '</span>' +
          '<span class="pass__brandtext">' +
            '<span class="pass__brandname">' + esc(t.brand) + '</span>' +
            '<span class="pass__strap">' + esc(t.strapline) + '</span>' +
          '</span>' +
          '<span class="pass__no">' + esc(String(index + 1)) + ' / 3</span>' +
        '</header>' +

        '<h3 class="pass__title">' + esc(t.boardingPass) + '</h3>' +

        '<div class="pass__grid pass__grid--top">' +
          fieldCell(t.lPassenger, names.full, 'field--wide') +
          fieldCell(t.lClass, t.className) +
          fieldCell(t.lFlight, I.FLIGHT) +
          fieldCell(t.lDate, legCopy.date, 'field--nowrap') +
        '</div>' +

        '<div class="pass__route">' +
          '<div class="route__end">' +
            '<span class="route__code">' + esc(leg.from) + '</span>' +
            '<span class="route__city">' + esc(legCopy.fromCity) + '</span>' +
          '</div>' +
          '<div class="route__mid">' + planeGlyph() + '</div>' +
          '<div class="route__end route__end--to">' +
            '<span class="route__code">' + esc(leg.to) + '</span>' +
            '<span class="route__city">' + esc(legCopy.toCity) + '</span>' +
          '</div>' +
        '</div>' +

        '<div class="pass__grid pass__grid--bottom">' +
          fieldCell(t.lSeat, leg.seat) +
          fieldCell(t.lGate, leg.gate) +
          fieldCell(t.lTkt, leg.tkt) +
          fieldCell(t.lStatus, t.confirmed) +
        '</div>' +

        '<div class="pass__occasion">' +
          '<h4>' + esc(legCopy.title) + '</h4>' +
          '<p>' + esc(legCopy.blurb) + '</p>' +
          '<p class="pass__follow">' + esc(detail) + '</p>' +
        '</div>' +
      '</div>' +

      '<div class="pass__stub">' +
        '<span class="pass__band"></span>' +
        '<span class="stub__brand">' + esc(t.brand) + '</span>' +
        '<div class="stub__rows">' +
          '<div class="stub__row"><span>' + esc(t.lPassenger) + '</span><b>' + esc(names.short) + '</b></div>' +
          '<div class="stub__row"><span>' + esc(t.lFlight) + '</span><b>' + esc(I.FLIGHT) + '</b></div>' +
          '<div class="stub__row"><span>' + esc(t.lDate) + '</span><b>' + esc(legCopy.date) + '</b></div>' +
          '<div class="stub__row"><span>' + esc(t.lFrom) + '</span><b>' + esc(leg.from) + '</b></div>' +
          '<div class="stub__row"><span>' + esc(t.lTo) + '</span><b>' + esc(leg.to) + '</b></div>' +
          '<div class="stub__row"><span>' + esc(t.lSeat) + '</span><b>' + esc(leg.seat) + '</b></div>' +
          '<div class="stub__row"><span>' + esc(t.lTkt) + '</span><b>' + esc(leg.tkt) + '</b></div>' +
        '</div>' +
        '<span class="stub__tag">' + esc(legCopy.title) + '</span>' +
        I.barcode(leg.tkt + names.short) +
      '</div>' +
    '</article>';
  }

  function letter(t, names, note) {
    var itinerary = I.LEGS.map(function (leg) {
      var legCopy = t.legs[leg.id];
      return '' +
        '<li class="itin__row">' +
          '<span class="itin__code">' + esc(leg.to) + '</span>' +
          '<span class="itin__what">' +
            '<b>' + esc(legCopy.title) + '</b>' +
            '<em>' + esc(legCopy.toCity) + '</em>' +
          '</span>' +
          '<span class="itin__when">' + esc(legCopy.dateLong) + '</span>' +
        '</li>';
    }).join('');

    var noteBlock = note
      ? '<div class="letter__note">' +
          '<h3>' + esc(t.noteTitle) + '</h3>' +
          '<p>' + esc(note).replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>') + '</p>' +
        '</div>'
      : '';

    /* Two sheets of A4, not one very long one. */
    return '' +
    '<article class="letter">' +
      '<div class="sheet paper">' +
        '<header class="letter__head">' +
          '<span class="letter__mark">' + I.roundelSvg(46) + '</span>' +
          '<span class="letter__brand">' + esc(t.brand) + '</span>' +
          '<span class="letter__strap">' + esc(t.strapline) + '</span>' +
        '</header>' +

        '<div class="letter__ref">' +
          '<span>' + esc(t.bookingTitle) + '</span>' +
          '<span>' + esc(t.refLabel) + ' · ' + esc(I.FLIGHT) + '-28122026</span>' +
        '</div>' +

        '<p class="letter__greeting">' + esc(t.greeting(names.first)) + '</p>' +
        t.letterBody.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') +

        '<section class="letter__itin">' +
          '<h3>' + esc(t.itineraryTitle) + '</h3>' +
          '<ul class="itin">' + itinerary + '</ul>' +
        '</section>' +
        '<span class="sheet__no">' + esc(t.pageOf(1, 2)) + '</span>' +
      '</div>' +

      '<div class="sheet paper">' +
        noteBlock +

        '<footer class="letter__sign">' +
          '<p class="signoff">' + esc(t.signOff) + '</p>' +
          '<p class="couple">' + esc(I.COUPLE.shortOne) + ' &amp; ' + esc(I.COUPLE.shortTwo) + '</p>' +
          '<p class="couple couple--full">' + esc(I.COUPLE.one) + ' &amp; ' + esc(I.COUPLE.two) + '</p>' +
        '</footer>' +

        '<p class="letter__small">' + esc(t.smallPrint) + '</p>' +
        '<span class="sheet__no">' + esc(t.pageOf(2, 2)) + '</span>' +
      '</div>' +
    '</article>';
  }


  /* The two things sitting inside the envelope. They are the interface: the
     letter's folded top edge and the edges of the three passes stick up out of
     the envelope mouth, and you pull the one you want. No navigation chrome. */
  /* What is inside the envelope, and the only way in. The letter sits square in
     the middle and comes up first; the passes are tucked in beside it, angled,
     and only their corner shows -- which is what you actually see when you open
     an envelope with both in it. */
  function slips(t) {
    var ticketEdges = I.LEGS.map(function (leg, i) {
      var legCopy = t.legs[leg.id];
      return '<span class="tedge tedge--' + i + '">' +
        '<i>' + esc(legCopy.date) + '</i>' +
        '<b>' + esc(leg.to) + '</b>' +
      '</span>';
    }).join('');

    return '' +
    '<div class="chooser">' +
      '<button type="button" class="slip slip--tickets" data-stage-to="tickets" aria-label="' + esc(t.tabTickets) + '">' +
        '<span class="slip__inner paper">' +
          '<span class="slip__caption">' + esc(t.tabTickets) + '</span>' +
          '<span class="tedges">' + ticketEdges + '</span>' +
        '</span>' +
      '</button>' +
      '<button type="button" class="slip slip--letter" data-stage-to="letter" aria-label="' + esc(t.tabLetter) + '">' +
        '<span class="slip__inner paper">' +
          '<span class="slip__caption">' + esc(t.tabLetter) + '</span>' +
          '<span class="slip__head">' +
            '<span class="slip__mark">' + I.roundelSvg(26) + '</span>' +
            '<span class="slip__brand">' + esc(t.brand) + '</span>' +
          '</span>' +
          '<span class="slip__rule"></span>' +
          '<span class="slip__rule slip__rule--short"></span>' +
        '</span>' +
      '</button>' +
    '</div>';
  }

  function styles(fontCss, tex, flo) {
    return fontCss + '\n' + [
'*,*::before,*::after{box-sizing:border-box}',
'html{-webkit-text-size-adjust:100%}',
/* headroom for the letter and the passes to rise out of the envelope */
'body{margin:0;padding:clamp(168px,18vh,196px) 16px 96px;min-height:100vh;',
'  font-family:"Cormorant Garamond",Garamond,"Hoefler Text","Times New Roman",serif;',
/* The mail lies on a linen cloth -- plain, so the invitation carries all the
   colour and the ground stays out of its way. There is deliberately no pool of
   light over it: any such overlay is only ever as tall as the viewport, so down
   a long page it ends in a hard horizontal edge across the middle of the
   surface. The flowers do the framing instead.
   It is cloth, not paper, and a shade deeper and greyer than the stationery:
   it used to be the writing-paper tile itself, and with the same texture on
   both the envelope and the letter simply dissolved into the ground. */
'  color:#201c17;background-color:#e4ddcf;',
'  background-image:var(--ground-tex);background-size:240px 240px;',
'  display:flex;flex-direction:column;align-items:center;position:relative}',
':root{--on-cloth:#6d5744;--paper:#f7f1e3;--paper-2:#efe6d3;--ink:#201c17;--ink-2:#6d6153;',
'  --line:#cbbca1;--blue:#123a4d;--red:#a83f2a;--gold:#b3893f;',
'  --mono:"Courier Prime","Courier New",monospace;',
'  --paper-tex:url(' + (tex.paper || '') + ');',
'  --motif-tex:url(' + (tex.motif || '') + ');',
'  --ground-tex:url(' + (tex.ground || '') + ');',
'  --bloom-a:url(' + (flo.cornerA || '') + ');',
'  --bloom-b:url(' + (flo.cornerB || '') + ');',
/* Boarding passes are not printed on writing paper. Ticket stock is thinner and
   whiter, drawn through a press lengthwise, so it gets its own tile and colour. */
'  --ticket:#f9f6ec;--ticket-2:#f2ecdd;',
'  --ticket-tex:url(' + (tex.ticket || '') + ');',
/* Paper is not a flat fill. Light falls across a sheet, the cut edge catches it,
   and the far edge curves away -- these three do most of the work. */
'  --sheen:linear-gradient(163deg,rgba(255,255,255,.62),rgba(255,255,255,.14) 30%,rgba(255,255,255,0) 58%);',
'  --curve:radial-gradient(118% 86% at 50% 106%,rgba(112,88,48,.17),rgba(112,88,48,0) 56%);',
'  --cut-edge:0 0 0 1px rgba(120,100,64,.14),inset 0 1px 0 rgba(255,255,255,.62),',
'    inset 0 -1px 0 rgba(120,100,64,.18);',
'  --lift:0 2px 3px -1px rgba(70,48,24,.3),0 15px 20px -11px rgba(70,48,24,.28),',
'    0 46px 66px -34px rgba(60,40,20,.4)}',

/* Every sheet carries the paper tile itself rather than a noise overlay -- it has
   fibre, mottling and tooth in it, where one octave of fractal noise only ever
   gave a uniform fizz. It sits beneath the lighting gradients, which are
   semi-transparent, so both read at once. */
'.paper{position:relative;isolation:isolate}',

/* ---------- the envelope ---------- */
/* One width drives everything inside the envelope, so the composition is the
   same on a phone as on a desktop -- only smaller. It used to re-lay-out
   under 640px, which is why the phone looked like a different design. */
'.env-wrap{--w:min(600px,calc(100vw - 32px));position:relative;z-index:5;width:min(600px,100%);',
/* The wrapper is a spacer: the envelope inside is absolutely positioned, so this
   reserves the room it takes up. Its height is the envelope's own aspect applied
   to --w, and it shrinks by the same factor the envelope scales by -- in CSS,
   because measuring it in script came back 0 on mobile and left the envelope
   hanging over everything below it. */
'  height:calc(var(--w) / 1.62);',
'  transition:height .85s cubic-bezier(.3,.75,.25,1) .06s}',
'body[data-stage="letter"] .env-wrap,body[data-stage="tickets"] .env-wrap{',
'  height:calc(var(--w) / 1.62 * .26)}',
'.envelope{position:absolute;left:0;top:0;width:100%;aspect-ratio:1.62;perspective:1500px;',
'  transform-style:preserve-3d;',
'  transform-origin:50% 0;transition:transform .85s cubic-bezier(.3,.75,.25,1) .06s,filter .5s}',
/* The envelope lies ON the surface, so it casts a shadow onto it: a tight one
   where the paper touches, and a soft one spreading out below. */
'.env-back{position:absolute;inset:0;border-radius:4px;background:#d9cbaf;pointer-events:none;',
'  box-shadow:0 1px 0 rgba(255,255,255,.35) inset,0 0 0 1px rgba(110,86,52,.16),',
'    0 2px 4px -1px rgba(60,40,20,.22),0 18px 30px -14px rgba(60,40,20,.38),',
'    0 44px 70px -30px rgba(60,40,20,.42)}',

/* the address face */
'.env-front{position:absolute;inset:0;z-index:3;border-radius:4px;',
'  background:var(--paper-tex) 0 0/216px 216px repeat,var(--paper);',
'  pointer-events:none;',
'  box-shadow:0 6px 14px -12px rgba(60,44,20,.75) inset,0 -1px 0 rgba(120,100,64,.22) inset,',
'    0 0 0 1px rgba(110,86,52,.18),0 1px 0 1px rgba(255,255,255,.35) inset}',
/* the airmail band: fine, and at the edge where it belongs */
'.env-front::before{content:"";position:absolute;inset:0;border-radius:4px;padding:6px;',
'  background:repeating-linear-gradient(115deg,var(--red) 0 7px,transparent 7px 15px,',
'    var(--blue) 15px 22px,transparent 22px 30px);opacity:.72;',
'  -webkit-mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0);',
'  mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0)}',

/* the little blue airmail label, stuck on slightly crooked */
'.paravion{position:absolute;left:8%;top:50%;display:flex;flex-direction:column;gap:1px;',
'  padding:5px 11px 6px;background:#eef3f6;border:1px solid rgba(18,58,77,.5);',
'  transform:rotate(-1.4deg);box-shadow:0 1px 2px rgba(60,44,20,.16)}',
'.paravion b{font-family:var(--mono);font-size:calc(var(--w) * .0167);font-weight:700;letter-spacing:.22em;',
'  text-transform:uppercase;color:var(--blue);line-height:1}',
'.paravion i{font-family:var(--mono);font-style:normal;font-size:calc(var(--w) * .0125);letter-spacing:.16em;',
'  text-transform:uppercase;color:rgba(18,58,77,.65);line-height:1}',

/* who it is for */
'.env-address{position:absolute;left:8%;right:36%;top:63%;display:flex;flex-direction:column;gap:6px}',
'.env-address .to{font-family:var(--mono);font-size:calc(var(--w) * .015);letter-spacing:.26em;',
'  text-transform:uppercase;color:var(--ink-2)}',
'.env-address .who{font-size:calc(var(--w) * .05);font-weight:600;line-height:1.14;color:var(--blue);',
'  border-bottom:1px solid rgba(120,100,64,.4);padding-bottom:calc(var(--w) * .013);letter-spacing:.005em}',
'.env-address .via{font-family:var(--mono);font-size:calc(var(--w) * .0142);letter-spacing:.2em;',
'  text-transform:uppercase;color:var(--ink-2)}',

/* stamp, and the cancellation landing across it */
'.env-stamp{position:absolute;right:7.5%;top:46%;width:calc(var(--w) * .147);transform:rotate(2.6deg);',
'  filter:drop-shadow(0 1px 2px rgba(60,44,20,.3))}',
'.env-postmark{position:absolute;right:4%;top:41%;width:36%;pointer-events:none;',
'  transform:rotate(-8deg);transform-origin:78% 40%}',
'.postmark{display:block;width:100%;height:auto}',
'.stamp{display:block;width:100%;height:auto}',

/* the flap, and the wax holding it down */
/* The flap is two faces back to back, turning on the fold in the envelope's own
   3D space. Two nested elements: the inner one turns, the outer one owns depth.
   Closed, it sits just in front of the envelope; open, it has folded back behind
   everything, which is where a flap goes once the letter comes out. The depth
   swap is instant but delayed to the moment the flap is edge-on and has no area
   on screen, so it cannot be seen happening. */
'.env-flap{position:absolute;left:0;top:0;width:100%;height:40%;pointer-events:none;',
'  transform-style:preserve-3d;transform:translateZ(2px);',
'  transition:transform 0s linear .47s}',
'.env-flap__turn{position:absolute;inset:0;transform-style:preserve-3d;',
'  transform-origin:50% 0;transform:rotateX(0deg);',
'  transition:transform .95s cubic-bezier(.36,.02,.2,1)}',
'.env-flap__face{position:absolute;inset:0;width:100%;height:100%;display:block;',
'  backface-visibility:hidden;-webkit-backface-visibility:hidden}',
'.env-flap__face--out{filter:drop-shadow(0 5px 7px rgba(60,44,20,.2))}',
/* The back of the flap is mirrored about the VERTICAL axis, not the horizontal
   one. The fold is the envelope's top edge, so the turn already inverts the
   paper top-to-bottom: mirroring the back face the same way cancels that out and
   the flap ends up a downward V hanging above the envelope, its fold seam torn
   away from the edge it is supposed to be attached to. Mirroring left-right
   instead leaves the seam welded to the top edge and swings the tip over it,
   which is what a flap does. */
'.env-flap__face--in{transform:rotateY(180deg)}',
/* Clipped to the flap's own outline, inset by a couple of per cent. The path
   the flap is drawn from is 620x250 with a rounded tip; this is the same
   shape as a polygon, which is all the clip needs. */
'.env-liner{position:absolute;inset:0;backface-visibility:hidden;',
'  -webkit-backface-visibility:hidden;transform:rotateY(180deg) translateZ(.1px);',
'  background:var(--motif-tex) 0 0/calc(var(--w) * .115) auto repeat;',
'  clip-path:polygon(1.6% 3%,98.4% 3%,98.4% 12.6%,51.8% 91%,48.2% 91%,1.6% 12.6%);',
'  box-shadow:inset 0 0 30px rgba(80,20,50,.3)}',
'.env-seal{position:absolute;left:50%;top:40%;width:calc(var(--w) * .0967);aspect-ratio:1;',
'  margin:calc(var(--w) * -.0484) 0 0 calc(var(--w) * -.0484);',
'  pointer-events:none;',
'  transform:translateZ(3px);transition:opacity .35s,transform .6s;',
'  filter:drop-shadow(0 3px 5px rgba(60,20,10,.45))}',
'.env-seal .seal{display:block;width:100%;height:100%}',
'.env-open{position:absolute;inset:0;z-index:9;transform:translateZ(8px);border:0;background:none;',
'  cursor:pointer;',
'  border-radius:4px;font:inherit;color:transparent}',
'.env-open:focus-visible{outline:2px solid #8a5a34;outline-offset:5px}',
'.env-hint{position:absolute;left:0;right:0;bottom:-32px;margin:0;text-align:center;color:var(--on-cloth);',
'  font-family:var(--mono);font-size:10.5px;letter-spacing:.28em;text-transform:uppercase;',
'  animation:breathe 3.4s ease-in-out infinite;transition:opacity .4s}',
'@keyframes breathe{0%,100%{opacity:.38}50%{opacity:.9}}',

/* the quieter envelope: no stripes, a hairline rule, teal wax */
/* the quieter envelope: no stripes, just a hairline plate rule */
'body[data-envelope="quiet"] .env-front{background:var(--sheen),var(--paper-tex) 0 0/216px 216px repeat,#fcf7eb}',
'body[data-envelope="quiet"] .env-front::before{background:none;padding:0;',
'  border:1px solid rgba(120,100,64,.4);inset:9px;border-radius:2px;opacity:1;',
'  -webkit-mask:none;mask:none}',
'body[data-envelope="quiet"] .paravion{display:none}',
'body[data-envelope="quiet"] .env-address{top:60%}',
'body[data-envelope="quiet"] .env-address .who{color:#123a4d}',


/* ---------- what is inside it ---------- */
'.chooser{position:absolute;left:0;right:0;top:0;height:0;z-index:2}',
'.slip{position:absolute;top:0;border:0;padding:0;background:none;font:inherit;color:var(--ink);',
'  cursor:pointer;opacity:0;transform-origin:50% 100%;',
'  transition:transform .9s cubic-bezier(.2,.72,.2,1),opacity .45s;',
'  filter:drop-shadow(0 -7px 16px rgba(70,48,24,.26))}',
'.slip__inner{display:block;border:1px solid var(--line);border-bottom:0;border-radius:3px 3px 0 0;',
'  background:var(--sheen),var(--paper-tex) 0 0/216px 216px repeat,var(--paper);padding:12px 16px 74px;text-align:left;',
'  box-shadow:inset 0 1px 0 rgba(255,255,255,.6)}',
'.slip__caption{display:block;font-family:var(--mono);font-size:9.5px;',
'  letter-spacing:.2em;text-transform:uppercase;color:var(--ink-2)}',

/* the letter: square in the middle, and it comes up first */
'.slip--letter{left:11%;right:23%;z-index:1;transform:translateY(44px)}',
'.slip__head{display:flex;align-items:center;gap:9px;margin-top:10px}',
'.slip__mark{display:flex;flex:none;color:var(--blue);line-height:0}',
'.slip__brand{display:block;font-size:15px;font-weight:700;color:var(--blue);line-height:1.12}',
'.slip__rule{display:block;height:1px;background:var(--line);margin:12px 0 0}',
'.slip__rule--short{width:46%;margin-top:7px}',

/* the passes: tucked in on the right, angled, only their corner showing */
'.slip--tickets{right:2%;width:34%;z-index:2;transform:translateY(44px) rotate(-10deg)}',
'.slip--tickets .slip__inner{background:var(--sheen),var(--ticket-tex) 0 0/168px 168px repeat,var(--ticket-2);',
'  padding:11px 14px 66px;text-align:right}',
'.tedges{display:block;margin-top:9px}',
'.tedge{display:flex;align-items:baseline;justify-content:flex-end;gap:9px;',
'  padding:6px 10px;background:var(--paper);border:1px solid var(--line);border-top:0;',
'  border-radius:0 0 3px 3px;margin:0 0 3px;box-shadow:0 2px 4px -3px rgba(0,0,0,.4)}',
'.tedge--1{margin-right:6px}.tedge--2{margin-right:12px}',
'.tedge b{font-family:var(--mono);font-size:12px;letter-spacing:.12em;color:var(--blue)}',
'.tedge i{font-family:var(--mono);font-style:normal;font-size:8.5px;letter-spacing:.1em;color:var(--ink-2)}',

/* ---------- stages ---------- */
/* It turns TOWARDS you and over the top -- rotated the other way it sinks behind
   the envelope front within a few degrees and all you see is a sliver, which is
   why it once looked like it never turned at all. */
/* Past 180, not short of it: an open flap has folded all the way back and is
   resting against the envelope's back, leaning slightly away from you. Stopping
   at 166 leaves it tilted towards you, so its tip sticks out in front of the
   letter -- paper cannot come out through its own flap. */
'body[data-stage="open"] .env-flap__turn,body[data-stage="letter"] .env-flap__turn,',
'body[data-stage="tickets"] .env-flap__turn{transform:rotateX(188deg)}',
'body[data-stage="open"] .env-flap,body[data-stage="letter"] .env-flap,',
'body[data-stage="tickets"] .env-flap{transform:translateZ(-6px)}',
'body[data-stage="open"] .env-seal,body[data-stage="letter"] .env-seal,body[data-stage="tickets"] .env-seal{opacity:0;transform:translateZ(3px) scale(.5) rotate(-32deg)}',
'body[data-stage="open"] .slip{opacity:1}',
'body[data-stage="open"] .slip--letter{transform:translateY(-104px) scale(1.03);transition-delay:.46s}',
'body[data-stage="open"] .slip--tickets{transform:translateY(-74px) rotate(-10deg);transition-delay:.62s}',
'body[data-stage="open"] .slip--letter:hover,body[data-stage="open"] .slip--letter:focus-visible{',
'  transform:translateY(-124px) scale(1.045);outline:none}',
'body[data-stage="open"] .slip--tickets:hover,body[data-stage="open"] .slip--tickets:focus-visible{',
'  transform:translateY(-96px) rotate(-13deg);outline:none}',
'body[data-stage="open"] .slip:focus-visible .slip__inner{outline:2px solid var(--blue);outline-offset:2px}',
'body[data-stage="open"] .env-open,body[data-stage="letter"] .env-open,body[data-stage="tickets"] .env-open{display:none}',
'body:not([data-stage="sealed"]) .env-hint{opacity:0;animation:none}',
/* the pulled-out slip keeps travelling upward and hands over to the real thing */
/* The pull happens in two beats. First the paper is drawn right up out of the
   envelope -- slowly at the start, the way paper drags against paper -- while the
   envelope stays put. Only then does the envelope sink away and the real thing
   take over from the slip. */
'body[data-pull="letter"] .slip--letter{transform:translateY(-236px);',
'  transition:transform .46s cubic-bezier(.55,.06,.3,1)}',
'body[data-pull="tickets"] .slip--tickets{transform:translateY(-206px) rotate(-4deg);',
'  transition:transform .46s cubic-bezier(.55,.06,.3,1)}',
'body[data-pull] .slip{pointer-events:none}',
'body[data-pull="letter"] .slip--tickets,body[data-pull="tickets"] .slip--letter{',
'  opacity:.25;transform:translateY(-40px);transition:transform .4s ease,opacity .3s ease}',
'body[data-stage="letter"] .slip--letter{transform:translateY(-310px);opacity:0;',
'  transition:transform .5s ease-out,opacity .3s ease-out}',
'body[data-stage="tickets"] .slip--tickets{transform:translateY(-290px) rotate(-2deg);opacity:0;',
'  transition:transform .5s ease-out,opacity .3s ease-out}',
'body[data-stage="letter"] .slip--tickets,body[data-stage="tickets"] .slip--letter{opacity:0;transform:translateY(10px)}',
'body[data-stage="letter"] .slip,body[data-stage="tickets"] .slip{pointer-events:none}',
/* ...while the envelope sinks away, still clickable to put things back */
'body[data-stage="letter"] .envelope,body[data-stage="tickets"] .envelope{transform:scale(.26);cursor:pointer}',
'body[data-stage="letter"] .envelope:hover,body[data-stage="tickets"] .envelope:hover{filter:brightness(1.08)}',
'.env-back-btn{position:absolute;inset:0;z-index:9;transform:translateZ(8px);border:0;background:none;',
'  cursor:pointer;color:transparent;',
'  display:none;font:inherit}',
'body[data-stage="letter"] .env-back-btn,body[data-stage="tickets"] .env-back-btn{display:block}',
/* this line lands on the flap of the emptied envelope, not on the cloth, so it
   stays in ink -- with a little of the paper's own light behind it */
'.putback{margin:2px 0 0;text-align:center;color:#5e4b39;font-family:var(--mono);font-size:9.5px;',
'  text-shadow:0 1px 0 rgba(255,246,232,.6);',
'  letter-spacing:.24em;text-transform:uppercase;opacity:0;transition:opacity .5s .5s;pointer-events:none}',
'body[data-stage="letter"] .putback,body[data-stage="tickets"] .putback{opacity:.55}',

/* ---------- what comes out ---------- */
'.panel{position:relative;z-index:1;width:min(760px,100%);margin-top:clamp(16px,3vw,30px)}',

/* ---------- the letter unfolds ----------
   A letter arrives folded. The scaffold below is two clipped copies of the real
   letter, hinged along the crease: the bottom half starts folded back behind the
   top half and swings down. It is built, run and thrown away by the script; the
   real letter underneath is what print and screen readers get. */
'.fold{position:relative;height:var(--half);perspective:2400px;transform-origin:50% 0;',
'  transition:height .78s cubic-bezier(.25,.85,.3,1);',
'  animation:slideout .68s cubic-bezier(.45,.03,.2,1) both}',
'.fold.is-open{height:var(--full)}',
/* drawn up out of the envelope: slow to start, the way paper drags on paper */
'@keyframes slideout{',
'  0%{transform:translateY(-232px) rotate(1.6deg) scale(.9)}',
'  70%{transform:translateY(-14px) rotate(-.35deg) scale(1)}',
'  100%{transform:none}}',
'.fold__panel{position:absolute;left:0;right:0;height:var(--half);overflow:hidden;',
'  backface-visibility:hidden;-webkit-backface-visibility:hidden}',
'.fold__panel--top{top:0}',
'.fold__panel--bottom{top:var(--half);transform-origin:50% 0;transform:rotateX(-180deg);',
'  transition:transform .78s cubic-bezier(.25,.85,.3,1)}',
'.fold.is-open .fold__panel--bottom{transform:rotateX(0)}',
'.fold__sheet{position:absolute;left:0;right:0;top:0}',
'.fold__panel--bottom .fold__sheet{top:calc(var(--half) * -1)}',
/* the shadow the folded-back half throws along the crease, lifting as it opens */
'.fold__shade{position:absolute;left:0;right:0;top:0;height:var(--half);pointer-events:none;',
'  z-index:4;background:linear-gradient(180deg,rgba(58,42,18,0) 48%,rgba(58,42,18,.07) 74%,rgba(58,42,18,.3));',
'  opacity:1;transition:opacity .55s ease-out .1s}',
'.fold.is-open .fold__shade{opacity:0}',
/* the swinging half is turned away from the light until it lies flat */
'.fold__panel--bottom::after{content:"";position:absolute;inset:0;z-index:4;pointer-events:none;',
'  background:linear-gradient(180deg,rgba(58,42,18,.26),rgba(58,42,18,.04));',
'  opacity:1;transition:opacity .6s ease-out}',
'.fold.is-open .fold__panel--bottom::after{opacity:0}',

/* ---------- the passes are dealt out ---------- */
/* dropped, not listed: they overlap a little and sit at their own angles */
'.panel--tickets .pass:nth-of-type(2){margin-left:22px;margin-right:-6px}',
'.panel--tickets .pass:nth-of-type(3){margin-left:-10px;margin-right:14px;margin-top:-26px}',
'.panel--tickets .pass:nth-of-type(4){margin-left:14px;margin-right:-2px;margin-top:-22px}',
'.panel--tickets .pass{animation:deal .72s cubic-bezier(.24,.86,.3,1) both;',
'  animation-delay:var(--deal-delay,0s)}',
'@keyframes deal{',
'  0%{opacity:0;transform:translateY(-230px) scale(.86) rotate(var(--from-tilt,0deg))}',
'  22%{opacity:1}',
'  72%{transform:translateY(9px) scale(1.01) rotate(calc(var(--rest-tilt,0deg) * 1.7))}',
'  100%{opacity:1;transform:translateY(0) scale(1) rotate(var(--rest-tilt,0deg))}}',
'.tearline{animation:fadein .5s ease both}',
/* and back in it goes */
'.panel.is-returning{animation:slidein .42s cubic-bezier(.4,.02,.72,1) both}',
'@keyframes slidein{from{opacity:1;transform:none}',
'  to{opacity:0;transform:translateY(-236px) scale(.9) rotate(-1.1deg)}}',
'@keyframes fadein{from{opacity:0}to{opacity:1}}',

/* ---------- letter ---------- */
'.panel--letter{position:relative}',
'.letter{position:relative;z-index:1;display:flex;flex-direction:column;',
'  gap:clamp(16px,2.4vw,28px)}',
'.sheet{position:relative;border-radius:1px;overflow:hidden;',
'  padding:clamp(30px,4.6vw,54px) clamp(24px,4.4vw,50px) clamp(48px,5.6vw,66px);',
'  background:var(--sheen),var(--curve),var(--paper-tex) 0 0/216px 216px repeat,var(--paper);',
'  box-shadow:var(--cut-edge),var(--lift);',
'  line-height:1.6;font-size:clamp(17px,2.1vw,19px)}',
/* A4. A zero-width float whose top padding is a percentage of the sheet's own
   width holds it to the proportions of the paper it stands in for; a long
   personal note can still push it taller, which is what a second sheet of the
   real thing would do too. */
'.sheet::before{content:"";display:block;float:left;width:0;padding-top:141.4%}',
'.sheet__no{position:absolute;left:0;right:0;bottom:clamp(20px,2.6vw,28px);text-align:center;',
'  font-family:var(--mono);font-size:9.5px;letter-spacing:.22em;text-transform:uppercase;',
'  color:var(--ink-2);opacity:.55}',
'.letter__head{display:flex;flex-direction:column;align-items:center;gap:4px;color:var(--blue);text-align:center}',
'.letter__brand{font-size:clamp(23px,3.6vw,30px);font-weight:700;letter-spacing:.02em}',
'.letter__strap{font-family:var(--mono);font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:var(--ink-2)}',
/* Painted on white and multiplied onto the ground, so the surface's own grain
   carries straight through the flowers instead of a white box sitting on top of
   them.

   The frame is fixed to the viewport: the surface does not scroll, only the
   mail lying on it does, so the flowers stay where they are however far down
   the page you go. (They are absent below the fold in a full-page screenshot
   for that same reason -- a capture stitches together shots of a layer that
   only ever paints one screenful. On screen it is where it should be.)

   The blend belongs on the group, not on each painting: a stacked layer like
   this one is an isolated group, so a child blending inside it has nothing but
   the group's own transparency to blend with, and every flower would arrive in
   a white box. */
'.garden{position:fixed;inset:0;z-index:-1;pointer-events:none;mix-blend-mode:multiply}',
'.bloom{position:absolute;width:min(34vw,440px);aspect-ratio:1;',
'  background:var(--bloom-a) center/contain no-repeat}',
'.bloom--tl{top:-2vh;left:-2vw}',
'.bloom--tr{top:-2vh;right:-2vw;background-image:var(--bloom-b)}',
'.bloom--bl{bottom:-2vh;left:-2vw;background-image:var(--bloom-b);transform:rotate(180deg)}',
'.bloom--br{bottom:-2vh;right:-2vw;transform:rotate(180deg)}',
'@media (max-width:640px){.bloom{width:54vw}}',
'.letter__ref{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:18px 0 21px;',
'  padding:9px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line);',
'  font-family:var(--mono);font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-2)}',
'.letter p{margin:0 0 13px}',
'.letter__greeting{font-size:1.18em;color:var(--blue)}',
'.letter__itin{margin:24px 0 4px}',
'.letter__itin h3,.letter__note h3{margin:0 0 12px;font-family:var(--mono);font-size:11px;',
'  letter-spacing:.24em;text-transform:uppercase;color:var(--ink-2);font-weight:400}',
'.itin{list-style:none;margin:0;padding:0;border-top:1px solid var(--line)}',
'.itin__row{display:grid;grid-template-columns:64px 1fr auto;gap:14px;align-items:baseline;',
'  padding:9px 0;border-bottom:1px solid var(--line)}',
'.itin__code{font-family:var(--mono);font-size:15px;letter-spacing:.1em;color:var(--red)}',
'.itin__what b{display:block;font-weight:600;color:var(--blue)}',
'.itin__what em{font-style:normal;font-size:.88em;color:var(--ink-2)}',
'.itin__when{font-family:var(--mono);font-size:12px;color:var(--ink-2);text-align:right}',
'.letter__note{margin:24px 0;padding:18px 22px;background:#fbf6ea;border-left:2px solid var(--gold)}',
'.letter__note p{font-style:italic;font-size:1.1em;margin:0 0 10px;color:#3a3128}',
'.letter__note p:last-child{margin-bottom:0}',
'.letter__sign{margin-top:26px}',
'.signoff{margin:0 0 4px!important;color:var(--ink-2)}',
'.couple{margin:0!important;font-size:1.5em;font-weight:600;color:var(--blue)}',
'.couple--full{font-size:.72em;font-weight:400;color:var(--ink-2);margin-top:6px!important}',
'.letter__small{margin-top:24px!important;padding-top:12px;border-top:1px solid var(--line);',
'  font-family:var(--mono);font-size:10.5px;line-height:1.7;color:var(--ink-2)}',

/* ---------- tickets ---------- */
'.tearline{display:flex;align-items:center;gap:14px;margin:0 0 18px;color:var(--on-cloth)}',
'.tearline::before,.tearline::after{content:"";flex:1 1 auto;border-top:1px dashed rgba(109,87,68,.42)}',
'.tearoff{font:inherit;font-size:13px;font-family:var(--mono);letter-spacing:.18em;text-transform:uppercase;',
'  cursor:pointer;border:1px dashed rgba(109,87,68,.5);border-radius:2px;padding:7px 15px;',
'  background:transparent;color:var(--on-cloth);transition:background .2s,color .2s,border-color .2s}',
'.tearoff:hover{background:var(--paper);color:var(--blue);border-color:transparent}',
'.tearoff:focus-visible{outline:2px solid #8a5a34;outline-offset:3px}',
/* --stub is both the stub's width and where the tear line falls, so the punched
   notches at top and bottom line up with the perforation between them. */
'.pass{--stub:186px;display:flex;border-radius:3px;margin:0 0 24px;',
'  background:var(--sheen),var(--curve),var(--ticket-tex) 0 0/168px 168px repeat,var(--ticket);',
'  box-shadow:inset 0 1px 0 rgba(255,255,255,.62),inset 0 -1px 0 rgba(120,100,64,.2);',
'  filter:drop-shadow(0 1px 0 rgba(70,48,24,.26)) drop-shadow(0 3px 3px rgba(70,48,24,.22))',
'    drop-shadow(0 27px 34px rgba(60,40,20,.32));',
'  transition:transform .35s cubic-bezier(.2,.8,.3,1),filter .35s;',
'  -webkit-mask-image:radial-gradient(circle 9px at right var(--stub) top,transparent 97%,#000),',
'    radial-gradient(circle 9px at right var(--stub) bottom,transparent 97%,#000);',
'  -webkit-mask-size:100% 50.5%;-webkit-mask-position:top,bottom;-webkit-mask-repeat:no-repeat;',
'  mask-image:radial-gradient(circle 9px at right var(--stub) top,transparent 97%,#000),',
'    radial-gradient(circle 9px at right var(--stub) bottom,transparent 97%,#000);',
'  mask-size:100% 50.5%;mask-position:top,bottom;mask-repeat:no-repeat}',
'.pass:hover,.pass:focus-visible{outline:none;',
'  transform:translateY(-5px) rotate(var(--rest-tilt,0deg));',
'  filter:drop-shadow(0 2px 1px rgba(70,48,24,.24)) drop-shadow(0 6px 6px rgba(70,48,24,.2))',
'    drop-shadow(0 40px 46px rgba(60,40,20,.36))}',
'.pass__main{flex:1 1 auto;padding:clamp(18px,3vw,26px);min-width:0}',
'.pass__brand{display:flex;align-items:center;gap:11px;color:var(--blue);padding-bottom:12px;border-bottom:1px solid var(--line)}',
'.pass__mark{display:flex;flex:none}',
'.pass__brandtext{display:flex;flex-direction:column;flex:1 1 auto;min-width:0}',
'.pass__brandname{font-size:18px;font-weight:700;line-height:1.15}',
'.pass__strap{font-family:var(--mono);font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-2)}',
'.pass__no{font-family:var(--mono);font-size:11px;color:var(--ink-2);flex:none}',
'.pass__title{margin:14px 0 16px;font-family:var(--mono);font-weight:700;font-size:13px;',
'  letter-spacing:.34em;text-transform:uppercase;color:var(--red)}',
'.pass__grid{display:grid;gap:12px 18px;grid-template-columns:repeat(4,minmax(0,1fr))}',
'.pass__grid--top{grid-template-columns:minmax(0,1.9fr) minmax(0,.85fr) minmax(0,.85fr) minmax(0,1.1fr)}',
'.pass__grid--bottom{margin-top:16px;padding-top:14px;border-top:1px solid var(--line)}',
'.field{min-width:0}',
'.field__label{display:block;font-family:var(--mono);font-size:9px;letter-spacing:.2em;',
'  text-transform:uppercase;color:var(--ink-2);margin-bottom:3px}',
'.field__value{display:block;font-family:var(--mono);font-size:14px;font-weight:700;',
'  letter-spacing:.04em;color:var(--ink);overflow-wrap:anywhere}',
'.field--nowrap .field__value{white-space:nowrap;overflow-wrap:normal}',
'.pass__route{display:flex;align-items:center;gap:14px;margin:20px 0 4px;padding:16px 0;',
'  border-top:1px solid var(--line);border-bottom:1px solid var(--line)}',
'.route__end{flex:1 1 0;min-width:0}',
'.route__end--to{text-align:right}',
'.route__code{display:block;font-size:clamp(30px,6vw,44px);font-weight:700;line-height:1;color:var(--blue)}',
'.route__city{display:block;font-family:var(--mono);font-size:10px;letter-spacing:.18em;',
'  text-transform:uppercase;color:var(--ink-2);margin-top:5px}',
'.route__mid{color:var(--red);flex:none;display:flex}',
'.pass__occasion{margin-top:16px}',
'.pass__occasion h4{margin:0 0 4px;font-size:20px;font-weight:600;color:var(--blue)}',
'.pass__occasion p{margin:0;font-size:15.5px;line-height:1.5;color:#4a4137}',
'.pass__follow{margin-top:8px!important;font-family:var(--mono);font-size:10px;',
'  letter-spacing:.2em;text-transform:uppercase;color:var(--red)}',
'.pass__stub{position:relative;flex:0 0 var(--stub);',
'  padding:clamp(16px,2.4vw,20px) calc(clamp(16px,2.4vw,20px) + 36px)',
'    clamp(16px,2.4vw,20px) clamp(16px,2.4vw,20px);',
'  background:linear-gradient(163deg,rgba(255,255,255,.4),rgba(255,255,255,0) 44%),',
'    var(--ticket-tex) 0 0/168px 168px repeat,var(--ticket-2);',
'  display:flex;flex-direction:column;gap:11px}',
/* the perforation: punched dots, not a dashed rule */
'.pass__stub::before{content:"";position:absolute;left:-5px;top:10px;bottom:10px;width:10px;z-index:2;',
'  background-image:radial-gradient(circle at 50% 5px,rgba(96,80,52,.34) 0 2.1px,transparent 2.4px);',
'  background-size:10px 11px;background-repeat:repeat-y}',
'.pass__stub::after{content:"";position:absolute;left:0;top:0;bottom:0;width:1px;',
'  background:linear-gradient(180deg,transparent,rgba(255,255,255,.7) 12%,rgba(255,255,255,.7) 88%,transparent)}',
/* The odelela band down the outside edge -- the Namibian half of this wedding,
   printed on the ticket the way the invitations it comes from carry it. */
'.pass__band{position:absolute;right:0;top:0;bottom:0;width:32px;z-index:1;',
'  background:var(--motif-tex) 0 0/64px auto repeat;',
'  border-left:1px solid rgba(255,246,232,.7);',
'  box-shadow:inset 1px 0 0 rgba(90,10,40,.25)}',
'.stub__brand{font-size:13px;font-weight:700;color:var(--blue);line-height:1.15}',
'.stub__rows{display:flex;flex-direction:column;gap:6px}',
'.stub__row{display:flex;justify-content:space-between;gap:8px;align-items:baseline;font-family:var(--mono);',
'  font-size:9.5px;border-bottom:1px dotted rgba(120,105,80,.35);padding-bottom:3px}',
'.stub__row span{letter-spacing:.14em;text-transform:uppercase;color:var(--ink-2);flex:none}',
'.stub__row b{font-size:10px;text-align:right;white-space:nowrap}',
'.stub__tag{margin-top:auto;font-size:14px;font-weight:600;color:var(--blue);line-height:1.15}',
'.barcode{display:flex;align-items:flex-end;height:40px}',
'.barcode i{display:block;height:100%;background:var(--ink)}',

/* ---------- footer ---------- */
'.pagefoot{margin:58px 0 0;color:var(--on-cloth);opacity:.6;font-family:var(--mono);font-size:10px;',
'  letter-spacing:.24em;text-transform:uppercase;text-align:center}',

/* ---------- small screens ---------- */
'@media (max-width:640px){',
/* stacked layout: the tear line runs across the ticket, so the punched dots move
   with it and the corner notches step aside */
'  .pass{flex-direction:column;-webkit-mask-image:none;mask-image:none}',
'  .pass__stub{flex:none}',
'  .pass__stub::before{left:10px;right:10px;top:-5px;bottom:auto;width:auto;height:10px;',
'    background-image:radial-gradient(circle at 5px 50%,rgba(96,80,52,.34) 0 2.1px,transparent 2.4px);',
'    background-size:11px 10px;background-repeat:repeat-x}',
'  .pass__stub::after{left:0;right:0;top:0;bottom:auto;width:auto;height:1px;',
'    background:linear-gradient(90deg,transparent,rgba(255,255,255,.7) 12%,rgba(255,255,255,.7) 88%,transparent)}',
'  .stub__rows{display:grid;grid-template-columns:1fr 1fr;gap:6px 14px}',
'  .stub__tag{margin-top:4px}',
'  .pass__grid--top,.pass__grid--bottom{grid-template-columns:1fr 1fr}',
/* The envelope is left alone here: it scales off --w, so it keeps its
   composition -- stamp bottom right under the cancellation, address bottom left
   -- all the way down. */
'  .slip{gap:10px}',
'  .slip__inner{padding:9px 11px 54px}',
'  .slip__caption{font-size:8px;letter-spacing:.13em}',
'  .slip__brand{font-size:12px}',
'  .slip__head{gap:6px;margin-top:7px}',
'  .tedges{margin-top:7px}',
'  .slip--letter{left:6%;right:26%}',
'  .slip--tickets{right:1%;width:36%}',
'  body[data-stage="open"] .slip--letter{transform:translateY(-86px) scale(1.02)}',
'  body[data-stage="open"] .slip--tickets{transform:translateY(-62px) rotate(-10deg)}',
'}',

/* ---------- reduced motion ---------- */
'@media (prefers-reduced-motion:reduce){',
'  *,*::before,*::after{transition-duration:.001ms!important;animation-duration:.001ms!important;',
'    animation-iteration-count:1!important}',
'}',

/* ---------- print: the passes, and nothing else ---------- */
'@media print{',
'  body{background:#fff!important;background-image:none!important;padding:0;display:block}',
'  .env-wrap,.putback,.pagefoot,.tearline,.tickets__intro,.panel--letter,',
'  .garden{display:none!important}',
'  .panel--tickets,.panel--tickets[hidden]{display:block!important;width:100%;margin:0;animation:none}',
/* on paper they lie square and separate again: the deal animation sets a
   transform, and an animation beats a plain declaration, so this has to shout */
'  .panel--tickets .pass,.panel--tickets .pass:nth-of-type(n){',
'    animation:none!important;transform:none!important;margin:0 0 8mm!important}',
'  .pass{break-inside:avoid;page-break-inside:avoid;box-shadow:none;filter:none;',
'    -webkit-mask-image:none;mask-image:none;border:1px solid #b9a888;',
'    border-radius:0;background:#f7f1e3}',
'  .pass:hover{transform:none}',
'  *{-webkit-print-color-adjust:exact;print-color-adjust:exact}',
'  @page{size:A4 portrait;margin:12mm}',
'}'
    ].join('\n');
  }

  function script() {
    return [
      '(function(){',
      '  var body=document.body;',
      '  var envelope=document.querySelector(".envelope");',
      '  var letterPanel=document.getElementById("panel-letter");',
      '  var ticketPanel=document.getElementById("panel-tickets");',
      '  var realLetter=letterPanel.querySelector(".letter");',
      '  var PULL=190;   /* the grab, before the paper itself takes over */',
      '  var reduced=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;',
      '  var timers=[];',
      '',
      '  function after(ms,fn){timers.push(setTimeout(fn,reduced?0:ms));}',
      '  function clearTimers(){timers.forEach(clearTimeout);timers=[];}',
      '',
      '  /* A letter arrives folded in half. Two clipped copies of the real letter,',
      '     hinged along the crease, do the opening; then the real one takes their',
      '     place so that print, selection and screen readers get a single letter. */',
      '  function unfold(){',
      '    var old=letterPanel.querySelector(".fold");',
      '    if(old)old.remove();',
      '    realLetter.style.display="";',
      '    if(reduced)return;',
      '',
      '    var full=realLetter.offsetHeight;',
      '    if(!full)return;',
      '    var half=Math.round(full/2);',
      '',
      '    var fold=document.createElement("div");',
      '    fold.className="fold";',
      '    fold.setAttribute("aria-hidden","true");',
      '    fold.style.setProperty("--full",full+"px");',
      '    fold.style.setProperty("--half",half+"px");',
      '',
      '    ["top","bottom"].forEach(function(which){',
      '      var panel=document.createElement("div");',
      '      panel.className="fold__panel fold__panel--"+which;',
      '      var sheet=document.createElement("div");',
      '      sheet.className="fold__sheet";',
      '      sheet.appendChild(realLetter.cloneNode(true));',
      '      panel.appendChild(sheet);',
      '      fold.appendChild(panel);',
      '    });',
      '    var shade=document.createElement("div");',
      '    shade.className="fold__shade";',
      '    fold.appendChild(shade);',
      '',
      '    realLetter.style.display="none";',
      '    letterPanel.appendChild(fold);',
      '',
      '    /* one frame folded, so the eye sees the packet before it opens */',
      '    /* it stays folded while it clears the envelope, then opens */',
      '    after(520,function(){fold.classList.add("is-open");});',
      '    after(1650,function(){',
      '      if(!fold.isConnected)return;',
      '      realLetter.style.display="";',
      '      fold.remove();',
      '    });',
      '  }',
      '',
      '  function show(stage){',
      '    body.removeAttribute("data-pull");',
      '    /* a half-finished put-back must not leave a panel stuck invisible */',
      '    letterPanel.classList.remove("is-returning");',
      '    ticketPanel.classList.remove("is-returning");',
      '    body.setAttribute("data-stage",stage);',
      '    letterPanel.hidden=stage!=="letter";',
      '    ticketPanel.hidden=stage!=="tickets";',
      '    if(stage==="letter")unfold();',
      '    if(stage==="tickets"){',
      '      /* restart the deal so the passes always come out of the envelope */',
      '      Array.prototype.forEach.call(ticketPanel.querySelectorAll(".pass,.tearline"),function(el){',
      '        el.style.animation="none";void el.offsetWidth;el.style.animation="";',
      '      });',
      '    }',
      '  }',
      '',
      '  function setStage(stage){',
      '    clearTimers();',
      '    if(stage==="letter"||stage==="tickets"){',
      '      /* beat one: draw the paper out while the envelope is still full size */',
      '      body.setAttribute("data-pull",stage);',
      '      after(PULL,function(){show(stage);window.scrollTo({top:0,behavior:"smooth"});});',
      '      if(reduced)return;',
      '      return;',
      '    }',
      '    /* going back: the paper slides in behind the envelope as it grows again */',
      '    var was=body.getAttribute("data-stage");',
      '    var open=was==="letter"||was==="tickets";',
      '    var panel=was==="letter"?letterPanel:ticketPanel;',
      '    body.removeAttribute("data-pull");',
      '    body.setAttribute("data-stage",stage);',
      '    function tidy(){',
      '      var fold=letterPanel.querySelector(".fold");',
      '      if(fold)fold.remove();',
      '      realLetter.style.display="";',
      '      panel.classList.remove("is-returning");',
      '      letterPanel.hidden=true;',
      '      ticketPanel.hidden=true;',
      '    }',
      '    if(!open||reduced){tidy();return;}',
      '    panel.classList.add("is-returning");',
      '    after(430,tidy);',
      '  }',
      '',
      '  Array.prototype.forEach.call(document.querySelectorAll("[data-stage-to]"),function(el){',
      '    el.addEventListener("click",function(){setStage(el.getAttribute("data-stage-to"));});',
      '  });',
      '',
      '  var printBtn=document.getElementById("btn-print");',
      '  if(printBtn)printBtn.addEventListener("click",function(){window.print();});',
      '',
      '  document.addEventListener("keydown",function(e){',
      '    if(e.key!=="Escape")return;',
      '    var stage=body.getAttribute("data-stage");',
      '    if(stage==="letter"||stage==="tickets")setStage("open");',
      '  });',
      '',
      '  setStage("sealed");',
      '})();'
    ].join('\n');
  }

  /* Assemble one complete invitation file. */
  function buildDocument(options) {
    var opts = options || {};
    var lang = opts.lang === 'it' ? 'it' : 'en';
    var t = I.COPY[lang];

    /* The builder shows the three printed forms of the name and lets you
       overtype any of them, so an unusual name is never mangled. */
    var names = I.nameForms(opts.passenger || '');
    var overrides = opts.nameOverrides || {};
    ['full', 'first', 'short'].forEach(function (key) {
      if (overrides[key]) names[key] = overrides[key];
    });

    var envelope = opts.envelope || I.ENVELOPE;
    var note = String(opts.note || '').trim();
    var fontCss = opts.fontCss || '';
    var passes = I.LEGS.map(function (leg, i) { return pass(leg, t, names, i); }).join('');

    return '<!doctype html>\n' +
'<html lang="' + t.htmlLang + '">\n' +
'<head>\n' +
'<meta charset="utf-8">\n' +
'<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
'<title>' + esc(t.docTitle) + (names.first ? ' · ' + esc(names.first) : '') + '</title>\n' +
'<meta name="description" content="' + esc(t.brand + ' — ' + t.strapline) + '">\n' +
'<meta name="robots" content="noindex,nofollow,noarchive,noimageindex">\n' +
'<meta name="referrer" content="no-referrer">\n' +
'<style>\n' + styles(fontCss, opts.textures || {}, opts.flowers || {}) + '\n</style>\n' +
'<noscript><style>.env-wrap{display:none}.panel[hidden]{display:block!important}</style></noscript>\n' +
'</head>\n' +
'<body data-stage="sealed" data-envelope="' + envelope + '">\n' +

/* The flowers grow round the edge of the surface, not on the stationery: two
   paintings, each used twice, the second pair turned through half a turn so no
   corner repeats its neighbour. The frame stays put and the mail moves through
   it. */
'<div class="garden" aria-hidden="true">' +
  '<span class="bloom bloom--tl"></span><span class="bloom bloom--tr"></span>' +
  '<span class="bloom bloom--bl"></span><span class="bloom bloom--br"></span>' +
'</div>\n' +
'<div class="env-wrap">' +
  '<div class="envelope">' +
    '<div class="env-back"></div>' +
    slips(t) +
    '<div class="env-front paper">' +
      '<span class="paravion"><b>Par avion</b><i>' + esc(t.envelopeVia2) + '</i></span>' +
      '<div class="env-address">' +
        '<span class="to">' + esc(t.envelopePassenger) + '</span>' +
        '<span class="who">' + esc(names.full || t.envelopePassenger) + '</span>' +
        '<span class="via">' + esc(t.brand) + ' &nbsp;·&nbsp; ' + esc(t.lFlight) + ' ' + esc(I.FLIGHT) + '</span>' +
      '</div>' +
      '<span class="env-stamp">' + I.stampSvg('28 · 12 · 2026', opts.stampArt) + '</span>' +
      '<span class="env-postmark">' + I.postmarkSvg() + '</span>' +
    '</div>' +
    '<div class="env-flap"><div class="env-flap__turn">' +
      I.flapSvg('out') + I.flapSvg('in') +
      /* the lining, glued a little inside the flap's edge, so the paper still
         shows as a border around it once the envelope is open */
      '<span class="env-liner"></span>' + '</div></div>' +
    '<div class="env-seal">' + I.waxSealSvg(I.COUPLE.initials) + '</div>' +
    '<button type="button" class="env-open" data-stage-to="open">' + esc(t.envelopeOpenLabel) + '</button>' +
    '<button type="button" class="env-back-btn" data-stage-to="open">' + esc(t.backToEnvelope) + '</button>' +
    '<p class="env-hint">' + esc(t.envelopeHint) + '</p>' +
  '</div>' +
'</div>\n' +
'<p class="putback">' + esc(t.backToEnvelope) + '</p>\n' +

'<section class="panel panel--letter" id="panel-letter" hidden>' +
  letter(t, names, note) +
'</section>\n' +
'<section class="panel panel--tickets" id="panel-tickets" hidden>' +
  '<p class="tearline"><button type="button" class="tearoff" id="btn-print">' + esc(t.printTickets) + '</button></p>' +
  passes +
'</section>\n' +

'<p class="pagefoot">' + esc(t.tagline) + '</p>\n' +
'<script>\n' + script() + '\n<\/script>\n' +
'</body>\n</html>\n';
  }

  I.buildDocument = buildDocument;
})();
