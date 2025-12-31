import { Download, Plus, Save, Trash2 } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Branch, BusinessResultRow, ExchangeRates, F3Data, Market, Transaction, TransactionType } from '../types';

interface Props {
    transactions: Transaction[];
    lockedKeys: string[];
}

export const ManagementReports: React.FC<Props> = ({ transactions, lockedKeys }) => {
    const [activeTab, setActiveTab] = useState<'monthly' | 'yearly'>('monthly');
    const [loading, setLoading] = useState(false);

    // Filters
    const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');
    const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
    const [selectedMarket, setSelectedMarket] = useState<string>('ALL');
    const [selectedMonth, setSelectedMonth] = useState('2025-12');

    // Data Sources
    const [f3Data, setF3Data] = useState<F3Data[]>([]);
    const [reportRows, setReportRows] = useState<BusinessResultRow[]>([]);
    const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({
        US: 26077,
        CAD: 18884,
        AUD: 17315,
        JPY: 168,
        KRW: 17.9
    });
    const [isSavingRates, setIsSavingRates] = useState(false);
    const [isGlobalLoading, setIsGlobalLoading] = useState(true); // Initial load

    // Fetch Data
    useEffect(() => {
        const fetchF3AndReports = async () => {
            // 1. Try Cache First (FAST LOAD)
            const cachedF3 = sessionStorage.getItem('f3_data_cache_enhanced') || sessionStorage.getItem('f3_data_cache');
            const cachedRates = sessionStorage.getItem('exchange_rates_cache');

            if (cachedF3 && cachedRates) {
                setF3Data(JSON.parse(cachedF3));
                setExchangeRates(JSON.parse(cachedRates));
                setIsGlobalLoading(false); // Show UI immediately
            } else {
                setIsGlobalLoading(true);
            }

            try {
                // 2. Parallel Fetch (Background or Initial)
                console.log("Fetching fresh data for Reports...");
                const [f3Res, reportRes, ratesRes] = await Promise.all([
                    fetch('https://lumi-6dff7-default-rtdb.asia-southeast1.firebasedatabase.app/datasheet/F3.json'),
                    fetch('https://lumi-6dff7-default-rtdb.asia-southeast1.firebasedatabase.app/reports/business_results.json'),
                    fetch('https://lumi-6dff7-default-rtdb.asia-southeast1.firebasedatabase.app/settings/exchange_rates.json')
                ]);

                const [f3Json, reportJson, ratesJson] = await Promise.all([
                    f3Res.json(),
                    reportRes.json(),
                    ratesRes.json()
                ]);

                // Update F3 Data
                if (f3Json) {
                    const data = Object.values(f3Json) as F3Data[];
                    setF3Data(data);
                    // We don't necessarily overwrite the 'enhanced' cache here if we don't have the enhanced fields calculated.
                    // But for reports, raw data is fine. If DatasheetF3 hasn't run, we just cache raw to 'f3_data_cache'.
                    sessionStorage.setItem('f3_data_cache', JSON.stringify(data));
                }

                // Update Report Rows
                if (reportJson) {
                    const rows = Object.entries(reportJson).map(([key, val]: [string, any]) => ({
                        ...val,
                        id: key
                    }));
                    setReportRows(rows);
                } else {
                    setReportRows([]);
                }

                // Update Rates
                if (ratesJson) {
                    setExchangeRates(ratesJson);
                    sessionStorage.setItem('exchange_rates_cache', JSON.stringify(ratesJson));
                }

            } catch (error) {
                console.error("Error loading report data:", error);
            } finally {
                setIsGlobalLoading(false);
                setLoading(false);
            }
        };

        fetchF3AndReports();
    }, []);


    // Save/Update Row to Firebase
    const saveExchangeRates = async () => {
        setIsSavingRates(true);
        try {
            await fetch('https://lumi-6dff7-default-rtdb.asia-southeast1.firebasedatabase.app/settings/exchange_rates.json', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(exchangeRates)
            });
            alert('Đã lưu tỷ giá thành công!');
        } catch (error) {
            console.error('Error saving rates:', error);
            alert('Lỗi khi lưu tỷ giá');
        } finally {
            setIsSavingRates(false);
        }
    };

    const handleRateChange = (currency: keyof ExchangeRates, value: string) => {
        const numValue = parseFloat(value);
        setExchangeRates(prev => ({
            ...prev,
            [currency]: isNaN(numValue) ? 0 : numValue
        }));
    };

    // Save/Update Row to Firebase
    const saveReportRow = async (row: BusinessResultRow) => {
        try {
            const method = row.id.startsWith('temp_') ? 'POST' : 'PUT';
            const url = row.id.startsWith('temp_')
                ? 'https://lumi-6dff7-default-rtdb.asia-southeast1.firebasedatabase.app/reports/business_results.json'
                : `https://lumi-6dff7-default-rtdb.asia-southeast1.firebasedatabase.app/reports/business_results/${row.id}.json`;

            // Remove temporary ID in body
            const { id, ...body } = row;

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (row.id.startsWith('temp_')) {
                const json = await response.json();
                // Replace temp row with real ID in state
                setReportRows(prev => prev.map(r => r.id === row.id ? { ...row, id: json.name } : r));
            }

        } catch (error) {
            console.error("Error saving row:", error);
        }
    };

    const deleteReportRow = async (id: string) => {
        if (!confirm("Bạn có chắc muốn xóa dòng này?")) return;
        try {
            await fetch(`https://lumi-6dff7-default-rtdb.asia-southeast1.firebasedatabase.app/reports/business_results/${id}.json`, {
                method: 'DELETE'
            });
            setReportRows(prev => prev.filter(r => r.id !== id));
        } catch (error) {
            console.error("Error deleting row:", error);
        }
    };

    const handleRowChange = (id: string, field: keyof BusinessResultRow, value: any) => {
        setReportRows(prev => prev.map(row => {
            if (row.id === id) {
                const updated = { ...row, [field]: value };
                // Debounce save or save immediately on blur? For simplicity, we save after filtered events or explicit save button. 
                // To avoid too many writes, we can just update state here and let User click "Save" or auto-save via useEffect.
                // Let's implement auto-save Effect or just save on Blur for inputs. For Selects, save immediately.
                if (field !== 'cogs' && field !== 'overhead') {
                    saveReportRow(updated);
                }
                return updated;
            }
            return row;
        }));
    };

    // Separate handler for saving inputs on blur to avoid spamming API on keystroke
    const handleInputBlur = (row: BusinessResultRow) => {
        saveReportRow(row);
    };

    const addNewRow = () => {
        const newRow: BusinessResultRow = {
            id: `temp_${Date.now()}`,
            month: selectedMonth,
            product: '',
            market: '',
            branch: '',
            cogs: 0,
            overhead: 0
        };
        setReportRows(prev => [...prev, newRow]);
        // Don't save to DB yet until they pick something
    };


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


    // Unique options helpers
    const f3UniqueProducts = useMemo(() => [...new Set(f3Data.map(i => i.Mặt_hàng).filter(Boolean))].sort(), [f3Data]);
    const f3UniqueMarkets = useMemo(() => [...new Set(f3Data.map(i => i.Khu_vực).filter(Boolean))].sort(), [f3Data]); // Or from Market Enum
    const f3UniqueBranches = useMemo(() => [...new Set(f3Data.map(i => i.Team).filter(Boolean))].sort(), [f3Data]);


    // Bảng 4: Calculator Logic
    const businessResultsCalculated = useMemo(() => {
        // Show rows only for selected Month, to keep list clean, or show all? 
        // User probably wants to see just the monthly report.
        const rowsForMonth = reportRows.filter(r => r.month === selectedMonth);

        const totalRevenueMonth = f3Data
            .filter(d => d.Ngày_lên_đơn?.startsWith(selectedMonth))
            .reduce((sum, item) => sum + (item.Tổng_tiền_VNĐ || 0), 0);

        return rowsForMonth.map(row => {
            // New logic: STRICT mode. Must select ALL 3 criteria (Product, Market, Branch) to see data.
            // If any field is missing, return 0.
            if (!row.product || !row.market || !row.branch) {
                return {
                    ...row,
                    quantity: 0,
                    revenue: 0,
                    revenueWeight: 0,
                    profit: -(row.cogs || 0) - (row.overhead || 0)
                };
            }

            // Aggregate F3 data based on row criteria
            const matchingOrders = f3Data.filter(item => {
                if (!item.Ngày_lên_đơn?.startsWith(row.month)) return false;
                if (row.product && item.Mặt_hàng !== row.product) return false;

                // Market logic: F3 'Khu_vực' might be 'US', 'Canada', etc.
                // Row 'market' might be 'US', 'CAN', etc. need normalization if mismatched.
                // Assuming user selects from F3 values for now to enable matching.
                if (row.market && item.Khu_vực !== row.market && item.City !== row.market) return false; // Loose matching

                if (row.branch && item.Team !== row.branch) return false;

                return true;
            });

            const quantity = matchingOrders.length;
            const revenue = matchingOrders.reduce((sum, item) => sum + (item.Tổng_tiền_VNĐ || 0), 0);
            const revenueWeight = totalRevenueMonth > 0 ? (revenue / totalRevenueMonth) * 100 : 0;
            const profit = revenue - (row.cogs || 0) - (row.overhead || 0);

            return {
                ...row,
                quantity,
                revenue,
                revenueWeight,
                profit
            };
        });
    }, [reportRows, f3Data, selectedMonth]);

    // Generic export helper to adjust column widths
    const exportToExcel = (data: any[], fileName: string, sheetName: string, colWidths: number[]) => {
        const ws = XLSX.utils.json_to_sheet(data);

        // Set column widths
        ws['!cols'] = colWidths.map(w => ({ wch: w }));

        // Simple number formatting for all numeric cells (optional iteration)
        const range = XLSX.utils.decode_range(ws['!ref'] || "A1:A1");
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
                const cell = ws[cell_address];
                if (cell && cell.t === 'n' && (cell.v > 1000 || cell.v < -1000)) {
                    // Format number with thousands separator if > 1000
                    cell.z = '#,##0'; // Excel format code
                }
            }
        }

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        XLSX.writeFile(wb, fileName);
    };

    // Export handlers
    const handleExportTable1 = () => {
        const rows = [...reportByBranch.data, reportByBranch.total];
        const data = rows.map(row => ({
            'Chi nhánh': row.branch === 'TOTAL' ? 'Tổng cộng' : row.branch,
            'Tổng Thu (VNĐ)': row.rev,
            'Tổng Chi (VNĐ)': row.exp,
            'Lãi/Lỗ (VNĐ)': row.profit,
            'Tỷ suất LN (%)': row.margin.toFixed(2)
        }));
        exportToExcel(data, `Bao_cao_Thu_Chi_Chi_nhanh_${selectedMonth}.xlsx`, 'Thu-Chi Chi nhánh', [20, 15, 15, 15, 15]);
    };

    const handleExportTable2 = () => {
        const rows = [...reportByMarket.data, reportByMarket.total];
        const data = rows.map(row => ({
            'Thị trường': row.market,
            'Tổng Thu (VNĐ)': row.rev,
            'Tổng Chi (VNĐ)': row.exp,
            'Lãi/Lỗ (VNĐ)': row.profit,
            'Tỷ suất LN (%)': row.margin.toFixed(2),
            'Ghi chú': row.note
        }));
        exportToExcel(data, `Bao_cao_Thu_Chi_Thi_truong_${selectedMonth}.xlsx`, 'Thu-Chi Thị trường', [15, 15, 15, 15, 15, 30]);
    };

    const handleExportTable3 = () => {
        const data = cashFlowReport.map(row => ({
            'Tháng': row.month,
            'Số dư đầu kỳ (VNĐ)': row.opening,
            'Tổng Thu (VNĐ)': row.rev,
            'Tổng Chi (VNĐ)': row.exp,
            'Số dư cuối kỳ (VNĐ)': row.closing,
            'Trạng thái': row.status
        }));
        exportToExcel(data, `Bao_cao_Dong_tien_${selectedMonth}.xlsx`, 'Dòng tiền', [15, 20, 15, 15, 20, 15]);
    };

    const handleExportTable4 = () => {
        const data = businessResultsCalculated.map((row, index) => ({
            'STT': index + 1,
            'Tháng/Năm': row.month,
            'Sản phẩm': row.product,
            'Thị trường': row.market,
            'Chi nhánh': row.branch,
            'Sản lượng': row.quantity,
            'Doanh thu (VNĐ)': row.revenue,
            'Tỷ trọng DT (%)': row.revenueWeight.toFixed(2),
            'Giá vốn (VNĐ)': row.cogs,
            'Chi phí chung (VNĐ)': row.overhead,
            'Lợi nhuận (VNĐ)': row.profit
        }));
        exportToExcel(data, `Bao_cao_Ket_qua_kinh_doanh_${selectedMonth}.xlsx`, 'Kết quả kinh doanh', [5, 15, 20, 15, 15, 10, 15, 15, 15, 15, 15]);
    };

    return (
        <div className="space-y-6">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row gap-6">
                {/* Exchange Rate Widget */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 w-full md:w-auto shrink-0">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-slate-700 text-sm">Bảng tỷ giá (VNĐ)</h3>
                        <button
                            onClick={saveExchangeRates}
                            disabled={isSavingRates}
                            className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                            title="Lưu tỷ giá"
                        >
                            <Save size={16} />
                        </button>
                    </div>
                    <div className="grid grid-cols-5 gap-2 text-xs">
                        <div className="flex flex-col gap-1">
                            <label className="font-semibold text-slate-500 text-center">US</label>
                            <input
                                type="number"
                                value={exchangeRates.US}
                                onChange={(e) => handleRateChange('US', e.target.value)}
                                className="border border-slate-300 rounded px-1 py-1 text-center w-16 focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="font-semibold text-slate-500 text-center">CAD</label>
                            <input
                                type="number"
                                value={exchangeRates.CAD}
                                onChange={(e) => handleRateChange('CAD', e.target.value)}
                                className="border border-slate-300 rounded px-1 py-1 text-center w-16 focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="font-semibold text-slate-500 text-center">AUS</label>
                            <input
                                type="number"
                                value={exchangeRates.AUD}
                                onChange={(e) => handleRateChange('AUD', e.target.value)}
                                className="border border-slate-300 rounded px-1 py-1 text-center w-16 focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="font-semibold text-slate-500 text-center">Nhật</label>
                            <input
                                type="number"
                                value={exchangeRates.JPY}
                                onChange={(e) => handleRateChange('JPY', e.target.value)}
                                className="border border-slate-300 rounded px-1 py-1 text-center w-16 focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="font-semibold text-slate-500 text-center">Hàn</label>
                            <input
                                type="number"
                                value={exchangeRates.KRW}
                                onChange={(e) => handleRateChange('KRW', e.target.value)}
                                className="border border-slate-300 rounded px-1 py-1 text-center w-16 focus:border-blue-500 outline-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Báo cáo tài chính quản trị</h2>
                        <p className="text-sm text-slate-500 mt-1">
                            <strong className="text-red-600">Chỉ xem</strong> - Dữ liệu tự động từ Thu/Chi & Sổ quỹ
                        </p>
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
                            <button onClick={handleExportTable1} className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
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
                            <button onClick={handleExportTable2} className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
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
                            <button onClick={handleExportTable3} className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
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
                                <div className="flex gap-2">
                                    <button
                                        onClick={addNewRow}
                                        className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center gap-1 bg-white px-3 py-1 rounded border border-green-200"
                                    >
                                        <Plus size={14} /> Thêm dòng
                                    </button>
                                    <button onClick={handleExportTable4} className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
                                        <Download size={14} /> Xuất Excel
                                    </button>
                                </div>
                            </div>

                            <div className='flex items-center gap-2 mb-2'>
                                <span className='text-sm text-slate-600'>Chọn tháng báo cáo:</span>
                                <input
                                    type="month"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="border border-slate-300 rounded px-2 py-1 text-sm"
                                />
                            </div>

                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                                <thead className="bg-yellow-50">
                                    <tr>
                                        <th className="px-3 py-3 text-center font-bold text-slate-700 border border-slate-300 text-xs">STT</th>
                                        <th className="px-3 py-3 text-center font-bold text-slate-700 border border-slate-300 text-xs w-10">Xóa</th>
                                        <th className="px-3 py-3 text-left font-bold text-slate-700 border border-slate-300 text-xs min-w-[100px]">Tháng</th>
                                        <th className="px-3 py-3 text-left font-bold text-slate-700 border border-slate-300 text-xs min-w-[150px]">Sản phẩm</th>
                                        <th className="px-3 py-3 text-left font-bold text-slate-700 border border-slate-300 text-xs min-w-[100px]">Thị trường</th>
                                        <th className="px-3 py-3 text-left font-bold text-slate-700 border border-slate-300 text-xs min-w-[100px]">Chi nhánh</th>
                                        <th className="px-3 py-3 text-right font-bold text-slate-700 border border-slate-300 text-xs">Sản lượng</th>
                                        <th className="px-3 py-3 text-right font-bold text-slate-700 border border-slate-300 text-xs">Doanh thu</th>
                                        <th className="px-3 py-3 text-right font-bold text-slate-700 border border-slate-300 text-xs">Tỷ trọng DT</th>
                                        <th className="px-3 py-3 text-right font-bold text-slate-700 border border-slate-300 text-xs min-w-[100px]">Giá vốn</th>
                                        <th className="px-3 py-3 text-right font-bold text-slate-700 border border-slate-300 text-xs min-w-[100px]">Chi phí chung</th>
                                        <th className="px-3 py-3 text-right font-bold text-slate-700 border border-slate-300 text-xs">Lãi / Lỗ</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white">
                                    {businessResultsCalculated.map((row, idx) => (
                                        <tr key={row.id} className="hover:bg-slate-50 group">
                                            <td className="px-3 py-3 text-center border border-slate-200 text-xs">{idx + 1}</td>
                                            <td className="px-3 py-3 text-center border border-slate-200 text-xs">
                                                <button onClick={() => deleteReportRow(row.id)} className="text-red-400 hover:text-red-600">
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                            <td className="px-3 py-3 border border-slate-200">
                                                <input
                                                    type="month"
                                                    value={row.month}
                                                    onChange={(e) => handleRowChange(row.id, 'month', e.target.value)}
                                                    className="w-full text-xs border-none bg-transparent focus:ring-0 p-0"
                                                />
                                            </td>
                                            <td className="px-3 py-3 border border-slate-200">
                                                <select
                                                    value={row.product}
                                                    onChange={(e) => handleRowChange(row.id, 'product', e.target.value)}
                                                    className="w-full text-xs border-none bg-transparent focus:ring-0 p-0"
                                                >
                                                    <option value="">Chọn SP</option>
                                                    {f3UniqueProducts.map(p => (
                                                        <option key={p} value={p}>{p}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-3 py-3 border border-slate-200">
                                                <select
                                                    value={row.market}
                                                    onChange={(e) => handleRowChange(row.id, 'market', e.target.value)}
                                                    className="w-full text-xs border-none bg-transparent focus:ring-0 p-0"
                                                >
                                                    <option value="">Chọn TT</option>
                                                    {f3UniqueMarkets.map(p => (
                                                        <option key={p} value={p}>{p}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-3 py-3 border border-slate-200">
                                                <select
                                                    value={row.branch}
                                                    onChange={(e) => handleRowChange(row.id, 'branch', e.target.value)}
                                                    className="w-full text-xs border-none bg-transparent focus:ring-0 p-0"
                                                >
                                                    <option value="">Chọn CN</option>
                                                    {f3UniqueBranches.map(p => (
                                                        <option key={p} value={p}>{p}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-3 py-3 text-right text-slate-600 border border-slate-200 text-xs bg-slate-50">{row.quantity.toLocaleString()}</td>
                                            <td className="px-3 py-3 text-right text-blue-600 border border-slate-200 text-xs bg-slate-50">{formatCurrency(row.revenue)}</td>
                                            <td className="px-3 py-3 text-right text-slate-500 border border-slate-200 text-xs bg-slate-50">{row.revenueWeight.toFixed(1)}%</td>
                                            <td className="px-3 py-3 border border-slate-200">
                                                <input
                                                    type="number"
                                                    value={row.cogs}
                                                    onChange={(e) => handleRowChange(row.id, 'cogs', Number(e.target.value))}
                                                    onBlur={() => handleInputBlur(row)}
                                                    className="w-full text-right text-xs border border-slate-200 rounded px-1 py-0.5 focus:border-blue-500"
                                                    placeholder="0"
                                                />
                                            </td>
                                            <td className="px-3 py-3 border border-slate-200">
                                                <input
                                                    type="number"
                                                    value={row.overhead}
                                                    onChange={(e) => handleRowChange(row.id, 'overhead', Number(e.target.value))}
                                                    onBlur={() => handleInputBlur(row)}
                                                    className="w-full text-right text-xs border border-slate-200 rounded px-1 py-0.5 focus:border-blue-500"
                                                    placeholder="0"
                                                />
                                            </td>
                                            <td className={`px-3 py-3 text-right font-bold border border-slate-200 text-xs bg-slate-50 ${row.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {formatCurrency(row.profit)}
                                            </td>
                                        </tr>
                                    ))}
                                    {businessResultsCalculated.length === 0 && (
                                        <tr>
                                            <td colSpan={12} className="text-center py-8 text-slate-400 italic">
                                                Chưa có dữ liệu báo cáo cho tháng {selectedMonth}. Nhấn "Thêm dòng" để bắt đầu.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <p className="text-xs text-slate-500 italic mt-2">
                            <strong>Hướng dẫn:</strong> Chọn Sản phẩm, Thị trường, Chi nhánh để hệ thống tự lấy Doanh thu/Sản lượng từ F3. Nhập Giá vốn & Chi phí chung để tính Lãi/Lỗ. Dữ liệu tự động lưu.
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
