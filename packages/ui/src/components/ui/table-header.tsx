/** @format */

import { LucideIcon } from "lucide-react";

interface TableHeaderProps {
  icon: LucideIcon;
  count: string | number;
  label: string;
  /** Whether to add "s" for plural. Defaults to true */
  pluralize?: boolean;
}

export function TableHeader({
  icon: Icon,
  count,
  label,
  pluralize = true,
}: TableHeaderProps) {
  const showPlural = pluralize && Number(count) !== 1;

  return (
    <div className="flex items-center gap-2">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <span className="font-medium text-sm text-dark dark:text-white">
        {count} {label}
        {showPlural && "s"}
      </span>
    </div>
  );
}

