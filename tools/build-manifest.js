#!/usr/bin/env node
/* Build the Passenger Manifest, the shared guest list, into the Pages site.
 *
 * It inlines assets/invitation.js, so every link the manifest hands out is
 * built from the same SITE, payload format and name rules as the minting desk.
 * It goes in a folder of its own, separate from the invitation's, so a guest
 * who looks at their link learns nothing about where the list lives. The list
 * itself is not in the page: it is stored encrypted on the guestlist-data
 * branch and fetched after the passphrase is entered.
 *
 *     node tools/build-manifest.js
 *
 * Regenerate after changing manifest/src.html or assets/invitation.js.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const FOLDER = 'ffaa3ad351b4';

const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'manifest/src.html'), 'utf8');
const inv = fs.readFileSync(path.join(root, 'assets/invitation.js'), 'utf8')
  // a literal </script anywhere inside would close the block early
  .replace(/<\/script/gi, '<\\/script');

if (!src.includes('/*INVITATION_JS*/')) throw new Error('manifest/src.html lost its /*INVITATION_JS*/ slot');
const html = src.replace('/*INVITATION_JS*/', () => '/* assets/invitation.js */\n' + inv);

const dir = path.join(root, 'docs', FOLDER);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'index.html'), html);
console.log('wrote docs/' + FOLDER + '/index.html (' + Math.round(html.length / 1024) + ' KB)');
