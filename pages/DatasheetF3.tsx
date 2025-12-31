import { Download, RefreshCw, Save, Search } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';

interface ExchangeRates {
    US: number;
    CAD: number;
    AUD: number;
    JPY: number;
    KRW: number;
}

interface F3Data {
    Add: string;
    CSKH: string;
    City: string;
    Ghi_chú: string;
    Hình_thức_thanh_toán: string;
    Khu_vực: string;
    Kế_toán_xác_nhận_thu_tiền_về: string;
    Kết_quả_Check: string;
    Lý_do: string;
    Mã_Tracking: string;
    Mã_đơn_hàng: string;
    Mặt_hàng: string;
    NV_Vận_đơn: string;
    Name: string;
    Ngày_lên_đơn: string;
    Nhân_viên_Marketing: string;
    Nhân_viên_Sale: string;
    Phone: string;
    Phí_ship: number;
    State: string;
    Team: string;
    Thời_gian_cutoff: string;
    Tiền_Việt_đã_đối_soát: number;
    Trạng_thái_giao_hàng_NB: string;
    Trạng_thái_thu_tiền: string;
    Tổng_tiền_VNĐ: number;
    Zipcode: string;
    Đơn_vị_vận_chuyển: string;
}

export const DatasheetF3: React.FC = () => {
    const [data, setData] = useState<F3Data[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(50);

    // Exchange Rates State
    const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({
        US: 26077,
        CAD: 18884,
        AUD: 17315,
        JPY: 168,
        KRW: 17.9
    });
    const [isSavingRates, setIsSavingRates] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch F3 Data
            const response = await fetch('https://lumi-6dff7-default-rtdb.asia-southeast1.firebasedatabase.app/datasheet/F3.json');
            const jsonData = await response.json();

            if (!jsonData) {
                setData([]);
            } else {
                const dataArray = Object.values(jsonData) as F3Data[];
                setData(dataArray);
            }

            // 2. Fetch Exchange Rates
            const ratesResponse = await fetch('https://lumi-6dff7-default-rtdb.asia-southeast1.firebasedatabase.app/settings/exchange_rates.json');
            const ratesJson = await ratesResponse.json();
            if (ratesJson) {
                setExchangeRates(ratesJson);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
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
        fetchData();
    }, []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
    };

    const normalizeString = (str: string) => {
        return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
    };

    // 1. Optimize Filter & Sort with useMemo
    const processedData = React.useMemo(() => {
        let result = [...data];

        // Filter
        if (searchTerm) {
            // Split search query into individual words (tokens)
            const searchTokens = normalizeString(searchTerm).split(/\s+/).filter(t => t.length > 0);

            result = result.filter(item => {
                // Combine all searchable fields into one normalized string
                const searchableText = normalizeString(`
                    ${item?.Mã_đơn_hàng || ""}
                    ${item?.Name || ""}
                    ${item?.Phone || ""}
                    ${item?.Add || ""} ${item?.City || ""} ${item?.State || ""}
                    ${item?.Mặt_hàng || ""}
                `);

                // Check if ALL tokens are present in the searchable text
                // "Flexible in all cases": "Tung Hanoi" finds "Nguyen Van Tung" in "Hanoi"
                return searchTokens.every(token => searchableText.includes(token));
            });
        }

        // Sort (Date Descending)
        result.sort((a, b) => {
            const dateA = a.Ngày_lên_đơn ? new Date(a.Ngày_lên_đơn).getTime() : 0;
            const dateB = b.Ngày_lên_đơn ? new Date(b.Ngày_lên_đơn).getTime() : 0;
            return dateB - dateA;
        });

        return result;
    }, [data, searchTerm]);

    // 2. Pagination Logic
    const totalPages = Math.ceil(processedData.length / itemsPerPage);

    const paginatedData = React.useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return processedData.slice(start, start + itemsPerPage);
    }, [processedData, currentPage]);

    // Reset to page 1 when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

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
                            onClick={fetchData}
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
                                    <th className="px-4 py-3 whitespace-nowrap border border-green-800 bg-[#1e7e34]">Ngày lên đơn</th>
                                    <th className="px-4 py-3 whitespace-nowrap border border-green-800 bg-[#1e7e34]">Name*</th>
                                    <th className="px-4 py-3 whitespace-nowrap border border-green-800 bg-[#1e7e34]">Phone</th>
                                    <th className="px-4 py-3 whitespace-nowrap border border-green-800 bg-[#1e7e34]">Add</th>
                                    <th className="px-4 py-3 whitespace-nowrap border border-green-800 bg-[#1e7e34]">Nhân viên Sale</th>
                                    <th className="px-4 py-3 whitespace-nowrap border border-green-800 bg-[#1e7e34]">CSKH</th>
                                    <th className="px-4 py-3 whitespace-nowrap border border-green-800 bg-[#1e7e34]">Mặt hàng</th>
                                    <th className="px-4 py-3 whitespace-nowrap border border-green-800 bg-[#1e7e34]">Khu vực</th>
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
                                            <td className="px-4 py-3 text-slate-900 whitespace-nowrap border border-slate-200">
                                                {item?.Ngày_lên_đơn ? item.Ngày_lên_đơn.split('-').reverse().join('/') : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-slate-900 border border-slate-200 font-medium">{item?.Name || '-'}</td>
                                            <td className="px-4 py-3 text-slate-900 border border-slate-200">{item?.Phone || '-'}</td>
                                            <td className="px-4 py-3 text-slate-900 text-xs truncate max-w-[200px] border border-slate-200" title={`${item?.Add || ''}, ${item?.City || ''}, ${item?.State || ''} ${item?.Zipcode || ''}`}>
                                                {item?.Add || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-slate-900 border border-slate-200">{item?.Nhân_viên_Sale || '-'}</td>
                                            <td className="px-4 py-3 text-slate-900 border border-slate-200">{item?.CSKH || '-'}</td>
                                            <td className="px-4 py-3 text-slate-900 border border-slate-200">{item?.Mặt_hàng || '-'}</td>
                                            <td className="px-4 py-3 text-slate-900 border border-slate-200">
                                                {item?.Khu_vực === 'US' ? 'US' : 'Canada'}
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
