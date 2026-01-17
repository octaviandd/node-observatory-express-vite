/** @format */

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface StatusFilterProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

export function StatusFilter({ options, value, onChange }: StatusFilterProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(newValue) => newValue && onChange(newValue)}
    >
      <span className="text-sm text-muted-foreground border rounded-md px-2 py-1">
        SHOW
      </span>
      {options.map((status) => (
        <ToggleGroupItem
          key={status}
          value={status}
          aria-label={status}
          className="text-black cursor-pointer dark:text-white"
        >
          {status.toUpperCase()}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

