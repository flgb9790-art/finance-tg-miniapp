import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const appPath = path.join(root, "public", "mini-app", "app.js");

let app = fs.readFileSync(appPath, "utf8");

const CLIP_ICON_SVG = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8.5 12.5 15 6a2.12 2.12 0 0 1 3 3L11.5 15.5 7 17l1.5-4.5Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M19 13l-6 6a4 4 0 0 1-5.66-5.66l7-7a2.83 2.83 0 0 1 4 4l-7 7a6 6 0 0 1-8.49-8.49l8-8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`;

if (!app.includes("BALANCY_ATTACH_ICON_SVG")) {
  app = app.replace(
    "const ACCOUNT_DELETE_ICON_SVG=",
    `const BALANCY_ATTACH_ICON_SVG=${JSON.stringify(CLIP_ICON_SVG)};const ACCOUNT_DELETE_ICON_SVG=`
  );
}

if (!app.includes('n==="categories"&&safeRenderStep("categories"')) {
  app = app.replace(
    'n==="audit-log"&&loadWebAuditLogPage(),applyBalancyHintsFromState()',
    'n==="categories"&&safeRenderStep("categories",()=>renderCategories(state.categories)),n==="accounts"&&safeRenderStep("accounts",()=>renderAccounts(state.accounts)),n==="audit-log"&&loadWebAuditLogPage(),applyBalancyHintsFromState()'
  );
}

const oldMemberBtn =
  's.type="button",s.className="ghost-button web-team-member-remove",s.textContent="\\u0418\\u0441\\u043A\\u043B\\u044E\\u0447\\u0438\\u0442\\u044C",s.addEventListener("click"';

const newMemberBtn =
  's.type="button",s.className="web-categories-icon-btn web-categories-icon-btn--danger web-team-member-remove",s.setAttribute("aria-label","\\u0418\\u0441\\u043A\\u043B\\u044E\\u0447\\u0438\\u0442\\u044C \\u0443\\u0447\\u0430\\u0441\\u0442\\u043D\\u0438\\u043A\\u0430"),s.setAttribute("title","\\u0418\\u0441\\u043A\\u043B\\u044E\\u0447\\u0442\\u044C"),s.innerHTML=ACCOUNT_DELETE_ICON_SVG,s.addEventListener("click';

if (app.includes(oldMemberBtn)) {
  app = app.replace(oldMemberBtn, newMemberBtn);
}

const oldMemberLayout =
  'r.className="web-team-member-item";const i=document.createElement("span");i.className="web-team-member-name",i.textContent=formatWorkspaceMemberLabel(o);const a=document.createElement("motion");a.className="web-team-member-trailing"';

const newMemberLayout =
  'r.className="web-team-member-item";const l=String(o.userId??"").trim();const nOwner=String(state.user?.id??"").trim();let removeBtn=null;if(t&&o.role!=="owner"&&l&&l!==nOwner){removeBtn=document.createElement("button");removeBtn.type="button";removeBtn.className="web-categories-icon-btn web-categories-icon-btn--danger web-team-member-remove";removeBtn.setAttribute("aria-label","\\u0418\\u0441\\u043A\\u043B\\u044E\\u0447\\u0438\\u0442\\u044C \\u0443\\u0447\\u0430\\u0441\\u0442\\u043D\\u043A\\u0430");removeBtn.setAttribute("title","\\u0418\\u0441\\u043A\\u043B\\u044E\\u0447\\u044C");removeBtn.innerHTML=ACCOUNT_DELETE_ICON_SVG;removeBtn.addEventListener("click",()=>{void excludeTeamMember(o,removeBtn)});r.append(removeBtn)}const i=document.createElement("span");i.className="web-team-member-name",i.textContent=formatWorkspaceMemberLabel(o);const a=document.createElement("motion");a.className="web-team-member-trailing"';

// Simpler approach: only reorder by prepending remove to r instead of a
const oldMemberForEach =
  'e.forEach(o=>{const r=document.createElement("li");r.className="web-team-member-item";const i=document.createElement("span");i.className="web-team-member-name",i.textContent=formatWorkspaceMemberLabel(o);const a=document.createElement("div");a.className="web-team-member-trailing";const c=document.createElement("span");c.className="muted web-team-member-role",c.textContent=o.role==="owner"?"\\u0412\\u043B\\u0430\\u0434\\u0435\\u043B\\u0435\\u0446":"\\u0423\\u0447\\u0430\\u0441\\u0442\\u043D\\u0438\\u043A",a.append(c);const l=String(o.userId??"").trim();if(t&&o.role!=="owner"&&l&&l!==n){const s=document.createElement("button");s.type="button",s.className="ghost-button web-team-member-remove",s.textContent="\\u0418\\u0441\\u043A\\u043B\\u044E\\u0447\\u0438\\u0442\\u044C",s.addEventListener("click",()=>{';

if (app.includes(oldMemberForEach)) {
  const newMemberForEach =
    'e.forEach(o=>{const r=document.createElement("li");r.className="web-team-member-item";const l=String(o.userId??"").trim();if(t&&o.role!=="owner"&&l&&l!==n){const s=document.createElement("button");s.type="button",s.className="web-categories-icon-btn web-categories-icon-btn--danger web-team-member-remove",s.setAttribute("aria-label","\\u0418\\u0441\\u043A\\u043B\\u044E\\u0447\\u0438\\u0442\\u044C \\u0443\\u0447\\u0430\\u0441\\u0442\\u043D\\u0438\\u043A\\u0430"),s.setAttribute("title","\\u0418\\u0441\\u043A\\u043B\\u044E\\u0447\\u044C"),s.innerHTML=ACCOUNT_DELETE_ICON_SVG,r.append(s),s.addEventListener("click",()=>{';
  app = app.replace(oldMemberForEach, newMemberForEach);

  // Remove duplicate append to trailing - old code had a.append(s), need to remove that
  app = app.replace("a.append(s),s.addEventListener", "s.addEventListener");
}

// Photo pick buttons: set clip icon on init
const photoPickInit =
  'function initBalancyAttachButtons(){const e=document.getElementById("entryPhotoPickButton"),t=document.getElementById("transferPhotoPickButton");e&&!e.dataset.iconReady&&(e.dataset.iconReady="1",e.className="balancy-attach-btn",e.innerHTML=BALANCY_ATTACH_ICON_SVG,e.setAttribute("aria-label","\\u041F\\u0440\\u0438\\u043A\\u0440\\u0435\\u043F\\u0438\\u0442\\u044C \\u0444\\u043E\\u0442\\u043E"),e.setAttribute("title","\\u041F\\u0440\\u0438\\u043A\\u0440\\u0435\\u043F\\u0442\\u044C \\u0444\\u043E\\u0442\\u043E")),t&&!t.dataset.iconReady&&(t.dataset.iconReady="1",t.className="balancy-attach-btn",t.innerHTML=BALANCY_ATTACH_ICON_SVG,t.setAttribute("aria-label","\\u041F\\u0440\\u0438\\u043A\\u0440\\u0435\\u043F\\u0438\\u0442\\u044C \\u0444\\u043E\\u0442\\u043E"),t.setAttribute("title","\\u041F\\u0440\\u0438\\u043A\\u0440\\u0435\\u043F\\u0438\\u0442\\u044C \\u0444\\u043E\\u0442\\u043E"))}';

if (!app.includes("function initBalancyAttachButtons")) {
  app = app.replace(
    "function attachEntryPhotoChrome()",
    `${photoPickInit}function attachEntryPhotoChrome()`
  );
  app = app.replace(
    "window.__balancyEntryPhotoChromeAttached=!0",
    "initBalancyAttachButtons(),window.__balancyEntryPhotoChromeAttached=!0"
  );
  app = app.replace(
    "window.__balancyTransferPhotoChromeAttached=!0",
    "initBalancyAttachButtons(),window.__balancyTransferPhotoChromeAttached=!0"
  );
}

fs.writeFileSync(appPath, app);
console.log("Patched app.js");
