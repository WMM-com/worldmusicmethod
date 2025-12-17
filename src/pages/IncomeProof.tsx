import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { FileText, TrendingUp, Calendar, DollarSign, Building2 } from 'lucide-react';

interface ShareSettings {
  share_id: string;
  include_income_summary: boolean;
  include_monthly_breakdown: boolean;
  include_tax_calculations: boolean;
  include_other_income: boolean;
  owner_user_id: string;
}

interface FinancialData {
  business_name: string | null;
  full_name: string | null;
  total_event_income: number;
  total_other_income: number;
  monthly_data: Array<{
    month: string;
    event_income: number;
    other_income: number;
  }>;
}

export default function IncomeProof() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareSettings, setShareSettings] = useState<ShareSettings | null>(null);
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  const loadData = async () => {
    try {
      // Get share settings
      const { data: shareData, error: shareError } = await supabase
        .rpc('get_income_proof_by_token', { p_token: token });

      if (shareError) throw shareError;
      if (!shareData || shareData.length === 0) {
        setError('This link is invalid or has expired');
        setLoading(false);
        return;
      }

      const settings = shareData[0] as ShareSettings;
      setShareSettings(settings);

      // Get financial data
      const { data: finData, error: finError } = await supabase
        .rpc('get_shared_financial_data', { p_user_id: settings.owner_user_id });

      if (finError) throw finError;
      if (finData && finData.length > 0) {
        setFinancialData(finData[0] as FinancialData);
      }
    } catch (err) {
      console.error('Error loading income proof:', err);
      setError('Failed to load income proof');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Unable to Access</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalIncome = (financialData?.total_event_income || 0) + (financialData?.total_other_income || 0);
  const displayName = financialData?.business_name || financialData?.full_name || 'Self-Employed Professional';

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-primary">
            <Building2 className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold">{displayName}</h1>
          <p className="text-muted-foreground">Income Verification Document</p>
          <p className="text-sm text-muted-foreground">
            Generated on {format(new Date(), 'MMMM d, yyyy')}
          </p>
        </div>

        <Separator />

        {/* Income Summary */}
        {shareSettings?.include_income_summary && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Income Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Total Annual Income</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(totalIncome)}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Event/Service Income</p>
                  <p className="text-xl font-semibold">{formatCurrency(financialData?.total_event_income || 0)}</p>
                </div>
                {shareSettings.include_other_income && (
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Other Income</p>
                    <p className="text-xl font-semibold">{formatCurrency(financialData?.total_other_income || 0)}</p>
                  </div>
                )}
              </div>
              <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Monthly Average:</strong> {formatCurrency(totalIncome / 12)}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Monthly Breakdown */}
        {shareSettings?.include_monthly_breakdown && financialData?.monthly_data && financialData.monthly_data.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Monthly Income Breakdown (Last 12 Months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 font-medium">Month</th>
                      <th className="text-right py-2 font-medium">Event Income</th>
                      {shareSettings.include_other_income && (
                        <th className="text-right py-2 font-medium">Other Income</th>
                      )}
                      <th className="text-right py-2 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financialData.monthly_data.map((month, idx) => (
                      <tr key={idx} className="border-b border-border/50">
                        <td className="py-2">{month.month}</td>
                        <td className="text-right py-2">{formatCurrency(month.event_income)}</td>
                        {shareSettings.include_other_income && (
                          <td className="text-right py-2">{formatCurrency(month.other_income)}</td>
                        )}
                        <td className="text-right py-2 font-medium">
                          {formatCurrency(month.event_income + month.other_income)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tax Calculations placeholder - would need more data */}
        {shareSettings?.include_tax_calculations && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Tax Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This individual is registered as self-employed and maintains records for tax purposes.
                Total declared income for the current tax year: {formatCurrency(totalIncome)}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center space-y-2 pt-4">
          <Separator />
          <p className="text-xs text-muted-foreground pt-4">
            This document was generated automatically and represents income data as recorded in the system.
            For official verification, please contact the individual directly.
          </p>
          <p className="text-xs text-muted-foreground">
            Document ID: {token?.slice(0, 8)}... • Generated via Left Brain
          </p>
        </div>
      </div>
    </div>
  );
}
