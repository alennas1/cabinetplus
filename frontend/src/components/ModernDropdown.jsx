import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "react-feather";

export default function ModernDropdown({
  value,
  options,
  onChange,
  placeholder = "Sélectionner...",
  disabled = false,
  required = false,
  name,
  ariaLabel,
  className = "",
  triggerClassName = "",
  menuClassName = "",
  fullWidth = false,
  menuMaxHeight = 260,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const normalizedValue = value ?? "";

  const selectedLabel = useMemo(() => {
    const match = (options || []).find(
      (opt) => String(opt?.value) === String(normalizedValue)
    );
    return match?.label ?? placeholder;
  }, [normalizedValue, options, placeholder]);

  const safeOptions = options || [];

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleSelect = (nextValue) => {
    if (disabled) return;
    onChange?.(nextValue);
    setOpen(false);
  };

  return (
    <div
      className={`modern-dropdown ${fullWidth ? "modern-dropdown--full" : ""} ${className}`.trim()}
      ref={rootRef}
    >
      {name ? (
        <select
          className="modern-dropdown__native"
          aria-hidden="true"
          tabIndex={-1}
          name={name}
          required={required}
          value={normalizedValue}
          onChange={() => {}}
        >
          {safeOptions.map((opt) => (
            <option key={String(opt.value)} value={opt.value} disabled={!!opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : null}

      <button
        type="button"
        className={`dropdown-trigger ${open ? "open" : ""} ${triggerClassName}`.trim()}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
        }}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{selectedLabel}</span>
        <ChevronDown size={18} className={`chevron ${open ? "rotated" : ""}`} />
      </button>

      {open && (
        <ul
          className={`dropdown-menu ${menuClassName}`.trim()}
          role="listbox"
          aria-label={ariaLabel}
          style={{ maxHeight: menuMaxHeight, overflowY: "auto" }}
        >
          {safeOptions.map((opt) => (
            <li
              key={String(opt.value)}
              role="option"
              aria-selected={String(opt.value) === String(normalizedValue)}
              aria-disabled={!!opt.disabled}
              onClick={() => {
                if (opt.disabled) return;
                handleSelect(opt.value);
              }}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

