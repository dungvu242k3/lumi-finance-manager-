import { Lock, Search, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Branch, Transaction, TransactionType } from '../types';

interface Props {
  transactions: Transaction[];
  lockedKeys: string[];
  setLockedKeys: React.Dispatch<React.SetStateAction<string[]>>;
}

export const Ledger: React.FC<Props> = ({ transactions, lockedKeys, setLockedKeys }) => {
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly'>('daily');

  // Filters for Daily Ledger
  const [filterBranch, setFilterBranch] = useState<Branch | 'All'>('All');
  const [filterAccount, setFilterAccount] = useState<string>('All');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [viewingTrans, setViewingTrans] = useState<Transaction | null>(null);

  // Filters for Monthly Ledger
  const [filterMonth, setFilterMonth] = useState<string>('2025-12');

  const handleToggleLock = (month: string, code: string, branch: string) => {
    const key = `${month}_${code}_${branch}`;
    if (lockedKeys.includes(key)) {
      if (window.confirm(`Bạn muốn MỞ khóa sổ cho tài khoản ${code} - ${branch} trong tháng ${month}?`)) {
        setLockedKeys(prev => prev.filter(k => k !== key));
      }
    } else {
      if (window.confirm(`Bạn muốn KHÓA sổ cho tài khoản ${code} - ${branch} trong tháng ${month}?`)) {
        setLockedKeys(prev => [...prev, key]);
      }
    }
  };

  // --- DATA COMPUTATION ---

  // 1. Daily Ledger Data
  const dailyLedgerData = useMemo(() => {
    // Sort all transactions by date ascending
    const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balance for ALL transactions first to ensure accuracy
    let runningBalance = 0;
    const withBalance = sorted.map(t => {
      if (t.type === TransactionType.REVENUE) runningBalance += t.amount;
      else runningBalance -= t.amount;
      return { ...t, runningBalance };
    });

    // Apply filters AFTER balance calculation? 
    // Requirement says: "So quy theo doi dong tien thuc te". 
    // Usually ledger filters show a slice of the full book.
    // If we filter, we should ideally show Opening Balance for that filter range. 
    // For simplicity in this UI view, we filter the displayed rows.

    return withBalance.filter(t => {
      if (filterBranch !== 'All' && t.branch !== filterBranch) return false;
      if (filterAccount !== 'All' && t.accountCode !== filterAccount) return false;
      if (dateRange.start && t.date < dateRange.start) return false;
      if (dateRange.end && t.date > dateRange.end) return false;
      return true;
    });
  }, [transactions, filterBranch, filterAccount, dateRange]);

  // 2. Monthly Summary Data
  const monthlyLedgerData = useMemo(() => {
    // Group by month
    const months: Record<string, { opening: number, rev: number, exp: number, closing: number, locked: boolean }> = {};

    // Sort transactions
    const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let currentBalance = 0;

    // We need to process month by month to carry over balance
    // Get all unique months from data + optional filter month if not present
    const distinctMonths = Array.from(new Set(sorted.map(t => t.date.substring(0, 7)))).sort();

    // ensure the selected filter month is in the list processing
    if (!distinctMonths.includes(filterMonth)) distinctMonths.push(filterMonth);
    distinctMonths.sort();

    distinctMonths.forEach(month => {
      const opening = currentBalance;
      const transInMonth = sorted.filter(t => t.date.startsWith(month));

      const rev = transInMonth.filter(t => t.type === TransactionType.REVENUE).reduce((s, t) => s + t.amount, 0);
      const exp = transInMonth.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0);

      currentBalance = opening + rev - exp;

      months[month] = {
        opening,
        rev,
        exp,
        closing: currentBalance,
        locked: false
      };
    });

    const priorTrans = sorted.filter(t => t.date < filterMonth);
    const relevantTrans = sorted.filter(t => t.date.startsWith(filterMonth));

    // Aggregate by Account Code + Branch
    const breakdown: Record<string, { code: string, branch: string, opening: number, rev: number, exp: number, isLocked: boolean }> = {};

    // 1. Initialize with historical opening balances
    priorTrans.forEach(t => {
      const key = `${t.accountCode}_${t.branch}`;
      if (!breakdown[key]) {
        breakdown[key] = { code: t.accountCode, branch: t.branch, opening: 0, rev: 0, exp: 0, isLocked: false };
      }
      if (t.type === TransactionType.REVENUE) breakdown[key].opening += t.amount;
      else breakdown[key].opening -= t.amount;
    });

    // 2. Add current month's activity
    relevantTrans.forEach(t => {
      const key = `${t.accountCode}_${t.branch}`;
      if (!breakdown[key]) {
        breakdown[key] = { code: t.accountCode, branch: t.branch, opening: 0, rev: 0, exp: 0, isLocked: false };
      }
      if (t.type === TransactionType.REVENUE) breakdown[key].rev += t.amount;
      else breakdown[key].exp += t.amount;
    });

    // 3. Mark lock status for each row
    Object.values(breakdown).forEach(item => {
      const lockKey = `${filterMonth}_${item.code}_${item.branch}`;
      item.isLocked = lockedKeys.includes(lockKey);
    });

    return {
      monthStats: months[filterMonth] || { opening: 0, rev: 0, exp: 0, closing: 0, locked: false },
      details: Object.values(breakdown).filter(item => item.opening !== 0 || item.rev !== 0 || item.exp !== 0)
    };

  }, [transactions, filterMonth, lockedKeys]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('vi-VN').format(date);
  }

  // Extract Unique Account Codes for Filter
  const uniqueAccountCodes = Array.from(new Set(transactions.map(t => t.accountCode))).sort();

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          className={`px-6 py-3 text-sm font-medium ${activeTab === 'daily' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('daily')}
        >
          Sổ quỹ theo ngày
        </button>
        <button
          className={`px-6 py-3 text-sm font-medium ${activeTab === 'monthly' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('monthly')}
        >
          Tổng hợp khóa sổ tháng
        </button>
      </div>

      {activeTab === 'daily' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-center gap-3 text-blue-800 text-sm">
            <Lock size={18} />
            <span><strong>Nguyên tắc:</strong> Dữ liệu tự động lấy từ Quản lý Thu/Chi. Sổ quỹ chỉ dùng để theo dõi dòng tiền thực tế, không nhập tay tại đây.</span>
          </div>

          <div className="flex flex-col xl:flex-row gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 font-medium">Từ ngày:</span>
              <input
                type="date"
                className="border border-slate-300 rounded px-2 py-1.5 text-sm"
                value={dateRange.start}
                onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 font-medium">Đến ngày:</span>
              <input
                type="date"
                className="border border-slate-300 rounded px-2 py-1.5 text-sm"
                value={dateRange.end}
                onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>

            <div className="flex flex-1 gap-4 xl:justify-end">
              <select
                className="border border-slate-300 rounded px-3 py-1.5 text-sm bg-white"
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value as Branch | 'All')}
              >
                <option value="All">Tất cả chi nhánh</option>
                {Object.values(Branch).map(b => <option key={b} value={b}>{b}</option>)}
              </select>

              <select
                className="border border-slate-300 rounded px-3 py-1.5 text-sm bg-white font-mono"
                value={filterAccount}
                onChange={(e) => setFilterAccount(e.target.value)}
              >
                <option value="All">Tất cả mã TK</option>
                {uniqueAccountCodes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-center">STT</th>
                    <th className="px-4 py-3 whitespace-nowrap">Ngày ghi nhận</th>
                    <th className="px-4 py-3 text-center">Loại GD</th>
                    <th className="px-4 py-3">Nguồn phát sinh</th>
                    <th className="px-4 py-3">Chi nhánh</th>
                    <th className="px-4 py-3">Thị trường</th>
                    <th className="px-4 py-3">Mã TK</th>
                    <th className="px-4 py-3">Nội dung</th>
                    <th className="px-4 py-3 text-right">Thu (VNĐ)</th>
                    <th className="px-4 py-3 text-right">Chi (VNĐ)</th>
                    <th className="px-4 py-3 text-right font-bold text-slate-800">Số dư (VNĐ)</th>
                    <th className="px-4 py-3 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dailyLedgerData.map((t, index) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-center text-slate-500">{index + 1}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">{formatDate(t.date)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${t.type === TransactionType.REVENUE ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'
                          }`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{t.source}</td>
                      <td className="px-4 py-3 text-slate-600">{t.branch}</td>
                      <td className="px-4 py-3 text-slate-600">{t.market}</td>
                      <td className="px-4 py-3 font-mono text-blue-600 font-medium">{t.accountCode}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{t.description}</td>
                      <td className="px-4 py-3 text-right text-green-600 font-medium">
                        {t.type === TransactionType.REVENUE ? formatCurrency(t.amount) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-red-600 font-medium">
                        {t.type === TransactionType.EXPENSE ? formatCurrency(t.amount) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 bg-slate-50/50 border-l border-slate-100">
                        {formatCurrency(t.runningBalance)}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-400">
                        <button onClick={() => setViewingTrans(t)} className="hover:text-blue-600" title="Xem chi tiết"><Search size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {dailyLedgerData.length === 0 && <div className="p-8 text-center text-slate-500">Không có dữ liệu hiển thị.</div>}
          </div>
        </div>
      )}

      {activeTab === 'monthly' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-700">Chọn Tháng:</span>
              <input
                type="month"
                className="border border-slate-300 rounded px-3 py-1.5 text-sm"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
              />
            </div>
            <div className="flex gap-4 text-sm">
              <div className="bg-slate-100 px-3 py-1 rounded text-slate-600">Đầu kỳ: <strong>{formatCurrency(monthlyLedgerData.monthStats.opening)}</strong></div>
              <div className="bg-green-100 px-3 py-1 rounded text-green-700">Tổng Thu: <strong>{formatCurrency(monthlyLedgerData.monthStats.rev)}</strong></div>
              <div className="bg-red-100 px-3 py-1 rounded text-red-700">Tổng Chi: <strong>{formatCurrency(monthlyLedgerData.monthStats.exp)}</strong></div>
              <div className="bg-blue-100 px-3 py-1 rounded text-blue-800">Cuối kỳ: <strong>{formatCurrency(monthlyLedgerData.monthStats.closing)}</strong></div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 w-12 text-center">STT</th>
                    <th className="px-4 py-3">Mã tài khoản</th>
                    <th className="px-4 py-3">Chi nhánh</th>
                    <th className="px-4 py-3 text-right">Số dư đầu kỳ</th>
                    <th className="px-4 py-3 text-right">Tổng Thu</th>
                    <th className="px-4 py-3 text-right">Tổng Chi</th>
                    <th className="px-4 py-3 text-right font-bold">Số dư cuối kỳ</th>
                    <th className="px-4 py-3 text-center">Trạng thái</th>
                    <th className="px-4 py-3 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyLedgerData.details.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-center text-slate-500">{index + 1}</td>
                      <td className="px-4 py-3 font-mono text-blue-600 font-medium">{item.code}</td>
                      <td className="px-4 py-3 text-slate-700">{item.branch}</td>
                      <td className="px-4 py-3 text-right text-slate-600 font-medium">{formatCurrency(item.opening)}</td>
                      <td className="px-4 py-3 text-right text-green-600">{formatCurrency(item.rev)}</td>
                      <td className="px-4 py-3 text-right text-red-600">{formatCurrency(item.exp)}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-800">{formatCurrency(item.opening + item.rev - item.exp)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.isLocked ? 'bg-slate-100 text-slate-600' : 'bg-green-100 text-green-600'}`}>
                          {item.isLocked ? 'Đã khóa' : 'Đang mở'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.isLocked ?
                          <button onClick={() => handleToggleLock(filterMonth, item.code, item.branch)} title="Mở khóa" className="text-slate-400 hover:text-blue-600 transition-colors"><Lock size={16} className="mx-auto" /></button> :
                          <button onClick={() => handleToggleLock(filterMonth, item.code, item.branch)} className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors">Khóa sổ</button>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {monthlyLedgerData.details.length === 0 && <div className="p-8 text-center text-slate-500">Tháng này chưa có phát sinh dữ liệu.</div>}
          </div>
        </div>
      )}
      {/* Detail Modal */}
      {viewingTrans && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className={`px-6 py-4 border-b flex justify-between items-center text-white ${viewingTrans.type === TransactionType.REVENUE ? 'bg-green-600 border-green-700' : 'bg-red-600 border-red-700'}`}>
              <h3 className="font-bold text-lg">Chi tiết Giao dịch</h3>
              <button onClick={() => setViewingTrans(null)} className="text-white/80 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Ngày ghi nhận</label>
                  <div className="font-medium text-slate-900">{formatDate(viewingTrans.date)}</div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Loại giao dịch</label>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${viewingTrans.type === TransactionType.REVENUE ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
                    {viewingTrans.type}
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Chi nhánh</label>
                  <div className="font-medium text-slate-900">{viewingTrans.branch}</div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Thị trường</label>
                  <div className="font-medium text-slate-900">{viewingTrans.market}</div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Mã Tài Khoản</label>
                    <div className="font-mono font-bold text-blue-600">{viewingTrans.accountCode}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Số tiền</label>
                    <div className={`font-bold text-lg ${viewingTrans.type === TransactionType.REVENUE ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(viewingTrans.amount)}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Nội dung</label>
                  <div className="font-medium text-slate-900">{viewingTrans.description}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Nguồn phát sinh</label>
                  <div className="font-medium text-slate-900">{viewingTrans.source}</div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Hình thức</label>
                  <div className="font-medium text-slate-900">{viewingTrans.method || '-'}</div>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end">
              <button onClick={() => setViewingTrans(null)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};