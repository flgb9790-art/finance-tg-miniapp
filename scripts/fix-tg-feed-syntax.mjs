import fs from "node:fs";

const appPath = new URL("../public/mini-app/app.js", import.meta.url);
let app = fs.readFileSync(appPath, "utf8");

const broken = `    for (const item of groupItems) {
      if (item.type === "entry") {
        return buildHomeActivityEntryRowHtml(item.payload, item);
      }

      const transfer = item.payload;
        const title = \`\${transfer.from_account?.name ?? "Счёт"} → \${transfer.to_account?.name ?? "Счёт"}\`;

        const transferRowHtml = \`<motion class="tg-ops-row" role="listitem">`;

const fixed = `    for (const item of groupItems) {
      if (item.type === "entry") {
        const entry = item.payload;
        const cat = entry.category;
        const catName = cat?.name ?? "Без категории";
        const iconClass = entry.kind === "income" ? "tg-ops-row-icon--income" : "tg-ops-row-icon--expense";
        const amountClass = entry.kind === "income" ? "tg-ops-amount-val--income" : "tg-ops-amount-val--expense";
        const prefix = entry.kind === "income" ? "+" : "−";
        const amt = escapeHtml(\`\${prefix}\${formatMoneyAmount(entry.amount)}\`);
        const ccy = escapeHtml(entry.currency_code || "");

        const entryRowHtml = \`<motion class="tg-ops-row" role="listitem">`;

if (app.includes("return buildHomeActivityEntryRowHtml(item.payload, item);")) {
  const start = app.indexOf("    for (const item of groupItems) {\n      if (item.type === \"entry\") {\n        return buildHomeActivityEntryRowHtml");
  const end = app.indexOf("        parts.push(wrapTgOpsRowWithSwipeActions(transferRowHtml, \"transfer\", transfer.id));", start);
  const after = app.indexOf("\n      }\n    }\n  }\n\n  return parts.join(\"\");", end);

  const entryBlock = `    for (const item of groupItems) {
      if (item.type === "entry") {
        const entry = item.payload;
        const cat = entry.category;
        const catName = cat?.name ?? "Без категории";
        const iconClass = entry.kind === "income" ? "tg-ops-row-icon--income" : "tg-ops-row-icon--expense";
        const amountClass = entry.kind === "income" ? "tg-ops-amount-val--income" : "tg-ops-amount-val--expense";
        const prefix = entry.kind === "income" ? "+" : "−";
        const amt = escapeHtml(\`\${prefix}\${formatMoneyAmount(entry.amount)}\`);
        const ccy = escapeHtml(entry.currency_code || "");

        const entryRowHtml = \`<motion class="tg-ops-row" role="listitem">
          <motion class="tg-ops-row-icon \${iconClass}" aria-hidden="true">\${getEntryIcon(entry.kind)}</motion>
          <motion class="tg-ops-row-main">
            <span class="tg-ops-row-title">\${escapeHtml(catName)}\${buildEntryAttachmentsChipHtml(entry)}</span>
            <span class="tg-ops-row-meta">\${escapeHtml(entry.account?.name ?? "Счёт")} · \${escapeHtml(
              formatOperationAuthorMeta(
                item.createdBy ?? resolveOperationCreatedByFromApi(null, entry),
                entry.occurred_at
              )
            )}\${entry.note ? \` · \${escapeHtml(entry.note)}\` : ""}</span>
          </motion>
          <motion class="tg-ops-amount-stack">
            <span class="tg-ops-amount-val \${amountClass}">\${amt}</span>
            <span class="tg-ops-amount-ccy">\${ccy}</span>
          </motion>
        </motion>\`;

        parts.push(wrapTgOpsRowWithSwipeActions(entryRowHtml, "entry", entry.id));
      } else {
        const transfer = item.payload;
        const title = \`\${transfer.from_account?.name ?? "Счёт"} → \${transfer.to_account?.name ?? "Счёт"}\`;

        const transferRowHtml = \`<motion class="tg-ops-row" role="listitem">`;

  if (start >= 0 && end > start && after > end) {
    const transferTail = app.slice(end, after + "\n      }\n    }\n  }\n\n  return parts.join(\"\");".length);
    const entryBlockClean = entryBlock.replaceAll("<motion ", "<div ").replaceAll("</motion>", "</div>");
    const transferPart = transferTail.replaceAll("<motion ", "<div ").replaceAll("</motion>", "</div>");
    app = app.slice(0, start) + entryBlockClean + transferPart;
    console.log("fixed buildTgOpsFeedHtmlFromItems");
  } else {
    console.log("slice failed", start, end, after);
  }
}

app = app.replaceAll("<motion ", "<motion ");
app = app.replaceAll("</motion>", "</motion>");
app = app.replaceAll("<motion ", "<div ");
app = app.replaceAll("</motion>", "</div>");

if (app.includes("const amountPrefix = entry.kind === \"income\"") && app.includes("buildRecentActivityCombinedHtml")) {
  app = app.replace(
    /      if \(item\.type === "entry"\) \{\s*const entry = item\.payload;[\s\S]*?<\/article>\s*`;\s*\}/,
    `      if (item.type === "entry") {
        return buildHomeActivityEntryRowHtml(item.payload, item);
      }`
  );
  console.log("fixed buildRecentActivityCombinedHtml");
}

fs.writeFileSync(appPath, app);
