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
  countDigitsBeforeCaret,
  defaultPhoneCountries,
  findCaretForDigitCount,
  formatPhoneInternationalNumber,
  formatPhoneNationalNumber,
  normalizePhoneDigits,
  type PhoneCountryOption,
  validatePhoneDigits,
} from "@/lib/input-formatting";
import { cn } from "@/lib/utils";

export interface PhoneNumberInputDetails {
  country: PhoneCountryOption;
  nationalNumber: string;
  formattedNationalNumber: string;
  internationalNumber: string;
  e164Number: string;
  isValid: boolean;
}

export interface PhoneNumberValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  validateOnBlur?: boolean;
  customValidator?: (
    details: PhoneNumberInputDetails,
    country: PhoneCountryOption,
  ) => string | undefined;
}

export interface PhoneNumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "defaultValue" | "onChange" | "value"> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string, details: PhoneNumberInputDetails) => void;
  countries?: PhoneCountryOption[];
  countryValue?: string;
  defaultCountryValue?: string;
  onCountryChange?: (country: PhoneCountryOption) => void;
  validation?: PhoneNumberValidationRules;
  onValidationChange?: (error?: string) => void;
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: React.ReactNode;
  countryLabel?: React.ReactNode;
  countryName?: string;
  className?: string;
  inputClassName?: string;
  countrySelectClassName?: string;
}

function getCountryByIso2(countries: PhoneCountryOption[], iso2?: string) {
  if (!iso2) {
    return countries[0];
  }

  return countries.find((country) => country.iso2 === iso2) ?? countries[0];
}

export function PhoneNumberInput({
  value,
  defaultValue = "",
  onValueChange,
  countries = defaultPhoneCountries,
  countryValue,
  defaultCountryValue,
  onCountryChange,
  validation,
  onValidationChange,
  label,
  helperText,
  error,
  countryLabel = "Country code",
  countryName,
  className,
  inputClassName,
  countrySelectClassName,
  id,
  name,
  disabled,
  placeholder,
  onBlur,
  ...inputProps
}: PhoneNumberInputProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const validationMessageId = `${inputId}-message`;
  const helperMessageId = `${inputId}-helper`;
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const [internalCountryValue, setInternalCountryValue] = React.useState(
    defaultCountryValue ?? countries[0]?.iso2,
  );
  const [isTouched, setIsTouched] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const pendingCaretRef = React.useRef<number | null>(null);

  const selectedCountry = React.useMemo(
    () => getCountryByIso2(countries, countryValue ?? internalCountryValue),
    [countries, countryValue, internalCountryValue],
  );

  const digitsValue = React.useMemo(
    () => normalizePhoneDigits(value ?? internalValue, selectedCountry),
    [internalValue, selectedCountry, value],
  );
  const formattedNationalNumber = React.useMemo(
    () => formatPhoneNationalNumber(digitsValue, selectedCountry),
    [digitsValue, selectedCountry],
  );
  const details = React.useMemo<PhoneNumberInputDetails>(() => ({
    country: selectedCountry,
    nationalNumber: digitsValue,
    formattedNationalNumber,
    internationalNumber: formatPhoneInternationalNumber(digitsValue, selectedCountry),
    e164Number: digitsValue ? `+${selectedCountry.dialCode}${digitsValue}` : "",
    isValid: digitsValue.length >= (validation?.minLength ?? selectedCountry.minLength),
  }), [digitsValue, formattedNationalNumber, selectedCountry, validation?.minLength]);

  const computedValidationError = React.useMemo(() => {
    const baseError = validatePhoneDigits(digitsValue, selectedCountry, validation);
    if (baseError) {
      return baseError;
    }

    return validation?.customValidator?.(details, selectedCountry);
  }, [details, digitsValue, selectedCountry, validation]);

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

    const nextCaret = findCaretForDigitCount(formattedNationalNumber, pendingCaretRef.current);
    inputRef.current.setSelectionRange(nextCaret, nextCaret);
    pendingCaretRef.current = null;
  }, [formattedNationalNumber]);

  const commitValue = React.useCallback(
    (nextDigits: string, nextCountry: PhoneCountryOption) => {
      if (value === undefined) {
        setInternalValue(nextDigits);
      }

      const nextFormatted = formatPhoneNationalNumber(nextDigits, nextCountry);
      const nextDetails: PhoneNumberInputDetails = {
        country: nextCountry,
        nationalNumber: nextDigits,
        formattedNationalNumber: nextFormatted,
        internationalNumber: formatPhoneInternationalNumber(nextDigits, nextCountry),
        e164Number: nextDigits ? `+${nextCountry.dialCode}${nextDigits}` : "",
        isValid: nextDigits.length >= (validation?.minLength ?? nextCountry.minLength),
      };

      onValueChange?.(nextDigits, nextDetails);
    },
    [onValueChange, validation?.minLength, value],
  );

  const handleCountryChange = (nextCountryIso2: string) => {
    const nextCountry = getCountryByIso2(countries, nextCountryIso2);

    if (countryValue === undefined) {
      setInternalCountryValue(nextCountry.iso2);
    }

    onCountryChange?.(nextCountry);

    const nextDigits = normalizePhoneDigits(digitsValue, nextCountry);
    commitValue(nextDigits, nextCountry);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextDisplayValue = event.target.value;
    const nextCaretDigitCount = countDigitsBeforeCaret(
      nextDisplayValue,
      event.target.selectionStart ?? nextDisplayValue.length,
    );
    const nextDigits = normalizePhoneDigits(nextDisplayValue, selectedCountry);

    pendingCaretRef.current = Math.min(nextCaretDigitCount, nextDigits.length);
    commitValue(nextDigits, selectedCountry);
  };

  const handleBeforeInput = (event: React.FormEvent<HTMLInputElement>) => {
    const nativeEvent = event.nativeEvent as InputEvent;
    if (nativeEvent.data && /\D/.test(nativeEvent.data)) {
      nativeEvent.preventDefault();
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();

    const pastedDigits = normalizePhoneDigits(
      event.clipboardData.getData("text"),
      selectedCountry,
    );
    pendingCaretRef.current = pastedDigits.length;
    commitValue(pastedDigits, selectedCountry);
  };

  const describedBy = [helperText ? helperMessageId : null, visibleError ? validationMessageId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cn("space-y-2", className)}>
      {label ? <Label htmlFor={inputId}>{label}</Label> : null}

      <div className="grid gap-3 sm:grid-cols-[minmax(10rem,13rem)_1fr]">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">{countryLabel}</Label>
          <Select value={selectedCountry.iso2} onValueChange={handleCountryChange} disabled={disabled} name={countryName}>
            <SelectTrigger className={cn(countrySelectClassName)} aria-label="Choose country code">
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country.iso2} value={country.iso2}>
                  {country.name} (+{country.dialCode})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor={inputId} className="text-xs text-muted-foreground">Phone number</Label>
          <div className="relative flex items-center rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
            <span className="pointer-events-none pl-3 text-sm text-muted-foreground">
              +{selectedCountry.dialCode}
            </span>
            <input
              {...inputProps}
              ref={inputRef}
              id={inputId}
              name={name}
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              disabled={disabled}
              value={formattedNationalNumber}
              placeholder={placeholder ?? selectedCountry.placeholder}
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
                "flex h-10 w-full rounded-r-md bg-transparent px-3 py-2 text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                inputClassName,
              )}
            />
          </div>
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
      ) : digitsValue ? (
        <p id={helperMessageId} className="text-sm text-muted-foreground">
          Formatted: {details.internationalNumber}
        </p>
      ) : null}
    </div>
  );
}

export default PhoneNumberInput;