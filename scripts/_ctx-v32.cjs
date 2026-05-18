const fs=require('fs');
const s=fs.readFileSync('c:/Users/Anton/.cursor/projects/empty-window/finance-tg-miniapp/public/mini-app/app.js','utf8');
const keys=['function syncWebTeamSettingsCardVisibility()','async function loadWebTeamSettings()','resolvePendingInviteForCurrentUser','maybeShowWorkspaceInviteGate','выйдите из неё в настройках','webTeamDissolveButtonElement&&(webTeamDissolveButtonElement.hidden','webAccountResetButtonElement&&(webAccountResetButtonElement.hidden'];
for(const k of keys){const i=s.indexOf(k);console.log('\n### '+k+' @'+i);if(i>=0)console.log(s.slice(i-260,i+1300));}
