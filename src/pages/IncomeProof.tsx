import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { FileText, TrendingUp, Calendar, DollarSign, Building2, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { formatCurrency } from '@/lib/currency';

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
  default_currency: string | null;
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
      const { data: shareData, error: shareError } = await supabase
        .rpc('get_income_proof_by_token', { p_token: token });

      if (shareError) throw shareError;
      if (!shareData || shareData.length === 0) {
        setError('This link is invalid or has expired');
        setLoading(false);
        return;
      }

      // Map the RPC response - RPC returns different column names
      const rawSettings = shareData[0] as any;
      const settings: ShareSettings = {
        share_id: rawSettings.id || rawSettings.share_id,
        include_income_summary: rawSettings.include_income_summary,
        include_monthly_breakdown: rawSettings.include_monthly_breakdown,
        include_tax_calculations: rawSettings.include_tax_calculations,
        include_other_income: rawSettings.include_other_income,
        owner_user_id: rawSettings.user_id || rawSettings.owner_user_id,
      };
      setShareSettings(settings);

      const { data: finData, error: finError } = await supabase
        .rpc('get_shared_financial_data', { p_user_id: settings.owner_user_id });

      if (finError) throw finError;
      
      // Fetch owner's profile for default currency
      const { data: profileData } = await supabase
        .from('profiles')
        .select('default_currency')
        .eq('id', settings.owner_user_id)
        .single();
      
      if (finData && finData.length > 0) {
        const rawFinData = finData[0] as any;
        setFinancialData({
          business_name: rawFinData.business_name,
          full_name: rawFinData.full_name,
          total_event_income: rawFinData.total_event_income ?? rawFinData.total ?? 0,
          total_other_income: rawFinData.total_other_income ?? 0,
          default_currency: profileData?.default_currency || 'GBP',
          monthly_data: rawFinData.monthly_data ?? rawFinData.data ?? [],
        });
      }
    } catch (err) {
      console.error('Error loading income proof:', err);
      setError('Failed to load income proof');
    } finally {
      setLoading(false);
    }
  };

  const currency = financialData?.default_currency || 'GBP';
  const formatAmount = (amount: number) => formatCurrency(amount, currency);

  const downloadPDF = () => {
    if (!financialData || !shareSettings) return;

    const doc = new jsPDF();
    const totalIncome = (financialData.total_event_income || 0) + (financialData.total_other_income || 0);
    const pdfDisplayName = financialData.business_name || financialData.full_name || 'Self-Employed Professional';
    
    let y = 20;
    const leftMargin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(pdfDisplayName, pageWidth / 2, y, { align: 'center' });
    y += 10;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('Income Verification Document', pageWidth / 2, y, { align: 'center' });
    y += 8;

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on ${format(new Date(), 'MMMM d, yyyy')}`, pageWidth / 2, y, { align: 'center' });
    y += 5;
    doc.text(`Document ID: ${token?.slice(0, 8)}...`, pageWidth / 2, y, { align: 'center' });
    doc.setTextColor(0);
    y += 15;

    doc.setDrawColor(200);
    doc.line(leftMargin, y, pageWidth - leftMargin, y);
    y += 15;

    if (shareSettings.include_income_summary) {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Income Summary', leftMargin, y);
      y += 12;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      
      doc.text('Total Annual Income:', leftMargin, y);
      doc.setFont('helvetica', 'bold');
      doc.text(formatAmount(totalIncome), pageWidth - leftMargin, y, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      y += 8;

      doc.text('Event/Service Income:', leftMargin, y);
      doc.text(formatAmount(financialData.total_event_income || 0), pageWidth - leftMargin, y, { align: 'right' });
      y += 8;

      if (shareSettings.include_other_income) {
        doc.text('Other Income:', leftMargin, y);
        doc.text(formatAmount(financialData.total_other_income || 0), pageWidth - leftMargin, y, { align: 'right' });
        y += 8;
      }

      doc.text('Monthly Average:', leftMargin, y);
      doc.text(formatAmount(totalIncome / 12), pageWidth - leftMargin, y, { align: 'right' });
      y += 15;
    }

    if (shareSettings.include_monthly_breakdown && financialData.monthly_data?.length > 0) {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Monthly Income Breakdown', leftMargin, y);
      y += 12;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      financialData.monthly_data.forEach((month) => {
        if (y > 270) { doc.addPage(); y = 20; }
        const monthTotal = month.event_income + month.other_income;
        doc.text(`${month.month}: ${formatAmount(monthTotal)}`, leftMargin, y);
        y += 7;
      });
      y += 10;
    }

    const fileName = `income-proof-${pdfDisplayName.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);
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
        <div className="flex justify-end">
          <Button onClick={downloadPDF} className="gap-2">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>

        <div className="text-center space-y-2">
          <Building2 className="h-8 w-8 mx-auto text-primary" />
          <h1 className="text-2xl font-bold">{displayName}</h1>
          <p className="text-muted-foreground">Income Verification Document</p>
          <p className="text-sm text-muted-foreground">Generated on {format(new Date(), 'MMMM d, yyyy')}</p>
        </div>

        <Separator />

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
                  <p className="text-2xl font-bold text-primary">{formatAmount(totalIncome)}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Event/Service Income</p>
                  <p className="text-xl font-semibold">{formatAmount(financialData?.total_event_income || 0)}</p>
                </div>
                {shareSettings.include_other_income && (
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Other Income</p>
                    <p className="text-xl font-semibold">{formatAmount(financialData?.total_other_income || 0)}</p>
                  </div>
                )}
              </div>
              <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Monthly Average:</strong> {formatAmount(totalIncome / 12)}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {shareSettings?.include_monthly_breakdown && financialData?.monthly_data?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Monthly Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {financialData.monthly_data.map((month, idx) => (
                  <div key={idx} className="flex justify-between py-2 border-b border-border/50">
                    <span>{month.month}</span>
                    <span className="font-medium">{formatAmount(month.event_income + month.other_income)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
                Total declared income: {formatAmount(totalIncome)}
              </p>
            </CardContent>
          </Card>
        )}

        <div className="text-center pt-4">
          <Separator className="mb-4" />
          <p className="text-xs text-muted-foreground">
            Document ID: {token?.slice(0, 8)}... • Generated via Left Brain
          </p>
        </div>
      </div>
    </div>
  );
}