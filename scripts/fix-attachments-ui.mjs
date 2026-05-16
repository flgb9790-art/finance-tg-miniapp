import fs from "node:fs";

const appPath = new URL("../public/mini-app/app.js", import.meta.url);
let app = fs.readFileSync(appPath, "utf8");

app = app.replaceAll("<motion ", "<div ");
app = app.replaceAll("</motion>", "</div>");

const marker = "      if (item.type === \"entry\") {\n        const entry = item.payload;";

if (app.includes(marker) && !app.includes("return buildHomeActivityEntryRowHtml(item.payload, item);")) {
  const start = app.indexOf(marker);
  const end = app.indexOf("      const transfer = item.payload;", start);
  if (start >= 0 && end > start) {
    app = `${app.slice(0, start)}      if (item.type === "entry") {
        return buildHomeActivityEntryRowHtml(item.payload, item);
      }

${app.slice(end)}`;
    console.log("buildRecentActivityCombinedHtml updated");
  }
} else {
  console.log("skip buildRecentActivityCombinedHtml");
}

const renderMarker = `        <article class="entry-item">`;

if (app.includes(renderMarker) && app.includes("entry-title-row")) {
  app = app.replace(
    /      return `\s*<article class="entry-item">[\s\S]*?formatEntryAmountStackHtml\(amountPrefix, entry\.amount, entry\.currency_code, amountClass\)\}\s*<\/article>\s*`;/,
    `      return buildHomeActivityEntryRowHtml(entry, {
        createdBy: resolveOperationCreatedByFromApi(null, entry)
      });`
  );
  console.log("renderRecentEntries updated");
}

if (!app.includes("if (entry.photoViewUrl)")) {
  app = app.replace(
    `function mergeRecentEntry(entry) {
  if (!entry?.id) {
    return;
  }

  state.recentEntries = [`,
    `function mergeRecentEntry(entry) {
  if (!entry?.id) {
    return;
  }

  if (entry.photoViewUrl) {
    rememberEntryPhotoViewUrl(entry.id, entry.photoViewUrl);
  }

  state.recentEntries = [`
  );
  console.log("mergeRecentEntry updated");
}

fs.writeFileSync(appPath, app);
