import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordInput({
  value,
  onChange,
  name = "password",
  placeholder = "••••••••",
  required = false,
  autoComplete = "current-password",
  id,
}) {
  const [show, setShow] = useState(false);
  const inputId = id || `password-${name}`;

  return (
    <div className="relative">
      <input
        id={inputId}
        type={show ? "text" : "password"}
        name={name}
        required={required}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-lg border border-mist-dark px-3.5 py-2.5 pr-11 text-sm outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition"
      />
      <button
        type="button"
        onClick={() => setShow((prev) => !prev)}
        aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
        aria-pressed={show}
        title={show ? "Sembunyikan password" : "Tampilkan password"}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink transition-colors"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
