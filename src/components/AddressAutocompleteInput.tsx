import React, { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Loader2, X, CheckCircle2 } from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────────── */

interface AddressSuggestion {
  place_name: string;
  center: [number, number]; // [longitude, latitude]
}

interface AddressAutocompleteInputProps {
  value: string;
  onAddressSelect: (address: string, latitude: number, longitude: number) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

/* ─── Constants ─────────────────────────────────────────────────── */

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 300;
const MAX_RESULTS = 5;

// Mapbox token (same one used elsewhere in the project)
const MAPBOX_TOKEN =
  "pk.eyJ1IjoibHVrZWpvaG5zb24xMSIsImEiOiJjbWk5NXYzMWcwa2d5MmxvajBpc3Q1dWh1In0.MNg4LdPq3iaNHA3ojJ1VPg";

// Bias toward Palos Verdes / LA area (Chadwick School vicinity)
const PROXIMITY_LNG = -118.3965;
const PROXIMITY_LAT = 33.7455;

/* ─── Component ─────────────────────────────────────────────────── */

export const AddressAutocompleteInput: React.FC<AddressAutocompleteInputProps> = ({
  value,
  onAddressSelect,
  placeholder = "Enter your home address",
  required = false,
  className: externalClassName,
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const { toast } = useToast();

  /* ── Sync prop → state ──────────────────────────────────── */

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Separate effect for handling the selected state change
  useEffect(() => {
    // If value is set programmatically (e.g. quick-fill button), mark as selected
    if (value && value !== inputValue) {
      setSelectedAddress({ lat: 0, lng: 0 }); // truthy marker to show green check
      setSuggestions([]);
      setShowSuggestions(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  /* ── Click outside to close ─────────────────────────────── */

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ── Cleanup debounce on unmount ────────────────────────── */

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  /* ── Fetch suggestions from Mapbox Geocoding API ────────── */

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim() || query.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setFetchError(null);
      return;
    }

    setIsLoading(true);
    setFetchError(null);

    try {
      const encoded = encodeURIComponent(query);
      const url =
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json` +
        `?access_token=${MAPBOX_TOKEN}` +
        `&limit=${MAX_RESULTS}` +
        `&proximity=${PROXIMITY_LNG},${PROXIMITY_LAT}` +
        `&country=us` +
        `&types=address,poi,place` +
        `&autocomplete=true` +
        `&fuzzyMatch=true`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch address suggestions");
      }

      const data = await response.json();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formatted: AddressSuggestion[] = (data.features ?? []).map((f: any) => ({
        place_name: f.place_name,
        center: f.center as [number, number],
      }));

      setSuggestions(formatted);
      setShowSuggestions(true);
      setActiveIndex(-1);

      if (formatted.length === 0) {
        setFetchError("No addresses found. Try a different search.");
      }
    } catch (error) {
      console.error("Error fetching address suggestions:", error);
      setFetchError("Unable to find address suggestions. Please try again.");
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /* ── Select a suggestion ────────────────────────────────── */

  const selectSuggestion = useCallback(
    (suggestion: AddressSuggestion) => {
      const [longitude, latitude] = suggestion.center;

      setInputValue(suggestion.place_name);
      setSelectedAddress({ lat: latitude, lng: longitude });
      setShowSuggestions(false);
      setSuggestions([]);
      setActiveIndex(-1);

      onAddressSelect(suggestion.place_name, latitude, longitude);

      toast({
        title: "Address Selected",
        description: "Address successfully geocoded",
      });
    },
    [onAddressSelect, toast],
  );

  /* ── Input change handler ───────────────────────────────── */

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      setSelectedAddress(null);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      timeoutRef.current = setTimeout(() => {
        fetchSuggestions(newValue);
      }, DEBOUNCE_MS);
    },
    [fetchSuggestions],
  );

  /* ── Keyboard navigation ────────────────────────────────── */

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showSuggestions || suggestions.length === 0) {
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
          break;

        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
          break;

        case "Enter":
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < suggestions.length) {
            selectSuggestion(suggestions[activeIndex]);
          }
          break;

        case "Escape":
          e.preventDefault();
          setShowSuggestions(false);
          setActiveIndex(-1);
          break;
      }
    },
    [showSuggestions, suggestions, activeIndex, selectSuggestion],
  );

  /* ── Scroll active option into view ─────────────────────── */

  useEffect(() => {
    if (activeIndex < 0 || !listboxRef.current) return;
    const options = listboxRef.current.querySelectorAll('[role="option"]');
    options[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  /* ── Clear handler ──────────────────────────────────────── */

  const handleClear = useCallback(() => {
    setInputValue("");
    setSelectedAddress(null);
    setSuggestions([]);
    setShowSuggestions(false);
    setFetchError(null);
    setActiveIndex(-1);
  }, []);

  /* ── Focus handler ──────────────────────────────────────── */

  const handleInputFocus = useCallback(() => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  }, [suggestions.length]);

  /* ── Derived state ──────────────────────────────────────── */

  const isSelected = selectedAddress !== null;
  const showMinCharHint =
    !isLoading && !fetchError && !isSelected && inputValue.length > 0 && inputValue.length < MIN_QUERY_LENGTH;

  const inputBorderClass = isSelected
    ? "border-emerald-500 focus-visible:ring-emerald-500/30"
    : fetchError
      ? "border-red-500 focus-visible:ring-red-500/30"
      : "";

  const listboxId = "address-suggestions-listbox";
  const activeOptionId = activeIndex >= 0 ? `address-option-${activeIndex}` : undefined;

  return (
    <div ref={wrapperRef} className="relative">
      {/* ── Input row ─────────────────────────────────────── */}
      <div className="relative">
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          className={`pr-16 ${inputBorderClass} ${externalClassName || ""}`}
          role="combobox"
          aria-expanded={showSuggestions && suggestions.length > 0}
          aria-controls={listboxId}
          aria-activedescendant={activeOptionId}
          aria-autocomplete="list"
          aria-describedby="address-helper"
        />

        {/* Right-side icons */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {/* Clear button */}
          {inputValue.trim() && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
              aria-label="Clear address"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Status icon */}
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : isSelected ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <MapPin className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* ── Suggestions dropdown ──────────────────────────── */}
      {showSuggestions && suggestions.length > 0 && (
        <ul
          id={listboxId}
          ref={listboxRef}
          role="listbox"
          aria-label="Address suggestions"
          className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={`${suggestion.center[0]}-${suggestion.center[1]}-${index}`}
              id={`address-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={`w-full px-4 py-3 text-left cursor-pointer transition-colors flex items-start gap-2 border-b border-border last:border-b-0 ${
                index === activeIndex ? "bg-accent" : "hover:bg-accent/50"
              }`}
              onClick={() => selectSuggestion(suggestion)}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <span className="text-sm">{suggestion.place_name}</span>
            </li>
          ))}

          {/* Attribution (required by Mapbox TOS) */}
          <li className="px-4 py-1.5 text-[10px] text-muted-foreground text-right" aria-hidden="true">
            Powered by Mapbox
          </li>
        </ul>
      )}

      {/* ── Helper text area ──────────────────────────────── */}
      <div id="address-helper">
        {fetchError && !isLoading && <p className="text-xs text-destructive mt-1">{fetchError}</p>}

        {showMinCharHint && (
          <p className="text-xs text-muted-foreground mt-1">Type at least {MIN_QUERY_LENGTH} characters to search</p>
        )}

        {required && inputValue && !isSelected && !fetchError && !showMinCharHint && !isLoading && (
          <p className="text-xs text-muted-foreground mt-1">Please select an address from the suggestions</p>
        )}
      </div>
    </div>
  );
};

export default AddressAutocompleteInput;
