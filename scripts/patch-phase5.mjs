import fs from "node:fs";

const indexPath = "public/mini-app/index.html";
let html = fs.readFileSync(indexPath, "utf8");

const tgWorkspaceCard = `          <section id="tgWorkspaceCard" class="card tg-workspace-card tg-only-block">
            <div class="section-header">
              <div>
                <p class="section-label">\u0420\u0430\u0431\u043e\u0447\u0435\u0435 \u043f\u0440\u043e\u0441\u0442\u0440\u0430\u043d\u0441\u0442\u0432\u043e</p>
                <h2>\u041a\u043e\u043c\u0430\u043d\u0434\u0430 \u0438 \u0434\u043e\u0441\u0442\u0443\u043f</h2>
              </motion>
            </div>
            <p id="tgWorkspaceActiveMeta" class="muted tg-workspace-active-meta"></p>
            <div id="tgWorkspaceSwitcherList" class="tg-workspace-switcher-list" hidden></div>
            <button type="button" id="tgWorkspaceCreateTeamButton" class="ghost-button tg-workspace-create-team" hidden>
              \u0421\u043e\u0437\u0434\u0430\u0442\u044c \u043a\u043e\u043c\u0430\u043d\u0434\u0443
            </button>
          </section>
`.replaceAll("<motion", "<motion").replaceAll("</motion>", "</motion>");

const tgCardFixed = tgWorkspaceCard
  .replaceAll("<motion", "<div")
  .replaceAll("</motion>", "</div>");

if (!html.includes("tgWorkspaceCard")) {
  html = html.replace(
    "            </div>\n          </section>\n        </section>\n\n        <section id=\"screen-settings\"",
    `            </motion>\n          </section>\n${tgCardFixed}\n        </section>\n\n        <section id="screen-settings"`
  );
  html = html.replace(
    `            </motion>\n          </section>\n${tgCardFixed}\n        </section>`,
    `            </div>\n          </section>\n${tgCardFixed}\n        </section>`
  );
}

html = html.replace(
  'class="card web-team-settings-card web-only-block" hidden',
  'class="card web-team-settings-card" hidden'
);

html = html.replace(
  /BALANCY_CLIENT_ASSET_REV = "[^"]+"/,
  'BALANCY_CLIENT_ASSET_REV = "20260515web-teams-phase5-v1"'
);

fs.writeFileSync(indexPath, html, "utf8");
console.log("index", html.includes("tgWorkspaceCard"), html.includes("web-only-block") && html.includes("web-team-settings"));
