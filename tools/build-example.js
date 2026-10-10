#!/usr/bin/env node
/* Regenerate example-invitation.html -- a minted invitation checked into the
 * repo so the design can be reviewed, printed and tested without opening the
 * builder. Same code path the builder uses.
 *
 *     node tools/build-example.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
global.window = {};
require(path.join(root, 'assets', 'fonts.js'));
require(path.join(root, 'assets', 'textures.js'));
require(path.join(root, 'assets', 'flowers.js'));
require(path.join(root, 'assets', 'stamp-art.js'));
require(path.join(root, 'assets', 'invitation.js'));
require(path.join(root, 'assets', 'template.js'));

const html = window.INVITATION.buildDocument({
  passenger: 'Rosemary Pinehas',
  note: 'We could not picture a single one of these three days without you in it.\n\nBring nothing but yourself and an appetite for the Italian leg.',
  lang: 'en',
  /* a made-up link, so the check-in desk shows; replies from it land in the
     manifest as a check-in it cannot match, to be ignored */
  checkinKey: 'example-invitation',
  fontCss: window.INVITATION_FONT_CSS,
  stampArt: window.STAMP_ART,
  letterArt: window.LETTER_ART,
  letterPicture: window.LETTER_PICTURE,
  textures: window.TEXTURES,
  flowers: window.FLOWERS
});

const out = path.join(root, 'example-invitation.html');
fs.writeFileSync(out, html);
console.log('wrote example-invitation.html (' + Math.round(html.length / 1024) + ' KB)');
