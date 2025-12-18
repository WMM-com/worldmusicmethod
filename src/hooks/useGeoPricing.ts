import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type PricingRegion = 
  | 'africa' 
  | 'south_america' 
  | 'usa_canada' 
  | 'uk' 
  | 'north_west_europe' 
  | 'east_south_europe' 
  | 'asia_lower' 
  | 'asia_higher' 
  | 'default';

interface RegionalPrice {
  price: number;
  currency: string;
  discount_percentage: number;
}

interface GeoPricingResult {
  region: PricingRegion;
  countryCode: string;
  countryName: string;
  isLoading: boolean;
  error: string | null;
  calculatePrice: (basePriceUsd: number) => RegionalPrice;
}

// Currency symbols
const currencySymbols: Record<string, string> = {
  USD: '$',
  GBP: '£',
  EUR: '€',
};

// Fallback country-to-region mapping for common countries
const countryToRegion: Record<string, PricingRegion> = {
  // Africa
  'NG': 'africa', 'ZA': 'africa', 'KE': 'africa', 'GH': 'africa', 'EG': 'africa',
  'MA': 'africa', 'TZ': 'africa', 'UG': 'africa', 'ET': 'africa', 'SN': 'africa',
  // South America
  'BR': 'south_america', 'AR': 'south_america', 'CO': 'south_america', 'CL': 'south_america',
  'PE': 'south_america', 'VE': 'south_america', 'EC': 'south_america', 'BO': 'south_america',
  'UY': 'south_america', 'PY': 'south_america', 'MX': 'south_america',
  // USA & Canada
  'US': 'usa_canada', 'CA': 'usa_canada',
  // UK
  'GB': 'uk',
  // North & West Europe
  'DE': 'north_west_europe', 'FR': 'north_west_europe', 'NL': 'north_west_europe',
  'BE': 'north_west_europe', 'AT': 'north_west_europe', 'CH': 'north_west_europe',
  'IE': 'north_west_europe', 'DK': 'north_west_europe', 'SE': 'north_west_europe',
  'NO': 'north_west_europe', 'FI': 'north_west_europe', 'LU': 'north_west_europe',
  // East & South Europe
  'ES': 'east_south_europe', 'IT': 'east_south_europe', 'PT': 'east_south_europe',
  'GR': 'east_south_europe', 'PL': 'east_south_europe', 'CZ': 'east_south_europe',
  'HU': 'east_south_europe', 'RO': 'east_south_europe', 'BG': 'east_south_europe',
  'HR': 'east_south_europe', 'SK': 'east_south_europe', 'SI': 'east_south_europe',
  'RS': 'east_south_europe', 'BA': 'east_south_europe', 'AL': 'east_south_europe',
  'MK': 'east_south_europe', 'ME': 'east_south_europe', 'UA': 'east_south_europe',
  'TR': 'east_south_europe',
  // Higher economic Asia
  'JP': 'asia_higher', 'KR': 'asia_higher', 'SG': 'asia_higher', 'HK': 'asia_higher',
  'TW': 'asia_higher', 'AU': 'asia_higher', 'NZ': 'asia_higher',
  // Lower economic Asia
  'IN': 'asia_lower', 'ID': 'asia_lower', 'PH': 'asia_lower', 'VN': 'asia_lower',
  'TH': 'asia_lower', 'MY': 'asia_lower', 'BD': 'asia_lower', 'PK': 'asia_lower',
  'LK': 'asia_lower', 'NP': 'asia_lower', 'MM': 'asia_lower', 'KH': 'asia_lower',
};

// Pricing rules by region
const regionPricing: Record<PricingRegion, { discount: number; currency: string }> = {
  africa: { discount: 65, currency: 'USD' },
  south_america: { discount: 65, currency: 'USD' },
  usa_canada: { discount: 0, currency: 'USD' },
  uk: { discount: 0, currency: 'GBP' },
  north_west_europe: { discount: 0, currency: 'EUR' },
  east_south_europe: { discount: 40, currency: 'EUR' },
  asia_lower: { discount: 65, currency: 'USD' },
  asia_higher: { discount: 0, currency: 'USD' },
  default: { discount: 0, currency: 'USD' },
};

export function useGeoPricing(): GeoPricingResult {
  const [region, setRegion] = useState<PricingRegion>('default');
  const [countryCode, setCountryCode] = useState<string>('');
  const [countryName, setCountryName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const detectRegion = async () => {
      try {
        // Try to get country from browser timezone/locale first
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const locale = navigator.language || 'en-US';
        
        // Try to detect country from IP using a free geo API
        try {
          const response = await fetch('https://ipapi.co/json/', { 
            signal: AbortSignal.timeout(3000) 
          });
          if (response.ok) {
            const data = await response.json();
            const code = data.country_code;
            setCountryCode(code);
            setCountryName(data.country_name || code);
            
            // Check database mapping first
            const { data: mapping } = await supabase
              .from('country_region_mapping')
              .select('region')
              .eq('country_code', code)
              .maybeSingle();
            
            if (mapping?.region) {
              setRegion(mapping.region as PricingRegion);
            } else if (countryToRegion[code]) {
              setRegion(countryToRegion[code]);
            }
          }
        } catch {
          // Fallback to locale-based detection
          const localeCountry = locale.split('-')[1]?.toUpperCase();
          if (localeCountry && countryToRegion[localeCountry]) {
            setCountryCode(localeCountry);
            setRegion(countryToRegion[localeCountry]);
          }
        }
      } catch (err) {
        setError('Could not detect region');
      } finally {
        setIsLoading(false);
      }
    };

    detectRegion();
  }, []);

  const calculatePrice = (basePriceUsd: number): RegionalPrice => {
    const pricing = regionPricing[region];
    const discountedPrice = basePriceUsd * (1 - pricing.discount / 100);
    
    return {
      price: Math.round(discountedPrice * 100) / 100,
      currency: pricing.currency,
      discount_percentage: pricing.discount,
    };
  };

  return {
    region,
    countryCode,
    countryName,
    isLoading,
    error,
    calculatePrice,
  };
}

export function formatPrice(amount: number, currency: string): string {
  const symbol = currencySymbols[currency] || currency;
  return `${symbol}${amount.toFixed(2)}`;
}
