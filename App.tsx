
import React, { useState } from 'react';
import { parseCSV } from './utils/csvParser';
import { reconcileData } from './services/reconciliation';
import { StatsCard } from './components/StatsCard';
import { ReconciliationTable } from './components/ReconciliationTable';
import { AnalysisCharts } from './components/AnalysisCharts';
import { BankRecord, BookRecord, ReconciliationItem, Stats } from './types';
import { BANK_CSV_RAW, BOOK_CSV_RAW } from './constants';

const App: React.FC = () => {
  const [items, setItems] = useState<ReconciliationItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [view, setView] = useState<'upload' | 'dashboard'>('upload');
  
  // File inputs
  const [bankFileContent, setBankFileContent] = useState<string | null>(null);
  const [bookFileContent, setBookFileContent] = useState<string | null>(null);
  const [bankFileName, setBankFileName] = useState<string>('');
  const [bookFileName, setBookFileName] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'bank' | 'book') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (type === 'bank') {
        setBankFileContent(text);
        setBankFileName(file.name);
      } else {
        setBookFileContent(text);
        setBookFileName(file.name);
      }
    };
    reader.readAsText(file);
  };

  const processReconciliation = (bankRaw: string, bookRaw: string) => {
    setIsProcessing(true);
    setView('dashboard');

    // Simulate AI processing delay
    setTimeout(() => {
        try {
            const bankData = parseCSV<BankRecord>(bankRaw);
            const bookData = parseCSV<BookRecord>(bookRaw);

            const { results, stats } = reconcileData(bankData, bookData);
            setItems(results);
            setStats(stats);
        } catch (error) {
            console.error("Error processing data", error);
            alert("Error parsing CSV files. Please check the format.");
            setView('upload');
        } finally {
            setIsProcessing(false);
        }
    }, 1500);
  };

  const handleStartAnalysis = () => {
    if (bankFileContent && bookFileContent) {
        processReconciliation(bankFileContent, bookFileContent);
    }
  };

  const handleUseDemoData = () => {
    processReconciliation(BANK_CSV_RAW, BOOK_CSV_RAW);
  };

  const handleReset = () => {
    setView('upload');
    setItems([]);
    setStats(null);
    setBankFileContent(null);
    setBookFileContent(null);
    setBankFileName('');
    setBookFileName('');
  };

  const handleApplyFix = (item: ReconciliationItem) => {
    const confirmMsg = `AI Suggested Fix:\n${item.suggestedFix}\n\nCause: ${item.reason}\nConfidence: ${item.confidenceScore}%\n\nApply this fix?`;
    if (confirm(confirmMsg)) {
        // Optimistically update
        setItems(prev => prev.map(i => {
            if (i.id === item.id) {
                return { ...i, status: 'MATCHED' as any, reason: 'Manual Fix Applied' };
            }
            return i;
        }));
        // Simple stats update
        if (stats) {
            setStats({
                ...stats,
                matched: stats.matched + 1,
                mismatched: Math.max(0, stats.mismatched - 1),
                accuracy: ((stats.matched + 1) / stats.total) * 100
            });
        }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12 font-sans text-slate-900">
      {/* Header */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3 cursor-pointer" onClick={handleReset}>
              <div className="bg-indigo-600 p-2 rounded-lg shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <span className="text-xl font-bold text-slate-800 tracking-tight block leading-none">SmartReconcile</span>
                <span className="text-xs text-indigo-600 font-semibold tracking-wider uppercase">AI Financial Audit</span>
              </div>
            </div>
            
            {view === 'dashboard' && (
                <div className="flex items-center">
                    <button 
                        onClick={handleReset}
                        className="text-sm font-medium text-slate-500 hover:text-indigo-600 px-3 py-2 rounded-md hover:bg-slate-50 transition-colors"
                    >
                        New Analysis
                    </button>
                    <div className="h-6 w-px bg-slate-200 mx-3"></div>
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-xs text-slate-500 font-medium">System Active</span>
                    </div>
                </div>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {view === 'upload' && (
            <div className="max-w-3xl mx-auto mt-12 animate-fade-in">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-slate-900 mb-3">Financial Data Reconciliation</h1>
                    <p className="text-lg text-slate-500 max-w-xl mx-auto">
                        Upload your Bank Statement and Book Record (GL) to detect anomalies using our AI engine.
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                    <div className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            {/* Bank Upload */}
                            <div className="flex flex-col gap-3">
                                <label className="text-sm font-bold text-slate-700 uppercase tracking-wide">1. Bank Statement (CSV)</label>
                                <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${bankFileContent ? 'border-green-400 bg-green-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'}`}>
                                    {bankFileContent ? (
                                        <div className="flex flex-col items-center text-green-700">
                                            <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                            <span className="font-semibold truncate w-full px-2">{bankFileName}</span>
                                            <span className="text-xs mt-1">Ready for analysis</span>
                                        </div>
                                    ) : (
                                        <>
                                            <svg className="mx-auto h-10 w-10 text-slate-400 mb-2" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            <p className="text-sm text-slate-500 mb-2">Drag and drop or</p>
                                            <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-indigo-700 bg-indigo-100 hover:bg-indigo-200">
                                                Browse File
                                                <input type="file" accept=".csv" className="hidden" onChange={(e) => handleFileChange(e, 'bank')} />
                                            </label>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Book Upload */}
                            <div className="flex flex-col gap-3">
                                <label className="text-sm font-bold text-slate-700 uppercase tracking-wide">2. Book / GL Record (CSV)</label>
                                <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${bookFileContent ? 'border-green-400 bg-green-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'}`}>
                                    {bookFileContent ? (
                                        <div className="flex flex-col items-center text-green-700">
                                            <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                            <span className="font-semibold truncate w-full px-2">{bookFileName}</span>
                                            <span className="text-xs mt-1">Ready for analysis</span>
                                        </div>
                                    ) : (
                                        <>
                                            <svg className="mx-auto h-10 w-10 text-slate-400 mb-2" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            <p className="text-sm text-slate-500 mb-2">Drag and drop or</p>
                                            <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-indigo-700 bg-indigo-100 hover:bg-indigo-200">
                                                Browse File
                                                <input type="file" accept=".csv" className="hidden" onChange={(e) => handleFileChange(e, 'book')} />
                                            </label>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <button 
                                onClick={handleStartAnalysis}
                                disabled={!bankFileContent || !bookFileContent}
                                className={`w-full sm:w-auto px-8 py-4 rounded-xl text-white font-bold text-lg shadow-lg transition-all transform hover:-translate-y-1 ${
                                    bankFileContent && bookFileContent 
                                    ? 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-500/30' 
                                    : 'bg-slate-300 cursor-not-allowed'
                                }`}
                            >
                                Start AI Reconciliation
                            </button>
                            
                            <span className="text-slate-400 font-medium">or</span>

                            <button 
                                onClick={handleUseDemoData}
                                className="w-full sm:w-auto px-6 py-4 rounded-xl text-slate-700 font-semibold bg-white border-2 border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 transition-all"
                            >
                                Load Demo Data
                            </button>
                        </div>
                    </div>
                    <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 text-center">
                        <p className="text-xs text-slate-500">Supported formats: CSV (Standard Bank Format, GL Dump)</p>
                    </div>
                </div>
            </div>
        )}

        {view === 'dashboard' && (
            <div className="animate-fade-in-up">
                {isProcessing ? (
                    <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl shadow-sm border border-slate-100">
                        <div className="relative mb-6">
                             <div className="absolute inset-0 bg-indigo-200 rounded-full animate-ping opacity-25"></div>
                             <div className="relative bg-white p-4 rounded-full border-4 border-indigo-100">
                                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
                             </div>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Analyzing Financial Data</h2>
                        <p className="text-slate-500 text-lg">Running discrepancy detection algorithms...</p>
                        <div className="mt-8 flex gap-2">
                             <span className="h-2 w-2 bg-indigo-600 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                             <span className="h-2 w-2 bg-indigo-600 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                             <span className="h-2 w-2 bg-indigo-600 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="mb-8 flex items-end justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">Reconciliation Dashboard</h1>
                                <p className="text-slate-500 mt-1">Overview of matches and detected anomalies.</p>
                            </div>
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-medium text-slate-500">Processed Records</p>
                                <p className="text-2xl font-bold text-slate-800">{stats?.total.toLocaleString()}</p>
                            </div>
                        </div>

                        {/* NEW: Visual Analysis Section */}
                        <AnalysisCharts data={items} />

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <StatsCard 
                            title="Matching Accuracy" 
                            value={`${stats?.accuracy.toFixed(1)}%`} 
                            colorClass="bg-indigo-500"
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                        />
                        <StatsCard 
                            title="Matched Records" 
                            value={stats?.matched || 0} 
                            colorClass="bg-emerald-500"
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                        />
                        <StatsCard 
                            title="Discrepancies" 
                            value={stats?.mismatched || 0} 
                            colorClass="bg-red-500"
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
                        />
                        <StatsCard 
                            title="Missing Book Entries" 
                            value={stats?.missingInBook || 0} 
                            colorClass="bg-blue-500"
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
                        />
                        </div>

                        {/* Main Table */}
                        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                            <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800">Reconciliation Data</h2>
                                    <p className="text-sm text-slate-500">AI-generated matches and anomaly detection.</p>
                                </div>
                                <div className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded border border-indigo-100 font-medium">
                                    AI Mode: Active
                                </div>
                            </div>
                            <ReconciliationTable data={items} onFix={handleApplyFix} />
                        </div>
                    </>
                )}
            </div>
        )}
      </main>
    </div>
  );
};

export default App;
