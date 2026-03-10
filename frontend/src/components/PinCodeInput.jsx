import React, { useMemo, useRef } from "react";

const isDigit = (ch) => /^[0-9]$/.test(ch);

const normalizePin = (raw, length) => {
  const digits = (raw || "").replace(/\D/g, "").slice(0, length);
  return digits;
};

const PinCodeInput = ({ value, onChange, length = 4, disabled = false, autoFocus = false, className = "" }) => {
  const normalized = useMemo(() => normalizePin(value, length), [value, length]);
  const inputsRef = useRef([]);

  const setAt = (index, digit) => {
    const arr = normalized.split("");
    while (arr.length < length) arr.push("");
    arr[index] = digit;
    const next = normalizePin(arr.join(""), length);
    onChange(next);
  };

  const focusIndex = (index) => {
    const el = inputsRef.current[index];
    if (el) el.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData?.getData("text") || "";
    const next = normalizePin(pasted, length);
    onChange(next);
    const nextFocus = Math.min(next.length, length - 1);
    focusIndex(nextFocus);
  };

  return (
    <div className={`flex gap-3 ${className}`}>
      {Array.from({ length }).map((_, index) => {
        const digit = normalized[index] || "";
        return (
          <input
            key={index}
            ref={(el) => {
              inputsRef.current[index] = el;
            }}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            autoComplete="one-time-code"
            disabled={disabled}
            autoFocus={autoFocus && index === 0}
            value={digit}
            onPaste={handlePaste}
            onChange={(e) => {
              const ch = e.target.value.slice(-1);
              if (!ch) {
                setAt(index, "");
                return;
              }
              if (!isDigit(ch)) return;
              setAt(index, ch);
              if (index < length - 1) focusIndex(index + 1);
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace") {
                if (digit) {
                  setAt(index, "");
                } else if (index > 0) {
                  focusIndex(index - 1);
                }
              }
              if (e.key === "ArrowLeft" && index > 0) focusIndex(index - 1);
              if (e.key === "ArrowRight" && index < length - 1) focusIndex(index + 1);
            }}
            className="w-12 h-12 text-center text-xl font-semibold rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        );
      })}
    </div>
  );
};

export default PinCodeInput;

