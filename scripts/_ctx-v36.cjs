const fs=require('fs');
const s=fs.readFileSync('c:/Users/Anton/.cursor/projects/empty-window/finance-tg-miniapp/public/mini-app/app.js','utf8');
for(const k of ['webOpenSettingsButton','webSwitchUserButton','webWorkspaceSwitcher']){const i=s.indexOf(k);console.log('\n'+k+' @'+i);}
