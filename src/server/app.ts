import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import express from "express";
import { env } from "../config/env.js";
import {
  createAccount,
  deleteAccount,
  listAccounts,
  updateAccount
} from "../services/accounts.js";
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory
} from "../services/categories.js";
import {
  createEntry,
} from "../services/entries.js";
import {
  convertFxPreview,
  getLatestExchangeRateUpdate,
  getSpotlightQuotesForBase,
  syncExchangeRates
} from "../services/exchange-rates.js";
import { getCurrencyByCode, listActiveCurrencies } from "../services/currencies.js";
import {
  buildReportExportPayload,
  formatReportResultAsCsv,
  getDashboardSummary,
  getRecentActivity,
  getReport,
  resolveReportRange
} from "../services/reports.js";
import { createTransfer } from "../services/transfers.js";
import {
  listOperationsTimeline,
  parseOperationsListQuery
} from "../services/operations-list.js";
import { getAppUserById, registerTelegramUser } from "../services/users.js";
import {
  toTelegramBotUser,
  validateTelegramLoginData,
  validateTelegramWebAppInitData
} from "../lib/telegram-webapp.js";
import type { OperationKind } from "../shared/domain.js";

function getThrownErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const record = error as Record<string, unknown>;

    if (typeof record.message === "string" && record.message.trim()) {
      return record.message;
    }

    if (typeof record.details === "string" && record.details.trim()) {
      return record.details;
    }

    if (typeof record.hint === "string" && record.hint.trim()) {
      return record.hint;
    }
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return "";
}

function isForeignKeyViolation(error: unknown, message: string): boolean {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("foreign key") ||
    normalized.includes("still referenced") ||
    normalized.includes("on delete restrict") ||
    normalized.includes("violates foreign key")
  ) {
    return true;
  }

  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "23503"
  );
}

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);
const projectRootPath = path.resolve(currentDirPath, "../../");
const publicPath = path.join(projectRootPath, "public");
const miniAppHtmlPath = path.join(publicPath, "mini-app", "index.html");
const maxTelegramLoginAgeSeconds = 24 * 60 * 60;
const sessionCookieName = "balancy_session";
const sessionTtlSeconds = 60 * 60 * 24 * 30;
const webAppPath = "/mini-app/?web=1";

function parseCookies(req: express.Request): Record<string, string> {
  const raw = req.header("cookie");
  if (!raw) {
    return {};
  }

  return raw.split(";").reduce<Record<string, string>>((acc, part) => {
    const [namePart, ...valueParts] = part.trim().split("=");
    if (!namePart) {
      return acc;
    }
    acc[namePart] = decodeURIComponent(valueParts.join("=") ?? "");
    return acc;
  }, {});
}

function getSessionSigningSecret(): string {
  return env.telegramBotToken;
}

function signSessionPayload(payload: string): string {
  return crypto
    .createHmac("sha256", getSessionSigningSecret())
    .update(payload)
    .digest("hex");
}

function createSessionToken(userId: string): string {
  const expiresAt = Math.floor(Date.now() / 1000) + sessionTtlSeconds;
  const payload = `${userId}.${expiresAt}`;
  const signature = signSessionPayload(payload);
  return `${payload}.${signature}`;
}

function verifySessionToken(token: string): string | null {
  const [userId, expiresAtRaw, signature] = token.split(".");
  if (!userId || !expiresAtRaw || !signature) {
    return null;
  }

  const payload = `${userId}.${expiresAtRaw}`;
  const expected = signSessionPayload(payload);
  const expiresAt = Number(expiresAtRaw);

  if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) {
    return null;
  }

  const expectedBuffer = Buffer.from(expected, "utf8");
  const signatureBuffer = Buffer.from(signature, "utf8");
  if (expectedBuffer.length !== signatureBuffer.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) {
    return null;
  }

  return userId;
}

function readSessionUserId(req: express.Request): string | null {
  const cookies = parseCookies(req);
  const token = cookies[sessionCookieName];
  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}

function clearSessionCookie(res: express.Response): void {
  res.cookie(sessionCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    expires: new Date(0)
  });
}

function getTelegramInitData(req: express.Request): string {
  const headerValue = req.header("x-telegram-init-data");

  if (!headerValue) {
    throw new Error("Missing x-telegram-init-data header");
  }

  return headerValue;
}

function getTelegramInitDataForCsvDownload(req: express.Request): string {
  const headerValue = req.header("x-telegram-init-data");

  if (headerValue) {
    return headerValue;
  }

  const queryValue = req.query.telegram_init_data;

  if (typeof queryValue === "string" && queryValue.trim().length > 0) {
    return queryValue;
  }

  throw new Error(
    "Missing Telegram Web App credentials (header x-telegram-init-data or telegram_init_data query)"
  );
}

async function authenticateMiniAppUser(req: express.Request) {
  try {
    const initData = getTelegramInitData(req);
    const webAppUser = validateTelegramWebAppInitData(
      initData,
      env.telegramBotToken
    );

    return registerTelegramUser(toTelegramBotUser(webAppUser));
  } catch {
    const sessionUserId = readSessionUserId(req);

    if (!sessionUserId) {
      throw new Error("Unauthorized: Telegram session is missing");
    }

    const user = await getAppUserById(sessionUserId);

    if (!user) {
      throw new Error("Unauthorized: user session is invalid");
    }

    return user;
  }
}

async function authenticateCsvExportMiniAppUser(req: express.Request) {
  try {
    const initData = getTelegramInitDataForCsvDownload(req);
    const webAppUser = validateTelegramWebAppInitData(
      initData,
      env.telegramBotToken
    );

    return registerTelegramUser(toTelegramBotUser(webAppUser));
  } catch {
    const sessionUserId = readSessionUserId(req);

    if (!sessionUserId) {
      throw new Error("Unauthorized: Telegram session is missing");
    }

    const user = await getAppUserById(sessionUserId);

    if (!user) {
      throw new Error("Unauthorized: user session is invalid");
    }

    return user;
  }
}

async function resolveReportingCurrency(req: express.Request): Promise<string> {
  const requestedCurrency =
    typeof req.query.reportingCurrency === "string"
      ? req.query.reportingCurrency.trim().toUpperCase()
      : env.reportingCurrency;

  const currency = await getCurrencyByCode(requestedCurrency);

  if (!currency) {
    throw new Error("Reporting currency is invalid");
  }

  return currency.code;
}

function renderWebLoginHtml(errorMessage?: string): string {
  const botUsername = env.telegramBotUsername?.trim();
  const escapedError = errorMessage
    ? `<p style="color:#ef4444;margin-top:12px;">${errorMessage}</p>`
    : "";

  if (!botUsername) {
    return `<!doctype html>
<html lang="ru">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Balancy Web</title></head>
<body style="font-family:system-ui,Segoe UI,Arial,sans-serif;background:#f4f7fb;color:#111827;display:flex;justify-content:center;padding:40px;">
  <main style="max-width:720px;background:#fff;border-radius:16px;padding:24px;box-shadow:0 12px 30px rgba(15,23,42,.08);">
    <h1 style="margin-top:0;">Balancy Web</h1>
    <p>Для входа на сайт нужен username бота в переменной <code>TELEGRAM_BOT_USERNAME</code>.</p>
    ${escapedError}
  </main>
</body>
</html>`;
  }

  return `<!doctype html>
<html lang="ru">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Balancy Web</title></head>
<body style="font-family:system-ui,Segoe UI,Arial,sans-serif;background:#f4f7fb;color:#111827;display:flex;justify-content:center;padding:40px;">
  <main style="max-width:720px;background:#fff;border-radius:16px;padding:24px;box-shadow:0 12px 30px rgba(15,23,42,.08);">
    <h1 style="margin-top:0;">Balancy Web</h1>
    <p>Войдите через Telegram, чтобы открыть desktop-версию.</p>
    <script async src="https://telegram.org/js/telegram-widget.js?22"
      data-telegram-login="${botUsername}"
      data-size="large"
      data-lang="ru"
      data-auth-url="/auth/telegram/callback"
      data-request-access="write"></script>
    ${escapedError}
  </main>
</body>
</html>`;
}

export function createHttpApp(): express.Express {
  const app = express();
  app.set("trust proxy", 1);

  app.use(express.json());
  app.use(
    express.static(publicPath, {
      setHeaders(res, absolutePathOnDisk) {
        const posixPath = absolutePathOnDisk.replaceAll("\\", "/");
        if (posixPath.includes("/mini-app/")) {
          res.setHeader(
            "Cache-Control",
            "private, no-cache, no-store, max-age=0, must-revalidate"
          );
        }
      }
    })
  );

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/", (_req, res) => {
    res.redirect(302, "/mini-app/");
  });

  app.get("/web", (req, res) => {
    if (readSessionUserId(req)) {
      res.redirect(302, webAppPath);
      return;
    }

    res
      .status(200)
      .setHeader("Cache-Control", "no-store")
      .send(renderWebLoginHtml());
  });

  app.get("/auth/telegram/callback", async (req, res) => {
    try {
      const payload = validateTelegramLoginData(
        Object.fromEntries(
          Object.entries(req.query).map(([key, value]) => [key, String(value ?? "")])
        ),
        env.telegramBotToken
      );

      const nowSec = Math.floor(Date.now() / 1000);
      if (nowSec - payload.auth_date > maxTelegramLoginAgeSeconds) {
        throw new Error("Telegram login expired, try again.");
      }

      const user = await registerTelegramUser(toTelegramBotUser(payload));
      const secureCookie = Boolean((env.appUrl ?? "").trim().startsWith("https://"));
      res.cookie(sessionCookieName, createSessionToken(user.id), {
        httpOnly: true,
        sameSite: "lax",
        secure: secureCookie,
        path: "/",
        maxAge: sessionTtlSeconds * 1000
      });

      res.redirect(302, webAppPath);
    } catch (error) {
      clearSessionCookie(res);
      const message = getThrownErrorMessage(error) || "Telegram login failed";
      res.status(401).setHeader("Cache-Control", "no-store").send(renderWebLoginHtml(message));
    }
  });

  app.post("/auth/logout", (_req, res) => {
    clearSessionCookie(res);
    res.status(204).send();
  });

  app.get("/mini-app", (_req, res) => {
    res.setHeader(
      "Cache-Control",
      "private, no-cache, no-store, max-age=0, must-revalidate"
    );
    res.sendFile(miniAppHtmlPath);
  });

  app.get("/api/bootstrap", async (req, res) => {
    try {
      const appUser = await authenticateMiniAppUser(req);
      const reportingCurrency = await resolveReportingCurrency(req);
      const accounts = await listAccounts(appUser.id);
      const categories = await listCategories(appUser.id);
      const currencies = await listActiveCurrencies();
      const activity = await getRecentActivity(appUser.id);
      let summary = null;
      let report = null;

      try {
        summary = await getDashboardSummary(appUser.id, reportingCurrency);
      } catch (error) {
        console.error("Failed to build dashboard summary", error);
      }

      try {
        const reportRange = resolveReportRange("month");
        report = await getReport({
          userId: appUser.id,
          period: "month",
          startDate: reportRange.startDate,
          endDate: reportRange.endDate,
          reportingCurrency
        });
      } catch (error) {
        console.error("Failed to build default report", error);
      }

      res.json({
        user: appUser,
        accounts,
        categories,
        currencies,
        recentEntries: activity.recentEntries,
        recentTransfers: activity.recentTransfers,
        summary,
        report
      });
    } catch (error) {
      console.error("Failed to bootstrap mini app", error);

      res.status(400).json({
        error: error instanceof Error ? error.message : "Failed to bootstrap mini app"
      });
    }
  });

  app.get("/api/operations", async (req, res) => {
    try {
      const appUser = await authenticateMiniAppUser(req);
      const reportingCurrency = await resolveReportingCurrency(req);
      const parsed = parseOperationsListQuery(req.query as Record<string, unknown>);
      const result = await listOperationsTimeline(appUser.id, reportingCurrency, parsed);
      res.json(result);
    } catch (error) {
      console.error("Failed to list operations", error);
      const message =
        getThrownErrorMessage(error) || "Не удалось загрузить операции.";
      const isClientRangeError =
        typeof message === "string" &&
        (message.startsWith("Некорректный") ||
          message.startsWith("Дата") ||
          message.startsWith("Интервал"));
      res.status(isClientRangeError ? 400 : 500).json({ error: message });
    }
  });

  app.post("/api/accounts", async (req, res) => {
    try {
      const appUser = await authenticateMiniAppUser(req);

      const name =
        typeof req.body?.name === "string" ? req.body.name.trim() : "";
      const type =
        typeof req.body?.type === "string" ? req.body.type.trim() : "";
      const currencyCode =
        typeof req.body?.currencyCode === "string"
          ? req.body.currencyCode.trim().toUpperCase()
          : "";
      const balance = Number(req.body?.balance ?? 0);

      if (!name) {
        res.status(400).json({ error: "Account name is required" });
        return;
      }

      if (!["cash", "card", "crypto", "savings", "other"].includes(type)) {
        res.status(400).json({ error: "Account type is invalid" });
        return;
      }

      if (!currencyCode) {
        res.status(400).json({ error: "Currency is required" });
        return;
      }

      const currency = await getCurrencyByCode(currencyCode);

      if (!currency) {
        res.status(400).json({ error: "Currency code is invalid" });
        return;
      }

      if (Number.isNaN(balance)) {
        res.status(400).json({ error: "Balance must be a number" });
        return;
      }

      const account = await createAccount({
        userId: appUser.id,
        name,
        type: type as "cash" | "card" | "crypto" | "savings" | "other",
        currencyCode,
        balance
      });

      res.status(201).json({ account });
    } catch (error) {
      console.error("Failed to create account from mini app", error);

      res.status(400).json({
        error:
          error instanceof Error ? error.message : "Failed to create account"
      });
    }
  });

  app.patch("/api/accounts/:accountId", async (req, res) => {
    try {
      const appUser = await authenticateMiniAppUser(req);
      const accountId =
        typeof req.params.accountId === "string" ? req.params.accountId.trim() : "";
      const name =
        typeof req.body?.name === "string" ? req.body.name.trim() : "";
      const type =
        typeof req.body?.type === "string" ? req.body.type.trim() : "";
      const currencyCode =
        typeof req.body?.currencyCode === "string"
          ? req.body.currencyCode.trim().toUpperCase()
          : "";
      const balance = Number(req.body?.balance ?? 0);

      if (!accountId) {
        res.status(400).json({ error: "Account id is required" });
        return;
      }

      if (!name) {
        res.status(400).json({ error: "Account name is required" });
        return;
      }

      if (!["cash", "card", "crypto", "savings", "other"].includes(type)) {
        res.status(400).json({ error: "Account type is invalid" });
        return;
      }

      if (!currencyCode) {
        res.status(400).json({ error: "Currency is required" });
        return;
      }

      const currency = await getCurrencyByCode(currencyCode);

      if (!currency) {
        res.status(400).json({ error: "Currency code is invalid" });
        return;
      }

      if (Number.isNaN(balance)) {
        res.status(400).json({ error: "Balance must be a number" });
        return;
      }

      const account = await updateAccount({
        accountId,
        userId: appUser.id,
        name,
        type: type as "cash" | "card" | "crypto" | "savings" | "other",
        currencyCode,
        balance
      });

      res.json({ account });
    } catch (error) {
      console.error("Failed to update account from mini app", error);

      res.status(400).json({
        error:
          error instanceof Error ? error.message : "Failed to update account"
      });
    }
  });

  app.delete("/api/accounts/:accountId", async (req, res) => {
    try {
      const appUser = await authenticateMiniAppUser(req);
      const accountId =
        typeof req.params.accountId === "string" ? req.params.accountId.trim() : "";

      if (!accountId) {
        res.status(400).json({ error: "Account id is required" });
        return;
      }

      await deleteAccount(accountId, appUser.id);
      res.status(204).send();
    } catch (error) {
      console.error("Failed to delete account from mini app", error);

      const message =
        getThrownErrorMessage(error) || "Не удалось удалить счёт.";

      res.status(400).json({
        error: isForeignKeyViolation(error, message)
          ? "Нельзя удалить счет, пока он используется в операциях или переводах."
          : message
      });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const appUser = await authenticateMiniAppUser(req);
      const name =
        typeof req.body?.name === "string" ? req.body.name.trim() : "";
      const kind =
        typeof req.body?.kind === "string" ? req.body.kind.trim() : "";

      if (!name) {
        res.status(400).json({ error: "Category name is required" });
        return;
      }

      if (!["income", "expense"].includes(kind)) {
        res.status(400).json({ error: "Category kind is invalid" });
        return;
      }

      const category = await createCategory({
        userId: appUser.id,
        kind: kind as OperationKind,
        name
      });

      res.status(201).json({ category });
    } catch (error) {
      console.error("Failed to create category from mini app", error);

      res.status(400).json({
        error:
          error instanceof Error ? error.message : "Failed to create category"
      });
    }
  });

  app.patch("/api/categories/:categoryId", async (req, res) => {
    try {
      const appUser = await authenticateMiniAppUser(req);
      const categoryId =
        typeof req.params.categoryId === "string"
          ? req.params.categoryId.trim()
          : "";
      const name =
        typeof req.body?.name === "string" ? req.body.name.trim() : "";
      const kind =
        typeof req.body?.kind === "string" ? req.body.kind.trim() : "";

      if (!categoryId) {
        res.status(400).json({ error: "Category id is required" });
        return;
      }

      if (!name) {
        res.status(400).json({ error: "Category name is required" });
        return;
      }

      if (!["income", "expense"].includes(kind)) {
        res.status(400).json({ error: "Category kind is invalid" });
        return;
      }

      const category = await updateCategory({
        userId: appUser.id,
        categoryId,
        name,
        kind: kind as OperationKind
      });

      res.json({ category });
    } catch (error) {
      console.error("Failed to update category from mini app", error);

      res.status(400).json({
        error:
          error instanceof Error ? error.message : "Failed to update category"
      });
    }
  });

  app.delete("/api/categories/:categoryId", async (req, res) => {
    try {
      const appUser = await authenticateMiniAppUser(req);
      const categoryId =
        typeof req.params.categoryId === "string"
          ? req.params.categoryId.trim()
          : "";

      if (!categoryId) {
        res.status(400).json({ error: "Category id is required" });
        return;
      }

      await deleteCategory(categoryId, appUser.id);

      res.status(204).send();
    } catch (error) {
      console.error("Failed to delete category from mini app", error);

      res.status(400).json({
        error:
          error instanceof Error ? error.message : "Failed to delete category"
      });
    }
  });

  app.post("/api/entries", async (req, res) => {
    try {
      const appUser = await authenticateMiniAppUser(req);
      const kind =
        typeof req.body?.kind === "string" ? req.body.kind.trim() : "";
      const accountId =
        typeof req.body?.accountId === "string" ? req.body.accountId.trim() : "";
      const categoryId =
        typeof req.body?.categoryId === "string"
          ? req.body.categoryId.trim()
          : "";
      const amount = Number(req.body?.amount ?? 0);
      const note =
        typeof req.body?.note === "string" && req.body.note.trim()
          ? req.body.note.trim()
          : null;
      const occurredAt =
        typeof req.body?.occurredAt === "string" && req.body.occurredAt.trim()
          ? req.body.occurredAt.trim()
          : new Date().toISOString();

      if (!["income", "expense"].includes(kind)) {
        res.status(400).json({ error: "Operation kind is invalid" });
        return;
      }

      if (!accountId) {
        res.status(400).json({ error: "Account is required" });
        return;
      }

      if (!categoryId) {
        res.status(400).json({ error: "Category is required" });
        return;
      }

      if (Number.isNaN(amount) || amount <= 0) {
        res.status(400).json({ error: "Amount must be greater than 0" });
        return;
      }

      const entry = await createEntry({
        userId: appUser.id,
        kind: kind as OperationKind,
        accountId,
        categoryId,
        amount,
        note,
        occurredAt
      });

      res.status(201).json({ entry });
    } catch (error) {
      console.error("Failed to create entry from mini app", error);

      res.status(400).json({
        error: error instanceof Error ? error.message : "Failed to create entry"
      });
    }
  });

  app.post("/api/transfers", async (req, res) => {
    try {
      const appUser = await authenticateMiniAppUser(req);
      const fromAccountId =
        typeof req.body?.fromAccountId === "string"
          ? req.body.fromAccountId.trim()
          : "";
      const toAccountId =
        typeof req.body?.toAccountId === "string"
          ? req.body.toAccountId.trim()
          : "";
      const fromAmount = Number(req.body?.fromAmount ?? 0);
      const toAmount =
        req.body?.toAmount === null || req.body?.toAmount === undefined || req.body?.toAmount === ""
          ? null
          : Number(req.body?.toAmount);
      const note =
        typeof req.body?.note === "string" && req.body.note.trim()
          ? req.body.note.trim()
          : null;
      const occurredAt =
        typeof req.body?.occurredAt === "string" && req.body.occurredAt.trim()
          ? req.body.occurredAt.trim()
          : new Date().toISOString();

      if (!fromAccountId || !toAccountId) {
        res.status(400).json({ error: "Both accounts are required" });
        return;
      }

      if (Number.isNaN(fromAmount) || fromAmount <= 0) {
        res.status(400).json({ error: "Transfer amount must be greater than 0" });
        return;
      }

      if (toAmount !== null && (Number.isNaN(toAmount) || toAmount <= 0)) {
        res.status(400).json({ error: "Target amount must be greater than 0" });
        return;
      }

      const transfer = await createTransfer({
        userId: appUser.id,
        fromAccountId,
        toAccountId,
        fromAmount,
        toAmount,
        note,
        occurredAt
      });

      res.status(201).json({ transfer });
    } catch (error) {
      console.error("Failed to create transfer from mini app", error);

      res.status(400).json({
        error:
          error instanceof Error ? error.message : "Failed to create transfer"
      });
    }
  });

  app.get("/api/reports", async (req, res) => {
    try {
      const appUser = await authenticateMiniAppUser(req);
      const period =
        typeof req.query.period === "string" ? req.query.period : "month";
      const startDate =
        typeof req.query.startDate === "string" ? req.query.startDate : undefined;
      const endDate =
        typeof req.query.endDate === "string" ? req.query.endDate : undefined;
      const reportingCurrency = await resolveReportingCurrency(req);

      const categoryIdRaw =
        typeof req.query.categoryId === "string" ? req.query.categoryId.trim() : "";
      const categoryId = categoryIdRaw.length > 0 ? categoryIdRaw : undefined;

      const accountIdRaw =
        typeof req.query.accountId === "string" ? req.query.accountId.trim() : "";
      const accountId = accountIdRaw.length > 0 ? accountIdRaw : undefined;

      const kindRaw = typeof req.query.kind === "string" ? req.query.kind.trim() : "";
      const kind =
        kindRaw === "income" || kindRaw === "expense"
          ? (kindRaw as "income" | "expense")
          : undefined;

      if (kindRaw.length > 0 && kind === undefined) {
        res.status(400).json({ error: "Invalid kind filter" });
        return;
      }

      if (!["week", "month", "quarter", "year", "custom"].includes(period)) {
        res.status(400).json({ error: "Report period is invalid" });
        return;
      }

      const report = await getReport({
        userId: appUser.id,
        period: period as "week" | "month" | "quarter" | "year" | "custom",
        startDate,
        endDate,
        reportingCurrency,
        categoryId,
        accountId,
        kind
      });

      res.json({ report });
    } catch (error) {
      console.error("Failed to load report", error);

      res.status(400).json({
        error: error instanceof Error ? error.message : "Failed to load report"
      });
    }
  });

  app.options("/api/reports/export.csv", (_req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.status(204).end();
  });

  app.get("/api/reports/export.csv", async (req, res) => {
    try {
      const appUser = await authenticateCsvExportMiniAppUser(req);
      const period =
        typeof req.query.period === "string" ? req.query.period : "month";
      const startDate =
        typeof req.query.startDate === "string" ? req.query.startDate : undefined;
      const endDate =
        typeof req.query.endDate === "string" ? req.query.endDate : undefined;
      const reportingCurrency = await resolveReportingCurrency(req);

      const categoryIdRaw =
        typeof req.query.categoryId === "string" ? req.query.categoryId.trim() : "";
      const categoryId = categoryIdRaw.length > 0 ? categoryIdRaw : undefined;

      const accountIdRaw =
        typeof req.query.accountId === "string" ? req.query.accountId.trim() : "";
      const accountId = accountIdRaw.length > 0 ? accountIdRaw : undefined;

      const kindRaw = typeof req.query.kind === "string" ? req.query.kind.trim() : "";
      const kind =
        kindRaw === "income" || kindRaw === "expense"
          ? (kindRaw as "income" | "expense")
          : undefined;

      if (kindRaw.length > 0 && kind === undefined) {
        res.status(400).json({ error: "Invalid kind filter" });
        return;
      }

      if (!["week", "month", "quarter", "year", "custom"].includes(period)) {
        res.status(400).json({ error: "Report period is invalid" });
        return;
      }

      const exportInput = {
        userId: appUser.id,
        period: period as "week" | "month" | "quarter" | "year" | "custom",
        startDate,
        endDate,
        reportingCurrency,
        categoryId,
        accountId,
        kind
      };

      const { report, operations } = await buildReportExportPayload(exportInput);

      const body = formatReportResultAsCsv(report, operations);
      const fromDay = report.startDate.slice(0, 10).replace(/-/g, "");
      const toDay = report.endDate.slice(0, 10).replace(/-/g, "");

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="balancy-report-${fromDay}-${toDay}.csv"`
      );
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.status(200).send(body);
    } catch (error) {
      console.error("Failed to export report CSV", error);

      res.status(400).json({
        error:
          error instanceof Error ? error.message : "Failed to export report CSV"
      });
    }
  });

  app.post("/api/exchange-rates/sync", async (req, res) => {
    try {
      await authenticateMiniAppUser(req);
      const result = await syncExchangeRates();
      const ratesUpdatedAt = await getLatestExchangeRateUpdate();

      res.json({
        ...result,
        ratesUpdatedAt
      });
    } catch (error) {
      console.error("Failed to sync exchange rates", error);

      res.status(400).json({
        error:
          error instanceof Error ? error.message : "Failed to sync exchange rates"
      });
    }
  });

  app.get("/api/exchange-rates/quotes", async (req, res) => {
    try {
      await authenticateMiniAppUser(req);
      const requestedBase =
        typeof req.query.base === "string" ? req.query.base.trim().toUpperCase() : "";

      if (!requestedBase) {
        res.status(400).json({
          error: "Query «base» (код базовой валюты) обязателен"
        });
        return;
      }

      const currency = await getCurrencyByCode(requestedBase);

      if (!currency) {
        res.status(400).json({
          error: "Неизвестная или выключенная базовая валюта"
        });
        return;
      }

      const payload = await getSpotlightQuotesForBase(currency.code);
      res.json(payload);
    } catch (error) {
      console.error("Failed to load exchange quotes", error);

      res.status(400).json({
        error:
          error instanceof Error ? error.message : "Failed to load exchange quotes"
      });
    }
  });

  app.get("/api/exchange-rates/convert-preview", async (req, res) => {
    try {
      await authenticateMiniAppUser(req);

      const from =
        typeof req.query.from === "string" ? req.query.from.trim().toUpperCase() : "";
      const to =
        typeof req.query.to === "string" ? req.query.to.trim().toUpperCase() : "";

      const rawAmount =
        typeof req.query.amount === "string" ? req.query.amount.trim() : "";
      const amount = Number(rawAmount.replace(",", "."));

      if (!Number.isFinite(amount)) {
        res.status(400).json({
          error: "Укажите числовую сумму в параметре «amount»"
        });
        return;
      }

      if (!from || !to) {
        res.status(400).json({
          error: "Укажите параметры «from» и «to»"
        });
        return;
      }

      const [fromCurrency, toCurrency] = await Promise.all([
        getCurrencyByCode(from),
        getCurrencyByCode(to)
      ]);

      if (!fromCurrency || !toCurrency) {
        res.status(400).json({
          error: "Одна из валют не найдена или выключена"
        });
        return;
      }

      const result = await convertFxPreview(amount, fromCurrency.code, toCurrency.code);

      res.json({
        amount,
        from: fromCurrency.code,
        to: toCurrency.code,
        rate: result.rate,
        converted: result.converted
      });
    } catch (error) {
      console.error("Failed to convert preview", error);

      res.status(400).json({
        error:
          error instanceof Error ? error.message : "Failed to convert preview"
      });
    }
  });

  return app;
}
