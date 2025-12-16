import { z } from 'zod';

// Shared email validation
export const emailSchema = z.string().email('Invalid email format').max(255, 'Email too long');
export const optionalEmailSchema = emailSchema.optional().or(z.literal(''));

// Event validation schema
export const eventSchema = z.object({
  title: z.string().min(1, 'Event title is required').max(200, 'Title must be less than 200 characters'),
  event_type: z.enum(['gig', 'session', 'lesson', 'rehearsal', 'meeting', 'other']),
  venue_name: z.string().max(200, 'Venue name too long').optional().or(z.literal('')),
  venue_address: z.string().max(500, 'Address too long').optional().or(z.literal('')),
  client_name: z.string().max(200, 'Client name too long').optional().or(z.literal('')),
  client_email: optionalEmailSchema,
  client_phone: z.string().max(30, 'Phone number too long').optional().or(z.literal('')),
  fee: z.number().nonnegative('Fee cannot be negative').optional(),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'pencilled']),
  payment_status: z.enum(['unpaid', 'paid', 'partial', 'overdue']),
  notes: z.string().max(2000, 'Notes must be less than 2000 characters').optional().or(z.literal('')),
});

// Invoice validation schema
export const invoiceSchema = z.object({
  invoice_number: z.string().min(1, 'Invoice number is required').max(50, 'Invoice number too long'),
  client_name: z.string().min(1, 'Client name is required').max(200, 'Client name too long'),
  client_email: optionalEmailSchema,
  client_address: z.string().max(500, 'Address too long').optional().or(z.literal('')),
  amount: z.number().positive('Amount must be greater than 0'),
  currency: z.string().length(3, 'Currency must be 3 characters').default('GBP'),
  due_date: z.string().optional(),
  notes: z.string().max(1000, 'Notes too long').optional().or(z.literal('')),
  items: z.array(z.object({
    description: z.string().min(1, 'Description required').max(200),
    quantity: z.number().positive('Quantity must be positive'),
    rate: z.number().nonnegative('Rate cannot be negative'),
    amount: z.number().nonnegative('Amount cannot be negative'),
  })).optional(),
});

// Contract validation schema
export const contractSchema = z.object({
  title: z.string().min(1, 'Contract title is required').max(200, 'Title too long'),
  client_name: z.string().min(1, 'Client name is required').max(200, 'Client name too long'),
  client_email: optionalEmailSchema,
  custom_terms: z.string().max(5000, 'Custom terms too long').optional().or(z.literal('')),
  clauses: z.array(z.object({
    id: z.string(),
    title: z.string().max(200),
    content: z.string().max(2000),
    enabled: z.boolean(),
  })).optional(),
});

// Send invoice form validation
export const sendInvoiceSchema = z.object({
  recipientEmail: emailSchema,
});

// Export types
export type EventFormData = z.infer<typeof eventSchema>;
export type InvoiceFormData = z.infer<typeof invoiceSchema>;
export type ContractFormData = z.infer<typeof contractSchema>;
export type SendInvoiceFormData = z.infer<typeof sendInvoiceSchema>;
