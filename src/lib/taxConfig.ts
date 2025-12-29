// Tax configuration for UK, Ireland, and USA
// Updated for 2023/2024 and 2024/2025 tax years

export type TaxCountry = 'UK' | 'IE' | 'US';

export interface TaxYear {
  label: string;
  value: string;
  startDate: Date;
  endDate: Date;
}

export interface TaxBracket {
  min: number;
  max: number | null;
  rate: number;
}

export interface TaxConfig {
  country: TaxCountry;
  countryName: string;
  currencyCode: string;
  currencySymbol: string;
  taxYears: TaxYear[];
  getTaxConfig: (taxYear: string) => CountryTaxConfig;
}

export interface CountryTaxConfig {
  personalAllowance: number;
  tradingAllowance: number;
  incomeTaxBrackets: TaxBracket[];
  // National Insurance (UK), PRSI (IE), Self-Employment Tax (US)
  socialContributions: {
    name: string;
    type: 'flat' | 'percentage' | 'brackets';
    threshold?: number;
    rate?: number;
    flatRate?: number;
    brackets?: TaxBracket[];
    additionalInfo?: string;
  }[];
}

// UK Tax Configuration
const ukConfig: TaxConfig = {
  country: 'UK',
  countryName: 'United Kingdom',
  currencyCode: 'GBP',
  currencySymbol: '£',
  taxYears: [
    {
      label: '2025/26',
      value: '2025-26',
      startDate: new Date('2025-04-06'),
      endDate: new Date('2026-04-05'),
    },
    {
      label: '2024/25',
      value: '2024-25',
      startDate: new Date('2024-04-06'),
      endDate: new Date('2025-04-05'),
    },
    {
      label: '2023/24',
      value: '2023-24',
      startDate: new Date('2023-04-06'),
      endDate: new Date('2024-04-05'),
    },
  ],
  getTaxConfig: (taxYear: string): CountryTaxConfig => {
    // Same for both years currently
    return {
      personalAllowance: 12570,
      tradingAllowance: 1000,
      incomeTaxBrackets: [
        { min: 0, max: 37700, rate: 0.20 }, // Basic rate
        { min: 37700, max: 125140, rate: 0.40 }, // Higher rate
        { min: 125140, max: null, rate: 0.45 }, // Additional rate
      ],
      socialContributions: [
        {
          name: 'Class 2 National Insurance',
          type: 'flat',
          threshold: 12570,
          flatRate: taxYear === '2024-25' ? 3.45 * 52 : 3.45 * 52, // Weekly rate * 52
          additionalInfo: 'Payable if profits exceed threshold',
        },
        {
          name: 'Class 4 National Insurance',
          type: 'brackets',
          brackets: [
            { min: 12570, max: 50270, rate: taxYear === '2024-25' ? 0.06 : 0.09 },
            { min: 50270, max: null, rate: 0.02 },
          ],
          additionalInfo: 'On profits between thresholds',
        },
      ],
    };
  },
};

// Ireland Tax Configuration
const ieConfig: TaxConfig = {
  country: 'IE',
  countryName: 'Ireland',
  currencyCode: 'EUR',
  currencySymbol: '€',
  taxYears: [
    {
      label: '2025',
      value: '2025',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
    },
    {
      label: '2024',
      value: '2024',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
    },
    {
      label: '2023',
      value: '2023',
      startDate: new Date('2023-01-01'),
      endDate: new Date('2023-12-31'),
    },
  ],
  getTaxConfig: (taxYear: string): CountryTaxConfig => {
    const isPost2024 = taxYear === '2024';
    return {
      personalAllowance: 0, // Ireland uses tax credits instead
      tradingAllowance: 0,
      incomeTaxBrackets: [
        { min: 0, max: isPost2024 ? 42000 : 40000, rate: 0.20 }, // Standard rate
        { min: isPost2024 ? 42000 : 40000, max: null, rate: 0.40 }, // Higher rate
      ],
      socialContributions: [
        {
          name: 'Universal Social Charge (USC)',
          type: 'brackets',
          brackets: [
            { min: 0, max: 12012, rate: 0.005 },
            { min: 12012, max: 25760, rate: 0.02 },
            { min: 25760, max: 70044, rate: 0.04 },
            { min: 70044, max: null, rate: 0.08 },
          ],
          additionalInfo: 'Applies to gross income over €13,000',
        },
        {
          name: 'PRSI Class S',
          type: 'percentage',
          threshold: 5000,
          rate: 0.04,
          additionalInfo: 'Self-employed rate on all income over €5,000',
        },
      ],
    };
  },
};

// USA Tax Configuration (Federal only)
const usConfig: TaxConfig = {
  country: 'US',
  countryName: 'United States',
  currencyCode: 'USD',
  currencySymbol: '$',
  taxYears: [
    {
      label: '2025',
      value: '2025',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
    },
    {
      label: '2024',
      value: '2024',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
    },
    {
      label: '2023',
      value: '2023',
      startDate: new Date('2023-01-01'),
      endDate: new Date('2023-12-31'),
    },
  ],
  getTaxConfig: (taxYear: string): CountryTaxConfig => {
    const is2024 = taxYear === '2024';
    return {
      personalAllowance: 0, // US uses standard deduction
      tradingAllowance: is2024 ? 14600 : 13850, // Standard deduction (single filer)
      incomeTaxBrackets: is2024
        ? [
            { min: 0, max: 11600, rate: 0.10 },
            { min: 11600, max: 47150, rate: 0.12 },
            { min: 47150, max: 100525, rate: 0.22 },
            { min: 100525, max: 191950, rate: 0.24 },
            { min: 191950, max: 243725, rate: 0.32 },
            { min: 243725, max: 609350, rate: 0.35 },
            { min: 609350, max: null, rate: 0.37 },
          ]
        : [
            { min: 0, max: 11000, rate: 0.10 },
            { min: 11000, max: 44725, rate: 0.12 },
            { min: 44725, max: 95375, rate: 0.22 },
            { min: 95375, max: 182100, rate: 0.24 },
            { min: 182100, max: 231250, rate: 0.32 },
            { min: 231250, max: 578125, rate: 0.35 },
            { min: 578125, max: null, rate: 0.37 },
          ],
      socialContributions: [
        {
          name: 'Self-Employment Tax',
          type: 'percentage',
          threshold: 400,
          rate: 0.153, // 15.3% (12.4% Social Security + 2.9% Medicare)
          additionalInfo: 'Social Security (12.4%) + Medicare (2.9%) on 92.35% of net earnings',
        },
      ],
    };
  },
};

export const TAX_CONFIGS: Record<TaxCountry, TaxConfig> = {
  UK: ukConfig,
  IE: ieConfig,
  US: usConfig,
};

export function getTaxYearsForCountry(country: TaxCountry): TaxYear[] {
  return TAX_CONFIGS[country].taxYears;
}

export function getCurrentTaxYear(country: TaxCountry): string {
  const now = new Date();
  const taxYears = TAX_CONFIGS[country].taxYears;
  
  for (const ty of taxYears) {
    if (now >= ty.startDate && now <= ty.endDate) {
      return ty.value;
    }
  }
  
  // Default to most recent tax year
  return taxYears[0].value;
}

export function formatCurrencyForCountry(amount: number, country: TaxCountry): string {
  const config = TAX_CONFIGS[country];
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: config.currencyCode,
  }).format(amount);
}
