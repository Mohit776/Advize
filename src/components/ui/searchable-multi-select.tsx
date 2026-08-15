'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Check, ChevronDown, X, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SearchableMultiSelectProps {
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  maxSelected?: number;
  maxSelectedMessage?: string;
  disabled?: boolean;
  /** If true, only one item can be selected (behaves like a single select) */
  single?: boolean;
}

export function SearchableMultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Search and select...',
  maxSelected = Infinity,
  maxSelectedMessage,
  disabled = false,
  single = false,
}: SearchableMultiSelectProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = query.trim()
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  const isSelected = useCallback((option: string) => value.includes(option), [value]);

  const toggle = (option: string) => {
    if (isSelected(option)) {
      onChange(value.filter((v) => v !== option));
    } else {
      if (single) {
        onChange([option]);
        setOpen(false);
        setQuery('');
      } else if (value.length < maxSelected) {
        onChange([...value, option]);
      }
    }
  };

  const remove = (option: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== option));
  };

  const atMax = !single && value.length >= maxSelected;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger input */}
      <div
        className={cn(
          'flex min-h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-text',
          'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onClick={() => {
          if (!disabled) {
            setOpen(true);
            inputRef.current?.focus();
          }
        }}
      >
        <Search className="h-3.5 w-3.5 text-muted-foreground mr-2 flex-shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={
            value.length === 0
              ? placeholder
              : single
              ? value[0]
              : `${value.length} selected — type to search more`
          }
          disabled={disabled}
          className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground min-w-0"
        />
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform',
            open && 'rotate-180'
          )}
        />
      </div>

      {/* Max reached message */}
      {atMax && maxSelectedMessage && (
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{maxSelectedMessage}</p>
      )}

      {/* Selected chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {value.map((v) => (
            <Badge key={v} variant="secondary" className="flex items-center gap-1 pr-1">
              {v}
              <button
                type="button"
                onClick={(e) => remove(v, e)}
                disabled={disabled}
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5 transition-colors"
                aria-label={`Remove ${v}`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <div className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No results found.
              </div>
            ) : (
              filtered.map((option) => {
                const selected = isSelected(option);
                const blocked = atMax && !selected;
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={blocked}
                    onClick={() => toggle(option)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-sm text-left transition-colors',
                      selected
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-accent hover:text-accent-foreground',
                      blocked && 'opacity-40 cursor-not-allowed'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-sm border border-primary',
                        selected ? 'bg-primary text-primary-foreground' : 'opacity-50'
                      )}
                    >
                      {selected && <Check className="h-3 w-3" />}
                    </span>
                    {option}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
