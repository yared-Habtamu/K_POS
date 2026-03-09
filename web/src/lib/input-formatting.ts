export interface PhoneCountryOption {
  iso2: string;
  name: string;
  dialCode: string;
  formatGroups: number[];
  minLength: number;
  maxLength: number;
  trunkPrefix?: string;
  placeholder?: string;
}

export interface CurrencyOption {
  code: string;
  symbol: string;
  locale?: string;
  thousandSeparator?: string;
  decimalSeparator?: string;
  decimals?: number;
  symbolPosition?: "prefix" | "suffix";
  allowNegative?: boolean;
  placeholder?: string;
}

export const defaultPhoneCountries: PhoneCountryOption[] = [
  {
    iso2: "ET",
    name: "Ethiopia",
    dialCode: "251",
    formatGroups: [3, 3, 3],
    minLength: 9,
    maxLength: 9,
    trunkPrefix: "0",
    placeholder: "912 345 678",
  },
  {
    iso2: "KE",
    name: "Kenya",
    dialCode: "254",
    formatGroups: [3, 3, 3],
    minLength: 9,
    maxLength: 9,
    trunkPrefix: "0",
    placeholder: "712 345 678",
  },
  {
    iso2: "US",
    name: "United States",
    dialCode: "1",
    formatGroups: [3, 3, 4],
    minLength: 10,
    maxLength: 10,
    placeholder: "201 555 0123",
  },
  {
    iso2: "GB",
    name: "United Kingdom",
    dialCode: "44",
    formatGroups: [4, 3, 4],
    minLength: 10,
    maxLength: 10,
    trunkPrefix: "0",
    placeholder: "7400 123 456",
  },
];

export const defaultCurrencies: CurrencyOption[] = [
  {
    code: "ETB",
    symbol: "ETB",
    symbolPosition: "suffix",
    thousandSeparator: ",",
    decimalSeparator: ".",
    decimals: 2,
    placeholder: "15,000 ETB",
  },
  {
    code: "USD",
    symbol: "$",
    symbolPosition: "prefix",
    thousandSeparator: ",",
    decimalSeparator: ".",
    decimals: 2,
    allowNegative: false,
    placeholder: "$ 1,500.00",
  },
  {
    code: "EUR",
    symbol: "EUR",
    symbolPosition: "suffix",
    thousandSeparator: ",",
    decimalSeparator: ".",
    decimals: 2,
    placeholder: "1,500 EUR",
  },
  {
    code: "KES",
    symbol: "KES",
    symbolPosition: "suffix",
    thousandSeparator: ",",
    decimalSeparator: ".",
    decimals: 2,
    placeholder: "1,500 KES",
  },
];

export function stripToDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function normalizePhoneDigits(value: string, country: PhoneCountryOption) {
  let digits = stripToDigits(value);

  if (country.trunkPrefix) {
    while (digits.length > country.maxLength && digits.startsWith(country.trunkPrefix)) {
      digits = digits.slice(country.trunkPrefix.length);
    }
  }

  return digits.slice(0, country.maxLength);
}

export function formatDigitGroups(digits: string, groups: number[]) {
  if (!digits) {
    return "";
  }

  const parts: string[] = [];
  let cursor = 0;

  groups.forEach((groupSize) => {
    if (cursor >= digits.length) {
      return;
    }

    parts.push(digits.slice(cursor, cursor + groupSize));
    cursor += groupSize;
  });

  if (cursor < digits.length) {
    parts.push(digits.slice(cursor));
  }

  return parts.filter(Boolean).join(" ");
}

export function formatPhoneNationalNumber(digits: string, country: PhoneCountryOption) {
  return formatDigitGroups(digits, country.formatGroups);
}

export function formatPhoneInternationalNumber(digits: string, country: PhoneCountryOption) {
  const nationalNumber = formatPhoneNationalNumber(digits, country);

  if (!nationalNumber) {
    return `+${country.dialCode}`;
  }

  return `+${country.dialCode} ${nationalNumber}`;
}

export function validatePhoneDigits(
  digits: string,
  country: PhoneCountryOption,
  rules?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
  },
) {
  const minLength = rules?.minLength ?? country.minLength;
  const maxLength = rules?.maxLength ?? country.maxLength;

  if (rules?.required && digits.length === 0) {
    return "Phone number is required.";
  }

  if (digits.length > 0 && digits.length < minLength) {
    return `${country.name} phone numbers must be at least ${minLength} digits.`;
  }

  if (digits.length > maxLength) {
    return `${country.name} phone numbers must be at most ${maxLength} digits.`;
  }

  return undefined;
}

function normalizeIntegerPart(integerPart: string) {
  const stripped = integerPart.replace(/^0+(?=\d)/, "");
  return stripped || "0";
}

export function sanitizeCurrencyInput(value: string, currency: CurrencyOption) {
  const decimals = currency.decimals ?? 2;
  const allowNegative = currency.allowNegative ?? false;
  const decimalSeparator = currency.decimalSeparator ?? ".";
  const altDecimalSeparator = decimalSeparator === "." ? "," : ".";

  let result = "";
  let hasDecimal = false;
  let decimalDigits = 0;
  let hasMinus = false;

  for (const character of value) {
    if (/\d/.test(character)) {
      if (hasDecimal && decimalDigits >= decimals) {
        continue;
      }

      result += character;

      if (hasDecimal) {
        decimalDigits += 1;
      }

      continue;
    }

    if (
      decimals > 0 &&
      !hasDecimal &&
      (character === decimalSeparator || character === altDecimalSeparator)
    ) {
      result = result === "" || result === "-" ? `${result}0.` : `${result}.`;
      hasDecimal = true;
      continue;
    }

    if (character === "-" && allowNegative && !hasMinus && result.length === 0) {
      result = "-";
      hasMinus = true;
    }
  }

  if (result === "" || result === "-") {
    return result;
  }

  const isNegative = result.startsWith("-");
  const unsignedValue = isNegative ? result.slice(1) : result;
  const [integerPart = "", decimalPart] = unsignedValue.split(".");
  const normalizedIntegerPart = normalizeIntegerPart(integerPart);
  const normalizedValue = decimalPart !== undefined
    ? `${isNegative ? "-" : ""}${normalizedIntegerPart}.${decimalPart}`
    : `${isNegative ? "-" : ""}${normalizedIntegerPart}`;

  return normalizedValue;
}

export function formatCurrencyValue(rawValue: string, currency: CurrencyOption) {
  if (!rawValue) {
    return "";
  }

  if (rawValue === "-") {
    return "-";
  }

  const thousandSeparator = currency.thousandSeparator ?? ",";
  const decimalSeparator = currency.decimalSeparator ?? ".";
  const symbolPosition = currency.symbolPosition ?? "suffix";
  const [integerPart, decimalPart] = rawValue.replace(/^-/, "").split(".");
  const isNegative = rawValue.startsWith("-");
  const groupedIntegerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator);
  const amount = decimalPart !== undefined
    ? `${groupedIntegerPart}${decimalSeparator}${decimalPart}`
    : groupedIntegerPart;
  const signedAmount = isNegative ? `-${amount}` : amount;
  const separator = currency.symbol.length === 1 && symbolPosition === "prefix" ? "" : " ";

  return symbolPosition === "prefix"
    ? `${currency.symbol}${separator}${signedAmount}`
    : `${signedAmount}${separator}${currency.symbol}`;
}

export function parseCurrencyValue(rawValue: string) {
  if (!rawValue || rawValue === "-" || rawValue === ".") {
    return null;
  }

  const parsed = Number(rawValue);
  return Number.isNaN(parsed) ? null : parsed;
}

export function validateCurrencyValue(
  rawValue: string,
  rules?: {
    required?: boolean;
    min?: number;
    max?: number;
  },
) {
  const numericValue = parseCurrencyValue(rawValue);

  if (rules?.required && (rawValue === "" || numericValue === null)) {
    return "Amount is required.";
  }

  if (numericValue === null) {
    return undefined;
  }

  if (rules?.min !== undefined && numericValue < rules.min) {
    return `Amount must be at least ${rules.min}.`;
  }

  if (rules?.max !== undefined && numericValue > rules.max) {
    return `Amount must be at most ${rules.max}.`;
  }

  return undefined;
}

export function countDigitsBeforeCaret(value: string, caret: number) {
  return stripToDigits(value.slice(0, caret)).length;
}

export function findCaretForDigitCount(formattedValue: string, digitCount: number) {
  if (digitCount <= 0) {
    return 0;
  }

  let seenDigits = 0;

  for (let index = 0; index < formattedValue.length; index += 1) {
    if (/\d/.test(formattedValue[index])) {
      seenDigits += 1;
    }

    if (seenDigits >= digitCount) {
      return index + 1;
    }
  }

  return formattedValue.length;
}

export function countCurrencyTokensBeforeCaret(value: string, caret: number) {
  const slice = value.slice(0, caret);
  const matches = slice.match(/[\d.-]/g);
  return matches?.length ?? 0;
}

export function findCaretForCurrencyTokenCount(formattedValue: string, tokenCount: number) {
  if (tokenCount <= 0) {
    return 0;
  }

  let seenTokens = 0;

  for (let index = 0; index < formattedValue.length; index += 1) {
    if (/[\d.-]/.test(formattedValue[index])) {
      seenTokens += 1;
    }

    if (seenTokens >= tokenCount) {
      return index + 1;
    }
  }

  return formattedValue.length;
}