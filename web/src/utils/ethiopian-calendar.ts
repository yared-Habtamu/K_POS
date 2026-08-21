/**
 * Ethiopian Calendar Utilities
 *
 * The Ethiopian calendar has 13 months:
 * - Months 1-12: 30 days each
 * - Month 13 (Pagume): 5 days (6 in leap year)
 *
 * The Ethiopian calendar is approximately 7-8 years behind the Gregorian calendar.
 * Ethiopian New Year falls on Meskerm 1 (around September 11/12 Gregorian).
 */

export interface EthiopianDate {
  year: number;
  month: number;
  day: number;
}

export const ETHIOPIAN_MONTHS_EN = [
  "Meskerem",
  "Tikimt",
  "Hidar",
  "Tahsas",
  "Tir",
  "Yekatit",
  "Megabit",
  "Miazia",
  "Ginbot",
  "Sene",
  "Hamle",
  "Nehase",
  "Pagume",
] as const;

export const ETHIOPIAN_MONTHS_AM = [
  "መስከረም",
  "ጥቅምት",
  "ህዳር",
  "ታህሳስ",
  "ጥር",
  "የካቲት",
  "መጋቢት",
  "ሚያዝያ",
  "ግንቦት",
  "ሰኔ",
  "ሐምሌ",
  "ነሐሴ",
  "ጳጉሜ",
] as const;

function isGregorianLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function isEthiopianLeapYear(year: number): boolean {
  return year % 4 === 0;
}

export function pagumeDays(ethYear: number): number {
  return isEthiopianLeapYear(ethYear) ? 6 : 5;
}

/**
 * Convert Ethiopian date to Gregorian date.
 * @returns { year, month, day } Gregorian date (1-indexed month)
 */
export function ethiopianToGregorian(
  ethYear: number,
  ethMonth: number,
  ethDay: number,
): { year: number; month: number; day: number } {
  const gregorianYear = ethYear + 7;
  const newYearDay = isGregorianLeapYear(gregorianYear) ? 12 : 11;

  let daysElapsed = 0;
  for (let m = 1; m < ethMonth; m++) {
    daysElapsed += m <= 12 ? 30 : pagumeDays(ethYear);
  }
  daysElapsed += ethDay - 1;

  const gregorianDate = new Date(gregorianYear, 8, newYearDay);
  gregorianDate.setDate(gregorianDate.getDate() + daysElapsed);

  return {
    year: gregorianDate.getFullYear(),
    month: gregorianDate.getMonth() + 1,
    day: gregorianDate.getDate(),
  };
}

/**
 * Convert Gregorian date to Ethiopian date.
 * @returns { year, month, day } Ethiopian date (1-indexed month)
 */
export function gregorianToEthiopian(
  gregYear: number,
  gregMonth: number,
  gregDay: number,
): { year: number; month: number; day: number } {
  const newYearDay = isGregorianLeapYear(gregYear) ? 12 : 11;
  const gregDate = new Date(gregYear, gregMonth - 1, gregDay);
  const ethNewYear = new Date(gregYear, 8, newYearDay);

  let daysSinceNewYear: number;
  if (gregDate >= ethNewYear) {
    daysSinceNewYear = Math.floor(
      (gregDate.getTime() - ethNewYear.getTime()) / 86400000,
    );
  } else {
    const prevEthNewYear = new Date(gregYear - 1, 8, newYearDay);
    daysSinceNewYear = Math.floor(
      (gregDate.getTime() - prevEthNewYear.getTime()) / 86400000,
    );
  }

  const ethYear = gregDate >= ethNewYear ? gregYear - 7 : gregYear - 8;

  let ethMonth = 1;
  let remainingDays = daysSinceNewYear;

  for (let m = 1; m <= 13; m++) {
    const monthDays = m <= 12 ? 30 : pagumeDays(ethYear);
    if (remainingDays < monthDays) {
      ethMonth = m;
      break;
    }
    remainingDays -= monthDays;
  }

  return { year: ethYear, month: ethMonth, day: remainingDays + 1 };
}

/**
 * Convert Ethiopian date to Gregorian YYYY-MM-DD string for APIs.
 */
export function ethiopianToGregorianYmd(
  ethYear: number,
  ethMonth: number,
  ethDay: number,
): string {
  const greg = ethiopianToGregorian(ethYear, ethMonth, ethDay);
  const mm = String(greg.month).padStart(2, "0");
  const dd = String(greg.day).padStart(2, "0");
  return `${greg.year}-${mm}-${dd}`;
}

/**
 * Parse a Gregorian YYYY-MM-DD string and return Ethiopian date components.
 */
export function parseGregorianYmd(
  ymd: string,
): { year: number; month: number; day: number } | null {
  if (!ymd || typeof ymd !== "string") return null;
  const parts = ymd.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  return gregorianToEthiopian(parts[0], parts[1], parts[2]);
}

/**
 * Format an Ethiopian date for display.
 */
export function formatEthiopianDate(
  ethYear: number,
  ethMonth: number,
  ethDay: number,
  options: { locale?: "en" | "am"; showMonthName?: boolean } = {},
): string {
  const { locale = "en", showMonthName = true } = options;

  if (showMonthName) {
    const months = locale === "am" ? ETHIOPIAN_MONTHS_AM : ETHIOPIAN_MONTHS_EN;
    const monthName = months[ethMonth - 1] || "";
    return `${monthName} ${ethDay}, ${ethYear}`;
  }

  const mm = String(ethMonth).padStart(2, "0");
  const dd = String(ethDay).padStart(2, "0");
  return `${ethYear}-${mm}-${dd}`;
}

/**
 * Get the current Ethiopian date based on now.
 */
export function currentEthiopianDate(): {
  year: number;
  month: number;
  day: number;
} {
  const now = new Date();
  return gregorianToEthiopian(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate(),
  );
}

/**
 * Get the number of days in an Ethiopian month.
 */
export function getDaysInEthiopianMonth(
  ethYear: number,
  ethMonth: number,
): number {
  if (ethMonth === 13) return pagumeDays(ethYear);
  return 30;
}

/**
 * Format any date-like value (Date | ISO string | YYYY-MM-DD) as an
 * Ethiopian calendar label in Amharic, e.g. "ነሐሴ 29, 2018".
 * Always Amharic regardless of the app language.
 * Returns "-" when the value is missing or invalid.
 */
export function formatEthiopianDateValue(
  value: Date | string | number | null | undefined,
  options: { withTime?: boolean } = {},
): string {
  const { withTime = false } = options;
  if (value === null || value === undefined || value === "") return "-";
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "-";
  const eth = gregorianToEthiopian(
    d.getFullYear(),
    d.getMonth() + 1,
    d.getDate(),
  );
  const base = `${ETHIOPIAN_MONTHS_AM[eth.month - 1]} ${eth.day}, ${eth.year}`;
  if (!withTime) return base;
  const time = d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${base} ${time}`;
}

/**
 * Given a Gregorian year-month key like "2026-08", return the Ethiopian
 * month label that covers most of it, e.g. "ነሐሴ 2018" (always Amharic).
 */
export function ethiopianMonthLabel(gregYearMonth: string): string {
  if (!gregYearMonth) return "-";
  const [y, m] = gregYearMonth.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return gregYearMonth;
  const eth = gregorianToEthiopian(y, m, 15);
  return `${ETHIOPIAN_MONTHS_AM[eth.month - 1]} ${eth.year}`;
}

// ─── Language-aware display helpers ──────────────────────────────────────────

import i18n from "@/i18n";

/**
 * True when the app's selected language is Amharic.
 */
export function isAmharicLanguage(): boolean {
  return !!i18n.language?.startsWith?.("am");
}

/**
 * Display formatter that follows the app language:
 * - Amharic selected → Ethiopian calendar with Amharic month names
 *   e.g. "ነሐሴ 15, 2018" (+ optional time)
 * - English selected → Gregorian, as before ("Aug 21, 2026")
 */
export function formatLocalizedDate(
  value: Date | string | number | null | undefined,
  options: { withTime?: boolean } = {},
): string {
  const { withTime = false } = options;
  if (value === null || value === undefined || value === "") return "-";
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "-";

  if (!isAmharicLanguage()) {
    return withTime ? d.toLocaleString() : d.toLocaleDateString();
  }

  const eth = gregorianToEthiopian(
    d.getFullYear(),
    d.getMonth() + 1,
    d.getDate(),
  );
  const base = `${ETHIOPIAN_MONTHS_AM[eth.month - 1]} ${eth.day}, ${eth.year}`;
  if (!withTime) return base;
  return `${base} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

/**
 * Month label for filter dropdowns that follow the app language:
 * - Amharic → Ethiopian month covering most of that Gregorian month,
 *   e.g. "ነሐሴ 2018"
 * - English → Gregorian label, e.g. "Aug 2026" (short) / "August 2026" (long)
 */
export function localizedMonthLabel(
  gregYearMonth: string,
  options: { short?: boolean } = {},
): string {
  if (!gregYearMonth) return "-";
  if (!isAmharicLanguage()) {
    const [y, m] = gregYearMonth.split("-").map(Number);
    if (!y || !m || m < 1 || m > 12) return gregYearMonth;
    return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
      month: options.short ? "short" : "long",
      year: "numeric",
    });
  }
  return ethiopianMonthLabel(gregYearMonth);
}
