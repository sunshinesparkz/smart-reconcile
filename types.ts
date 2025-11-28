export interface BankRecord {
  account_no: string;
  settlement_date: string;
  transaction_date: string;
  time: string;
  invoice_number: string;
  product: string;
  liter: number;
  price: number;
  amount_before_vat: number;
  vat: number;
  total_amount: number;
  wht_1_percent: number;
  total_amount_after_wd: number;
  merchant_id: string;
  fuel_brand: string;
  raw_total_amount: string; // Keep original string for display
}

export interface BookRecord {
  document_no: string;
  posting_date: string;
  description: string; // Matches invoice_number
  amount: number;
  raw_amount: string; // Keep original string for display
}

export enum MatchStatus {
  MATCHED = 'MATCHED',
  AMOUNT_MISMATCH = 'AMOUNT_MISMATCH',
  MISSING_IN_BANK = 'MISSING_IN_BANK',
  MISSING_IN_BOOK = 'MISSING_IN_BOOK',
  POTENTIAL_ID_ERROR = 'POTENTIAL_ID_ERROR'
}

export interface ReconciliationItem {
  id: string;
  bankRecord?: BankRecord;
  bookRecord?: BookRecord;
  status: MatchStatus;
  confidenceScore?: number; // 0-100
  suggestedFix?: string;
  reason?: string; // The AI detected root cause
  fixType?: 'UPDATE_AMOUNT' | 'UPDATE_ID' | 'CREATE_ENTRY' | null;
}

export interface Stats {
  total: number;
  matched: number;
  mismatched: number;
  missingInBank: number;
  missingInBook: number;
  accuracy: number;
}