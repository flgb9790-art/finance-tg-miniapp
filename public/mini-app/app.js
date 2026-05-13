const tg = window.Telegram?.WebApp;
const isWebMode = new URLSearchParams(window.location.search).get("web") === "1";

const WEB_PAGE_TITLES = {
  home: "Главная",
  activity: "Операции",
  reports: "Отчёты",
  categories: "Категории",
  accounts: "Счета"
};

const WEB_TIP_DISMISS_KEY = "balancy_web_tip_v1";

const userNameElement = document.getElementById("userName");
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
const homeBalancesByCurrencyListElement = document.getElementById("homeBalancesByCurrencyList");
const ratesStatusTextElement = document.getElementById("ratesStatusText");
const homeAccountsListElement = document.getElementById("homeAccountsList");
const accountsListElement = document.getElementById("accountsList");
const incomeCategoriesListElement = document.getElementById("incomeCategoriesList");
const expenseCategoriesListElement = document.getElementById("expenseCategoriesList");
const recentEntriesListElement = document.getElementById("recentEntriesList");
const recentTransfersListElement = document.getElementById("recentTransfersList");
const homeRecentActivityListElement = document.getElementById("homeRecentActivityList");
const refreshButton = document.getElementById("refreshButton");
const webTopNav = document.getElementById("webTopNav");
const webRefreshButton = document.getElementById("webRefreshButton");
const webTopNavAddButton = document.getElementById("webTopNavAddButton");
const webProfileMenu = document.getElementById("webProfileMenu");
const webProfileToggleButton = document.getElementById("webProfileToggleButton");
const webProfileDropdown = document.getElementById("webProfileDropdown");
const webProfileMeta = document.getElementById("webProfileMeta");
const webSwitchUserButton = document.getElementById("webSwitchUserButton");
const webNewEntryMenu = document.getElementById("webNewEntryMenu");
const webPageTitleElement = document.getElementById("webPageTitle");
const webSidebarUserNameElement = document.getElementById("webSidebarUserName");
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
const transferForm = document.getElementById("transferForm");
const transferSubmitButton = document.getElementById("transferSubmitButton");
const transferFromAccountInput = document.getElementById("transferFromAccountInput");
const transferToAccountInput = document.getElementById("transferToAccountInput");
const transferDateInput = document.getElementById("transferDateInput");
const reportForm = document.getElementById("reportForm");
const reportSubmitButton = document.getElementById("reportSubmitButton");
const reportPeriodInput = document.getElementById("reportPeriodInput");
const reportingCurrencyInput = document.getElementById("reportingCurrencyInput");
const reportCategoryFilterInput = document.getElementById("reportCategoryFilterInput");
const reportStartDateInput = document.getElementById("reportStartDateInput");
const reportEndDateInput = document.getElementById("reportEndDateInput");
const reportTitleElement = document.getElementById("reportTitle");
const reportIncomeValueElement = document.getElementById("reportIncomeValue");
const reportIncomeCurrencyElement = document.getElementById("reportIncomeCurrency");
const reportExpenseValueElement = document.getElementById("reportExpenseValue");
const reportExpenseCurrencyElement = document.getElementById("reportExpenseCurrency");
const reportNetValueElement = document.getElementById("reportNetValue");
const reportNetCurrencyElement = document.getElementById("reportNetCurrency");
const reportTransfersCountValueElement = document.getElementById("reportTransfersCountValue");
const reportCurrentBalanceValueElement = document.getElementById("reportCurrentBalanceValue");
const reportCurrentBalanceCurrencyElement = document.getElementById("reportCurrentBalanceCurrency");
const reportIncomeCategoriesListElement = document.getElementById("reportIncomeCategoriesList");
const reportExpenseCategoriesListElement = document.getElementById("reportExpenseCategoriesList");
const reportTransfersStatBox = document.getElementById("reportTransfersStatBox");
const reportDownloadCsvButton = document.getElementById("reportDownloadCsvButton");
const addOperationButton = document.getElementById("addOperationButton");
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
  editingCategoryId: null
};

const balancySplashStartedAt = Date.now();

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

function dismissAppSplash(options = {}) {
  const el = document.getElementById("appSplash");

  if (!el || el.dataset.dismissed === "1") {
    return;
  }

  el.dataset.dismissed = "1";
  el.classList.add("app-splash--out");
  el.setAttribute("aria-hidden", "true");

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

  const minMs = 1200;
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
    element.scrollIntoView({
      block: "center",
      behavior: "smooth",
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

  const fromReport = reportingCurrencyInput.value?.trim();
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
  const isCustom = reportPeriodInput.value === "custom";
  reportStartDateInput.disabled = !isCustom;
  reportEndDateInput.disabled = !isCustom;
}

function formatCurrencyOption(currency) {
  return `${currency.code} — ${currency.name}`;
}

function openScreen(screenName) {
  const nextScreen = screenName || "home";

  screenElements.forEach((screenElement) => {
    const isActive = screenElement.dataset.screen === nextScreen;
    screenElement.classList.toggle("screen-active", isActive);
  });

  navButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.openScreen === nextScreen);
  });

  document.querySelectorAll("[data-web-nav]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.webNav === nextScreen);
  });

  if (isWebMode) {
    syncWebPageTitle(nextScreen);
    closeWebNewEntryMenu();
  }
}

function openEntryTypeModal() {
  entryTypeModalElement.hidden = false;
}

function closeEntryTypeModal() {
  entryTypeModalElement.hidden = true;
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
  entryKindInput.value = kind;
  populateCategoryOptions();
  document.getElementById("entryForm")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetAccountForm() {
  state.editingAccountId = null;
  accountForm.reset();
  document.getElementById("typeInput").value = "cash";
  populateCurrencyOptions();
  if (currencyInput.querySelector('option[value="USD"]')) {
    currencyInput.value = "USD";
  }
  setAccountsStatus("");
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
  setAccountsStatus("Режим редактирования: измените данные ниже и нажмите «Сохранить изменения».", "success");
  openScreen("accounts");

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      accountForm?.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => {
        document.getElementById("nameInput")?.focus({ preventScroll: true });
      }, 320);
    });
  });
}

function syncWebPageTitle(screenName) {
  if (!isWebMode || !webPageTitleElement) {
    return;
  }

  const key = screenName || "home";
  webPageTitleElement.textContent = WEB_PAGE_TITLES[key] ?? "Balancy";
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
  ratesStatusTextElement.textContent = summary?.ratesUpdatedAt
    ? `Курсы обновлены: ${formatDateTime(summary.ratesUpdatedAt)}`
    : "Курсы валют еще не синхронизированы";

  renderWebDesktopDashboard(summary);

  const balances = Object.entries(summary?.balancesByCurrency ?? {});

  if (!homeBalancesByCurrencyListElement) {
    return;
  }

  if (balances.length === 0) {
    homeBalancesByCurrencyListElement.innerHTML =
      `<p class="currency-breakdown-empty muted">Нет остатков по валютам — добавьте счета.</p>`;
    return;
  }

  const sortedBalances = balances.sort(([a], [b]) => a.localeCompare(b, "en"));

  homeBalancesByCurrencyListElement.innerHTML = sortedBalances
    .map(
      ([currencyCode, amount]) =>
        `<div class="currency-mini-pill">${escapeHtml(formatMoney(amount, currencyCode))}</div>`
    )
    .join("");
}

function renderAccountsList(targetElement, accounts, emptyDescription) {
  if (!targetElement) {
    return;
  }

  if (accounts.length === 0) {
    targetElement.innerHTML = `
      <div class="empty-state">
        <strong>Пока нет счетов</strong>
        <p class="account-meta">${escapeHtml(emptyDescription)}</p>
      </div>
    `;
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
                <div class="account-icon account-icon-${escapeHtml(account.type)}">${getAccountTypeIcon(
                  account.type
                )}</div>
                <div class="item-copy">
                  <div class="account-name">${escapeHtml(account.name)}</div>
                  <div class="account-meta">${escapeHtml(account.currency_code)} · ${escapeHtml(
                  formatType(account.type)
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
              <div class="account-icon account-icon-${escapeHtml(account.type)}">${getAccountTypeIcon(
                account.type
              )}</div>
              <div class="item-copy">
                <div class="account-name">${escapeHtml(account.name)}</div>
                <div class="account-meta">${escapeHtml(account.currency_code)} · ${escapeHtml(
                formatType(account.type)
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

function renderAccounts(accounts) {
  accountsCountElement.textContent = String(accounts.length);
  accountsTitleElement.textContent = accounts.length > 0 ? "Ваши счета" : "Счета пока пусты";
  submitButton.textContent = state.editingAccountId ? "Сохранить изменения" : "Создать счет";
  accountFormTitleElement.textContent = state.editingAccountId
    ? "Редактировать счет"
    : "Новый счет";
  cancelAccountEditButton.classList.toggle("hidden-button", !state.editingAccountId);
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

function syncCategoryFormChrome() {
  if (!categoryFormTitleElement || !categorySubmitButton) {
    return;
  }

  const editing = Boolean(state.editingCategoryId);

  categoryFormTitleElement.textContent = editing ? "Редактировать категорию" : "Новая категория";
  categorySubmitButton.textContent = editing ? "Сохранить изменения" : "Создать категорию";

  cancelCategoryEditButton?.classList.toggle("hidden-button", !editing);
}

function resetCategoryForm() {
  state.editingCategoryId = null;
  categoryForm.reset();
  document.getElementById("categoryKindInput").value = "expense";
  syncCategoryFormChrome();
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
  syncCategoryFormChrome();
  setStatus("Отредактируйте поля ниже и нажмите «Сохранить изменения».", "success");
  openScreen("categories");

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      categoryForm?.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => {
        document.getElementById("categoryNameInput")?.focus({ preventScroll: true });
      }, 320);
    });
  });
}

function renderCategories(categories) {
  const incomeCategories = categories.filter((category) => category.kind === "income");
  const expenseCategories = categories.filter((category) => category.kind === "expense");

  const renderList = (targetElement, items) => {
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
                <strong class="category-strip-name">${escapeHtml(category.name)}</strong>
                <span class="category-strip-kind category-strip-kind--${kindSlug}">${escapeHtml(
                  formatKind(category.kind)
                )}</span>
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  };

  renderList(incomeCategoriesListElement, incomeCategories);
  renderList(expenseCategoriesListElement, expenseCategories);
  syncCategoryFormChrome();
}

function renderRecentEntries(entries) {
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
                ${escapeHtml(entry.account?.name ?? "Счет")} · ${escapeHtml(formatDateTime(entry.occurred_at))}
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
              <div class="transfer-meta">${escapeHtml(formatDateTime(transfer.occurred_at))}</div>
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

function renderHomeRecentActivity(entries, transfers) {
  const combined = [
    ...entries.slice(0, 3).map((entry) => ({
      type: "entry",
      occurredAt: entry.occurred_at,
      payload: entry
    })),
    ...transfers.slice(0, 2).map((transfer) => ({
      type: "transfer",
      occurredAt: transfer.occurred_at,
      payload: transfer
    }))
  ]
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, 4);

  if (combined.length === 0) {
    homeRecentActivityListElement.innerHTML = `
      <div class="empty-state">
        <strong>Пока нет активности</strong>
        <p class="account-meta">Последние операции и переводы появятся здесь автоматически.</p>
      </div>
    `;
    return;
  }

  homeRecentActivityListElement.innerHTML = combined
    .map((item) => {
      if (item.type === "entry") {
        const entry = item.payload;
        const amountPrefix = entry.kind === "income" ? "+" : "-";
        const amountClass =
          entry.kind === "income" ? "entry-amount-income" : "entry-amount-expense";

        return `
          <article class="entry-item">
            <div class="item-leading">
              <div class="entry-icon entry-icon-${escapeHtml(entry.kind)}">${getEntryIcon(entry.kind)}</div>
              <div class="entry-main">
                <div class="entry-title-row">
                  <strong>${escapeHtml(entry.category?.name ?? "Без категории")}</strong>
                </div>
                <div class="account-meta">
                  ${escapeHtml(entry.account?.name ?? "Счет")} · ${escapeHtml(formatDateTime(entry.occurred_at))}
                </div>
              </div>
            </div>
            ${formatEntryAmountStackHtml(amountPrefix, entry.amount, entry.currency_code, amountClass)}
          </article>
        `;
      }

      const transfer = item.payload;

      return `
        <article class="entry-item">
          <div class="item-leading">
            <div class="entry-icon entry-icon-transfer">${getEntryIcon("transfer")}</div>
            <div class="entry-main">
              <div class="entry-title-row">
                <strong>${escapeHtml(transfer.from_account?.name ?? "Счет")} → ${escapeHtml(
                  transfer.to_account?.name ?? "Счет"
                )}</strong>
              </div>
              <div class="transfer-meta">${escapeHtml(formatDateTime(transfer.occurred_at))}</div>
            </div>
          </div>
          ${formatTransferAmountStackHtml(transfer)}
        </article>
      `;
    })
    .join("");
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

function renderReport(report) {
  const periodPhrase = formatReportPeriod(report?.period ?? "month");
  const applied = report?.appliedCategory;

  if (applied) {
    const kindLabel = applied.kind === "income" ? "доходы" : "расходы";
    reportTitleElement.textContent = `«${applied.name}» (${kindLabel}), ${periodPhrase}`;
  } else {
    reportTitleElement.textContent = `Отчет за ${periodPhrase}`;
  }

  const reportingCode = report?.reportingCurrency ?? "";

  reportIncomeValueElement.textContent = formatMoneyAmount(report?.incomes ?? 0);
  if (reportIncomeCurrencyElement) {
    reportIncomeCurrencyElement.textContent = reportingCode;
  }

  reportExpenseValueElement.textContent = formatMoneyAmount(report?.expenses ?? 0);
  if (reportExpenseCurrencyElement) {
    reportExpenseCurrencyElement.textContent = reportingCode;
  }

  reportNetValueElement.textContent = formatMoneyAmount(report?.net ?? 0);
  if (reportNetCurrencyElement) {
    reportNetCurrencyElement.textContent = reportingCode;
  }

  reportTransfersCountValueElement.textContent = String(report?.transfersCount ?? 0);

  if (reportTransfersStatBox) {
    reportTransfersStatBox.hidden = Boolean(applied);
  }

  reportCurrentBalanceValueElement.textContent = formatMoneyAmount(report?.currentTotalBalance ?? 0);
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

  if (reportDownloadCsvButton) {
    reportDownloadCsvButton.disabled = !report || !getInitData();
  }
}

function populateAccountOptions() {
  const accountOptions = state.accounts
    .map(
      (account) =>
        `<option value="${escapeHtml(account.id)}">${escapeHtml(account.name)} · ${escapeHtml(account.currency_code)}</option>`
    )
    .join("");

  if (state.accounts.length === 0) {
    entryAccountInput.innerHTML = `<option value="">Сначала создайте счет</option>`;
    transferFromAccountInput.innerHTML = `<option value="">Сначала создайте счет</option>`;
    transferToAccountInput.innerHTML = `<option value="">Сначала создайте счет</option>`;
    return;
  }

  entryAccountInput.innerHTML = accountOptions;
  transferFromAccountInput.innerHTML = accountOptions;
  transferToAccountInput.innerHTML = accountOptions;

  if (state.accounts.length > 1) {
    transferToAccountInput.selectedIndex = 1;
  }
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
  const selectedKind = entryKindInput.value;
  const filteredCategories = state.categories.filter(
    (category) => category.kind === selectedKind
  );

  if (filteredCategories.length === 0) {
    entryCategoryInput.innerHTML = `<option value="">Сначала создайте категорию</option>`;
    return;
  }

  entryCategoryInput.innerHTML = filteredCategories
    .map(
      (category) =>
        `<option value="${escapeHtml(category.id)}">${escapeHtml(category.name)}</option>`
    )
    .join("");
}

function renderAll() {
  safeRenderStep("summary", () => renderSummary(state.summary));
  safeRenderStep("accounts", () => renderAccounts(state.accounts));
  safeRenderStep("categories", () => renderCategories(state.categories));
  safeRenderStep("recentEntries", () => renderRecentEntries(state.recentEntries));
  safeRenderStep("recentTransfers", () => renderRecentTransfers(state.recentTransfers));
  safeRenderStep("homeActivity", () =>
    renderHomeRecentActivity(state.recentEntries, state.recentTransfers)
  );
  safeRenderStep("report", () => renderReport(state.report));
  safeRenderStep("accountOptions", () => populateAccountOptions());
  safeRenderStep("currencyOptions", () => populateCurrencyOptions());
  safeRenderStep("reportingCurrencyOptions", () => populateReportingCurrencyOptions());
  safeRenderStep("reportCategoryFilterOptions", () => populateReportCategoryFilterOptions());
  safeRenderStep("categoryOptions", () => populateCategoryOptions());
  safeRenderStep("fxReferencePanel", () => syncFxReferencePanel());
  safeRenderStep("webProfile", () => syncWebProfile());
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

  const displayName =
    [user.first_name, user.last_name].filter(Boolean).join(" ") ||
    (user.username ? `@${user.username}` : "") ||
    "Telegram";

  const telegramId =
    typeof user.telegram_user_id === "number" && Number.isFinite(user.telegram_user_id)
      ? String(user.telegram_user_id)
      : "—";

  if (webProfileMeta) {
    webProfileMeta.textContent = `${displayName} · Telegram ID ${telegramId}`;
  }

  if (webSidebarUserNameElement) {
    webSidebarUserNameElement.textContent = displayName;
  }
}

function closeWebProfileDropdown() {
  if (!webProfileDropdown || !webProfileToggleButton) {
    return;
  }

  webProfileDropdown.hidden = true;
  webProfileToggleButton.setAttribute("aria-expanded", "false");
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
}

async function handleWebLogout() {
  try {
    await fetch("/auth/logout", { method: "POST" });
  } finally {
    window.location.href = "/web";
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
  params.set("period", reportPeriodInput.value);
  params.set("reportingCurrency", currentReportingCurrencySelection());

  if (reportPeriodInput.value === "custom") {
    params.set("startDate", toIsoDate(toDateRangeStart(reportStartDateInput.value)));
    params.set("endDate", toIsoDate(toDateRangeEnd(reportEndDateInput.value)));
  }

  const filterCategoryId = reportCategoryFilterInput?.value?.trim();
  if (filterCategoryId) {
    params.set("categoryId", filterCategoryId);
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
    setStatus("Параметры отчёта изменились — нажмите «Построить отчёт», затем скачайте CSV.", "error");
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

async function loadApp() {
  if (!tg) {
    userNameElement.textContent = "Откройте приложение из Telegram";
    setStatus("Mini app должен открываться из Telegram, чтобы получить данные пользователя.", "error");
    dismissAppSplash({ fast: true });
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

    if (!getInitData() && !isWebMode) {
      userNameElement.textContent = "Подключение...";
      setStatus("Ожидаем данные сессии от Telegram...");
    }

    const initDataReady = isWebMode ? "web-session" : await waitForTelegramInitData(12000);

    if (!initDataReady && !isWebMode) {
      userNameElement.textContent = "Ожидаем Telegram";
      setStatus(
        "Telegram WebApp еще не передал данные сессии. Закройте mini app и откройте снова из бота.",
        "error"
      );
      dismissAppSplash({ fast: true });
      return;
    }

    let bootstrapAbort = undefined;

    try {
      if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
        bootstrapAbort = AbortSignal.timeout(45000);
      }
    } catch (_) {
      /* Older WebViews: no AbortSignal.timeout */
    }

    setStatus("Загружаем данные...");
    const reportingCurrency = currentReportingCurrencySelection();
    const fetchOptions = bootstrapAbort !== undefined ? { signal: bootstrapAbort } : undefined;

    const payload = await apiFetch(
      `/api/bootstrap?reportingCurrency=${encodeURIComponent(reportingCurrency)}`,
      fetchOptions ?? {}
    );
    const user = payload.user;

    state.user = user;
    state.accounts = payload.accounts ?? [];
    state.categories = payload.categories ?? [];
    state.currencies = Array.isArray(payload.currencies) ? payload.currencies : [];
    state.recentEntries = payload.recentEntries ?? [];
    state.recentTransfers = payload.recentTransfers ?? [];
    state.summary = payload.summary ?? null;
    state.report = payload.report ?? null;
    state.reportExportQuery = buildReportQueryString();

    const resolvedReportingCurrency = payload.summary?.reportingCurrency ?? reportingCurrency;
    setStoredReportingCurrency(resolvedReportingCurrency);
    syncReportingCurrencyInputs(resolvedReportingCurrency);

    userNameElement.textContent =
      [user.first_name, user.last_name].filter(Boolean).join(" ") ||
      user.username ||
      "Пользователь";

    renderAll();
    setStatus(
      "Все готово. Интерфейс разбит по вкладкам и стал проще для ежедневного использования.",
      "success"
    );
    await dismissAppSplashAfterSuccess();
  } catch (error) {
    console.error(error);
    userNameElement.textContent = "Не удалось загрузить приложение";
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

    resetAccountForm();
    setAccountsStatus(isEditing ? "Счет обновлен." : "Счет создан.", "success");
    renderAll();
    await loadApp();
  } catch (error) {
    console.error(error);
    setAccountsStatus(
      error instanceof Error ? error.message : "Не удалось сохранить счет",
      "error"
    );
  } finally {
    submitButton.disabled = false;
  }
}

async function handleDeleteAccount(accountId) {
  setAccountsStatus("Удаляем счет...");

  try {
    await apiFetch(`/api/accounts/${encodeURIComponent(accountId)}`, {
      method: "DELETE"
    });

    state.accounts = state.accounts.filter((account) => account.id !== accountId);

    if (state.editingAccountId === accountId) {
      resetAccountForm();
    }

    setAccountsStatus("Счет удален.", "success");
    renderAll();
    await loadApp();
  } catch (error) {
    console.error(error);
    setAccountsStatus(
      error instanceof Error ? error.message : "Не удалось удалить счет",
      "error"
    );
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

function attachAccountsListListener() {
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

  try {
    if (isEditing) {
      await apiFetch(`/api/categories/${encodeURIComponent(state.editingCategoryId)}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
    } else {
      await apiFetch("/api/categories", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }

    resetCategoryForm();
    setStatus(isEditing ? "Категория обновлена." : "Категория создана.", "success");
    await loadApp();
  } catch (error) {
    console.error(error);
    setStatus(
      error instanceof Error ? error.message : "Не удалось сохранить категорию",
      "error"
    );
  } finally {
    categorySubmitButton.disabled = false;
  }
}

async function handleDeleteCategory(categoryId) {
  setStatus("Удаляем категорию...");

  try {
    await apiFetch(`/api/categories/${encodeURIComponent(categoryId)}`, {
      method: "DELETE"
    });

    state.categories = state.categories.filter((category) => category.id !== categoryId);

    if (state.editingCategoryId === categoryId) {
      resetCategoryForm();
    }

    setStatus(
      "Категория удалена. Старые операции сохранены, но у них больше не будет этой статьи.",
      "success"
    );
    renderAll();
    await loadApp();
  } catch (error) {
    console.error(error);
    setStatus(
      error instanceof Error ? error.message : "Не удалось удалить категорию",
      "error"
    );
  }
}

async function handleCreateEntry(event) {
  event.preventDefault();

  const formData = new FormData(entryForm);
  const rawDate = String(formData.get("occurredAt") ?? "");
  const payload = {
    kind: String(formData.get("kind") ?? "expense"),
    accountId: String(formData.get("accountId") ?? ""),
    categoryId: String(formData.get("categoryId") ?? ""),
    amount: Number(formData.get("amount") ?? 0),
    note: String(formData.get("note") ?? "").trim(),
    occurredAt: rawDate ? toIsoDate(rawDate) : new Date().toISOString()
  };

  entrySubmitButton.disabled = true;
  setStatus("Сохраняем операцию...");

  try {
    await apiFetch("/api/entries", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    entryForm.reset();
    entryKindInput.value = "expense";
    entryDateInput.value = getCurrentLocalDateTimeValue();
    populateCategoryOptions();
    setStatus("Операция сохранена.", "success");
    await loadApp();
  } catch (error) {
    console.error(error);
    setStatus(error instanceof Error ? error.message : "Не удалось сохранить операцию", "error");
  } finally {
    entrySubmitButton.disabled = false;
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

  try {
    await apiFetch("/api/transfers", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    transferForm.reset();
    transferDateInput.value = getCurrentLocalDateTimeValue();
    setStatus("Перевод сохранен.", "success");
    await loadApp();
  } catch (error) {
    console.error(error);
    setStatus(error instanceof Error ? error.message : "Не удалось сохранить перевод", "error");
  } finally {
    transferSubmitButton.disabled = false;
  }
}

async function handleSyncRates() {
  syncRatesButton.disabled = true;
  setStatus("Обновляем курсы валют...");

  try {
    await apiFetch("/api/exchange-rates/sync", {
      method: "POST",
      body: JSON.stringify({})
    });
    setStatus("Курсы валют обновлены.", "success");
    await loadApp();
  } catch (error) {
    console.error(error);
    setStatus(error instanceof Error ? error.message : "Не удалось обновить курсы", "error");
  } finally {
    syncRatesButton.disabled = false;
  }
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
    entryKindInput.value = "expense";
    populateCategoryOptions();
    document.getElementById("entryAmountInput")?.focus();
  } else if (label?.includes("Перевод")) {
    document.getElementById("transferFromAmountInput")?.focus();
  }
}

function attachCategoryListsListener() {
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
}

if (refreshButton) {
  refreshButton.addEventListener("click", () => {
    void loadApp();
  });
}

if (isWebMode) {
  document.body.classList.add("web-mode");
  webTopNav?.removeAttribute("hidden");
  syncWebPageTitle("home");

  if (webRefreshButton) {
    webRefreshButton.addEventListener("click", () => {
      void loadApp();
    });
  }

  webTopNavAddButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleWebNewEntryMenu();
  });

  document.querySelectorAll("[data-web-new-entry]").forEach((button) => {
    button.addEventListener("click", () => {
      const kind = button.dataset.webNewEntry;
      closeWebNewEntryMenu();
      if (kind === "transfer") {
        closeEntryTypeModal();
        openScreen("activity");
        window.setTimeout(() => {
          transferForm?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 120);
      } else if (kind === "income" || kind === "expense") {
        openEntryScreenForKind(kind);
      } else if (kind === "account") {
        closeEntryTypeModal();
        openScreen("accounts");
        window.setTimeout(() => {
          accountForm?.scrollIntoView({ behavior: "smooth", block: "start" });
          document.getElementById("nameInput")?.focus({ preventScroll: true });
        }, 120);
      } else if (kind === "category") {
        closeEntryTypeModal();
        openScreen("categories");
        window.setTimeout(() => {
          categoryForm?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 120);
      }
    });
  });

  document.querySelectorAll("[data-web-nav]").forEach((button) => {
    button.addEventListener("click", () => {
      openScreen(button.dataset.webNav ?? "home");
      closeWebProfileDropdown();
    });
  });

  webProfileToggleButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleWebProfileDropdown();
  });

  webSwitchUserButton?.addEventListener("click", () => {
    void handleWebLogout();
  });

  document.querySelectorAll("[data-web-sidebar-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.webSidebarAction;
      if (action === "transfer") {
        closeWebNewEntryMenu();
        closeWebProfileDropdown();
        closeEntryTypeModal();
        openScreen("activity");
        window.setTimeout(() => {
          transferForm?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 120);
      }
    });
  });

  const webDayTipBanner = document.getElementById("webDayTipBanner");
  const webDayTipClose = document.getElementById("webDayTipClose");
  if (webDayTipBanner && webDayTipClose) {
    if (sessionStorage.getItem(WEB_TIP_DISMISS_KEY) === "1") {
      webDayTipBanner.hidden = true;
    }

    webDayTipClose.addEventListener("click", () => {
      webDayTipBanner.hidden = true;
      sessionStorage.setItem(WEB_TIP_DISMISS_KEY, "1");
    });
  }

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

Array.from(document.querySelectorAll("[data-refresh-action]")).forEach((button) => {
  button.addEventListener("click", () => {
    void loadApp();
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

if (openHelpDocumentationButton) {
  openHelpDocumentationButton.addEventListener("click", () => {
    openHelpDocumentationModal();
  });
}

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
  openScreen("activity");
  window.setTimeout(() => {
    transferForm?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 120);
});

attachAccountsListListener();
attachSwipeRowHandlers();
attachCategoryListsListener();
attachFxReferencePanelListeners();

window.addEventListener("focus", () => {
  void loadApp();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    void loadApp();
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

accountForm.addEventListener("submit", (event) => {
  void handleCreateAccount(event);
});

submitButton.addEventListener("click", () => {
  submitFormSafely(accountForm);
});

cancelAccountEditButton?.addEventListener("click", () => {
  resetAccountForm();
  renderAccounts(state.accounts);
});

reportingCurrencyInput.addEventListener("change", () => {
  setStoredReportingCurrency(reportingCurrencyInput.value);
  syncReportingCurrencyInputs(reportingCurrencyInput.value);
  void loadApp();
});

homeReportingCurrencyInput?.addEventListener("change", () => {
  setStoredReportingCurrency(homeReportingCurrencyInput.value);
  syncReportingCurrencyInputs(homeReportingCurrencyInput.value);
  void loadApp();
});

categoryForm.addEventListener("submit", (event) => {
  void handleCategorySubmit(event);
});

categorySubmitButton.addEventListener("click", () => {
  submitFormSafely(categoryForm);
});

cancelCategoryEditButton?.addEventListener("click", () => {
  resetCategoryForm();
  renderCategories(state.categories);
});

entryForm.addEventListener("submit", (event) => {
  void handleCreateEntry(event);
});

entrySubmitButton.addEventListener("click", () => {
  submitFormSafely(entryForm);
});

transferForm.addEventListener("submit", (event) => {
  void handleCreateTransfer(event);
});

transferSubmitButton.addEventListener("click", () => {
  submitFormSafely(transferForm);
});

reportForm.addEventListener("submit", (event) => {
  void handleBuildReport(event);
});

reportSubmitButton.addEventListener("click", () => {
  submitFormSafely(reportForm);
});

reportDownloadCsvButton?.addEventListener("click", () => {
  void downloadReportCsv();
});

entryKindInput.addEventListener("change", () => {
  populateCategoryOptions();
});

reportPeriodInput.addEventListener("change", () => {
  toggleReportDateInputs();
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

  void loadApp();
} catch (error) {
  console.error("Mini app boot failed before loadApp", error);
  userNameElement.textContent = "Ошибка запуска";
  statusTextElement.textContent =
    "Не удалось инициализировать интерфейс. Обновите экран («Обновить») или откройте приложение из бота снова.";
  statusTextElement.className = "inline-error";
}
