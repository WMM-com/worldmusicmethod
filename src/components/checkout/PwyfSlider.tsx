import { useState, useCallback } from 'react';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';

interface PwyfSliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  suggested: number;
  currency: string;
  currencySymbol: string;
}

/**
 * Get dynamic step based on value ranges:
 * - 1 (up to 50)
 * - 5 (up to 100)
 * - 10 (up to 300)
 * - 50 (above 300)
 */
function getDynamicStep(value: number): number {
  if (value <= 50) return 1;
  if (value <= 100) return 5;
  if (value <= 300) return 10;
  return 50;
}

/**
 * Round value to nearest step
 */
function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export function PwyfSlider({
  value,
  onChange,
  min,
  max,
  suggested,
  currency,
  currencySymbol,
}: PwyfSliderProps) {
  const [inputValue, setInputValue] = useState(value.toString());

  // Calculate slider position for suggested price marker
  const suggestedPosition = ((suggested - min) / (max - min)) * 100;

  // Get step for current value
  const currentStep = getDynamicStep(value);

  const handleSliderChange = useCallback((values: number[]) => {
    const rawValue = values[0];
    const step = getDynamicStep(rawValue);
    const steppedValue = roundToStep(rawValue, step);
    const clampedValue = Math.max(min, Math.min(max, steppedValue));
    
    onChange(clampedValue);
    setInputValue(clampedValue.toString());
  }, [min, max, onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    setInputValue(rawValue);
  };

  const handleInputBlur = () => {
    const numValue = parseInt(inputValue) || min;
    const clampedValue = Math.max(min, Math.min(max, numValue));
    
    onChange(clampedValue);
    setInputValue(clampedValue.toString());
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Choose your price</span>
        <div className="flex items-center gap-1">
          <span className="text-lg font-medium">{currencySymbol}</span>
          <Input
            type="number"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            min={min}
            max={max}
            className="w-20 h-8 text-center font-semibold"
          />
        </div>
      </div>

      <div className="relative pt-2">
        {/* Suggested price marker */}
        <div 
          className="absolute -top-1 transform -translate-x-1/2 text-xs text-muted-foreground whitespace-nowrap"
          style={{ left: `${suggestedPosition}%` }}
        >
          Suggested
        </div>
        
        <Slider
          value={[value]}
          onValueChange={handleSliderChange}
          min={min}
          max={max}
          step={1}
          className="w-full"
        />

        {/* Suggested marker line */}
        <div 
          className="absolute top-[22px] w-0.5 h-3 bg-primary/60 transform -translate-x-1/2"
          style={{ left: `${suggestedPosition}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{currencySymbol}{min}</span>
        <span className="text-primary font-medium">
          {currencySymbol}{suggested} suggested
        </span>
        <span>{currencySymbol}{max}</span>
      </div>
      
      {/* Dynamic step indicator */}
      <p className="text-xs text-muted-foreground text-center">
        Step: {currencySymbol}{currentStep}
      </p>
    </div>
  );
}
