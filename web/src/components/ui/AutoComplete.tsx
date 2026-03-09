"use client";

import * as React from "react";
import { Check, ChevronDown, Loader2, Plus, Search } from "lucide-react";

import { cn } from "@/lib/utils";

export interface AutoCompleteProps<TItem> {
  items?: TItem[];
  fetchSuggestions?: (query: string) => Promise<TItem[]>;
  getItemLabel: (item: TItem) => string;
  getItemValue?: (item: TItem) => string;
  renderItem?: (item: TItem, state: { isActive: boolean; query: string }) => React.ReactNode;
  filterItems?: (items: TItem[], query: string) => TItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onSelect?: (item: TItem) => void;
  placeholder?: string;
  disabled?: boolean;
  minQueryLength?: number;
  debounceMs?: number;
  maxResults?: number;
  noResultsMessage?: React.ReactNode;
  loadingMessage?: React.ReactNode;
  emptyQueryMessage?: React.ReactNode;
  allowCreate?: boolean;
  onCreateOption?: (query: string) => Promise<TItem | null | undefined> | TItem | null | undefined;
  createOptionLabel?: (query: string) => React.ReactNode;
  creatingMessage?: React.ReactNode;
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  className?: string;
  inputClassName?: string;
  dropdownClassName?: string;
  name?: string;
  id?: string;
}

function defaultFilter<TItem>(items: TItem[], query: string, getItemLabel: (item: TItem) => string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return items;
  }

  return items.filter((item) => getItemLabel(item).toLowerCase().includes(normalizedQuery));
}

function dedupeItems<TItem>(
  items: TItem[],
  getItemLabel: (item: TItem) => string,
  getItemValue?: (item: TItem) => string,
) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = getItemValue ? getItemValue(item) : getItemLabel(item).trim().toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function AutoComplete<TItem>({
  items = [],
  fetchSuggestions,
  getItemLabel,
  getItemValue,
  renderItem,
  filterItems,
  value,
  defaultValue = "",
  onValueChange,
  onSelect,
  placeholder = "Search...",
  disabled = false,
  minQueryLength = 0,
  debounceMs = 250,
  maxResults = 8,
  noResultsMessage = "No results found.",
  loadingMessage = "Loading suggestions...",
  emptyQueryMessage = "Start typing to see suggestions.",
  allowCreate = false,
  onCreateOption,
  createOptionLabel,
  creatingMessage = "Adding option...",
  label,
  helperText,
  className,
  inputClassName,
  dropdownClassName,
  name,
  id,
}: AutoCompleteProps<TItem>) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const [suggestions, setSuggestions] = React.useState<TItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const [registeredItems, setRegisteredItems] = React.useState<TItem[]>([]);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const requestIdRef = React.useRef(0);

  const inputValue = value ?? internalValue;
  const shouldUseRemote = Boolean(fetchSuggestions);

  const localItems = React.useMemo(
    () => dedupeItems([...items, ...registeredItems], getItemLabel, getItemValue),
    [getItemLabel, getItemValue, items, registeredItems],
  );

  const updateValue = React.useCallback(
    (nextValue: string) => {
      if (onValueChange) {
        onValueChange(nextValue);
      }

      if (value === undefined) {
        setInternalValue(nextValue);
      }
    },
    [onValueChange, value],
  );

  const visibleSuggestions = React.useMemo(() => suggestions.slice(0, maxResults), [maxResults, suggestions]);

  const selectItem = React.useCallback(
    (item: TItem) => {
      updateValue(getItemLabel(item));
      onSelect?.(item);
      setIsOpen(false);
      setActiveIndex(-1);
      inputRef.current?.focus();
    },
    [getItemLabel, onSelect, updateValue],
  );

  const hasExactMatch = React.useMemo(
    () => visibleSuggestions.some((item) => getItemLabel(item).trim().toLowerCase() === inputValue.trim().toLowerCase()),
    [getItemLabel, inputValue, visibleSuggestions],
  );

  const canCreateOption = allowCreate && Boolean(onCreateOption) && inputValue.trim().length >= minQueryLength && !hasExactMatch;
  const totalOptionCount = visibleSuggestions.length + (canCreateOption ? 1 : 0);

  const handleCreateOption = React.useCallback(async () => {
    if (!canCreateOption || !onCreateOption) {
      return;
    }

    setIsCreating(true);

    try {
      const createdItem = await onCreateOption(inputValue.trim());

      if (!createdItem) {
        return;
      }

      setRegisteredItems((current) => dedupeItems([...current, createdItem], getItemLabel, getItemValue));
      setSuggestions((current) => dedupeItems([...current, createdItem], getItemLabel, getItemValue));
      selectItem(createdItem);
    } finally {
      setIsCreating(false);
    }
  }, [canCreateOption, getItemLabel, getItemValue, inputValue, onCreateOption, selectItem]);

  React.useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (inputValue.trim().length < minQueryLength) {
      setSuggestions([]);
      setIsLoading(false);
      setActiveIndex(-1);
      return;
    }

    if (!shouldUseRemote) {
      const nextSuggestions = (filterItems ?? ((list: TItem[], query: string) => defaultFilter(list, query, getItemLabel)))(localItems, inputValue);
      setSuggestions(nextSuggestions);
      setActiveIndex(nextSuggestions.length > 0 ? 0 : -1);
      return;
    }

    const currentRequestId = ++requestIdRef.current;
    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);

      try {
        const nextSuggestions = await fetchSuggestions?.(inputValue);
        if (requestIdRef.current !== currentRequestId) {
          return;
        }

        const mergedSuggestions = dedupeItems([...(nextSuggestions ?? []), ...registeredItems], getItemLabel, getItemValue);
        setSuggestions(mergedSuggestions);
        setActiveIndex(mergedSuggestions.length > 0 ? 0 : -1);
      } finally {
        if (requestIdRef.current === currentRequestId) {
          setIsLoading(false);
        }
      }
    }, debounceMs);

    return () => window.clearTimeout(timeoutId);
  }, [debounceMs, fetchSuggestions, filterItems, getItemLabel, getItemValue, inputValue, isOpen, localItems, minQueryLength, registeredItems, shouldUseRemote]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    updateValue(nextValue);
    setIsOpen(true);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      setIsOpen(true);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (totalOptionCount === 0 ? -1 : (current + 1) % totalOptionCount));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => {
        if (totalOptionCount === 0) {
          return -1;
        }

        return current <= 0 ? totalOptionCount - 1 : current - 1;
      });
      return;
    }

    if (event.key === "Enter" && isOpen && activeIndex >= 0 && visibleSuggestions[activeIndex]) {
      event.preventDefault();
      selectItem(visibleSuggestions[activeIndex]);
      return;
    }

    if (event.key === "Enter" && isOpen && canCreateOption && activeIndex === visibleSuggestions.length) {
      event.preventDefault();
      void handleCreateOption();
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const selectedValueMatcher = React.useCallback(
    (item: TItem) => {
      if (getItemValue) {
        return getItemValue(item) === inputValue;
      }

      return getItemLabel(item) === inputValue;
    },
    [getItemLabel, getItemValue, inputValue],
  );

  const showDropdown = isOpen && !disabled;
  const showEmptyQueryState = inputValue.trim().length < minQueryLength;

  return (
    <div ref={rootRef} className={cn("space-y-2", className)}>
      {label ? <label htmlFor={id} className="block text-sm font-medium text-foreground">{label}</label> : null}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          aria-controls={id ? `${id}-listbox` : undefined}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-10 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            inputClassName,
          )}
        />
        <ChevronDown className={cn("pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-transform", showDropdown ? "rotate-180" : "rotate-0")} />

        {showDropdown ? (
          <div
            id={id ? `${id}-listbox` : undefined}
            role="listbox"
            className={cn(
              "absolute z-50 mt-2 max-h-72 w-full overflow-hidden rounded-xl border bg-popover shadow-lg",
              dropdownClassName,
            )}
          >
            <div className="max-h-72 overflow-y-auto p-2">
              {showEmptyQueryState ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyQueryMessage}</div>
              ) : isLoading || isCreating ? (
                <div className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{isCreating ? creatingMessage : loadingMessage}</span>
                </div>
              ) : (
                <>
                  {visibleSuggestions.map((item, index) => {
                    const isActive = index === activeIndex;
                    const isSelected = selectedValueMatcher(item);

                    return (
                      <button
                        key={getItemValue ? getItemValue(item) : `${getItemLabel(item)}-${index}`}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                          isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted/60",
                        )}
                        onMouseEnter={() => setActiveIndex(index)}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          selectItem(item);
                        }}
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {renderItem ? renderItem(item, { isActive, query: inputValue }) : getItemLabel(item)}
                        </span>
                        {isSelected ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
                      </button>
                    );
                  })}

                  {canCreateOption ? (
                    <button
                      type="button"
                      role="option"
                      aria-selected={activeIndex === visibleSuggestions.length}
                      className={cn(
                        "mt-1 flex w-full items-center gap-3 rounded-lg border border-dashed border-primary/40 px-3 py-2.5 text-left text-sm transition-colors",
                        activeIndex === visibleSuggestions.length
                          ? "bg-primary/10 text-foreground"
                          : "text-muted-foreground hover:bg-primary/5 hover:text-foreground",
                      )}
                      onMouseEnter={() => setActiveIndex(visibleSuggestions.length)}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        void handleCreateOption();
                      }}
                    >
                      <Plus className="h-4 w-4 shrink-0 text-primary" />
                      <span className="truncate">
                        {createOptionLabel ? createOptionLabel(inputValue.trim()) : `Add "${inputValue.trim()}"`}
                      </span>
                    </button>
                  ) : null}

                  {visibleSuggestions.length === 0 && !canCreateOption ? (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">{noResultsMessage}</div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {helperText ? <p className="text-sm text-muted-foreground">{helperText}</p> : null}
    </div>
  );
}

export default AutoComplete;