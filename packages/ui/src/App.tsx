import { AppSidebar } from "@/components/ui/navigation/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/base/sidebar";
import { Outlet, useLocation } from "react-router";
import { useContext, useEffect, useState } from "react";
import { StoreContext } from "@/store";
import { Moon, Sun, CalendarDays, CalendarIcon, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/base/button";
import { Label } from "@/components/ui/base/label";
import { Switch } from "@/components/ui/base/switch";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/base/popover";
import { Calendar } from "@/components/ui/base/calendar"
import { cn } from "@/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/base/dialog";

type TimePeriod = "1h" | "24h" | "7d" | "14d" | "30d";

export default function MainLayout() {
  const location = useLocation();
  const isPreviewRoute =
    /\/(mail|exception|log|notification|job|cache|query|model|request|schedule|http|view)\/[^/]+$/.test(
      location.pathname,
    );

  const handleRefresh = () => {
    fetch(`/api/data/${location.pathname}/refresh`)
      .then(res => res.json())
      .then(data => {
        console.log(data);
      });
  };

  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset>
        {!isPreviewRoute && (
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 pr-10">
            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                className="h-9 w-9"
              >
                <RefreshCcw className="h-4 w-4 text-muted-foreground" />
              </Button>
              <PeriodSelector />
            </div>
          </header>
        )}
        <div className="p-4">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

const PeriodSelector = () => {
  const { state, dispatch } = useContext(StoreContext);
  const setPeriod = (period: "1h" | "24h" | "7d" | "14d" | "30d") => {
    window.localStorage.setItem("period", period);
    dispatch({ type: "setPeriod", payload: period });
  };

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isCustomRangeModalOpen, setIsCustomRangeModalOpen] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem("theme")) {
      window.localStorage.setItem("theme", window.localStorage.getItem("theme") as string);
      document.documentElement.classList.add(window.localStorage.getItem("theme") as string);
      setIsDarkMode(window.localStorage.getItem("theme") === 'dark')
    }
  }, []);

  const updateDarkMode = (checked: boolean) => {
    setIsDarkMode(checked);
    window.localStorage.setItem("theme", checked ? 'dark' : 'light');
    document.documentElement.classList.remove(checked ? 'light' : 'dark');
    document.documentElement.classList.add(checked ? 'dark' : 'light');
  }

  const timePeriods: TimePeriod[] = ["1h", "24h", "7d", "14d", "30d"];
  return (
    <>
      <div className="inline-flex h-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {timePeriods.map((period, index) => (
          <Button
            key={period}
            variant={state.period === period ? "default" : "ghost"}
            size="sm"
            onClick={() => setPeriod(period)}
            className={`px-3 rounded-none ${index === 0 ? "rounded-l-md" : ""}`}
          >
            {period.toUpperCase()}
          </Button>
        ))}
        <Button
          variant={typeof state.period === 'object' && state.period.label === 'custom' ? "default" : "ghost"}
          size="sm"
          onClick={() => setIsCustomRangeModalOpen(true)}
          className="px-3 rounded-none rounded-r-md border-l border-muted-foreground/20"
        >
          <CalendarDays className="h-4 w-4 mr-1" />
          <span>Custom</span>
        </Button>
      </div>
      <div className="flex items-center space-x-2">
        <Sun className="h-4 w-4" />
        <Switch
          id="dark-mode"
          checked={isDarkMode}
          onCheckedChange={(checked: boolean) => updateDarkMode(checked)}
        />
        <Moon className="h-4 w-4" />
        <Label htmlFor="dark-mode" className="sr-only">
          Toggle dark mode
        </Label>
      </div>

      {isCustomRangeModalOpen && (
        <CustomDateRangeModal
          isOpen={isCustomRangeModalOpen}
          onClose={() => setIsCustomRangeModalOpen(false)}
          onApply={(startDate, endDate) => {
            dispatch({
              type: "setPeriod",
              payload: {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                label: "custom",
              },
            });
            setIsCustomRangeModalOpen(false);
          }}
        />
      )}
    </>
  );
};

interface CustomDateRangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (startDate: Date, endDate: Date) => void;
}

const CustomDateRangeModal: React.FC<CustomDateRangeModalProps> = ({
  isOpen,
  onClose,
  onApply,
}) => {
  const { state: appState, dispatch: appDispatch } = useContext(StoreContext);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [dateError, setDateError] = useState<string | null>(null);

  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);

  const [timeZone, setTimeZone] = useState<string | undefined>(undefined)
 
  useEffect(() => {
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone)
  }, [])

  // Get today at start of day for consistent comparison
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today

  useEffect(() => {
    const knownPresets = ["1h", "24h", "7d", "14d", "30d"];
    if (typeof appState.period === 'string' && knownPresets.includes(appState.period)) {
        setStartDate(undefined);
        setEndDate(undefined);
    } else if (appState.period && typeof appState.period === 'object' && appState.period.label === 'custom') {
        setStartDate(new Date(appState.period.startDate));
        setEndDate(new Date(appState.period.endDate));
    } else {
        setStartDate(undefined);
        setEndDate(undefined);
    }
  }, [appState.period]);

  if (!isOpen) return null;

  const handlePresetSelect = (period: TimePeriod) => {
    window.localStorage.setItem("period", period);
    appDispatch({ type: "setPeriod", payload: period });
    onClose();
  };

  const handleStartDateSelect = (date: Date | undefined) => {
    setStartDate(date);
    setDateError(null);
    setIsStartDatePickerOpen(false);
  };

  const handleEndDateSelect = (date: Date | undefined) => {
    setEndDate(date);
    setDateError(null);
    setIsEndDatePickerOpen(false);
  };

  const handleApplyCustomRange = () => {
    if (startDate && endDate) {
      if (endDate < startDate) {
        setDateError("End date cannot be before start date.");
        return;
      }
      setDateError(null);
      onApply(startDate, endDate);
    }
  };

  const timePeriods: TimePeriod[] = ["1h", "24h", "7d", "14d", "30d"];

  const getCurrentlyShowingText = () => {
    if (startDate && endDate) {
        return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
    } else if (typeof appState.period === 'object' && appState.period.label === 'custom') {
        return `${new Date(appState.period.startDate).toLocaleDateString()} - ${new Date(appState.period.endDate).toLocaleDateString()}`;
    } else if (typeof appState.period === 'string' && timePeriods.includes(appState.period as TimePeriod)) {
        return `Preset: ${appState.period.toUpperCase()}`;
    }
    return "No range selected";
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="max-w-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={onClose}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Date Range</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Quick Select */}
          <div>
            <Label className="mb-2 block text-sm font-medium">Quick Select</Label>
            <div className="inline-flex h-9 items-center justify-center rounded-md bg-muted text-muted-foreground w-full">
              {timePeriods.map((period, index) => (
                <Button
                  key={period}
                  variant={appState.period === period ? "default" : "ghost"}
                  className={`flex-1 px-3 rounded-none ${index === 0 ? "rounded-l-md" : index === timePeriods.length - 1 ? "rounded-r-md" : ""}`}
                  size="sm"
                  onClick={() => handlePresetSelect(period)}
                >
                  {period.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Range */}
          <div>
            <Label className="mb-2 block text-sm font-medium">Custom Range</Label>
            <div className="flex space-x-4">
              {/* Start Date */}
              <div className="flex-1">
                <Popover open={isStartDatePickerOpen} onOpenChange={setIsStartDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? startDate.toLocaleDateString() : <span>Start date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      timeZone={timeZone}
                      selected={startDate}
                      onSelect={handleStartDateSelect}
                      disabled={(date: Date) => date > today}
                      defaultMonth={startDate || new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* End Date */}
              <div className="flex-1">
                <Popover open={isEndDatePickerOpen} onOpenChange={setIsEndDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? endDate.toLocaleDateString() : <span>End date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      timeZone={timeZone}
                      selected={endDate}
                      onSelect={handleEndDateSelect}
                      disabled={(date: Date) => 
                        date > today || 
                        (startDate ? date < startDate : false)
                      }
                      defaultMonth={endDate || startDate || new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            {dateError && (
              <p className="text-sm text-destructive mt-2">{dateError}</p>
            )}
          </div>

          {/* Currently Showing */}
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm text-center text-muted-foreground">
              Currently showing: <span className="font-semibold text-foreground">{getCurrentlyShowingText()}</span>
            </p>
          </div>
        </div>

        <DialogFooter className="sm:justify-end">
          <DialogClose asChild>
            <Button 
              type="button" 
              variant="outline" 
            >
              Cancel
            </Button>
          </DialogClose>
          <Button 
            type="button" 
            onClick={handleApplyCustomRange} 
            disabled={!startDate || !endDate}
          >
            Apply Custom Range
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};