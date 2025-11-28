import { BankRecord, BookRecord, MatchStatus, ReconciliationItem, Stats } from '../types';
import { parseNumber } from '../utils/csvParser';

// Helper to check for digit transposition (e.g., 5400 vs 4500)
const isDigitTransposition = (val1: number, val2: number): boolean => {
  const s1 = val1.toFixed(2).replace('.', '').replace(/0/g, '').split('').sort().join('');
  const s2 = val2.toFixed(2).replace('.', '').replace(/0/g, '').split('').sort().join('');
  // Check length and sum of digits to avoid false positives on small numbers
  return s1 === s2 && Math.abs(val1 - val2) > 0.01;
};

export const reconcileData = (bankData: BankRecord[], bookData: BookRecord[]): { results: ReconciliationItem[], stats: Stats } => {
  const results: ReconciliationItem[] = [];
  
  // Normalize Data for Comparison
  const bankMap = new Map<string, BankRecord>();
  const processedBankIds = new Set<string>();

  bankData.forEach(record => {
    // Convert string amounts to numbers for logic
    record.total_amount = parseNumber(record.raw_total_amount || record.total_amount.toString());
    record.amount_before_vat = parseNumber(record.amount_before_vat?.toString() || "0");
    bankMap.set(record.invoice_number, record);
  });

  bookData.forEach(bookRecord => {
    bookRecord.amount = parseNumber(bookRecord.raw_amount || bookRecord.amount.toString());
    
    const bankRecord = bankMap.get(bookRecord.description);
    
    if (bankRecord) {
      processedBankIds.add(bookRecord.description);
      
      const diff = bookRecord.amount - bankRecord.total_amount;

      // Check for exact match
      if (Math.abs(diff) < 0.01) {
        results.push({
          id: `match-${bookRecord.document_no}`,
          bankRecord,
          bookRecord,
          status: MatchStatus.MATCHED,
          confidenceScore: 100,
          reason: 'Exact Match'
        });
      } else {
        // DETECT ANOMALIES & GENERATE SMART FIXES
        let fixType: 'UPDATE_AMOUNT' | 'UPDATE_ID' | 'CREATE_ENTRY' | null = 'UPDATE_AMOUNT';
        let suggestedFix = `Update amount to ${bankRecord.total_amount.toLocaleString()}`;
        let reason = "Variance Detected";
        let confidence = 70;

        // Cause 1: VAT 7% Logic (Common in Thailand)
        // Check if Book Amount * 1.07 is close to Bank Amount
        const vatDiff = Math.abs((bookRecord.amount * 1.07) - bankRecord.total_amount);
        // Or if the difference matches the VAT amount in bank record
        const diffMatchesVat = Math.abs(Math.abs(diff) - bankRecord.vat) < 0.05;

        if (vatDiff < 0.05 || diffMatchesVat) {
             reason = "Missing 7% VAT";
             suggestedFix = `Add VAT to match Bank: ${bankRecord.total_amount.toLocaleString()}`;
             confidence = 99;
             fixType = 'UPDATE_AMOUNT';
        } 
        // Cause 2: Withholding Tax (WHT 1%)
        // Check if Bank Amount + WHT matches Book Amount
        else if (Math.abs(bankRecord.total_amount_after_wd - bookRecord.amount) < 0.05) {
             reason = "WHT Deduction Mismatch";
             suggestedFix = `Adjust for WHT. Target: ${bankRecord.total_amount.toLocaleString()}`;
             confidence = 95;
             fixType = 'UPDATE_AMOUNT';
        }
        // Cause 3: Digit Transposition (Human Error)
        else if (isDigitTransposition(bookRecord.amount, bankRecord.total_amount)) {
             reason = "Digit Transposition (Typo)";
             suggestedFix = `Correct typo to ${bankRecord.total_amount.toLocaleString()}`;
             confidence = 95;
             fixType = 'UPDATE_AMOUNT';
        }
        // Cause 4: Significant Discrepancy
        else if (Math.abs(diff) > 1000) {
             reason = "Significant Data Error";
             confidence = 50;
             suggestedFix = "Review original invoice document.";
             fixType = null; // Requires manual review
        }

        results.push({
          id: `mismatch-${bookRecord.document_no}`,
          bankRecord,
          bookRecord,
          status: MatchStatus.AMOUNT_MISMATCH,
          confidenceScore: confidence,
          suggestedFix,
          reason,
          fixType
        });
      }
    } else {
      // Missing in Bank OR Potential ID Typo
      // Advanced Logic: Look for "Orphaned" Bank records with exact amount match
      const potentialMatch = bankData.find(b => 
        !processedBankIds.has(b.invoice_number) && 
        Math.abs(b.total_amount - bookRecord.amount) < 0.01
      );

      if (potentialMatch) {
        processedBankIds.add(potentialMatch.invoice_number);
        results.push({
          id: `typo-${bookRecord.document_no}`,
          bankRecord: potentialMatch,
          bookRecord,
          status: MatchStatus.POTENTIAL_ID_ERROR,
          confidenceScore: 85,
          reason: "Incorrect Reference ID",
          suggestedFix: `Update Ref ID to ${potentialMatch.invoice_number}`,
          fixType: 'UPDATE_ID'
        });
      } else {
        results.push({
          id: `missing-bank-${bookRecord.document_no}`,
          bookRecord,
          status: MatchStatus.MISSING_IN_BANK,
          reason: "Not Found in Bank",
          suggestedFix: "Investigate: Check Bank Settlement Date",
          confidenceScore: 0,
          fixType: null
        });
      }
    }
  });

  // Find Missing in Book (Items in Bank but not in Book)
  bankData.forEach(bankRecord => {
    if (!processedBankIds.has(bankRecord.invoice_number)) {
      results.push({
        id: `missing-book-${bankRecord.invoice_number}`,
        bankRecord,
        status: MatchStatus.MISSING_IN_BOOK,
        suggestedFix: `Create GL Entry for ${bankRecord.total_amount.toLocaleString()}`,
        reason: "Unrecorded Transaction",
        confidenceScore: 100,
        fixType: 'CREATE_ENTRY'
      });
    }
  });

  // Calculate Stats
  const total = results.length;
  const matched = results.filter(r => r.status === MatchStatus.MATCHED).length;
  const mismatched = results.filter(r => r.status === MatchStatus.AMOUNT_MISMATCH || r.status === MatchStatus.POTENTIAL_ID_ERROR).length;
  const missingInBank = results.filter(r => r.status === MatchStatus.MISSING_IN_BANK).length;
  const missingInBook = results.filter(r => r.status === MatchStatus.MISSING_IN_BOOK).length;

  return {
    results,
    stats: {
      total,
      matched,
      mismatched,
      missingInBank,
      missingInBook,
      accuracy: total > 0 ? (matched / total) * 100 : 0
    }
  };
};