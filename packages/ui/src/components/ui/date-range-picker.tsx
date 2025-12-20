import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/utils.js";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function DatePickerWithRange({
  className,
}: {
  className?: string;
  setPeriod: (
    period: "1h" | "24h" | "7d" | "14d" | "30d" | "custom",
    custom?: string,
  ) => void;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "justify-start text-left font-normal",
            )}
          >
            <CalendarIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          
        </PopoverContent>
      </Popover>
    </div>
  );
}
