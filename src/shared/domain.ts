export const accountTypes = [
  "cash",
  "card",
  "crypto",
  "savings",
  "other"
] as const;

export type AccountType = (typeof accountTypes)[number];

export const operationKinds = ["income", "expense"] as const;

export type OperationKind = (typeof operationKinds)[number];

export const defaultCurrencyCodes = [
  "USD",
  "EUR",
  "GBP",
  "CHF",
  "PLN",
  "BYN",
  "RUB",
  "GEL",
  "UAH",
  "TRY",
  "KZT",
  "AED",
  "CAD",
  "AUD",
  "CNY",
  "JPY"
] as const;

export type DefaultCurrencyCode = (typeof defaultCurrencyCodes)[number];

export interface AppUser {
  id: string;
  telegramUserId: number;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  currencyCode: string;
  balance: number;
}

export interface Category {
  id: string;
  userId: string;
  kind: OperationKind;
  name: string;
}

export interface Entry {
  id: string;
  userId: string;
  kind: OperationKind;
  accountId: string;
  categoryId: string | null;
  amount: number;
  currencyCode: string;
  note: string | null;
  photoUrl: string | null;
  occurredAt: string;
}

export interface Transfer {
  id: string;
  userId: string;
  fromAccountId: string;
  toAccountId: string;
  fromAmount: number;
  toAmount: number;
  fromCurrencyCode: string;
  toCurrencyCode: string;
  rate: number | null;
  note: string | null;
  occurredAt: string;
}
