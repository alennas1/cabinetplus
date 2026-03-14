import React, { useRef } from "react";
import { formatPhoneInputWithCaret } from "../utils/phone";

const PhoneInput = ({
  value,
  onChangeValue,
  className,
  placeholder,
  disabled,
  required,
  ...rest
}) => {
  const inputRef = useRef(null);

  return (
    <input
      {...rest}
      ref={inputRef}
      type="text"
      inputMode="numeric"
      autoComplete="tel"
      value={value ?? ""}
      onChange={(e) => {
        const raw = e.target.value;
        const caret = e.target.selectionStart ?? raw.length;
        const { formatted, caretPos } = formatPhoneInputWithCaret(raw, caret);
        onChangeValue?.(formatted);

        requestAnimationFrame(() => {
          const el = inputRef.current;
          if (!el) return;
          try {
            el.setSelectionRange(caretPos, caretPos);
          } catch {
            // ignore
          }
        });
      }}
      className={className}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
    />
  );
};

export default PhoneInput;
