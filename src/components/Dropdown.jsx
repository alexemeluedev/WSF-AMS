import React, { useState, useRef, useEffect } from "react";

const Dropdown = ({
  options = [],
  value = "",
  onChange,
  placeholder = "Select",
  onOpenChange,
  disabledOptions = [], // Prevents selecting identical source/target vectors
}) => {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [highlighted, setHighlighted] = useState(0);

  const ref = useRef();
  const searchRef = useRef();
  const listRef = useRef();

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        closeDropdown();
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [onOpenChange]);

  const displayed = options.filter((o) =>
    o.label.toLowerCase().includes(filter.toLowerCase()),
  );

  const selected = options.find((o) => String(o.value) === String(value));

  // Reset filters and highlights when inputs or selections change
  useEffect(() => {
    setFilter("");
    setHighlighted(0);
  }, [options, value]);

  useEffect(() => {
    setHighlighted(0);
  }, [filter, open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current && searchRef.current.focus(), 0);
    }
  }, [open]);

  const closeDropdown = () => {
    setOpen(false);
    if (onOpenChange) setTimeout(() => onOpenChange(false), 0);
  };

  const openToggle = () => {
    setOpen((s) => {
      const next = !s;
      if (onOpenChange) setTimeout(() => onOpenChange(next), 0);
      return next;
    });
  };

  const handleKeyDownOnSearch = (e) => {
    const key = e.key;
    if (key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      closeDropdown();
      return;
    }

    if (!displayed || displayed.length === 0) return;

    if (key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      setHighlighted((h) => Math.min(h + 1, displayed.length - 1));
      requestAnimationFrame(() => scrollHighlightedIntoView());
    } else if (key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      setHighlighted((h) => Math.max(h - 1, 0));
      requestAnimationFrame(() => scrollHighlightedIntoView());
    } else if (key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      const safeIndex = Math.min(highlighted, displayed.length - 1);
      const opt = displayed[safeIndex];

      // Prevent selecting options that are marked as disabled
      if (opt && !disabledOptions.includes(opt.value)) {
        if (onChange) setTimeout(() => onChange(opt.value), 0);
        closeDropdown();
      }
    }
  };

  const scrollHighlightedIntoView = () => {
    try {
      const listEl = listRef.current;
      if (!listEl) return;
      const items = listEl.querySelectorAll("[data-dropdown-item]");
      const item = items[highlighted];
      if (item && typeof item.scrollIntoView === "function") {
        item.scrollIntoView({ block: "nearest" });
      }
    } catch (err) {
      // safe fallback pass
    }
  };

  return (
    <div className="relative w-full text-left" ref={ref}>
      {/* Trigger Box Field Button Wrapper */}
      <div
        className={`flex items-center justify-between w-full bg-slate-50 border rounded-xl px-3 py-2.5 cursor-pointer select-none transition focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 ${
          open
            ? "border-indigo-500 ring-1 ring-indigo-500"
            : "border-slate-200 hover:border-slate-300"
        }`}
        onClick={() => openToggle()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openToggle();
          }
        }}
      >
        <span
          className={`text-xs font-medium truncate ${selected ? "text-slate-800" : "text-slate-400"}`}
        >
          {selected ? selected.label : placeholder}
        </span>
        <svg
          xmlns="http://w3.org"
          className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${open ? "rotate-180 text-indigo-500" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>

      {/* Floating Dropdown Content Popover overlay */}
      {open && (
        <div
          ref={listRef}
          className="absolute z-50 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden flex flex-col max-h-60 animate-in fade-in zoom-in-95 duration-100"
          role="listbox"
        >
          {/* Inner Search Filtering Input Area */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/50 relative flex items-center">
            <span className="absolute left-4 text-slate-400">
              <svg
                xmlns="http://w3.org"
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </span>
            <input
              ref={searchRef}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter list..."
              onKeyDown={handleKeyDownOnSearch}
              aria-label="Search items filter"
              className="w-full bg-white border border-slate-200 text-xs text-slate-800 rounded-lg pl-8 pr-3 py-1.5 outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* Scrollable Selection Options List */}
          <ul className="overflow-y-auto py-1 divide-y divide-slate-50 max-h-44 text-slate-700">
            {displayed.length ? (
              displayed.map((opt, idx) => {
                const isSelected = String(opt.value) === String(value);
                const isHighlighted = idx === highlighted;
                const isDisabled = disabledOptions.includes(opt.value);

                return (
                  <li
                    key={opt.value}
                    data-dropdown-item
                    aria-selected={isSelected}
                    role="option"
                    onMouseEnter={() => !isDisabled && setHighlighted(idx)}
                    onClick={() => {
                      if (isDisabled) return;
                      if (onChange) setTimeout(() => onChange(opt.value), 0);
                      closeDropdown();
                    }}
                    className={`px-3 py-2 text-xs font-medium cursor-pointer transition flex items-center justify-between select-none ${
                      isDisabled
                        ? "bg-slate-50 text-slate-300 cursor-not-allowed italic"
                        : isSelected
                          ? "bg-indigo-50 text-indigo-700 font-bold"
                          : isHighlighted
                            ? "bg-slate-100 text-slate-900"
                            : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>

                    {/* FIXED & CLOSED THE CLIP: Visual state markers */}
                    {isSelected && (
                      <svg
                        xmlns="http://w3.org"
                        className="h-3.5 w-3.5 text-indigo-600 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </li>
                );
              })
            ) : (
              <li className="px-3 py-3 text-xs text-slate-400 italic text-center select-none bg-white">
                No matching options found
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Dropdown;
