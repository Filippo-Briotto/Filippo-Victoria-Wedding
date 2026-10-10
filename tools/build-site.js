#!/usr/bin/env node
/* Build the published invitation: docs/<slug>/index.html, plus a robots.txt
 * telling every crawler to stay away.
 *
 *     node tools/build-site.js
 *
 * The page carries the whole invitation -- fonts, template, everything -- and
 * reads the guest's name and note from the URL fragment at load. The fragment
 * is the part after the #, which browsers never send to the server, so the
 * names and notes never reach GitHub; they only ever exist in the link itself
 * and in the reader's browser.
 *
 * The folder name is the unguessable part. It comes from SITE in
 * assets/invitation.js -- change it there and rerun this, and every link minted
 * from then on points at the new one.
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

const slug = window.INVITATION.SITE.replace(/\/+$/, '').split('/').pop();
if (!/^[a-z0-9]{6,}$/i.test(slug)) {
  throw new Error('SITE should end in an unguessable folder name, got: ' + slug);
}

const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8').replace(/<\/script/gi, '<\\/script');

const bootstrap = `
/* Read the guest out of the fragment and hand the whole invitation to the
   browser as its own document, so printing, scrolling and the back button all
   behave exactly as they do in a file you download.
   
   This has to wait for the parser to finish. document.write() while the document
   is still being parsed inserts at the script's position instead of replacing
   the document -- you end up with this page's <head> merged into the
   invitation's, two stylesheets fighting, and the envelope's spacer collapsing
   to nothing so the letter rides over everything under it. Once parsing is
   done, document.open() genuinely clears the document first. */
(function () {
  function render() {
    var data = window.INVITATION.decodePayload(location.hash) || {};
    var html = window.INVITATION.buildDocument({
      passenger: data.t || '',
      nameOverrides: { full: data.f, first: data.r, short: data.s },
      note: data.n || '',
      lang: data.l === 'it' ? 'it' : 'en',
      checkinKey: location.hash,
      fontCss: window.INVITATION_FONT_CSS,
      stampArt: window.STAMP_ART,
      letterArt: window.LETTER_ART,
      letterPicture: window.LETTER_PICTURE,
      textures: window.TEXTURES,
      flowers: window.FLOWERS
    });
    document.open();
    document.write(html);
    document.close();
    /* a link edited in place should redraw rather than sit there stale */
    window.addEventListener('hashchange', function () { location.reload(); });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
`;

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive,noimageindex">
<meta name="referrer" content="no-referrer">
<title>Briotto Family Airline</title>
<style>html,body{margin:0;height:100%;background:#d8c6b1}</style>
</head>
<body>
<script>
/* assets/fonts.js */
${read('assets/fonts.js')}
</script>
<script>
/* assets/textures.js */
${read('assets/textures.js')}
</script>
<script>
/* assets/flowers.js */
${read('assets/flowers.js')}
</script>
<script>
/* assets/stamp-art.js */
${read('assets/stamp-art.js')}
</script>
<script>
/* assets/invitation.js */
${read('assets/invitation.js')}
</script>
<script>
/* assets/template.js */
${read('assets/template.js')}
</script>
<script>${bootstrap}</script>
</body>
</html>
`;

const dir = path.join(root, 'docs', slug);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'index.html'), page);

fs.writeFileSync(path.join(root, 'docs', 'robots.txt'),
  '# Nothing here is for crawling.\nUser-agent: *\nDisallow: /\n');
fs.writeFileSync(path.join(root, 'docs', '.nojekyll'), '');

console.log('wrote docs/' + slug + '/index.html (' + Math.round(page.length / 1024) + ' KB)');
console.log('       docs/robots.txt');
