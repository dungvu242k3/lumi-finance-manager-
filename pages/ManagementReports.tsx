import { Download } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Branch, Market, Transaction, TransactionType } from '../types';

interface Props {
    transactions: Transaction[];
    lockedKeys: string[];
}

export const ManagementReports: React.FC<Props> = ({ transactions, lockedKeys }) => {
    const [activeTab, setActiveTab] = useState<'monthly' | 'yearly'>('monthly');

    // Filters
    const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');
    const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
    const [selectedMarket, setSelectedMarket] = useState<string>('ALL');
    const [selectedMonth, setSelectedMonth] = useState('2025-12');

    // Table 4 specific filters
    const [selectedProductTable4, setSelectedProductTable4] = useState<string>('ALL');
    const [selectedMarketTable4, setSelectedMarketTable4] = useState<string>('ALL');
    const [selectedBranchTable4, setSelectedBranchTable4] = useState<string>('ALL');



    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
    };

    // Bảng 1: Báo cáo Thu – Chi theo Chi nhánh
    const reportByBranch = useMemo(() => {
        const branches = Object.values(Branch);

        const result = branches.map(branch => {
            const branchTrans = transactions.filter(t =>
                t.date.startsWith(selectedMonth) &&
                t.branch === branch &&
                (selectedMarket === 'ALL' || t.market === selectedMarket)
            );

            const rev = branchTrans.filter(t => t.type === TransactionType.REVENUE).reduce((s, t) => s + t.amount, 0);
            const exp = branchTrans.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0);
            const profit = rev - exp;
            const margin = rev > 0 ? (profit / rev) * 100 : 0;

            return { branch, rev, exp, profit, margin };
        }).filter(b => b.rev > 0 || b.exp > 0);

        const total = result.reduce((acc, cur) => ({
            branch: 'Tổng' as any,
            rev: acc.rev + cur.rev,
            exp: acc.exp + cur.exp,
            profit: acc.profit + cur.profit,
            margin: 0
        }), { branch: 'Tổng' as any, rev: 0, exp: 0, profit: 0, margin: 0 });

        total.margin = total.rev > 0 ? (total.profit / total.rev) * 100 : 0;

        return { data: result, total };
    }, [transactions, selectedMonth, selectedMarket]);

    // Bảng 2: Báo cáo Thu – Chi theo Thị trường
    const reportByMarket = useMemo(() => {
        const markets = Object.values(Market).filter(m => m !== Market.NONE);

        const result = markets.map(market => {
            const marketTrans = transactions.filter(t =>
                t.date.startsWith(selectedMonth) &&
                t.market === market &&
                (selectedBranch === 'ALL' || t.branch === selectedBranch)
            );

            const rev = marketTrans.filter(t => t.type === TransactionType.REVENUE).reduce((s, t) => s + t.amount, 0);
            const exp = marketTrans.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0);
            const profit = rev - exp;
            const margin = rev > 0 ? (profit / rev) * 100 : 0;

            let note = '';
            if (margin > 20) note = 'Hiệu quả cao';
            else if (margin >= 10) note = 'Tốt';
            else if (margin >= 0) note = 'Bình thường';
            else note = 'Cần tối ưu hoặc bỏ';

            return { market, rev, exp, profit, margin, note };
        }).filter(m => m.rev > 0 || m.exp > 0);

        const total = result.reduce((acc, cur) => ({
            market: 'Tổng' as any,
            rev: acc.rev + cur.rev,
            exp: acc.exp + cur.exp,
            profit: acc.profit + cur.profit,
            margin: 0,
            note: ''
        }), { market: 'Tổng' as any, rev: 0, exp: 0, profit: 0, margin: 0, note: '' });

        total.margin = total.rev > 0 ? (total.profit / total.rev) * 100 : 0;

        return { data: result, total };
    }, [transactions, selectedMonth, selectedBranch]);

    // Bảng 3: Báo cáo Dòng tiền theo Tháng
    const cashFlowReport = useMemo(() => {
        // Get last 3 months as example (can be expanded)
        const selectedDate = new Date(selectedMonth + '-01');
        const months: string[] = [];

        for (let i = 2; i >= 0; i--) {
            const date = new Date(selectedDate);
            date.setMonth(date.getMonth() - i);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            months.push(monthKey);
        }

        let runningBalance = 0;

        const result = months.map(month => {
            const monthTrans = transactions.filter(t =>
                t.date.startsWith(month) &&
                (selectedBranch === 'ALL' || t.branch === selectedBranch) &&
                (selectedMarket === 'ALL' || t.market === selectedMarket)
            );

            const rev = monthTrans.filter(t => t.type === TransactionType.REVENUE).reduce((s, t) => s + t.amount, 0);
            const exp = monthTrans.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0);

            const opening = runningBalance;
            const closing = opening + rev - exp;
            runningBalance = closing;

            // Mock lock status - would come from lockedKeys in real scenario
            const status = month < selectedMonth ? 'Đã khóa' : 'Đang mở';

            return { month, opening, rev, exp, closing, status };
        });

        return result;
    }, [transactions, selectedMonth, selectedBranch, selectedMarket]);

    // Bảng 4: Báo cáo Kết quả kinh doanh (Mock data structure)
    const businessResultsReport = useMemo(() => {
        // This would require product/SKU data which isn't in current Transaction model
        // For now, we'll aggregate by Account Code + Market + Branch as a proxy
        const monthTrans = transactions.filter(t =>
            t.date.startsWith(selectedMonth) &&
            (selectedBranchTable4 === 'ALL' || t.branch === selectedBranchTable4) &&
            (selectedMarketTable4 === 'ALL' || t.market === selectedMarketTable4)
        );

        // Group by AccountCode, Market, Branch
        const grouped: Record<string, {
            product: string;
            market: string;
            branch: string;
            quantity: number;
            revenue: number;
            revenueWeight: number;
            cogs: number;
            opex: number;
            profit: number;
        }> = {};

        monthTrans.forEach(t => {
            // Filter by selected product
            if (selectedProductTable4 !== 'ALL' && t.accountCode !== selectedProductTable4) {
                return;
            }

            const key = `${t.accountCode}_${t.market}_${t.branch}`;
            if (!grouped[key]) {
                grouped[key] = {
                    product: t.accountCode,
                    market: t.market,
                    branch: t.branch,
                    quantity: 0, // Mock - would need real SKU data
                    revenue: 0,
                    revenueWeight: 0,
                    cogs: 0, // Mock
                    opex: 0, // Mock
                    profit: 0
                };
            }

            if (t.type === TransactionType.REVENUE) {
                grouped[key].revenue += t.amount;
            } else {
                // Split expenses between COGS and OPEX (mock logic)
                grouped[key].cogs += t.amount * 0.6; // Assume 60% is COGS
                grouped[key].opex += t.amount * 0.4; // Assume 40% is OPEX
            }
        });

        // Calculate totals and percentages
        const totalRevenue = Object.values(grouped).reduce((s, g) => s + g.revenue, 0);

        const result = Object.values(grouped).map(g => {
            g.profit = g.revenue - g.cogs - g.opex;
            g.revenueWeight = totalRevenue > 0 ? (g.revenue / totalRevenue) * 100 : 0;
            g.quantity = Math.floor(g.revenue / 250000);
            return g;
        }).filter(g => g.revenue > 0);

        return result;
    }, [transactions, selectedMonth, selectedBranchTable4, selectedMarketTable4, selectedProductTable4]);

    // Get unique products (account codes) for dropdown
    const uniqueProducts = useMemo(() => {
        const products = new Set<string>();
        transactions.forEach(t => {
            if (t.accountCode) products.add(t.accountCode);
        });
        return Array.from(products).sort();
    }, [transactions]);

    return (
        <div className="space-y-6">
            {/* Header & Filters */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Báo cáo tài chính quản trị</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        <strong className="text-red-600">Chỉ xem</strong> - Dữ liệu tự động từ Thu/Chi & Sổ quỹ
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase">Kỳ:</span>
                        <select
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value as any)}
                            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="month">Tháng</option>
                            <option value="quarter">Quý</option>
                            <option value="year">Năm</option>
                        </select>
                    </div>

                    {selectedPeriod === 'month' && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 uppercase">Tháng:</span>
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase">Chi nhánh:</span>
                        <select
                            value={selectedBranch}
                            onChange={(e) => setSelectedBranch(e.target.value)}
                            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="ALL">Tất cả</option>
                            {Object.values(Branch).map(b => (
                                <option key={b} value={b}>{b}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase">Thị trường:</span>
                        <select
                            value={selectedMarket}
                            onChange={(e) => setSelectedMarket(e.target.value)}
                            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="ALL">Tất cả</option>
                            {Object.values(Market).filter(m => m !== Market.NONE).map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-white px-6 rounded-t-xl border-x border-t">
                <button
                    className={`px-6 py-4 text-sm font-semibold transition-all ${activeTab === 'monthly'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                    onClick={() => setActiveTab('monthly')}
                >
                    Báo cáo tháng
                </button>
                <button
                    className={`px-6 py-4 text-sm font-semibold transition-all ${activeTab === 'yearly'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                    onClick={() => setActiveTab('yearly')}
                >
                    Báo cáo tài chính năm
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'monthly' && (
                <div className="space-y-6 bg-white p-6 rounded-b-xl border-x border-b shadow-sm">
                    {/* Bảng 1: Báo cáo Thu – Chi theo Chi nhánh */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-700">Bảng 1: Báo cáo Thu – Chi theo Chi nhánh</h3>
                            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
                                <Download size={14} /> Xuất Excel
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                                <thead className="bg-blue-50">
                                    <tr>
                                        <th className="px-4 py-3 text-center font-bold text-slate-700 border border-slate-300">STT</th>
                                        <th className="px-4 py-3 text-left font-bold text-slate-700 border border-slate-300">Chi nhánh</th>
                                        <th className="px-4 py-3 text-right font-bold text-slate-700 border border-slate-300">Tổng Thu (VNĐ)</th>
                                        <th className="px-4 py-3 text-right font-bold text-slate-700 border border-slate-300">Tổng Chi (VNĐ)</th>
                                        <th className="px-4 py-3 text-right font-bold text-slate-700 border border-slate-300">Lãi / Lỗ (VNĐ)</th>
                                        <th className="px-4 py-3 text-right font-bold text-slate-700 border border-slate-300">Tỷ suất lãi/DT (%)</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white">
                                    {reportByBranch.data.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 text-center border border-slate-200">{idx + 1}</td>
                                            <td className="px-4 py-3 font-medium text-slate-700 border border-slate-200">{item.branch}</td>
                                            <td className="px-4 py-3 text-right text-green-600 border border-slate-200">{formatCurrency(item.rev)}</td>
                                            <td className="px-4 py-3 text-right text-red-600 border border-slate-200">{formatCurrency(item.exp)}</td>
                                            <td className={`px-4 py-3 text-right font-bold border border-slate-200 ${item.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {formatCurrency(item.profit)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-700 border border-slate-200">{item.margin.toFixed(2)}%</td>
                                        </tr>
                                    ))}
                                    <tr className="bg-blue-100 font-bold">
                                        <td colSpan={2} className="px-4 py-3 text-center border border-slate-300">Tổng</td>
                                        <td className="px-4 py-3 text-right text-green-700 border border-slate-300">{formatCurrency(reportByBranch.total.rev)}</td>
                                        <td className="px-4 py-3 text-right text-red-700 border border-slate-300">{formatCurrency(reportByBranch.total.exp)}</td>
                                        <td className={`px-4 py-3 text-right border border-slate-300 ${reportByBranch.total.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                            {formatCurrency(reportByBranch.total.profit)}
                                        </td>
                                        <td className="px-4 py-3 text-right border border-slate-300">{reportByBranch.total.margin.toFixed(2)}%</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Bảng 2: Báo cáo Thu – Chi theo Thị trường */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-700">Bảng 2: Báo cáo Thu – Chi theo Thị trường</h3>
                            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
                                <Download size={14} /> Xuất Excel
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                                <thead className="bg-purple-50">
                                    <tr>
                                        <th className="px-4 py-3 text-center font-bold text-slate-700 border border-slate-300">STT</th>
                                        <th className="px-4 py-3 text-left font-bold text-slate-700 border border-slate-300">Thị trường</th>
                                        <th className="px-4 py-3 text-right font-bold text-slate-700 border border-slate-300">Tổng Thu (VNĐ)</th>
                                        <th className="px-4 py-3 text-right font-bold text-slate-700 border border-slate-300">Tổng Chi (VNĐ)</th>
                                        <th className="px-4 py-3 text-right font-bold text-slate-700 border border-slate-300">Lãi / Lỗ (VNĐ)</th>
                                        <th className="px-4 py-3 text-right font-bold text-slate-700 border border-slate-300">Tỷ suất Lãi/DT (%)</th>
                                        <th className="px-4 py-3 text-left font-bold text-slate-700 border border-slate-300">Ghi chú</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white">
                                    {reportByMarket.data.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 text-center border border-slate-200">{idx + 1}</td>
                                            <td className="px-4 py-3 font-medium text-slate-700 border border-slate-200">{item.market}</td>
                                            <td className="px-4 py-3 text-right text-green-600 border border-slate-200">{formatCurrency(item.rev)}</td>
                                            <td className="px-4 py-3 text-right text-red-600 border border-slate-200">{formatCurrency(item.exp)}</td>
                                            <td className={`px-4 py-3 text-right font-bold border border-slate-200 ${item.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {formatCurrency(item.profit)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-700 border border-slate-200">{item.margin.toFixed(2)}%</td>
                                            <td className="px-4 py-3 text-xs text-slate-500 italic border border-slate-200">{item.note}</td>
                                        </tr>
                                    ))}
                                    <tr className="bg-purple-100 font-bold">
                                        <td colSpan={2} className="px-4 py-3 text-center border border-slate-300">Tổng</td>
                                        <td className="px-4 py-3 text-right text-green-700 border border-slate-300">{formatCurrency(reportByMarket.total.rev)}</td>
                                        <td className="px-4 py-3 text-right text-red-700 border border-slate-300">{formatCurrency(reportByMarket.total.exp)}</td>
                                        <td className={`px-4 py-3 text-right border border-slate-300 ${reportByMarket.total.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                            {formatCurrency(reportByMarket.total.profit)}
                                        </td>
                                        <td className="px-4 py-3 text-right border border-slate-300">{reportByMarket.total.margin.toFixed(2)}%</td>
                                        <td className="px-4 py-3 border border-slate-300"></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Bảng 3: Báo cáo Dòng tiền theo Tháng */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-700">Bảng 3: Báo cáo Dòng tiền theo Tháng</h3>
                            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
                                <Download size={14} /> Xuất Excel
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                                <thead className="bg-green-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-bold text-slate-700 border border-slate-300">Tháng</th>
                                        <th className="px-4 py-3 text-right font-bold text-slate-700 border border-slate-300">Số dư đầu kỳ</th>
                                        <th className="px-4 py-3 text-right font-bold text-slate-700 border border-slate-300">Tổng Thu</th>
                                        <th className="px-4 py-3 text-right font-bold text-slate-700 border border-slate-300">Tổng Chi</th>
                                        <th className="px-4 py-3 text-right font-bold text-slate-700 border border-slate-300">Số dư cuối kỳ</th>
                                        <th className="px-4 py-3 text-center font-bold text-slate-700 border border-slate-300">Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white">
                                    {cashFlowReport.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 font-medium text-slate-700 border border-slate-200">{row.month}</td>
                                            <td className="px-4 py-3 text-right text-slate-500 italic border border-slate-200">{formatCurrency(row.opening)}</td>
                                            <td className="px-4 py-3 text-right text-green-600 border border-slate-200">{formatCurrency(row.rev)}</td>
                                            <td className="px-4 py-3 text-right text-red-600 border border-slate-200">{formatCurrency(row.exp)}</td>
                                            <td className="px-4 py-3 text-right font-bold text-slate-900 bg-slate-50/50 border border-slate-200">{formatCurrency(row.closing)}</td>
                                            <td className="px-4 py-3 text-center border border-slate-200">
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

                    {/* Bảng 4: Báo cáo Kết quả kinh doanh */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <div className="flex flex-col gap-3 mb-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-slate-700">Bảng 4: Báo cáo Kết quả kinh doanh theo sản phẩm, thị trường, chi nhánh</h3>
                                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
                                    <Download size={14} /> Xuất Excel
                                </button>
                            </div>

                            {/* Filter controls for Table 4 */}
                            <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border border-slate-200">

                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-slate-600">Tháng:</span>
                                    <input
                                        type="month"
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(e.target.value)}
                                        className="border border-slate-300 rounded px-2 py-1.5 text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-slate-600">Sản phẩm:</span>
                                    <select
                                        value={selectedProductTable4}
                                        onChange={(e) => setSelectedProductTable4(e.target.value)}
                                        className="border border-slate-300 rounded px-2 py-1.5 text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="ALL">Tất cả sản phẩm</option>
                                        {uniqueProducts.map(p => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-slate-600">Thị trường:</span>
                                    <select
                                        value={selectedMarketTable4}
                                        onChange={(e) => setSelectedMarketTable4(e.target.value)}
                                        className="border border-slate-300 rounded px-2 py-1.5 text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="ALL">Tất cả thị trường</option>
                                        {Object.values(Market).filter(m => m !== Market.NONE).map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-slate-600">Chi nhánh:</span>
                                    <select
                                        value={selectedBranchTable4}
                                        onChange={(e) => setSelectedBranchTable4(e.target.value)}
                                        className="border border-slate-300 rounded px-2 py-1.5 text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="ALL">Tất cả chi nhánh</option>
                                        {Object.values(Branch).map(b => (
                                            <option key={b} value={b}>{b}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                                <thead className="bg-yellow-50">
                                    <tr>
                                        <th className="px-3 py-3 text-center font-bold text-slate-700 border border-slate-300 text-xs">STT</th>
                                        <th className="px-3 py-3 text-left font-bold text-slate-700 border border-slate-300 text-xs">Tháng</th>
                                        <th className="px-3 py-3 text-left font-bold text-slate-700 border border-slate-300 text-xs">Sản phẩm</th>
                                        <th className="px-3 py-3 text-left font-bold text-slate-700 border border-slate-300 text-xs">Thị trường</th>
                                        <th className="px-3 py-3 text-left font-bold text-slate-700 border border-slate-300 text-xs">Chi nhánh</th>
                                        <th className="px-3 py-3 text-right font-bold text-slate-700 border border-slate-300 text-xs">Sản lượng</th>
                                        <th className="px-3 py-3 text-right font-bold text-slate-700 border border-slate-300 text-xs">Doanh thu</th>
                                        <th className="px-3 py-3 text-right font-bold text-slate-700 border border-slate-300 text-xs">Tỷ trọng DT</th>
                                        <th className="px-3 py-3 text-right font-bold text-slate-700 border border-slate-300 text-xs">Giá vốn<br /><span className="text-[9px] font-normal">(Tiền hàng + FFM + Thuê TK + Bay)</span></th>
                                        <th className="px-3 py-3 text-right font-bold text-slate-700 border border-slate-300 text-xs">Chi phí chung<br /><span className="text-[9px] font-normal">(Ads + lương, BH + Thuế + Test + khác)theo tỷ trọng doanh thu</span></th>
                                        <th className="px-3 py-3 text-right font-bold text-slate-700 border border-slate-300 text-xs">Lãi / Lỗ</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white">
                                    {businessResultsReport.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50">
                                            <td className="px-3 py-3 text-center border border-slate-200 text-xs">{idx + 1}</td>
                                            <td className="px-3 py-3 text-slate-600 border border-slate-200 text-xs">{selectedMonth}</td>
                                            <td className="px-3 py-3 font-medium text-slate-700 border border-slate-200 text-xs">{row.product}</td>
                                            <td className="px-3 py-3 text-slate-600 border border-slate-200 text-xs">{row.market}</td>
                                            <td className="px-3 py-3 text-slate-600 border border-slate-200 text-xs">{row.branch}</td>
                                            <td className="px-3 py-3 text-right text-slate-600 border border-slate-200 text-xs">{row.quantity.toLocaleString()}</td>
                                            <td className="px-3 py-3 text-right text-blue-600 border border-slate-200 text-xs">{formatCurrency(row.revenue)}</td>
                                            <td className="px-3 py-3 text-right text-slate-500 border border-slate-200 text-xs">{row.revenueWeight.toFixed(1)}%</td>
                                            <td className="px-3 py-3 text-right text-red-600 border border-slate-200 text-xs">{formatCurrency(row.cogs)}</td>
                                            <td className="px-3 py-3 text-right text-orange-600 border border-slate-200 text-xs">{formatCurrency(row.opex)}</td>
                                            <td className={`px-3 py-3 text-right font-bold border border-slate-200 text-xs ${row.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {formatCurrency(row.profit)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="text-xs text-slate-500 italic mt-2">
                            <strong>Lưu ý:</strong> Sản lượng, Giá vốn và Chi phí chung được ước tính từ dữ liệu giao dịch.
                            Chi phí chung được <strong className="text-blue-600">phân bổ theo tỷ trọng doanh thu</strong> của từng sản phẩm.
                            Để có báo cáo chính xác hơn, cần bổ sung thông tin Sản phẩm/SKU và phân loại chi phí chi tiết vào hệ thống.
                        </p>
                    </div>
                </div>
            )}

            {activeTab === 'yearly' && (
                <div className="bg-white p-12 rounded-b-xl border shadow-sm flex flex-col items-center justify-center text-slate-400">
                    <p className="text-lg font-medium">Báo cáo tài chính năm đang phát triển...</p>
                    <p className="text-sm mt-2">Sẽ có bảng tổng hợp 12 tháng, xu hướng theo quý, và so sánh năm trước</p>
                </div>
            )}
        </div>
    );
};
