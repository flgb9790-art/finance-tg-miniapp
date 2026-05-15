const tg = window.Telegram?.WebApp;
const isWebMode = new URLSearchParams(window.location.search).get("web") === "1";
const WEB_WORKSPACE_MODE_SEEN_KEY = "balancy_web_workspace_mode_seen_v1";
const WEB_INVITE_TOKEN_SESSION_KEY = "balancy_web_invite_token";

/** Есть реальная сессия mini app (не просто заглушка Telegram). */
function isTelegramMiniAppWithInitData() {
  try {
    const raw = window.Telegram?.WebApp?.initData;
    return typeof raw === "string" && raw.trim().length > 0;
  } catch {
    return false;
  }
}

/** В этом заходе по URL был ?invite= — нужно сбросить веб-сессию, иначе чужой balancy_session откроет чужой аккаунт. */
let webInviteCapturedThisPageLoad = false;

function parseWebInviteTokenFromLocation() {
  try {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("invite")?.trim();

    if (!token) {
      return;
    }

    /*
      Мобильный Safari/Chrome: ссылка без ?web=1 не включает веб-режим — loadApp() завершается с
      «Откройте из Telegram», вход через Login Widget не показывается. Добавляем web=1, если это не
      полноценный Telegram Mini App с initData.
     */
    if (params.get("web") !== "1" && !isTelegramMiniAppWithInitData()) {
      params.set("web", "1");
      params.set("invite", token);
      const next = `${window.location.pathname}?${params.toString()}${window.location.hash || ""}`;
      window.location.replace(next);
      return;
    }

    sessionStorage.setItem(WEB_INVITE_TOKEN_SESSION_KEY, token);
    webInviteCapturedThisPageLoad = true;
    params.delete("invite");
    const nextQuery = params.toString();
    const nextUrl = nextQuery
      ? `${window.location.pathname}?${nextQuery}${window.location.hash}`
      : `${window.location.pathname}${window.location.hash}`;
    window.history.replaceState({}, "", nextUrl);
  } catch {
    //
  }
}

parseWebInviteTokenFromLocation();


/** В TG: клавиатура не сжимает layout — нижняя навигация не «подпрыгивает» над клавиатурой. Веб-версия meta не трогается. */
function applyTelegramMiniAppViewportFix() {
  if (isWebMode) {
    return;
  }

  const m = document.querySelector('meta[name="viewport"]');
  if (!m) {
    return;
  }

  m.setAttribute(
    "content",
    "width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=overlays-content"
  );
}

applyTelegramMiniAppViewportFix();

let globalBusyDepth = 0;

const WEB_PAGE_TITLES = {
  home: "Главная",
  ledger: "История",
  activity: "Операции",
  history: "История",
  instruction: "Инструкция",
  reports: "Отчёты",
  categories: "Категории",
  accounts: "Счета",
  more: "Ещё",
  transfer: "Перевод между счетами",
  settings: "Настройки"
};

const userNameElement = document.getElementById("userName");
const homeWelcomeLine = document.getElementById("homeWelcomeLine");
const statusTextElement = document.getElementById("statusText");
const accountsTitleElement = document.getElementById("accountsTitle");
const accountFormTitleElement = document.getElementById("accountFormTitle");
const accountsCountElement = document.getElementById("accountsCount");
const categoriesCountElement = document.getElementById("categoriesCount");
const monthlyIncomeElement = document.getElementById("monthlyIncome");
const monthlyExpenseElement = document.getElementById("monthlyExpense");
const monthlyIncomeInlineElement = document.getElementById("monthlyIncomeInline");
const totalBalanceConvertedElement = document.getElementById("totalBalanceConverted");
const homeReportingCurrencyInput = document.getElementById("homeReportingCurrencyInput");
const homeBalancesByCurrencyListWebElement = document.getElementById("homeBalancesByCurrencyListWeb");
const homeBalancesByCurrencyListTgElement = document.getElementById("homeBalancesByCurrencyListTg");
const ratesStatusTextElement = document.getElementById("ratesStatusText");
const homeAccountsListElement = document.getElementById("homeAccountsList");
const accountsListElement = document.getElementById("accountsList");
const incomeCategoriesListElement = document.getElementById("incomeCategoriesList");
const expenseCategoriesListElement = document.getElementById("expenseCategoriesList");
const recentEntriesListElement = document.getElementById("recentEntriesList");
const recentTransfersListElement = document.getElementById("recentTransfersList");
const homeRecentActivityListElement = document.getElementById("homeRecentActivityList");
const refreshButton = document.getElementById("refreshButton");
const tgGlobalScreenTitleElement = document.getElementById("tgGlobalScreenTitle");
const tgGlobalNewEntryButton = document.getElementById("tgGlobalNewEntryButton");
const webTopNav = document.getElementById("webTopNav");
const webRefreshButton = document.getElementById("webRefreshButton");
const webTopNavAddButton = document.getElementById("webTopNavAddButton");
const webProfileMenu = document.getElementById("webProfileMenu");
const webProfileToggleButton = document.getElementById("webProfileToggleButton");
const webProfileDropdown = document.getElementById("webProfileDropdown");
const webProfileMeta = document.getElementById("webProfileMeta");
const webSwitchUserButton = document.getElementById("webSwitchUserButton");
const webLoginGateElement = document.getElementById("webLoginGate");
const webLoginWidgetHost = document.getElementById("webLoginWidgetHost");
const webLoginGateErrorElement = document.getElementById("webLoginGateError");
const webModeChoiceElement = document.getElementById("webModeChoice");
const webModeChoicePersonalButton = document.getElementById("webModeChoicePersonal");
const webModeChoiceTeamButton = document.getElementById("webModeChoiceTeam");
const webModeChoiceTeamPanelElement = document.getElementById("webModeChoiceTeamPanel");
const webModeChoiceTeamNameInput = document.getElementById("webModeChoiceTeamName");
const webModeChoiceTeamSubmitButton = document.getElementById("webModeChoiceTeamSubmit");
const webModeChoiceErrorElement = document.getElementById("webModeChoiceError");
const workspaceInviteGateElement = document.getElementById("workspaceInviteGate");
const workspaceInviteGateTeamNameElement = document.getElementById("workspaceInviteGateTeamName");
const workspaceInviteGateMetaElement = document.getElementById("workspaceInviteGateMeta");
const workspaceInviteAcceptButtonElement = document.getElementById("workspaceInviteAcceptButton");
const workspaceInviteDeclineButtonElement = document.getElementById("workspaceInviteDeclineButton");
const workspaceInviteGateErrorElement = document.getElementById("workspaceInviteGateError");
const webWorkspaceSwitcherElement = document.getElementById("webWorkspaceSwitcher");
const webWorkspaceSwitcherListElement = document.getElementById("webWorkspaceSwitcherList");
const webTeamSettingsCardElement = document.getElementById("webTeamSettingsCard");
const webTeamSettingsTitleElement = document.getElementById("webTeamSettingsTitle");
const webTeamSettingsMetaElement = document.getElementById("webTeamSettingsMeta");
const webTeamNameInputElement = document.getElementById("webTeamNameInput");
const webTeamRenameButtonElement = document.getElementById("webTeamRenameButton");
const webTeamCopyInviteButtonElement = document.getElementById("webTeamCopyInviteButton");
const webTeamInviteStatusElement = document.getElementById("webTeamInviteStatus");
const webTeamMembersListElement = document.getElementById("webTeamMembersList");
const webTeamSettingsErrorElement = document.getElementById("webTeamSettingsError");
const webTeamInvitesBlockElement = document.getElementById("webTeamInvitesBlock");
const webTeamInvitesListElement = document.getElementById("webTeamInvitesList");
const webTeamLeaveButtonElement = document.getElementById("webTeamLeaveButton");
const webTeamLeaveOwnerHintElement = document.getElementById("webTeamLeaveOwnerHint");
const webTeamInviteBlockElement = document.querySelector(".web-team-invite-block");
const tgWorkspaceCardElement = document.getElementById("tgWorkspaceCard");
const tgWorkspaceActiveMetaElement = document.getElementById("tgWorkspaceActiveMeta");
const tgWorkspaceSwitcherListElement = document.getElementById("tgWorkspaceSwitcherList");
const tgWorkspaceCreateTeamButtonElement = document.getElementById("tgWorkspaceCreateTeamButton");
const tgCreateTeamPanelElement = document.getElementById("tgCreateTeamPanel");
const tgCreateTeamNameInputElement = document.getElementById("tgCreateTeamNameInput");
const tgCreateTeamSubmitButtonElement = document.getElementById("tgCreateTeamSubmitButton");
const tgCreateTeamCancelButtonElement = document.getElementById("tgCreateTeamCancelButton");
const tgCreateTeamErrorElement = document.getElementById("tgCreateTeamError");

const webOpenSettingsButton = document.getElementById("webOpenSettingsButton");
const webNewEntryMenu = document.getElementById("webNewEntryMenu");
const webPageTitleElement = document.getElementById("webPageTitle");
const webPageSubtitleElement = document.getElementById("webPageSubtitle");
const webPageSubtitleFullElement = document.querySelector(
  "#webPageSubtitle .web-page-subtitle-line--full"
);
const webPageSubtitleCompactElement = document.querySelector(
  "#webPageSubtitle .web-page-subtitle-line--compact"
);
const webSidebarUserNameElement = document.getElementById("webSidebarUserName");
const webSidebarBurgerBtn = document.getElementById("webSidebarBurgerBtn");
const webNavDrawerBackdrop = document.getElementById("webNavDrawerBackdrop");
const syncRatesButton = document.getElementById("syncRatesButton");
const fxBoardBaseInput = document.getElementById("fxBoardBaseInput");
const fxBoardRowsElement = document.getElementById("fxBoardRows");
const fxReferenceSummaryMetaElement = document.getElementById("fxReferenceSummaryMeta");
const fxCalcAmountInput = document.getElementById("fxCalcAmountInput");
const fxCalcFromInput = document.getElementById("fxCalcFromInput");
const fxCalcToInput = document.getElementById("fxCalcToInput");
const fxCalcSwapButton = document.getElementById("fxCalcSwapButton");
const fxCalcResultElement = document.getElementById("fxCalcResult");
const fxCalcKeyboardAccessory = document.getElementById("fxCalcKeyboardAccessory");
const fxCalcKeyboardDoneButton = document.getElementById("fxCalcKeyboardDone");
const accountForm = document.getElementById("accountForm");
const submitButton = document.getElementById("submitButton");
const cancelAccountEditButton = document.getElementById("cancelAccountEditButton");
const accountsStatusTextElement = document.getElementById("accountsStatusText");
const currencyInput = document.getElementById("currencyInput");
const categoryForm = document.getElementById("categoryForm");
const categorySubmitButton = document.getElementById("categorySubmitButton");
const categoryFormTitleElement = document.getElementById("categoryFormTitle");
const cancelCategoryEditButton = document.getElementById("cancelCategoryEditButton");
const swipeDelegationRoot = document.querySelector("main.tabbed-content");
const entryForm = document.getElementById("entryForm");
const entrySubmitButton = document.getElementById("entrySubmitButton");
const entryKindInput = document.getElementById("entryKindInput");
const entryAccountInput = document.getElementById("entryAccountInput");
const entryCategoryInput = document.getElementById("entryCategoryInput");
const entryDateInput = document.getElementById("entryDateInput");
const entryAmountInput = document.getElementById("entryAmountInput");
const entryCurrencyInput = document.getElementById("entryCurrencyInput");
const entryCurrencyHint = document.getElementById("entryCurrencyHint");
const webActivityRecentListElement = document.getElementById("webActivityRecentList");
const webTransferRecentListElement = document.getElementById("webTransferRecentList");
const WEB_RECENT_SIDEBAR_LIMIT = 9;
const transferForm = document.getElementById("transferForm");
const transferSubmitButton = document.getElementById("transferSubmitButton");
const transferFromAccountInput = document.getElementById("transferFromAccountInput");
const transferToAccountInput = document.getElementById("transferToAccountInput");
const transferDateInput = document.getElementById("transferDateInput");
const reportForm = document.getElementById("reportForm");
const reportSubmitButton = document.getElementById("reportSubmitButton");
const reportResetFiltersButton = document.getElementById("reportResetFiltersButton");
const reportPeriodInput = document.getElementById("reportPeriodInput");
const reportingCurrencyInput = document.getElementById("reportingCurrencyInput");
const reportCategoryFilterInput = document.getElementById("reportCategoryFilterInput");
const reportStartDateInput = document.getElementById("reportStartDateInput");
const reportEndDateInput = document.getElementById("reportEndDateInput");
const reportTitleElement = document.getElementById("reportTitle");
const reportRangeLabelElement = document.getElementById("reportRangeLabel");
const reportIncomeValueElement = document.getElementById("reportIncomeValue");
const reportExpenseValueElement = document.getElementById("reportExpenseValue");
const reportNetValueElement = document.getElementById("reportNetValue");
const reportStatIncomeSub = document.getElementById("reportStatIncomeSub");
const reportStatExpenseSub = document.getElementById("reportStatExpenseSub");
const reportStatNetSub = document.getElementById("reportStatNetSub");
const reportStatOpsSub = document.getElementById("reportStatOpsSub");
const reportTransfersCountValueElement = document.getElementById("reportTransfersCountValue");
const reportCurrentBalanceValueElement = document.getElementById("reportCurrentBalanceValue");
const reportCurrentBalanceCurrencyElement = document.getElementById("reportCurrentBalanceCurrency");
const reportIncomeCategoriesListElement = document.getElementById("reportIncomeCategoriesList");
const reportExpenseCategoriesListElement = document.getElementById("reportExpenseCategoriesList");
const reportTransfersStatBox = document.getElementById("reportTransfersStatBox");
const reportDownloadCsvButton = document.getElementById("reportDownloadCsvButton");
const reportDownloadCsvLabel = document.getElementById("reportDownloadCsvLabel");
const reportCsvStatementButton = document.getElementById("reportCsvStatementButton");
const reportKindFilterInput = document.getElementById("reportKindFilterInput");
const reportAccountFilterInput = document.getElementById("reportAccountFilterInput");
const reportOperationsCountValueElement = document.getElementById("reportOperationsCountValue");
const reportCategoryMatrixBody = document.getElementById("reportCategoryMatrixBody");
const reportPeriodSummaryDl = document.getElementById("reportPeriodSummaryDl");
const reportDonutTotalElement = document.getElementById("reportDonutTotal");
const webReportsBodyEl = document.getElementById("webReportsBody");
const addOperationButton = document.getElementById("addOperationButton");
const webOperationsRoot = document.getElementById("webOperationsRoot");
const webOpsDateFrom = document.getElementById("webOpsDateFrom");
const webOpsDateTo = document.getElementById("webOpsDateTo");
const webOpsKindFilter = document.getElementById("webOpsKindFilter");
const webOpsAccountFilter = document.getElementById("webOpsAccountFilter");
const webOpsCategoryFilter = document.getElementById("webOpsCategoryFilter");
const webOpsSearchInput = document.getElementById("webOpsSearchInput");
const webOpsApplyButton = document.getElementById("webOpsApplyButton");
const webOpsTableBody = document.getElementById("webOpsTableBody");
const webOpsEmptyHint = document.getElementById("webOpsEmptyHint");
const webOpsStatCount = document.getElementById("webOpsStatCount");
const webOpsStatIncome = document.getElementById("webOpsStatIncome");
const webOpsStatExpense = document.getElementById("webOpsStatExpense");
const webOpsStatNet = document.getElementById("webOpsStatNet");
const webOpsPageInfo = document.getElementById("webOpsPageInfo");
const webOpsPagePrev = document.getElementById("webOpsPagePrev");
const webOpsPageNext = document.getElementById("webOpsPageNext");
const webOpsPageSize = document.getElementById("webOpsPageSize");
const entryTypeModalElement = document.getElementById("entryTypeModal");
const entryTypeModalBackdrop = document.getElementById("entryTypeModalBackdrop");
const entryTypeModalCloseButton = document.getElementById("entryTypeModalClose");
const helpDocumentationModalElement = document.getElementById("helpDocumentationModal");
const helpDocumentationBackdrop = document.getElementById("helpDocumentationBackdrop");
const helpDocumentationCloseTopButton = document.getElementById("helpDocumentationCloseTop");
const helpDocumentationCloseBottomButton = document.getElementById("helpDocumentationCloseBottom");
const openHelpDocumentationButton = document.getElementById("openHelpDocumentationButton");
const entryTypeActionButtons = Array.from(document.querySelectorAll("[data-entry-kind]"));
const screenElements = Array.from(document.querySelectorAll(".screen"));
const navButtons = Array.from(document.querySelectorAll(".bottom-nav-button"));
const openScreenButtons = Array.from(document.querySelectorAll("[data-open-screen]"));

const state = {
  user: null,
  workspace: null,
  workspaces: [],
  accounts: [],
  categories: [],
  currencies: [],
  recentEntries: [],
  recentTransfers: [],
  summary: null,
  report: null,
  /** Query string параметров, с которыми последний раз получен `report` */
  reportExportQuery: null,
  editingAccountId: null,
  editingCategoryId: null,
  /** Последний ответ GET /api/operations (веб), чтобы не перезагружать при смене вкладки */
  webOperationsLastPayload: null
};

let webOpsOffset = 0;
let webOpsDatesInitialized = false;

/** Лента «Операции» в Telegram: пагинация и запрос к /api/operations */
const TG_OPS_PAGE_SIZE = 12;
let tgOpsPageOffset = 0;
/** Снимок фильтров ленты TG (обновляется по «Показать» и при первом рендере) */
let tgOpsAppliedFilter = {
  q: "",
  fromY: "",
  toY: "",
  accId: "",
  kind: "all",
  catId: ""
};
let tgOpsFilterSnapshotInitialized = false;
let tgActivityOpsChromeAttached = false;
let tgOpsDefaultDatesInitialized = false;

let webCategoriesChromeAttached = false;

/** Экран, на который вернёмся после «Назад» / отмены с формы перевода */
let transferReturnScreen = "home";
/** Предыдущий экран для жеста «назад» с левого края (Telegram) */
let telegramGestureBackTarget = "home";
let transferRateHintTimer = null;
let transferRateHintRequestId = 0;
let transferToPreviewTimer = null;
let transferToPreviewRequestId = 0;
/** Значение `transferToAmountInput`, выставленное автоконвертацией (для перезаписи при смене суммы списания). */
let transferToAmountAutofillTag = null;
let transferToAmountProgrammatic = false;

/** @type {{ trend?: object, category?: object }} */
let reportChartInstances = { trend: null, category: null };

const balancySplashStartedAt = Date.now();
let refreshAppDataDebounceTimer = null;
let refreshAppDataInFlight = null;

(function noteClientBundleEvaluated() {
  try {
    if (statusTextElement && statusTextElement.textContent.includes("Подключаем")) {
      statusTextElement.textContent =
        "Код интерфейса загружен, ждём Telegram и ответ сервера…";
    }
  } catch {
    //
  }
})();

const POPULAR_CURRENCY_CODES = [
  "USD",
  "EUR",
  "GBP",
  "PLN",
  "BYN",
  "RUB",
  "GEL",
  "UAH",
  "TRY",
  "CHF"
];

const FALLBACK_CURRENCIES = [
  { code: "AED", name: "UAE Dirham", symbol: "AED" },
  { code: "AMD", name: "Armenian Dram", symbol: "AMD" },
  { code: "AUD", name: "Australian Dollar", symbol: "AUD" },
  { code: "AZN", name: "Azerbaijani Manat", symbol: "AZN" },
  { code: "BGN", name: "Bulgarian Lev", symbol: "BGN" },
  { code: "BRL", name: "Brazilian Real", symbol: "BRL" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "CAD", name: "Canadian Dollar", symbol: "CAD" },
  { code: "CNY", name: "Chinese Yuan", symbol: "CNY" },
  { code: "CZK", name: "Czech Koruna", symbol: "CZK" },
  { code: "DKK", name: "Danish Krone", symbol: "DKK" },
  { code: "EUR", name: "Euro", symbol: "EUR" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HKD" },
  { code: "HUF", name: "Hungarian Forint", symbol: "HUF" },
  { code: "INR", name: "Indian Rupee", symbol: "INR" },
  { code: "JPY", name: "Japanese Yen", symbol: "JPY" },
  { code: "KGS", name: "Kyrgyzstani Som", symbol: "KGS" },
  { code: "KZT", name: "Kazakhstani Tenge", symbol: "KZT" },
  { code: "MDL", name: "Moldovan Leu", symbol: "MDL" },
  { code: "MXN", name: "Mexican Peso", symbol: "MXN" },
  { code: "NOK", name: "Norwegian Krone", symbol: "NOK" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZD" },
  { code: "RUB", name: "Russian Ruble", symbol: "RUB" },
  { code: "GEL", name: "Georgian Lari", symbol: "GEL" },
  { code: "PLN", name: "Polish Zloty", symbol: "PLN" },
  { code: "BYN", name: "Belarusian Ruble", symbol: "BYN" },
  { code: "GBP", name: "British Pound", symbol: "GBP" },
  { code: "RON", name: "Romanian Leu", symbol: "RON" },
  { code: "SEK", name: "Swedish Krona", symbol: "SEK" },
  { code: "SGD", name: "Singapore Dollar", symbol: "SGD" },
  { code: "THB", name: "Thai Baht", symbol: "THB" },
  { code: "UAH", name: "Ukrainian Hryvnia", symbol: "UAH" },
  { code: "TRY", name: "Turkish Lira", symbol: "TRY" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
  { code: "UZS", name: "Uzbekistani Som", symbol: "UZS" },
  { code: "ZAR", name: "South African Rand", symbol: "ZAR" }
];

const FX_REFERENCE_FLAGS = {
  USD: "\u{1F1FA}\u{1F1F8}",
  EUR: "\u{1F1EA}\u{1F1FA}",
  RUB: "\u{1F1F7}\u{1F1FA}"
};

function normalizeCurrency(currency) {
  if (!currency || typeof currency !== "object") {
    return null;
  }

  const code = String(currency.code ?? currency.currency_code ?? "").trim().toUpperCase();

  if (!code) {
    return null;
  }

  const name = String(currency.name ?? currency.currency_name ?? code).trim() || code;
  const symbol = String(currency.symbol ?? currency.currency_symbol ?? "").trim();

  return { code, name, symbol };
}

let blurSnapTimer = null;
let fxCalculatorTimer = null;
let fxCalculatorRequestId = 0;

function isFormTextField(element) {
  if (!element || element.nodeType !== 1) {
    return false;
  }

  const tag = element.tagName;

  if (tag === "TEXTAREA") {
    return true;
  }

  if (tag === "SELECT") {
    return true;
  }

  if (tag !== "INPUT") {
    return false;
  }

  const type = (element.getAttribute("type") || "text").toLowerCase();

  return ![
    "button",
    "submit",
    "reset",
    "hidden",
    "checkbox",
    "radio",
    "file",
    "image"
  ].includes(type);
}

/**
 * Состояние «фокус в поле ввода» для нижней навигации и класса keyboard-open.
 * Плашку «Готово» показываем только пока активно поле суммы (на iPad с числовой
 * раскладкой часто нет клавиши Enter). Закрытие — по «Готово», по Enter или blur.
 */
function syncFxCalcKeyboardAccessory() {
  if (!(fxCalcKeyboardAccessory instanceof HTMLElement)) {
    return;
  }

  const showAmountFocus =
    fxCalcAmountInput instanceof HTMLInputElement && document.activeElement === fxCalcAmountInput;

  fxCalcKeyboardAccessory.hidden = !showAmountFocus;
}

function syncViewportMetrics() {
  document.body.classList.toggle(
    "keyboard-open",
    isFormTextField(document.activeElement)
  );
  syncFxCalcKeyboardAccessory();
}

const BALANCY_HINTS_ENABLED_STORAGE_KEY = "balancyHintsEnabled";
const BALANCY_HINT_DISMISS_SESSION_PREFIX = "balancyHintDismissed_";

function readHintsGloballyEnabled() {
  try {
    const raw = window.localStorage.getItem(BALANCY_HINTS_ENABLED_STORAGE_KEY);
    if (raw === "0") {
      return false;
    }
    if (raw === "1") {
      return true;
    }
    return true;
  } catch {
    return true;
  }
}

function writeHintsGloballyEnabled(on) {
  try {
    window.localStorage.setItem(BALANCY_HINTS_ENABLED_STORAGE_KEY, on ? "1" : "0");
  } catch {
    //
  }
}

function isBalancyHintDismissedThisSession(id) {
  try {
    return window.sessionStorage.getItem(BALANCY_HINT_DISMISS_SESSION_PREFIX + id) === "1";
  } catch {
    return false;
  }
}

function dismissBalancyHintSession(id) {
  try {
    window.sessionStorage.setItem(BALANCY_HINT_DISMISS_SESSION_PREFIX + id, "1");
  } catch {
    //
  }
}

function syncBalancyHintsEnabledToggleUi() {
  const toggle = document.getElementById("balancyHintsEnabledToggle");
  if (toggle instanceof HTMLInputElement) {
    toggle.checked = readHintsGloballyEnabled();
  }
}

function applyBalancyHintsFromState() {
  const globallyOn = readHintsGloballyEnabled();
  syncBalancyHintsEnabledToggleUi();

  const accountsLen = Array.isArray(state.accounts) ? state.accounts.length : 0;
  const categoriesLen = Array.isArray(state.categories) ? state.categories.length : 0;

  document.querySelectorAll("[data-balancy-hint]").forEach((el) => {
    if (!(el instanceof HTMLElement)) {
      return;
    }

    const id = el.getAttribute("data-balancy-hint")?.trim();
    if (!id) {
      return;
    }

    let show = globallyOn && !isBalancyHintDismissedThisSession(id);

    if (id === "homeStart" && accountsLen > 0 && categoriesLen > 0) {
      show = false;
    }

    if ((id === "accountsSwipeTg" || id === "accountsSwipeWeb") && accountsLen === 0) {
      show = false;
    }

    if ((id === "categoriesSwipeTg" || id === "categoriesSwipeWeb") && categoriesLen === 0) {
      show = false;
    }

    el.hidden = !show;
  });
}

function beginGlobalBusy(message = "Загружаем…") {
  const root = document.getElementById("globalBusyOverlay");
  const label = document.getElementById("globalBusyMessage");
  globalBusyDepth += 1;
  if (root) {
    root.hidden = false;
    if (label) {
      label.textContent = message;
    }
    root.setAttribute("aria-busy", "true");
  }
}

function endGlobalBusy() {
  globalBusyDepth = Math.max(0, globalBusyDepth - 1);
  if (globalBusyDepth > 0) {
    return;
  }
  const root = document.getElementById("globalBusyOverlay");
  if (root) {
    root.hidden = true;
    root.removeAttribute("aria-busy");
  }
}

let balancyTgViewportListenersBound = false;

function syncTelegramLayoutViewportVar() {
  if (isWebMode || !tg) {
    return;
  }
  const stable = Number(tg.viewportStableHeight);
  const current = Number(tg.viewportHeight);
  const h =
    Number.isFinite(stable) && stable > 0
      ? stable
      : Number.isFinite(current) && current > 0
        ? current
        : 0;
  if (h > 0) {
    document.documentElement.style.setProperty("--balancy-tg-vh", `${h}px`);
  }
}

function bindTelegramViewportListeners() {
  if (balancyTgViewportListenersBound || isWebMode || !tg) {
    return;
  }
  balancyTgViewportListenersBound = true;
  syncTelegramLayoutViewportVar();
  try {
    if (typeof tg.onEvent === "function") {
      tg.onEvent("viewport_changed", syncTelegramLayoutViewportVar);
    }
  } catch {
    //
  }
  const vv = window.visualViewport;
  if (vv && typeof vv.addEventListener === "function") {
    vv.addEventListener("resize", syncTelegramLayoutViewportVar, { passive: true });
  }
}

let balancyPullRefreshAttached = false;
let balancyEdgeSwipeBackAttached = false;
let webLoginWidgetMounted = false;
let webLoginConfigCache = null;

function attachTelegramPullToRefresh() {
  if (balancyPullRefreshAttached || isWebMode || typeof window === "undefined") {
    return;
  }
  balancyPullRefreshAttached = true;
  let startY = 0;
  let startX = 0;
  let armed = false;
  let pulling = false;
  let ptrGestureVertical = false;
  let pullHapticSent = false;
  /** @type {Element | null} */
  let ptrStartTarget = null;
  let lastPullRefreshAt = 0;
  const COOLDOWN_MS = 2000;
  const THRESH = 132;
  const INDICATOR_MIN_DY = 52;
  const host = document.getElementById("pullRefreshHost");
  const label = document.getElementById("pullRefreshLabel");

  const getDocumentScrollTop = () =>
    window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;

  const hidePullHost = () => {
    if (!host) {
      return;
    }
    host.hidden = true;
    host.classList.remove("pull-refresh-host--ready");
    host.style.transform = "";
    host.setAttribute("aria-hidden", "true");
  };

  const isPageScrollAwayFromTop = () => {
    if (getDocumentScrollTop() > 6) {
      return true;
    }
    const main = document.querySelector("main.tabbed-content");
    if (main && main.scrollTop > 6) {
      return true;
    }
    const active = document.querySelector(".screen.screen-active");
    if (active && active.scrollTop > 6) {
      return true;
    }
    return false;
  };

  const isAnyScrollChainAwayFromTop = (startEl) => {
    if (isPageScrollAwayFromTop()) {
      return true;
    }
    let n = startEl instanceof Element ? startEl : null;
    while (n) {
      if (n.scrollTop > 6) {
        return true;
      }
      n = n.parentElement;
    }
    return false;
  };

  window.addEventListener(
    "touchstart",
    (e) => {
      if (globalBusyDepth > 0) {
        return;
      }
      const t = e.target;
      if (!(t instanceof Element)) {
        return;
      }
      if (t.closest(".entry-type-modal") || t.closest(".help-documentation-modal")) {
        return;
      }
      if (isAnyScrollChainAwayFromTop(t)) {
        return;
      }
      armed = true;
      pulling = false;
      ptrGestureVertical = false;
      pullHapticSent = false;
      ptrStartTarget = t;
      startY = e.touches[0]?.clientY ?? 0;
      startX = e.touches[0]?.clientX ?? 0;
    },
    { passive: true }
  );

  window.addEventListener(
    "touchmove",
    (e) => {
      if (!armed || globalBusyDepth > 0) {
        return;
      }
      if (ptrStartTarget && isAnyScrollChainAwayFromTop(ptrStartTarget)) {
        armed = false;
        ptrStartTarget = null;
        hidePullHost();
        return;
      }
      if (isPageScrollAwayFromTop()) {
        armed = false;
        ptrStartTarget = null;
        hidePullHost();
        return;
      }
      const x = e.touches[0]?.clientX ?? 0;
      const y = e.touches[0]?.clientY ?? 0;
      const dy = y - startY;
      const dx = x - startX;
      if (!ptrGestureVertical && Math.abs(dx) + Math.abs(dy) >= 10) {
        if (Math.abs(dx) > Math.abs(dy) * 1.12) {
          armed = false;
          ptrStartTarget = null;
          hidePullHost();
          return;
        }
        ptrGestureVertical = true;
      }
      if (dy <= 4) {
        return;
      }
      if (dy < INDICATOR_MIN_DY) {
        if (host) {
          host.hidden = true;
          host.classList.remove("pull-refresh-host--ready");
          host.style.transform = "";
        }
        return;
      }
      pulling = true;
      if (host) {
        host.hidden = false;
        host.removeAttribute("aria-hidden");
        const offset = Math.min(52, (dy - INDICATOR_MIN_DY) * 0.42);
        host.style.transform = `translateY(${offset}px)`;
        const ready = dy > THRESH;
        host.classList.toggle("pull-refresh-host--ready", ready);
        if (ready && !pullHapticSent && tg?.HapticFeedback?.impactOccurred) {
          try {
            tg.HapticFeedback.impactOccurred("medium");
          } catch {
            //
          }
          pullHapticSent = true;
        }
      }
      if (label) {
        label.textContent = dy > THRESH ? "Отпустите для обновления" : "Потяните для обновления";
      }
    },
    { passive: true }
  );

  const finish = () => {
    if (!armed) {
      return;
    }
    armed = false;
    ptrStartTarget = null;
    ptrGestureVertical = false;
    pullHapticSent = false;
    let didPull = false;
    if (pulling && host && !host.hidden) {
      const ready = host.classList.contains("pull-refresh-host--ready");
      if (ready && Date.now() - lastPullRefreshAt > COOLDOWN_MS) {
        lastPullRefreshAt = Date.now();
        didPull = true;
        void refreshAppData({
          globalBusy: true,
          busyMessage: "Обновляем данные…",
          syncWebOperationsHistory: true,
          light: true
        });
      }
    }
    pulling = false;
    if (host) {
      host.style.transform = "";
      host.classList.remove("pull-refresh-host--ready");
      if (!didPull) {
        hidePullHost();
      } else {
        window.setTimeout(() => {
          hidePullHost();
        }, 280);
      }
    }
  };

  window.addEventListener("touchend", finish, { passive: true });
  window.addEventListener("touchcancel", finish, { passive: true });
}

function performTelegramGestureBack() {
  if (isWebMode) {
    return false;
  }

  if (helpDocumentationModalElement && !helpDocumentationModalElement.hidden) {
    closeHelpDocumentationModal();
    return true;
  }

  if (entryTypeModalElement && !entryTypeModalElement.hidden) {
    closeEntryTypeModal();
    return true;
  }

  if ((document.body.dataset.appActiveScreen || "") === "transfer") {
    exitTransferScreen();
    return true;
  }

  const cur = document.body.dataset.appActiveScreen || "home";
  if (cur === "home") {
    return false;
  }

  const dest = telegramGestureBackTarget || "home";
  openScreen(dest === cur ? "home" : dest);
  return true;
}

function attachTelegramEdgeSwipeBack() {
  if (balancyEdgeSwipeBackAttached || isWebMode || typeof window === "undefined") {
    return;
  }
  balancyEdgeSwipeBackAttached = true;

  const EDGE = 34;
  const MIN_TRAVEL = 76;
  const MAX_VERTICAL = 120;
  let sx = 0;
  let sy = 0;
  let armed = false;
  let lastFire = 0;

  window.addEventListener(
    "touchstart",
    (e) => {
      if (globalBusyDepth > 0) {
        return;
      }
      const t = e.touches[0];
      if (!t) {
        return;
      }
      if (t.clientX > EDGE) {
        armed = false;
        return;
      }
      armed = true;
      sx = t.clientX;
      sy = t.clientY;
    },
    { passive: true }
  );

  window.addEventListener(
    "touchmove",
    (e) => {
      if (!armed) {
        return;
      }
      const t = e.touches[0];
      if (!t) {
        return;
      }
      const dy = Math.abs(t.clientY - sy);
      const dx = t.clientX - sx;
      if (dy > 48 && dx < 28) {
        armed = false;
      }
    },
    { passive: true }
  );

  window.addEventListener(
    "touchend",
    (e) => {
      if (!armed) {
        return;
      }
      armed = false;
      const t = e.changedTouches[0];
      if (!t) {
        return;
      }
      const dx = t.clientX - sx;
      const dy = Math.abs(t.clientY - sy);
      if (dx < MIN_TRAVEL || dy > MAX_VERTICAL) {
        return;
      }
      if (Date.now() - lastFire < 450) {
        return;
      }
      if (!performTelegramGestureBack()) {
        return;
      }
      lastFire = Date.now();
      try {
        tg?.HapticFeedback?.impactOccurred?.("light");
      } catch {
        //
      }
    },
    { passive: true }
  );

  window.addEventListener(
    "touchcancel",
    () => {
      armed = false;
    },
    { passive: true }
  );
}

function dismissAppSplash(options = {}) {
  const el = document.getElementById("appSplash");

  if (!el || el.dataset.dismissed === "1") {
    return;
  }

  el.dataset.dismissed = "1";
  el.classList.add("app-splash--out");
  el.setAttribute("aria-hidden", "true");
  document.documentElement.classList.remove("balancy-boot-pending");
  document.documentElement.classList.add("balancy-app-ready");

  window.setTimeout(() => {
    if (el.isConnected) {
      el.remove();
    }
  }, options.fast ? 280 : 620);
}

async function dismissAppSplashAfterSuccess() {
  const el = document.getElementById("appSplash");

  if (!el || el.dataset.dismissed === "1") {
    return;
  }

  const minMs = 400;
  const elapsed = Date.now() - balancySplashStartedAt;

  if (elapsed < minMs) {
    await new Promise((resolve) => {
      window.setTimeout(resolve, minMs - elapsed);
    });
  }

  dismissAppSplash({ fast: false });
}

function scheduleScrollFieldIntoView(element) {
  if (!element || typeof element.scrollIntoView !== "function") {
    return;
  }

  const run = () => {
    const useNearest = !isWebMode;
    element.scrollIntoView({
      block: useNearest ? "nearest" : "center",
      behavior: useNearest ? "auto" : "smooth",
      inline: "nearest"
    });
  };

  window.requestAnimationFrame(run);
  window.setTimeout(run, 120);
  window.setTimeout(run, 360);
}

function getAvailableCurrencies() {
  const source = state.currencies.length > 0 ? state.currencies : FALLBACK_CURRENCIES;
  const normalized = source
    .map((currency) => normalizeCurrency(currency))
    .filter(Boolean);

  if (normalized.length === 0) {
    return [...FALLBACK_CURRENCIES];
  }

  const uniqueCurrencies = normalized.filter(
    (currency, index, array) => array.findIndex((item) => item.code === currency.code) === index
  );

  return uniqueCurrencies.sort((a, b) => a.code.localeCompare(b.code, "en"));
}

function safeRenderStep(label, callback) {
  try {
    callback();
  } catch (error) {
    console.error(`UI render failed: ${label}`, error);
  }
}

function getStoredReportingCurrency() {
  try {
    return window.localStorage.getItem("reportingCurrency") ?? "USD";
  } catch {
    return "USD";
  }
}

function setStoredReportingCurrency(currencyCode) {
  try {
    window.localStorage.setItem("reportingCurrency", currencyCode);
  } catch {
    //
  }
}

function currentReportingCurrencySelection() {
  const fromHome = homeReportingCurrencyInput?.value?.trim();
  if (fromHome) {
    return fromHome;
  }

  const fromReport = reportingCurrencyInput?.value?.trim();
  if (fromReport) {
    return fromReport;
  }

  return getStoredReportingCurrency();
}

function selectHasCurrencyCode(selectEl, code) {
  if (!selectEl || !code) {
    return false;
  }

  return Array.from(selectEl.options).some((option) => option.value === code);
}

function syncReportingCurrencyInputs(nextCode) {
  if (!nextCode) {
    return;
  }

  if (selectHasCurrencyCode(reportingCurrencyInput, nextCode)) {
    reportingCurrencyInput.value = nextCode;
  }

  if (selectHasCurrencyCode(homeReportingCurrencyInput, nextCode)) {
    homeReportingCurrencyInput.value = nextCode;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function stripHtmlToSnippet(html) {
  return String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function setStatus(text, type = "muted") {
  if (!statusTextElement) {
    return;
  }

  statusTextElement.textContent = text;
  statusTextElement.className =
    type === "error" ? "inline-error" : type === "success" ? "inline-success" : "muted";
}

function setAccountsStatus(text, type = "muted") {
  if (!accountsStatusTextElement) {
    return;
  }

  accountsStatusTextElement.textContent = text;
  accountsStatusTextElement.className =
    type === "error"
      ? "inline-error form-status"
      : type === "success"
        ? "inline-success form-status"
        : "muted form-status";
}

/** Supabase / JSON иногда отдаёт telegram_user_id строкой — иначе в UI «нет ID». */
function normalizeBootstrapUser(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const u = { ...raw };

  if ("telegram_user_id" in u && u.telegram_user_id != null && typeof u.telegram_user_id !== "number") {
    const n = Number(String(u.telegram_user_id).trim());
    if (Number.isFinite(n)) {
      u.telegram_user_id = n;
    }
  }

  return u;
}

function getTelegramUserIdForDisplay(user) {
  if (!user || typeof user !== "object") {
    return null;
  }

  const tid = user.telegram_user_id;

  if (typeof tid === "number" && Number.isFinite(tid)) {
    return String(tid);
  }

  if (typeof tid === "string" && /^\d+$/.test(tid.trim())) {
    return tid.trim();
  }

  return null;
}

function formatUserDisplayName(user) {
  if (!user || typeof user !== "object") {
    return "Пользователь";
  }

  const name =
    [user.first_name, user.last_name].filter(Boolean).join(" ").trim() ||
    (typeof user.username === "string" && user.username.trim() ? `@${user.username.trim()}` : "");

  if (name) {
    return name;
  }

  const id = getTelegramUserIdForDisplay(user);
  return id ? `Telegram ${id}` : "Пользователь";
}

function syncHomeWelcomeLine(user) {
  if (!homeWelcomeLine) {
    return;
  }

  if (!user || typeof user !== "object") {
    homeWelcomeLine.textContent = "";
    return;
  }

  const first =
    (typeof user.first_name === "string" && user.first_name.trim()) ||
    (typeof user.username === "string" && user.username.trim()) ||
    getTelegramUserIdForDisplay(user) ||
    "друг";

  homeWelcomeLine.textContent = `Добро пожаловать, ${first} 👋`;
}

function formatMoneyAmount(value) {
  const number = Number(value ?? 0);

  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(number);
}

function formatMoney(value, currencyCode = "") {
  const formatted = formatMoneyAmount(value);

  return currencyCode ? `${formatted} ${currencyCode}` : formatted;
}

function formatAmountForNumberInput(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    return "";
  }
  return n.toFixed(2);
}

function clearTransferToAmountIfAutofill(toInput) {
  if (!toInput) {
    return;
  }
  const v = String(toInput.value ?? "").trim();
  if (v && transferToAmountAutofillTag !== null && v === transferToAmountAutofillTag) {
    toInput.value = "";
  }
  transferToAmountAutofillTag = null;
}

function canAutofillTransferToAmount(toInput) {
  const v = String(toInput.value ?? "").trim();
  if (v === "") {
    return true;
  }
  if (transferToAmountAutofillTag !== null && v === transferToAmountAutofillTag) {
    return true;
  }
  return false;
}

function handleTransferToAmountUserInput() {
  if (transferToAmountProgrammatic) {
    return;
  }
  const toInput = document.getElementById("transferToAmountInput");
  if (!toInput) {
    return;
  }
  const v = String(toInput.value ?? "").trim();
  if (v === "") {
    transferToAmountAutofillTag = null;
    scheduleTransferToAmountPreview();
    return;
  }
  if (transferToAmountAutofillTag !== null && v !== transferToAmountAutofillTag) {
    transferToAmountAutofillTag = null;
  }
}

function formatEntryAmountStackHtml(prefix, amount, currencyCode, modifierClass) {
  const amountText = escapeHtml(`${prefix}${formatMoneyAmount(amount)}`);
  const currencyText = escapeHtml(currencyCode || "");

  return `<div class="entry-amount-stack ${modifierClass}">
    <span class="entry-amount-value">${amountText}</span>
    <span class="entry-amount-currency">${currencyText}</span>
  </div>`;
}

function formatTransferAmountStackHtml(transfer) {
  const fromAmount = escapeHtml(formatMoneyAmount(transfer.from_amount));
  const fromCur = escapeHtml(transfer.from_currency_code || "");
  const toAmount = escapeHtml(formatMoneyAmount(transfer.to_amount));
  const toCur = escapeHtml(transfer.to_currency_code || "");

  return `<div class="entry-amount-stack entry-amount-transfer entry-amount-transfer-compact">
    <div class="entry-transfer-inline-row entry-transfer-sum-row">
      <span class="entry-amount-value">${fromAmount}</span>
      <span class="entry-transfer-dash" aria-hidden="true">→</span>
      <span class="entry-amount-value">${toAmount}</span>
    </div>
    <div class="entry-transfer-inline-row entry-transfer-ccy-row">
      <span class="entry-amount-currency">${fromCur}</span>
      <span class="entry-transfer-dash-soft" aria-hidden="true">→</span>
      <span class="entry-amount-currency">${toCur}</span>
    </div>
  </div>`;
}

const ACCOUNT_EDIT_ICON_SVG = `<svg class="icon-action-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="M4 20h4l10.5-10.5a2.12 2.12 0 0 0-3-3L5 17v3Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
  <path d="m13.5 6.5 4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
</svg>`;

const ACCOUNT_DELETE_ICON_SVG = `<svg class="icon-action-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
  <path d="M5 7h14" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
  <path d="M8 7l.9 12.1A2 2 0 0 0 10.9 21h2.2a2 2 0 0 0 2-1.9L16 7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
</svg>`;

function getInitData() {
  const value = tg?.initData ?? window.Telegram?.WebApp?.initData ?? "";
  return typeof value === "string" ? value.trim() : "";
}

async function waitForTelegramInitData(maxMs = 12000, stepMs = 50) {
  const deadline = Date.now() + maxMs;

  while (Date.now() < deadline) {
    const value = getInitData();

    if (value) {
      return value;
    }

    await new Promise((resolve) => {
      window.setTimeout(resolve, stepMs);
    });
  }

  return "";
}

function formatType(type) {
  const labels = {
    cash: "Наличные",
    card: "Карта",
    crypto: "Крипта",
    savings: "Накопления",
    other: "Другое"
  };

  return labels[type] ?? type;
}

function formatKind(kind) {
  return kind === "income" ? "Доход" : "Расход";
}

function getAccountTypeIcon(type) {
  const icons = {
    cash: `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 8.5C4 7.67 4.67 7 5.5 7H18.5C19.33 7 20 7.67 20 8.5V15.5C20 16.33 19.33 17 18.5 17H5.5C4.67 17 4 16.33 4 15.5V8.5Z" stroke="currentColor" stroke-width="1.8"/>
        <path d="M7 12H11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <circle cx="16.5" cy="12" r="1.5" fill="currentColor"/>
      </svg>
    `,
    card: `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3.5" y="6.5" width="17" height="11" rx="2.5" stroke="currentColor" stroke-width="1.8"/>
        <path d="M3.5 10H20.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M7 14H10.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    `,
    crypto: `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 4V20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M8.5 7.5H13.5C15.16 7.5 16.5 8.84 16.5 10.5C16.5 12.16 15.16 13.5 13.5 13.5H8.5H14C15.93 13.5 17.5 15.07 17.5 17C17.5 18.93 15.93 20.5 14 20.5H8.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `,
    savings: `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 10.5C5 8.01 7.01 6 9.5 6H14.5C16.99 6 19 8.01 19 10.5V15.5C19 17.43 17.43 19 15.5 19H8.5C6.57 19 5 17.43 5 15.5V10.5Z" stroke="currentColor" stroke-width="1.8"/>
        <path d="M9 12H15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M12 9V15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    `,
    other: `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="7" stroke="currentColor" stroke-width="1.8"/>
        <path d="M9.5 12H14.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    `
  };

  return icons[type] ?? icons.other;
}

function getEntryIcon(kind) {
  const icons = {
    income: `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 18V6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M8 10L12 6L16 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `,
    expense: `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 6V18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M8 14L12 18L16 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `,
    transfer: `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M6 8H18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M14 4L18 8L14 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M18 16H6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M10 12L6 16L10 20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `
  };

  return icons[kind] ?? icons.transfer;
}

function formatReportPeriod(period) {
  const labels = {
    week: "неделю",
    month: "месяц",
    quarter: "3 месяца",
    year: "год",
    custom: "выбранный период"
  };

  return labels[period] ?? "период";
}

function formatDateTime(value) {
  return new Date(value).toLocaleString("ru-RU");
}

function getCurrentLocalDateTimeValue() {
  const now = new Date();
  const timezoneOffsetInMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - timezoneOffsetInMs).toISOString().slice(0, 16);
}

function getCurrentLocalDateValue() {
  return getCurrentLocalDateTimeValue().slice(0, 10);
}

function toIsoDate(localDateTime) {
  return new Date(localDateTime).toISOString();
}

function toDateRangeStart(dateValue) {
  return `${dateValue}T00:00`;
}

function toDateRangeEnd(dateValue) {
  return `${dateValue}T23:59`;
}

function toggleReportDateInputs() {
  if (!reportPeriodInput || !reportStartDateInput || !reportEndDateInput) {
    return;
  }

  const isCustom = reportPeriodInput.value === "custom";
  reportStartDateInput.disabled = !isCustom;
  reportEndDateInput.disabled = !isCustom;
}

function formatCurrencyOption(currency) {
  return `${currency.code} — ${currency.name}`;
}

function scrollTelegramAppShellToTop() {
  if (isWebMode) {
    return;
  }

  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  const main = document.querySelector("main.tabbed-content");
  if (main instanceof HTMLElement) {
    main.scrollTop = 0;
  }

  document.querySelectorAll(".screen.screen-active").forEach((el) => {
    if (el instanceof HTMLElement) {
      el.scrollTop = 0;
    }
  });

  const opsRoot = document.getElementById("tgOpsActivityRoot");
  if (opsRoot instanceof HTMLElement) {
    opsRoot.scrollTop = 0;
  }
}

/** Прокрутка активного экрана в Telegram так, чтобы якорь оказался у верхнего края (под шапкой). */
function scrollTgContentToElement(element) {
  if (isWebMode || !element || !(element instanceof HTMLElement)) {
    return;
  }

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      const main = document.querySelector("main.tabbed-content");
      if (main instanceof HTMLElement) {
        main.scrollTop = 0;
      }
      document.querySelectorAll(".screen.screen-active").forEach((el) => {
        if (el instanceof HTMLElement) {
          el.scrollTop = 0;
        }
      });
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      element.scrollIntoView({ block: "start", inline: "nearest", behavior: "auto" });
    });
  });
}

function resolveTgGlobalScreenTitle(screenName) {
  if (screenName === "transfer") {
    return WEB_PAGE_TITLES.transfer;
  }

  if (screenName === "reports" && reportTitleElement) {
    const t = (reportTitleElement.textContent ?? "").trim();
    if (t) {
      return t;
    }
  }

  return WEB_PAGE_TITLES[screenName] ?? WEB_PAGE_TITLES.home;
}

function syncTgGlobalScreenChrome(screenName) {
  if (isWebMode || !tgGlobalScreenTitleElement) {
    return;
  }

  tgGlobalScreenTitleElement.textContent = resolveTgGlobalScreenTitle(screenName);
}

function openScreen(screenName) {
  const prevScreen = document.body.dataset.appActiveScreen || "home";
  const nextScreen = screenName || "home";

  document.body.dataset.appActiveScreen = nextScreen;

  screenElements.forEach((screenElement) => {
    const isActive = screenElement.dataset.screen === nextScreen;
    screenElement.classList.toggle("screen-active", isActive);
  });

  navButtons.forEach((button) => {
    const target = button.dataset.openScreen ?? "";
    let active = target === nextScreen;
    if (
      !isWebMode &&
      target === "more" &&
      (nextScreen === "ledger" || nextScreen === "reports" || nextScreen === "instruction" || nextScreen === "settings")
    ) {
      active = true;
    }
    button.classList.toggle("is-active", active);
  });

  document.querySelectorAll("[data-web-nav]").forEach((button) => {
    const nav = button.dataset.webNav ?? "";
    const isActivityOps = nav === "activity" && nextScreen === "activity";
    const isOtherNav = nav !== "activity" && nav === nextScreen;
    button.classList.toggle("is-active", isActivityOps || isOtherNav);
  });

  document.querySelectorAll('[data-web-sidebar-action="transfer"]').forEach((button) => {
    button.classList.toggle("is-active", nextScreen === "transfer");
  });

  if (isWebMode) {
    syncWebPageTitle(nextScreen);
    closeWebNewEntryMenu();
    closeWebNavDrawer();
    if (nextScreen === "activity") {
      syncWebEntryKindCardsFromSelect();
    }
  }

  if (nextScreen === "history") {
    initWebOperationsChrome();
    webOpsOffset = 0;
    void refreshWebOperationsBoard();
  }

  if (nextScreen === "reports") {
    populateReportFilterAccounts();
    if (webReportsBodyEl) {
      webReportsBodyEl.hidden = false;
    }
    void loadReport();
  } else if (webReportsBodyEl) {
    webReportsBodyEl.hidden = true;
    destroyReportCharts();
  }

  if (!isWebMode && nextScreen === "ledger") {
    populateTgActivityFilterSelects();
    ensureTgOpsDefaultDates();
    Object.assign(tgOpsAppliedFilter, readTgOpsFilterFromDom());
    tgOpsFilterSnapshotInitialized = true;
    tgOpsPageOffset = 0;
    void refreshTgOperationsBoard();
  }

  if (!isWebMode && nextScreen === "activity") {
    populateTgActivityFilterSelects();
    syncWebEntryKindCardsFromSelect();
  }

  if (!isWebMode && prevScreen !== nextScreen) {
    const overlayEnter = nextScreen === "transfer";
    if (!overlayEnter) {
      telegramGestureBackTarget = prevScreen;
    }
  }

  if (!isWebMode) {
    syncTgGlobalScreenChrome(nextScreen);
    scrollTelegramAppShellToTop();
  }

  if (isWebMode && nextScreen === "home") {
    window.requestAnimationFrame(() => syncWebDashSparkCharts());
  }

  if (nextScreen === "settings" && state.workspace?.kind === "team") {
    void loadWebTeamSettings();
  }

  applyBalancyHintsFromState();
}

function initWebOperationsChrome() {
  if (!webOpsDateFrom || !webOpsDateTo) {
    return;
  }

  if (!webOpsDatesInitialized) {
    webOpsDatesInitialized = true;
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 6);
    webOpsDateTo.value = end.toISOString().slice(0, 10);
    webOpsDateFrom.value = start.toISOString().slice(0, 10);
  }

  populateWebOperationsFilterSelects();
}

function populateReportFilterAccounts() {
  if (!reportAccountFilterInput) {
    return;
  }

  const previous = reportAccountFilterInput.value;
  const optionsHtml = (state.accounts ?? [])
    .map(
      (account) =>
        `<option value="${escapeHtml(String(account.id))}">${escapeHtml(account.name ?? "")}</option>`
    )
    .join("");

  reportAccountFilterInput.innerHTML = `<option value="">Все счета</option>${optionsHtml}`;

  if (previous && (state.accounts ?? []).some((a) => String(a.id) === previous)) {
    reportAccountFilterInput.value = previous;
  }
}

function populateWebOperationsFilterSelects() {
  if (!webOpsAccountFilter || !webOpsCategoryFilter) {
    return;
  }

  const prevAccount = webOpsAccountFilter.value;
  const prevCategory = webOpsCategoryFilter.value;

  webOpsAccountFilter.innerHTML = `<option value="">Все счета</option>${state.accounts
    .map(
      (account) =>
        `<option value="${escapeHtml(account.id)}">${escapeHtml(account.name)}</option>`
    )
    .join("")}`;

  webOpsCategoryFilter.innerHTML = `<option value="">Все категории</option>${state.categories
    .map(
      (category) =>
        `<option value="${escapeHtml(category.id)}">${escapeHtml(category.name)}</option>`
    )
    .join("")}`;

  if (prevAccount && [...webOpsAccountFilter.options].some((o) => o.value === prevAccount)) {
    webOpsAccountFilter.value = prevAccount;
  }

  if (prevCategory && [...webOpsCategoryFilter.options].some((o) => o.value === prevCategory)) {
    webOpsCategoryFilter.value = prevCategory;
  }
}

function shouldShowOperationAuthor() {
  return state.workspace?.kind === "team";
}

function resolveOperationCreatedByFromApi(row, payload) {
  if (row?.createdBy && typeof row.createdBy === "object") {
    return row.createdBy;
  }

  const embed = payload?.created_by;
  if (embed?.id) {
    const firstName =
      [embed.first_name, embed.last_name].filter(Boolean).join(" ").trim() || null;
    return {
      id: embed.id,
      firstName,
      username: embed.username ?? null
    };
  }

  return null;
}

function formatOperationAuthorLabel(createdBy) {
  if (!createdBy) {
    return "";
  }

  if (createdBy.firstName) {
    return createdBy.firstName;
  }

  if (createdBy.username) {
    return `@${createdBy.username}`;
  }

  return "Участник";
}

function formatOperationAuthorMeta(createdBy, occurredAt) {
  const when = formatDateTime(occurredAt);
  const author = formatOperationAuthorLabel(createdBy);

  if (!shouldShowOperationAuthor() || !author) {
    return when;
  }

  return `${author} · ${when}`;
}

function getWebOpsTableColspan() {
  return shouldShowOperationAuthor() ? 7 : 6;
}

function syncOperationAuthorChrome() {
  document.querySelectorAll(".web-ops-table").forEach((table) => {
    table.classList.toggle("web-ops-table--show-author", shouldShowOperationAuthor());
  });
}

function getWebOpsPageSizeValue() {
  const raw = Number(webOpsPageSize?.value ?? 8);
  if (!Number.isFinite(raw) || raw < 1) {
    return 8;
  }
  return raw;
}

function buildWebOperationsApiUrl() {
  const reportingCurrency = state.summary?.reportingCurrency ?? currentReportingCurrencySelection();
  const params = new URLSearchParams();
  params.set("reportingCurrency", reportingCurrency);
  params.set("scope", "history");

  if (webOpsDateFrom?.value) {
    params.set("from", webOpsDateFrom.value);
  }

  if (webOpsDateTo?.value) {
    params.set("to", webOpsDateTo.value);
  }

  params.set("kind", webOpsKindFilter?.value ?? "all");

  const accountId = webOpsAccountFilter?.value?.trim();
  if (accountId) {
    params.set("accountId", accountId);
  }

  const categoryId = webOpsCategoryFilter?.value?.trim();
  if (categoryId) {
    params.set("categoryId", categoryId);
  }

  const searchQ = webOpsSearchInput?.value?.trim();
  if (searchQ) {
    params.set("q", searchQ);
  }

  params.set("limit", String(getWebOpsPageSizeValue()));
  params.set("offset", String(webOpsOffset));
  return `/api/operations?${params.toString()}`;
}

function buildTgOperationsApiUrl() {
  const reportingCurrency = state.summary?.reportingCurrency ?? currentReportingCurrencySelection();
  const params = new URLSearchParams();
  params.set("reportingCurrency", reportingCurrency);
  params.set("scope", "history");
  const f = tgOpsAppliedFilter;
  if (f.fromY) {
    params.set("from", f.fromY);
  }
  if (f.toY) {
    params.set("to", f.toY);
  }
  params.set("kind", (f.kind || "all").trim() || "all");
  const accId = (f.accId ?? "").trim();
  if (accId) {
    params.set("accountId", accId);
  }
  const catId = (f.catId ?? "").trim();
  if (catId) {
    params.set("categoryId", catId);
  }
  const q = (f.q ?? "").trim();
  if (q) {
    params.set("q", q);
  }
  params.set("limit", String(TG_OPS_PAGE_SIZE));
  params.set("offset", String(tgOpsPageOffset));
  return `/api/operations?${params.toString()}`;
}

function renderWebOperationsFromPayload(payload) {
  if (!webOpsTableBody) {
    return;
  }

  const cur = payload.reportingCurrency ?? "USD";
  const summary = payload.summary ?? {
    operationsCount: 0,
    incomeReporting: 0,
    expenseReporting: 0,
    netReporting: 0
  };

  if (webOpsStatCount) {
    webOpsStatCount.textContent = String(summary.operationsCount);
  }

  if (webOpsStatIncome) {
    webOpsStatIncome.textContent = `+${formatMoney(summary.incomeReporting, cur)}`;
  }

  if (webOpsStatExpense) {
    webOpsStatExpense.textContent = `−${formatMoney(summary.expenseReporting, cur)}`;
  }

  if (webOpsStatNet) {
    const net = Number(summary.netReporting ?? 0);
    const sign = net >= 0 ? "+" : "−";
    webOpsStatNet.textContent = `${sign}${formatMoney(Math.abs(net), cur)}`;
  }

  const items = Array.isArray(payload.items) ? payload.items : [];
  const total = typeof payload.total === "number" ? payload.total : items.length;
  const pageSize = getWebOpsPageSizeValue();

  if (webOpsPageInfo) {
    if (total === 0) {
      webOpsPageInfo.textContent = "Показано 0 из 0";
    } else {
      const from = webOpsOffset + 1;
      const to = webOpsOffset + items.length;
      webOpsPageInfo.textContent = `Показано ${from}–${to} из ${total}`;
    }
  }

  if (webOpsPagePrev) {
    webOpsPagePrev.disabled = webOpsOffset <= 0;
  }

  if (webOpsPageNext) {
    webOpsPageNext.disabled = webOpsOffset + items.length >= total || items.length === 0;
  }

  if (webOpsEmptyHint) {
    webOpsEmptyHint.hidden = items.length > 0;
  }

  if (items.length === 0) {
    webOpsTableBody.innerHTML = "";
    return;
  }

  syncOperationAuthorChrome();
  webOpsTableBody.innerHTML = items.map((row) => buildWebOperationsTableRowHtml(row)).join("");
}

function buildWebOperationsTableRowHtml(row) {
  const createdBy = resolveOperationCreatedByFromApi(
    row,
    row.kind === "entry" ? row.entry : row.transfer
  );
  const authorCell = shouldShowOperationAuthor()
    ? `<td class="web-ops-col-author">${escapeHtml(formatOperationAuthorLabel(createdBy) || "—")}</td>`
    : "";

  if (row.kind === "entry") {
    const e = row.entry;
    const dt = escapeHtml(formatDateTime(e.occurred_at));
    const iconKind = escapeHtml(e.kind);
    const opTitle = escapeHtml(e.category?.name ?? "Без категории");
    const opSub = escapeHtml(formatKind(e.kind));
    const acc = escapeHtml(e.account?.name ?? "Счёт");
    const cat = escapeHtml(e.category?.name ?? "—");
    const cur = escapeHtml(e.currency_code ?? "");
    const isIncome = e.kind === "income";
    const sign = isIncome ? "+" : "−";
    const amtClass = isIncome ? "web-ops-amount-income" : "web-ops-amount-expense";
    const amt = escapeHtml(formatMoneyAmount(e.amount));

    return `<tr>
      <td>${dt}</td>
      <td>
        <div class="web-ops-cell-op">
          <div class="entry-icon entry-icon-${iconKind}">${getEntryIcon(e.kind)}</div>
          <div>
            <div class="web-ops-op-title">${opTitle}</div>
            <div class="web-ops-op-sub">${opSub}</div>
          </div>
        </div>
      </td>
      <td>${acc}</td>
      <td>${cat}</td>
      <td class="web-ops-col-num"><span class="${amtClass}">${sign}${amt}</span></td>
      <td>${cur}</td>
      ${authorCell}
    </tr>`;
  }

  const t = row.transfer;
  const dt = escapeHtml(formatDateTime(t.occurred_at));
  const fromName = escapeHtml(t.from_account?.name ?? "Счёт");
  const toName = escapeHtml(t.to_account?.name ?? "Счёт");
  const acc = `${fromName} → ${toName}`;
  const fromAmt = escapeHtml(formatMoneyAmount(t.from_amount));
  const fromCur = escapeHtml(t.from_currency_code ?? "");

  return `<tr>
    <td>${dt}</td>
    <td>
      <div class="web-ops-cell-op">
        <div class="entry-icon entry-icon-transfer">${getEntryIcon("transfer")}</div>
        <div>
          <div class="web-ops-op-title">Перевод</div>
          <div class="web-ops-op-sub">Между счетами</div>
        </div>
      </div>
    </td>
    <td>${acc}</td>
    <td>—</td>
    <td class="web-ops-col-num"><span class="web-ops-amount-transfer">−${fromAmt}</span></td>
    <td>${fromCur}</td>
    ${authorCell}
  </tr>`;
}

async function refreshWebOperationsBoard() {
  if (!webOperationsRoot || !webOpsTableBody) {
    return;
  }

  if (document.body.dataset.appActiveScreen !== "history") {
    return;
  }

  webOpsTableBody.innerHTML = `<tr><td colspan="${getWebOpsTableColspan()}" class="muted">Загрузка…</td></tr>`;
  if (webOpsEmptyHint) {
    webOpsEmptyHint.hidden = true;
  }

  try {
    const payload = await apiFetch(buildWebOperationsApiUrl());
    state.webOperationsLastPayload = payload;
    renderWebOperationsFromPayload(payload);
  } catch (error) {
    console.error(error);
    webOpsTableBody.innerHTML = `<tr><td colspan="${getWebOpsTableColspan()}" class="inline-error">${escapeHtml(
      error instanceof Error ? error.message : "Не удалось загрузить операции"
    )}</td></tr>`;
  }
}

function openEntryTypeModal() {
  if (entryTypeModalElement) {
    entryTypeModalElement.hidden = false;
  }
}

function closeEntryTypeModal() {
  if (entryTypeModalElement) {
    entryTypeModalElement.hidden = true;
  }
}

function openHelpDocumentationModal() {
  if (!helpDocumentationModalElement) {
    return;
  }

  closeEntryTypeModal();
  helpDocumentationModalElement.hidden = false;
}

function closeHelpDocumentationModal() {
  if (!helpDocumentationModalElement) {
    return;
  }

  helpDocumentationModalElement.hidden = true;
}

function openEntryScreenForKind(kind) {
  closeEntryTypeModal();
  openScreen("activity");
  if (!entryKindInput) {
    return;
  }

  entryKindInput.value = kind;
  populateCategoryOptions();
  syncWebEntryKindCardsFromSelect();

  const activityTop =
    document.querySelector("#screen-activity .web-activity-compose") ?? document.getElementById("screen-activity");

  if (isWebMode) {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (activityTop instanceof HTMLElement) {
          activityTop.scrollIntoView({ block: "start", behavior: "auto" });
        } else {
          document.getElementById("entryForm")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });
    return;
  }

  const tgScrollAnchor =
    activityTop instanceof HTMLElement ? activityTop : document.getElementById("screen-activity");
  scrollTgContentToElement(tgScrollAnchor instanceof HTMLElement ? tgScrollAnchor : null);
}

function resetAccountForm() {
  state.editingAccountId = null;
  accountForm.reset();
  document.getElementById("typeInput").value = "cash";
  populateCurrencyOptions();
  if (currencyInput.querySelector('option[value="USD"]')) {
    currencyInput.value = "USD";
  }
  clearWebAccountAccentSelection();
  const desc = document.getElementById("accountDescriptionInput");
  if (desc instanceof HTMLTextAreaElement) {
    desc.value = "";
  }
  applyAccountIconKeyToForm(DEFAULT_ACCOUNT_ICON_KEY);
  setAccountsStatus("");
  syncAccountFormTitles();
  syncAccountPreview();
}

function startAccountEdit(accountId) {
  collapseSwipeRowsExcept(null);

  const account = state.accounts.find((item) => item.id === accountId);

  if (!account) {
    setAccountsStatus("Счет не найден.", "error");
    return;
  }

  state.editingAccountId = account.id;
  document.getElementById("nameInput").value = account.name;
  document.getElementById("typeInput").value = account.type;
  populateCurrencyOptions();
  currencyInput.value = account.currency_code;
  document.getElementById("balanceInput").value = String(account.balance);
  applyAccentSwatchesForAccountId(account.id);
  const meta = readAccountUiMeta(account.id);
  const descEl = document.getElementById("accountDescriptionInput");
  if (descEl instanceof HTMLTextAreaElement) {
    descEl.value = meta.description || "";
  }
  applyAccountIconKeyToForm(meta.iconKey || defaultAccountIconKeyForType(account.type));
  syncAccountFormTitles();
  syncAccountPreview();
  setAccountsStatus("Режим редактирования: измените данные ниже и нажмите «Сохранить изменения».", "success");
  openScreen("accounts");

  if (isWebMode) {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        accountForm?.scrollIntoView({ behavior: "smooth", block: "start" });
        window.setTimeout(() => {
          document.getElementById("nameInput")?.focus({ preventScroll: true });
        }, 320);
      });
    });
    return;
  }

  const anchor = document.getElementById("accountFormTitle");
  scrollTgContentToElement(anchor instanceof HTMLElement ? anchor : accountForm);
  window.setTimeout(() => {
    document.getElementById("nameInput")?.focus({ preventScroll: true });
  }, 160);
}

function syncWebPageTitle(screenName) {
  if (!isWebMode || !webPageTitleElement) {
    return;
  }

  const key = screenName || "home";

  if (key === "transfer") {
    webPageTitleElement.textContent = WEB_PAGE_TITLES.transfer ?? "Перевод между счетами";
    if (webPageSubtitleElement) {
      const transferSubtitle = "Переведите средства с одного счёта на другой.";
      if (webPageSubtitleFullElement) {
        webPageSubtitleFullElement.textContent = transferSubtitle;
      }
      if (webPageSubtitleCompactElement) {
        webPageSubtitleCompactElement.textContent = "Перевод между счетами.";
      }
      webPageSubtitleElement.hidden = false;
      webPageSubtitleElement.classList.remove("web-page-subtitle--empty");
      webPageSubtitleElement.removeAttribute("aria-hidden");
    }
    return;
  }

  webPageTitleElement.textContent = WEB_PAGE_TITLES[key] ?? "Balancy";

  if (!webPageSubtitleElement) {
    return;
  }

  const subtitleByScreen = {
    home: "Баланс по счетам, доходы и расходы за месяц, последние операции.",
    activity: "Создайте новую операцию дохода или расхода.",
    ledger: "Лента операций: фильтры по датам, типу, счёту и категории, затем «Показать».",
    history: "Лента операций: фильтры по датам, типу, счёту и категории, затем «Показать».",
    instruction: "Пошаговое руководство по веб-версии: меню, операции, переводы и отчёты.",
    reports: "Сводка за период, графики и выгрузка CSV в валюте отчёта.",
    categories: "Создавайте, редактируйте и управляйте категориями доходов и расходов.",
    accounts: "Управляйте своими счетами: создавайте, редактируйте и удаляйте.",
    settings: "Подсказки и отображение советов в интерфейсе."
  };
  const subtitleCompactByScreen = {
    home: "Баланс и операции за месяц.",
    activity: "Новая операция.",
    ledger: "Фильтры и лента операций.",
    history: "Фильтры и лента операций.",
    instruction: "Как пользоваться веб-версией.",
    reports: "Сводка и графики за период.",
    categories: "Категории доходов и расходов.",
    accounts: "Счета и балансы.",
    settings: "Настройки приложения."
  };
  const subtitle = subtitleByScreen[key];
  const subtitleCompact = subtitleCompactByScreen[key] ?? subtitle;

  if (subtitle) {
    if (webPageSubtitleFullElement) {
      webPageSubtitleFullElement.textContent = subtitle;
    }
    if (webPageSubtitleCompactElement) {
      webPageSubtitleCompactElement.textContent = subtitleCompact;
    }
    webPageSubtitleElement.hidden = false;
    webPageSubtitleElement.classList.remove("web-page-subtitle--empty");
    webPageSubtitleElement.removeAttribute("aria-hidden");
  } else {
    if (webPageSubtitleFullElement) {
      webPageSubtitleFullElement.textContent = "";
    }
    if (webPageSubtitleCompactElement) {
      webPageSubtitleCompactElement.textContent = "";
    }
    webPageSubtitleElement.hidden = false;
    webPageSubtitleElement.classList.add("web-page-subtitle--empty");
    webPageSubtitleElement.setAttribute("aria-hidden", "true");
  }
}

function syncWebEntryKindCardsFromSelect() {
  if (!entryKindInput) {
    return;
  }

  const kind = entryKindInput.value ?? "expense";

  document.querySelectorAll("[data-web-set-entry-kind]").forEach((button) => {
    const cardKind = button.dataset.webSetEntryKind;
    const selected = cardKind === kind;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", selected ? "true" : "false");
  });
}

function readEntryAccountCurrency() {
  const opt = entryAccountInput?.selectedOptions?.[0];
  const raw = opt?.getAttribute("data-currency") ?? opt?.dataset?.currency ?? "";
  return String(raw).trim().toUpperCase();
}

function readEntryOperationCurrency() {
  return String(entryCurrencyInput?.value ?? "").trim().toUpperCase();
}

function syncEntryCurrencyFromAccount(forceAccountCurrency = false) {
  if (!entryCurrencyInput) {
    return;
  }

  const accountCurrency = readEntryAccountCurrency();
  if (!accountCurrency) {
    if (entryCurrencyHint) {
      entryCurrencyHint.hidden = true;
      entryCurrencyHint.textContent = "";
    }
    return;
  }

  if (forceAccountCurrency || !entryCurrencyInput.value) {
    entryCurrencyInput.value = accountCurrency;
  }

  syncEntryCurrencyHint();
}

function syncEntryCurrencyHint() {
  if (!entryCurrencyHint || !entryCurrencyInput) {
    return;
  }

  const accountCurrency = readEntryAccountCurrency();
  const opCurrency = (entryCurrencyInput.value ?? "").trim().toUpperCase();

  if (!accountCurrency || !opCurrency || accountCurrency === opCurrency) {
    entryCurrencyHint.hidden = true;
    entryCurrencyHint.textContent = "";
    return;
  }

  entryCurrencyHint.hidden = false;
  entryCurrencyHint.textContent = `Сумма в ${opCurrency}; на счёт (${accountCurrency}) будет зачислено по текущему курсу.`;
}

function populateEntryCurrencyOptions() {
  if (!entryCurrencyInput) {
    return;
  }

  const filteredCurrencies = getAvailableCurrencies();
  const previous = entryCurrencyInput.value;

  if (filteredCurrencies.length === 0) {
    entryCurrencyInput.innerHTML = `<option value="">Валюты недоступны</option>`;
    return;
  }

  entryCurrencyInput.innerHTML = filteredCurrencies
    .map(
      (currency) =>
        `<option value="${escapeHtml(currency.code)}">${escapeHtml(formatCurrencyOption(currency))}</option>`
    )
    .join("");

  const accountCurrency = readEntryAccountCurrency();
  if (previous && filteredCurrencies.some((c) => c.code === previous)) {
    entryCurrencyInput.value = previous;
  } else if (accountCurrency && filteredCurrencies.some((c) => c.code === accountCurrency)) {
    entryCurrencyInput.value = accountCurrency;
  } else if (filteredCurrencies.some((c) => c.code === "USD")) {
    entryCurrencyInput.value = "USD";
  } else {
    entryCurrencyInput.value = filteredCurrencies[0].code;
  }

  syncEntryCurrencyHint();
}

function resetEntryFormToDefaults() {
  if (!entryForm || !entryKindInput || !entryDateInput) {
    return;
  }

  entryForm.reset();
  entryKindInput.value = "expense";
  entryDateInput.value = getCurrentLocalDateTimeValue();
  populateCategoryOptions();
  populateEntryCurrencyOptions();
  syncEntryCurrencyFromAccount(true);
  syncWebEntryKindCardsFromSelect();
}

const WEB_DASH_SPARK_DAY_COUNT = 7;
const WEB_DASH_SPARK_SLOTS_PER_DAY = 6;

const WEB_DASH_SPARK_SLOT_WEIGHTS = [0.1, 0.14, 0.2, 0.22, 0.18, 0.16];

function pickWebDashSparkDays(dailySeries, dayCount = WEB_DASH_SPARK_DAY_COUNT) {
  const series = Array.isArray(dailySeries) ? dailySeries : [];
  if (series.length === 0) {
    return [];
  }
  return series.slice(-dayCount);
}

function emptySparkSlotRow() {
  return Array.from({ length: WEB_DASH_SPARK_SLOTS_PER_DAY }, () => 0);
}

function distributeDailyAmountToSparkSlots(total) {
  const amount = Math.max(0, Number(total) || 0);
  if (amount <= 0) {
    return emptySparkSlotRow();
  }

  return WEB_DASH_SPARK_SLOT_WEIGHTS.map((weight) => Number((amount * weight).toFixed(2)));
}

function buildFallbackSparkLast7Days(dailySeries) {
  const days = pickWebDashSparkDays(dailySeries, WEB_DASH_SPARK_DAY_COUNT);
  const dates = [];

  for (let i = 0; i < WEB_DASH_SPARK_DAY_COUNT; i += 1) {
    dates.push(days[i]?.date ?? "");
  }

  return {
    dates,
    income: dates.map((_, index) => distributeDailyAmountToSparkSlots(days[index]?.income ?? 0)),
    expense: dates.map((_, index) => distributeDailyAmountToSparkSlots(days[index]?.expense ?? 0)),
    net: dates.map((_, index) => {
      const inc = Number(days[index]?.income ?? 0);
      const exp = Number(days[index]?.expense ?? 0);
      return distributeDailyAmountToSparkSlots(inc - exp);
    }),
    operationCount: dates.map(() => emptySparkSlotRow())
  };
}

function resolveWebDashSparkData() {
  const spark = state.report?.sparkLast7Days;
  if (spark?.dates?.length) {
    return spark;
  }

  return buildFallbackSparkLast7Days(state.report?.dailySeries ?? []);
}

function renderWebDashSparkChart(container, spark, mode) {
  if (!container) {
    return;
  }

  const valueGrid =
    mode === "income" ? spark.income : mode === "expense" ? spark.expense : spark.net;
  const countGrid = spark.operationCount ?? [];

  const allScores = [];

  for (let dayIndex = 0; dayIndex < WEB_DASH_SPARK_DAY_COUNT; dayIndex += 1) {
    for (let slotIndex = 0; slotIndex < WEB_DASH_SPARK_SLOTS_PER_DAY; slotIndex += 1) {
      const raw = Number(valueGrid[dayIndex]?.[slotIndex] ?? 0);
      const count = Number(countGrid[dayIndex]?.[slotIndex] ?? 0);
      const amount = mode === "net" ? Math.abs(raw) : Math.max(0, raw);
      allScores.push(amount * (1 + count * 0.12));
    }
  }

  const max = Math.max(...allScores, 0.0001);
  const hasData = allScores.some((value) => value > 0.0001);
  container.classList.toggle("web-dash-spark--empty", !hasData);

  const chartHeightPx = 50;
  const barsHtml = [];

  for (let dayIndex = 0; dayIndex < WEB_DASH_SPARK_DAY_COUNT; dayIndex += 1) {
    for (let slotIndex = 0; slotIndex < WEB_DASH_SPARK_SLOTS_PER_DAY; slotIndex += 1) {
      const raw = Number(valueGrid[dayIndex]?.[slotIndex] ?? 0);
      const count = Number(countGrid[dayIndex]?.[slotIndex] ?? 0);
      const amount = mode === "net" ? Math.abs(raw) : Math.max(0, raw);
      const score = amount * (1 + count * 0.12);
      const heightPx = hasData ? Math.round(5 + (score / max) * chartHeightPx) : 5;
      const negClass = mode === "net" && raw < 0 ? " web-dash-spark-bar--negative" : "";
      const isChartEdge =
        (dayIndex === 0 && slotIndex === 0) ||
        (dayIndex === WEB_DASH_SPARK_DAY_COUNT - 1 &&
          slotIndex === WEB_DASH_SPARK_SLOTS_PER_DAY - 1);
      const fadeClass = isChartEdge ? " web-dash-spark-bar--chart-edge" : "";

      barsHtml.push(
        `<span class="web-dash-spark-bar web-dash-spark-bar--slot-${slotIndex}${negClass}${fadeClass}" style="height:${heightPx}px"></span>`
      );
    }
  }

  container.innerHTML = `<\u0064iv class="web-dash-spark-chart">${barsHtml.join("")}</\u0064iv>`;
}

function syncWebDashSparkCharts() {
  if (!isWebMode) {
    return;
  }

  const spark = resolveWebDashSparkData();
  renderWebDashSparkChart(document.querySelector(".web-dash-spark-income"), spark, "income");
  renderWebDashSparkChart(document.querySelector(".web-dash-spark-expense"), spark, "expense");
  renderWebDashSparkChart(document.querySelector(".web-dash-spark-net"), spark, "net");
}

function renderWebDesktopDashboard(summary) {
  if (!isWebMode) {
    return;
  }

  const reportingCurrency = summary?.reportingCurrency ?? "";
  const monthlyIncome = Number(summary?.monthlyIncome ?? 0);
  const monthlyExpense = Number(summary?.monthlyExpense ?? 0);
  const monthlyNetRaw =
    summary?.monthlyNet !== undefined && summary?.monthlyNet !== null
      ? Number(summary.monthlyNet)
      : monthlyIncome - monthlyExpense;

  const incEl = document.getElementById("webDashIncomeValue");
  const expEl = document.getElementById("webDashExpenseValue");
  const netEl = document.getElementById("webDashNetValue");

  if (incEl) {
    incEl.textContent = `+${formatMoney(monthlyIncome, reportingCurrency)}`;
  }

  if (expEl) {
    expEl.textContent = `−${formatMoney(monthlyExpense, reportingCurrency)}`;
  }

  if (netEl) {
    const sign = monthlyNetRaw >= 0 ? "+" : "−";
    const absVal = Math.abs(monthlyNetRaw);
    netEl.textContent = `${sign}${formatMoney(absVal, reportingCurrency)}`;
  }

  const sumFlow = monthlyIncome + monthlyExpense;
  const expensePct = sumFlow > 0 ? Math.round((monthlyExpense / sumFlow) * 100) : 0;
  const incomePct = sumFlow > 0 ? Math.round((monthlyIncome / sumFlow) * 100) : 0;
  const expBar = document.getElementById("webDashPlanExpenseBar");
  const incBar = document.getElementById("webDashPlanIncomeBar");
  const expPctEl = document.getElementById("webDashPlanExpensePct");
  const incPctEl = document.getElementById("webDashPlanIncomePct");

  if (expBar) {
    expBar.style.width = `${expensePct}%`;
  }

  if (incBar) {
    incBar.style.width = `${incomePct}%`;
  }

  if (expPctEl) {
    expPctEl.textContent = `${expensePct}%`;
  }

  if (incPctEl) {
    incPctEl.textContent = `${incomePct}%`;
  }

  const visual = document.getElementById("webHomeDonutVisual");
  const legend = document.getElementById("webHomeDonutLegend");

  if (document.body.dataset.appActiveScreen === "home") {
    syncWebDashSparkCharts();
  }

  if (!visual || !legend) {
    return;
  }

  const rows = summary?.monthlyExpenseByCategory ?? [];
  const colors = ["#0d9f6e", "#6366f1", "#f97316", "#ec4899", "#14b8a6", "#94a3b8", "#eab308"];

  if (rows.length === 0 || monthlyExpense <= 0) {
    visual.style.background = "#e2e8f0";
    legend.innerHTML = `<span class="muted">Нет расходов за текущий месяц.</span>`;
    return;
  }

  const total = rows.reduce((sum, row) => sum + Number(row.total ?? 0), 0) || 1;
  let cursor = 0;
  const parts = rows.map((row, index) => {
    const sweep = (Number(row.total) / total) * 360;
    const start = cursor;
    cursor += sweep;
    const color = colors[index % colors.length];

    return `${color} ${start}deg ${cursor}deg`;
  });

  visual.style.background = `conic-gradient(${parts.join(", ")})`;

  const topRows = rows.slice(0, 6);
  legend.innerHTML = topRows
    .map((row, index) => {
      const currencyCode = row.currencyCode || reportingCurrency;
      const amt = formatMoney(row.total, currencyCode);
      const dot = colors[index % colors.length];

      return `<div class="web-donut-legend-row"><span style="display:flex;align-items:center;gap:8px;min-width:0"><span class="web-donut-dot" style="background:${escapeHtml(dot)}"></span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(row.categoryName)}</span></span><span style="flex-shrink:0">${escapeHtml(amt)}</span></div>`;
    })
    .join("");
}

function renderSummary(summary) {
  if (
    !categoriesCountElement ||
    !monthlyIncomeElement ||
    !monthlyExpenseElement ||
    !monthlyIncomeInlineElement ||
    !totalBalanceConvertedElement
  ) {
    return;
  }

  categoriesCountElement.textContent = String(summary?.categoriesCount ?? 0);
  monthlyIncomeElement.textContent = formatMoney(summary?.monthlyIncome ?? 0, summary?.reportingCurrency ?? "");
  monthlyExpenseElement.textContent = formatMoney(summary?.monthlyExpense ?? 0, summary?.reportingCurrency ?? "");
  monthlyIncomeInlineElement.textContent = `+${formatMoney(
    summary?.monthlyIncome ?? 0,
    summary?.reportingCurrency ?? ""
  )}`;
  totalBalanceConvertedElement.textContent = formatMoney(
    summary?.totalBalanceConverted ?? 0,
    summary?.reportingCurrency ?? ""
  );
  syncReportingCurrencyInputs(summary?.reportingCurrency ?? "");
  if (ratesStatusTextElement) {
    ratesStatusTextElement.textContent = summary?.ratesUpdatedAt
      ? `Курсы обновлены: ${formatDateTime(summary.ratesUpdatedAt)}`
      : "Курсы валют еще не синхронизированы";
  }

  renderWebDesktopDashboard(summary);

  const balances = Object.entries(summary?.balancesByCurrency ?? {});

  if (homeBalancesByCurrencyListWebElement || homeBalancesByCurrencyListTgElement) {
    const emptyMarkup = `<p class="currency-breakdown-empty muted">Нет остатков по валютам — добавьте счета.</p>`;
    let balancesMarkup = emptyMarkup;

    if (balances.length > 0) {
      const sortedBalances = [...balances].sort(([a], [b]) => a.localeCompare(b, "en"));
      balancesMarkup = sortedBalances
        .map(
          ([currencyCode, amount]) =>
            `<div class="currency-mini-pill">${escapeHtml(formatMoney(amount, currencyCode))}</div>`
        )
        .join("");
    }

    if (homeBalancesByCurrencyListWebElement) {
      homeBalancesByCurrencyListWebElement.innerHTML = balancesMarkup;
    }

    if (homeBalancesByCurrencyListTgElement) {
      homeBalancesByCurrencyListTgElement.innerHTML = balancesMarkup;
    }
  }

  syncTgOpsStatsFromSummary(summary);
}

function renderAccountsList(targetElement, accounts, emptyDescription) {
  if (!targetElement) {
    return;
  }

  if (accounts.length === 0) {
    if (isWebMode && targetElement === accountsListElement) {
      targetElement.innerHTML = `
        <div class="web-accounts-cards-grid">
          <div class="empty-state">
            <strong>Пока нет счетов</strong>
            <p class="account-meta">${escapeHtml(emptyDescription)}</p>
          </div>
        </div>
      `;
    } else {
      targetElement.innerHTML = `
        <div class="empty-state">
          <strong>Пока нет счетов</strong>
          <p class="account-meta">${escapeHtml(emptyDescription)}</p>
        </div>
      `;
    }
    return;
  }

  if (isWebMode && targetElement === accountsListElement) {
    targetElement.innerHTML = `<div class="web-accounts-cards-grid">${accounts
      .map((account) => {
        const accent = resolveAccountCardAccent(account);
        const accentEsc = escapeHtml(accent);
        const curLine = escapeHtml(formatCurrencyLineFromCode(account.currency_code));
        const bal = escapeHtml(formatMoney(account.balance, account.currency_code));
        return `<article class="web-account-card" data-account-id="${escapeHtml(account.id)}">
          <div class="web-account-card-top">
            <div class="web-account-card-icon" style="background-color:${accentEsc}" aria-hidden="true">${formatAccountLeadingGlyphHtml(
                account
              )}</div>
            <div class="web-account-card-names">
              <div class="web-account-card-title-line">${escapeHtml(account.name)} · ${escapeHtml(
                account.currency_code
              )}</div>
              <div class="web-account-card-meta muted">${escapeHtml(formatType(account.type))} · ${curLine}</div>
            </div>
          </div>
          <div class="web-account-card-bottom">
            <div>
              <div class="web-account-balance-label muted">Баланс</div>
              <div class="web-account-balance-big">${bal}</div>
            </div>
            <div class="web-account-card-actions">
              <button class="web-categories-icon-btn" type="button" data-account-edit-id="${escapeHtml(
                account.id
              )}" title="Редактировать" aria-label="Редактировать счёт">${ACCOUNT_EDIT_ICON_SVG}</button>
              <button class="web-categories-icon-btn web-categories-icon-btn--danger" type="button" data-account-delete-id="${escapeHtml(
                account.id
              )}" title="Удалить" aria-label="Удалить счёт">${ACCOUNT_DELETE_ICON_SVG}</button>
            </div>
          </div>
        </article>`;
      })
      .join("")}</div>`;
    return;
  }

  targetElement.innerHTML = accounts
    .map(
      (account) =>
        `${
          targetElement === accountsListElement
            ? `
        <article class="account-item swipe-row">
          <div class="swipe-row-actions" aria-hidden="true">
            <button class="icon-action-button" data-account-edit-id="${escapeHtml(account.id)}" type="button" title="Редактировать" aria-label="Редактировать счет">
              ${ACCOUNT_EDIT_ICON_SVG}
            </button>
            <button class="icon-action-button icon-action-button-danger" data-account-delete-id="${escapeHtml(account.id)}" type="button" title="Удалить" aria-label="Удалить счет">
              ${ACCOUNT_DELETE_ICON_SVG}
            </button>
          </div>
          <div class="swipe-row-sheet">
            <div class="account-item-header">
              <div class="item-leading">
                <div class="account-icon account-icon-tg-tile" style="background-color:${escapeHtml(
                  resolveAccountCardAccent(account)
                )}">${formatAccountLeadingGlyphHtml(account)}</div>
                <div class="item-copy">
                  <div class="account-name">${escapeHtml(account.name)} · ${escapeHtml(account.currency_code)}</div>
                  <div class="account-meta">${escapeHtml(formatType(account.type))} · ${escapeHtml(
                  formatCurrencyLineFromCode(account.currency_code)
                )}</div>
                </div>
              </div>
              <div class="account-balance-stack" aria-label="Баланс">
                <span class="account-balance-value">${escapeHtml(formatMoneyAmount(account.balance))}</span>
                <span class="account-balance-currency">${escapeHtml(account.currency_code)}</span>
              </div>
            </div>
          </div>
        </article>`
            : `
        <article class="account-item">
          <div class="account-item-header">
            <div class="item-leading">
              <div class="account-icon account-icon-tg-tile" style="background-color:${escapeHtml(
                resolveAccountCardAccent(account)
              )}">${formatAccountLeadingGlyphHtml(account)}</div>
              <div class="item-copy">
                <div class="account-name">${escapeHtml(account.name)} · ${escapeHtml(account.currency_code)}</div>
                <div class="account-meta">${escapeHtml(formatType(account.type))} · ${escapeHtml(
                formatCurrencyLineFromCode(account.currency_code)
              )}</div>
              </div>
            </div>
            <div class="account-balance-stack" aria-label="Баланс">
              <span class="account-balance-value">${escapeHtml(formatMoneyAmount(account.balance))}</span>
              <span class="account-balance-currency">${escapeHtml(account.currency_code)}</span>
            </div>
          </div>
        </article>`
        }`
    )
    .join("");
}

function collapseSwipeRowsExcept(exceptRow) {
  document.querySelectorAll(".swipe-row").forEach((row) => {
    if (exceptRow && row === exceptRow) {
      return;
    }

    const sheet = row.querySelector(".swipe-row-sheet");

    if (sheet instanceof HTMLElement) {
      sheet.style.transform = "";
      sheet.classList.remove("is-dragging");
    }

    row.classList.remove("swipe-row--revealed");
    row.querySelector(".swipe-row-actions")?.setAttribute("aria-hidden", "true");
  });
}

let swipeRowHandlersInstalled = false;

function attachSwipeRowHandlers() {
  if (swipeRowHandlersInstalled || !swipeDelegationRoot) {
    return;
  }

  swipeRowHandlersInstalled = true;

  let activePointerId = null;
  let activeSheet = null;
  let activeRow = null;
  let startX = 0;
  let startY = 0;
  let startTranslate = 0;
  let axis = /** @type {null | "h"} */ (null);

  function readRevealPx() {
    const raw = getComputedStyle(document.documentElement).getPropertyValue("--swipe-row-reveal").trim();
    const n = parseFloat(raw);

    return Number.isFinite(n) ? n : 112;
  }

  function parseTranslateX(sheet) {
    const m = (sheet.style.transform || "").match(/translateX\((-?\d+(?:\.\d+)?)px\)/);

    return m ? Number(m[1]) : 0;
  }

  function applyTranslate(sheet, row, x) {
    const R = readRevealPx();
    const clamped = Math.max(-R, Math.min(0, x));

    sheet.style.transform = clamped === 0 ? "" : `translateX(${clamped}px)`;

    const revealed = clamped <= -R * 0.38;

    row.classList.toggle("swipe-row--revealed", revealed);
    row.querySelector(".swipe-row-actions")?.setAttribute("aria-hidden", revealed ? "false" : "true");
  }

  function cleanupTracking() {
    if (activeSheet) {
      activeSheet.classList.remove("is-dragging");
    }

    activePointerId = null;
    activeSheet = null;
    activeRow = null;
    axis = null;
    startTranslate = 0;
  }

  function finishSwipe(event) {
    if (
      activePointerId === null ||
      event.pointerId !== activePointerId ||
      !activeSheet ||
      !activeRow
    ) {
      return;
    }

    activeSheet.classList.remove("is-dragging");

    try {
      activeSheet.releasePointerCapture(event.pointerId);
    } catch (_) {
      //
    }

    const R = readRevealPx();
    const cur = parseTranslateX(activeSheet);
    const travelled = Math.abs(event.clientX - startX) + Math.abs(event.clientY - startY);

    if (axis === "h") {
      applyTranslate(activeSheet, activeRow, Math.abs(cur) < R * 0.42 ? 0 : -R);
    } else if (travelled < 14 && Math.abs(startTranslate) > 8) {
      applyTranslate(activeSheet, activeRow, 0);
    }

    cleanupTracking();
  }

  swipeDelegationRoot.addEventListener("pointerdown", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    const actionHost = event.target.closest(
      "[data-account-edit-id],[data-account-delete-id],[data-category-edit-id],[data-category-delete-id]"
    );

    if (actionHost?.closest(".swipe-row-actions")) {
      return;
    }

    const row = event.target.closest(".swipe-row");
    const sheet = row?.querySelector(".swipe-row-sheet");

    if (!(row instanceof HTMLElement) || !(sheet instanceof HTMLElement)) {
      return;
    }

    if (!swipeDelegationRoot.contains(row)) {
      return;
    }

    collapseSwipeRowsExcept(row);

    activePointerId = event.pointerId;
    activeRow = row;
    activeSheet = sheet;
    startX = event.clientX;
    startY = event.clientY;
    startTranslate = parseTranslateX(sheet);
    axis = null;
  });

  swipeDelegationRoot.addEventListener(
    "pointermove",
    (event) => {
      if (
        activePointerId === null ||
        event.pointerId !== activePointerId ||
        !activeSheet ||
        !activeRow
      ) {
        return;
      }

      const dx = event.clientX - startX;
      const dy = event.clientY - startY;

      if (axis === null) {
        if (Math.abs(dx) + Math.abs(dy) < 8) {
          return;
        }

        if (Math.abs(dy) > Math.abs(dx) * 1.18) {
          cleanupTracking();
          return;
        }

        axis = "h";
        activeSheet.classList.add("is-dragging");

        try {
          activeSheet.setPointerCapture(event.pointerId);
        } catch (_) {
          //
        }
      }

      if (axis !== "h") {
        return;
      }

      event.preventDefault();

      applyTranslate(activeSheet, activeRow, startTranslate + dx);
    },
    { passive: false }
  );

  swipeDelegationRoot.addEventListener("pointerup", finishSwipe);

  swipeDelegationRoot.addEventListener("pointercancel", finishSwipe);

  swipeDelegationRoot.addEventListener(
    "pointerleave",
    (event) => {
      if (
        activePointerId === null ||
        event.pointerId !== activePointerId ||
        !activeSheet ||
        !(event.pointerType === "mouse")
      ) {
        return;
      }

      finishSwipe(event);
    },
    true
  );

  document.addEventListener("pointerdown", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    if (event.target.closest(".swipe-row")) {
      return;
    }

    collapseSwipeRowsExcept(null);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      collapseSwipeRowsExcept(null);
    }
  });
}

function renderTgAccountsSummary(accounts) {
  const card = document.getElementById("tgAccountsSummaryCard");
  const dl = document.getElementById("tgAccountsSummaryDl");
  if (!card || !dl || isWebMode) {
    return;
  }

  if (!Array.isArray(accounts) || accounts.length === 0) {
    card.hidden = true;
    dl.innerHTML = "";
    return;
  }

  card.hidden = false;

  const sumForTypes = (types) => {
    const map = new Map();
    for (const a of accounts) {
      if (!types.includes(a.type)) {
        continue;
      }
      const c = String(a.currency_code ?? "")
        .trim()
        .toUpperCase();
      const code = c || "—";
      const prev = map.get(code) ?? 0;
      map.set(code, prev + Number(a.balance ?? 0));
    }
    return map;
  };

  const formatMap = (map) => {
    if (map.size === 0) {
      return "0,00 —";
    }
    return [...map.entries()].map(([c, v]) => formatMoney(v, c)).join(" · ");
  };

  const rep = String(state.summary?.reportingCurrency ?? "").trim() || "USD";
  const totalNum = Number(state.summary?.totalBalanceConverted ?? 0);
  const totalLine = Number.isFinite(totalNum) ? formatMoney(totalNum, rep) : "—";

  const rows = [
    ["Общий баланс", totalLine, true],
    ["Количество счетов", String(accounts.length), false],
    ["Наличными", formatMap(sumForTypes(["cash"])), false],
    ["На картах", formatMap(sumForTypes(["card"])), false],
    ["В накоплениях", formatMap(sumForTypes(["savings"])), false]
  ];

  dl.innerHTML = rows
    .map(([dt, dd, accent]) => {
      const ddInner = accent ? `<strong>${escapeHtml(dd)}</strong>` : escapeHtml(dd);
      return `<div class="tg-accounts-summary-row"><dt>${escapeHtml(dt)}</dt><dd class="${
        accent ? "tg-accounts-summary-dd--accent" : ""
      }">${ddInner}</dd></div>`;
    })
    .join("");
}

function renderAccounts(accounts) {
  if (accountsCountElement) {
    accountsCountElement.textContent = String(accounts.length);
  }
  if (accountsTitleElement) {
    accountsTitleElement.textContent = accounts.length > 0 ? "Ваши счета" : "Счета пока пусты";
  }
  syncAccountFormTitles();
  cancelAccountEditButton?.classList.toggle("hidden-button", !state.editingAccountId);

  const headBadge = document.getElementById("webAccountsHeadBadge");
  if (headBadge) {
    headBadge.textContent = String(accounts.length);
  }

  renderTgAccountsSummary(accounts);

  renderAccountsList(
    accountsListElement,
    accounts,
    "Создайте первый счет на этой вкладке."
  );
  renderAccountsList(
    homeAccountsListElement,
    accounts.slice(0, 4),
    "Создайте первый счет, и он появится здесь."
  );
}

const CATEGORY_ACCENT_STORAGE_KEY = "balancyCategoryAccentsV1";

const CATEGORY_UI_PALETTE = ["#28b473", "#3b82f6", "#a855f7", "#f97316", "#ec4899", "#14b8a6", "#94a3b8"];

const CATEGORY_UI_META_STORAGE_KEY = "balancyCategoryUiMetaV1";

const DEFAULT_CATEGORY_ICON_KEY = "briefcase";

/** Соответствует `data-category-icon` в `#webCategoryIconGrid` (index.html). */
const CATEGORY_ICON_GLYPHS = {
  briefcase: "💼",
  laptop: "💻",
  building: "🏢",
  gift: "🎁",
  house: "🏠",
  cart: "🛒",
  car: "🚗",
  food: "🍽",
  heart: "❤️",
  sport: "💪",
  plane: "✈️",
  study: "🎓",
  pet: "🐾",
  more: "⋯"
};

function getCategoryIconGlyph(iconKey) {
  const k = String(iconKey ?? "").trim();
  return CATEGORY_ICON_GLYPHS[k] || CATEGORY_ICON_GLYPHS.briefcase;
}

const ACCOUNT_UI_META_STORAGE_KEY = "balancyAccountUiMetaV1";
const DEFAULT_ACCOUNT_ICON_KEY = "card";

const ACCOUNT_ICON_GLYPHS = {
  card: "💳",
  wallet: "👛",
  cashbill: "💵",
  piggy: "🐷",
  bank: "🏦",
  briefcase: "💼",
  building: "🏢",
  gift: "🎁",
  house: "🏠",
  cart: "🛒",
  car: "🚗",
  laptop: "💻",
  food: "🍽",
  heart: "❤️",
  sport: "💪",
  plane: "✈️",
  study: "🎓",
  pet: "🐾",
  crypto: "🪙",
  more: "⋯"
};

function defaultAccountIconKeyForType(type) {
  if (type === "cash") {
    return "cashbill";
  }
  if (type === "card") {
    return "card";
  }
  if (type === "savings") {
    return "piggy";
  }
  if (type === "crypto") {
    return "crypto";
  }
  if (type === "other") {
    return "briefcase";
  }
  return "card";
}

function getAccountIconGlyph(iconKey) {
  const k = String(iconKey ?? "").trim();
  if (ACCOUNT_ICON_GLYPHS[k]) {
    return ACCOUNT_ICON_GLYPHS[k];
  }
  return getCategoryIconGlyph(k);
}

function readAccountUiMetaMap() {
  try {
    const raw = window.localStorage.getItem(ACCOUNT_UI_META_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeAccountUiMetaMap(map) {
  try {
    window.localStorage.setItem(ACCOUNT_UI_META_STORAGE_KEY, JSON.stringify(map));
  } catch {
    //
  }
}

function readAccountUiMeta(accountId) {
  if (!accountId) {
    return { description: "", iconKey: "" };
  }
  const m = readAccountUiMetaMap();
  const row = m[accountId];
  if (!row || typeof row !== "object") {
    return { description: "", iconKey: "" };
  }
  const description = typeof row.description === "string" ? row.description : "";
  const iconKey = typeof row.iconKey === "string" && row.iconKey.trim() ? row.iconKey.trim() : "";
  return { description, iconKey };
}

function writeAccountUiMeta(accountId, patch) {
  if (!accountId) {
    return;
  }
  const m = readAccountUiMetaMap();
  const prev = m[accountId] && typeof m[accountId] === "object" ? m[accountId] : {};
  m[accountId] = { ...prev, ...patch };
  writeAccountUiMetaMap(m);
}

function removeAccountUiMeta(accountId) {
  if (!accountId) {
    return;
  }
  const m = readAccountUiMetaMap();
  delete m[accountId];
  writeAccountUiMetaMap(m);
}

function resolveAccountIconKey(account) {
  const { iconKey } = readAccountUiMeta(account.id);
  if (iconKey) {
    return iconKey;
  }
  return defaultAccountIconKeyForType(account.type);
}

function formatAccountLeadingGlyphHtml(account) {
  const ch = getAccountIconGlyph(resolveAccountIconKey(account));
  return `<span class="account-leading-glyph" aria-hidden="true">${escapeHtml(ch)}</span>`;
}

function applyAccountIconKeyToForm(iconKey) {
  const k =
    iconKey && String(iconKey).trim() ? String(iconKey).trim() : DEFAULT_ACCOUNT_ICON_KEY;
  const hidden = document.getElementById("accountIconKeyInput");
  if (hidden) {
    hidden.value = k;
  }
  document.querySelectorAll("#webAccountIconGrid .web-category-icon-btn").forEach((btn) => {
    btn.classList.toggle("is-selected", btn.dataset.accountIcon === k);
  });
  syncAccountPreview();
}

function readAccountPreviewAccentHex() {
  const hidden = document.getElementById("accountAccentInput");
  const fromForm = hidden instanceof HTMLInputElement ? hidden.value.trim() : "";
  if (fromForm && /^#[0-9a-fA-F]{6}$/.test(fromForm)) {
    return fromForm.toLowerCase();
  }
  if (state.editingAccountId) {
    const stored = readAccountAccent(state.editingAccountId);
    if (stored) {
      return stored;
    }
  }
  return "#4338ca";
}

function syncAccountPreview() {
  const nameInput = document.getElementById("nameInput");
  const typeInput = document.getElementById("typeInput");
  const balanceInput = document.getElementById("balanceInput");
  const iconKeyInput = document.getElementById("accountIconKeyInput");

  const rawName = nameInput instanceof HTMLInputElement ? nameInput.value.trim() : "";
  const type = typeInput instanceof HTMLSelectElement ? typeInput.value : "cash";
  const currency =
    currencyInput instanceof HTMLSelectElement && currencyInput.value
      ? currencyInput.value
      : "USD";
  const iconKey =
    iconKeyInput instanceof HTMLInputElement && String(iconKeyInput.value ?? "").trim()
      ? String(iconKeyInput.value).trim()
      : defaultAccountIconKeyForType(type);
  const accentHex = readAccountPreviewAccentHex();
  const glyph = getAccountIconGlyph(iconKey);
  const titleLine = `${rawName || "Tinkoff"} · ${currency}`;
  const metaLine = `${formatType(type)} · ${formatCurrencyLineFromCode(currency)}`;
  const balance = balanceInput instanceof HTMLInputElement ? Number(balanceInput.value) : 0;
  const balanceNum = Number.isFinite(balance) ? balance : 0;

  const titleEl = document.getElementById("tgAccountPreviewTitle");
  const metaEl = document.getElementById("tgAccountPreviewMeta");
  const balanceEl = document.getElementById("tgAccountPreviewBalance");
  const iconEl = document.getElementById("tgAccountPreviewIcon");
  const glyphEl = document.getElementById("tgAccountPreviewIconGlyph");

  if (titleEl) {
    titleEl.textContent = titleLine;
  }
  if (metaEl) {
    metaEl.textContent = metaLine;
  }
  if (glyphEl) {
    glyphEl.textContent = glyph;
  }
  if (iconEl) {
    iconEl.style.backgroundColor = accentHex;
  }
  if (balanceEl) {
    balanceEl.textContent = formatMoney(balanceNum, currency);
  }

  const mobileName = document.getElementById("tgAccountPreviewMobileName");
  const mobileMeta = document.getElementById("tgAccountPreviewMobileMeta");
  const mobileIcon = document.getElementById("tgAccountPreviewMobileIcon");
  const mobileGlyph = document.getElementById("tgAccountPreviewMobileGlyph");
  const mobileBalanceValue = document.getElementById("tgAccountPreviewMobileBalanceValue");
  const mobileBalanceCurrency = document.getElementById("tgAccountPreviewMobileBalanceCurrency");

  if (mobileName) {
    mobileName.textContent = titleLine;
  }
  if (mobileMeta) {
    mobileMeta.textContent = metaLine;
  }
  if (mobileGlyph) {
    mobileGlyph.textContent = glyph;
  }
  if (mobileIcon) {
    mobileIcon.style.backgroundColor = accentHex;
  }
  if (mobileBalanceValue) {
    mobileBalanceValue.textContent = formatMoneyAmount(balanceNum);
  }
  if (mobileBalanceCurrency) {
    mobileBalanceCurrency.textContent = currency;
  }
}

let categoryFormSharedChromeAttached = false;

const ACCOUNT_ACCENT_STORAGE_KEY = "balancyAccountAccentsV1";

let webAccountColorChromeAttached = false;

function readAccountAccentMap() {
  try {
    const raw = window.localStorage.getItem(ACCOUNT_ACCENT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeAccountAccentMap(map) {
  try {
    window.localStorage.setItem(ACCOUNT_ACCENT_STORAGE_KEY, JSON.stringify(map));
  } catch {
    //
  }
}

function readAccountAccent(accountId) {
  const m = readAccountAccentMap();
  const v = m[accountId];
  return typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v.trim()) ? v.trim().toLowerCase() : "";
}

function writeAccountAccent(accountId, hex) {
  const m = readAccountAccentMap();
  m[accountId] = hex.trim().toLowerCase();
  writeAccountAccentMap(m);
}

function removeAccountAccent(accountId) {
  const m = readAccountAccentMap();
  delete m[accountId];
  writeAccountAccentMap(m);
}

function fallbackAccentFromAccountId(accountId) {
  let h = 0;
  for (let i = 0; i < accountId.length; i++) {
    h = (h * 31 + accountId.charCodeAt(i)) | 0;
  }
  return CATEGORY_UI_PALETTE[Math.abs(h) % CATEGORY_UI_PALETTE.length];
}

function resolveAccountCardAccent(account) {
  return readAccountAccent(account.id) || fallbackAccentFromAccountId(account.id);
}

function formatCurrencyLineFromCode(code) {
  const trimmed = String(code ?? "").trim().toUpperCase();
  const list = getAvailableCurrencies();
  const hit = list.find((c) => c.code === trimmed);
  return hit ? formatCurrencyOption(hit) : trimmed || "—";
}

function clearWebAccountAccentSelection() {
  const hidden = document.getElementById("accountAccentInput");
  if (hidden) {
    hidden.value = "";
  }
  document.querySelectorAll("#webAccountColorSwatches .web-cat-swatch").forEach((b) => {
    b.classList.remove("is-selected");
  });
}

function applyAccentSwatchesForAccountId(accountId) {
  clearWebAccountAccentSelection();
  const hex = readAccountAccent(accountId);
  const hidden = document.getElementById("accountAccentInput");
  if (!hidden || !hex) {
    syncAccountPreview();
    return;
  }
  hidden.value = hex;
  document.querySelectorAll("#webAccountColorSwatches .web-cat-swatch").forEach((b) => {
    if ((b.dataset.accentHex || "").toLowerCase() === hex.toLowerCase()) {
      b.classList.add("is-selected");
    }
  });
  syncAccountPreview();
}

function attachWebAccountColorChrome() {
  if (webAccountColorChromeAttached) {
    return;
  }
  webAccountColorChromeAttached = true;
  const sw = document.getElementById("webAccountColorSwatches");
  sw?.addEventListener("click", (event) => {
    const t = event.target instanceof Element ? event.target.closest(".web-cat-swatch") : null;
    if (!t || !sw?.contains(t)) {
      return;
    }
    const hex = t.dataset.accentHex?.trim();
    if (!hex) {
      return;
    }
    sw.querySelectorAll(".web-cat-swatch").forEach((b) => b.classList.remove("is-selected"));
    t.classList.add("is-selected");
    const hidden = document.getElementById("accountAccentInput");
    if (hidden) {
      hidden.value = hex.toLowerCase();
    }
    syncAccountPreview();
  });
}

let accountFormChromeAttached = false;

function attachAccountFormChrome() {
  if (accountFormChromeAttached) {
    return;
  }
  accountFormChromeAttached = true;

  const iconGrid = document.getElementById("webAccountIconGrid");
  iconGrid?.addEventListener("click", (event) => {
    const t = event.target instanceof Element ? event.target.closest("[data-account-icon]") : null;
    if (!t || !iconGrid.contains(t)) {
      return;
    }
    const key = t.dataset.accountIcon?.trim();
    if (!key) {
      return;
    }
    iconGrid.querySelectorAll(".web-category-icon-btn").forEach((b) => b.classList.remove("is-selected"));
    t.classList.add("is-selected");
    applyAccountIconKeyToForm(key);
  });

  document.getElementById("typeInput")?.addEventListener("change", () => {
    if (!state.editingAccountId) {
      const typeEl = document.getElementById("typeInput");
      const nextType = typeEl instanceof HTMLSelectElement ? typeEl.value : "cash";
      applyAccountIconKeyToForm(defaultAccountIconKeyForType(nextType));
    } else {
      syncAccountPreview();
    }
  });

  document.getElementById("nameInput")?.addEventListener("input", syncAccountPreview);
  document.getElementById("balanceInput")?.addEventListener("input", syncAccountPreview);
  currencyInput?.addEventListener("change", syncAccountPreview);

  syncAccountPreview();
}

function syncAccountFormTitles() {
  if (!accountFormTitleElement || !submitButton) {
    return;
  }
  const editing = Boolean(state.editingAccountId);
  const sub = document.getElementById("accountFormSubtitle");
  if (sub) {
    sub.textContent = editing
      ? "Измените данные счёта и нажмите «Сохранить изменения»."
      : "Заполните данные для создания счёта.";
  }
  if (isWebMode) {
    accountFormTitleElement.textContent = editing ? "Редактировать счёт" : "Добавить новый счёт";
    submitButton.textContent = editing ? "Сохранить изменения" : "Создать счёт";
  } else {
    accountFormTitleElement.textContent = editing ? "Редактировать счёт" : "Добавить новый счёт";
    submitButton.textContent = editing ? "Сохранить изменения" : "Создать счёт";
  }
}

function readCategoryAccentMap() {
  try {
    const raw = window.localStorage.getItem(CATEGORY_ACCENT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeCategoryAccentMap(map) {
  try {
    window.localStorage.setItem(CATEGORY_ACCENT_STORAGE_KEY, JSON.stringify(map));
  } catch {
    //
  }
}

function readCategoryAccent(categoryId) {
  const m = readCategoryAccentMap();
  const v = m[categoryId];
  return typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v.trim()) ? v.trim().toLowerCase() : "";
}

function writeCategoryAccent(categoryId, hex) {
  const m = readCategoryAccentMap();
  m[categoryId] = hex.trim().toLowerCase();
  writeCategoryAccentMap(m);
}

function removeCategoryAccent(categoryId) {
  const m = readCategoryAccentMap();
  delete m[categoryId];
  writeCategoryAccentMap(m);
}

function fallbackAccentFromCategoryId(categoryId) {
  let h = 0;
  for (let i = 0; i < categoryId.length; i++) {
    h = (h * 31 + categoryId.charCodeAt(i)) | 0;
  }
  return CATEGORY_UI_PALETTE[Math.abs(h) % CATEGORY_UI_PALETTE.length];
}

function resolveCategoryDotColor(category) {
  const stored = readCategoryAccent(category.id);
  return stored || fallbackAccentFromCategoryId(category.id);
}

function formatCategoryCountRu(n) {
  const abs = Math.abs(Number(n)) || 0;
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return `${abs} категория`;
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${abs} категории`;
  }
  return `${abs} категорий`;
}

function syncWebCategoryKindPicksFromSelect() {
  const sel = document.getElementById("categoryKindInput");
  const v = sel?.value === "income" ? "income" : "expense";
  document.querySelectorAll("[data-set-category-kind]").forEach((btn) => {
    btn.classList.toggle("is-selected", btn.dataset.setCategoryKind === v);
  });
}

function readCategoryUiMetaMap() {
  try {
    const raw = window.localStorage.getItem(CATEGORY_UI_META_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeCategoryUiMetaMap(map) {
  try {
    window.localStorage.setItem(CATEGORY_UI_META_STORAGE_KEY, JSON.stringify(map));
  } catch {
    //
  }
}

function readCategoryUiMeta(categoryId) {
  if (!categoryId) {
    return { description: "", iconKey: DEFAULT_CATEGORY_ICON_KEY };
  }
  const m = readCategoryUiMetaMap();
  const row = m[categoryId];
  if (!row || typeof row !== "object") {
    return { description: "", iconKey: DEFAULT_CATEGORY_ICON_KEY };
  }
  const description = typeof row.description === "string" ? row.description : "";
  const iconKey =
    typeof row.iconKey === "string" && row.iconKey.trim() ? row.iconKey.trim() : DEFAULT_CATEGORY_ICON_KEY;
  return { description, iconKey };
}

function writeCategoryUiMeta(categoryId, patch) {
  if (!categoryId) {
    return;
  }
  const m = readCategoryUiMetaMap();
  const prev = m[categoryId] && typeof m[categoryId] === "object" ? m[categoryId] : {};
  m[categoryId] = { ...prev, ...patch };
  writeCategoryUiMetaMap(m);
}

function removeCategoryUiMeta(categoryId) {
  if (!categoryId) {
    return;
  }
  const m = readCategoryUiMetaMap();
  delete m[categoryId];
  writeCategoryUiMetaMap(m);
}

function hexToRgbComponents(hex) {
  const h = String(hex ?? "")
    .trim()
    .replace("#", "");
  if (h.length !== 6 || !/^[0-9a-fA-F]+$/.test(h)) {
    return { r: 40, g: 180, b: 115 };
  }
  return {
    r: Number.parseInt(h.slice(0, 2), 16),
    g: Number.parseInt(h.slice(2, 4), 16),
    b: Number.parseInt(h.slice(4, 6), 16)
  };
}

function rgbaFromHex(hex, alpha) {
  const { r, g, b } = hexToRgbComponents(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function applyDefaultCategoryAccentSwatch() {
  const sw = document.getElementById("webCategoryColorSwatches");
  const hidden = document.getElementById("categoryAccentInput");
  if (!sw || !hidden) {
    return;
  }
  sw.querySelectorAll(".web-cat-swatch").forEach((b) => b.classList.remove("is-selected"));
  const first = sw.querySelector(".web-cat-swatch[data-accent-hex]");
  if (first instanceof HTMLElement) {
    first.classList.add("is-selected");
    const hex = first.dataset.accentHex?.trim().toLowerCase();
    if (hex) {
      hidden.value = hex;
    }
  }
}

function applyCategoryIconKeyToForm(iconKey) {
  const key = iconKey && String(iconKey).trim() ? String(iconKey).trim() : DEFAULT_CATEGORY_ICON_KEY;
  const hidden = document.getElementById("categoryIconKeyInput");
  if (hidden) {
    hidden.value = key;
  }
  document.querySelectorAll("#webCategoryIconGrid .web-category-icon-btn").forEach((btn) => {
    btn.classList.toggle("is-selected", btn.dataset.categoryIcon === key);
  });
}

function syncTgCategoryPreview() {
  const nameEl = document.getElementById("tgCategoryPreviewName");
  const descEl = document.getElementById("tgCategoryPreviewDesc");
  const pill = document.getElementById("tgCategoryPreviewKindPill");
  const glyph = document.getElementById("tgCategoryPreviewIconGlyph");
  const ring = document.getElementById("tgCategoryPreviewIconRing");
  const nameInput = document.getElementById("categoryNameInput");
  const descInput = document.getElementById("categoryDescriptionInput");
  const kindInput = document.getElementById("categoryKindInput");
  const accentHidden = document.getElementById("categoryAccentInput");
  const iconKeyInput = document.getElementById("categoryIconKeyInput");

  if (!nameEl || !pill || !glyph || !ring) {
    return;
  }

  const rawName = nameInput instanceof HTMLInputElement ? nameInput.value.trim() : "";
  nameEl.textContent = rawName || "Зарплата";

  const kind = kindInput?.value === "income" ? "income" : "expense";
  pill.textContent = kind === "income" ? "Доход" : "Расход";
  pill.classList.toggle("tg-category-preview-pill--income", kind === "income");
  pill.classList.toggle("tg-category-preview-pill--expense", kind === "expense");

  const selectedIconBtn = document.querySelector("#webCategoryIconGrid .web-category-icon-btn.is-selected");

  const iconKey =
    iconKeyInput instanceof HTMLInputElement && String(iconKeyInput.value ?? "").trim()
      ? String(iconKeyInput.value).trim()
      : selectedIconBtn?.dataset?.categoryIcon?.trim() || DEFAULT_CATEGORY_ICON_KEY;
  glyph.textContent = getCategoryIconGlyph(iconKey);

  const accentHex = (accentHidden?.value || "#28b473").trim() || "#28b473";
  ring.style.background = rgbaFromHex(accentHex, 0.16);
  ring.style.boxShadow = `inset 0 0 0 1px ${rgbaFromHex(accentHex, 0.28)}`;

  if (descEl) {
    const d = descInput instanceof HTMLTextAreaElement ? descInput.value.trim() : "";
    descEl.textContent = d;
    descEl.hidden = !d;
  }
}

function attachCategoryFormSharedChrome() {
  if (categoryFormSharedChromeAttached) {
    return;
  }
  categoryFormSharedChromeAttached = true;

  document.querySelectorAll("[data-set-category-kind]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const k = btn.dataset.setCategoryKind;
      if (k !== "income" && k !== "expense") {
        return;
      }
      const sel = document.getElementById("categoryKindInput");
      if (sel) {
        sel.value = k;
      }
      syncWebCategoryKindPicksFromSelect();
      syncTgCategoryPreview();
    });
  });

  const sw = document.getElementById("webCategoryColorSwatches");
  sw?.addEventListener("click", (event) => {
    const t = event.target instanceof Element ? event.target.closest(".web-cat-swatch") : null;
    if (!t || !sw.contains(t)) {
      return;
    }
    const hex = t.dataset.accentHex?.trim();
    if (!hex) {
      return;
    }
    sw.querySelectorAll(".web-cat-swatch").forEach((b) => b.classList.remove("is-selected"));
    t.classList.add("is-selected");
    const hidden = document.getElementById("categoryAccentInput");
    if (hidden) {
      hidden.value = hex.toLowerCase();
    }
    syncTgCategoryPreview();
  });

  const iconGrid = document.getElementById("webCategoryIconGrid");
  iconGrid?.addEventListener("click", (event) => {
    const t = event.target instanceof Element ? event.target.closest("[data-category-icon]") : null;
    if (!t || !iconGrid.contains(t)) {
      return;
    }
    const key = t.dataset.categoryIcon?.trim();
    if (!key) {
      return;
    }
    iconGrid.querySelectorAll(".web-category-icon-btn").forEach((b) => b.classList.remove("is-selected"));
    t.classList.add("is-selected");
    applyCategoryIconKeyToForm(key);
    syncTgCategoryPreview();
  });

  document.getElementById("categoryNameInput")?.addEventListener("input", syncTgCategoryPreview);
  document.getElementById("categoryDescriptionInput")?.addEventListener("input", syncTgCategoryPreview);

  document.getElementById("categoryKindInput")?.addEventListener("change", () => {
    syncWebCategoryKindPicksFromSelect();
    syncTgCategoryPreview();
  });

  document.getElementById("tgCategoryFormBackButton")?.addEventListener("click", () => {
    resetCategoryForm();
    renderCategories(state.categories);
    const anchor =
      document.querySelector(".web-categories-main") ?? document.getElementById("incomeCategoriesList");
    anchor?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  const accentHidden = document.getElementById("categoryAccentInput");
  if (accentHidden && !String(accentHidden.value ?? "").trim()) {
    if (!isWebMode) {
      applyDefaultCategoryAccentSwatch();
    }
  }
  syncTgCategoryPreview();
}

function clearWebCategoryAccentSelection() {
  const hidden = document.getElementById("categoryAccentInput");
  if (hidden) {
    hidden.value = "";
  }
  document.querySelectorAll("#webCategoryColorSwatches .web-cat-swatch").forEach((b) => {
    b.classList.remove("is-selected");
  });
}

function applyAccentSwatchesForCategoryId(categoryId) {
  clearWebCategoryAccentSelection();
  const hex = readCategoryAccent(categoryId);
  const hidden = document.getElementById("categoryAccentInput");
  if (!hidden) {
    syncTgCategoryPreview();
    return;
  }
  if (!hex) {
    syncTgCategoryPreview();
    return;
  }
  hidden.value = hex;
  const normalizedHex = hex.toLowerCase() === "#ef4444" ? "#ec4899" : hex.toLowerCase();
  document.querySelectorAll("#webCategoryColorSwatches .web-cat-swatch").forEach((b) => {
    if ((b.dataset.accentHex || "").toLowerCase() === normalizedHex) {
      b.classList.add("is-selected");
    }
  });
  syncTgCategoryPreview();
}

function buildWebCategoriesTableRowsHtml(items) {
  return items
    .map((category) => {
      const dot = resolveCategoryDotColor(category);
      const meta = readCategoryUiMeta(category.id);
      const glyph = getCategoryIconGlyph(meta.iconKey);
      const kindSlug = category.kind === "income" ? "income" : "expense";
      const tileBg = escapeHtml(rgbaFromHex(dot, 0.14));
      const tileRing = escapeHtml(rgbaFromHex(dot, 0.28));
      return `<tr>
        <td>
          <div class="web-categories-name-cell">
            <span class="web-categories-icon-emoji-tile" style="background:${tileBg};box-shadow:inset 0 0 0 1px ${tileRing}" aria-hidden="true">${glyph}</span>
            <span class="web-categories-name-text">${escapeHtml(category.name)}</span>
          </div>
        </td>
        <td><span class="web-categories-type web-categories-type--${escapeHtml(kindSlug)}">${escapeHtml(
          formatKind(category.kind)
        )}</span></td>
        <td class="web-categories-actions">
          <button class="web-categories-icon-btn" type="button" data-category-edit-id="${escapeHtml(category.id)}" title="Редактировать" aria-label="Редактировать категорию">${ACCOUNT_EDIT_ICON_SVG}</button>
          <button class="web-categories-icon-btn web-categories-icon-btn--danger" type="button" data-category-delete-id="${escapeHtml(category.id)}" title="Удалить" aria-label="Удалить категорию">${ACCOUNT_DELETE_ICON_SVG}</button>
        </td>
      </tr>`;
    })
    .join("");
}

function renderWebCategoriesTableSection(kind, categories) {
  const tbodyId = kind === "income" ? "webCategoriesIncomeTableBody" : "webCategoriesExpenseTableBody";
  const emptyId = kind === "income" ? "webCategoriesIncomeEmptyState" : "webCategoriesExpenseEmptyState";
  const tbody = document.getElementById(tbodyId);
  const emptyEl = document.getElementById(emptyId);
  if (!tbody) {
    return;
  }

  const items = categories.filter((c) => c.kind === kind);

  if (items.length === 0) {
    tbody.innerHTML = "";
    if (emptyEl) {
      emptyEl.hidden = false;
    }
    return;
  }

  if (emptyEl) {
    emptyEl.hidden = true;
  }

  tbody.innerHTML = buildWebCategoriesTableRowsHtml(items);
}

function renderWebCategoriesTable(categories) {
  if (!isWebMode) {
    return;
  }

  renderWebCategoriesTableSection("income", categories);
  renderWebCategoriesTableSection("expense", categories);
}

function attachWebCategoriesChrome() {
  if (!isWebMode || webCategoriesChromeAttached) {
    return;
  }
  webCategoriesChromeAttached = true;
}

function syncCategoryFormChrome() {
  if (!categoryFormTitleElement || !categorySubmitButton) {
    return;
  }

  const editing = Boolean(state.editingCategoryId);

  if (isWebMode) {
    categoryFormTitleElement.textContent = editing ? "Редактировать категорию" : "Добавить категорию";
    categorySubmitButton.textContent = "Сохранить";
  } else {
    categoryFormTitleElement.textContent = editing ? "Редактировать категорию" : "Добавить категорию";
    categorySubmitButton.textContent = editing ? "Сохранить изменения" : "Сохранить категорию";
  }

  if (cancelCategoryEditButton) {
    if (isWebMode) {
      cancelCategoryEditButton.classList.remove("hidden-button");
    } else {
      cancelCategoryEditButton.classList.toggle("hidden-button", !editing);
    }
  }
}

function resetCategoryForm() {
  state.editingCategoryId = null;
  categoryForm.reset();
  const kindInput = document.getElementById("categoryKindInput");
  if (kindInput) {
    kindInput.value = isWebMode ? "income" : "expense";
  }
  syncWebCategoryKindPicksFromSelect();
  clearWebCategoryAccentSelection();
  if (!isWebMode) {
    applyDefaultCategoryAccentSwatch();
  }
  const desc = document.getElementById("categoryDescriptionInput");
  if (desc instanceof HTMLTextAreaElement) {
    desc.value = "";
  }
  applyCategoryIconKeyToForm(DEFAULT_CATEGORY_ICON_KEY);
  syncCategoryFormChrome();
  syncTgCategoryPreview();
}

function startCategoryEdit(categoryId) {
  collapseSwipeRowsExcept(null);

  const category = state.categories.find((item) => item.id === categoryId);

  if (!category) {
    setStatus("Категория не найдена.", "error");
    return;
  }

  state.editingCategoryId = category.id;
  document.getElementById("categoryKindInput").value = category.kind;
  document.getElementById("categoryNameInput").value = category.name;
  const meta = readCategoryUiMeta(category.id);
  const desc = document.getElementById("categoryDescriptionInput");
  if (desc instanceof HTMLTextAreaElement) {
    desc.value = meta.description;
  }
  applyCategoryIconKeyToForm(meta.iconKey);
  syncWebCategoryKindPicksFromSelect();
  applyAccentSwatchesForCategoryId(category.id);
  syncCategoryFormChrome();
  syncTgCategoryPreview();
  setStatus("Отредактируйте поля и нажмите «Сохранить».", "success");
  openScreen("categories");

  if (isWebMode) {
    renderWebCategoriesTable(state.categories);
    window.requestAnimationFrame(() => {
      document.getElementById("categoryNameInput")?.focus({ preventScroll: true });
    });
    return;
  }

  const anchor = document.getElementById("categoryFormTitle");
  scrollTgContentToElement(anchor instanceof HTMLElement ? anchor : categoryForm);
  window.setTimeout(() => {
    document.getElementById("categoryNameInput")?.focus({ preventScroll: true });
  }, 160);
}

function renderCategories(categories) {
  const incomeCategories = categories.filter((category) => category.kind === "income");
  const expenseCategories = categories.filter((category) => category.kind === "expense");

  if (categoriesCountElement) {
    categoriesCountElement.textContent = String(categories.length);
  }

  const incBadge = document.getElementById("webCategoriesIncomeBadge");
  const expBadge = document.getElementById("webCategoriesExpenseBadge");
  if (incBadge) {
    incBadge.textContent = String(incomeCategories.length);
  }
  if (expBadge) {
    expBadge.textContent = String(expenseCategories.length);
  }

  const renderList = (targetElement, items) => {
    if (!targetElement) {
      return;
    }

    if (items.length === 0) {
      targetElement.innerHTML = `
        <div class="empty-state">
          <strong>Пока пусто</strong>
          <p class="account-meta">Добавьте первую категорию на этой вкладке.</p>
        </div>
      `;
      return;
    }

    targetElement.innerHTML = items
      .map((category) => {
        const kindSlug = category.kind === "income" ? "income" : "expense";
        const meta = readCategoryUiMeta(category.id);
        const glyph = getCategoryIconGlyph(meta.iconKey);
        const dot = resolveCategoryDotColor(category);
        const tileBg = escapeHtml(rgbaFromHex(dot, 0.14));
        const tileRing = escapeHtml(rgbaFromHex(dot, 0.28));

        return `
          <div class="category-item swipe-row">
            <div class="swipe-row-actions" aria-hidden="true">
              <button class="icon-action-button" data-category-edit-id="${escapeHtml(category.id)}" type="button" title="Редактировать" aria-label="Редактировать категорию">
                ${ACCOUNT_EDIT_ICON_SVG}
              </button>
              <button class="icon-action-button icon-action-button-danger" data-category-delete-id="${escapeHtml(category.id)}" type="button" title="Удалить" aria-label="Удалить категорию">
                ${ACCOUNT_DELETE_ICON_SVG}
              </button>
            </div>
            <div class="swipe-row-sheet">
              <div class="category-strip-content">
                <span class="category-strip-icon-tile" style="background:${tileBg};box-shadow:inset 0 0 0 1px ${tileRing}" aria-hidden="true">${glyph}</span>
                <div class="category-strip-text">
                  <strong class="category-strip-name">${escapeHtml(category.name)}</strong>
                  <span class="category-strip-kind category-strip-kind--${kindSlug}">${escapeHtml(
                    formatKind(category.kind)
                  )}</span>
                </div>
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  };

  renderList(incomeCategoriesListElement, incomeCategories);
  renderList(expenseCategoriesListElement, expenseCategories);

  if (isWebMode) {
    renderWebCategoriesTable(categories);
  }

  syncCategoryFormChrome();
}

function renderRecentEntries(entries) {
  if (!isWebMode && document.getElementById("tgActivityCombinedList")) {
    populateTgActivityFilterSelects();
    if (document.body.dataset.appActiveScreen === "ledger" && tgOpsFilterSnapshotInitialized) {
      void refreshTgOperationsBoard();
    }
    return;
  }

  if (!recentEntriesListElement) {
    return;
  }

  if (entries.length === 0) {
    recentEntriesListElement.innerHTML = `
      <div class="empty-state">
        <strong>Операций пока нет</strong>
        <p class="account-meta">Добавьте первую операцию на этой вкладке.</p>
      </div>
    `;
    return;
  }

  recentEntriesListElement.innerHTML = entries
    .map((entry) => {
      const amountClass =
        entry.kind === "income" ? "entry-amount-income" : "entry-amount-expense";
      const amountPrefix = entry.kind === "income" ? "+" : "-";

      return `
        <article class="entry-item">
          <div class="item-leading">
            <div class="entry-icon entry-icon-${escapeHtml(entry.kind)}">${getEntryIcon(entry.kind)}</div>
            <div class="entry-main">
              <div class="entry-title-row">
                <strong>${escapeHtml(entry.category?.name ?? "Без категории")}</strong>
              </div>
              <div class="account-meta">
                ${escapeHtml(entry.account?.name ?? "Счет")} · ${escapeHtml(
                  formatOperationAuthorMeta(
                    resolveOperationCreatedByFromApi(null, entry),
                    entry.occurred_at
                  )
                )}
              </div>
              ${
                entry.note
                  ? `<div class="account-meta">${escapeHtml(entry.note)}</div>`
                  : ""
              }
            </div>
          </div>
          ${formatEntryAmountStackHtml(amountPrefix, entry.amount, entry.currency_code, amountClass)}
        </article>
      `;
    })
    .join("");
}

function renderRecentTransfers(transfers) {
  if (!isWebMode && document.getElementById("tgActivityCombinedList")) {
    return;
  }

  if (!recentTransfersListElement) {
    return;
  }

  if (transfers.length === 0) {
    recentTransfersListElement.innerHTML = `
      <div class="empty-state">
        <strong>Переводов пока нет</strong>
        <p class="account-meta">Создайте первый перевод между счетами.</p>
      </div>
    `;
    return;
  }

  recentTransfersListElement.innerHTML = transfers
    .map(
      (transfer) => `
        <article class="entry-item">
          <div class="item-leading">
            <div class="entry-icon entry-icon-transfer">${getEntryIcon("transfer")}</div>
            <div class="entry-main">
              <div class="entry-title-row">
                <strong>${escapeHtml(transfer.from_account?.name ?? "Счет")} → ${escapeHtml(
                  transfer.to_account?.name ?? "Счет"
                )}</strong>
              </div>
              <div class="transfer-meta">${escapeHtml(
                formatOperationAuthorMeta(
                  resolveOperationCreatedByFromApi(null, transfer),
                  transfer.occurred_at
                )
              )}</div>
              ${
                transfer.note
                  ? `<div class="account-meta">${escapeHtml(transfer.note)}</div>`
                  : ""
              }
            </div>
          </div>
          ${formatTransferAmountStackHtml(transfer)}
        </article>
      `
    )
    .join("");
}

function toLocalYmdFromIso(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatTgOpsDayHeading(ymd) {
  const parts = ymd.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return ymd;
  }
  const [y, m, d] = parts;
  const day = new Date(y, m - 1, d);
  const today = new Date();
  const ymdKey = (dt) => {
    const x = dt instanceof Date ? dt : new Date(dt);
    if (Number.isNaN(x.getTime())) {
      return "";
    }
    const yy = x.getFullYear();
    const mm = String(x.getMonth() + 1).padStart(2, "0");
    const dd = String(x.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  };

  if (ymdKey(day) === ymdKey(today)) {
    return `Сегодня, ${day.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}`;
  }
  const yest = new Date(today);
  yest.setDate(yest.getDate() - 1);
  if (ymdKey(day) === ymdKey(yest)) {
    return `Вчера, ${day.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}`;
  }
  const cap = day.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
  return cap.charAt(0).toUpperCase() + cap.slice(1);
}

function getMonthlyNetFromSummary(summary) {
  const monthlyIncome = Number(summary?.monthlyIncome ?? 0);
  const monthlyExpense = Number(summary?.monthlyExpense ?? 0);
  if (summary?.monthlyNet !== undefined && summary?.monthlyNet !== null) {
    return Number(summary.monthlyNet);
  }
  return monthlyIncome - monthlyExpense;
}

function syncTgOpsStatsFromSummary(summary) {
  const netEl = document.getElementById("tgOpsStatNet");
  if (!netEl) {
    return;
  }

  const ccy = summary?.reportingCurrency ?? "";
  const net = getMonthlyNetFromSummary(summary);
  const sign = net >= 0 ? "+" : "−";
  netEl.textContent = `${sign}${formatMoney(Math.abs(net), ccy)}`;
}

function toLocalYmdFromDateValue(d) {
  const x = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(x.getTime())) {
    return "";
  }
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function ensureTgOpsDefaultDates() {
  if (isWebMode || tgOpsDefaultDatesInitialized) {
    return;
  }
  const fromEl = document.getElementById("tgOpsDateFrom");
  const toEl = document.getElementById("tgOpsDateTo");
  if (!fromEl || !toEl) {
    return;
  }
  tgOpsDefaultDatesInitialized = true;
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  fromEl.value = toLocalYmdFromDateValue(start);
  toEl.value = toLocalYmdFromDateValue(end);
}

function populateTgActivityFilterSelects() {
  if (isWebMode) {
    return;
  }

  const accSel = document.getElementById("tgOpsFilterAccount");
  const catSel = document.getElementById("tgOpsFilterCategory");
  if (!accSel || !catSel) {
    return;
  }

  const prevAcc = accSel.value;
  const prevCat = catSel.value;

  accSel.innerHTML = `<option value="">${escapeHtml("Все счета")}</option>${state.accounts
    .map(
      (a) =>
        `<option value="${escapeHtml(a.id)}">${escapeHtml(a.name)} · ${escapeHtml(a.currency_code)}</option>`
    )
    .join("")}`;

  if (prevAcc && Array.from(accSel.options).some((o) => o.value === prevAcc)) {
    accSel.value = prevAcc;
  }

  catSel.innerHTML = `<option value="">${escapeHtml("Все категории")}</option>${state.categories
    .map((c) => {
      const g = getCategoryIconGlyph(readCategoryUiMeta(c.id).iconKey);
      return `<option value="${escapeHtml(c.id)}">${g} ${escapeHtml(c.name)} (${escapeHtml(formatKind(c.kind))})</option>`;
    })
    .join("")}`;

  if (prevCat && Array.from(catSel.options).some((o) => o.value === prevCat)) {
    catSel.value = prevCat;
  }
}

function readTgOpsFilterFromDom() {
  const searchEl = document.getElementById("tgOpsSearchInput");
  const accEl = document.getElementById("tgOpsFilterAccount");
  const kindEl = document.getElementById("tgOpsFilterKind");
  const catEl = document.getElementById("tgOpsFilterCategory");
  const fromEl = document.getElementById("tgOpsDateFrom");
  const toEl = document.getElementById("tgOpsDateTo");

  return {
    q: (searchEl?.value ?? "").trim(),
    fromY: (fromEl?.value ?? "").trim(),
    toY: (toEl?.value ?? "").trim(),
    accId: (accEl?.value ?? "").trim(),
    kind: (kindEl?.value ?? "all").trim() || "all",
    catId: (catEl?.value ?? "").trim()
  };
}

function applyTgOpsFiltersForTgList() {
  if (isWebMode) {
    return;
  }
  Object.assign(tgOpsAppliedFilter, readTgOpsFilterFromDom());
  tgOpsFilterSnapshotInitialized = true;
  tgOpsPageOffset = 0;
  void refreshTgOperationsBoard();
}

function resetTgOpsFiltersToDefaults() {
  if (isWebMode) {
    return;
  }
  const fromEl = document.getElementById("tgOpsDateFrom");
  const toEl = document.getElementById("tgOpsDateTo");
  const searchEl = document.getElementById("tgOpsSearchInput");
  const accEl = document.getElementById("tgOpsFilterAccount");
  const kindEl = document.getElementById("tgOpsFilterKind");
  const catEl = document.getElementById("tgOpsFilterCategory");
  if (fromEl && toEl) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    fromEl.value = toLocalYmdFromDateValue(start);
    toEl.value = toLocalYmdFromDateValue(end);
  }
  if (searchEl) {
    searchEl.value = "";
  }
  if (accEl) {
    accEl.value = "";
  }
  if (kindEl) {
    kindEl.value = "all";
  }
  if (catEl) {
    catEl.value = "";
  }
  Object.assign(tgOpsAppliedFilter, readTgOpsFilterFromDom());
  tgOpsFilterSnapshotInitialized = true;
  tgOpsPageOffset = 0;
  void refreshTgOperationsBoard();
}

function formatTgOpsTransferAmountCell(transfer) {
  const fromAmt = formatMoneyAmount(transfer.from_amount);
  const fromCcy = escapeHtml(transfer.from_currency_code || "");
  const toAmt = formatMoneyAmount(transfer.to_amount);
  const toCcy = escapeHtml(transfer.to_currency_code || "");

  return `<div class="tg-ops-amount-stack">
    <span class="tg-ops-amount-val tg-ops-amount-val--transfer">${escapeHtml(fromAmt)} → ${escapeHtml(toAmt)}</span>
    <span class="tg-ops-amount-ccy">${fromCcy} → ${toCcy}</span>
  </div>`;
}

function operationsApiItemToFeedItem(row) {
  if (!row || typeof row !== "object") {
    return null;
  }

  const createdBy = resolveOperationCreatedByFromApi(row, row.entry ?? row.transfer);

  if (row.kind === "entry" && row.entry) {
    return { type: "entry", occurredAt: row.entry.occurred_at, payload: row.entry, createdBy };
  }
  if (row.kind === "transfer" && row.transfer) {
    return {
      type: "transfer",
      occurredAt: row.transfer.occurred_at,
      payload: row.transfer,
      createdBy
    };
  }
  return null;
}

function buildTgOpsFeedHtmlFromItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return "";
  }

  const groups = new Map();
  for (const item of items) {
    const key = toLocalYmdFromIso(item.occurredAt) || "—";
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(item);
  }

  const sortedKeys = [...groups.keys()].sort((a, b) => b.localeCompare(a));
  const parts = [];

  for (const ymd of sortedKeys) {
    const groupItems = groups.get(ymd) ?? [];
    parts.push(`<div class="tg-ops-day-group"><p class="tg-ops-day-label">${escapeHtml(
      formatTgOpsDayHeading(ymd)
    )}</p></div>`);

    for (const item of groupItems) {
      if (item.type === "entry") {
        const entry = item.payload;
        const cat = entry.category;
        const catName = cat?.name ?? "Без категории";
        const iconClass = entry.kind === "income" ? "tg-ops-row-icon--income" : "tg-ops-row-icon--expense";
        const amountClass = entry.kind === "income" ? "tg-ops-amount-val--income" : "tg-ops-amount-val--expense";
        const prefix = entry.kind === "income" ? "+" : "−";
        const amt = escapeHtml(`${prefix}${formatMoneyAmount(entry.amount)}`);
        const ccy = escapeHtml(entry.currency_code || "");

        parts.push(`<div class="tg-ops-row" role="listitem">
          <div class="tg-ops-row-icon ${iconClass}" aria-hidden="true">${getEntryIcon(entry.kind)}</div>
          <div class="tg-ops-row-main">
            <span class="tg-ops-row-title">${escapeHtml(catName)}</span>
            <span class="tg-ops-row-meta">${escapeHtml(entry.account?.name ?? "Счёт")} · ${escapeHtml(
              formatOperationAuthorMeta(
                item.createdBy ?? resolveOperationCreatedByFromApi(null, entry),
                entry.occurred_at
              )
            )}</span>
          </div>
          <div class="tg-ops-amount-stack">
            <span class="tg-ops-amount-val ${amountClass}">${amt}</span>
            <span class="tg-ops-amount-ccy">${ccy}</span>
          </div>
        </div>`);
      } else {
        const transfer = item.payload;
        const title = `${transfer.from_account?.name ?? "Счёт"} → ${transfer.to_account?.name ?? "Счёт"}`;

        parts.push(`<div class="tg-ops-row" role="listitem">
          <div class="tg-ops-row-icon tg-ops-row-icon--transfer" aria-hidden="true">${getEntryIcon("transfer")}</div>
          <div class="tg-ops-row-main">
            <span class="tg-ops-row-title">${escapeHtml(title)}</span>
            <span class="tg-ops-row-meta">${escapeHtml(
              formatOperationAuthorMeta(
                item.createdBy ?? resolveOperationCreatedByFromApi(null, transfer),
                transfer.occurred_at
              )
            )}</span>
          </div>
          ${formatTgOpsTransferAmountCell(transfer)}
        </div>`);
      }
    }
  }

  return parts.join("");
}

function renderTgOpsPaginationMarkup(total, offset, pageSize) {
  const nav = document.getElementById("tgOpsPaginationNav");
  if (!nav) {
    return;
  }

  const totalRows = typeof total === "number" && Number.isFinite(total) ? Math.max(0, total) : 0;
  if (totalRows === 0) {
    nav.hidden = true;
    nav.innerHTML = "";
    return;
  }

  const pages = Math.max(1, Math.ceil(totalRows / pageSize));
  const currentPage = Math.min(pages, Math.floor(offset / pageSize) + 1);
  const prevDisabled = offset <= 0;
  const nextDisabled = offset + pageSize >= totalRows;

  const windowSize = 5;
  let start = Math.min(Math.max(1, currentPage - 2), Math.max(1, pages - windowSize + 1));
  let end = Math.min(pages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);

  const numButtons = [];
  for (let p = start; p <= end; p++) {
    const active = p === currentPage ? " is-active" : "";
    numButtons.push(
      `<button type="button" class="tg-ops-page-btn${active}" data-tg-ops-page="${p}" aria-label="Страница ${p}"${
        active ? ' aria-current="page"' : ""
      }>${p}</button>`
    );
  }

  nav.hidden = false;
  nav.innerHTML = `<div class="tg-ops-pagination-inner">
    <button type="button" class="tg-ops-page-btn tg-ops-page-btn--edge" data-tg-ops-page="prev" aria-label="Назад"${
      prevDisabled ? " disabled" : ""
    }>Назад</button>
    <div class="tg-ops-page-nums">${numButtons.join("")}</div>
    <button type="button" class="tg-ops-page-btn tg-ops-page-btn--edge" data-tg-ops-page="next" aria-label="Далее"${
      nextDisabled ? " disabled" : ""
    }>Далее</button>
  </div>`;
}

function renderTgOperationsRemotePayloadIntoDom(payload) {
  const root = document.getElementById("tgActivityCombinedList");
  if (!root) {
    return;
  }

  const rawItems = Array.isArray(payload?.items) ? payload.items : [];
  const feedItems = rawItems.map(operationsApiItemToFeedItem).filter(Boolean);
  const total =
    typeof payload?.total === "number" && Number.isFinite(payload.total) ? payload.total : feedItems.length;

  if (feedItems.length === 0) {
    if (tgOpsPageOffset > 0 && total > 0) {
      tgOpsPageOffset = Math.max(0, Math.floor((total - 1) / TG_OPS_PAGE_SIZE) * TG_OPS_PAGE_SIZE);
      void refreshTgOperationsBoard();
      return;
    }
    root.innerHTML = `
      <div class="empty-state" style="padding: 20px 16px 24px;">
        <strong>Нет операций</strong>
        <p class="account-meta">Измените фильтры или добавьте операцию.</p>
      </div>
    `;
    renderTgOpsPaginationMarkup(0, 0, TG_OPS_PAGE_SIZE);
    return;
  }

  root.innerHTML = buildTgOpsFeedHtmlFromItems(feedItems);
  renderTgOpsPaginationMarkup(total, tgOpsPageOffset, TG_OPS_PAGE_SIZE);
}

async function refreshTgOperationsBoard() {
  if (isWebMode) {
    return;
  }
  if (document.body.dataset.appActiveScreen === "transfer") {
    return;
  }
  const root = document.getElementById("tgActivityCombinedList");
  if (!root) {
    return;
  }
  if (document.body.dataset.appActiveScreen !== "ledger") {
    return;
  }
  if (!tgOpsFilterSnapshotInitialized) {
    return;
  }

  root.innerHTML = `<div class="empty-state muted tg-ops-loading">Загрузка…</div>`;
  const nav = document.getElementById("tgOpsPaginationNav");
  if (nav) {
    nav.hidden = true;
    nav.innerHTML = "";
  }

  try {
    const payload = await apiFetch(buildTgOperationsApiUrl());
    renderTgOperationsRemotePayloadIntoDom(payload);
  } catch (error) {
    console.error(error);
    root.innerHTML = `<div class="empty-state" style="padding: 20px 16px 24px;">
        <strong>Не удалось загрузить</strong>
        <p class="account-meta inline-error">${escapeHtml(
          error instanceof Error ? error.message : "Ошибка запроса"
        )}</p>
      </div>`;
    if (nav) {
      nav.hidden = true;
      nav.innerHTML = "";
    }
  }
}

function attachTgActivityOpsChrome() {
  if (isWebMode || tgActivityOpsChromeAttached) {
    return;
  }
  tgActivityOpsChromeAttached = true;

  const openNewModal = () => {
    openEntryTypeModal();
  };

  document.getElementById("tgActivityNewEntryButton")?.addEventListener("click", openNewModal);
  document.getElementById("tgActivityNewOperationFooter")?.addEventListener("click", openNewModal);

  document.getElementById("tgOpsApplyFilters")?.addEventListener("click", () => {
    applyTgOpsFiltersForTgList();
  });

  document.getElementById("tgOpsActivityRefreshButton")?.addEventListener("click", () => {
    if (refreshButton) {
      refreshButton.click();
    } else {
      void refreshAppData({ light: true });
    }
  });

  document.getElementById("tgOpsResetFilters")?.addEventListener("click", () => {
    resetTgOpsFiltersToDefaults();
  });

  const opsRoot = document.getElementById("tgOpsActivityRoot");
  opsRoot?.addEventListener("click", (event) => {
    const t = event.target instanceof Element ? event.target.closest("[data-tg-ops-page]") : null;
    if (!t || !opsRoot.contains(t) || t.hasAttribute("disabled")) {
      return;
    }
    const raw = t.getAttribute("data-tg-ops-page") ?? "";
    if (raw === "prev") {
      tgOpsPageOffset = Math.max(0, tgOpsPageOffset - TG_OPS_PAGE_SIZE);
      void refreshTgOperationsBoard();
      return;
    }
    if (raw === "next") {
      tgOpsPageOffset += TG_OPS_PAGE_SIZE;
      void refreshTgOperationsBoard();
      return;
    }
    const page = Number(raw);
    if (!Number.isFinite(page) || page < 1) {
      return;
    }
    tgOpsPageOffset = (page - 1) * TG_OPS_PAGE_SIZE;
    void refreshTgOperationsBoard();
  });
}

function buildRecentActivityCombinedHtml(entries, transfers, limit = 12) {
  const combined = [
    ...entries.map((entry) => ({
      type: "entry",
      occurredAt: entry.occurred_at,
      payload: entry,
      createdBy: resolveOperationCreatedByFromApi(null, entry)
    })),
    ...transfers.map((transfer) => ({
      type: "transfer",
      occurredAt: transfer.occurred_at,
      payload: transfer,
      createdBy: resolveOperationCreatedByFromApi(null, transfer)
    }))
  ]
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, limit);

  if (combined.length === 0) {
    return `
      <div class="empty-state">
        <strong>Пока нет операций</strong>
        <p class="account-meta">Добавьте доход, расход или перевод — они появятся в списке.</p>
      </div>
    `;
  }

  return combined
    .map((item) => {
      if (item.type === "entry") {
        const entry = item.payload;
        const amountPrefix = entry.kind === "income" ? "+" : "-";
        const amountClass =
          entry.kind === "income" ? "entry-amount-income" : "entry-amount-expense";

        return `
          <article class="account-item home-activity-row">
            <div class="account-item-header">
              <div class="item-leading">
                <div class="entry-icon entry-icon-${escapeHtml(entry.kind)}">${getEntryIcon(entry.kind)}</div>
                <div class="item-copy">
                  <div class="account-name">${escapeHtml(entry.category?.name ?? "Без категории")}</div>
                  <div class="account-meta">
                    ${escapeHtml(entry.account?.name ?? "Счет")} · ${escapeHtml(
                      formatOperationAuthorMeta(item.createdBy, entry.occurred_at)
                    )}
                  </div>
                </div>
              </div>
              ${formatEntryAmountStackHtml(amountPrefix, entry.amount, entry.currency_code, amountClass)}
            </div>
          </article>
        `;
      }

      const transfer = item.payload;

      return `
        <article class="account-item home-activity-row">
          <div class="account-item-header">
            <div class="item-leading">
              <div class="entry-icon entry-icon-transfer">${getEntryIcon("transfer")}</div>
              <div class="item-copy">
                <div class="account-name">${escapeHtml(transfer.from_account?.name ?? "Счет")} → ${escapeHtml(
                  transfer.to_account?.name ?? "Счет"
                )}</div>
                <div class="account-meta">${escapeHtml(
                  formatOperationAuthorMeta(item.createdBy, transfer.occurred_at)
                )}</div>
              </div>
            </div>
            ${formatTransferAmountStackHtml(transfer)}
          </div>
        </article>
      `;
    })
    .join("");
}

function buildWebRecentTransfersHtml(transfers, limit = WEB_RECENT_SIDEBAR_LIMIT) {
  const list = (Array.isArray(transfers) ? transfers : []).slice(0, limit);

  if (list.length === 0) {
    return `
      <div class="empty-state">
        <strong>Переводов пока нет</strong>
        <p class="account-meta">Создайте первый перевод между счетами.</p>
      </div>
    `;
  }

  return list
    .map((transfer) => {
      return `
        <article class="account-item home-activity-row">
          <div class="account-item-header">
            <div class="item-leading">
              <div class="entry-icon entry-icon-transfer">${getEntryIcon("transfer")}</div>
              <div class="item-copy">
                <div class="account-name">${escapeHtml(transfer.from_account?.name ?? "Счет")} → ${escapeHtml(
                  transfer.to_account?.name ?? "Счет"
                )}</div>
                <div class="account-meta">${escapeHtml(formatDateTime(transfer.occurred_at))}</div>
              </div>
            </div>
            ${formatTransferAmountStackHtml(transfer)}
          </div>
        </article>
      `;
    })
    .join("");
}

function renderWebTransferRecentList(transfers) {
  if (!isWebMode || !webTransferRecentListElement) {
    return;
  }

  webTransferRecentListElement.innerHTML = buildWebRecentTransfersHtml(transfers, WEB_RECENT_SIDEBAR_LIMIT);
}

function renderWebActivityRecentList(entries, transfers) {
  if (!isWebMode || !webActivityRecentListElement) {
    return;
  }

  webActivityRecentListElement.innerHTML = buildRecentActivityCombinedHtml(
    entries,
    transfers,
    WEB_RECENT_SIDEBAR_LIMIT
  );
}

function renderHomeRecentActivity(entries, transfers) {
  if (!homeRecentActivityListElement) {
    return;
  }

  homeRecentActivityListElement.innerHTML = buildRecentActivityCombinedHtml(entries, transfers, 4);
}

function renderCategoryBreakdownList(targetElement, items, emptyTitle, emptyHint) {
  if (!targetElement) {
    return;
  }

  const list = Array.isArray(items) ? items : [];

  if (list.length === 0) {
    targetElement.innerHTML = `
      <div class="empty-state">
        <strong>${escapeHtml(emptyTitle)}</strong>
        <p class="account-meta">${escapeHtml(emptyHint)}</p>
      </div>
    `;
    return;
  }

  targetElement.innerHTML = list
    .map(
      (item) => `
        <div class="category-item">
          <div>
            <strong>${escapeHtml(item.categoryName)}</strong>
          </div>
          <div class="account-balance-stack" aria-label="Сумма">
            <span class="account-balance-value">${escapeHtml(formatMoneyAmount(item.total))}</span>
            <span class="account-balance-currency">${escapeHtml(item.currencyCode ?? "")}</span>
          </div>
        </div>
      `
    )
    .join("");
}

const REPORT_MONTH_SHORT_GEN = [
  "янв",
  "фев",
  "мар",
  "апр",
  "мая",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек"
];

function formatReportDayLabelRu(isoDate) {
  const parts = String(isoDate).split("-");
  if (parts.length < 3) {
    return String(isoDate);
  }
  const d = Number(parts[2]);
  const m = Number(parts[1]);
  return `${d} ${REPORT_MONTH_SHORT_GEN[m - 1] ?? ""}`.trim();
}

function formatHumanReportRange(startIso, endIso) {
  try {
    const a = new Date(startIso);
    const b = new Date(endIso);
    const da = `${a.getDate()} ${REPORT_MONTH_SHORT_GEN[a.getMonth()] ?? ""}`;
    const db = `${b.getDate()} ${REPORT_MONTH_SHORT_GEN[b.getMonth()] ?? ""} ${b.getFullYear()}`;
    if (a.getFullYear() !== b.getFullYear()) {
      return `${da} ${a.getFullYear()} — ${db}`;
    }
    return `${da} — ${db}`;
  } catch {
    return "";
  }
}

const REPORT_MONTH_LOCATIVE = [
  "январе",
  "феврале",
  "марте",
  "апреле",
  "мае",
  "июне",
  "июле",
  "августе",
  "сентябре",
  "октябре",
  "ноябре",
  "декабре"
];

function previousPeriodPhrase(period, startIso) {
  if (!startIso || typeof startIso !== "string") {
    return "в прошлом периоде";
  }
  const d = new Date(startIso);
  if (Number.isNaN(d.getTime())) {
    return "в прошлом периоде";
  }
  if (period === "month") {
    const prev = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 15));
    return `в ${REPORT_MONTH_LOCATIVE[prev.getUTCMonth()] ?? "прошлом месяце"}`;
  }
  if (period === "quarter") {
    return "в прошлом квартале";
  }
  if (period === "year") {
    return "в прошлом году";
  }
  if (period === "week") {
    return "на прошлой неделе";
  }
  return "в прошлом периоде";
}

function formatPctCompareVsPrevious(pct, period, startIso) {
  if (pct === null || pct === undefined || Number.isNaN(Number(pct))) {
    return "Нет сравнения с прошлым периодом";
  }
  const n = Number(pct);
  const ref = previousPeriodPhrase(period, startIso);
  if (Math.abs(n) < 0.05) {
    return `Почти как ${ref}`;
  }
  const sign = n > 0 ? "+" : "";
  const adj = n > 0 ? "больше" : "меньше";
  return `${sign}${n.toFixed(1)}% ${adj}, чем ${ref}`;
}

function formatOperationsCompare(cmp, period, startIso) {
  if (!cmp) {
    return "";
  }
  const ref = previousPeriodPhrase(period, startIso);
  const d = Number(cmp.operationsDelta ?? 0);
  if (d !== 0) {
    const sign = d > 0 ? "+" : "";
    const abs = Math.abs(d);
    let word = "операций";
    if (abs % 10 === 1 && abs % 100 !== 11) {
      word = "операция";
    } else if ([2, 3, 4].includes(abs % 10) && ![12, 13, 14].includes(abs % 100)) {
      word = "операции";
    }
    return `${sign}${d} ${word}, чем ${ref}`;
  }
  if (cmp.operationsPct !== null && cmp.operationsPct !== undefined && !Number.isNaN(Number(cmp.operationsPct))) {
    return formatPctCompareVsPrevious(cmp.operationsPct, period, startIso);
  }
  return "";
}

function formatMoneyWithCode(amount, code) {
  const c = (code ?? "").trim();
  return c ? `${formatMoneyAmount(amount)} ${c}` : formatMoneyAmount(amount);
}

function syncReportPeriodSegmented() {
  const wrap = document.getElementById("reportPeriodSegmented");
  if (!wrap || !reportPeriodInput) {
    return;
  }
  const v = reportPeriodInput.value;
  wrap.querySelectorAll("[data-report-period]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.reportPeriod === v);
  });
}

function categoryColorAt(index) {
  const palette = ["#f97316", "#a855f7", "#3b82f6", "#eab308", "#14b8a6", "#ec4899", "#64748b", "#22c55e"];
  return palette[index % palette.length];
}

function renderReportCategoryMatrix(report) {
  if (!reportCategoryMatrixBody) {
    return;
  }
  const rows = Array.isArray(report?.categoryMatrix) ? report.categoryMatrix : [];
  const c = report?.reportingCurrency ?? "";
  if (rows.length === 0) {
    reportCategoryMatrixBody.innerHTML = `<tr><td colspan="4" class="muted">Нет данных по категориям за период.</td></tr>`;
    return;
  }
  reportCategoryMatrixBody.innerHTML = rows
    .map((row, idx) => {
      const exp = Number(row.expense ?? 0);
      const inc = Number(row.income ?? 0);
      const net = Number(row.net ?? 0);
      const col = categoryColorAt(idx);
      const netClass = net >= 0 ? "report-matrix-pos" : "report-matrix-neg";
      return `<tr>
        <td><span class="report-matrix-cat"><span class="report-matrix-dot" style="background:${escapeHtml(col)}"></span>${escapeHtml(row.categoryName)}</span></td>
        <td class="report-matrix-num report-matrix-neg">${exp > 0 ? `−${escapeHtml(formatMoneyAmount(exp))}` : "—"}</td>
        <td class="report-matrix-num report-matrix-pos">${inc > 0 ? `+${escapeHtml(formatMoneyAmount(inc))}` : "—"}</td>
        <td class="report-matrix-num ${netClass}">${net >= 0 ? "+" : "−"}${escapeHtml(formatMoneyAmount(Math.abs(net)))} ${escapeHtml(c)}</td>
      </tr>`;
    })
    .join("");
}

function renderReportPeriodSummary(report) {
  if (!reportPeriodSummaryDl || !report) {
    return;
  }
  const c = report.reportingCurrency ?? "";
  const e = Number(report.expenseEntryCount ?? 0);
  const i = Number(report.incomeEntryCount ?? 0);
  const avgExp = e > 0 ? report.expenses / e : 0;
  const avgInc = i > 0 ? report.incomes / i : 0;
  const openB = report.balanceAtPeriodStartReporting;
  const closeB =
    report.balanceAtPeriodEndReporting !== undefined && report.balanceAtPeriodEndReporting !== null
      ? report.balanceAtPeriodEndReporting
      : report.currentTotalBalance;
  const transVol = Number(report.transfersVolumeReporting ?? 0);
  const ops = report.operationsCount ?? 0;

  const blocks = [
    { dt: "Начальный баланс", dd: openB != null ? formatMoneyWithCode(openB, c) : "—", ddClass: "" },
    {
      dt: "Доходы",
      dd: `+${formatMoneyWithCode(report.incomes, c)}`,
      ddClass: "report-summary-pos"
    },
    {
      dt: "Расходы",
      dd: `−${formatMoneyWithCode(report.expenses, c)}`,
      ddClass: "report-summary-neg"
    },
    {
      dt: "Переводы между счетами",
      dd: `−${formatMoneyWithCode(transVol, c)}`,
      ddClass: ""
    },
    { hr: true },
    {
      dt: "Конечный баланс",
      dd: closeB != null ? formatMoneyWithCode(closeB, c) : "—",
      ddClass: "report-summary-end"
    },
    { hr: true },
    { dt: "Операции", dd: String(ops), ddClass: "" },
    {
      dt: "Средний чек расходов",
      dd: e ? `−${formatMoneyWithCode(avgExp, c)}` : "—",
      ddClass: ""
    },
    {
      dt: "Средний чек доходов",
      dd: i ? `+${formatMoneyWithCode(avgInc, c)}` : "—",
      ddClass: "report-summary-pos"
    }
  ];

  reportPeriodSummaryDl.innerHTML = blocks
    .map((row) => {
      if (row.hr) {
        return '<div class="report-summary-hr" role="presentation"></div>';
      }
      return `<div class="report-summary-row"><dt>${escapeHtml(row.dt)}</dt><dd class="${escapeHtml(row.ddClass ?? "")}">${escapeHtml(row.dd)}</dd></div>`;
    })
    .join("");
}

function drawReportSparkline(canvas, values, color) {
  if (!canvas || !values?.length) {
    return;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const data = values.map((v) => Number(v) || 0);
  const min = Math.min(...data, 0);
  const max = Math.max(...data, 0.0001);
  const range = max - min || 1;
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  data.forEach((v, i) => {
    const x = (i / Math.max(1, data.length - 1)) * (w - 4) + 2;
    const y = h - 4 - ((v - min) / range) * (h - 8);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();
}

function drawAllReportSparks(report) {
  const daily = Array.isArray(report?.dailySeries) ? report.dailySeries : [];
  const inc = daily.map((d) => d.income);
  const exp = daily.map((d) => d.expense);
  let cum = 0;
  const netCum = daily.map((d) => {
    cum += Number(d.net ?? 0);
    return cum;
  });
  const opsTotal = Number(report?.operationsCount ?? 0);
  const n = Math.max(1, daily.length);
  const opsSpark = daily.map((_, i) => (opsTotal * (i + 1)) / n);
  drawReportSparkline(document.getElementById("reportSparkIncome"), inc, "#2ECC71");
  drawReportSparkline(document.getElementById("reportSparkExpense"), exp, "#E74C3C");
  drawReportSparkline(document.getElementById("reportSparkNet"), netCum, "#3498DB");
  drawReportSparkline(document.getElementById("reportSparkOps"), opsSpark, "#3498DB");
}

function destroyReportCharts() {
  ["trend", "category"].forEach((key) => {
    const chart = reportChartInstances[key];
    if (chart && typeof chart.destroy === "function") {
      try {
        chart.destroy();
      } catch {
        /* ignore */
      }
    }
    reportChartInstances[key] = null;
  });
}

function renderReportChartsFromReport(report) {
  if (typeof window.Chart === "undefined") {
    return;
  }

  if (!report) {
    destroyReportCharts();
    return;
  }

  const trendCanvas = document.getElementById("reportTrendChart");
  const categoryCanvas = document.getElementById("reportCategoryChart");

  if (!trendCanvas || !categoryCanvas) {
    return;
  }

  destroyReportCharts();

  const ChartCtor = window.Chart;
  const reportingCode = report?.reportingCurrency ?? "";
  const green = "#2ECC71";
  const expenseRed = "#E74C3C";
  const netBlue = "#3498DB";
  const daily = Array.isArray(report?.dailySeries) ? report.dailySeries : [];
  const expenseCats = Array.isArray(report?.expenseByCategory) ? report.expenseByCategory : [];

  const dayLabels = daily.map((d) => formatReportDayLabelRu(d.date));
  let cumulativeNet = 0;
  const netSeries = daily.map((d) => {
    cumulativeNet += Number(d.net ?? 0);
    return Number(cumulativeNet.toFixed(2));
  });

  reportChartInstances.trend = new ChartCtor(trendCanvas, {
    type: "line",
    data: {
      labels: dayLabels,
      datasets: [
        {
          label: "Доходы",
          data: daily.map((d) => d.income),
          borderColor: green,
          backgroundColor: "rgba(46, 204, 113, 0.14)",
          fill: true,
          tension: 0.35,
          pointRadius: 0
        },
        {
          label: "Расходы",
          data: daily.map((d) => d.expense),
          borderColor: expenseRed,
          backgroundColor: "rgba(231, 76, 60, 0.1)",
          fill: true,
          tension: 0.35,
          pointRadius: 0
        },
        {
          label: "Чистый поток",
          data: netSeries,
          borderColor: netBlue,
          backgroundColor: "rgba(52, 152, 219, 0.06)",
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label(ctx) {
              const v = ctx.parsed.y;
              return `${ctx.dataset.label}: ${formatMoneyAmount(v)} ${reportingCode}`;
            }
          }
        }
      },
      scales: {
        x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } },
        y: { ticks: { callback: (v) => formatMoneyAmount(Number(v)) } }
      }
    }
  });

  const palette = [
    "#f97316",
    "#a855f7",
    "#3b82f6",
    "#eab308",
    "#14b8a6",
    "#ec4899",
    "#64748b",
    "#22c55e"
  ];
  const topExp = expenseCats.slice(0, 8);
  const otherSum = expenseCats.slice(8).reduce((s, row) => s + Number(row.total ?? 0), 0);
  const donutLabels = topExp.map((r) => r.categoryName);
  const donutData = topExp.map((r) => Number(r.total ?? 0));
  if (otherSum > 0.009) {
    donutLabels.push("Прочее");
    donutData.push(Number(otherSum.toFixed(2)));
  }
  if (donutLabels.length === 0 || donutData.every((n) => !n || n === 0)) {
    donutLabels.splice(0, donutLabels.length, "Нет расходов");
    donutData.splice(0, donutData.length, 1);
  }

  reportChartInstances.category = new ChartCtor(categoryCanvas, {
    type: "doughnut",
    data: {
      labels: donutLabels,
      datasets: [
        {
          data: donutData,
          backgroundColor: donutLabels.map((_, i) => palette[i % palette.length]),
          borderWidth: 2,
          borderColor: "#fff"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "62%",
      plugins: {
        legend: {
          position: isWebMode ? "right" : "bottom",
          labels: { boxWidth: 10, font: { size: isWebMode ? 11 : 10 }, padding: isWebMode ? 12 : 8 }
        },
        tooltip: {
          callbacks: {
            label(ctx) {
              const total = donutData.reduce((a, b) => a + b, 0) || 1;
              const val = Number(ctx.dataset?.data?.[ctx.dataIndex] ?? 0);
              const pct = ((val / total) * 100).toFixed(0);
              return `${ctx.label}: ${formatMoneyAmount(val)} ${reportingCode} (${pct}%)`;
            }
          }
        }
      }
    }
  });

  if (reportDonutTotalElement) {
    const totalExp = Number(report.expenses ?? 0);
    reportDonutTotalElement.textContent = `Всего ${formatMoneyAmount(totalExp)} ${reportingCode}`.trim();
  }
}

function renderReportWebVisuals(report) {
  renderReportCategoryMatrix(report);
  renderReportPeriodSummary(report);
  drawAllReportSparks(report);
  renderReportChartsFromReport(report);
}

function renderReport(report) {
  const periodPhrase = formatReportPeriod(report?.period ?? "month");
  const applied = report?.appliedCategory;
  const cmp = report?.compareToPrevious ?? null;

  if (reportTitleElement) {
    if (applied) {
      const kindLabel = applied.kind === "income" ? "доходы" : "расходы";
      reportTitleElement.textContent = `«${applied.name}» (${kindLabel})`;
    } else {
      reportTitleElement.textContent = "Отчёты";
    }
  }

  if (reportRangeLabelElement && report?.startDate && report?.endDate) {
    reportRangeLabelElement.textContent = formatHumanReportRange(report.startDate, report.endDate);
  } else if (reportRangeLabelElement) {
    reportRangeLabelElement.textContent = periodPhrase;
  }

  syncReportPeriodSegmented();

  const reportingCode = report?.reportingCurrency ?? "";
  const incomes = Number(report?.incomes ?? 0);
  const expenses = Number(report?.expenses ?? 0);
  const net = Number(report?.net ?? 0);
  const transfers = Number(report?.transfersCount ?? 0);
  const opsCount =
    report && typeof report.operationsCount === "number"
      ? report.operationsCount
      : transfers;

  if (reportOperationsCountValueElement) {
    reportOperationsCountValueElement.textContent = String(opsCount);
  }

  if (reportIncomeValueElement) {
    reportIncomeValueElement.textContent = `+${formatMoneyAmount(incomes)} ${reportingCode}`.trim();
  }

  if (reportExpenseValueElement) {
    reportExpenseValueElement.textContent = `−${formatMoneyAmount(expenses)} ${reportingCode}`.trim();
  }

  if (reportNetValueElement) {
    const sign = net >= 0 ? "+" : "−";
    reportNetValueElement.textContent = `${sign}${formatMoneyAmount(Math.abs(net))} ${reportingCode}`.trim();
  }

  const netStatCard = document.querySelector(".report-stat-card--net");
  if (netStatCard) {
    netStatCard.classList.toggle("report-stat-card--net-negative", net < 0);
  }

  const periodKey = report?.period ?? reportPeriodInput?.value ?? "month";
  const startIso = report?.startDate ?? "";

  if (reportStatIncomeSub) {
    reportStatIncomeSub.textContent = cmp ? formatPctCompareVsPrevious(cmp.incomePct, periodKey, startIso) : "";
  }
  if (reportStatExpenseSub) {
    reportStatExpenseSub.textContent = cmp ? formatPctCompareVsPrevious(cmp.expensePct, periodKey, startIso) : "";
  }
  if (reportStatNetSub) {
    reportStatNetSub.textContent = cmp ? formatPctCompareVsPrevious(cmp.netPct, periodKey, startIso) : "";
  }
  if (reportStatOpsSub) {
    reportStatOpsSub.textContent = cmp ? formatOperationsCompare(cmp, periodKey, startIso) : "";
  }

  if (reportTransfersCountValueElement) {
    reportTransfersCountValueElement.textContent = String(transfers);
  }

  if (reportTransfersStatBox) {
    reportTransfersStatBox.hidden = Boolean(applied);
  }

  if (reportCurrentBalanceValueElement) {
    reportCurrentBalanceValueElement.textContent = formatMoneyAmount(report?.currentTotalBalance ?? 0);
  }
  if (reportCurrentBalanceCurrencyElement) {
    reportCurrentBalanceCurrencyElement.textContent = reportingCode;
  }

  renderCategoryBreakdownList(
    reportIncomeCategoriesListElement,
    report?.incomeByCategory ?? [],
    "Нет доходов по статьям",
    applied
      ? "За этот период не было записей по выбранной статье."
      : "Когда появятся операции-доходы, они сгруппируются здесь по статьям."
  );

  renderCategoryBreakdownList(
    reportExpenseCategoriesListElement,
    report?.expenseByCategory ?? [],
    "Нет расходов по статьям",
    applied
      ? "За этот период не было записей по выбранной статье."
      : "Когда появятся расходы, здесь будет разбивка по статьям."
  );

  const canExport = Boolean(report && (isWebMode || getInitData()));

  if (reportDownloadCsvButton) {
    reportDownloadCsvButton.disabled = !canExport;
  }

  if (reportCsvStatementButton) {
    reportCsvStatementButton.disabled = !canExport;
  }

  if (!isWebMode && document.body.dataset.appActiveScreen === "reports") {
    syncTgGlobalScreenChrome("reports");
  }
}

function readTransferOptionCurrency(opt) {
  if (!opt) {
    return "";
  }
  const attr = opt.getAttribute("data-currency");
  if (attr && String(attr).trim()) {
    return String(attr).trim();
  }
  const ds = opt.dataset?.currency;
  return ds && String(ds).trim() ? String(ds).trim() : "";
}

function formatAccountAvailabilityLine(selectEl) {
  if (!selectEl) {
    return "Доступно: —";
  }

  const id = String(selectEl.value ?? "").trim();
  const account = state.accounts.find((a) => String(a.id) === id);

  if (!account) {
    return "Доступно: —";
  }

  const cur = String(account.currency_code ?? "").trim();
  const bal = Number(account.balance ?? 0);
  return `Доступно: ${formatMoney(bal, cur)}`;
}

function syncTransferAccountAvailabilityLines() {
  const fromLine = document.getElementById("transferFromAvailableLine");
  const toLine = document.getElementById("transferToAvailableLine");

  if (transferFromAccountInput && fromLine) {
    fromLine.textContent = formatAccountAvailabilityLine(transferFromAccountInput);
  }

  if (transferToAccountInput && toLine) {
    toLine.textContent = formatAccountAvailabilityLine(transferToAccountInput);
  }
}

function syncEntryAccountAvailabilityLine() {
  const lineEl = document.getElementById("entryAccountAvailableLine");
  if (!entryAccountInput || !lineEl) {
    return;
  }

  lineEl.textContent = formatAccountAvailabilityLine(entryAccountInput);
}

function scheduleTransferRateHintRefresh() {
  window.clearTimeout(transferRateHintTimer);
  transferRateHintTimer = window.setTimeout(() => {
    void refreshTransferRateHint();
  }, 300);
}

async function refreshTransferRateHint() {
  const hintWrap = document.getElementById("transferRateHint");
  const hintText = document.getElementById("transferRateHintText");
  if (!hintWrap || !hintText || !transferFromAccountInput || !transferToAccountInput) {
    return;
  }

  const fromCur = readTransferOptionCurrency(transferFromAccountInput.selectedOptions[0]);
  const toCur = readTransferOptionCurrency(transferToAccountInput.selectedOptions[0]);

  if (!fromCur || !toCur || fromCur === toCur) {
    hintWrap.hidden = true;
    hintText.textContent = "";
    return;
  }

  const requestId = ++transferRateHintRequestId;

  try {
    const params = new URLSearchParams({
      amount: "1",
      from: fromCur,
      to: toCur
    });
    const payload = await apiFetch(`/api/exchange-rates/convert-preview?${params.toString()}`);

    if (requestId !== transferRateHintRequestId) {
      return;
    }

    const rateNum = Number(payload?.rate);
    if (!Number.isFinite(rateNum)) {
      hintWrap.hidden = true;
      hintText.textContent = "";
      return;
    }

    const ratePretty = formatFxReferenceNumeric(rateNum, 2, 6);
    hintText.textContent = `Курс: 1 ${fromCur} = ${ratePretty} ${toCur}`;
    hintWrap.hidden = false;
  } catch {
    if (requestId !== transferRateHintRequestId) {
      return;
    }
    hintWrap.hidden = true;
    hintText.textContent = "";
  }
}

function syncWebTransferAmountCurrencyUi() {
  const badge = document.getElementById("webTransferAmountCurrencyBadge");
  const toBadge = document.getElementById("webTransferToAmountCurrencyBadge");
  const minHint = document.getElementById("transferFromMinHint");

  if (!badge || !transferFromAccountInput || !transferToAccountInput || !transferForm) {
    return;
  }

  const fromOpt = transferFromAccountInput.selectedOptions[0];
  const toOpt = transferToAccountInput.selectedOptions[0];
  const fromCur = readTransferOptionCurrency(fromOpt);
  const toCur = readTransferOptionCurrency(toOpt);

  badge.textContent = fromCur || "—";
  if (toBadge) {
    toBadge.textContent = toCur || "—";
  }

  transferForm.classList.toggle("transfer-is-cross-currency", Boolean(fromCur && toCur && fromCur !== toCur));

  if (minHint) {
    minHint.textContent = fromCur ? `Минимальная сумма: ${formatMoney(1, fromCur)}` : "";
  }

  syncTransferAccountAvailabilityLines();
  scheduleTransferRateHintRefresh();
  scheduleTransferToAmountPreview();
}

async function refreshTransferToAmountPreview() {
  const fromInput = document.getElementById("transferFromAmountInput");
  const toInput = document.getElementById("transferToAmountInput");
  if (!fromInput || !toInput || !transferForm) {
    return;
  }

  if (!transferForm.classList.contains("transfer-is-cross-currency")) {
    clearTransferToAmountIfAutofill(toInput);
    return;
  }

  if (!canAutofillTransferToAmount(toInput)) {
    return;
  }

  const fromCur = readTransferOptionCurrency(transferFromAccountInput?.selectedOptions[0]);
  const toCur = readTransferOptionCurrency(transferToAccountInput?.selectedOptions[0]);
  if (!fromCur || !toCur || fromCur === toCur) {
    clearTransferToAmountIfAutofill(toInput);
    return;
  }

  const raw = String(fromInput.value ?? "")
    .replace(",", ".")
    .trim();
  const amt = Number(raw);
  if (!Number.isFinite(amt) || amt <= 0) {
    clearTransferToAmountIfAutofill(toInput);
    return;
  }

  const requestId = ++transferToPreviewRequestId;

  try {
    const params = new URLSearchParams({
      amount: String(amt),
      from: fromCur,
      to: toCur
    });
    const payload = await apiFetch(`/api/exchange-rates/convert-preview?${params.toString()}`);

    if (requestId !== transferToPreviewRequestId) {
      return;
    }

    const converted = Number(payload?.converted);
    if (!Number.isFinite(converted)) {
      clearTransferToAmountIfAutofill(toInput);
      return;
    }

    const formatted = formatAmountForNumberInput(converted);
    if (!formatted) {
      clearTransferToAmountIfAutofill(toInput);
      return;
    }

    transferToAmountProgrammatic = true;
    toInput.value = formatted;
    transferToAmountAutofillTag = formatted;
    queueMicrotask(() => {
      transferToAmountProgrammatic = false;
    });
  } catch {
    if (requestId !== transferToPreviewRequestId) {
      return;
    }
    clearTransferToAmountIfAutofill(toInput);
  }
}

function scheduleTransferToAmountPreview() {
  window.clearTimeout(transferToPreviewTimer);
  transferToPreviewTimer = window.setTimeout(() => {
    void refreshTransferToAmountPreview();
  }, 320);
}

function swapWebTransferAccounts() {
  if (!transferFromAccountInput || !transferToAccountInput) {
    return;
  }

  const fromValue = transferFromAccountInput.value;
  const toValue = transferToAccountInput.value;
  transferFromAccountInput.value = toValue;
  transferToAccountInput.value = fromValue;
  transferToAmountAutofillTag = null;
  transferToPreviewRequestId += 1;
  const toAmt = document.getElementById("transferToAmountInput");
  if (toAmt instanceof HTMLInputElement) {
    toAmt.value = "";
  }
  syncWebTransferAmountCurrencyUi();
}

function exitTransferScreen() {
  if (transferForm) {
    transferForm.reset();
  }

  transferToAmountAutofillTag = null;
  transferToAmountProgrammatic = false;

  if (transferDateInput) {
    transferDateInput.value = getCurrentLocalDateTimeValue();
  }

  const back = transferReturnScreen || "home";
  openScreen(back);
  populateAccountOptions();
}

function openTransferScreen() {
  transferReturnScreen = document.body.dataset.appActiveScreen || "home";
  transferToAmountAutofillTag = null;
  transferToAmountProgrammatic = false;
  closeEntryTypeModal();
  if (isWebMode) {
    closeWebNewEntryMenu();
    closeWebProfileDropdown();
  }
  openScreen("transfer");

  populateAccountOptions();
  if (transferDateInput && !String(transferDateInput.value ?? "").trim()) {
    transferDateInput.value = getCurrentLocalDateTimeValue();
  }
  syncWebTransferAmountCurrencyUi();

  window.requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  });
}

function populateAccountOptions() {
  if (!entryAccountInput || !transferFromAccountInput || !transferToAccountInput) {
    return;
  }

  const accountOptions = state.accounts
    .map(
      (account) =>
        `<option value="${escapeHtml(account.id)}" data-currency="${escapeHtml(account.currency_code)}">${escapeHtml(
          account.name
        )} · ${escapeHtml(account.currency_code)}</option>`
    )
    .join("");

  if (state.accounts.length === 0) {
    entryAccountInput.innerHTML = `<option value="">Сначала создайте счет</option>`;
    transferFromAccountInput.innerHTML = `<option value="">Сначала создайте счет</option>`;
    transferToAccountInput.innerHTML = `<option value="">Сначала создайте счет</option>`;
    syncEntryAccountAvailabilityLine();
    syncWebTransferAmountCurrencyUi();
    return;
  }

  entryAccountInput.innerHTML = accountOptions;
  transferFromAccountInput.innerHTML = accountOptions;
  transferToAccountInput.innerHTML = accountOptions;

  if (state.accounts.length > 1) {
    transferToAccountInput.selectedIndex = 1;
  }

  const preservedCurrency = readEntryOperationCurrency();
  populateEntryCurrencyOptions();
  const currencyCodes = [...(entryCurrencyInput?.options ?? [])]
    .map((option) => option.value)
    .filter(Boolean);
  if (preservedCurrency && currencyCodes.includes(preservedCurrency)) {
    entryCurrencyInput.value = preservedCurrency;
    syncEntryCurrencyHint();
  } else {
    syncEntryCurrencyFromAccount(true);
  }
  syncEntryAccountAvailabilityLine();
  syncWebTransferAmountCurrencyUi();
}

function populateCurrencyOptions() {
  const filteredCurrencies = getAvailableCurrencies();

  if (filteredCurrencies.length === 0) {
    currencyInput.innerHTML = `<option value="">Валюты недоступны</option>`;
    return;
  }

  const currentValue = currencyInput.value;

  currencyInput.innerHTML = filteredCurrencies
    .map(
      (currency) =>
        `<option value="${escapeHtml(currency.code)}">${escapeHtml(
          formatCurrencyOption(currency)
        )}</option>`
    )
    .join("");

  if (
    currentValue &&
    filteredCurrencies.some((currency) => currency.code === currentValue)
  ) {
    currencyInput.value = currentValue;
    return;
  }

  if (filteredCurrencies.some((currency) => currency.code === "USD")) {
    currencyInput.value = "USD";
    return;
  }

  currencyInput.value = filteredCurrencies[0].code;
}

function populateReportingCurrencyOptions() {
  const filteredCurrencies = getAvailableCurrencies();
  const emptyMarkup = `<option value="">Валюты недоступны</option>`;

  if (filteredCurrencies.length === 0) {
    reportingCurrencyInput.innerHTML = emptyMarkup;
    if (homeReportingCurrencyInput) {
      homeReportingCurrencyInput.innerHTML = emptyMarkup;
    }
    return;
  }

  const optionsMarkup = filteredCurrencies
    .map(
      (currency) =>
        `<option value="${escapeHtml(currency.code)}">${escapeHtml(
          formatCurrencyOption(currency)
        )}</option>`
    )
    .join("");

  const compactMarkup = filteredCurrencies
    .map(
      (currency) =>
        `<option value="${escapeHtml(currency.code)}">${escapeHtml(currency.code)}</option>`
    )
    .join("");

  const currentValue =
    homeReportingCurrencyInput?.value ||
    reportingCurrencyInput.value ||
    getStoredReportingCurrency();

  reportingCurrencyInput.innerHTML = optionsMarkup;
  if (homeReportingCurrencyInput) {
    homeReportingCurrencyInput.innerHTML = compactMarkup;
  }

  if (
    currentValue &&
    filteredCurrencies.some((currency) => currency.code === currentValue)
  ) {
    syncReportingCurrencyInputs(currentValue);
    return;
  }

  if (filteredCurrencies.some((currency) => currency.code === "USD")) {
    syncReportingCurrencyInputs("USD");
    return;
  }

  syncReportingCurrencyInputs(filteredCurrencies[0].code);
}

function populateReportCategoryFilterOptions() {
  if (!reportCategoryFilterInput) {
    return;
  }

  const currentValue = reportCategoryFilterInput.value;
  const incomeList = state.categories
    .filter((category) => category.kind === "income")
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));
  const expenseList = state.categories
    .filter((category) => category.kind === "expense")
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));

  const incomeOptions = incomeList
    .map(
      (category) =>
        `<option value="${escapeHtml(category.id)}">${escapeHtml(category.name)}</option>`
    )
    .join("");

  const expenseOptions = expenseList
    .map(
      (category) =>
        `<option value="${escapeHtml(category.id)}">${escapeHtml(category.name)}</option>`
    )
    .join("");

  reportCategoryFilterInput.innerHTML =
    `<option value="">Все статьи</option>` +
    `<optgroup label="Доходы">${incomeOptions || `<option disabled value="">Нет статей</option>`}</optgroup>` +
    `<optgroup label="Расходы">${expenseOptions || `<option disabled value="">Нет статей</option>`}</optgroup>`;

  if (
    currentValue &&
    state.categories.some((category) => category.id === currentValue)
  ) {
    reportCategoryFilterInput.value = currentValue;
  }
}

function getStoredFxBoardDisplayBase() {
  try {
    return window.localStorage.getItem("fxBoardDisplayBase") ?? "";
  } catch {
    return "";
  }
}

function setStoredFxBoardDisplayBase(code) {
  try {
    const trimmed = String(code ?? "").trim().toUpperCase();

    if (trimmed) {
      window.localStorage.setItem("fxBoardDisplayBase", trimmed);
    } else {
      window.localStorage.removeItem("fxBoardDisplayBase");
    }
  } catch {
    //
  }
}

function formatFxReferenceNumeric(value, minimumFractionDigits, maximumFractionDigits) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits,
    maximumFractionDigits
  }).format(number);
}

function resolveFxBoardFallbackCode(currencies) {
  const codes = currencies.map((currency) => currency.code);
  const saved = getStoredFxBoardDisplayBase().trim().toUpperCase();

  if (saved && codes.includes(saved)) {
    return saved;
  }

  const reporting = currentReportingCurrencySelection()?.trim().toUpperCase();

  if (reporting && codes.includes(reporting)) {
    return reporting;
  }

  if (codes.includes("USD")) {
    return "USD";
  }

  return codes[0] ?? "";
}

function resolveFxCalcDefaultTo(currencies, fromCode) {
  const alternatives = currencies
    .map((currency) => currency.code)
    .filter((code) => code !== fromCode);

  if (alternatives.includes("EUR")) {
    return "EUR";
  }

  return alternatives[0] ?? fromCode;
}

function fillFxCurrencySelect(selectEl, currencies, fallbackCode, stickyValue) {
  if (!selectEl) {
    return "";
  }

  const codes = currencies.map((currency) => currency.code);

  selectEl.innerHTML = currencies
    .map((currency) => {
      const code = escapeHtml(currency.code);
      return `<option value="${code}">${code} · ${escapeHtml(currency.name)}</option>`;
    })
    .join("");

  const stickyCandidate = stickyValue?.trim()?.toUpperCase();
  let next =
    (stickyCandidate && codes.includes(stickyCandidate) ? stickyCandidate : "") ||
    (fallbackCode && codes.includes(fallbackCode) ? fallbackCode : "") ||
    codes[0] ||
    "";

  if (next && selectHasCurrencyCode(selectEl, next)) {
    selectEl.value = next;
  }

  return next;
}

function renderFxReferenceQuoteRows(payload) {
  if (!fxBoardRowsElement || !payload) {
    return;
  }

  if (!payload.rows || payload.rows.length === 0) {
    fxBoardRowsElement.innerHTML = `
      <div class="empty-state muted fx-quote-empty">
        Нет котировок: база совпадает с каждой из строк экрана выбора или включите активные коды USD, EUR и RUB.
      </div>
    `;

    return;
  }

  fxBoardRowsElement.innerHTML = payload.rows
    .map((row) => {
      const rawNominalLabel = String(row.label ?? `${row.displayUnit ?? 1} ${row.code}`).trim();
      const leftLabel = escapeHtml(rawNominalLabel);
      const flagEmoji = FX_REFERENCE_FLAGS[row.code] ?? "◌";
      const baseCode = escapeHtml(payload.base ?? "");
      const nominalValue = formatFxReferenceNumeric(row.amountInBase, 2, 4);
      const valueEsc = escapeHtml(String(nominalValue));

      return `
        <div class="fx-quote-row fx-quote-row--compact">
          <div class="fx-quote-left--compact">
            <span class="fx-flag-ring--compact" aria-hidden="true">${flagEmoji}</span>
            <span class="fx-quote-title">${leftLabel}</span>
          </div>
          <div class="fx-quote-values">
            <div class="fx-quote-values-line fx-quote-summary" title="Сколько единиц базовой валюты за указанный номинал строки">
              ${leftLabel}<span class="muted fx-quote-sep"> - </span><strong>${valueEsc}</strong><span class="fx-quote-ccy-inline">${baseCode}</span>
            </div>
          </div>
        </div>`;
    })
    .join("");
}

function applyFxRatesSummaryText(text = "") {
  if (!fxReferenceSummaryMetaElement) {
    return;
  }

  const trimmed = typeof text === "string" ? text.trim() : "";

  fxReferenceSummaryMetaElement.textContent =
    trimmed.length > 0 ? trimmed : "Справочные курсы и калькулятор";
}

async function refreshFxBoardQuotes() {
  if (!fxBoardBaseInput || !fxBoardRowsElement) {
    return;
  }

  const baseRaw = fxBoardBaseInput.value?.trim().toUpperCase();

  if (!baseRaw) {
    return;
  }

  if (!getInitData()) {
    fxBoardRowsElement.innerHTML = "";

    applyFxRatesSummaryText("");
    return;
  }

  applyFxRatesSummaryText("Подгружаем курс…");

  fxBoardRowsElement.innerHTML =
    `<div class="muted secondary-status fx-quote-loading">Подождите несколько секунд…</div>`;

  try {
    const data = await apiFetch(`/api/exchange-rates/quotes?base=${encodeURIComponent(baseRaw)}`);
    const updated =
      typeof data.ratesUpdatedAt === "string" && data.ratesUpdatedAt.trim()
        ? formatDateTime(data.ratesUpdatedAt)
        : "нет даты синхронизации — нажмите «Курсы» под списком счетов";

    applyFxRatesSummaryText(`Курс к ${data.base} · синхронизация: ${updated}`);
    renderFxReferenceQuoteRows(data);
  } catch (error) {
    console.error(error);
    applyFxRatesSummaryText(
      error instanceof Error ? error.message : "Не удалось загрузить справочный курс"
    );
    fxBoardRowsElement.innerHTML = `
      <div class="empty-state muted">
        Откройте экран синхронизации курсов или повторите позже после обновления данных.
      </div>
    `;
  }
}

function scheduleFxCalculatorRefresh() {
  if (!fxCalcResultElement || !fxCalcFromInput || !fxCalcToInput) {
    return;
  }

  window.clearTimeout(fxCalculatorTimer);
  fxCalculatorTimer = window.setTimeout(() => {
    void refreshFxCalculatorResult();
  }, 320);
}

async function refreshFxCalculatorResult() {
  if (!fxCalcResultElement || !fxCalcAmountInput || !fxCalcFromInput || !fxCalcToInput) {
    return;
  }

  fxCalcResultElement.classList.remove("fx-calc-result-error");

  const normalizedAmount = fxCalcAmountInput.value.replace(",", ".").trim();

  if (normalizedAmount === "") {
    fxCalcResultElement.textContent = "Укажите сумму или введите 0 для пробного перевода.";
    return;
  }

  const numericAmount = Number(normalizedAmount);
  const fromCode = fxCalcFromInput.value?.trim()?.toUpperCase();
  const toCode = fxCalcToInput.value?.trim()?.toUpperCase();

  if (!fromCode || !toCode) {
    fxCalcResultElement.textContent = "Выберите валюты для конвертации.";
    return;
  }

  if (!Number.isFinite(numericAmount)) {
    fxCalcResultElement.classList.add("fx-calc-result-error");
    fxCalcResultElement.textContent = "Укажите корректное числовое значение суммы.";
    return;
  }

  if (!getInitData()) {
    fxCalcResultElement.textContent = "Калькулятор станет доступен после загрузки сессии Telegram.";
    return;
  }

  if (fromCode === toCode) {
    const formattedSame = formatFxReferenceNumeric(numericAmount, 2, 6);
    fxCalcResultElement.textContent = `${formattedSame} ${fromCode} — перевод между одинаковыми валютами.`;
    return;
  }

  const requestGeneration = ++fxCalculatorRequestId;

  fxCalcResultElement.textContent = "Считаем…";

  try {
    const params = new URLSearchParams({
      amount: String(numericAmount),
      from: fromCode,
      to: toCode
    });

    const payload = await apiFetch(`/api/exchange-rates/convert-preview?${params.toString()}`);

    if (requestGeneration !== fxCalculatorRequestId) {
      return;
    }

    const convertedPretty = formatFxReferenceNumeric(payload.converted, 2, 8);
    const ratePretty = formatFxReferenceNumeric(payload.rate, 2, 8);

    fxCalcResultElement.textContent =
      `${convertedPretty} ${payload.to}` +
      `\nПри сумме ${formatFxReferenceNumeric(Number(payload.amount), 2, 6)} ${payload.from} средний коэффициент ≈ ${ratePretty}.`;

    fxCalcResultElement.classList.remove("fx-calc-result-error");
  } catch (error) {
    console.error(error);

    if (requestGeneration !== fxCalculatorRequestId) {
      return;
    }

    fxCalcResultElement.classList.add("fx-calc-result-error");
    fxCalcResultElement.textContent =
      error instanceof Error ? error.message : "Не удалось выполнить конвертацию";
  }
}

function syncFxReferencePanel() {
  if (
    !fxBoardBaseInput ||
    !fxBoardRowsElement ||
    !fxCalcAmountInput ||
    !fxCalcFromInput ||
    !fxCalcToInput
  ) {
    return;
  }

  const currencies = getAvailableCurrencies();

  if (!currencies.length) {
    fxBoardRowsElement.innerHTML =
      `<div class="muted secondary-status fx-quote-empty">Справочная таблица появится, когда приложение синхронизирует доступные коды.</div>`;

    applyFxRatesSummaryText("");
    return;
  }

  const fallbackBoardCode = resolveFxBoardFallbackCode(currencies);
  const stickyBoardPreference = fillFxCurrencySelect(
    fxBoardBaseInput,
    currencies,
    fallbackBoardCode,
    getStoredFxBoardDisplayBase() || fxBoardBaseInput.value
  );

  if (stickyBoardPreference) {
    setStoredFxBoardDisplayBase(stickyBoardPreference);
  }

  const fromSticky = fxCalcFromInput.value;
  const currencyCodesArr = currencies.map((currency) => currency.code);
  const reportingCode = currentReportingCurrencySelection()?.trim().toUpperCase();
  const calcFromFallback =
    reportingCode && currencyCodesArr.includes(reportingCode)
      ? reportingCode
      : resolveFxBoardFallbackCode(currencies);
  fillFxCurrencySelect(fxCalcFromInput, currencies, calcFromFallback, fromSticky || calcFromFallback);

  const computedFromCode = fxCalcFromInput.value;
  const stickyToCode = fxCalcToInput.value;
  const fallbackToCode = resolveFxCalcDefaultTo(currencies, computedFromCode);
  fillFxCurrencySelect(fxCalcToInput, currencies, fallbackToCode, stickyToCode || fallbackToCode);

  void refreshFxBoardQuotes();
  scheduleFxCalculatorRefresh();
}

function populateCategoryOptions() {
  if (!entryKindInput || !entryCategoryInput) {
    return;
  }

  const selectedKind = entryKindInput.value;
  const filteredCategories = state.categories.filter(
    (category) => category.kind === selectedKind
  );

  if (filteredCategories.length === 0) {
    entryCategoryInput.innerHTML = `<option value="">Сначала создайте категорию</option>`;
    return;
  }

  entryCategoryInput.innerHTML = filteredCategories
    .map((category) => {
      const g = getCategoryIconGlyph(readCategoryUiMeta(category.id).iconKey);
      return `<option value="${escapeHtml(category.id)}">${g} ${escapeHtml(category.name)}</option>`;
    })
    .join("");
}

function renderAll(options = {}) {
  const screen = options.activeScreen ?? document.body.dataset.appActiveScreen ?? "home";
  const partial = options.partial === true;

  safeRenderStep("summary", () => renderSummary(state.summary));

  if (!partial || screen === "accounts" || screen === "home" || screen === "activity" || screen === "transfer") {
    safeRenderStep("accounts", () => renderAccounts(state.accounts));
  }

  if (!partial || screen === "categories") {
    safeRenderStep("categories", () => renderCategories(state.categories));
  }

  if (!partial || screen === "ledger") {
    safeRenderStep("tgActivityFilters", () => populateTgActivityFilterSelects());
  }

  if (!partial || screen === "home" || screen === "activity" || screen === "transfer") {
    safeRenderStep("recentEntries", () => renderRecentEntries(state.recentEntries));
    safeRenderStep("recentTransfers", () => renderRecentTransfers(state.recentTransfers));
    safeRenderStep("homeActivity", () =>
      renderHomeRecentActivity(state.recentEntries, state.recentTransfers)
    );
    safeRenderStep("webActivityRecent", () =>
      renderWebActivityRecentList(state.recentEntries, state.recentTransfers)
    );
    safeRenderStep("webTransferRecent", () => renderWebTransferRecentList(state.recentTransfers));
  }

  safeRenderStep("report", () => {
    if (screen !== "reports") {
      return;
    }

    renderReport(state.report);

    if (!isWebMode && state.report) {
      renderReportWebVisuals(state.report);
    }
  });

  if (
    !partial ||
    screen === "activity" ||
    screen === "transfer" ||
    screen === "accounts" ||
    screen === "reports" ||
    screen === "home"
  ) {
    safeRenderStep("accountOptions", () => populateAccountOptions());
    safeRenderStep("categoryOptions", () => populateCategoryOptions());
  }

  if (!partial || screen === "reports") {
    safeRenderStep("currencyOptions", () => populateCurrencyOptions());
    safeRenderStep("reportingCurrencyOptions", () => populateReportingCurrencyOptions());
    safeRenderStep("reportCategoryFilterOptions", () => populateReportCategoryFilterOptions());
    safeRenderStep("reportAccountFilterOptions", () => populateReportFilterAccounts());
  }

  if (!partial || screen === "home") {
    safeRenderStep("fxReferencePanel", () => syncFxReferencePanel());
  }

  safeRenderStep("webProfile", () => syncWebProfile());
  applyBalancyHintsFromState();
}

function syncWebProfile() {
  if (!isWebMode) {
    return;
  }

  const user = state.user;
  if (!user) {
    if (webProfileMeta) {
      webProfileMeta.textContent = "Сессия не загружена.";
    }

    if (webSidebarUserNameElement) {
      webSidebarUserNameElement.textContent = "Профиль";
    }

    return;
  }

  const displayName = formatUserDisplayName(user);

  const telegramId = getTelegramUserIdForDisplay(user) ?? "—";

  if (webProfileMeta) {
    webProfileMeta.textContent = `${displayName} · Telegram ID ${telegramId}`;
  }

  if (webSidebarUserNameElement) {
    webSidebarUserNameElement.textContent = displayName;
  }
}

function clearWebSidebarProfileDropdownPosition() {
  if (!webProfileDropdown || !webProfileToggleButton?.closest(".web-profile-menu--sidebar")) {
    return;
  }

  webProfileDropdown.style.position = "";
  webProfileDropdown.style.top = "";
  webProfileDropdown.style.left = "";
  webProfileDropdown.style.right = "";
  webProfileDropdown.style.bottom = "";
  webProfileDropdown.style.width = "";
  webProfileDropdown.style.zIndex = "";
}

function closeWebNavDrawer() {
  document.body.classList.remove("web-nav-drawer-open");
  webSidebarBurgerBtn?.setAttribute("aria-expanded", "false");
  if (webNavDrawerBackdrop) {
    webNavDrawerBackdrop.hidden = true;
    webNavDrawerBackdrop.setAttribute("aria-hidden", "true");
  }
}

function openWebNavDrawer() {
  if (!isWebMode || window.innerWidth > 900) {
    return;
  }

  closeWebNewEntryMenu();
  document.body.classList.add("web-nav-drawer-open");
  webSidebarBurgerBtn?.setAttribute("aria-expanded", "true");
  if (webNavDrawerBackdrop) {
    webNavDrawerBackdrop.hidden = false;
    webNavDrawerBackdrop.setAttribute("aria-hidden", "false");
  }
}

function toggleWebNavDrawer() {
  if (document.body.classList.contains("web-nav-drawer-open")) {
    closeWebNavDrawer();
  } else {
    openWebNavDrawer();
  }
}

function positionWebSidebarProfileDropdown() {
  if (!isWebMode || !webProfileDropdown || !webProfileToggleButton) {
    return;
  }

  if (!webProfileToggleButton.closest(".web-profile-menu--sidebar")) {
    return;
  }

  if (webProfileDropdown.hidden) {
    clearWebSidebarProfileDropdownPosition();
    return;
  }

  const margin = 8;
  const toggleRect = webProfileToggleButton.getBoundingClientRect();
  const sidebarEl = webProfileToggleButton.closest(".web-sidebar");
  const sidebarRect = sidebarEl?.getBoundingClientRect();
  const inDrawer = window.innerWidth <= 900;
  const inCompactSidebar = sidebarRect && sidebarRect.width < 120;

  webProfileDropdown.style.position = "fixed";
  webProfileDropdown.style.zIndex = inDrawer ? "560" : "500";
  webProfileDropdown.style.width = "";
  webProfileDropdown.style.right = "auto";

  const dropdownWidth = webProfileDropdown.getBoundingClientRect().width || 248;
  let left = toggleRect.left;

  if (inDrawer && sidebarRect) {
    left = sidebarRect.left + 12;
  } else if (inCompactSidebar && sidebarRect) {
    left = sidebarRect.right + margin;
  }

  left = Math.max(margin, Math.min(left, window.innerWidth - dropdownWidth - margin));
  webProfileDropdown.style.left = `${left}px`;

  const dropdownHeight = webProfileDropdown.offsetHeight;
  let top = toggleRect.top - dropdownHeight - margin;

  if (top < margin) {
    top = toggleRect.bottom + margin;
  }

  const maxTop = window.innerHeight - dropdownHeight - margin;
  if (top > maxTop) {
    top = Math.max(margin, maxTop);
  }

  webProfileDropdown.style.top = `${top}px`;
  webProfileDropdown.style.bottom = "auto";
}

function closeWebProfileDropdown() {
  if (!webProfileDropdown || !webProfileToggleButton) {
    return;
  }

  webProfileDropdown.hidden = true;
  webProfileToggleButton.setAttribute("aria-expanded", "false");
  clearWebSidebarProfileDropdownPosition();
}

function closeWebNewEntryMenu() {
  if (!webNewEntryMenu || !webTopNavAddButton) {
    return;
  }

  webNewEntryMenu.hidden = true;
  webTopNavAddButton.setAttribute("aria-expanded", "false");
}

function toggleWebNewEntryMenu() {
  if (!webNewEntryMenu || !webTopNavAddButton) {
    return;
  }

  const opening = webNewEntryMenu.hidden;
  closeWebProfileDropdown();
  webNewEntryMenu.hidden = !opening;
  webTopNavAddButton.setAttribute("aria-expanded", String(opening));
}

function toggleWebProfileDropdown() {
  if (!webProfileDropdown || !webProfileToggleButton) {
    return;
  }

  closeWebNewEntryMenu();

  const nextHidden = !webProfileDropdown.hidden;
  webProfileDropdown.hidden = nextHidden;
  webProfileToggleButton.setAttribute("aria-expanded", String(!nextHidden));

  if (!nextHidden) {
    window.requestAnimationFrame(() => {
      positionWebSidebarProfileDropdown();
    });
  } else {
    clearWebSidebarProfileDropdownPosition();
  }
}

function isApiUnauthorizedError(error) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("unauthorized") || message.includes("http 401");
}

async function fetchWebLoginConfig() {
  if (webLoginConfigCache) {
    return webLoginConfigCache;
  }

  try {
    const response = await fetch(resolveFetchUrl("/api/web-login-config"), {
      credentials: "include",
      headers: {
        "ngrok-skip-browser-warning": "true",
        "bypass-tunnel-reminder": "true"
      }
    });
    const payload = await response.json().catch(() => ({}));
    webLoginConfigCache = {
      botUsername:
        typeof payload?.botUsername === "string" && payload.botUsername.trim()
          ? payload.botUsername.trim()
          : null,
      publicAppUrl:
        typeof payload?.publicAppUrl === "string" && payload.publicAppUrl.trim()
          ? payload.publicAppUrl.trim()
          : null
    };
  } catch {
    webLoginConfigCache = { botUsername: null, publicAppUrl: null };
  }

  return webLoginConfigCache;
}

/**
 * Короткая ссылка для приглашения. В TG mini app `window.location.href` бывает длинным (tgWebApp… и т.д.),
 * из‑за этого копировался мусор и переход мог вести «не туда». Берём APP_URL с сервера + `/mini-app/`.
 */
async function buildWorkspaceInviteClipboardUrl(token) {
  const raw = (await fetchWebLoginConfig()).publicAppUrl;
  const base =
    typeof raw === "string" && raw.trim().length > 0
      ? raw.replace(/\/+$/, "")
      : window.location.origin;

  const url = new URL("/mini-app/", `${base}/`);
  url.searchParams.set("invite", String(token).trim());
  /* Вне Telegram Mini App вход только через веб (?web=1 + Login Widget). Иначе моб. браузер не авторизуется. */
  url.searchParams.set("web", "1");

  return url.toString();
}

async function mountWebTelegramLoginWidget() {
  if (!webLoginWidgetHost || webLoginWidgetMounted) {
    return;
  }

  const config = await fetchWebLoginConfig();

  webLoginWidgetHost.innerHTML = "";

  if (!config.botUsername) {
    webLoginWidgetHost.innerHTML =
      '<p class="inline-error">На сервере не задан <code>TELEGRAM_BOT_USERNAME</code> — вход через Telegram недоступен.</p>';
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://telegram.org/js/telegram-widget.js?22";
  script.setAttribute("data-telegram-login", config.botUsername);
  script.setAttribute("data-size", "large");
  script.setAttribute("data-lang", "ru");
  script.setAttribute("data-auth-url", "/auth/telegram/callback");
  script.setAttribute("data-request-access", "write");
  webLoginWidgetHost.appendChild(script);
  webLoginWidgetMounted = true;
}


let workspaceUiAttached = false;

function markWebWorkspaceModeSeen() {
  try {
    localStorage.setItem(WEB_WORKSPACE_MODE_SEEN_KEY, "1");
  } catch {
    //
  }
}

function hasSeenWebWorkspaceModeChoice() {
  try {
    return localStorage.getItem(WEB_WORKSPACE_MODE_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function getPendingWebInviteToken() {
  try {
    return sessionStorage.getItem(WEB_INVITE_TOKEN_SESSION_KEY)?.trim() || "";
  } catch {
    return "";
  }
}

function clearPendingWebInviteToken() {
  try {
    sessionStorage.removeItem(WEB_INVITE_TOKEN_SESSION_KEY);
  } catch {
    //
  }
}

function applyWorkspacePayload(payload) {
  if (payload?.workspace && typeof payload.workspace === "object") {
    state.workspace = payload.workspace;
  }

  if (Array.isArray(payload?.workspaces)) {
    state.workspaces = payload.workspaces;
  } else if (payload && "workspaces" in payload && payload.workspaces == null) {
    state.workspaces = [];
  }

  syncWorkspaceChrome();
}

function workspaceKindLabel(kind) {
  return kind === "team" ? "Команда" : "Личное";
}

function formatWorkspaceMemberLabel(member) {
  const name = [member.firstName, member.lastName].filter(Boolean).join(" ").trim();
  if (name) {
    return name;
  }

  if (member.username) {
    return `@${member.username}`;
  }

  return "Участник";
}

function shouldShowWorkspaceModeChoice() {
  if (!state.user) {
    return false;
  }

  if (getPendingWebInviteToken()) {
    return false;
  }

  if (hasSeenWebWorkspaceModeChoice()) {
    return false;
  }

  return !state.workspaces.some((item) => item.kind === "team");
}

function setWebModeChoiceError(message = "") {
  if (!webModeChoiceErrorElement) {
    return;
  }

  const text = String(message ?? "").trim();
  webModeChoiceErrorElement.hidden = !text;
  webModeChoiceErrorElement.textContent = text;
}

function showWebModeChoice() {
  if (!webModeChoiceElement) {
    return;
  }

  document.body.classList.add("web-mode-choice-open", "workspace-mode-choice-open");
  webModeChoiceElement.hidden = false;
  setWebModeChoiceError("");
}

function hideWebModeChoice() {
  if (!webModeChoiceElement) {
    return;
  }

  document.body.classList.remove("web-mode-choice-open", "workspace-mode-choice-open");
  webModeChoiceElement.hidden = true;
  setWebModeChoiceError("");

  if (webModeChoiceTeamPanelElement) {
    webModeChoiceTeamPanelElement.hidden = true;
  }
}

function setWorkspaceInviteGateError(message = "") {
  if (!workspaceInviteGateErrorElement) {
    return;
  }

  const text = String(message ?? "").trim();
  workspaceInviteGateErrorElement.hidden = !text;
  workspaceInviteGateErrorElement.textContent = text;
}

function showWorkspaceInviteGate(workspace) {
  if (!workspaceInviteGateElement) {
    return;
  }

  document.body.classList.add("workspace-invite-gate-open", "workspace-mode-choice-open");
  workspaceInviteGateElement.hidden = false;
  setWorkspaceInviteGateError("");

  if (workspaceInviteGateTeamNameElement) {
    workspaceInviteGateTeamNameElement.textContent = workspace?.name || "Команда";
  }

  if (workspaceInviteGateMetaElement) {
    const count = workspace?.memberCount ?? 1;
    const max = workspace?.maxMembers ?? 5;
    workspaceInviteGateMetaElement.textContent = `${count} из ${max} участников уже в команде`;
  }
}

function hideWorkspaceInviteGate() {
  if (workspaceInviteGateElement) {
    workspaceInviteGateElement.hidden = true;
  }

  document.body.classList.remove("workspace-invite-gate-open");
  setWorkspaceInviteGateError("");

  if (!webModeChoiceElement || webModeChoiceElement.hidden) {
    document.body.classList.remove("workspace-mode-choice-open");
  }
}

async function continueWorkspaceBootAfterInviteGate() {
  if (shouldShowWorkspaceModeChoice()) {
    showWebModeChoice();
    return;
  }

  hideWebModeChoice();
  hideWorkspaceInviteGate();
}

function reportWorkspaceInviteMessage(message, kind = "error") {
  const text = String(message ?? "").trim();

  if (!text) {
    return;
  }

  if (document.body.classList.contains("workspace-invite-gate-open")) {
    setWorkspaceInviteGateError(text);
    return;
  }

  if (shouldShowWorkspaceModeChoice()) {
    showWebModeChoice();
    setWebModeChoiceError(text);
    return;
  }

  setStatus(text, kind);
}

async function resolvePendingInviteForCurrentUser(workspace) {
  const existing = Array.isArray(state.workspaces)
    ? state.workspaces.find((item) => item.id === workspace.id)
    : undefined;

  if (existing) {
    clearPendingWebInviteToken();
    hideWorkspaceInviteGate();
    hideWebModeChoice();
    document.body.classList.remove("workspace-mode-choice-open");

    if (state.workspace?.id !== workspace.id) {
      await switchWebWorkspace(workspace.id);
    }

    reportWorkspaceInviteMessage(
      existing.role === "owner"
        ? "Вы уже владелец этой команды. Открыли её для вас."
        : "Вы уже в этой команде.",
      "success"
    );
    return true;
  }

  const otherTeam = Array.isArray(state.workspaces)
    ? state.workspaces.find((item) => item.kind === "team")
    : undefined;

  if (otherTeam) {
    clearPendingWebInviteToken();
    hideWorkspaceInviteGate();
    hideWebModeChoice();
    document.body.classList.remove("workspace-mode-choice-open");
    reportWorkspaceInviteMessage(
      `Вы уже в команде «${otherTeam.name}». Сначала выйдите из неё в настройках.`,
      "error"
    );
    return true;
  }

  return false;
}

async function maybeShowWorkspaceInviteGate(token) {
  try {
    const payload = await apiFetch(`/api/workspaces/invites/${encodeURIComponent(token)}`);
    const workspace = payload?.workspace;

    if (!workspace) {
      throw new Error("Приглашение не найдено");
    }

    if (await resolvePendingInviteForCurrentUser(workspace)) {
      return false;
    }

    showWorkspaceInviteGate(workspace);
    return true;
  } catch (error) {
    clearPendingWebInviteToken();
    reportWorkspaceInviteMessage(
      error instanceof Error ? error.message : "Не удалось загрузить приглашение"
    );
    return false;
  }
}

async function finalizeWorkspaceBoot() {
  const token = getPendingWebInviteToken();

  if (token && state.user) {
    const previewShown = await maybeShowWorkspaceInviteGate(token);

    if (previewShown) {
      return;
    }
  }

  if (shouldShowWorkspaceModeChoice()) {
    showWebModeChoice();
    return;
  }

  hideWebModeChoice();
  hideWorkspaceInviteGate();
}

async function switchWebWorkspace(workspaceId) {
  const id = String(workspaceId ?? "").trim();

  if (!id || state.workspace?.id === id) {
    return;
  }

  await apiFetch("/api/workspaces/switch", {
    method: "POST",
    body: JSON.stringify({ workspaceId: id })
  });

  state.webOperationsLastPayload = null;
  await refreshAppData({
    globalBusy: true,
    busyMessage: "Переключаем пространство…",
    syncWebOperationsHistory: true
  });
}

async function createWebTeamWorkspace(name) {
  const payload = await apiFetch("/api/workspaces/team", {
    method: "POST",
    body: JSON.stringify({ name })
  });

  if (payload?.workspace) {
    state.workspace = payload.workspace;
  }

  markWebWorkspaceModeSeen();
  state.webOperationsLastPayload = null;
  await refreshAppData({
    globalBusy: true,
    busyMessage: "Создаём команду…",
    syncWebOperationsHistory: true
  });
}

async function tryAcceptPendingWebInvite() {
  const token = getPendingWebInviteToken();

  if (!token) {
    reportWorkspaceInviteMessage("Ссылка приглашения устарела. Откройте новую ссылку от владельца команды.");
    return false;
  }

  if (!state.user) {
    reportWorkspaceInviteMessage("Сначала войдите через Telegram, затем нажмите «Вступить» снова.");
    return false;
  }

  try {
    const payload = await apiFetch(`/api/workspaces/invites/${encodeURIComponent(token)}/accept`, {
      method: "POST"
    });

    if (payload?.workspace) {
      applyWorkspacePayload({ workspace: payload.workspace });
    }

    clearPendingWebInviteToken();
    markWebWorkspaceModeSeen();
    hideWorkspaceInviteGate();
    hideWebModeChoice();
    document.body.classList.remove("workspace-mode-choice-open");
    state.webOperationsLastPayload = null;

    await refreshAppData({
      globalBusy: true,
      busyMessage: "Подключаем к команде…",
      syncWebOperationsHistory: true
    });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось принять приглашение";
    reportWorkspaceInviteMessage(message);
    return false;
  }
}

function buildWorkspaceSwitcherButton(workspace, options = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = options.className ?? "web-workspace-switcher-item";
  button.dataset.workspaceId = workspace.id;

  if (workspace.id === state.workspace?.id) {
    button.classList.add("is-active");
    button.setAttribute("aria-current", "true");
  }

  const title = document.createElement("span");
  title.className = options.titleClassName ?? "web-workspace-switcher-item-title";
  title.textContent = workspace.name || workspaceKindLabel(workspace.kind);

  const meta = document.createElement("span");
  meta.className = options.metaClassName ?? "muted web-workspace-switcher-item-meta";
  meta.textContent =
    workspace.kind === "team"
      ? `${workspaceKindLabel(workspace.kind)} · ${workspace.memberCount ?? 1}/${workspace.maxMembers ?? 5}`
      : workspaceKindLabel(workspace.kind);

  button.append(title, meta);
  button.addEventListener("click", () => {
    void (async () => {
      if (typeof options.onBeforeSwitch === "function") {
        options.onBeforeSwitch();
      }

      try {
        await switchWebWorkspace(workspace.id);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Не удалось переключить", "error");
      }
    })();
  });

  return button;
}

function renderWebWorkspaceSwitcher() {
  if (!isWebMode || !webWorkspaceSwitcherElement || !webWorkspaceSwitcherListElement) {
    return;
  }

  const workspaces = Array.isArray(state.workspaces) ? state.workspaces : [];
  const showSwitcher = workspaces.length > 1;

  webWorkspaceSwitcherElement.hidden = !showSwitcher;

  if (!showSwitcher) {
    webWorkspaceSwitcherListElement.replaceChildren();
    return;
  }

  webWorkspaceSwitcherListElement.replaceChildren();

  workspaces.forEach((workspace) => {
    webWorkspaceSwitcherListElement.appendChild(
      buildWorkspaceSwitcherButton(workspace, {
        onBeforeSwitch: () => closeWebProfileDropdown()
      })
    );
  });
}

function renderTgWorkspaceTools() {
  if (isWebMode || !tgWorkspaceCardElement) {
    return;
  }

  const workspaces = Array.isArray(state.workspaces) ? state.workspaces : [];
  const active = state.workspace;
  const hasTeam = workspaces.some((item) => item.kind === "team");

  if (tgWorkspaceActiveMetaElement && active) {
    const kindLabel = workspaceKindLabel(active.kind);
    tgWorkspaceActiveMetaElement.textContent =
      active.kind === "team"
        ? `${kindLabel}: ${active.name} · ${active.memberCount ?? 1}/${active.maxMembers ?? 5}`
        : `${kindLabel}: ${active.name}`;
  }

  if (tgWorkspaceSwitcherListElement) {
    const showSwitcher = workspaces.length > 1;
    tgWorkspaceSwitcherListElement.hidden = !showSwitcher;
    tgWorkspaceSwitcherListElement.replaceChildren();

    if (showSwitcher) {
      workspaces.forEach((workspace) => {
        tgWorkspaceSwitcherListElement.appendChild(
          buildWorkspaceSwitcherButton(workspace, {
            className: "tg-workspace-switcher-item",
            titleClassName: "tg-workspace-switcher-item-title",
            metaClassName: "muted tg-workspace-switcher-item-meta"
          })
        );
      });
    }
  }

  if (tgWorkspaceCreateTeamButtonElement) {
    tgWorkspaceCreateTeamButtonElement.hidden = hasTeam || !tgCreateTeamPanelElement?.hidden;
  }
}

function setTgCreateTeamError(message = "") {
  if (!tgCreateTeamErrorElement) {
    return;
  }

  const text = String(message ?? "").trim();
  tgCreateTeamErrorElement.hidden = !text;
  tgCreateTeamErrorElement.textContent = text;
}

function showTgCreateTeamPanel() {
  if (!tgCreateTeamPanelElement) {
    return;
  }

  tgCreateTeamPanelElement.hidden = false;

  if (tgWorkspaceCreateTeamButtonElement) {
    tgWorkspaceCreateTeamButtonElement.hidden = true;
  }

  setTgCreateTeamError("");
  tgCreateTeamNameInputElement?.focus();
}

function hideTgCreateTeamPanel() {
  if (tgCreateTeamPanelElement) {
    tgCreateTeamPanelElement.hidden = true;
  }

  if (tgCreateTeamNameInputElement) {
    tgCreateTeamNameInputElement.value = "";
  }

  setTgCreateTeamError("");

  const hasTeam = Array.isArray(state.workspaces)
    ? state.workspaces.some((item) => item.kind === "team")
    : false;

  if (tgWorkspaceCreateTeamButtonElement) {
    tgWorkspaceCreateTeamButtonElement.hidden = hasTeam;
  }
}

function syncWebTeamSettingsCardVisibility() {
  if (!webTeamSettingsCardElement) {
    return;
  }

  const isTeam = state.workspace?.kind === "team";
  webTeamSettingsCardElement.hidden = !isTeam;
}

async function loadWebTeamSettings() {
  if (state.workspace?.kind !== "team") {
    return;
  }

  if (webTeamSettingsErrorElement) {
    webTeamSettingsErrorElement.hidden = true;
    webTeamSettingsErrorElement.textContent = "";
  }

  const workspace = state.workspace;
  const title = workspace.name || "Команда";

  if (webTeamSettingsTitleElement) {
    webTeamSettingsTitleElement.textContent = title;
  }

  if (webTeamNameInputElement) {
    webTeamNameInputElement.value = title;
  }

  if (webTeamSettingsMetaElement) {
    webTeamSettingsMetaElement.textContent = `${workspace.memberCount ?? 1} из ${workspace.maxMembers ?? 5} участников`;
  }

  const isOwner = workspace.role === "owner";

  if (webTeamInviteBlockElement) {
    webTeamInviteBlockElement.hidden = !isOwner;
  }

  if (webTeamLeaveButtonElement) {
    webTeamLeaveButtonElement.hidden = isOwner;
  }

  if (webTeamLeaveOwnerHintElement) {
    webTeamLeaveOwnerHintElement.hidden = !isOwner;
  }

  if (webTeamRenameButtonElement) {
    webTeamRenameButtonElement.hidden = !isOwner;
  }

  if (webTeamNameInputElement) {
    webTeamNameInputElement.readOnly = !isOwner;
  }

  try {
    const payload = await apiFetch("/api/workspaces/members");
    const members = Array.isArray(payload.members) ? payload.members : [];

    if (webTeamMembersListElement) {
      webTeamMembersListElement.replaceChildren();

      if (members.length === 0) {
        const empty = document.createElement("li");
        empty.className = "muted";
        empty.textContent = "Пока нет участников";
        webTeamMembersListElement.appendChild(empty);
      } else {
        members.forEach((member) => {
          const item = document.createElement("li");
          item.className = "web-team-member-item";

          const name = document.createElement("span");
          name.textContent = formatWorkspaceMemberLabel(member);

          const role = document.createElement("span");
          role.className = "muted web-team-member-role";
          role.textContent = member.role === "owner" ? "Владелец" : "Участник";

          item.append(name, role);
          webTeamMembersListElement.appendChild(item);
        });
      }
    }

    if (isOwner) {
      await loadWebTeamInvitesList();
    } else if (webTeamInvitesBlockElement) {
      webTeamInvitesBlockElement.hidden = true;
    }
  } catch (error) {
    if (webTeamSettingsErrorElement) {
      webTeamSettingsErrorElement.hidden = false;
      webTeamSettingsErrorElement.textContent =
        error instanceof Error ? error.message : "Не удалось загрузить участников";
    }
  }
}

function formatWorkspaceInviteCreatedAt(value) {
  if (!value) {
    return "Ссылка";
  }

  try {
    return `Создана ${new Date(value).toLocaleString("ru-RU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    })}`;
  } catch {
    return "Ссылка";
  }
}

async function loadWebTeamInvitesList() {
  if (state.workspace?.role !== "owner" || !webTeamInvitesListElement) {
    return;
  }

  try {
    const payload = await apiFetch("/api/workspaces/invites");
    const invites = Array.isArray(payload?.invites) ? payload.invites : [];

    webTeamInvitesListElement.replaceChildren();

    if (webTeamInvitesBlockElement) {
      webTeamInvitesBlockElement.hidden = invites.length === 0;
    }

    invites.forEach((invite) => {
      const item = document.createElement("li");
      item.className = "web-team-invite-item";

      const tokenStr = typeof invite.token === "string" ? invite.token : "";
      const tokenHint =
        tokenStr.length > 14 ? `${tokenStr.slice(0, 8)}…${tokenStr.slice(-6)}` : tokenStr;

      const label = document.createElement("span");
      label.className = "web-team-invite-item-label";
      label.textContent = `${formatWorkspaceInviteCreatedAt(invite.createdAt)} · ${tokenHint}`;

      const actions = document.createElement("div");
      actions.className = "web-team-invite-item-actions";

      const copyButton = document.createElement("button");
      copyButton.type = "button";
      copyButton.className = "ghost-button web-team-invite-copy";
      copyButton.textContent = "Копировать";
      copyButton.addEventListener("click", () => {
        void (async () => {
          if (!tokenStr) {
            setStatus("Нет токена приглашения", "error");
            return;
          }

          try {
            const link = await buildWorkspaceInviteClipboardUrl(tokenStr);
            await navigator.clipboard.writeText(link);
            setStatus("Ссылка скопирована в буфер обмена", "success");
          } catch (error) {
            setStatus(error instanceof Error ? error.message : "Не удалось скопировать", "error");
          }
        })();
      });

      const revokeButton = document.createElement("button");
      revokeButton.type = "button";
      revokeButton.className = "ghost-button web-team-invite-revoke";
      revokeButton.textContent = "Отозвать";
      revokeButton.addEventListener("click", () => {
        void (async () => {
          try {
            await apiFetch(`/api/workspaces/invites/${encodeURIComponent(invite.id)}`, {
              method: "DELETE"
            });
            await loadWebTeamInvitesList();
            setStatus("Ссылка отозвана", "success");
          } catch (error) {
            if (webTeamSettingsErrorElement) {
              webTeamSettingsErrorElement.hidden = false;
              webTeamSettingsErrorElement.textContent =
                error instanceof Error ? error.message : "Не удалось отозвать ссылку";
            }
          }
        })();
      });

      actions.append(copyButton, revokeButton);
      item.append(label, actions);
      webTeamInvitesListElement.appendChild(item);
    });
  } catch (error) {
    if (webTeamSettingsErrorElement) {
      webTeamSettingsErrorElement.hidden = false;
      webTeamSettingsErrorElement.textContent =
        error instanceof Error ? error.message : "Не удалось загрузить приглашения";
    }
  }
}

async function leaveCurrentTeamWorkspace() {
  const payload = await apiFetch("/api/workspaces/team/leave", { method: "POST" });
  applyWorkspacePayload(payload);
  state.webOperationsLastPayload = null;
  await refreshAppData({
    globalBusy: true,
    busyMessage: "Переключаемся на личное…",
    syncWebOperationsHistory: true
  });
  setStatus("Вы вышли из команды", "success");
}

function syncWorkspaceChrome() {
  renderWebWorkspaceSwitcher();
  renderTgWorkspaceTools();
  syncWebTeamSettingsCardVisibility();
  syncWebProfile();

  if (isWebMode) {
    const hint = document.querySelector(".web-sidebar-user-hint");
    if (hint && state.workspace) {
      hint.textContent =
        state.workspace.kind === "team"
          ? `Команда · ${state.workspace.name}`
          : "Личное · Настройки";
    }
  }

  syncOperationAuthorChrome();
}

function attachWorkspaceUi() {
  if (workspaceUiAttached) {
    return;
  }

  workspaceUiAttached = true;

  webModeChoicePersonalButton?.addEventListener("click", () => {
    void (async () => {
      setWebModeChoiceError("");
      markWebWorkspaceModeSeen();

      const personal = state.workspaces.find((item) => item.kind === "personal");

      try {
        if (personal && personal.id !== state.workspace?.id) {
          await switchWebWorkspace(personal.id);
        } else {
          hideWebModeChoice();
        }
      } catch (error) {
        setWebModeChoiceError(error instanceof Error ? error.message : "Не удалось выбрать режим");
      }
    })();
  });

  webModeChoiceTeamButton?.addEventListener("click", () => {
    if (webModeChoiceTeamPanelElement) {
      webModeChoiceTeamPanelElement.hidden = false;
    }

    webModeChoiceTeamNameInput?.focus();
    setWebModeChoiceError("");
  });

  webModeChoiceTeamSubmitButton?.addEventListener("click", () => {
    void (async () => {
      const name = webModeChoiceTeamNameInput?.value?.trim() ?? "";

      if (!name) {
        setWebModeChoiceError("Введите название команды");
        return;
      }

      setWebModeChoiceError("");

      try {
        webModeChoiceTeamSubmitButton.disabled = true;
        await createWebTeamWorkspace(name);
        hideWebModeChoice();
      } catch (error) {
        setWebModeChoiceError(error instanceof Error ? error.message : "Не удалось создать команду");
      } finally {
        if (webModeChoiceTeamSubmitButton) {
          webModeChoiceTeamSubmitButton.disabled = false;
        }
      }
    })();
  });

  webTeamRenameButtonElement?.addEventListener("click", () => {
    void (async () => {
      const name = webTeamNameInputElement?.value?.trim() ?? "";

      if (!name) {
        if (webTeamSettingsErrorElement) {
          webTeamSettingsErrorElement.hidden = false;
          webTeamSettingsErrorElement.textContent = "Введите название";
        }
        return;
      }

      if (webTeamSettingsErrorElement) {
        webTeamSettingsErrorElement.hidden = true;
        webTeamSettingsErrorElement.textContent = "";
      }

      try {
        const payload = await apiFetch("/api/workspaces/team/name", {
          method: "PATCH",
          body: JSON.stringify({ name })
        });

        if (payload?.workspace) {
          state.workspace = payload.workspace;
          const idx = state.workspaces.findIndex((item) => item.id === payload.workspace.id);
          if (idx >= 0) {
            state.workspaces[idx] = payload.workspace;
          }
        }

        syncWorkspaceChrome();
        setStatus("Название команды сохранено", "success");
      } catch (error) {
        if (webTeamSettingsErrorElement) {
          webTeamSettingsErrorElement.hidden = false;
          webTeamSettingsErrorElement.textContent =
            error instanceof Error ? error.message : "Не удалось сохранить";
        }
      }
    })();
  });

  tgWorkspaceCreateTeamButtonElement?.addEventListener("click", () => {
    if (isWebMode) {
      showWebModeChoice();
      if (webModeChoiceTeamPanelElement) {
        webModeChoiceTeamPanelElement.hidden = false;
      }
      webModeChoiceTeamNameInput?.focus();
      setWebModeChoiceError("");
      return;
    }

    showTgCreateTeamPanel();
  });

  tgCreateTeamCancelButtonElement?.addEventListener("click", () => {
    hideTgCreateTeamPanel();
  });

  tgCreateTeamSubmitButtonElement?.addEventListener("click", () => {
    void (async () => {
      const name = tgCreateTeamNameInputElement?.value?.trim() ?? "";

      if (!name) {
        setTgCreateTeamError("Введите название команды");
        return;
      }

      setTgCreateTeamError("");

      try {
        if (tgCreateTeamSubmitButtonElement) {
          tgCreateTeamSubmitButtonElement.disabled = true;
        }

        await createWebTeamWorkspace(name);
        hideTgCreateTeamPanel();
        setStatus("Команда создана", "success");
      } catch (error) {
        setTgCreateTeamError(error instanceof Error ? error.message : "Не удалось создать команду");
      } finally {
        if (tgCreateTeamSubmitButtonElement) {
          tgCreateTeamSubmitButtonElement.disabled = false;
        }
      }
    })();
  });

  workspaceInviteAcceptButtonElement?.addEventListener("click", () => {
    void (async () => {
      setWorkspaceInviteGateError("");

      try {
        if (workspaceInviteAcceptButtonElement) {
          workspaceInviteAcceptButtonElement.disabled = true;
        }

        const accepted = await tryAcceptPendingWebInvite();

        if (accepted) {
          setStatus("Вы вступили в команду", "success");
        } else if (
          workspaceInviteGateErrorElement?.hidden !== false &&
          !workspaceInviteGateErrorElement?.textContent?.trim()
        ) {
          setWorkspaceInviteGateError("Не удалось вступить. Попробуйте ещё раз или откройте новую ссылку.");
        }
      } catch (error) {
        setWorkspaceInviteGateError(
          error instanceof Error ? error.message : "Не удалось принять приглашение"
        );
      } finally {
        if (workspaceInviteAcceptButtonElement) {
          workspaceInviteAcceptButtonElement.disabled = false;
        }
      }
    })();
  });

  workspaceInviteDeclineButtonElement?.addEventListener("click", () => {
    clearPendingWebInviteToken();
    hideWorkspaceInviteGate();
    void continueWorkspaceBootAfterInviteGate();
  });

  webTeamCopyInviteButtonElement?.addEventListener("click", () => {
    void (async () => {
      if (webTeamInviteStatusElement) {
        webTeamInviteStatusElement.hidden = true;
        webTeamInviteStatusElement.textContent = "";
      }

      try {
        const payload = await apiFetch("/api/workspaces/invites", { method: "POST" });
        const token = payload?.invite?.token;

        if (!token) {
          throw new Error("Сервер не вернул токен приглашения");
        }

        const link = await buildWorkspaceInviteClipboardUrl(token);
        await navigator.clipboard.writeText(link);

        if (webTeamInviteStatusElement) {
          webTeamInviteStatusElement.hidden = false;
          webTeamInviteStatusElement.textContent = "Ссылка скопирована в буфер обмена";
        }

        await loadWebTeamInvitesList();
      } catch (error) {
        if (webTeamSettingsErrorElement) {
          webTeamSettingsErrorElement.hidden = false;
          webTeamSettingsErrorElement.textContent =
            error instanceof Error ? error.message : "Не удалось создать ссылку";
        }
      }
    })();
  });

  webTeamLeaveButtonElement?.addEventListener("click", () => {
    void (async () => {
      if (
        !window.confirm(
          "Покинуть команду? Вы переключитесь на личное пространство. Общие данные команды останутся у других участников."
        )
      ) {
        return;
      }

      if (webTeamSettingsErrorElement) {
        webTeamSettingsErrorElement.hidden = true;
        webTeamSettingsErrorElement.textContent = "";
      }

      try {
        webTeamLeaveButtonElement.disabled = true;
        await leaveCurrentTeamWorkspace();
      } catch (error) {
        if (webTeamSettingsErrorElement) {
          webTeamSettingsErrorElement.hidden = false;
          webTeamSettingsErrorElement.textContent =
            error instanceof Error ? error.message : "Не удалось покинуть команду";
        }
      } finally {
        if (webTeamLeaveButtonElement) {
          webTeamLeaveButtonElement.disabled = false;
        }
      }
    })();
  });
}


function showWebLoginGate(errorMessage = "") {
  if (!isWebMode || !webLoginGateElement) {
    return;
  }

  document.body.classList.add("web-login-gate-open");
  webLoginGateElement.hidden = false;

  if (webLoginGateErrorElement) {
    const text = String(errorMessage ?? "").trim();
    webLoginGateErrorElement.hidden = !text;
    webLoginGateErrorElement.textContent = text;
  }

  void mountWebTelegramLoginWidget();
}

function hideWebLoginGate() {
  if (!webLoginGateElement) {
    return;
  }

  document.body.classList.remove("web-login-gate-open");
  webLoginGateElement.hidden = true;

  if (webLoginGateErrorElement) {
    webLoginGateErrorElement.hidden = true;
    webLoginGateErrorElement.textContent = "";
  }
}

async function handleWebLogout() {
  try {
    await fetch(resolveFetchUrl("/auth/logout"), {
      method: "POST",
      credentials: "include"
    });
  } finally {
    state.user = null;
    state.workspace = null;
    state.workspaces = [];
    state.webOperationsLastPayload = null;
    hideWebModeChoice();
    showWebLoginGate();
  }
}

function resolveFetchUrl(url) {
  if (typeof url !== "string") {
    return url;
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  try {
    return new URL(url, window.location.origin).href;
  } catch {
    return url;
  }
}

function buildReportQueryString() {
  const params = new URLSearchParams();
  const period = reportPeriodInput?.value ?? "month";
  params.set("period", period);
  params.set("reportingCurrency", currentReportingCurrencySelection());

  if (period === "custom" && reportStartDateInput && reportEndDateInput) {
    params.set("startDate", toIsoDate(toDateRangeStart(reportStartDateInput.value)));
    params.set("endDate", toIsoDate(toDateRangeEnd(reportEndDateInput.value)));
  }

  const filterCategoryId = reportCategoryFilterInput?.value?.trim();
  if (filterCategoryId) {
    params.set("categoryId", filterCategoryId);
  }

  const filterAccountId = reportAccountFilterInput?.value?.trim();
  if (filterAccountId) {
    params.set("accountId", filterAccountId);
  }

  const filterKind = reportKindFilterInput?.value?.trim();
  if (filterKind === "income" || filterKind === "expense") {
    params.set("kind", filterKind);
  }

  return params.toString();
}

function reportCsvSuggestedFilename() {
  if (
    typeof state.report?.startDate === "string" &&
    typeof state.report?.endDate === "string"
  ) {
    const startDay = state.report.startDate.slice(0, 10).replace(/-/g, "");
    const endDay = state.report.endDate.slice(0, 10).replace(/-/g, "");
    return `balancy-report-${startDay}-${endDay}.csv`;
  }

  return "balancy-report.csv";
}

async function authenticatedFetchRaw(url, options = {}) {
  const method = String(options.method ?? "GET").toUpperCase();
  const optionHeaders = { ...(options.headers ?? {}) };

  const initData = getInitData();

  return fetch(resolveFetchUrl(url), {
    ...options,
    credentials: "include",
    method,
    headers: {
      ...optionHeaders,
      ...(initData ? { "x-telegram-init-data": initData } : {}),
      "ngrok-skip-browser-warning": "true",
      "bypass-tunnel-reminder": "true"
    }
  });
}

async function apiFetch(url, options = {}) {
  const method = String(options.method ?? "GET").toUpperCase();
  const optionHeaders = { ...(options.headers ?? {}) };
  const rawBody = options.body;
  const initData = getInitData();
  const hasBody =
    rawBody !== undefined &&
    rawBody !== null &&
    !(typeof rawBody === "string" && rawBody.length === 0);

  const headers = {
    ...optionHeaders,
    "Content-Type":
      optionHeaders["Content-Type"] ??
      (method === "GET" || method === "HEAD" || !hasBody
        ? undefined
        : "application/json"),
    "ngrok-skip-browser-warning": "true",
    "bypass-tunnel-reminder": "true"
  };

  if (initData) {
    headers["x-telegram-init-data"] = initData;
  }

  if (headers["Content-Type"] === undefined) {
    delete headers["Content-Type"];
  }

  const response = await fetch(resolveFetchUrl(url), {
    ...options,
    credentials: "include",
    headers
  });

  const responseText = await response.text();
  const trimmed = responseText.trim();
  const contentType = response.headers.get("content-type") ?? "";
  const declaresJson = contentType.includes("application/json");

  let payload = {};
  let usableJson = trimmed.length === 0;

  if (trimmed.length > 0) {
    const tryParse = declaresJson || trimmed.startsWith("{") || trimmed.startsWith("[");
    if (tryParse) {
      try {
        payload = JSON.parse(responseText);
        usableJson = true;
      } catch {
        usableJson = false;
        payload = { error: stripHtmlToSnippet(responseText) };
      }
    } else {
      usableJson = false;
      payload = { error: stripHtmlToSnippet(responseText) };
    }
  }

  if (!response.ok) {
    const message =
      typeof payload?.error === "string" && payload.error
        ? payload.error
        : `HTTP ${response.status}`;
    throw new Error(message);
  }

  if (!usableJson && trimmed.length > 0) {
    const hint =
      /ngrok|loca\.lt|tunnel/i.test(trimmed)
        ? " Похоже на страницу туннеля (ngrok/localtunnel): проверьте URL и переменную APP_URL на сервере."
        : "";
    throw new Error(`Сервер вернул HTML или не-JSON при успешном ответе.${hint}`);
  }

  return payload;
}

async function loadReport() {
  const query = buildReportQueryString();
  const payload = await apiFetch(`/api/reports?${query}`);
  state.report = payload.report;
  state.reportExportQuery = query;
  renderReport(state.report);
  renderReportWebVisuals(state.report);
}

async function downloadReportCsv() {
  if (!reportDownloadCsvButton || reportDownloadCsvButton.disabled) {
    return;
  }

  const currentQuery = buildReportQueryString();

  if (
    state.report &&
    state.reportExportQuery &&
    currentQuery !== state.reportExportQuery
  ) {
    const rebuildHint = isWebMode
      ? "Параметры отчёта изменились — нажмите «Показать», затем скачайте CSV."
      : "Параметры отчёта изменились — нажмите «Построить отчёт», затем скачайте CSV.";
    setStatus(rebuildHint, "error");
    return;
  }

  const exportQuery = state.reportExportQuery ?? currentQuery;
  const suggestedName = reportCsvSuggestedFilename();

  const tryTelegramNativeDownload =
    tg &&
    typeof tg.downloadFile === "function" &&
    typeof tg.isVersionAtLeast === "function" &&
    tg.isVersionAtLeast("8.0") &&
    window.location.protocol === "https:";

  if (tryTelegramNativeDownload) {
    const initDataValue = getInitData();

    if (initDataValue) {
      setStatus("Открываем загрузку в Telegram…");

      try {
        const csvUrlStr = resolveFetchUrl(
          `/api/reports/export.csv?${exportQuery}`
        );
        const downloadUrl = new URL(csvUrlStr);
        downloadUrl.searchParams.set("telegram_init_data", initDataValue);
        tg.downloadFile(
          {
            url: downloadUrl.href,
            file_name: suggestedName
          },
          (accepted) => {
            if (accepted) {
              setStatus(
                "Готово. В системном окне сохраните файл — на iPhone его можно сохранить в приложение «Файлы».",
                "success"
              );
            } else {
              setStatus("Загрузка отменена.");
            }
          }
        );
      } catch (error) {
        console.error(error);
        setStatus(
          error instanceof Error ? error.message : "Не удалось начать загрузку",
          "error"
        );
      }

      return;
    }
  }

  setStatus("Готовим CSV…");

  try {
    const response = await authenticatedFetchRaw(
      `/api/reports/export.csv?${exportQuery}`
    );

    const errProbe = async () => {
      const errText = await response.text();

      /** @type {string} */
      let message = `HTTP ${response.status}`;

      try {
        const json = JSON.parse(errText);

        if (typeof json?.error === "string" && json.error) {
          message = json.error;
        }
      } catch {
        if (errText.trim()) {
          message = stripHtmlToSnippet(errText.slice(0, 240));
        }
      }

      return message;
    };

    if (!response.ok) {
      throw new Error(await errProbe());
    }

    const disposition = response.headers.get("Content-Disposition") ?? "";
    const match = /filename="([^"]+)"/.exec(disposition);
    const filename = match?.[1] ?? suggestedName;

    const blob = await response.blob();

    /** @type {File | null} */
    let shareFile = null;

    try {
      shareFile = new File([blob], filename, {
        type: "text/csv;charset=utf-8"
      });
    } catch {
      shareFile = null;
    }

    if (
      shareFile &&
      typeof navigator.share === "function" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [shareFile] })
    ) {
      try {
        await navigator.share({
          files: [shareFile],
          title: filename
        });
        setStatus(
          "Файл открыт в меню «Поделиться»: на iPhone выберите «Сохранить в файлы» при необходимости.",
          "success"
        );
        return;
      } catch (shareError) {
        if (shareError && shareError.name === "AbortError") {
          setStatus("Меню «Поделиться» закрыто без сохранения.");
          return;
        }

        console.warn("navigator.share failed, fallback to загрузке", shareError);
      }
    }

    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
    setStatus("Отчёт скачан (CSV).", "success");
  } catch (error) {
    console.error(error);
    setStatus(error instanceof Error ? error.message : "Не удалось скачать отчёт", "error");
  }
}

async function openReportCsvInNewTab() {
  if (!reportCsvStatementButton || reportCsvStatementButton.disabled) {
    return;
  }

  const currentQuery = buildReportQueryString();

  if (
    state.report &&
    state.reportExportQuery &&
    currentQuery !== state.reportExportQuery
  ) {
    const rebuildHint = isWebMode
      ? "Параметры отчёта изменились — нажмите «Показать», затем откройте выписку."
      : "Параметры отчёта изменились — нажмите «Построить отчёт», затем откройте выписку.";
    setStatus(rebuildHint, "error");
    return;
  }

  const exportQuery = state.reportExportQuery ?? currentQuery;
  const exportParams = new URLSearchParams(exportQuery);
  exportParams.set("disposition", "inline");

  setStatus("Открываем CSV…");

  try {
    const response = await authenticatedFetchRaw(
      `/api/reports/export.csv?${exportParams.toString()}`
    );

    const errProbe = async () => {
      const errText = await response.text();
      let message = `HTTP ${response.status}`;
      try {
        const json = JSON.parse(errText);
        if (typeof json?.error === "string" && json.error) {
          message = json.error;
        }
      } catch {
        if (errText.trim()) {
          message = stripHtmlToSnippet(errText.slice(0, 240));
        }
      }
      return message;
    };

    if (!response.ok) {
      throw new Error(await errProbe());
    }

    const text = await response.text();
    const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const tab = window.open(url, "_blank", "noopener,noreferrer");

    if (!tab) {
      URL.revokeObjectURL(url);
      setStatus("Браузер заблокировал новую вкладку. Разрешите всплывающие окна для этого сайта.", "error");
      return;
    }

    window.setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        /* ignore */
      }
    }, 120000);
    setStatus("Выписка открыта в новой вкладке.", "success");
  } catch (error) {
    console.error(error);
    setStatus(error instanceof Error ? error.message : "Не удалось открыть выписку", "error");
  }
}

function applyReportingCurrencyFromSummary(summary) {
  const resolvedReportingCurrency =
    summary?.reportingCurrency ?? currentReportingCurrencySelection();
  setStoredReportingCurrency(resolvedReportingCurrency);
  syncReportingCurrencyInputs(resolvedReportingCurrency);
}

function applyDashboardPayload(payload) {
  const activeScreen = document.body.dataset.appActiveScreen ?? "home";
  const onReportsScreen = activeScreen === "reports";

  if (payload.summary !== undefined && payload.summary !== null) {
    state.summary = payload.summary;
    applyReportingCurrencyFromSummary(payload.summary);
  }

  if (!onReportsScreen && payload.report !== undefined) {
    state.report = payload.report;
    state.reportExportQuery = buildReportQueryString();
  }
}

const RECENT_ENTRIES_LIMIT = 12;

function mergeRecentEntry(entry) {
  if (!entry?.id) {
    return;
  }

  state.recentEntries = [
    entry,
    ...state.recentEntries.filter((row) => row.id !== entry.id)
  ].slice(0, RECENT_ENTRIES_LIMIT);
}

function mergeRecentTransfer(transfer) {
  if (!transfer?.id) {
    return;
  }

  state.recentTransfers = [
    transfer,
    ...state.recentTransfers.filter((row) => row.id !== transfer.id)
  ].slice(0, WEB_RECENT_SIDEBAR_LIMIT);
}

function applyMutationPatch(patch) {
  if (!patch) {
    return;
  }

  if (Array.isArray(patch.accounts)) {
    state.accounts = patch.accounts;
  }

  if (Array.isArray(patch.categories)) {
    state.categories = patch.categories;
  }

  if (patch.summary) {
    const next = patch.summary;

    if (
      state.summary &&
      next.monthlyIncome === undefined &&
      next.monthlyExpense === undefined &&
      next.monthlyNet === undefined
    ) {
      Object.assign(state.summary, next);
    } else {
      state.summary = next;
    }

    applyReportingCurrencyFromSummary(state.summary);
  }
}

function finishMutationFromResponse(response, renderOptions = {}) {
  if (!response?.patch) {
    return false;
  }

  applyMutationPatch(response.patch);

  if (response.entry) {
    mergeRecentEntry(response.entry);
  }

  if (response.transfer) {
    mergeRecentTransfer(response.transfer);
  }

  afterBootstrapRender({
    backgroundRefresh: true,
    partial: true,
    ...renderOptions
  });

  if (response.patch.syncReport) {
    void refreshAppData({ backgroundRefresh: true, light: true });
  }

  return true;
}

function applyRefreshPayload(payload) {
  applyWorkspacePayload(payload);

  if (Array.isArray(payload.accounts)) {
    state.accounts = payload.accounts;
  }

  if (Array.isArray(payload.categories)) {
    state.categories = payload.categories;
  }

  if (Array.isArray(payload.recentEntries)) {
    state.recentEntries = payload.recentEntries;
  }

  if (Array.isArray(payload.recentTransfers)) {
    state.recentTransfers = payload.recentTransfers;
  }

  applyDashboardPayload(payload);
}

function applyBootstrapPayload(payload) {
  const user = normalizeBootstrapUser(payload.user);

  state.user = user ?? state.user;
  state.accounts = payload.accounts ?? [];
  state.categories = payload.categories ?? [];
  state.currencies = Array.isArray(payload.currencies) ? payload.currencies : [];
  state.recentEntries = payload.recentEntries ?? [];
  state.recentTransfers = payload.recentTransfers ?? [];
  state.summary = payload.summary ?? null;

  applyDashboardPayload(payload);
  applyWorkspacePayload(payload);

  if (userNameElement && user) {
    userNameElement.textContent = formatUserDisplayName(user);
  }

  syncHomeWelcomeLine(user);
}

function buildAppDataApiUrl(options = {}) {
  const reportingCurrency = currentReportingCurrencySelection();
  const params = new URLSearchParams();
  params.set("reportingCurrency", reportingCurrency);

  if (options.light) {
    if (options.includeCategories) {
      params.append("include", "categories");
    }

    return `/api/refresh?${params.toString()}`;
  }

  return `/api/bootstrap?${params.toString()}`;
}

function scheduleDebouncedBackgroundRefresh(delayMs = 900) {
  if (
    (isWebMode && document.body.classList.contains("web-login-gate-open")) ||
    document.body.classList.contains("workspace-mode-choice-open") ||
    document.body.classList.contains("workspace-invite-gate-open")
  ) {
    return;
  }

  window.clearTimeout(refreshAppDataDebounceTimer);
  refreshAppDataDebounceTimer = window.setTimeout(() => {
    refreshAppDataDebounceTimer = null;

    if (refreshAppDataInFlight) {
      return;
    }

    refreshAppDataInFlight = refreshAppData({ backgroundRefresh: true, light: true })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        refreshAppDataInFlight = null;
      });
  }, delayMs);
}

function afterBootstrapRender(options = {}) {
  const activeScreen = document.body.dataset.appActiveScreen ?? "home";

  renderAll({
    activeScreen,
    partial: options.backgroundRefresh === true
  });

  if (activeScreen === "ledger" && !isWebMode) {
    populateTgActivityFilterSelects();
    ensureTgOpsDefaultDates();
    if (!tgOpsFilterSnapshotInitialized) {
      Object.assign(tgOpsAppliedFilter, readTgOpsFilterFromDom());
      tgOpsFilterSnapshotInitialized = true;
    }
    void refreshTgOperationsBoard();
  }

  if (activeScreen === "history") {
    populateWebOperationsFilterSelects();
    if (options.syncWebOperationsHistory) {
      void refreshWebOperationsBoard();
    }
  }

  if (activeScreen === "reports" && options.syncWebOperationsHistory) {
    void loadReport();
  }
}

async function refreshAppData(options = {}) {
  const showGlobalOverlay = options.globalBusy === true;

  if (showGlobalOverlay) {
    beginGlobalBusy(options.busyMessage ?? "Загружаем данные…");
  }

  try {
    const reportingCurrency = currentReportingCurrencySelection();
    let bootstrapAbort = undefined;

    try {
      if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
        bootstrapAbort = AbortSignal.timeout(45000);
      }
    } catch (_) {
      /* Older WebViews: no AbortSignal.timeout */
    }

    const fetchOptions = bootstrapAbort !== undefined ? { signal: bootstrapAbort } : {};
    const payload = await apiFetch(buildAppDataApiUrl(options), fetchOptions);

    if (options.light) {
      applyRefreshPayload(payload);
    } else {
      applyBootstrapPayload(payload);
    }

    if (isWebMode) {
      hideWebLoginGate();
    }

    if (!options.light) {
      await finalizeWorkspaceBoot();
    }

    afterBootstrapRender(options);
    return payload;
  } catch (error) {
    if (isWebMode && isApiUnauthorizedError(error)) {
      showWebLoginGate();
    }

    throw error;
  } finally {
    if (showGlobalOverlay) {
      endGlobalBusy();
    }
  }
}

async function loadApp(options = {}) {
  if (!isWebMode && !tg) {
    if (userNameElement) {
      userNameElement.textContent = "Откройте приложение из Telegram";
    }
    setStatus("Mini app должен открываться из Telegram, чтобы получить данные пользователя.", "error");
    dismissAppSplash({ fast: true });
    return;
  }

  const bgRefresh = options.backgroundRefresh === true;
  const showGlobalOverlay = options.globalBusy === true && !bgRefresh;
  if (showGlobalOverlay) {
    beginGlobalBusy(options.busyMessage ?? "Загружаем данные…");
  }

  if (bgRefresh) {
    try {
      await refreshAppData(options);
      if (isWebMode) {
        hideWebLoginGate();
      }
    } catch (error) {
      console.error(error);
      if (isWebMode && isApiUnauthorizedError(error)) {
        showWebLoginGate(error instanceof Error ? error.message : "");
      }
    } finally {
      if (showGlobalOverlay) {
        endGlobalBusy();
      }
    }
    return;
  }

  if (isWebMode) {
    if (webInviteCapturedThisPageLoad) {
      webInviteCapturedThisPageLoad = false;

      try {
        await fetch(resolveFetchUrl("/auth/logout"), {
          method: "POST",
          credentials: "include"
        });
      } catch {
        //
      }

      state.user = null;
      state.workspace = null;
      state.workspaces = [];
      state.webOperationsLastPayload = null;
      hideWebModeChoice();
      hideWorkspaceInviteGate();
      document.body.classList.remove(
        "web-mode-choice-open",
        "workspace-mode-choice-open",
        "workspace-invite-gate-open"
      );

      showWebLoginGate(
        getPendingWebInviteToken()
          ? "Ссылка-приглашение: войдите аккаунтом того, кого добавляете в команду. Предыдущая веб-сессия на этом устройстве сброшена."
          : ""
      );
      dismissAppSplash({ fast: true });

      if (showGlobalOverlay) {
        endGlobalBusy();
      }

      return;
    }

    try {
      setStatus("Загружаем данные...");
      await refreshAppData(options);
      hideWebLoginGate();
      if (
        !document.body.classList.contains("workspace-mode-choice-open") &&
        !document.body.classList.contains("workspace-invite-gate-open")
      ) {
        setStatus(
          "Все готово. Интерфейс разбит по вкладкам и стал проще для ежедневного использования.",
          "success"
        );
      }
      await dismissAppSplashAfterSuccess();
    } catch (error) {
      console.error(error);
      if (isApiUnauthorizedError(error)) {
        showWebLoginGate();
        dismissAppSplash({ fast: true });
        return;
      }

      if (userNameElement) {
        userNameElement.textContent = "Не удалось загрузить приложение";
      }

      setStatus(error instanceof Error ? error.message : "Unknown error", "error");
      dismissAppSplash({ fast: true });
    } finally {
      if (showGlobalOverlay) {
        endGlobalBusy();
      }
    }

    return;
  }

  try {
    try {
      if (typeof tg.ready === "function") {
        tg.ready();
      }
    } catch (error) {
      console.warn("Telegram.WebApp.ready failed", error);
    }

    try {
      if (typeof tg.expand === "function") {
        tg.expand();
      }
    } catch (error) {
      console.warn("Telegram.WebApp.expand failed", error);
    }

    try {
      tg.disableVerticalSwipes?.();
    } catch (error) {
      console.warn("disableVerticalSwipes is unavailable", error);
    }

    try {
      if (typeof tg.setHeaderColor === "function") {
        tg.setHeaderColor("#ffffff");
      }
      if (typeof tg.setBackgroundColor === "function") {
        tg.setBackgroundColor("#eef2f7");
      }
      if (typeof tg.setBottomBarColor === "function") {
        tg.setBottomBarColor("#ffffff");
      }
    } catch (error) {
      console.warn("Telegram.WebApp theme colors", error);
    }

    syncViewportMetrics();
    bindTelegramViewportListeners();

    if (!getInitData() && !isWebMode) {
      if (userNameElement) {
        userNameElement.textContent = "Подключение...";
      }
      setStatus("Ожидаем данные сессии от Telegram...");
    }

    const initDataReady = isWebMode ? "web-session" : await waitForTelegramInitData(12000);

    if (!initDataReady && !isWebMode) {
      if (userNameElement) {
        userNameElement.textContent = "Ожидаем Telegram";
      }
      setStatus(
        "Telegram WebApp еще не передал данные сессии. Закройте mini app и откройте снова из бота.",
        "error"
      );
      dismissAppSplash({ fast: true });
      return;
    }

    setStatus("Загружаем данные...");
    await refreshAppData(options);
    if (
      !document.body.classList.contains("workspace-mode-choice-open") &&
      !document.body.classList.contains("workspace-invite-gate-open")
    ) {
      setStatus(
        "Все готово. Интерфейс разбит по вкладкам и стал проще для ежедневного использования.",
        "success"
      );
    }
    await dismissAppSplashAfterSuccess();
  } catch (error) {
    console.error(error);
    if (userNameElement) {
      userNameElement.textContent = "Не удалось загрузить приложение";
    }
    let message = error instanceof Error ? error.message : "Unknown error";

    const aborted =
      (error instanceof Error && error.name === "AbortError") ||
      (typeof DOMException !== "undefined" &&
        error instanceof DOMException &&
        error.name === "AbortError");

    if (aborted) {
      message =
        "Сервер не ответил вовремя. Проверьте интернет или что backend доступен по тому же домену, что и приложение.";
    }

    setStatus(message, "error");
    dismissAppSplash({ fast: true });
  } finally {
    if (showGlobalOverlay) {
      endGlobalBusy();
    }
  }
}

async function handleCreateAccount(event) {
  event.preventDefault();

  const formData = new FormData(accountForm);
  const payload = {
    name: String(formData.get("name") ?? ""),
    type: String(formData.get("type") ?? "cash"),
    currencyCode: String(formData.get("currencyCode") ?? "USD"),
    balance: Number(formData.get("balance") ?? 0)
  };

  submitButton.disabled = true;
  setAccountsStatus(state.editingAccountId ? "Сохраняем счет..." : "Создаем счет...");
  beginGlobalBusy(state.editingAccountId ? "Сохраняем счёт…" : "Создаём счёт…");

  try {
    const isEditing = Boolean(state.editingAccountId);
    const response = await apiFetch(
      isEditing
        ? `/api/accounts/${encodeURIComponent(state.editingAccountId)}`
        : "/api/accounts",
      {
        method: isEditing ? "PATCH" : "POST",
        body: JSON.stringify(payload)
      }
    );

    const nextAccount = response.account ?? null;

    if (nextAccount) {
      if (isEditing) {
        state.accounts = state.accounts.map((account) =>
          account.id === nextAccount.id ? nextAccount : account
        );
      } else {
        state.accounts = [...state.accounts, nextAccount];
      }
    }

    const accentHex = document.getElementById("accountAccentInput")?.value?.trim() ?? "";
    const accId = String(response.account?.id ?? state.editingAccountId ?? "").trim();
    if (accId) {
      if (accentHex && /^#[0-9a-fA-F]{6}$/.test(accentHex)) {
        writeAccountAccent(accId, accentHex);
      } else {
        removeAccountAccent(accId);
      }
      const iconKey =
        String(document.getElementById("accountIconKeyInput")?.value ?? "").trim() || DEFAULT_ACCOUNT_ICON_KEY;
      const descField = document.getElementById("accountDescriptionInput");
      const description = descField instanceof HTMLTextAreaElement ? descField.value.trim() : "";
      writeAccountUiMeta(accId, { iconKey, description });
    }

    resetAccountForm();
    setAccountsStatus(isEditing ? "Счет обновлен." : "Счет создан.", "success");

    if (!finishMutationFromResponse(response)) {
      await refreshAppData({ backgroundRefresh: true, light: true });
    }
  } catch (error) {
    console.error(error);
    setAccountsStatus(
      error instanceof Error ? error.message : "Не удалось сохранить счет",
      "error"
    );
  } finally {
    endGlobalBusy();
    submitButton.disabled = false;
  }
}

async function handleDeleteAccount(accountId) {
  setAccountsStatus("Удаляем счет...");
  beginGlobalBusy("Удаляем счёт…");

  try {
    const response = await apiFetch(`/api/accounts/${encodeURIComponent(accountId)}`, {
      method: "DELETE"
    });

    removeAccountAccent(accountId);
    removeAccountUiMeta(accountId);

    if (state.editingAccountId === accountId) {
      resetAccountForm();
    }

    setAccountsStatus("Счет удален.", "success");

    if (!finishMutationFromResponse(response)) {
      state.accounts = state.accounts.filter((account) => account.id !== accountId);
      await refreshAppData({ backgroundRefresh: true, light: true });
    }
  } catch (error) {
    console.error(error);
    setAccountsStatus(
      error instanceof Error ? error.message : "Не удалось удалить счет",
      "error"
    );
  } finally {
    endGlobalBusy();
  }
}

function attachFxReferencePanelListeners() {
  fxBoardBaseInput?.addEventListener("change", () => {
    if (fxBoardBaseInput?.value) {
      setStoredFxBoardDisplayBase(fxBoardBaseInput.value);
    }

    void refreshFxBoardQuotes();
  });

  fxCalcAmountInput?.addEventListener("input", scheduleFxCalculatorRefresh);

  fxCalcAmountInput?.addEventListener("keydown", (event) => {
    if (
      event.key === "Enter" ||
      event.code === "Enter" ||
      event.code === "NumpadEnter" ||
      Number(event.keyCode) === 13
    ) {
      event.preventDefault();
      fxCalcAmountInput?.blur();
    }
  });

  fxCalcKeyboardDoneButton?.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    fxCalcAmountInput?.blur();
  });

  fxCalcFromInput?.addEventListener("change", scheduleFxCalculatorRefresh);
  fxCalcToInput?.addEventListener("change", scheduleFxCalculatorRefresh);

  fxCalcSwapButton?.addEventListener("click", () => {
    if (!fxCalcFromInput || !fxCalcToInput) {
      return;
    }

    const previousFrom = fxCalcFromInput.value;
    fxCalcFromInput.value = fxCalcToInput.value;
    fxCalcToInput.value = previousFrom;

    scheduleFxCalculatorRefresh();
  });
}

let tgAccountsScreenChromeAttached = false;

function attachTgAccountsScreenChrome() {
  if (isWebMode || tgAccountsScreenChromeAttached) {
    return;
  }
  tgAccountsScreenChromeAttached = true;

  const scrollToAccountForm = () => {
    const anchor = document.getElementById("accountFormTitle");
    scrollTgContentToElement(anchor instanceof HTMLElement ? anchor : accountForm);
  };

  document.getElementById("tgAccountsAddOutlineButton")?.addEventListener("click", scrollToAccountForm);

  document.getElementById("tgAccountFormBackButton")?.addEventListener("click", () => {
    resetAccountForm();
    renderAccounts(state.accounts);
    document.querySelector("#screen-accounts .web-accounts-main")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

}

function attachAccountsListListener() {
  if (!accountsListElement) {
    return;
  }

  accountsListElement.addEventListener("click", (event) => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const editControl = target.closest("[data-account-edit-id]");
    const deleteControl = target.closest("[data-account-delete-id]");

    const editId = editControl?.dataset.accountEditId;
    const deleteId = deleteControl?.dataset.accountDeleteId;

    if (editId) {
      startAccountEdit(editId);
      return;
    }

    if (deleteId) {
      void handleDeleteAccount(deleteId);
    }
  });
}

function submitFormSafely(form) {
  if (typeof form.requestSubmit === "function") {
    form.requestSubmit();
    return;
  }

  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

async function handleCategorySubmit(event) {
  event.preventDefault();

  const formData = new FormData(categoryForm);
  const payload = {
    kind: String(formData.get("kind") ?? "expense"),
    name: String(formData.get("name") ?? "")
  };

  const isEditing = Boolean(state.editingCategoryId);

  categorySubmitButton.disabled = true;
  setStatus(isEditing ? "Сохраняем категорию..." : "Создаем категорию...");
  beginGlobalBusy(isEditing ? "Сохраняем категорию…" : "Создаём категорию…");

  try {
    /** @type {{ category?: { id: string } }} */
    let result = {};
    if (isEditing) {
      result = await apiFetch(`/api/categories/${encodeURIComponent(state.editingCategoryId)}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
    } else {
      result = await apiFetch("/api/categories", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }

    const accentHex = document.getElementById("categoryAccentInput")?.value?.trim() ?? "";
    const descEl = document.getElementById("categoryDescriptionInput");
    const iconEl = document.getElementById("categoryIconKeyInput");
    const description =
      descEl instanceof HTMLTextAreaElement ? String(descEl.value ?? "").trim() : "";
    const iconKey = String(iconEl?.value ?? DEFAULT_CATEGORY_ICON_KEY).trim() || DEFAULT_CATEGORY_ICON_KEY;
    const catId = String(result?.category?.id ?? (isEditing ? state.editingCategoryId : "") ?? "").trim();
    if (catId) {
      if (accentHex && /^#[0-9a-fA-F]{6}$/.test(accentHex)) {
        writeCategoryAccent(catId, accentHex);
      } else {
        removeCategoryAccent(catId);
      }
      writeCategoryUiMeta(catId, { description, iconKey });
    }

    resetCategoryForm();
    setStatus(isEditing ? "Категория обновлена." : "Категория создана.", "success");

    if (!finishMutationFromResponse(result)) {
      await refreshAppData({ backgroundRefresh: true, light: true, includeCategories: true });
    }
  } catch (error) {
    console.error(error);
    setStatus(
      error instanceof Error ? error.message : "Не удалось сохранить категорию",
      "error"
    );
  } finally {
    endGlobalBusy();
    categorySubmitButton.disabled = false;
  }
}

async function handleDeleteCategory(categoryId) {
  setStatus("Удаляем категорию...");
  beginGlobalBusy("Удаляем категорию…");

  try {
    const response = await apiFetch(`/api/categories/${encodeURIComponent(categoryId)}`, {
      method: "DELETE"
    });

    if (state.editingCategoryId === categoryId) {
      resetCategoryForm();
    }

    removeCategoryAccent(categoryId);
    removeCategoryUiMeta(categoryId);

    setStatus(
      "Категория удалена. Старые операции сохранены, но у них больше не будет этой статьи.",
      "success"
    );

    if (!finishMutationFromResponse(response)) {
      state.categories = state.categories.filter((category) => category.id !== categoryId);
      await refreshAppData({ backgroundRefresh: true, light: true, includeCategories: true });
    }
  } catch (error) {
    console.error(error);
    setStatus(
      error instanceof Error ? error.message : "Не удалось удалить категорию",
      "error"
    );
  } finally {
    endGlobalBusy();
  }
}

async function handleCreateEntry(event) {
  event.preventDefault();

  if (!entryForm) {
    return;
  }

  const formData = new FormData(entryForm);
  const rawDate = String(formData.get("occurredAt") ?? "");
  const accountCurrency = readEntryAccountCurrency();
  const operationCurrency =
    readEntryOperationCurrency() ||
    String(formData.get("currencyCode") ?? "")
      .trim()
      .toUpperCase() ||
    accountCurrency;
  const payload = {
    kind: String(formData.get("kind") ?? "expense"),
    accountId: String(formData.get("accountId") ?? ""),
    categoryId: String(formData.get("categoryId") ?? ""),
    amount: Number(formData.get("amount") ?? 0),
    currencyCode: operationCurrency || null,
    note: String(formData.get("note") ?? "").trim(),
    occurredAt: rawDate ? toIsoDate(rawDate) : new Date().toISOString()
  };

  if (entrySubmitButton) {
    entrySubmitButton.disabled = true;
  }
  setStatus("Сохраняем операцию...");
  beginGlobalBusy("Сохраняем операцию…");

  try {
    const response = await apiFetch("/api/entries", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    resetEntryFormToDefaults();
    setStatus("Операция сохранена.", "success");

    if (!finishMutationFromResponse(response)) {
      await refreshAppData({ backgroundRefresh: true, light: true });
    }
  } catch (error) {
    console.error(error);
    setStatus(error instanceof Error ? error.message : "Не удалось сохранить операцию", "error");
  } finally {
    endGlobalBusy();
    if (entrySubmitButton) {
      entrySubmitButton.disabled = false;
    }
  }
}

async function handleCreateTransfer(event) {
  event.preventDefault();

  const formData = new FormData(transferForm);
  const rawDate = String(formData.get("occurredAt") ?? "");
  const rawToAmount = String(formData.get("toAmount") ?? "").trim();
  const payload = {
    fromAccountId: String(formData.get("fromAccountId") ?? ""),
    toAccountId: String(formData.get("toAccountId") ?? ""),
    fromAmount: Number(formData.get("fromAmount") ?? 0),
    toAmount: rawToAmount ? Number(rawToAmount) : null,
    note: String(formData.get("note") ?? "").trim(),
    occurredAt: rawDate ? toIsoDate(rawDate) : new Date().toISOString()
  };

  transferSubmitButton.disabled = true;
  setStatus("Сохраняем перевод...");
  beginGlobalBusy("Сохраняем перевод…");

  try {
    const response = await apiFetch("/api/transfers", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    transferForm.reset();
    transferDateInput.value = getCurrentLocalDateTimeValue();
    transferToAmountAutofillTag = null;
    transferToAmountProgrammatic = false;
    setStatus("Перевод сохранен.", "success");

    if (!finishMutationFromResponse(response)) {
      await refreshAppData({ backgroundRefresh: true, light: true });
    }

    const back = transferReturnScreen || "home";
    openScreen(back);
  } catch (error) {
    console.error(error);
    setStatus(error instanceof Error ? error.message : "Не удалось сохранить перевод", "error");
  } finally {
    endGlobalBusy();
    transferSubmitButton.disabled = false;
  }
}

async function handleSyncRates() {
  syncRatesButton.disabled = true;
  setStatus("Обновляем курсы валют...");
  beginGlobalBusy("Синхронизируем курсы…");

  try {
    await apiFetch("/api/exchange-rates/sync", {
      method: "POST",
      body: JSON.stringify({})
    });
    setStatus("Курсы валют обновлены.", "success");
    await refreshAppData({ backgroundRefresh: true, light: true });
  } catch (error) {
    console.error(error);
    setStatus(error instanceof Error ? error.message : "Не удалось обновить курсы", "error");
  } finally {
    endGlobalBusy();
    syncRatesButton.disabled = false;
  }
}

function resetReportFiltersToDefaults() {
  if (reportPeriodInput) {
    reportPeriodInput.value = "month";
  }
  if (reportAccountFilterInput) {
    reportAccountFilterInput.value = "";
  }
  if (reportCategoryFilterInput) {
    reportCategoryFilterInput.value = "";
  }
  if (reportKindFilterInput) {
    reportKindFilterInput.value = "";
  }
  const today = getCurrentLocalDateValue();
  if (reportStartDateInput) {
    reportStartDateInput.value = today;
  }
  if (reportEndDateInput) {
    reportEndDateInput.value = today;
  }
  const fallbackCcy =
    (state.summary?.reportingCurrency && String(state.summary.reportingCurrency).trim()) ||
    getStoredReportingCurrency() ||
    "USD";
  if (reportingCurrencyInput) {
    const codes = Array.from(reportingCurrencyInput.options)
      .map((o) => o.value)
      .filter((c) => c && c.length > 0);
    let nextCcy = fallbackCcy;
    if (!codes.includes(nextCcy)) {
      nextCcy = codes.includes("USD") ? "USD" : codes[0] ?? nextCcy;
    }
    if (nextCcy && codes.includes(nextCcy)) {
      reportingCurrencyInput.value = nextCcy;
    }
  }
  const appliedCcy = reportingCurrencyInput?.value?.trim() || fallbackCcy;
  setStoredReportingCurrency(appliedCcy);
  syncReportingCurrencyInputs(appliedCcy);
  toggleReportDateInputs();
  syncReportPeriodSegmented();
}

async function handleBuildReport(event) {
  event.preventDefault();
  reportSubmitButton.disabled = true;
  setStatus("Строим отчет...");

  try {
    await loadReport();
    setStatus("Отчет обновлен.", "success");
  } catch (error) {
    console.error(error);
    setStatus(error instanceof Error ? error.message : "Не удалось построить отчет", "error");
  } finally {
    reportSubmitButton.disabled = false;
  }
}

async function handleResetReportFilters() {
  if (!reportResetFiltersButton) {
    return;
  }

  reportResetFiltersButton.disabled = true;
  setStatus("Сбрасываем фильтры…");

  try {
    resetReportFiltersToDefaults();
    await loadReport();
    setStatus("Фильтры сброшены.", "success");
  } catch (error) {
    console.error(error);
    setStatus(error instanceof Error ? error.message : "Не удалось сбросить фильтры", "error");
  } finally {
    reportResetFiltersButton.disabled = false;
  }
}

function handleOpenScreenButtonClick(button) {
  const screenName = button.dataset.openScreen;

  if (!screenName) {
    return;
  }

  openScreen(screenName);

  if (button.dataset.scrollScreenTop === "true") {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  }

  const focusTargetId = button.dataset.focusTarget;

  if (focusTargetId) {
    document.getElementById(focusTargetId)?.focus();
    return;
  }

  const label = button.textContent?.trim();

  if (label?.includes("Новая операция")) {
    if (entryKindInput) {
      entryKindInput.value = "expense";
      populateCategoryOptions();
      syncWebEntryKindCardsFromSelect();
    }
    (entryAmountInput ?? document.getElementById("entryAmountInput"))?.focus({ preventScroll: true });
  } else if (label?.includes("Перевод")) {
    document.getElementById("transferFromAmountInput")?.focus({ preventScroll: true });
  }
}

function attachCategoryListsListener() {
  if (!incomeCategoriesListElement || !expenseCategoriesListElement) {
    return;
  }

  const onCategoryListClick = (event) => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const editControl = target.closest("[data-category-edit-id]");
    const deleteControl = target.closest("[data-category-delete-id]");

    const editId = editControl?.dataset.categoryEditId;
    const deleteId = deleteControl?.dataset.categoryDeleteId;

    if (editId) {
      startCategoryEdit(editId);
      return;
    }

    if (deleteId) {
      void handleDeleteCategory(deleteId);
    }
  };

  incomeCategoriesListElement.addEventListener("click", onCategoryListClick);
  expenseCategoriesListElement.addEventListener("click", onCategoryListClick);
  document.getElementById("webCategoriesIncomeTableBody")?.addEventListener("click", onCategoryListClick);
  document.getElementById("webCategoriesExpenseTableBody")?.addEventListener("click", onCategoryListClick);
}

if (refreshButton) {
  refreshButton.addEventListener("click", () => {
    void refreshAppData({ globalBusy: true, busyMessage: "Обновляем данные…", light: true });
  });
}

tgGlobalNewEntryButton?.addEventListener("click", () => {
  openEntryTypeModal();
});

document.addEventListener("click", (event) => {
  const closeBtn =
    event.target instanceof Element ? event.target.closest("[data-balancy-hint-close]") : null;
  if (!closeBtn) {
    return;
  }
  const id = closeBtn.getAttribute("data-balancy-hint-close")?.trim();
  if (!id) {
    return;
  }
  dismissBalancyHintSession(id);
  const host = document.querySelector(`[data-balancy-hint="${id}"]`);
  if (host instanceof HTMLElement) {
    host.hidden = true;
  }
});

document.getElementById("balancyHintsEnabledToggle")?.addEventListener("change", (event) => {
  const el = event.target;
  if (!(el instanceof HTMLInputElement)) {
    return;
  }
  writeHintsGloballyEnabled(el.checked);
  applyBalancyHintsFromState();
});

document.querySelector("#screen-home .tg-home-quick-actions")?.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target.closest("[data-tg-quick-action]") : null;
  if (!target) {
    return;
  }

  const action = target.dataset.tgQuickAction ?? "";

  if (action === "transfer") {
    openTransferScreen();
    return;
  }

  if (action === "entry") {
    openEntryTypeModal();
    return;
  }

  if (action === "category") {
    resetCategoryForm();
    openScreen("categories");
    scrollTgContentToElement(document.getElementById("categoryFormTitle"));
    return;
  }

  if (action === "account") {
    resetAccountForm();
    openScreen("accounts");
    scrollTgContentToElement(document.getElementById("accountFormTitle"));
    return;
  }
});

if (isWebMode) {
    document.body.classList.add("web-mode");
    webTopNav?.removeAttribute("hidden");
    syncWebPageTitle("home");

    if (reportSubmitButton) {
      reportSubmitButton.textContent = "Показать";
    }

  if (webRefreshButton) {
    webRefreshButton.addEventListener("click", () => {
      void refreshAppData({
        globalBusy: true,
        busyMessage: "Обновляем данные…",
        syncWebOperationsHistory: true,
        light: true
      });
    });
  }

  webTopNavAddButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleWebNewEntryMenu();
  });

  webOpsApplyButton?.addEventListener("click", () => {
    webOpsOffset = 0;
    void refreshWebOperationsBoard();
  });

  webOpsPagePrev?.addEventListener("click", () => {
    webOpsOffset = Math.max(0, webOpsOffset - getWebOpsPageSizeValue());
    void refreshWebOperationsBoard();
  });

  webOpsPageNext?.addEventListener("click", () => {
    webOpsOffset += getWebOpsPageSizeValue();
    void refreshWebOperationsBoard();
  });

  webOpsPageSize?.addEventListener("change", () => {
    webOpsOffset = 0;
    void refreshWebOperationsBoard();
  });

  webOpsSearchInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      webOpsOffset = 0;
      void refreshWebOperationsBoard();
    }
  });

  document.querySelectorAll("[data-web-nav]").forEach((button) => {
    button.addEventListener("click", () => {
      openScreen(button.dataset.webNav ?? "home");
      closeWebProfileDropdown();
    });
  });

  webSidebarBurgerBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleWebNavDrawer();
  });

  webNavDrawerBackdrop?.addEventListener("click", () => {
    closeWebNavDrawer();
  });

  webProfileToggleButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    closeWebNewEntryMenu();

    if (window.innerWidth <= 900 && !document.body.classList.contains("web-nav-drawer-open")) {
      openWebNavDrawer();
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          if (webProfileDropdown?.hidden) {
            webProfileDropdown.hidden = false;
            webProfileToggleButton.setAttribute("aria-expanded", "true");
          }
          positionWebSidebarProfileDropdown();
        });
      });
      return;
    }

    toggleWebProfileDropdown();
  });

  webOpenSettingsButton?.addEventListener("click", () => {
    closeWebProfileDropdown();
    openScreen("settings");
  });

  webSwitchUserButton?.addEventListener("click", () => {
    closeWebProfileDropdown();
    void handleWebLogout();
  });

  document.querySelectorAll("[data-web-sidebar-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.webSidebarAction;
      if (action === "transfer") {
        closeWebNewEntryMenu();
        closeWebProfileDropdown();
        closeEntryTypeModal();
        openTransferScreen();
        return;
      }
    });
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) {
      closeWebNavDrawer();
    }

    if (!webProfileDropdown?.hidden) {
      positionWebSidebarProfileDropdown();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    closeWebNavDrawer();
    closeWebProfileDropdown();
    closeWebNewEntryMenu();
  });

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    if (webProfileDropdown && !webProfileDropdown.hidden) {
      if (!event.target.closest("#webProfileMenu")) {
        closeWebProfileDropdown();
      }
    }

    if (webNewEntryMenu && !webNewEntryMenu.hidden) {
      if (!event.target.closest(".web-new-entry-wrap")) {
        closeWebNewEntryMenu();
      }
    }
  });
}

document.querySelectorAll("[data-web-set-entry-kind]").forEach((button) => {
  button.addEventListener("click", () => {
    const nextKind = button.dataset.webSetEntryKind;
    if (!nextKind || !entryKindInput) {
      return;
    }
    entryKindInput.value = nextKind;
    populateCategoryOptions();
    syncWebEntryKindCardsFromSelect();
  });
});

document.getElementById("tgTransferScreenBackButton")?.addEventListener("click", () => {
  exitTransferScreen();
});

document.getElementById("webTransferCancelButton")?.addEventListener("click", () => {
  exitTransferScreen();
});

document.getElementById("webTransferSwapAccounts")?.addEventListener("click", () => {
  swapWebTransferAccounts();
});

transferFromAccountInput?.addEventListener("change", syncWebTransferAmountCurrencyUi);
transferToAccountInput?.addEventListener("change", syncWebTransferAmountCurrencyUi);

document.getElementById("transferFromAmountInput")?.addEventListener("input", scheduleTransferToAmountPreview);
document.getElementById("transferToAmountInput")?.addEventListener("input", handleTransferToAmountUserInput);

document.getElementById("webTransferTipMore")?.addEventListener("click", () => {
  openHelpDocumentationModal();
  window.requestAnimationFrame(() => {
    document.getElementById("helpDocTransferSection")?.scrollIntoView({ block: "start", behavior: "smooth" });
  });
});

document.querySelectorAll("[data-web-new-entry]").forEach((button) => {
  button.addEventListener("click", () => {
    const kind = button.dataset.webNewEntry;
    if (isWebMode) {
      closeWebNewEntryMenu();
    }
    if (kind === "transfer") {
      closeEntryTypeModal();
      openTransferScreen();
    } else if (kind === "income" || kind === "expense") {
      openEntryScreenForKind(kind);
    } else if (kind === "account") {
      closeEntryTypeModal();
      if (isWebMode) {
        openScreen("accounts");
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            accountForm?.scrollIntoView({ behavior: "smooth", block: "start" });
            window.setTimeout(() => {
              document.getElementById("nameInput")?.focus({ preventScroll: true });
            }, 120);
          });
        });
      } else {
        resetAccountForm();
        openScreen("accounts");
        const anchor = document.getElementById("accountFormTitle");
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            scrollTgContentToElement(anchor instanceof HTMLElement ? anchor : accountForm);
          });
        });
      }
    } else if (kind === "category") {
      closeEntryTypeModal();
      openScreen("categories");
      window.setTimeout(() => {
        categoryForm?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
    }
  });
});

Array.from(document.querySelectorAll("[data-refresh-action]")).forEach((button) => {
  button.addEventListener("click", () => {
    void refreshAppData({
      globalBusy: true,
      busyMessage: "Обновляем данные…",
      syncWebOperationsHistory: true,
      light: true
    });
  });
});

if (syncRatesButton) {
  syncRatesButton.addEventListener("click", () => {
    void handleSyncRates();
  });
}

if (addOperationButton) {
  addOperationButton.addEventListener("click", () => {
    openEntryTypeModal();
  });
}

if (entryTypeModalBackdrop) {
  entryTypeModalBackdrop.addEventListener("click", () => {
    closeEntryTypeModal();
  });
}

if (entryTypeModalCloseButton) {
  entryTypeModalCloseButton.addEventListener("click", () => {
    closeEntryTypeModal();
  });
}

openHelpDocumentationButton?.addEventListener("click", () => {
  openHelpDocumentationModal();
});

if (helpDocumentationBackdrop) {
  helpDocumentationBackdrop.addEventListener("click", () => {
    closeHelpDocumentationModal();
  });
}

if (helpDocumentationCloseTopButton) {
  helpDocumentationCloseTopButton.addEventListener("click", () => {
    closeHelpDocumentationModal();
  });
}

if (helpDocumentationCloseBottomButton) {
  helpDocumentationCloseBottomButton.addEventListener("click", () => {
    closeHelpDocumentationModal();
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  if (!helpDocumentationModalElement || helpDocumentationModalElement.hidden) {
    return;
  }

  closeHelpDocumentationModal();
});

entryTypeActionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    openEntryScreenForKind(button.dataset.entryKind ?? "expense");
  });
});

document.getElementById("entryTypeOpenTransferButton")?.addEventListener("click", () => {
  closeEntryTypeModal();
  openTransferScreen();
});

attachAccountsListListener();
attachSwipeRowHandlers();
attachCategoryListsListener();
attachCategoryFormSharedChrome();
attachWebCategoriesChrome();
attachWebAccountColorChrome();
attachAccountFormChrome();
attachTgAccountsScreenChrome();
attachFxReferencePanelListeners();

window.addEventListener("focus", () => {
  scheduleDebouncedBackgroundRefresh();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    scheduleDebouncedBackgroundRefresh();
  }
});

document.addEventListener("focusin", (event) => {
  window.clearTimeout(blurSnapTimer);
  blurSnapTimer = null;

  if (isFormTextField(event.target)) {
    syncViewportMetrics();
    scheduleScrollFieldIntoView(event.target);
  } else {
    syncViewportMetrics();
  }
});
document.addEventListener("focusout", () => {
  window.requestAnimationFrame(() => {
    syncViewportMetrics();
  });
  blurSnapTimer = window.setTimeout(() => {
    blurSnapTimer = null;
    syncViewportMetrics();
  }, 100);
});

accountForm?.addEventListener("submit", (event) => {
  void handleCreateAccount(event);
});

submitButton?.addEventListener("click", () => {
  submitFormSafely(accountForm);
});

cancelAccountEditButton?.addEventListener("click", () => {
  resetAccountForm();
  renderAccounts(state.accounts);
});

reportingCurrencyInput?.addEventListener("change", () => {
  setStoredReportingCurrency(reportingCurrencyInput.value);
  syncReportingCurrencyInputs(reportingCurrencyInput.value);
  void refreshAppData({ syncWebOperationsHistory: true, light: true });
});

homeReportingCurrencyInput?.addEventListener("change", () => {
  setStoredReportingCurrency(homeReportingCurrencyInput.value);
  syncReportingCurrencyInputs(homeReportingCurrencyInput.value);
  void refreshAppData({ syncWebOperationsHistory: true, light: true });
});

categoryForm?.addEventListener("submit", (event) => {
  void handleCategorySubmit(event);
});

categorySubmitButton?.addEventListener("click", () => {
  submitFormSafely(categoryForm);
});

cancelCategoryEditButton?.addEventListener("click", () => {
  resetCategoryForm();
  renderCategories(state.categories);
});

entryForm?.addEventListener("submit", (event) => {
  void handleCreateEntry(event);
});

entrySubmitButton?.addEventListener("click", () => {
  submitFormSafely(entryForm);
});

transferForm?.addEventListener("submit", (event) => {
  void handleCreateTransfer(event);
});

transferSubmitButton?.addEventListener("click", () => {
  submitFormSafely(transferForm);
});

reportForm?.addEventListener("submit", (event) => {
  void handleBuildReport(event);
});

reportSubmitButton?.addEventListener("click", () => {
  submitFormSafely(reportForm);
});

reportResetFiltersButton?.addEventListener("click", () => {
  void handleResetReportFilters();
});

reportDownloadCsvButton?.addEventListener("click", () => {
  void downloadReportCsv();
});

reportCsvStatementButton?.addEventListener("click", () => {
  void openReportCsvInNewTab();
});

entryKindInput?.addEventListener("change", () => {
  populateCategoryOptions();
  syncWebEntryKindCardsFromSelect();
});

entryAccountInput?.addEventListener("change", () => {
  syncEntryCurrencyFromAccount(true);
  syncEntryAccountAvailabilityLine();
});

entryCurrencyInput?.addEventListener("change", () => {
  syncEntryCurrencyHint();
});

document.getElementById("entryFormResetWeb")?.addEventListener("click", () => {
  resetEntryFormToDefaults();
});

reportPeriodInput?.addEventListener("change", () => {
  toggleReportDateInputs();
  syncReportPeriodSegmented();
});

document.querySelectorAll("[data-report-period]").forEach((button) => {
  button.addEventListener("click", () => {
    const next = button.dataset.reportPeriod;
    if (!next || !reportPeriodInput) {
      return;
    }
    reportPeriodInput.value = next;
    toggleReportDateInputs();
    syncReportPeriodSegmented();
  });
});

document.addEventListener("click", (event) => {
  const openBtn =
    event.target instanceof Element ? event.target.closest(".balancy-filter-pill__date-open") : null;
  if (!openBtn) {
    return;
  }
  event.preventDefault();
  const host = openBtn.closest(".balancy-filter-pill__body--date");
  const input = host?.querySelector('input[type="date"]');
  if (!(input instanceof HTMLInputElement)) {
    return;
  }

  /* В отчётах даты отключены, пока период не «Произвольный» — showPicker() тогда не сработает */
  if (
    reportPeriodInput &&
    (input === reportStartDateInput || input === reportEndDateInput) &&
    reportPeriodInput.value !== "custom"
  ) {
    reportPeriodInput.value = "custom";
    toggleReportDateInputs();
    syncReportPeriodSegmented();
  }

  if (input.disabled) {
    return;
  }

  try {
    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }
  } catch {
    //
  }
  input.focus();
  try {
    input.click();
  } catch {
    //
  }
});

document.getElementById("tgMoreOpenEntryModalButton")?.addEventListener("click", () => {
  openEntryTypeModal();
});

openScreenButtons.forEach((button) => {
  button.addEventListener("click", () => {
    handleOpenScreenButtonClick(button);
  });
});


try {
  entryDateInput.value = getCurrentLocalDateTimeValue();

  transferDateInput.value = getCurrentLocalDateTimeValue();
  reportStartDateInput.value = getCurrentLocalDateValue();
  reportEndDateInput.value = getCurrentLocalDateValue();
  toggleReportDateInputs();
  openScreen("home");
  syncViewportMetrics();
  populateCurrencyOptions();
  populateReportingCurrencyOptions();
  populateReportCategoryFilterOptions();

  if (reportDownloadCsvLabel) {
    reportDownloadCsvLabel.textContent = isWebMode ? "Скачать отчёт" : "Скачать CSV";
  }
  if (!isWebMode && reportSubmitButton) {
    reportSubmitButton.textContent = "Построить отчёт";
  }
  syncReportPeriodSegmented();

  attachTgActivityOpsChrome();
  attachTelegramPullToRefresh();
  attachTelegramEdgeSwipeBack();
  attachWorkspaceUi();

  void loadApp();
} catch (error) {
  console.error("Mini app boot failed before loadApp", error);
  if (userNameElement) {
    userNameElement.textContent = "Ошибка запуска";
  }
  if (statusTextElement) {
    statusTextElement.textContent =
      "Не удалось инициализировать интерфейс. Обновите экран («Обновить») или откройте приложение из бота снова.";
    statusTextElement.className = "inline-error";
  }
}
