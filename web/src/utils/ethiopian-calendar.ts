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

const ETHIOPIAN_MONTHS = [
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
];

const ETHIOPIAN_MONTHS_AMHARIC = [
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
];

/**
 * Check if a Gregorian year is a leap year.
 */
function isGregorianLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Check if an Ethiopian year is a leap year.
 * Ethiopian leap years occur every 4 years, but not in years divisible by 100
 * unless also divisible by 400. (Same rules as Gregorian but offset.)
 */
function isEthiopianLeapYear(year) {
  return year % 4 === 0;
}

/**
 * Get the number of days in Ethiopian month 13 (Pagume).
 */
function pagumeDays(ethiopianYear) {
  return isEthiopianLeapYear(ethiopianYear) ? 6 : 5;
}

/**
 * Convert Ethiopian date to Gregorian date.
 * @param {number} ethYear - Ethiopian year
 * @param {number} ethMonth - Ethiopian month (1-13)
 * @param {number} ethDay - Ethiopian day (1-30, or 1-5/6 for month 13)
 * @returns {{ year: number, month: number, day: number }} Gregorian date (1-indexed month)
 */
function ethiopianToGregorian(ethYear, ethMonth, ethDay) {
  // Ethiopian New Year starts on Meskerm 1 (September 11 in Gregorian,
  // or September 12 in Gregorian leap years)
  const gregorianYear = ethYear + 7;

  // September 11 (or 12 in Gregorian leap year)
  const newYearDay = isGregorianLeapYear(gregorianYear) ? 12 : 11;

  // Days elapsed since Ethiopian New Year
  let daysElapsed = 0;

  // Add full months (1 to ethMonth - 1)
  for (let m = 1; m < ethMonth; m++) {
    if (m <= 12) {
      daysElapsed += 30;
    } else {
      daysElapsed += pagumeDays(ethYear);
    }
  }

  // Add days in current month
  daysElapsed += ethDay - 1;

  // Convert to Gregorian
  // Start from September of gregorianYear
  const gregorianDate = new Date(gregorianYear, 8, newYearDay); // September = month 8 (0-indexed)
  gregorianDate.setDate(gregorianDate.getDate() + daysElapsed);

  return {
    year: gregorianDate.getFullYear(),
    month: gregorianDate.getMonth() + 1, // 1-indexed
    day: gregorianDate.getDate(),
  };
}

/**
 * Convert Gregorian date to Ethiopian date.
 * @param {number} gregYear - Gregorian year
 * @param {number} gregMonth - Gregorian month (1-12)
 * @param {number} gregDay - Gregorian day (1-31)
 * @returns {{ year: number, month: number, day: number }} Ethiopian date (1-indexed month)
 */
function gregorianToEthiopian(gregYear, gregMonth, gregDay) {
  // Ethiopian New Year falls on September 11 (or 12 in Gregorian leap year)
  const newYearDay = isGregorianLeapYear(gregYear) ? 12 : 11;

  // Days since Ethiopian New Year
  const gregDate = new Date(gregYear, gregMonth - 1, gregDay);
  const ethNewYear = new Date(gregYear, 8, newYearDay); // September

  let daysSinceNewYear;
  if (gregDate >= ethNewYear) {
    daysSinceNewYear = Math.floor(
      (gregDate - ethNewYear) / (24 * 60 * 60 * 1000),
    );
  } else {
    // Before Ethiopian New Year, we're in the previous Ethiopian year
    const prevEthNewYear = new Date(gregYear - 1, 8, newYearDay);
    daysSinceNewYear = Math.floor(
      (gregDate - prevEthNewYear) / (24 * 60 * 60 * 1000),
    );
  }

  const ethYear = gregDate >= ethNewYear ? gregYear - 7 : gregYear - 7 - 1;

  // Determine month and day
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

  const ethDay = remainingDays + 1;

  return { year: ethYear, month: ethMonth, day: ethDay };
}

/**
 * Format Ethiopian date as YYYY-MM-DD (Gregorian) for API calls.
 * This is the standard API date format.
 */
function ethiopianToGregorianYmd(ethYear, ethMonth, ethDay) {
  const greg = ethiopianToGregorian(ethYear, ethMonth, ethDay);
  const mm = String(greg.month).padStart(2, "0");
  const dd = String(greg.day).padStart(2, "0");
  return `${greg.year}-${mm}-${dd}`;
}

/**
 * Parse a Gregorian YYYY-MM-DD string and return Ethiopian date components.
 */
function parseGregorianYmd(ymd) {
  if (!ymd || typeof ymd !== "string") return null;
  const parts = ymd.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  return gregorianToEthiopian(parts[0], parts[1], parts[2]);
}

/**
 * Format an Ethiopian date for display.
 * @param {number} ethYear
 * @param {number} ethMonth
 * @param {number} ethDay
 * @param {object} options - { locale: 'en' | 'am', showMonthName: boolean }
 */
function formatEthiopianDate(ethYear, ethMonth, ethDay, options = {}) {
  const { locale = "en", showMonthName = true } = options;

  if (showMonthName) {
    const months =
      locale === "am" ? ETHIOPIAN_MONTHS_AMHARIC : ETHIOPIAN_MONTHS;
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
function currentEthiopianDate() {
  const now = new Date();
  return gregorianToEthiopian(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate(),
  );
}

module.exports = {
  ethiopianToGregorian,
  gregorianToEthiopian,
  ethiopianToGregorianYmd,
  parseGregorianYmd,
  formatEthiopianDate,
  currentEthiopianDate,
  isEthiopianLeapYear,
  pagumeDays,
  ETHIOPIAN_MONTHS,
  ETHIOPIAN_MONTHS_AMHARIC,
};
