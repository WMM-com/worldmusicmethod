import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { formatPrice } from '@/hooks/useGeoPricing';

interface PriceSliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  suggested: number;
  currency: string;
  currencySymbol: string;
}

export function PriceSlider({
  value,
  onChange,
  min,
  max,
  suggested,
  currency,
  currencySymbol,
}: PriceSliderProps) {
  // Calculate slider position for suggested price marker
  const suggestedPosition = ((suggested - min) / (max - min)) * 100;

  const handleSliderChange = (values: number[]) => {
    onChange(Math.round(values[0]));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value) || min;
    onChange(Math.max(min, Math.min(max, newValue)));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Choose your price</span>
        <div className="flex items-center gap-1">
          <span className="text-lg font-medium">{currencySymbol}</span>
          <Input
            type="number"
            value={value}
            onChange={handleInputChange}
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
    </div>
  );
}
