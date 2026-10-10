#!/usr/bin/env node
/* Build manifest/manifest.html: the shared guest list, published as a
 * claude.ai Artifact so both of you can work on it from any device.
 *
 * It inlines assets/invitation.js, so every link the manifest hands out is
 * built from the same SITE, payload format and name rules as the minting desk.
 *
 *     node tools/build-manifest.js
 *
 * Regenerate (and republish) after changing assets/invitation.js.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'manifest/src.html'), 'utf8');
const inv = fs.readFileSync(path.join(root, 'assets/invitation.js'), 'utf8')
  .replace(/<\/script/gi, '<\\/script');

if (!src.includes('/*INVITATION_JS*/')) throw new Error('manifest/src.html lost its /*INVITATION_JS*/ slot');
const html = src.replace('/*INVITATION_JS*/', () => '/* assets/invitation.js */\n' + inv);

fs.writeFileSync(path.join(root, 'manifest/manifest.html'), html);
console.log('wrote manifest/manifest.html (' + Math.round(html.length / 1024) + ' KB)');
