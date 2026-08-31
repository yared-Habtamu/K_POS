import * as React from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  ethiopianToGregorian,
  gregorianToEthiopian,
  parseGregorianYmd,
  getDaysInEthiopianMonth,
  currentEthiopianDate,
  ETHIOPIAN_MONTHS_AM,
  type EthiopianDate,
} from "@/utils/ethiopian-calendar";

export type { EthiopianDate } from "@/utils/ethiopian-calendar";
export {
  ethiopianToGregorian,
  gregorianToEthiopian,
  ethiopianToGregorianYmd,
  parseGregorianYmd,
  formatEthiopianDate,
  currentEthiopianDate,
  getDaysInEthiopianMonth,
  isEthiopianLeapYear,
  pagumeDays,
  ETHIOPIAN_MONTHS_EN,
  ETHIOPIAN_MONTHS_AM,
} from "@/utils/ethiopian-calendar";

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
  /** Additional class names */
  className?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Optional id for label association */
  id?: string;
}

/** Format a Gregorian YMD string as an Ethiopian display label (always Amharic). */
function ethLabel(ymd: string): string | null {
  const eth = parseGregorianYmd(ymd);
  if (!eth) return null;
  return `${ETHIOPIAN_MONTHS_AM[eth.month - 1]} ${eth.day}, ${eth.year}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function EthiopianDatePicker({
  value,
  onChange,
  mode = "single",
  disableFuture = false,
  className,
  placeholder = "Select Date",
  disabled = false,
  id,
}: EthiopianDatePickerProps) {
  // The Ethiopian calendar UI is always shown in Amharic regardless of app language
  const monthNames = ETHIOPIAN_MONTHS_AM;

  // Convert Gregorian value to Ethiopian for display
  const ethDate = parseGregorianYmd(value || "");
  const todayEth = currentEthiopianDate();
  const [navYear, setNavYear] = React.useState(
    ethDate?.year ?? todayEth.year,
  );
  const [navMonth, setNavMonth] = React.useState(
    ethDate?.month ?? todayEth.month,
  );
  const [isOpen, setIsOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  // Sync navigation state when the external value changes
  React.useEffect(() => {
    if (ethDate) {
      setNavYear(ethDate.year);
      setNavMonth(ethDate.month);
    }
  }, [value]);

  // Close on outside click / Escape
  React.useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const openPicker = () => {
    if (disabled) return;
    if (!isOpen && !ethDate) {
      // Start navigation from today when nothing is selected
      setNavYear(todayEth.year);
      setNavMonth(todayEth.month);
    }
    setIsOpen(!isOpen);
  };

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
    if (isDateDisabled(navYear, navMonth, day)) return;

    if (mode === "single") {
      const greg = ethiopianToGregorian(navYear, navMonth, day);
      const mm = String(greg.month).padStart(2, "0");
      const dd = String(greg.day).padStart(2, "0");
      onChange?.(`${greg.year}-${mm}-${dd}`);
      setIsOpen(false);
    }
  };

  const handlePrevMonth = () => {
    if (navMonth === 1) {
      setNavMonth(13);
      setNavYear(navYear - 1);
    } else {
      setNavMonth(navMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (navMonth === 13) {
      setNavMonth(1);
      setNavYear(navYear + 1);
    } else {
      setNavMonth(navMonth + 1);
    }
  };

  const handlePrevYear = () => setNavYear(navYear - 1);
  const handleNextYear = () => setNavYear(navYear + 1);

  const daysInMonth = getDaysInEthiopianMonth(navYear, navMonth);

  // Get day of week for first day of month (0 = Sunday)
  const firstGreg = ethiopianToGregorian(navYear, navMonth, 1);
  const firstDayOfWeek = new Date(
    firstGreg.year,
    firstGreg.month - 1,
    firstGreg.day,
  ).getDay();

  const dayHeaders = ["እ", "ሰ", "ማ", "ረ", "ሐ", "ዓ", "ቅ"];

  const displayValue = value ? ethLabel(value) : null;
  const gregHint = value
    ? new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={openPicker}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm ring-offset-background",
          "placeholder:text-muted-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <span className="flex min-w-0 flex-col leading-tight">
          <span
            className={cn("truncate", !displayValue && "text-muted-foreground")}
          >
            {displayValue || placeholder}
          </span>
          {gregHint && (
            <span className="truncate text-[0.7rem] text-muted-foreground">
              {gregHint}
            </span>
          )}
        </span>
        <CalendarDays className="h-4 w-4 shrink-0 opacity-50" />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-72 rounded-md border bg-popover p-3 shadow-md">
          {/* Year and Month navigation */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex gap-1">
              <button
                type="button"
                onClick={handlePrevYear}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-7 w-7 p-0 opacity-50 hover:opacity-100",
                )}
              >
                <ChevronLeft className="h-4 w-4" />
                <ChevronLeft className="-ml-2 h-4 w-4" />
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
            </div>

            <div className="text-sm font-medium">
              {monthNames[navMonth - 1]} {navYear}
            </div>

            <div className="flex gap-1">
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
                <ChevronRight className="-ml-2 h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="mb-1 grid grid-cols-7 gap-1">
            {dayHeaders.map((d, i) => (
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
                ethDate?.year === navYear &&
                ethDate?.month === navMonth &&
                ethDate?.day === day;
              const isDisabled = isDateDisabled(navYear, navMonth, day);
              const isToday = (() => {
                return (
                  todayEth.year === navYear &&
                  todayEth.month === navMonth &&
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

          {/* Quick actions */}
          <div className="mt-3 flex justify-between">
            <button
              type="button"
              onClick={() => {
                setNavYear(todayEth.year);
                setNavMonth(todayEth.month);
                handleSelectDay(todayEth.day);
              }}
              disabled={isDateDisabled(todayEth.year, todayEth.month, todayEth.day)}
              className={cn(buttonVariants({ variant: "ghost" }), "h-8 px-3 text-xs")}
            >
              ዛሬ
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-8 px-3 text-xs",
              )}
            >
              ዝጋ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default EthiopianDatePicker;
