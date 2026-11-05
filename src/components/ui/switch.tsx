"use client";
import { Button } from "./button";
export function Switch({
  checked,
  onCheckedChange,
  label,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className="relative h-6 w-11 shrink-0 rounded-full p-0"
      style={{ background: checked ? "var(--win)" : "var(--line-2)" }}
    >
      <span
        aria-hidden="true"
        className="absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-[left]"
        style={{ left: checked ? 23 : 3 }}
      />
    </Button>
  );
}
