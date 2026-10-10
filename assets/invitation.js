/* Briotto Family Airline -- the invitation itself.
 *
 * This file holds three things, in this order:
 *
 *   1. LEGS   - the hard facts of the three celebrations. THIS IS THE ONLY PLACE
 *               TO EDIT DATES, TIMES AND VENUES. Leave `time` or `venue` empty and
 *               the pass prints "full details to follow" instead.
 *   2. COPY   - every visible string, in English and Italian.
 *   3. buildDocument() - assembles a complete, self-contained invitation document.
 *
 * The builder (index.html) calls buildDocument() for each guest and hands you the
 * resulting file to email. Nothing here touches the network: fonts arrive
 * base64'd from assets/fonts.js and every mark is inline SVG or CSS.
 */
window.INVITATION = (function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * 1. LEGS -- the wedding facts. Edit here.
   * ------------------------------------------------------------------ */

  var COUPLE = {
    one: 'Filippo Briotto',
    two: 'Victoria Vanity Pamwenatse Akuunda',
    shortOne: 'Filippo',
    shortTwo: 'Victoria',
    initials: 'F & V'
  };

  /* Which envelope the invitations go out in: 'quiet' is plain ivory with a
     hairline rule; 'airmail' adds the striped par avion border and its little
     blue label. Both are sealed with the same red wax. */
  var ENVELOPE = 'quiet';

  /* Where the invitation is published, and the unguessable folder it lives in.
     Nothing links to it and it carries a noindex, so it is reachable only by
     someone you hand the address to. The guest's name and note ride in the URL
     fragment (after the #), which browsers never send to the server -- GitHub
     sees a request for the page and nothing else. */
  var SITE = 'https://filippo-victoria-wedding.filippobriotto.workers.dev/56e45cd6399d/';

  /* Where a guest's check-in goes: the small worker that sits in front of the
     site on Cloudflare (worker/index.js). Always the Cloudflare address, so the
     GitHub Pages copy and a downloaded file reply to the same place. */
  var CHECKIN_API = SITE.replace(/^(https?:\/\/[^\/]+).*$/, '$1') + '/api/';

  var FLIGHT = '1D0';
  var CLASS = 'First';

  var LEGS = [
    {
      id: 'ita',
      from: 'HOM',
      to: 'ITA',
      seat: '1A',
      gate: '21',
      tkt: '2112-2026',
      time: '',   // e.g. '20:00'  -- empty prints "full details to follow"
      venue: ''
    },
    {
      id: 'ams',
      from: 'ITA',
      to: 'AMS',
      seat: '1B',
      gate: '29',
      tkt: '2912-2026',
      time: '',   // e.g. '15:00'
      venue: ''   // e.g. 'Stadhuis, Amstel 1'
    },
    {
      id: 'wdh',
      from: 'AMS',
      to: 'WDH',
      seat: '1C',
      gate: '—',
      tkt: '2027-TBA',
      time: '',
      venue: ''
    }
  ];

  /* ------------------------------------------------------------------ *
   * 2. COPY -- every visible string, both languages.
   * ------------------------------------------------------------------ */

  var COPY = {
    en: {
      htmlLang: 'en',
      docTitle: 'Briotto Family Airline — Boarding Pass',
      brand: 'Briotto Family Airline',
      strapline: 'Wedding invitation · First class service',

      envelopeVia: 'By air mail · Par avion',
      envelopeVia2: 'By air mail',
      envelopePassenger: 'Passenger',
      envelopeOpenLabel: 'Open the envelope',

      tabLetter: 'The letter',
      tabTickets: 'The boarding passes',
      backToEnvelope: 'Back to the envelope',
      printTickets: 'Print the tickets',

      /* Plain, labelled buttons for getting around. The paper can still be
         clicked, but nobody should have to guess that it can. */
      openHint: 'Inside: a letter and your boarding passes. Choose one.',
      readLetter: 'Read the letter',
      seeTickets: 'See the boarding passes',
      navLabel: 'Parts of the invitation',
      navEnvelope: 'Envelope',
      navLetter: 'Letter',
      navTickets: 'Boarding passes',
      nextTickets: 'Next: your boarding passes',
      backLetter: 'Back to the letter',

      bookingTitle: 'Booking confirmation',
      refLabel: 'Reference',
      greeting: function (name) { return 'Dear ' + name + ','; },
      letterBody: [
        'Your seat is reserved. We are getting married, and we would like you there — not once, but three times, on three legs of the same happy journey.',
        'The first leg lands in Italy on the 21st of December, for a party to set the whole thing off. Eight days later, on the 29th, we land in Amsterdam to get married: a small, quiet ceremony, the vows and nothing else. The last leg is the big one — the traditional celebration in Namibia, in 2027, on a date still to be announced.',
        'Full details for each leg will follow in good time. For now, all you need to do is say yes.'
      ],
      itineraryTitle: 'Your itinerary',
      pageOf: function (n, of) { return 'Page ' + n + ' of ' + of; },
      noteTitle: 'A note for you',
      signOff: 'With all our love,',
      smallPrint: 'This booking is non-transferable, infinitely refundable in love, and requires no luggage but yourselves. Changes to the itinerary will be communicated by the Briotto Family Airline in due course.',

      boardingPass: 'Boarding pass',
      lPassenger: 'Passenger',
      lClass: 'Class',
      lFlight: 'Flight',
      lDate: 'Date',
      lFrom: 'From',
      lTo: 'To',
      lSeat: 'Seat',
      lGate: 'Gate',
      lTkt: 'Tkt',
      lStatus: 'Status',
      lTime: 'Time',
      lVenue: 'Venue',
      confirmed: 'Confirmed',
      className: 'First',
      tagline: 'Join us as we say “I do”',
      detailsToFollow: 'Full details to follow',

      checkinAsk: 'Will you be on this flight?',
      checkinYes: 'Check in',
      checkinNo: 'Can’t make it',
      stampYes: 'Checked in',
      stampNo: 'Not travelling',
      deskTitle: 'Check-in desk',
      deskIntro: 'Answer on each boarding pass above, then confirm here. You can come back and change your answers at any time.',
      lParty: 'Passengers on this booking',
      partyFewer: 'One fewer',
      partyMore: 'One more',
      lMessage: 'A message for Filippo & Victoria (optional)',
      messageKept: 'Your message reached us. Write here only to replace it.',
      checkinSend: 'Confirm check-in',
      checkinUpdate: 'Update check-in',
      checkinSending: 'Sending…',
      checkinDone: 'Checked in on {date}. Thank you — we can’t wait to see you.',
      checkinPick: 'First choose “Check in” or “Can’t make it” on at least one boarding pass.',
      checkinFailed: 'The check-in desk could not be reached. Check your connection and try again.',
      letterCheckin: 'Check in on your boarding passes',

      legs: {
        ita: {
          title: 'The party',
          blurb: 'Italy first. A party to set the whole thing off, four days before Christmas.',
          fromCity: 'Wherever you are',
          toCity: 'Italy',
          date: '21 DEC 2026',
          dateLong: '21 December 2026'
        },
        ams: {
          title: 'The vows',
          blurb: 'An intimate ceremony. No reception — just the two of us saying it out loud, and you there to hear it.',
          fromCity: 'Italy',
          toCity: 'Amsterdam',
          date: '29 DEC 2026',
          dateLong: '29 December 2026'
        },
        wdh: {
          title: 'The traditional ceremony',
          blurb: 'The big one. Family, custom and celebration, the way it should be done, in Namibia. Date to be announced.',
          fromCity: 'Amsterdam',
          toCity: 'Windhoek',
          date: '2027 · TBA',
          dateLong: '2027, date to be announced',
          checkinAsk: 'Will you be on this flight? We will confirm the date.'
        }
      }
    },

    it: {
      htmlLang: 'it',
      docTitle: 'Briotto Family Airline — Carta d’imbarco',
      brand: 'Briotto Family Airline',
      strapline: 'Invito di nozze · Servizio di prima classe',

      envelopeVia: 'Posta aerea · Par avion',
      envelopeVia2: 'Posta aerea',
      envelopePassenger: 'Passeggero',
      envelopeOpenLabel: 'Apri la busta',

      tabLetter: 'La lettera',
      tabTickets: 'Le carte d’imbarco',
      backToEnvelope: 'Torna alla busta',
      printTickets: 'Stampa i biglietti',

      openHint: 'Dentro: una lettera e le tue carte d’imbarco. Scegli quale aprire.',
      readLetter: 'Leggi la lettera',
      seeTickets: 'Vedi le carte d’imbarco',
      navLabel: 'Le parti dell’invito',
      navEnvelope: 'Busta',
      navLetter: 'Lettera',
      navTickets: 'Carte d’imbarco',
      nextTickets: 'Avanti: le tue carte d’imbarco',
      backLetter: 'Torna alla lettera',

      bookingTitle: 'Conferma di prenotazione',
      refLabel: 'Riferimento',
      greeting: function (name) { return 'Ciao ' + name + ','; },
      letterBody: [
        'Il tuo posto è prenotato. Ci sposiamo, e ci farebbe piacere averti con noi — non una volta, ma tre, sulle tre tratte dello stesso viaggio felice.',
        'La prima tratta atterra in Italia il 21 dicembre, per una festa che dia il via a tutto. Otto giorni dopo, il 29, atterriamo ad Amsterdam per sposarci: una cerimonia piccola e raccolta, solo le promesse. L’ultima tratta è quella grande — la celebrazione tradizionale in Namibia, nel 2027, in una data ancora da annunciare.',
        'Tutti i dettagli di ogni tratta arriveranno a tempo debito. Per ora ti basta dire di sì.'
      ],
      itineraryTitle: 'Il tuo itinerario',
      pageOf: function (n, of) { return 'Pagina ' + n + ' di ' + of; },
      noteTitle: 'Due righe per te',
      signOff: 'Con tutto il nostro affetto,',
      smallPrint: 'Questa prenotazione non è cedibile, è infinitamente rimborsabile in affetto e non richiede altro bagaglio che voi stessi. Eventuali modifiche all’itinerario saranno comunicate dalla Briotto Family Airline a tempo debito.',

      boardingPass: 'Carta d’imbarco',
      lPassenger: 'Passeggero',
      lClass: 'Classe',
      lFlight: 'Volo',
      lDate: 'Data',
      lFrom: 'Da',
      lTo: 'A',
      lSeat: 'Posto',
      lGate: 'Gate',
      lTkt: 'Bigl.',
      lStatus: 'Stato',
      lTime: 'Ora',
      lVenue: 'Luogo',
      confirmed: 'Confermato',
      className: 'Prima',
      tagline: 'Unisciti a noi quando diremo “sì”',
      detailsToFollow: 'Dettagli a seguire',

      checkinAsk: 'Sarai su questo volo?',
      checkinYes: 'Check-in',
      checkinNo: 'Non ci sarò',
      stampYes: 'Check-in fatto',
      stampNo: 'Non in viaggio',
      deskTitle: 'Banco check-in',
      deskIntro: 'Rispondi su ogni carta d’imbarco qui sopra, poi conferma qui. Puoi tornare e cambiare le risposte quando vuoi.',
      lParty: 'Passeggeri su questa prenotazione',
      partyFewer: 'Uno in meno',
      partyMore: 'Uno in più',
      lMessage: 'Un messaggio per Filippo e Victoria (facoltativo)',
      messageKept: 'Il tuo messaggio ci è arrivato. Scrivi qui solo per sostituirlo.',
      checkinSend: 'Conferma il check-in',
      checkinUpdate: 'Aggiorna il check-in',
      checkinSending: 'Invio…',
      checkinDone: 'Check-in fatto il {date}. Grazie — non vediamo l’ora di vederti.',
      checkinPick: 'Prima scegli “Check-in” o “Non ci sarò” su almeno una carta d’imbarco.',
      checkinFailed: 'Non riusciamo a raggiungere il banco check-in. Controlla la connessione e riprova.',
      letterCheckin: 'Fai il check-in sulle carte d’imbarco',

      legs: {
        ita: {
          title: 'La festa',
          blurb: 'Prima l’Italia. Una festa per dare il via a tutto, quattro giorni prima di Natale.',
          fromCity: 'Ovunque tu sia',
          toCity: 'Italia',
          date: '21 DIC 2026',
          dateLong: '21 dicembre 2026'
        },
        ams: {
          title: 'Le promesse',
          blurb: 'Una cerimonia intima. Nessun ricevimento — solo noi due che lo diciamo ad alta voce, e tu lì ad ascoltare.',
          fromCity: 'Italia',
          toCity: 'Amsterdam',
          date: '29 DIC 2026',
          dateLong: '29 dicembre 2026'
        },
        wdh: {
          title: 'La cerimonia tradizionale',
          blurb: 'Quella grande. Famiglia, tradizione e festa, come si deve, in Namibia. Data da annunciare.',
          fromCity: 'Amsterdam',
          toCity: 'Windhoek',
          date: '2027 · TBA',
          dateLong: '2027, data da annunciare',
          checkinAsk: 'Sarai su questo volo? Ti confermeremo la data.'
        }
      }
    }
  };

  /* ------------------------------------------------------------------ *
   * 3. Helpers
   * ------------------------------------------------------------------ */

  /* The guest's details, packed small enough to live in a link. */
  function encodePayload(data) {
    var bytes = new TextEncoder().encode(JSON.stringify(data));
    var bin = '', i;
    for (i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decodePayload(text) {
    var t = String(text || '').replace(/^#/, '').replace(/-/g, '+').replace(/_/g, '/');
    if (!t) return null;
    while (t.length % 4) t += '=';
    try {
      var bin = atob(t), bytes = new Uint8Array(bin.length), i;
      for (i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      var data = JSON.parse(new TextDecoder().decode(bytes));
      return data && typeof data === 'object' ? data : null;
    } catch (e) {
      return null;   /* a mangled link still opens, just without a name on it */
    }
  }

  function guestLink(data) {
    return SITE + '#' + encodePayload(data);
  }

  /* A check-in is filed under a fingerprint of the guest's own link: the part
     after the #, hashed. The invitation works it out from the link it was
     opened with, and the guest list from the link it sent, so the two meet
     without the link itself -- or the note inside it -- ever reaching the
     server, and links sent before check-in existed still match.
     The invitation document repeats this in its own script (template.js,
     checkinScript); the two must agree. Resolves '' without WebCrypto. */
  function checkinRef(fragment) {
    var key = String(fragment || '').replace(/^.*#/, '');
    if (!key || !window.crypto || !crypto.subtle) return Promise.resolve('');
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode('bfa-checkin:' + key)).then(function (buf) {
      var bytes = new Uint8Array(buf), bin = '', i;
      for (i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '').slice(0, 32);
    });
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* A guest name is typed once and printed three ways: in full and shouted on
     the passes, first-name-only in the letter, and initial + surname on the
     tear-off stub the way the reference pass did it ("R. PINEHAS"). Names with
     two guests ("Anna & Marco Rossi") keep both given names in the greeting. */
  function nameForms(raw) {
    var name = String(raw || '').replace(/\s+/g, ' ').trim();
    if (!name) return { full: '', first: '', short: '' };

    var parts = name.split(' ');
    var surname = parts[parts.length - 1];
    var given = parts.slice(0, -1);

    var joined = name.replace(/\s*(&|\band\b|\be\b)\s*/gi, ' & ');
    var isPair = /&/.test(joined);

    var first;
    if (isPair) {
      first = joined
        .split('&')
        .map(function (chunk) { return chunk.trim().split(' ')[0]; })
        .filter(Boolean)
        .join(' & ');
    } else {
      first = parts[0];
    }

    var short;
    if (isPair) {
      short = joined
        .split('&')
        .map(function (chunk) { return chunk.trim().charAt(0).toUpperCase() + '.'; })
        .filter(function (i) { return i !== '.'; })
        .join(' & ') + ' ' + surname;
    } else {
      short = (given.length ? given[0].charAt(0).toUpperCase() + '. ' : '') + surname;
    }

    return { full: name.toUpperCase(), first: first, short: short.toUpperCase() };
  }

  function slugify(raw) {
    return String(raw || '')
      .replace(/\u00df/g, 'ss')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'guest';
  }

  /* A barcode that looks like a barcode. Deterministic per ticket number so the
     same pass always prints the same bars. */
  function barcode(seedText) {
    var seed = 0;
    for (var i = 0; i < seedText.length; i++) seed = (seed * 31 + seedText.charCodeAt(i)) % 100000;
    var bars = [];
    for (var b = 0; b < 46; b++) {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      var w = 1 + (seed % 3);
      var gap = 1 + ((seed >> 8) % 2);
      bars.push('<i style="width:' + w + 'px;margin-right:' + gap + 'px"></i>');
    }
    return '<div class="barcode" aria-hidden="true">' + bars.join('') + '</div>';
  }

  /* Flowers. A petal is a teardrop, and a blossom is that teardrop turned around
     a centre; everything below is built from those two, so the same routine makes
     the stamp's posy and the letter's sprig. Drawn in colour -- one dark ink and
     a bouquet reads as a wreath. */
  var BLOOM = {
    petal: '#d59a94',
    petalBack: '#c07f7c',
    heart: '#dda93f',
    stem: '#7c8f68',
    leaf: '#6f855f',
    filler: '#b9c4a6',
    ribbon: '#c98f89'
  };

  function petalPath(cx, cy, r, angle, fill) {
    var k = (r / 18).toFixed(3);
    return '<path d="M0 0 C6 -4 6.6 -13 0 -18 C-6.6 -13 -6 -4 0 0 Z" fill="' + fill + '"' +
      ' transform="translate(' + cx + ' ' + cy + ') rotate(' + angle + ') scale(' + k + ')"/>';
  }

  function blossom(cx, cy, r, petals, spin) {
    var out = '', i;
    /* back petals first, in the deeper tone, so the flower has some depth */
    for (i = 0; i < petals; i++) {
      out += petalPath(cx, cy, r, (spin || 0) + (i + 0.5) * (360 / petals), BLOOM.petalBack);
    }
    for (i = 0; i < petals; i++) {
      out += petalPath(cx, cy, r * 0.94, (spin || 0) + i * (360 / petals), BLOOM.petal);
    }
    out += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.2).toFixed(2) + '" fill="' + BLOOM.heart + '"/>';
    return out;
  }

  function leaf(cx, cy, len, angle) {
    var k = (len / 16).toFixed(3);
    return '<path d="M0 0 C5.2 -3 9 -9.5 10 -16 C3.6 -14.4 0.4 -8 0 0 Z" fill="' + BLOOM.leaf + '"' +
      ' transform="translate(' + cx + ' ' + cy + ') rotate(' + angle + ') scale(' + k + ')"/>';
  }

  /* A posy: three stems gathered and tied, blossoms at the tips, leaves down the
     sides, a few sprigs of gypsophila between them. */
  function posySvg() {
    return '' +
      '<g fill="none" stroke="' + BLOOM.stem + '" stroke-width="1.6" stroke-linecap="round">' +
        '<path d="M50 88 C49 72 49 56 50 37"/>' +
        '<path d="M50 84 C43 70 34 60 29.5 51"/>' +
        '<path d="M50 82 C57 69 65.5 60 70 53"/>' +
        '<path d="M50 79 C46 70 41 65 36.5 62" stroke-width="1"/>' +
        '<path d="M50 77 C55 68 59 64 63.5 62" stroke-width="1"/>' +
      '</g>' +
      leaf(50, 72, 16, -58) + leaf(50, 67, 14.5, 58) +
      leaf(50, 61, 13, -48) + leaf(50, 56, 12, 50) +
      '<g fill="' + BLOOM.filler + '">' +
        '<circle cx="36" cy="59" r="1.6"/><circle cx="32.5" cy="55" r="1.3"/>' +
        '<circle cx="39" cy="54" r="1.3"/><circle cx="64" cy="60" r="1.6"/>' +
        '<circle cx="67.5" cy="56" r="1.3"/><circle cx="61" cy="55" r="1.3"/>' +
      '</g>' +
      '<g fill="none" stroke="' + BLOOM.ribbon + '" stroke-linecap="round">' +
        '<path d="M44.5 80.5 C48 83 52 83 55.5 80.5" stroke-width="1.7"/>' +
        '<path d="M46 82 C42.5 85 41 89 41.5 93" stroke-width="1.3"/>' +
        '<path d="M54 82 C57.5 85 59 89 58.5 93" stroke-width="1.3"/>' +
      '</g>' +
      '<path d="M50 82 C48.6 85 48.6 89 50 95 C51.4 89 51.4 85 50 82 Z" fill="' + BLOOM.stem + '"/>' +
      blossom(29.5, 46, 12, 6, 12) +
      blossom(70, 48, 11, 6, -8) +
      blossom(50, 30, 15.5, 7, 0);
  }

  function stampSvg(dateLine, art) {
    var w = 88, h = 108, step = 11, holes = '', x, y;
    for (x = step / 2; x < w; x += step) {
      holes += '<circle cx="' + x.toFixed(1) + '" cy="0" r="2.9"/>' +
               '<circle cx="' + x.toFixed(1) + '" cy="' + h + '" r="2.9"/>';
    }
    for (y = step / 2; y < h; y += step) {
      holes += '<circle cx="0" cy="' + y.toFixed(1) + '" r="2.9"/>' +
               '<circle cx="' + w + '" cy="' + y.toFixed(1) + '" r="2.9"/>';
    }

    var INK = '#123a4d', PAPER = '#f6eeda';

    /* the engraved posy -- or a picture, if one is dropped into assets/stamp/ */
    var panel = art
      /* href only -- carrying xlink:href too duplicated the whole picture in
         every invitation for the sake of browsers older than 2018 */
      ? '<image href="' + esc(art) + '" ' +
          'x="7" y="7" width="74" height="76" preserveAspectRatio="xMidYMid meet" ' +
          'clip-path="url(#bfa-stamp-clip)"/>'
      : '<g transform="translate(7 9) scale(.74)">' + posySvg() + '</g>';

    return '' +
      '<svg class="stamp" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" ' +
        'xmlns:xlink="http://www.w3.org/1999/xlink" ' +
        'role="img" aria-label="' + esc(COUPLE.shortOne + ' and ' + COUPLE.shortTwo) + '">' +
        '<defs><clipPath id="bfa-stamp-clip"><rect x="7" y="7" width="74" height="76" rx="1"/></clipPath></defs>' +
        '<rect width="' + w + '" height="' + h + '" fill="' + PAPER + '"/>' +
        panel +
        '<rect x="5" y="5" width="' + (w - 10) + '" height="' + (h - 10) + '" fill="none" ' +
          'stroke="#a83f2a" stroke-width=".9"/>' +
        '<text x="' + (w / 2) + '" y="96.5" text-anchor="middle" ' +
          'font-family="Courier Prime, Courier New, monospace" font-size="7.2" letter-spacing=".9" ' +
          'fill="#a83f2a">' + esc(dateLine) + '</text>' +
        '<g fill="#f3ecdc">' + holes + '</g>' +
      '</svg>';
  }

  /* The cancellation: rings landing over the stamp with the wavy killer bars
     running off across the empty part of the envelope, the way a real one does. */
  function postmarkSvg() {
    return '' +
      '<svg class="postmark" viewBox="0 0 200 100" width="200" height="100" role="img" aria-hidden="true">' +
        '<g fill="none" stroke="#9c3d2a" stroke-linecap="round" opacity=".34">' +
          '<circle cx="155" cy="50" r="38" stroke-width="1.7"/>' +
          '<circle cx="155" cy="50" r="31" stroke-width=".8"/>' +
          '<path d="M6 33 q13 -6.5 26 0 t26 0 t26 0 t26 0" stroke-width="2.1"/>' +
          '<path d="M6 50 q13 -6.5 26 0 t26 0 t26 0 t26 0" stroke-width="2.1"/>' +
          '<path d="M6 67 q13 -6.5 26 0 t26 0 t26 0 t26 0" stroke-width="2.1"/>' +
        '</g>' +
      '</svg>';
  }

  function roundelSvg(size) {
    return '' +
      '<svg class="roundel" viewBox="0 0 64 64" width="' + size + '" height="' + size + '" role="img" aria-hidden="true">' +
        '<circle cx="32" cy="32" r="30" fill="none" stroke="currentColor" stroke-width="1.4"/>' +
        '<circle cx="32" cy="32" r="24.5" fill="none" stroke="currentColor" stroke-width=".7" opacity=".45"/>' +
        '<path d="M32 11 c2.6 5 3 14 3 21 v9 c0 4 -1 8 -3 11 c-2 -3 -3 -7 -3 -11 v-9 c0 -7 .4 -16 3 -21 z" fill="currentColor"/>' +
        '<path d="M32 27 L11 39 v3.4 L32 35.6 L53 42.4 V39 z" fill="currentColor"/>' +
        '<path d="M32 45 L22.5 50.5 v2.2 L32 49.4 l9.5 3.3 v-2.2 z" fill="currentColor"/>' +
      '</svg>';
  }

  /* The flap, drawn as two faces so it can turn over honestly: the outside you
     see when it is sealed, and the paler inside you see once it is open. Both
     are SVG so the tip can be softened and the fold can carry a gradient -- a
     hard CSS triangle is what made the old envelope look like clip art. */
  function flapSvg(face) {
    var fill = face === 'in'
      ? '<linearGradient id="bfa-flap-in" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#dccfb2"/>' +
          '<stop offset=".55" stop-color="#e7dcc3"/>' +
          '<stop offset="1" stop-color="#f2e9d6"/>' +
        '</linearGradient>'
      : '<linearGradient id="bfa-flap-out" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#faf4e7"/>' +
          '<stop offset=".62" stop-color="#f1e8d5"/>' +
          '<stop offset="1" stop-color="#e6dabf"/>' +
        '</linearGradient>';
    var id = face === 'in' ? 'bfa-flap-in' : 'bfa-flap-out';

    return '' +
      '<svg class="env-flap__face env-flap__face--' + (face === 'in' ? 'in' : 'out') + '" ' +
        'viewBox="0 0 620 250" preserveAspectRatio="none" aria-hidden="true">' +
        '<defs>' + fill + '</defs>' +
        '<path d="M0 0 H620 V30 L327 236 Q310 247 293 236 L0 30 Z" fill="url(#' + id + ')"/>' +
        '<path d="M620 30 L327 236 Q310 247 293 236 L0 30" fill="none" ' +
          'stroke="rgba(120,100,64,.34)" stroke-width="1.2" vector-effect="non-scaling-stroke"/>' +
      '</svg>';
  }

  /* Sealing wax: an irregular disc with the monogram pressed into it. Pass a
     palette to seal in a different colour. */
  function waxSealSvg(initials, palette) {
    var pts = [], i, n = 22, seed = 7;
    for (i = 0; i < n; i++) {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      var wobble = 43.5 + (seed % 1000) / 1000 * 5.5;
      var a = (i / n) * Math.PI * 2;
      pts.push([50 + Math.cos(a) * wobble, 50 + Math.sin(a) * wobble]);
    }
    var d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (i = 1; i <= n; i++) {
      var prev = pts[(i - 1) % n], cur = pts[i % n];
      d += ' Q' + prev[0].toFixed(1) + ' ' + prev[1].toFixed(1) + ' ' +
        ((prev[0] + cur[0]) / 2).toFixed(1) + ' ' + ((prev[1] + cur[1]) / 2).toFixed(1);
    }
    d += ' Z';

    var wax = palette || { light: '#c05a41', mid: '#9d3524', dark: '#6d2016',
      deboss: 'rgba(46,10,4,.72)', emboss: 'rgba(255,214,192,.72)', edge: 'rgba(58,12,6,.45)' };

    return '' +
      '<svg class="seal" viewBox="0 0 100 100" role="img" aria-hidden="true">' +
        '<defs>' +
          '<radialGradient id="bfa-wax" cx="34%" cy="28%" r="78%">' +
            '<stop offset="0" stop-color="' + wax.light + '"/>' +
            '<stop offset=".5" stop-color="' + wax.mid + '"/>' +
            '<stop offset="1" stop-color="' + wax.dark + '"/>' +
          '</radialGradient>' +
        '</defs>' +
        '<path d="' + d + '" fill="url(#bfa-wax)"/>' +
        '<path d="' + d + '" fill="none" stroke="' + wax.edge + '" stroke-width="1.6" ' +
          'transform="translate(0 1.2)" opacity=".5"/>' +
        '<circle cx="50" cy="50" r="33" fill="none" stroke="rgba(52,12,6,.3)" stroke-width="1"/>' +
        '<circle cx="50" cy="50" r="33" fill="none" stroke="rgba(255,190,165,.24)" stroke-width="1" ' +
          'transform="translate(0 -1)"/>' +
        '<text x="50" y="52.5" text-anchor="middle" dominant-baseline="middle" ' +
          'font-family="Cormorant Garamond, Garamond, serif" font-size="27" font-weight="600" ' +
          'fill="' + wax.deboss + '" transform="translate(0 1.3)">' + esc(initials) + '</text>' +
        '<text x="50" y="52.5" text-anchor="middle" dominant-baseline="middle" ' +
          'font-family="Cormorant Garamond, Garamond, serif" font-size="27" font-weight="600" ' +
          'fill="' + wax.emboss + '">' + esc(initials) + '</text>' +
      '</svg>';
  }

  return {
    COUPLE: COUPLE,
    FLIGHT: FLIGHT,
    SITE: SITE,
    CHECKIN_API: CHECKIN_API,
    checkinRef: checkinRef,
    encodePayload: encodePayload,
    decodePayload: decodePayload,
    guestLink: guestLink,
    ENVELOPE: ENVELOPE,
    CLASS: CLASS,
    LEGS: LEGS,
    COPY: COPY,
    esc: esc,
    nameForms: nameForms,
    slugify: slugify,
    barcode: barcode,
    stampSvg: stampSvg,
    flapSvg: flapSvg,
    waxSealSvg: waxSealSvg,
    roundelSvg: roundelSvg,
    postmarkSvg: postmarkSvg
  };
})();
