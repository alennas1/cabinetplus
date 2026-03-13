import React, { useId, useState } from "react";
import { Eye, EyeOff } from "react-feather";
import "./PasswordInput.css";

const PasswordInput = ({
  id,
  value,
  onChange,
  placeholder,
  disabled = false,
  required = false,
  name,
  autoComplete,
  wrapperClassName = "",
  inputClassName = "",
  toggleClassName = "",
  ...rest
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [visible, setVisible] = useState(false);

  return (
    <div className={`cp-password-input ${wrapperClassName}`.trim()}>
      <input
        {...rest}
        id={inputId}
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        name={name}
        autoComplete={autoComplete}
        className={inputClassName}
      />
      <button
        type="button"
        className={`cp-password-toggle ${toggleClassName}`.trim()}
        onClick={() => setVisible((prev) => !prev)}
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        disabled={disabled}
      >
        {visible ? <Eye size={18} /> : <EyeOff size={18} />}
      </button>
    </div>
  );
};

export default PasswordInput;

