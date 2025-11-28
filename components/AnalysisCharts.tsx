import React from 'react';
import { ReconciliationItem, MatchStatus } from '../types';

interface Props {
  data: ReconciliationItem[];
}

export const AnalysisCharts: React.FC<Props> = ({ data }) => {
  if (data.length === 0) return null;

  // 1. Calculate Status Distribution
  const total = data.length;
  const matched = data.filter(i => i.status === MatchStatus.MATCHED).length;
  const matchPercentage = Math.round((matched / total) * 100);
  const issues = total - matched;

  // 2. Calculate Root Causes (Issues only)
  const causeMap = data
    .filter(i => i.status !== MatchStatus.MATCHED)
    .reduce((acc, item) => {
      const reason = item.reason || 'Unknown Error';
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const sortedCauses = (Object.entries(causeMap) as [string, number][])
    .sort(([, a], [, b]) => b - a)
    .map(([reason, count]) => ({
      reason,
      count,
      percentage: Math.round((count / issues) * 100)
    }));

  // Helper for Donut Chart
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (matchPercentage / 100) * circumference;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      
      {/* Chart 1: Overall Health (Donut) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center relative overflow-hidden">
        <h3 className="text-slate-700 font-bold mb-4 w-full text-left">Overall Health</h3>
        
        <div className="relative w-48 h-48 flex items-center justify-center">
          {/* Background Circle */}
          <svg className="transform -rotate-90 w-full h-full">
            <circle
              cx="96"
              cy="96"
              r={radius}
              stroke="currentColor"
              strokeWidth="10"
              fill="transparent"
              className="text-slate-100 scale-[2.5]"
            />
            {/* Progress Circle */}
            <circle
              cx="96"
              cy="96"
              r={radius}
              stroke="currentColor"
              strokeWidth="10"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className={`scale-[2.5] transition-all duration-1000 ease-out ${
                matchPercentage > 80 ? 'text-emerald-500' : matchPercentage > 50 ? 'text-amber-500' : 'text-red-500'
              }`}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-4xl font-extrabold text-slate-800">{matchPercentage}%</span>
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wide mt-1">Matched</span>
          </div>
        </div>
        
        <div className="flex gap-4 mt-6 w-full justify-center">
             <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                 <span className="text-sm text-slate-600">Clean ({matched})</span>
             </div>
             <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                 <span className="text-sm text-slate-600">Issues ({issues})</span>
             </div>
        </div>
      </div>

      {/* Chart 2: Root Cause Analysis (Bar Chart) */}
      <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-slate-700 font-bold">Why do they mismatch? (Root Causes)</h3>
            <span className="text-xs font-medium px-2 py-1 bg-red-50 text-red-600 rounded-md border border-red-100">
                {issues} Issues Found
            </span>
        </div>

        <div className="space-y-4">
          {sortedCauses.map((item, index) => (
            <div key={item.reason} className="group">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-slate-700 flex items-center gap-2">
                    <span className="w-5 h-5 rounded flex items-center justify-center bg-slate-100 text-slate-500 text-xs font-bold">
                        {index + 1}
                    </span>
                    {item.reason}
                </span>
                <span className="text-slate-500">
                    <span className="font-bold text-slate-800">{item.count}</span> items ({item.percentage}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-1000 ease-out ${
                    item.reason.includes('VAT') ? 'bg-purple-500' :
                    item.reason.includes('Digit') ? 'bg-orange-500' :
                    item.reason.includes('Missing') ? 'bg-blue-500' :
                    'bg-slate-500'
                  }`}
                  style={{ width: `${item.percentage}%` }}
                ></div>
              </div>
              {/* Tooltip hint */}
              <p className="text-xs text-slate-400 mt-1 pl-7 opacity-0 group-hover:opacity-100 transition-opacity">
                {item.reason.includes('VAT') && "Tip: Check if tax was excluded from Book entry."}
                {item.reason.includes('Digit') && "Tip: Look for typos like 54 vs 45."}
                {item.reason.includes('Missing') && "Tip: Verify bank feed or GL posting date."}
              </p>
            </div>
          ))}
          
          {sortedCauses.length === 0 && (
             <div className="h-full flex items-center justify-center text-slate-400 italic">
                 No discrepancies found. Good job!
             </div>
          )}
        </div>
      </div>
    </div>
  );
};