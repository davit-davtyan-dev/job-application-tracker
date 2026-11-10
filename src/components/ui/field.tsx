import { cloneElement } from "react";

interface FieldProps {
  label: string;
  error?: string;
  children: React.ReactElement<{
    id?: string;
    "aria-invalid"?: boolean;
    "aria-describedby"?: string;
  }>;
}

export function Field({ label, error, children }: FieldProps) {
  const id = label.toLowerCase().replaceAll(/[^a-z]+/g, "-");

  return (
    <label className="block text-sm font-medium" htmlFor={id}>
      {label}
      <span className="mt-1 block">
        {cloneElement(children, {
          id,
          "aria-invalid": Boolean(error),
          "aria-describedby": error ? `${id}-error` : undefined,
        })}
      </span>
      {error && (
        <span className="error" id={`${id}-error`}>
          {error}
        </span>
      )}
    </label>
  );
}
