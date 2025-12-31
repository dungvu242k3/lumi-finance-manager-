import { Download, RefreshCw, Save, Search } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { ExchangeRates, F3Data } from '../types';

interface F3DataEnhanced extends F3Data {
    _searchStr?: string;
    _timestamp?: number;
}

// Hook for debouncing value
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

const normalizeString = (str: string) => {
    return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
};

export const DatasheetF3: React.FC = () => {
    const [data, setData] = useState<F3DataEnhanced[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(50);

    // Helper to process raw data into enhanced data
    const processRawData = (rawData: F3Data[]): F3DataEnhanced[] => {
        return rawData.map(item => ({
            ...item,
            _timestamp: item.Ngày_lên_đơn ? new Date(item.Ngày_lên_đơn).getTime() : 0,
            _searchStr: normalizeString(`
                ${item.Mã_đơn_hàng || ""}
                ${item.City || ""} ${item.State || ""}
                ${item.Mặt_hàng || ""}
            `)
        }));
    };

    // Exchange Rates State
    const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({
        US: 26077,
        CAD: 18884,
        AUD: 17315,
        JPY: 168,
        KRW: 17.9
    });
    const [isSavingRates, setIsSavingRates] = useState(false);
    const [isBackgroundUpdating, setIsBackgroundUpdating] = useState(false);

    const fetchData = async (useCache = true) => {
        // Try to load from cache first
        if (useCache) {
            const cachedData = sessionStorage.getItem('f3_data_cache');
            const cachedRates = sessionStorage.getItem('exchange_rates_cache');

            if (cachedData && cachedRates) {
                // If using old cache format (without _searchStr), re-process might be safer
                // But for now assume cache is fresh or user will refresh.
                // We'll trust the process if it has _searchStr, otherwise re-process.
                const parsedData = JSON.parse(cachedData);
                if (parsedData.length > 0 && !parsedData[0]._searchStr) {
                    // Old cache detected, re-fetch or re-process
                    setLoading(true);
                } else {
                    setData(parsedData);
                    setExchangeRates(JSON.parse(cachedRates));
                    setLoading(false);
                    setIsBackgroundUpdating(true); // Indicate we are checking for updates
                }
            } else {
                setLoading(true); // No cache, show full loader
            }
        } else {
            setLoading(true); // Explicit refresh
        }

        try {
            // Fetch both in parallel
            const [f3Res, ratesRes] = await Promise.all([
                fetch('https://lumi-6dff7-default-rtdb.asia-southeast1.firebasedatabase.app/datasheet/F3.json'),
                fetch('https://lumi-6dff7-default-rtdb.asia-southeast1.firebasedatabase.app/settings/exchange_rates.json')
            ]);

            const [f3Json, ratesJson] = await Promise.all([
                f3Res.json(),
                ratesRes.json()
            ]);

            // Process F3 Data
            if (f3Json) {
                const rawData = Object.values(f3Json) as F3Data[];
                const enhancedData = processRawData(rawData);
                // Sort by default (Date desc) so initial render is correct
                enhancedData.sort((a, b) => (b._timestamp || 0) - (a._timestamp || 0));

                setData(enhancedData);
                sessionStorage.setItem('f3_data_cache_enhanced', JSON.stringify(enhancedData));
            } else {
                setData([]);
                sessionStorage.removeItem('f3_data_cache_enhanced');
            }

            // Process Rates
            if (ratesJson) {
                setExchangeRates(ratesJson);
                sessionStorage.setItem('exchange_rates_cache', JSON.stringify(ratesJson));
            }

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
            setIsBackgroundUpdating(false);
        }
    };

    const saveExchangeRates = async () => {
        setIsSavingRates(true);
        try {
            await fetch('https://lumi-6dff7-default-rtdb.asia-southeast1.firebasedatabase.app/settings/exchange_rates.json', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(exchangeRates)
            });
            // Update cache after save
            sessionStorage.setItem('exchange_rates_cache', JSON.stringify(exchangeRates));
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

    useEffect(() => {
        fetchData(true); // Load with cache strategy on mount
    }, []);

    const handleRefresh = () => {
        fetchData(false); // Force hard refresh
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
    };

    const normalizeString = (str: string) => {
        return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
    };

    // 1. Optimize Filter & Sort with useMemo
    const processedData = React.useMemo(() => {
        // If no search, return data directly (already sorted by default in fetch)
        // This is a HUGE optimization because it skips the entire filter loop
        if (!debouncedSearchTerm) {
            return data;
        }

        const normalizedSearch = normalizeString(debouncedSearchTerm);
        // Pre-tokenize search term ONCE
        const searchTokens = normalizedSearch.split(/\s+/).filter(t => t.length > 0);

        // O(N) scan but with simple string includes against pre-calc string
        return data.filter(item => {
            if (!item._searchStr) return false;
            // Check if ALL tokens are present in the searchable text
            return searchTokens.every(token => item._searchStr!.includes(token));
        });
    }, [data, debouncedSearchTerm]);

    // 2. Pagination Logic
    const totalPages = Math.ceil(processedData.length / itemsPerPage);

    const paginatedData = React.useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return processedData.slice(start, start + itemsPerPage);
    }, [processedData, currentPage]);

    // Reset to page 1 when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchTerm]);

    const handleExport = () => {
        // Export ALL filtered data, not just current page
        const ws = XLSX.utils.json_to_sheet(processedData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "F3_Data");
        XLSX.writeFile(wb, `F3_Data_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="space-y-6">
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

                {/* Header Actions */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Dữ liệu F3</h2>
                        <p className="text-sm text-slate-500 mt-1">Danh sách đơn hàng từ hệ thống</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleRefresh}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Làm mới
                        </button>
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                        >
                            <Download size={16} /> Xuất Excel
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-200px)]">
                <div className="p-4 border-b border-slate-200 shrink-0">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm đơn hàng, tên khách, SĐT..."
                            className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-auto flex-1 relative custom-scrollbar">
                    {loading ? (
                        <div className="p-8 text-center text-slate-500">Đang tải dữ liệu...</div>
                    ) : (
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-[#1e7e34] text-white font-semibold sticky top-0 z-30 shadow-sm">
                                <tr>
                                    <th className="px-4 py-3 whitespace-nowrap border border-green-800 bg-[#1e7e34] sticky left-0 z-30">STT</th>
                                    <th className="px-4 py-3 whitespace-nowrap border border-green-800 bg-[#1e7e34] sticky left-[60px] z-30">Mã đơn hàng</th>
                                    <th className="px-4 py-3 whitespace-nowrap border border-green-800 bg-[#1e7e34]">Mặt hàng</th>
                                    <th className="px-4 py-3 whitespace-nowrap border border-green-800 bg-[#1e7e34]">Khu vực</th>
                                    <th className="px-4 py-3 text-right whitespace-nowrap border border-green-800 bg-[#1e7e34]">Phí Chung</th>
                                    <th className="px-4 py-3 text-right whitespace-nowrap border border-green-800 bg-[#1e7e34]">Phí Bay</th>
                                    <th className="px-4 py-3 text-right whitespace-nowrap border border-green-800 bg-[#1e7e34]">Thuê TK</th>
                                    <th className="px-4 py-3 text-right whitespace-nowrap border border-green-800 bg-[#1e7e34]">Tiền Hàng</th>
                                    <th className="px-4 py-3 text-right whitespace-nowrap border border-green-800 bg-[#1e7e34]">Ship</th>
                                    <th className="px-4 py-3 text-right whitespace-nowrap border border-green-800 bg-[#1e7e34]">Tiền đã đối soát</th>
                                    <th className="px-4 py-3 text-right whitespace-nowrap border border-green-800 bg-[#1e7e34]">KT xác nhận</th>
                                    <th className="px-4 py-3 text-right whitespace-nowrap border border-green-800 bg-[#1e7e34]">Tổng tiền VNĐ</th>
                                    <th className="px-4 py-3 text-center whitespace-nowrap border border-green-800 bg-[#1e7e34]">Trạng thái cuối cùng</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {paginatedData.map((item, index) => {
                                    // Calculate actual index across pages
                                    const actualIndex = (currentPage - 1) * itemsPerPage + index + 1;
                                    return (
                                        <tr key={item?.Mã_đơn_hàng || index} className="hover:bg-slate-50 group">
                                            <td className="px-4 py-3 text-center border border-slate-200 text-slate-900 font-medium sticky left-0 z-20 bg-white group-hover:bg-slate-50">{actualIndex}</td>
                                            <td className="px-4 py-3 font-medium text-slate-900 border border-slate-200 sticky left-[60px] z-20 bg-white group-hover:bg-slate-50">{item?.Mã_đơn_hàng || '-'}</td>
                                            <td className="px-4 py-3 text-slate-900 border border-slate-200">{item?.Mặt_hàng || '-'}</td>
                                            <td className="px-4 py-3 text-slate-900 border border-slate-200">
                                                {item?.Khu_vực === 'US' ? 'US' : 'Canada'}
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-900 border border-slate-200">
                                                {formatCurrency(item?.Phí_Chung || 0)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-900 border border-slate-200">
                                                {formatCurrency(item?.Phí_bay || 0)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-900 border border-slate-200">
                                                {formatCurrency(item?.Thuê_TK || 0)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-900 border border-slate-200">
                                                {formatCurrency(item?.Tiền_Hàng || 0)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-900 border border-slate-200">
                                                {formatCurrency(item?.Phí_ship || 0)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-900 border border-slate-200">
                                                {formatCurrency(item?.Tiền_Việt_đã_đối_soát || 0)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-900 border border-slate-200">
                                                {item?.Kế_toán_xác_nhận_thu_tiền_về || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-slate-900 border border-slate-200">
                                                {formatCurrency(item?.Tổng_tiền_VNĐ || 0)}
                                            </td>
                                            <td className="px-4 py-3 text-center border border-slate-200">
                                                <select
                                                    className="border border-slate-300 rounded px-2 py-1 text-xs bg-white focus:ring-2 focus:ring-green-500 outline-none w-full max-w-[140px]"
                                                    defaultValue={item?.Trạng_thái_giao_hàng_NB || ""}
                                                >
                                                    <option value="">-- Chọn --</option>
                                                    <option value="Giao Thành Công">Giao Thành Công</option>
                                                    <option value="Đang Giao">Đang Giao</option>
                                                    <option value="Chưa Giao">Chưa Giao</option>
                                                    <option value="Hủy">Hủy</option>
                                                    <option value="Hoàn">Hoàn</option>
                                                </select>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                    {!loading && processedData.length === 0 && (
                        <div className="p-8 text-center text-slate-500">Không tìm thấy dữ liệu phù hợp.</div>
                    )}
                </div>

                {/* Pagination Controls */}
                <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
                    <div className="text-xs text-slate-500">
                        Hiển thị <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> - <strong>{Math.min(currentPage * itemsPerPage, processedData.length)}</strong> trên tổng số <strong>{processedData.length}</strong> đơn
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 text-xs font-medium border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Trước
                        </button>
                        <span className="text-xs font-medium self-center px-2">Trang {currentPage} / {totalPages || 1}</span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="px-3 py-1 text-xs font-medium border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Sau
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
