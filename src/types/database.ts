export type EventStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'pencilled';
export type PaymentStatus = 'unpaid' | 'paid' | 'partial' | 'overdue';
export type EventType = 'gig' | 'session' | 'lesson' | 'rehearsal' | 'meeting' | 'other';
export type ExpenseCategory = 'travel' | 'equipment' | 'food' | 'accommodation' | 'marketing' | 'software' | 'other';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  business_name: string | null;
  phone: string | null;
  address: string | null;
  bank_details: string | null;
  logo_url: string | null;
  default_currency: string | null;
  tax_id: string | null;
  vat_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  user_id: string;
  title: string;
  event_type: EventType;
  venue_name: string | null;
  venue_address: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  fee: number;
  currency: string;
  arrival_time: string | null;
  start_time: string;
  end_time: string | null;
  notes: string | null;
  status: EventStatus;
  payment_status: PaymentStatus;
  payment_date: string | null;
  tags: string[] | null;
  is_recurring: boolean;
  share_token: string;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  user_id: string;
  event_id: string | null;
  invoice_number: string;
  client_name: string;
  client_email: string | null;
  client_address: string | null;
  amount: number;
  currency: string;
  due_date: string | null;
  status: PaymentStatus;
  items: InvoiceItem[];
  notes: string | null;
  sent_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Contract {
  id: string;
  user_id: string;
  event_id: string | null;
  title: string;
  client_name: string;
  client_email: string | null;
  clauses: ContractClause[];
  custom_terms: string | null;
  signed_at: string | null;
  sent_at: string | null;
  share_token: string;
  created_at: string;
  updated_at: string;
}

export interface ContractClause {
  id: string;
  title: string;
  content: string;
  enabled: boolean;
}

export interface Expense {
  id: string;
  user_id: string;
  event_id: string | null;
  description: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  date: string;
  receipt_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplate {
  id: string;
  user_id: string;
  name: string;
  subject: string;
  body: string;
  template_type: string;
  created_at: string;
  updated_at: string;
}

export interface SharedEvent {
  id: string;
  event_id: string;
  shared_by: string;
  shared_with: string | null;
  shared_with_email: string | null;
  can_see_fee: boolean;
  acknowledged: boolean;
  acknowledged_at: string | null;
  created_at: string;
}
