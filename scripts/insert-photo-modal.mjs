import fs from "node:fs";

const p = new URL("../public/mini-app/index.html", import.meta.url);
let html = fs.readFileSync(p, "utf8");

if (html.includes("entryPhotoModal")) {
  process.exit(0);
}

const block = `
    <div id="entryPhotoModal" class="entry-photo-modal" hidden>
      <div id="entryPhotoModalBackdrop" class="entry-photo-modal-backdrop"></div>
      <div class="entry-photo-modal-sheet" role="dialog" aria-modal="true" aria-label="Фото чека">
        <button type="button" id="entryPhotoModalClose" class="entry-photo-modal-close" aria-label="Закрыть">×</button>
        <img id="entryPhotoModalImg" class="entry-photo-modal-img" alt="Фото чека" />
      </div>
    </div>

`;

html = html.replace('    <div id="globalBusyOverlay"', block + '    <motion id="globalBusyOverlay"');
html = html.replace("<motion id=\"globalBusyOverlay\"", '<div id="globalBusyOverlay"');

fs.writeFileSync(p, html);
console.log("inserted entryPhotoModal");
