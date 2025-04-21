import { useState, useEffect } from "react"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/utils.js"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function DatePickerWithRange({
  className,
  setPeriod,
}: {    
  className?: string;
  setPeriod: (period: "1h" | "24h" | "7d" | "14d" | "30d" | "custom", custom?: string) => void;
  }) {
  const [date, setDate] = useState<{from: Date | undefined, to: Date | undefined}>({
    from: undefined,
    to: undefined,
  })

  useEffect(() => {
    if (date.from && date.to) {
      setPeriod("custom", `${date.from} - ${date.to}`);
    }
  }, [date]);

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "justify-start text-left font-normal",
              !date && "text-muted-foreground",
            )}
          >
            <CalendarIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            //@ts-expect-error expecteddd
            onSelect={setDate}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
