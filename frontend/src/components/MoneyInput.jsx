import React, { useRef } from "react";
import { formatMoneyInputWithCaret } from "../utils/moneyInput";
import { getMoneyFormatPreference, MONEY_FORMATS } from "../utils/workingHours";

const MoneyInput = ({
  value,
  onChangeValue,
  className,
  placeholder,
  disabled,
  required,
  min,
  ...rest
}) => {
  const inputRef = useRef(null);
  const moneyFormat = getMoneyFormatPreference();
  const inputMode =
    moneyFormat === MONEY_FORMATS.COMMA_THOUSANDS_CENTS ? "decimal" : "numeric";

  return (
    <input
      {...rest}
      ref={inputRef}
      type="text"
      inputMode={inputMode}
      autoComplete="off"
      value={value ?? ""}
      onChange={(e) => {
        const raw = e.target.value;
        const caret = e.target.selectionStart ?? raw.length;
        const { formatted, caretPos } = formatMoneyInputWithCaret(raw, caret, moneyFormat);
        onChangeValue?.(formatted);

        // Restore caret after React state update
        requestAnimationFrame(() => {
          const el = inputRef.current;
          if (!el) return;
          try {
            el.setSelectionRange(caretPos, caretPos);
          } catch {
            // ignore (e.g. input not focusable)
          }
        });
      }}
      className={className}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      min={min}
    />
  );
};

export default MoneyInput;
