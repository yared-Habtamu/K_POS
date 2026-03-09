"use client";

import * as React from "react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  countCurrencyTokensBeforeCaret,
  defaultCurrencies,
  findCaretForCurrencyTokenCount,
  formatCurrencyValue,
  parseCurrencyValue,
  sanitizeCurrencyInput,
  type CurrencyOption,
  validateCurrencyValue,
} from "@/lib/input-formatting";
import { cn } from "@/lib/utils";

export interface CurrencyInputDetails {
  currency: CurrencyOption;
  rawValue: string;
  formattedValue: string;
  numberValue: number | null;
  isValid: boolean;
}

export interface CurrencyValidationRules {
  required?: boolean;
  min?: number;
  max?: number;
  validateOnBlur?: boolean;
  customValidator?: (
    details: CurrencyInputDetails,
    currency: CurrencyOption,
  ) => string | undefined;
}

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "defaultValue" | "onChange" | "value"> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string, details: CurrencyInputDetails) => void;
  currencies?: CurrencyOption[];
  currencyValue?: string;
  defaultCurrencyValue?: string;
  onCurrencyChange?: (currency: CurrencyOption) => void;
  showCurrencySelector?: boolean;
  currencyName?: string;
  validation?: CurrencyValidationRules;
  onValidationChange?: (error?: string) => void;
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: React.ReactNode;
  className?: string;
  inputClassName?: string;
  currencySelectClassName?: string;
}

function getCurrencyByCode(currencies: CurrencyOption[], code?: string) {
  if (!code) {
    return currencies[0];
  }

  return currencies.find((currency) => currency.code === code) ?? currencies[0];
}

export function CurrencyInput({
  value,
  defaultValue = "",
  onValueChange,
  currencies = defaultCurrencies,
  currencyValue,
  defaultCurrencyValue,
  onCurrencyChange,
  showCurrencySelector = false,
  currencyName,
  validation,
  onValidationChange,
  label,
  helperText,
  error,
  className,
  inputClassName,
  currencySelectClassName,
  id,
  name,
  disabled,
  placeholder,
  onBlur,
  ...inputProps
}: CurrencyInputProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const validationMessageId = `${inputId}-message`;
  const helperMessageId = `${inputId}-helper`;
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const [internalCurrencyCode, setInternalCurrencyCode] = React.useState(
    defaultCurrencyValue ?? currencies[0]?.code,
  );
  const [isTouched, setIsTouched] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const pendingCaretRef = React.useRef<number | null>(null);

  const selectedCurrency = React.useMemo(
    () => getCurrencyByCode(currencies, currencyValue ?? internalCurrencyCode),
    [currencies, currencyValue, internalCurrencyCode],
  );

  const rawValue = React.useMemo(
    () => sanitizeCurrencyInput(value ?? internalValue, selectedCurrency),
    [internalValue, selectedCurrency, value],
  );
  const formattedValue = React.useMemo(
    () => formatCurrencyValue(rawValue, selectedCurrency),
    [rawValue, selectedCurrency],
  );
  const details = React.useMemo<CurrencyInputDetails>(() => {
    const numberValue = parseCurrencyValue(rawValue);

    return {
      currency: selectedCurrency,
      rawValue,
      formattedValue,
      numberValue,
      isValid: numberValue !== null,
    };
  }, [formattedValue, rawValue, selectedCurrency]);

  const computedValidationError = React.useMemo(() => {
    const baseError = validateCurrencyValue(rawValue, validation);
    if (baseError) {
      return baseError;
    }

    return validation?.customValidator?.(details, selectedCurrency);
  }, [details, rawValue, selectedCurrency, validation]);

  const shouldShowValidation = Boolean(
    computedValidationError && (validation?.validateOnBlur ?? true ? isTouched : true),
  );
  const visibleError = error ?? (shouldShowValidation ? computedValidationError : undefined);

  React.useEffect(() => {
    onValidationChange?.(typeof visibleError === "string" ? visibleError : computedValidationError);
  }, [computedValidationError, onValidationChange, visibleError]);

  React.useLayoutEffect(() => {
    if (pendingCaretRef.current === null || !inputRef.current) {
      return;
    }

    const nextCaret = findCaretForCurrencyTokenCount(formattedValue, pendingCaretRef.current);
    inputRef.current.setSelectionRange(nextCaret, nextCaret);
    pendingCaretRef.current = null;
  }, [formattedValue]);

  const commitValue = React.useCallback(
    (nextRawValue: string, nextCurrency: CurrencyOption) => {
      if (value === undefined) {
        setInternalValue(nextRawValue);
      }

      const nextFormattedValue = formatCurrencyValue(nextRawValue, nextCurrency);
      const nextNumberValue = parseCurrencyValue(nextRawValue);

      onValueChange?.(nextRawValue, {
        currency: nextCurrency,
        rawValue: nextRawValue,
        formattedValue: nextFormattedValue,
        numberValue: nextNumberValue,
        isValid: nextNumberValue !== null,
      });
    },
    [onValueChange, value],
  );

  const handleCurrencyChange = (nextCurrencyCode: string) => {
    const nextCurrency = getCurrencyByCode(currencies, nextCurrencyCode);

    if (currencyValue === undefined) {
      setInternalCurrencyCode(nextCurrency.code);
    }

    onCurrencyChange?.(nextCurrency);

    const nextRawValue = sanitizeCurrencyInput(rawValue, nextCurrency);
    commitValue(nextRawValue, nextCurrency);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextDisplayValue = event.target.value;
    const nextTokenCount = countCurrencyTokensBeforeCaret(
      nextDisplayValue,
      event.target.selectionStart ?? nextDisplayValue.length,
    );
    const nextRawValue = sanitizeCurrencyInput(nextDisplayValue, selectedCurrency);

    pendingCaretRef.current = nextTokenCount;
    commitValue(nextRawValue, selectedCurrency);
  };

  const handleBeforeInput = (event: React.FormEvent<HTMLInputElement>) => {
    const nativeEvent = event.nativeEvent as InputEvent;
    if (!nativeEvent.data) {
      return;
    }

    const decimalSeparator = selectedCurrency.decimalSeparator ?? ".";
    const isAllowedCharacter = new RegExp(`[0-9\\-${decimalSeparator === "." ? "\\." : decimalSeparator},]`).test(
      nativeEvent.data,
    );

    if (!isAllowedCharacter) {
      nativeEvent.preventDefault();
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();

    const pastedValue = sanitizeCurrencyInput(
      event.clipboardData.getData("text"),
      selectedCurrency,
    );
    pendingCaretRef.current = pastedValue.length;
    commitValue(pastedValue, selectedCurrency);
  };

  const describedBy = [helperText ? helperMessageId : null, visibleError ? validationMessageId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cn("space-y-2", className)}>
      {label ? <Label htmlFor={inputId}>{label}</Label> : null}

      <div className={cn("grid gap-3", showCurrencySelector ? "sm:grid-cols-[minmax(9rem,11rem)_1fr]" : undefined)}>
        {showCurrencySelector ? (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Currency</Label>
            <Select value={selectedCurrency.code} onValueChange={handleCurrencyChange} disabled={disabled} name={currencyName}>
              <SelectTrigger className={cn(currencySelectClassName)} aria-label="Choose currency">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor={inputId} className="text-xs text-muted-foreground">Amount</Label>
          <input
            {...inputProps}
            ref={inputRef}
            id={inputId}
            name={name}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            disabled={disabled}
            value={formattedValue}
            placeholder={placeholder ?? selectedCurrency.placeholder}
            onChange={handleChange}
            onBeforeInput={handleBeforeInput}
            onPaste={handlePaste}
            onBlur={(event) => {
              setIsTouched(true);
              onBlur?.(event);
            }}
            aria-invalid={Boolean(visibleError)}
            aria-describedby={describedBy || undefined}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
              inputClassName,
            )}
          />
        </div>
      </div>

      {visibleError ? (
        <p id={validationMessageId} className="text-sm font-medium text-destructive">
          {visibleError}
        </p>
      ) : helperText ? (
        <p id={helperMessageId} className="text-sm text-muted-foreground">
          {helperText}
        </p>
      ) : rawValue ? (
        <p id={helperMessageId} className="text-sm text-muted-foreground">
          Normalized value: {details.numberValue ?? 0}
        </p>
      ) : null}
    </div>
  );
}

export default CurrencyInput;