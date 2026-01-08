import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type PricingRegion = 
  | 'africa' 
  | 'african_euros'
  | 'south_america' 
  | 'usa_canada' 
  | 'uk' 
  | 'north_west_europe' 
  | 'east_south_europe' 
  | 'asia_lower' 
  | 'asia_higher' 
  | 'default';

export interface RegionalPrice {
  price: number;
  currency: string;
  discount_percentage: number;
}

interface ProductRegionalPricing {
  region: string;
  discount_percentage: number;
  currency: string;
  fixed_price?: number | null;
}

interface GeoPricingContextType {
  region: PricingRegion;
  countryCode: string;
  countryName: string;
  isLoading: boolean;
  error: string | null;
  calculatePrice: (basePriceUsd: number, productRegionalPricing?: ProductRegionalPricing[]) => RegionalPrice | null;
}

const GeoPricingContext = createContext<GeoPricingContextType | undefined>(undefined);

// Currency symbols
const currencySymbols: Record<string, string> = {
  USD: '$',
  GBP: '£',
  EUR: '€',
};

// Fallback country-to-region mapping for common countries
const countryToRegion: Record<string, PricingRegion> = {
  // Africa (USD)
  'NG': 'africa', 'ZA': 'africa', 'KE': 'africa', 'GH': 'africa', 'EG': 'africa',
  'TZ': 'africa', 'UG': 'africa', 'ET': 'africa', 'CD': 'africa', 'DJ': 'africa',
  'ER': 'africa', 'SZ': 'africa', 'LS': 'africa', 'LR': 'africa', 'LY': 'africa',
  'MG': 'africa', 'MW': 'africa', 'NA': 'africa', 'RW': 'africa', 'SL': 'africa',
  'SO': 'africa', 'SS': 'africa', 'SD': 'africa', 'ZM': 'africa', 'ZW': 'africa',
  'BW': 'africa',
  // African Euros (Francophone/Lusophone - EUR)
  'ST': 'african_euros', 'SC': 'african_euros', 'TG': 'african_euros', 'TN': 'african_euros',
  'NE': 'african_euros', 'ML': 'african_euros', 'MR': 'african_euros', 'MU': 'african_euros',
  'MZ': 'african_euros', 'GA': 'african_euros', 'GM': 'african_euros', 'GN': 'african_euros',
  'GW': 'african_euros', 'CI': 'african_euros', 'MA': 'african_euros', 'SN': 'african_euros',
  'DZ': 'african_euros', 'AO': 'african_euros', 'BJ': 'african_euros', 'BF': 'african_euros',
  'BI': 'african_euros', 'CM': 'african_euros', 'CV': 'african_euros', 'CF': 'african_euros',
  'TD': 'african_euros', 'GQ': 'african_euros', 'KM': 'african_euros', 'CG': 'african_euros',
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
  // Higher economic Asia (including China)
  'JP': 'asia_higher', 'KR': 'asia_higher', 'SG': 'asia_higher', 'HK': 'asia_higher',
  'TW': 'asia_higher', 'AU': 'asia_higher', 'NZ': 'asia_higher', 'CN': 'asia_higher',
  // Lower economic Asia
  'IN': 'asia_lower', 'ID': 'asia_lower', 'PH': 'asia_lower', 'VN': 'asia_lower',
  'TH': 'asia_lower', 'MY': 'asia_lower', 'BD': 'asia_lower', 'PK': 'asia_lower',
  'LK': 'asia_lower', 'NP': 'asia_lower', 'MM': 'asia_lower', 'KH': 'asia_lower',
};

// Pricing rules by region
const regionPricing: Record<PricingRegion, { discount: number; currency: string }> = {
  africa: { discount: 65, currency: 'USD' },
  african_euros: { discount: 65, currency: 'EUR' },
  south_america: { discount: 65, currency: 'USD' },
  usa_canada: { discount: 0, currency: 'USD' },
  uk: { discount: 20.2, currency: 'GBP' },
  north_west_europe: { discount: 14.14, currency: 'EUR' },
  east_south_europe: { discount: 30.3, currency: 'EUR' },
  asia_lower: { discount: 65, currency: 'USD' },
  asia_higher: { discount: 0, currency: 'USD' },
  default: { discount: 0, currency: 'USD' },
};

const CACHE_KEY = 'geo_pricing_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface CachedGeoData {
  region: PricingRegion;
  countryCode: string;
  countryName: string;
  timestamp: number;
}

function getCachedGeoData(): CachedGeoData | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const data: CachedGeoData = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is still valid (24 hours)
    if (now - data.timestamp < CACHE_DURATION) {
      return data;
    }
    
    // Cache expired, remove it
    localStorage.removeItem(CACHE_KEY);
    return null;
  } catch {
    return null;
  }
}

function setCachedGeoData(data: Omit<CachedGeoData, 'timestamp'>): void {
  try {
    const cacheData: CachedGeoData = {
      ...data,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch {
    // Ignore storage errors
  }
}

export function GeoPricingProvider({ children }: { children: React.ReactNode }) {
  // Initialize from cache synchronously to avoid loading state on cached visits
  const cachedData = getCachedGeoData();
  const [region, setRegion] = useState<PricingRegion>(cachedData?.region ?? 'default');
  const [countryCode, setCountryCode] = useState<string>(cachedData?.countryCode ?? '');
  const [countryName, setCountryName] = useState<string>(cachedData?.countryName ?? '');
  const [isLoading, setIsLoading] = useState(!cachedData); // Only loading if no cache
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If we already have cached data, skip the API call entirely
    if (cachedData) {
      console.log('[GeoPricing] Using cached data:', cachedData.countryCode, cachedData.region);
      return;
    }

    const detectRegion = async () => {
      const locale = navigator.language || 'en-US';
      
      // Try to detect country from IP using a free geo API
      try {
        const response = await fetch('https://ipapi.co/json/', { 
          signal: AbortSignal.timeout(2000) // Reduced timeout
        });
        if (response.ok) {
          const data = await response.json();
          const code = data.country_code;
          const name = data.country_name || code;
          console.log('[GeoPricing] Detected country:', code, name);
          
          // Use local fallback first (instant), then update from DB if different
          let detectedRegion: PricingRegion = countryToRegion[code] || 'default';
          
          setCountryCode(code);
          setCountryName(name);
          setRegion(detectedRegion);
          setIsLoading(false);
          
          // Cache immediately with local mapping
          setCachedGeoData({
            region: detectedRegion,
            countryCode: code,
            countryName: name,
          });
          
          // Check database mapping in background (non-blocking)
          supabase
            .from('country_region_mapping')
            .select('region')
            .eq('country_code', code)
            .maybeSingle()
            .then(({ data: mapping }) => {
              if (mapping?.region && mapping.region !== detectedRegion) {
                console.log('[GeoPricing] Updating from DB mapping:', mapping.region);
                const dbRegion = mapping.region as PricingRegion;
                setRegion(dbRegion);
                setCachedGeoData({
                  region: dbRegion,
                  countryCode: code,
                  countryName: name,
                });
              }
            });
          return;
        }
      } catch (err) {
        console.warn('[GeoPricing] IP detection failed, using locale fallback:', err);
      }
      
      // Fallback to locale-based detection
      const localeCountry = locale.split('-')[1]?.toUpperCase();
      if (localeCountry && countryToRegion[localeCountry]) {
        console.log('[GeoPricing] Using locale fallback:', localeCountry);
        setCountryCode(localeCountry);
        setRegion(countryToRegion[localeCountry]);
        setCachedGeoData({
          region: countryToRegion[localeCountry],
          countryCode: localeCountry,
          countryName: localeCountry,
        });
      }
      
      setIsLoading(false);
    };

    detectRegion();
  }, []);

  const calculatePrice = (basePriceUsd: number, productRegionalPricing?: ProductRegionalPricing[]): RegionalPrice | null => {
    // Return null if still loading to prevent showing wrong prices
    if (isLoading) return null;
    
    // Check for product-specific regional pricing first
    if (productRegionalPricing && productRegionalPricing.length > 0) {
      const productPricing = productRegionalPricing.find(p => p.region === region);
      if (productPricing) {
        // Use fixed_price if set, otherwise calculate from discount percentage
        if (productPricing.fixed_price !== null && productPricing.fixed_price !== undefined && productPricing.fixed_price > 0) {
          return {
            price: Math.round(productPricing.fixed_price),
            currency: productPricing.currency,
            discount_percentage: productPricing.discount_percentage,
          };
        }
        const discountedPrice = basePriceUsd * (1 - productPricing.discount_percentage / 100);
        return {
          price: Math.round(discountedPrice),
          currency: productPricing.currency,
          discount_percentage: productPricing.discount_percentage,
        };
      }
    }
    
    // Fall back to global region pricing
    const pricing = regionPricing[region];
    const discountedPrice = basePriceUsd * (1 - pricing.discount / 100);
    
    // Round product price to nearest whole number for clean display
    return {
      price: Math.round(discountedPrice),
      currency: pricing.currency,
      discount_percentage: pricing.discount,
    };
  };

  return (
    <GeoPricingContext.Provider
      value={{
        region,
        countryCode,
        countryName,
        isLoading,
        error,
        calculatePrice,
      }}
    >
      {children}
    </GeoPricingContext.Provider>
  );
}

export function useGeoPricing(): GeoPricingContextType {
  const context = useContext(GeoPricingContext);
  if (context === undefined) {
    throw new Error('useGeoPricing must be used within a GeoPricingProvider');
  }
  return context;
}

export function formatPrice(amount: number, currency: string, showDecimals: boolean = true): string {
  const symbol = currencySymbols[currency] || currency;
  if (showDecimals) {
    return `${symbol}${amount.toFixed(2)}`;
  }
  // Only round for display when explicitly requested (e.g., catalog prices)
  return `${symbol}${Math.round(amount)}`;
}
