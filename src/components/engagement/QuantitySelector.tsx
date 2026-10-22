import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback, useRef, memo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Eye, Clock } from "lucide-react";

interface QuantitySelectorProps {
  value: number;
  onChange: (quantity: number) => void;
  min?: number;
  max?: number;
  /** Optional global delivery time (in hours) applied to every engagement type */
  globalHours?: number | null;
  onGlobalHoursChange?: (hours: number | null) => void;
}

const QUICK_OPTIONS = [
  { label: "10K", value: 10000 },
  { label: "50K", value: 50000 },
  { label: "100K", value: 100000 },
  { label: "250K", value: 250000 },
  { label: "500K", value: 500000 },
  { label: "600K", value: 600000 },
];

// Quick option button - memoized for performance
const QuickButton = memo(function QuickButton({ 
  option, 
  isSelected, 
  onClick 
}: { 
  option: { label: string; value: number }; 
  isSelected: boolean; 
  onClick: () => void;
}) {
  return (
    <Button variant="ghost"
      onClick={onClick}
      className={cn(
        "px-3 sm:px-5 py-2.5 sm:py-3 rounded-lg font-semibold text-sm transition-colors",
        "border",
        isSelected
          ? "bg-primary/10 text-primary border-primary/25 hover:bg-primary/15 hover:text-primary"
          : "bg-card text-muted-foreground border-border hover:border-primary/30 hover:bg-secondary"
      )}
    >
      {option.label}
    </Button>
  );
});

export const QuantitySelector = memo(function QuantitySelector({ 
  value, 
  onChange, 
  min = 0, 
  max = 1000000,
  globalHours = null,
  onGlobalHoursChange,
}: QuantitySelectorProps) {
  const [localValue, setLocalValue] = useState(value.toString());
  const [timeUnit, setTimeUnit] = useState<"hours" | "days">("hours");
  const [timeInput, setTimeInput] = useState<string>(globalHours ? String(globalHours) : "");

  const applyTime = useCallback((raw: string, unit: "hours" | "days") => {
    setTimeInput(raw);
    if (!onGlobalHoursChange) return;
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed) || parsed <= 0) {
      onGlobalHoursChange(null);
      return;
    }
    const hours = unit === "days" ? parsed * 24 : parsed;
    onGlobalHoursChange(Math.min(720, hours));
  }, [onGlobalHoursChange]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // Sync local value when prop changes externally (quick buttons, parent reset)
  // But NEVER while user is actively typing
  useEffect(() => {
    if (!isTypingRef.current) {
      const propStr = value.toString();
      setLocalValue(prev => prev === propStr ? prev : propStr);
    }
  }, [value]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Handle typing - let user type freely, debounce the parent update
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setLocalValue(raw);
    isTypingRef.current = true;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      const parsed = parseInt(raw);
      if (!isNaN(parsed)) {
        const clamped = Math.min(max, Math.max(min, parsed));
        onChange(clamped);
      } else if (raw === '' || raw === '0') {
        onChange(min);
      }
      // Keep isTypingRef true - only reset on blur
    }, 500);
  }, [onChange, min, max]);

  // On blur: finalize value, clamp, and sync display
  const handleBlur = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    isTypingRef.current = false;

    const parsed = parseInt(localValue);
    if (isNaN(parsed) || localValue === '') {
      setLocalValue(min.toString());
      onChange(min);
    } else {
      const clamped = Math.min(max, Math.max(min, parsed));
      setLocalValue(clamped.toString());
      onChange(clamped);
    }
  }, [localValue, onChange, min, max]);

  // Quick button handler
  const handleQuickSelect = useCallback((optionValue: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    isTypingRef.current = false;
    setLocalValue(optionValue.toString());
    onChange(optionValue);
  }, [onChange]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center">
          <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
        </div>
        <Label className="text-sm font-semibold tracking-normal text-foreground">
          Base Views Quantity
        </Label>
      </div>
      
      {/* Quick Select Buttons */}
      <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2">
        {QUICK_OPTIONS.map((option) => (
          <QuickButton
            key={option.value}
            option={option}
            isSelected={value === option.value}
            onClick={() => handleQuickSelect(option.value)}
          />
        ))}
      </div>

      {/* Custom Input + optional global delivery time */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <span className="text-sm text-muted-foreground font-medium">or custom:</span>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={localValue}
              onChange={handleInputChange}
              onBlur={handleBlur}
              className="w-full sm:w-36 h-11 font-mono text-lg font-semibold bg-card border border-input focus:border-primary text-foreground"
            />
            <span className="text-sm text-muted-foreground font-medium shrink-0">views</span>
          </div>
        </div>

        {onGlobalHoursChange && (
          <div className="flex flex-col gap-1 sm:items-end">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Auto"
                value={timeInput}
                onChange={(e) => applyTime(e.target.value.replace(/[^0-9]/g, ''), timeUnit)}
                className="w-20 h-11 font-mono text-base font-semibold bg-card border border-input focus:border-primary text-foreground text-center"
              />
              <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
                {(["hours", "days"] as const).map((unit) => (
                  <Button variant="ghost"
                    key={unit}
                    type="button"
                    onClick={() => { setTimeUnit(unit); applyTime(timeInput, unit); }}
                    className={cn(
                      "px-3 h-[42px] text-xs font-semibold transition-colors",
                      timeUnit === unit
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {unit === "hours" ? "Hrs" : "Days"}
                  </Button>
                ))}
              </div>
            </div>
            <span className="text-[11px] text-muted-foreground sm:text-right">
              Optional total delivery time — applies to all engagement types
            </span>
          </div>
        )}
      </div>
    </div>
  );
});
