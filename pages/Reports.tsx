import { Download } from 'lucide-react';
import React, { useState } from 'react';
import { Branch, Market, Transaction, TransactionType } from '../types';

interface Props {
  transactions: Transaction[];
}

export const Reports: React.FC<Props> = ({ transactions }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'business_result'>('general');
  const [reportMonth, setReportMonth] = useState('2025-12');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
  };

  // --- GENERAL REPORT DATA ---

  // Filter transactions by selected month
  const monthlyTrans = transactions.filter(t => t.date.startsWith(reportMonth));

  // Table 1: Branch Report
  const branchReport = Object.values(Branch).map((branch: Branch) => {
    const rev = monthlyTrans.filter(t => t.type === TransactionType.REVENUE && t.branch === branch).reduce((sum, t) => sum + t.amount, 0);
    const exp = monthlyTrans.filter(t => t.type === TransactionType.EXPENSE && t.branch === branch).reduce((sum, t) => sum + t.amount, 0);
    return { name: branch, rev, exp, profit: rev - exp, margin: rev ? ((rev - exp) / rev * 100) : 0 };
  }).filter(d => d.rev > 0 || d.exp > 0);

  const totalBranch = branchReport.reduce((acc, curr) => ({ rev: acc.rev + curr.rev, exp: acc.exp + curr.exp, profit: acc.profit + curr.profit }), { rev: 0, exp: 0, profit: 0 });
  const totalBranchMargin = totalBranch.rev ? (totalBranch.profit / totalBranch.rev * 100) : 0;

  // Table 2: Market Report
  const marketReport = Object.values(Market).filter(m => m !== Market.NONE).map((market: Market) => {
    const rev = monthlyTrans.filter(t => t.type === TransactionType.REVENUE && t.market === market).reduce((sum, t) => sum + t.amount, 0);
    const exp = monthlyTrans.filter(t => t.type === TransactionType.EXPENSE && t.market === market).reduce((sum, t) => sum + t.amount, 0);
    return { name: market, rev, exp, profit: rev - exp, margin: rev ? ((rev - exp) / rev * 100) : 0, note: '' };
  }).map(item => {
    let note = '';
    if (item.margin > 20) note = 'Hiệu quả cao';
    else if (item.margin < 0) note = 'Cần tối ưu hoặc bỏ';
    else if (item.rev > 0) note = 'Bình thường';

    return { ...item, note };
  }).filter(d => d.rev > 0 || d.exp > 0);

  const totalMarket = marketReport.reduce((acc, curr) => ({ rev: acc.rev + curr.rev, exp: acc.exp + curr.exp, profit: acc.profit + curr.profit }), { rev: 0, exp: 0, profit: 0 });
  const totalMarketMargin = totalMarket.rev ? (totalMarket.profit / totalMarket.rev * 100) : 0;

  // Table 3: Cash Flow (Simplified for View)
  const cashFlowReport = [
    { month: 'Tháng 10', opening: 120000000, rev: 450000000, exp: 410000000, closing: 160000000, status: 'Đã khóa' },
    { month: 'Tháng 11', opening: 160000000, rev: 520000000, exp: 495000000, closing: 185000000, status: 'Đã khóa' },
    { month: 'Tháng 12', opening: 185000000, rev: 690000000, exp: 638000000, closing: 237000000, status: 'Đang mở' },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          className={`px-6 py-3 text-sm font-medium ${activeTab === 'general' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('general')}
        >
          Báo cáo Tổng hợp
        </button>
        <button
          className={`px-6 py-3 text-sm font-medium ${activeTab === 'business_result' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('business_result')}
        >
          Kết quả Kinh doanh (P&L)
        </button>
      </div>

      <div className="flex justify-end">
        <button className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 border border-slate-300 px-3 py-1.5 rounded bg-white">
          <Download size={16} /> Xuất Excel / PDF
        </button>
      </div>

      {activeTab === 'general' && (
        <div className="space-y-8 animate-in fade-in">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex items-center gap-4">
            <span className="text-sm font-semibold text-slate-700">Kỳ báo cáo:</span>
            <input
              type="month"
              className="border border-slate-300 rounded px-3 py-1.5 text-sm"
              value={reportMonth}
              onChange={(e) => setReportMonth(e.target.value)}
            />
          </div>

          {/* Table 1 */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between">
              <h3 className="font-semibold text-slate-800">1. Báo cáo Thu - Chi theo Chi nhánh</h3>
            </div>
            <table className="w-full text-sm text-left">
              <thead className="bg-white text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 w-12 text-center">STT</th>
                  <th className="px-6 py-3">Chi nhánh</th>
                  <th className="px-6 py-3 text-right">Tổng Thu (VNĐ)</th>
                  <th className="px-6 py-3 text-right">Tổng Chi (VNĐ)</th>
                  <th className="px-6 py-3 text-right">Lãi / Lỗ (VNĐ)</th>
                  <th className="px-6 py-3 text-right">Tỷ suất lãi/DT (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {branchReport.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-center text-slate-500">{index + 1}</td>
                    <td className="px-6 py-3 font-medium text-slate-800">{item.name}</td>
                    <td className="px-6 py-3 text-right text-slate-600">{formatCurrency(item.rev)}</td>
                    <td className="px-6 py-3 text-right text-slate-600">{formatCurrency(item.exp)}</td>
                    <td className={`px-6 py-3 text-right font-medium ${item.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(item.profit)}</td>
                    <td className="px-6 py-3 text-right text-slate-700">{item.margin.toFixed(2)}%</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-bold">
                  <td colSpan={2} className="px-6 py-3 text-center">Tổng</td>
                  <td className="px-6 py-3 text-right text-blue-700">{formatCurrency(totalBranch.rev)}</td>
                  <td className="px-6 py-3 text-right text-red-700">{formatCurrency(totalBranch.exp)}</td>
                  <td className={`px-6 py-3 text-right ${totalBranch.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(totalBranch.profit)}</td>
                  <td className="px-6 py-3 text-right">{totalBranchMargin.toFixed(2)}%</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Table 2 */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-semibold text-slate-800">2. Báo cáo Thu - Chi theo Thị trường</h3>
            </div>
            <table className="w-full text-sm text-left">
              <thead className="bg-white text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 w-12 text-center">STT</th>
                  <th className="px-6 py-3">Thị trường</th>
                  <th className="px-6 py-3 text-right">Tổng Thu (VNĐ)</th>
                  <th className="px-6 py-3 text-right">Tổng Chi (VNĐ)</th>
                  <th className="px-6 py-3 text-right">Lãi / Lỗ (VNĐ)</th>
                  <th className="px-6 py-3 text-right">Tỷ suất Lãi/DT</th>
                  <th className="px-6 py-3">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {marketReport.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-center text-slate-500">{index + 1}</td>
                    <td className="px-6 py-3 font-medium text-slate-800">{item.name}</td>
                    <td className="px-6 py-3 text-right text-slate-600">{formatCurrency(item.rev)}</td>
                    <td className="px-6 py-3 text-right text-slate-600">{formatCurrency(item.exp)}</td>
                    <td className={`px-6 py-3 text-right font-medium ${item.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(item.profit)}</td>
                    <td className="px-6 py-3 text-right text-slate-700">{item.margin.toFixed(2)}%</td>
                    <td className={`px-6 py-3 text-xs font-medium ${item.margin < 0 ? 'text-red-500' : 'text-green-600'}`}>{item.note}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-bold">
                  <td colSpan={2} className="px-6 py-3 text-center">Tổng</td>
                  <td className="px-6 py-3 text-right text-blue-700">{formatCurrency(totalMarket.rev)}</td>
                  <td className="px-6 py-3 text-right text-red-700">{formatCurrency(totalMarket.exp)}</td>
                  <td className={`px-6 py-3 text-right ${totalMarket.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(totalMarket.profit)}</td>
                  <td className="px-6 py-3 text-right">{totalMarketMargin.toFixed(2)}%</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Table 3 */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-semibold text-slate-800">3. Báo cáo Dòng tiền theo Tháng</h3>
            </div>
            <table className="w-full text-sm text-left">
              <thead className="bg-white text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Tháng</th>
                  <th className="px-6 py-3 text-right">Số dư đầu kỳ</th>
                  <th className="px-6 py-3 text-right">Tổng Thu</th>
                  <th className="px-6 py-3 text-right">Tổng Chi</th>
                  <th className="px-6 py-3 text-right font-bold">Số dư cuối kỳ</th>
                  <th className="px-6 py-3 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cashFlowReport.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-800">{row.month}</td>
                    <td className="px-6 py-3 text-right text-slate-500 italic">{formatCurrency(row.opening)}</td>
                    <td className="px-6 py-3 text-right text-green-600">{formatCurrency(row.rev)}</td>
                    <td className="px-6 py-3 text-right text-red-600">{formatCurrency(row.exp)}</td>
                    <td className="px-6 py-3 text-right font-bold text-slate-900 bg-slate-50/50">{formatCurrency(row.closing)}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${row.status === 'Đã khóa' ? 'bg-slate-100 text-slate-600' : 'bg-green-100 text-green-600'}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'business_result' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg text-sm text-blue-800">
            <strong>Lưu ý:</strong> Báo cáo Kết quả kinh doanh chi tiết theo Sản phẩm được tổng hợp tự động từ file F3 và số liệu nhập tay từ sổ sách.
          </div>

          <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600">Tháng:</span>
              <input type="month" className="border border-slate-300 rounded px-2 py-1.5 text-sm" defaultValue="2025-12" />
            </div>
            <div className="flex gap-4">
              <select className="border border-slate-300 rounded px-3 py-1.5 text-sm bg-white"><option>Tất cả sản phẩm</option></select>
              <select className="border border-slate-300 rounded px-3 py-1.5 text-sm bg-white"><option>Tất cả thị trường</option></select>
              <select className="border border-slate-300 rounded px-3 py-1.5 text-sm bg-white"><option>Tất cả chi nhánh</option></select>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[1000px]">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-center w-10">STT</th>
                  <th className="px-4 py-3">Tháng</th>
                  <th className="px-4 py-3">Sản phẩm</th>
                  <th className="px-4 py-3">Thị trường</th>
                  <th className="px-4 py-3">Chi nhánh</th>
                  <th className="px-4 py-3 text-right">Sản lượng</th>
                  <th className="px-4 py-3 text-right">Doanh thu</th>
                  <th className="px-4 py-3 text-right">Tỷ trọng DT</th>
                  <th className="px-4 py-3 text-right">Giá vốn<br /><span className="text-[10px] normal-case text-slate-500">(Hàng+FFM+Thuê+Bay)</span></th>
                  <th className="px-4 py-3 text-right">Chi phí chung<br /><span className="text-[10px] normal-case text-slate-500">(Ads+Lương+Thuế...)</span></th>
                  <th className="px-4 py-3 text-right font-bold">Lãi / Lỗ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Mock Data for Table 4 */}
                {[
                  { id: 1, p: 'Product A', m: 'US', b: 'Hà Nội', q: 1500, rev: 350000000, rate: '45%', cogs: 180000000, opex: 90000000, profit: 80000000 },
                  { id: 2, p: 'Product B', m: 'CAN', b: 'Hà Nội', q: 800, rev: 150000000, rate: '20%', cogs: 90000000, opex: 45000000, profit: 15000000 },
                  { id: 3, p: 'Product A', m: 'US', b: 'HCM', q: 1200, rev: 280000000, rate: '35%', cogs: 150000000, opex: 75000000, profit: 55000000 },
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-center text-slate-500">{row.id}</td>
                    <td className="px-4 py-3 text-slate-600">12/2025</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{row.p}</td>
                    <td className="px-4 py-3 text-slate-600">{row.m}</td>
                    <td className="px-4 py-3 text-slate-600">{row.b}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{row.q.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-blue-600">{formatCurrency(row.rev)}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{row.rate}</td>
                    <td className="px-4 py-3 text-right text-red-600">{formatCurrency(row.cogs)}</td>
                    <td className="px-4 py-3 text-right text-orange-600">{formatCurrency(row.opex)}</td>
                    <td className={`px-4 py-3 text-right font-bold ${row.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(row.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};