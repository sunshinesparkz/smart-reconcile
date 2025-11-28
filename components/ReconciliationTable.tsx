import React, { useState } from 'react';
import { MatchStatus, ReconciliationItem } from '../types';

interface Props {
  data: ReconciliationItem[];
  onFix: (item: ReconciliationItem) => void;
}

export const ReconciliationTable: React.FC<Props> = ({ data, onFix }) => {
  const [filter, setFilter] = useState<string>('ISSUES');

  const filteredData = data.filter(item => {
    if (filter === 'ALL') return true;
    if (filter === 'ISSUES') return item.status !== MatchStatus.MATCHED;
    return item.status === filter;
  });

  const getStatusBadge = (status: MatchStatus) => {
    switch (status) {
      case MatchStatus.MATCHED:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">Matched</span>;
      case MatchStatus.AMOUNT_MISMATCH:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">Amount Mismatch</span>;
      case MatchStatus.POTENTIAL_ID_ERROR:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">ID Issue</span>;
      case MatchStatus.MISSING_IN_BANK:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">Missing in Bank</span>;
      case MatchStatus.MISSING_IN_BOOK:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">Missing in Book</span>;
      default:
        return null;
    }
  };

  const getCauseStyle = (item: ReconciliationItem) => {
    if (item.status === MatchStatus.MATCHED) return "text-gray-400 italic";
    if (item.reason?.includes("VAT")) return "text-purple-600 font-bold";
    if (item.reason?.includes("Digit")) return "text-orange-600 font-bold";
    if (item.reason?.includes("Unrecorded")) return "text-blue-600 font-bold";
    return "text-slate-700 font-medium";
  };

  const formatMoney = (amount?: number) => {
    if (amount === undefined || amount === null) return '-';
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Helper to render the specific action button based on fix type
  const renderActionButton = (item: ReconciliationItem) => {
      if (item.status === MatchStatus.MATCHED || !item.suggestedFix || !item.fixType) {
          return <span className="text-gray-300 text-xs">No Action Needed</span>;
      }

      let buttonColor = "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200";
      let label = "Apply Fix";
      let subLabel = "";

      if (item.fixType === 'UPDATE_AMOUNT') {
          label = "Update Amount";
          if (item.reason?.includes("VAT")) {
              buttonColor = "bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200";
              label = "Add 7% VAT";
          } else if (item.reason?.includes("Digit")) {
              buttonColor = "bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200";
              label = "Fix Typo";
          }
          subLabel = `${formatMoney(item.bankRecord?.total_amount)}`;
      } else if (item.fixType === 'CREATE_ENTRY') {
          buttonColor = "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200";
          label = "Create Entry";
          subLabel = "+ GL Record";
      } else if (item.fixType === 'UPDATE_ID') {
           label = "Link ID";
           subLabel = item.bankRecord?.invoice_number || "";
      }

      return (
        <button
            onClick={() => onFix(item)}
            className={`flex flex-col items-center justify-center w-full px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${buttonColor}`}
            title={item.suggestedFix}
        >
            <span>{label}</span>
            {subLabel && <span className="text-[10px] opacity-75">{subLabel}</span>}
        </button>
      );
  };

  return (
    <div className="bg-white shadow-md rounded-lg border border-slate-200 flex flex-col h-full overflow-hidden">
      {/* Filters Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap gap-2 items-center">
        <span className="text-sm font-semibold text-slate-600 mr-2 uppercase tracking-wider">Filter:</span>
        {[
          { label: '⚠️ Issues Only', value: 'ISSUES' },
          { label: 'All Records', value: 'ALL' },
          { label: 'Matched', value: MatchStatus.MATCHED },
          { label: 'Mismatch', value: MatchStatus.AMOUNT_MISMATCH },
          { label: 'Missing Bank', value: MatchStatus.MISSING_IN_BANK },
          { label: 'Missing Book', value: MatchStatus.MISSING_IN_BOOK }
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors border ${
              filter === f.value 
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="ml-auto text-xs text-slate-500">
          Showing {filteredData.length} records
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Ref ID</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Bank (Statement)</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Book (GL)</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Diff</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-1/5">AI Diagnosis</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-32">Smart Fix</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {filteredData.map((item) => {
              const bankAmt = item.bankRecord?.total_amount || 0;
              const bookAmt = item.bookRecord?.amount || 0;
              const diff = Math.abs(bankAmt - bookAmt);
              const isMatch = item.status === MatchStatus.MATCHED;

              return (
                <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${!isMatch ? 'bg-red-50/10' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(item.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 font-mono">
                    {item.bankRecord?.invoice_number || item.bookRecord?.description || item.bookRecord?.document_no}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-600">
                    {item.bankRecord ? formatMoney(item.bankRecord.total_amount) : <span className="text-slate-300">N/A</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-600">
                    {item.bookRecord ? formatMoney(item.bookRecord.amount) : <span className="text-slate-300">N/A</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                    {diff > 0.01 ? (
                      <span className="text-red-600">-{formatMoney(diff)}</span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex flex-col">
                      <span className={getCauseStyle(item)}>
                         {item.reason || (isMatch ? 'Matched' : 'Unknown')}
                      </span>
                      {!isMatch && item.confidenceScore !== undefined && item.confidenceScore > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                             <div className="h-1.5 w-12 bg-slate-200 rounded-full overflow-hidden">
                                 <div 
                                    className={`h-full rounded-full ${item.confidenceScore > 80 ? 'bg-green-500' : 'bg-amber-500'}`} 
                                    style={{width: `${item.confidenceScore}%`}}
                                 ></div>
                             </div>
                             <span className="text-xs text-slate-400">{item.confidenceScore}%</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium">
                    {renderActionButton(item)}
                  </td>
                </tr>
              );
            })}
            
            {filteredData.length === 0 && (
                <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm">
                        No records found matching the current filter.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};