import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

// ─── Ethiopian Calendar Utilities ────────────────────────────────────────────

const ETHIOPIAN_MONTHS_EN = [
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

const ETHIOPIAN_MONTHS_AM = [
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

function isGregorianLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function isEthiopianLeapYear(year: number): boolean {
  return year % 4 === 0;
}

function pagumeDays(ethYear: number): number {
  return isEthiopianLeapYear(ethYear) ? 6 : 5;
}

function ethiopianToGregorian(
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

function gregorianToEthiopian(
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

function toGregorianYmd(
  year: number,
  month: number,
  day: number,
): string {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function parseGregorianYmd(ymd: string): { year: number; month: number; day: number } | null {
  if (!ymd) return null;
  const parts = ymd.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  return gregorianToEthiopian(parts[0], parts[1], parts[2]);
}

function getDaysInEthiopianMonth(ethYear: number, ethMonth: number): number {
  if (ethMonth === 13) return pagumeDays(ethYear);
  return 30;
}

// ─── Component Types ─────────────────────────────────────────────────────────

export interface EthiopianDatePickerProps {
  /** Gregorian YYYY-MM-DD value */
  value?: string;
  /** Called with Gregorian YYYY-MM-DD when user selects a date */
  onChange?: (gregorianYmd: string) => void;
  /** Selection mode */
  mode?: "single" | "range";
  /** Disable future dates */
  disableFuture?: boolean;
  /** Language for month names */
  locale?: "en" | "am";
  /** Additional class names */
  className?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Disabled state */
  disabled?: boolean;
}

interface RangeValue {
  from: string;
  to: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function EthiopianDatePicker({
  value,
  onChange,
  mode = "single",
  disableFuture = false,
  locale = "en",
  className,
  placeholder = "Select date",
  disabled = false,
}: EthiopianDatePickerProps) {
  const monthNames = locale === "am" ? ETHIOPIAN_MONTHS_AM : ETHIOPIAN_MONTHS_EN;

  // Convert Gregorian value to Ethiopian for display
  const ethDate = parseGregorianYmd(value || "");
  const [ethYear, setEthYear] = React.useState(ethDate?.year || 2017);
  const [ethMonth, setEthMonth] = React.useState(ethDate?.month || 1);
  const [ethDay, setEthDay] = React.useState(ethDate?.day || 1);
  const [isOpen, setIsOpen] = React.useState(false);

  // Range mode state
  const rangeValue = value as unknown as RangeValue | undefined;
  const rangeFrom = parseGregorianYmd(rangeValue?.from || "");
  const rangeTo = parseGregorianYmd(rangeValue?.to || "");

  // Check if a date is today or in the future (Gregorian)
  const isDateDisabled = (ethY: number, ethM: number, ethD: number): boolean => {
    if (!disableFuture) return false;
    const greg = ethiopianToGregorian(ethY, ethM, ethD);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(greg.year, greg.month - 1, greg.day);
    return checkDate > today;
  };

  const handleSelectDay = (day: number) => {
    if (isDateDisabled(ethYear, ethMonth, day)) return;
    setEthDay(day);

    if (mode === "single") {
      const gregYmd = toGregorianYmd(
        ...Object.values(ethiopianToGregorian(ethYear, ethMonth, day)),
      );
      onChange?.(gregYmd);
      setIsOpen(false);
    }
  };

  const handlePrevMonth = () => {
    if (ethMonth === 1) {
      setEthMonth(13);
      setEthYear(ethYear - 1);
    } else {
      setEthMonth(ethMonth - 1);
    }
    setEthDay(1);
  };

  const handleNextMonth = () => {
    if (ethMonth === 13) {
      setEthMonth(1);
      setEthYear(ethYear + 1);
    } else {
      setEthMonth(ethMonth + 1);
    }
    setEthDay(1);
  };

  const handlePrevYear = () => {
    setEthYear(ethYear - 1);
    setEthDay(1);
  };

  const handleNextYear = () => {
    setEthYear(ethYear + 1);
    setEthDay(1);
  };

  const daysInMonth = getDaysInEthiopianMonth(ethYear, ethMonth);

  // Get day of week for first day of month (0 = Sunday)
  // We compute from Gregorian equivalent
  const firstGreg = ethiopianToGregorian(ethYear, ethMonth, 1);
  const firstDayOfWeek = new Date(
    firstGreg.year,
    firstGreg.month - 1,
    firstGreg.day,
  ).getDay();

  const displayValue = value
    ? (() => {
        const eth = parseGregorianYmd(value);
        if (!eth) return placeholder;
        return formatEthiopianDisplay(eth.year, eth.month, eth.day, monthNames);
      })()
    : placeholder;

  return (
    <div className={cn("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "placeholder:text-muted-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !value && "text-muted-foreground",
        )}
      >
        <span>{displayValue}</span>
        <ChevronRight className="h-4 w-4 opacity-50" />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 rounded-md border bg-popover p-3 shadow-md">
          {/* Year and Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={handlePrevYear}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-7 w-7 p-0 opacity-50 hover:opacity-100",
              )}
            >
              <ChevronLeft className="h-4 w-4" />
              <ChevronLeft className="h-4 w-4 -ml-2" />
            </button>
            <button
              type="button"
              onClick={handlePrevMonth}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-7 w-7 p-0 opacity-50 hover:opacity-100",
              )}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="text-sm font-medium">
              {monthNames[ethMonth - 1]} {ethYear}
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-7 w-7 p-0 opacity-50 hover:opacity-100",
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleNextYear}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-7 w-7 p-0 opacity-50 hover:opacity-100",
              )}
            >
              <ChevronRight className="h-4 w-4" />
              <ChevronRight className="h-4 w-4 -ml-2" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div
                key={i}
                className="text-center text-[0.7rem] font-medium text-muted-foreground"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for offset */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isSelected =
                mode === "single" &&
                ethDate?.year === ethYear &&
                ethDate?.month === ethMonth &&
                ethDate?.day === day;
              const isDisabled = isDateDisabled(ethYear, ethMonth, day);
              const isToday = (() => {
                const now = new Date();
                const todayEth = gregorianToEthiopian(
                  now.getFullYear(),
                  now.getMonth() + 1,
                  now.getDate(),
                );
                return (
                  todayEth.year === ethYear &&
                  todayEth.month === ethMonth &&
                  todayEth.day === day
                );
              })();

              return (
                <button
                  key={day}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelectDay(day)}
                  className={cn(
                    "h-9 w-9 rounded-md text-sm font-normal transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus:bg-accent focus:text-accent-foreground focus:outline-none",
                    isSelected &&
                      "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                    isToday && !isSelected && "bg-accent text-accent-foreground",
                    isDisabled &&
                      "text-muted-foreground opacity-50 cursor-not-allowed",
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Close button */}
          <div className="flex justify-end mt-3">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-8 px-3 text-xs",
              )}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatEthiopianDisplay(
  year: number,
  month: number,
  day: number,
  monthNames: string[],
): string {
  return `${monthNames[month - 1]} ${day}, ${year}`;
}

export default EthiopianDatePicker;
