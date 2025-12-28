import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { Invoice, InvoiceItem, Profile } from '@/types/database';

const CURRENCIES: Record<string, string> = {
  GBP: '£',
  EUR: '€',
  USD: '$',
  CAD: 'C$',
  AUD: 'A$',
  CHF: 'CHF',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  JPY: '¥',
};

export function generateInvoicePdf(invoice: Invoice, profile: Profile | null): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const currencySymbol = CURRENCIES[invoice.currency] || invoice.currency;

  const formatAmount = (amount: number) => {
    return `${currencySymbol}${amount.toFixed(2)}`;
  };

  // Format address nicely - split by comma and display on separate lines
  const formatAddress = (address: string | null | undefined): string[] => {
    if (!address) return [];
    // Split by comma or newline and trim each part
    return address
      .split(/,|\n/)
      .map(part => part.trim())
      .filter(part => part.length > 0);
  };

  // Header - Business Info
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(profile?.business_name || profile?.full_name || 'Invoice', margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);

  if (profile?.address) {
    const addressLines = formatAddress(profile.address);
    addressLines.forEach(line => {
      doc.text(line, margin, y);
      y += 5;
    });
  }

  if (profile?.phone) {
    doc.text(profile.phone, margin, y);
    y += 5;
  }

  if (profile?.email) {
    doc.text(profile.email, margin, y);
    y += 5;
  }

  // Tax identifiers
  if (profile?.tax_id) {
    doc.text(`Tax ID: ${profile.tax_id}`, margin, y);
    y += 5;
  }

  if (profile?.vat_number) {
    doc.text(`VAT: ${profile.vat_number}`, margin, y);
    y += 5;
  }

  // Invoice title on right side
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageWidth - margin, 25, { align: 'right' });

  // Invoice details on right
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  let rightY = 38;

  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Number:', pageWidth - margin - 55, rightY);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.invoice_number, pageWidth - margin, rightY, { align: 'right' });
  rightY += 6;

  doc.setFont('helvetica', 'bold');
  doc.text('Date:', pageWidth - margin - 50, rightY);
  doc.setFont('helvetica', 'normal');
  doc.text(format(new Date(invoice.created_at), 'dd MMM yyyy'), pageWidth - margin, rightY, { align: 'right' });
  rightY += 6;

  if (invoice.due_date) {
    doc.setFont('helvetica', 'bold');
    doc.text('Due Date:', pageWidth - margin - 50, rightY);
    doc.setFont('helvetica', 'normal');
    doc.text(format(new Date(invoice.due_date), 'dd MMM yyyy'), pageWidth - margin, rightY, { align: 'right' });
    rightY += 6;
  }

  doc.setFont('helvetica', 'bold');
  doc.text('Status:', pageWidth - margin - 50, rightY);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.status.toUpperCase(), pageWidth - margin, rightY, { align: 'right' });

  // Bill To section
  y = Math.max(y, rightY) + 15;

  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y, contentWidth / 2 - 5, 35, 'F');

  y += 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text('BILL TO', margin + 5, y);
  y += 7;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.client_name, margin + 5, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  if (invoice.client_email) {
    doc.text(invoice.client_email, margin + 5, y);
    y += 5;
  }

  if (invoice.client_address) {
    const clientAddressLines = formatAddress(invoice.client_address);
    clientAddressLines.forEach(line => {
      doc.text(line, margin + 5, y);
      y += 5;
    });
  }

  // Items table
  y += 20;

  // Table header
  doc.setFillColor(50, 50, 50);
  doc.rect(margin, y, contentWidth, 10, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  y += 7;

  const colDescription = margin + 5;
  const colQty = margin + contentWidth * 0.55;
  const colRate = margin + contentWidth * 0.70;
  const colAmount = margin + contentWidth * 0.85;

  doc.text('Description', colDescription, y);
  doc.text('Qty', colQty, y);
  doc.text('Rate', colRate, y);
  doc.text('Amount', colAmount, y);

  y += 6;

  // Table rows
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  const items = invoice.items || [];
  items.forEach((item: InvoiceItem, index: number) => {
    // Alternate row background
    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, y - 3, contentWidth, 10, 'F');
    }

    doc.text(item.description.substring(0, 50), colDescription, y + 4);
    doc.text(item.quantity.toString(), colQty, y + 4);
    doc.text(formatAmount(item.rate), colRate, y + 4);
    doc.text(formatAmount(item.amount), colAmount, y + 4);

    y += 10;
  });

  // Total section
  y += 5;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin + contentWidth * 0.6, y, margin + contentWidth, y);
  y += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Total:', margin + contentWidth * 0.65, y);
  doc.setFontSize(14);
  doc.text(formatAmount(invoice.amount), margin + contentWidth, y, { align: 'right' });

  // Notes section
  if (invoice.notes) {
    y += 20;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text('Notes / Payment Terms', margin, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const noteLines = doc.splitTextToSize(invoice.notes, contentWidth);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 5;
  }

  // Bank details
  if (profile?.bank_details) {
    y += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text('Payment Details', margin, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const bankLines = profile.bank_details.split('\n');
    bankLines.forEach(line => {
      doc.text(line, margin, y);
      y += 5;
    });
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Thank you for your business', pageWidth / 2, footerY, { align: 'center' });

  return doc;
}

export function downloadInvoicePdf(invoice: Invoice, profile: Profile | null) {
  const doc = generateInvoicePdf(invoice, profile);
  doc.save(`${invoice.invoice_number}.pdf`);
}