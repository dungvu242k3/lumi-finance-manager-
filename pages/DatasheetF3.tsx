import { Download, Edit, Eye, RefreshCw, Save, Search, Upload, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { ExchangeRates, F3Data } from '../types';

interface F3DataEnhanced extends F3Data {
    id?: string;
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

export const DatasheetF3: React.FC = () => {
    const [data, setData] = useState<F3DataEnhanced[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(50);
    const [viewingItem, setViewingItem] = useState<F3DataEnhanced | null>(null);
    const [editingItem, setEditingItem] = useState<F3DataEnhanced | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Filters
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [selectedMarket, setSelectedMarket] = useState('');
    const [selectedProduct, setSelectedProduct] = useState('');
    const [selectedTeam, setSelectedTeam] = useState('');

    // Derive unique options for filters
    const uniqueMarkets = React.useMemo(() => {
        const markets = new Set(data.map(i => i.Khu_vực).filter(Boolean));
        return Array.from(markets).sort();
    }, [data]);

    const uniqueProducts = React.useMemo(() => {
        const products = new Set(data.map(i => i.Mặt_hàng).filter(Boolean));
        return Array.from(products).sort();
    }, [data]);

    const uniqueTeams = React.useMemo(() => {
        const teams = new Set(data.map(i => i.Team).filter(Boolean));
        return Array.from(teams).sort();
    }, [data]);

    // Helper to process raw data into enhanced data
    const processRawData = (rawData: (F3Data & { id?: string })[]): F3DataEnhanced[] => {
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

    const fetchData = async (useCache = true) => {
        // Try to load from cache first
        if (useCache) {
            const cachedData = sessionStorage.getItem('f3_data_cache_enhanced');
            const cachedRates = sessionStorage.getItem('exchange_rates_cache');

            if (cachedData && cachedRates) {
                setData(JSON.parse(cachedData));
                setExchangeRates(JSON.parse(cachedRates));
                setLoading(false);
            } else {
                setLoading(true);
            }
        } else {
            setLoading(true);
        }

        try {
            const [f3Res, ratesRes] = await Promise.all([
                fetch('https://lumi-6dff7-default-rtdb.asia-southeast1.firebasedatabase.app/datasheet/F3.json'),
                fetch('https://lumi-6dff7-default-rtdb.asia-southeast1.firebasedatabase.app/settings/exchange_rates.json')
            ]);

            const [f3Json, ratesJson] = await Promise.all([
                f3Res.json(),
                ratesRes.json()
            ]);

            if (f3Json) {
                // Map object keys to 'id' property
                const rawData = Object.entries(f3Json).map(([key, value]) => ({
                    ...(value as F3Data),
                    id: key
                }));
                const enhancedData = processRawData(rawData);
                enhancedData.sort((a, b) => (b._timestamp || 0) - (a._timestamp || 0));

                setData(enhancedData);
                sessionStorage.setItem('f3_data_cache_enhanced', JSON.stringify(enhancedData));
            } else {
                setData([]);
                sessionStorage.removeItem('f3_data_cache_enhanced');
            }

            if (ratesJson) {
                setExchangeRates(ratesJson);
                sessionStorage.setItem('exchange_rates_cache', JSON.stringify(ratesJson));
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
            sessionStorage.setItem('exchange_rates_cache', JSON.stringify(exchangeRates));
            alert('Đã lưu tỷ giá thành công!');
        } catch (error) {
            console.error('Error saving rates:', error);
            alert('Lỗi khi lưu tỷ giá');
        } finally {
            setIsSavingRates(false);
        }
    };





    const handleSaveEdit = async () => {
        if (!editingItem) return;

        try {
            // 1. Update Firebase if 'id' exists
            if (editingItem.id) {
                // Remove internal fields before sending
                const { id, _searchStr, _timestamp, ...updateData } = editingItem;
                await fetch(`https://lumi-6dff7-default-rtdb.asia-southeast1.firebasedatabase.app/datasheet/F3/${editingItem.id}.json`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updateData)
                });
            }

            // 2. Update local state
            const newData = data.map(item =>
                item.Mã_đơn_hàng === editingItem.Mã_đơn_hàng ? editingItem : item
            );

            // Re-process to update search string and timestamp if changed
            const processedNewData = processRawData(newData);
            // Re-sort
            processedNewData.sort((a, b) => (b._timestamp || 0) - (a._timestamp || 0));

            setData(processedNewData);
            sessionStorage.setItem('f3_data_cache_enhanced', JSON.stringify(processedNewData));

            setEditingItem(null);
            alert("Đã cập nhật đơn hàng thành công!");

        } catch (error) {
            console.error("Update Error:", error);
            alert("Lỗi khi cập nhật đơn hàng.");
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const jsonData = XLSX.utils.sheet_to_json<any>(ws);

                // Mapping logic: Map Vietnamese headers to F3Data keys
                // We'll accept slightly different variations to be robust
                const mappedData: F3Data[] = jsonData.map((row) => {
                    return {
                        Mã_đơn_hàng: row['Mã đơn hàng'] || row['Mã_đơn_hàng'] || '',
                        Mặt_hàng: row['Mặt hàng'] || row['Mặt_hàng'] || '',
                        Ngày_lên_đơn: row['Ngày lên đơn'] || row['Ngày_lên_đơn'] || '',
                        Name: row['Name'] || row['Tên'] || '',
                        Khu_vực: row['Khu vực'] || row['Khu_vực'] || '',
                        City: row['City'] || row['Thành phố'] || '',
                        State: row['State'] || row['Bang'] || '',
                        Zipcode: row['Zipcode'] || '',
                        Tiền_Hàng: Number(row['Tiền Hàng'] || row['Tiền_Hàng'] || 0),
                        Phí_Chung: Number(row['Phí Chung'] || row['Phí_Chung'] || 0),
                        Phí_bay: Number(row['Phí Bay'] || row['Phí_bay'] || 0),
                        Thuê_TK: Number(row['Thuê TK'] || row['Thuê_TK'] || 0),
                        Phí_ship: Number(row['Ship'] || row['Phí_ship'] || 0),
                        Tiền_Việt_đã_đối_soát: Number(row['Tiền đã đối soát'] || row['Tiền_Việt_đã_đối_soát'] || 0),
                        Kế_toán_xác_nhận_thu_tiền_về: row['KT xác nhận'] || row['Kế_toán_xác_nhận_thu_tiền_về'] || '',
                        Tổng_tiền_VNĐ: Number(row['Tổng tiền VNĐ'] || row['Tổng_tiền_VNĐ'] || 0),
                        Trạng_thái_giao_hàng_NB: row['Trạng thái cuối cùng'] || row['Trạng_thái_giao_hàng_NB'] || '',
                        // Preserve other fields if present or default
                        Team: row['Team'] || row['Chi nhánh'] || '',
                        Ghi_chú: row['Ghi chú'] || '',
                        Hình_thức_thanh_toán: row['Hình thức thanh toán'] || '',
                        Kết_quả_Check: row['Kết quả Check'] || '',
                        Lý_do: row['Lý do'] || '',
                        Mã_Tracking: row['Mã Tracking'] || '',
                        NV_Vận_đơn: row['NV Vận đơn'] || '',
                        Nhân_viên_Marketing: row['Nhân viên Marketing'] || '',
                        Thời_gian_cutoff: row['Thời gian cutoff'] || '',
                        Trạng_thái_thu_tiền: row['Trạng thái thu tiền'] || '',
                        Đơn_vị_vận_chuyển: row['Đơn vị vận chuyển'] || ''
                    };
                }).filter(item => item.Mã_đơn_hàng); // Filter out empty rows

                if (mappedData.length === 0) {
                    alert('Không tìm thấy dữ liệu hợp lệ trong file Excel.');
                    return;
                }

                // MERGE Logic
                // Create a map of existing data
                const currentDataMap = new Map(data.map(i => [i.Mã_đơn_hàng, i]));
                let newCount = 0;
                let updateCount = 0;

                mappedData.forEach(newItem => {
                    if (currentDataMap.has(newItem.Mã_đơn_hàng)) {
                        // Update existing, create merged object to keep fields not in excel (if any)
                        // PRESERVE ID FROM EXISTING
                        const existing = currentDataMap.get(newItem.Mã_đơn_hàng)!;
                        currentDataMap.set(newItem.Mã_đơn_hàng, { ...existing, ...newItem });
                        updateCount++;
                    } else {
                        // Add new (will need enhancement)
                        // Casting as specific Enhanced type for map storage
                        currentDataMap.set(newItem.Mã_đơn_hàng, { ...newItem } as F3DataEnhanced);
                        newCount++;
                    }
                });

                // Convert back to array
                const mergedRawData = Array.from(currentDataMap.values());
                const finalEnhancedData = processRawData(mergedRawData);

                // Re-sort
                finalEnhancedData.sort((a, b) => (b._timestamp || 0) - (a._timestamp || 0));

                setData(finalEnhancedData);
                sessionStorage.setItem('f3_data_cache_enhanced', JSON.stringify(finalEnhancedData));
                alert(`Đã import thành công!\n- Thêm mới: ${newCount} đơn\n- Cập nhật: ${updateCount} đơn\n\nLƯU Ý: Vui lòng nhấn nút "Lưu dữ liệu" để ghi lại các thay đổi lên hệ thống.`);

            } catch (error) {
                console.error("Import Error:", error);
                alert("Lỗi khi đọc file Excel.");
            }
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsBinaryString(file);
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
        let filtered = data;

        // 1. Filter by Date Range
        if (fromDate || toDate) {
            const start = fromDate ? new Date(fromDate).getTime() : -Infinity;
            const end = toDate ? new Date(toDate).getTime() + 86400000 : Infinity; // Include the end date

            filtered = filtered.filter(item => {
                const itemTime = item._timestamp || 0;
                return itemTime >= start && itemTime < end;
            });
        }

        // 2. Filter by Attributes
        if (selectedMarket) {
            filtered = filtered.filter(item => item.Khu_vực === selectedMarket);
        }
        if (selectedProduct) {
            filtered = filtered.filter(item => item.Mặt_hàng === selectedProduct);
        }
        if (selectedTeam) {
            filtered = filtered.filter(item => item.Team === selectedTeam);
        }

        // 3. Search Term
        if (debouncedSearchTerm) {
            const normalizedSearch = normalizeString(debouncedSearchTerm);
            const searchTokens = normalizedSearch.split(/\s+/).filter(t => t.length > 0);
            filtered = filtered.filter(item => {
                if (!item._searchStr) return false;
                return searchTokens.every(token => item._searchStr!.includes(token));
            });
        }

        return filtered;
    }, [data, debouncedSearchTerm, fromDate, toDate, selectedMarket, selectedProduct, selectedTeam]);

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
        // Prepare export data (Flattening if needed or just using raw)
        // We'll export roughly what the table shows + extra fields
        const exportData = processedData.map(item => ({
            'Mã đơn hàng': item.Mã_đơn_hàng,
            'Ngày lên đơn': item.Ngày_lên_đơn,
            'Name': item.Name,
            'Mặt hàng': item.Mặt_hàng,
            'Khu vực': item.Khu_vực,
            'Thành phố': item.City,
            'Bang': item.State,
            'Phí Chung': item.Phí_Chung,
            'Phí Bay': item.Phí_bay,
            'Thuê TK': item.Thuê_TK,
            'Tiền Hàng': item.Tiền_Hàng,
            'Ship': item.Phí_ship,
            'Tiền đã đối soát': item.Tiền_Việt_đã_đối_soát,
            'KT xác nhận': item.Kế_toán_xác_nhận_thu_tiền_về,
            'Tổng tiền VNĐ': item.Tổng_tiền_VNĐ,
            'Trạng thái cuối cùng': item.Trạng_thái_giao_hàng_NB,
            'Chi nhánh': item.Team
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
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
                        {Object.entries(exchangeRates).map(([currency, value]) => (
                            <div key={currency} className="flex flex-col gap-1">
                                <label className="font-semibold text-slate-500 text-center">{currency}</label>
                                <input
                                    type="number"
                                    value={value}
                                    onChange={(e) => handleRateChange(currency as keyof ExchangeRates, e.target.value)}
                                    className="border border-slate-300 rounded px-1 py-1 text-center w-16 focus:border-blue-500 outline-none"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Header Actions */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col justify-between gap-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Dữ liệu F3</h2>
                            <p className="text-sm text-slate-500 mt-1">Danh sách đơn hàng từ hệ thống</p>
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                accept=".xlsx, .xls"
                                className="hidden"
                            />
                            <button
                                onClick={handleRefresh}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
                            >
                                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Làm mới
                            </button>
                            <button
                                onClick={handleImportClick}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                                <Upload size={16} /> Import Excel
                            </button>
                            <button
                                onClick={handleExport}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                            >
                                <Download size={16} /> Xuất Excel
                            </button>
                        </div>
                    </div>

                    {/* FILTERS BAR: TIME, MARKET, PRODUCT, FFM */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-2">
                        {/* 1. From Date */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Từ ngày</label>
                            <input
                                type="date"
                                className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none"
                                value={fromDate}
                                onChange={e => setFromDate(e.target.value)}
                            />
                        </div>

                        {/* 2. To Date */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Đến ngày</label>
                            <input
                                type="date"
                                className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none"
                                value={toDate}
                                onChange={e => setToDate(e.target.value)}
                            />
                        </div>

                        {/* 3. Market */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Thị trường</label>
                            <select
                                className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none bg-white"
                                value={selectedMarket}
                                onChange={e => setSelectedMarket(e.target.value)}
                            >
                                <option value="">Tất cả</option>
                                {uniqueMarkets.map(m => (
                                    <option key={m} value={m}>{m === 'US' ? 'US' : m === 'Canada' ? 'Canada' : m}</option>
                                ))}
                            </select>
                        </div>

                        {/* 4. Product */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Sản phẩm</label>
                            <select
                                className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none bg-white"
                                value={selectedProduct}
                                onChange={e => setSelectedProduct(e.target.value)}
                            >
                                <option value="">Tất cả</option>
                                {uniqueProducts.map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>

                        {/* 5. FFM (Team) */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">FFM (Team)</label>
                            <select
                                className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none bg-white"
                                value={selectedTeam}
                                onChange={e => setSelectedTeam(e.target.value)}
                            >
                                <option value="">Tất cả</option>
                                {uniqueTeams.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
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
                                    <th className="px-4 py-3 text-center whitespace-nowrap border border-green-800 bg-[#1e7e34]">Thao tác</th>
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
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        className="text-blue-500 hover:text-blue-700"
                                                        title="Xem chi tiết"
                                                        onClick={() => setViewingItem(item)}
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <button
                                                        className="text-yellow-500 hover:text-yellow-700"
                                                        title="Sửa"
                                                        onClick={() => setEditingItem({ ...item })}
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                </div>
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
            {/* Modal View Details */}
            {viewingItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800">Chi tiết đơn hàng: {viewingItem.Mã_đơn_hàng}</h3>
                            <button onClick={() => setViewingItem(null)} className="text-slate-500 hover:text-slate-700">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.entries(viewingItem).map(([key, value]) => {
                                if (key.startsWith('_')) return null; // Skip internal fields
                                return (
                                    <div key={key} className="flex flex-col border-b border-slate-100 pb-2">
                                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{key.replace(/_/g, ' ')}</span>
                                        <span className="text-sm text-slate-800 break-words font-medium">
                                            {typeof value === 'number' ? formatCurrency(value) : ((value as any) || '-')}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                            <button
                                onClick={() => setViewingItem(null)}
                                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Edit Item */}
            {editingItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800">Sửa đơn hàng: {editingItem.Mã_đơn_hàng}</h3>
                            <button onClick={() => setEditingItem(null)} className="text-slate-500 hover:text-slate-700">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Render inputs for simplified editing of key fields */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-semibold text-slate-500">Mã đơn hàng</label>
                                <input
                                    type="text"
                                    value={editingItem.Mã_đơn_hàng || ''}
                                    disabled
                                    className="border border-slate-300 rounded px-2 py-1.5 bg-slate-100 text-slate-500"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-semibold text-slate-500">Ngày lên đơn</label>
                                <input
                                    type="date"
                                    value={editingItem.Ngày_lên_đơn ? editingItem.Ngày_lên_đơn.split('T')[0] : ''}
                                    onChange={(e) => setEditingItem({ ...editingItem, Ngày_lên_đơn: e.target.value })}
                                    className="border border-slate-300 rounded px-2 py-1.5"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-semibold text-slate-500">Mặt hàng</label>
                                <input
                                    type="text"
                                    value={editingItem.Mặt_hàng || ''}
                                    onChange={(e) => setEditingItem({ ...editingItem, Mặt_hàng: e.target.value })}
                                    className="border border-slate-300 rounded px-2 py-1.5"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-semibold text-slate-500">Chi nhánh (Team)</label>
                                <input
                                    type="text"
                                    value={editingItem.Team || ''}
                                    onChange={(e) => setEditingItem({ ...editingItem, Team: e.target.value })}
                                    className="border border-slate-300 rounded px-2 py-1.5"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-semibold text-slate-500">Khu vực</label>
                                <select
                                    value={editingItem.Khu_vực || ''}
                                    onChange={(e) => setEditingItem({ ...editingItem, Khu_vực: e.target.value })}
                                    className="border border-slate-300 rounded px-2 py-1.5 bg-white"
                                >
                                    <option value="US">US</option>
                                    <option value="Canada">Canada</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-semibold text-slate-500">Tổng tiền VNĐ</label>
                                <input
                                    type="number"
                                    value={editingItem.Tổng_tiền_VNĐ || 0}
                                    onChange={(e) => setEditingItem({ ...editingItem, Tổng_tiền_VNĐ: Number(e.target.value) })}
                                    className="border border-slate-300 rounded px-2 py-1.5"
                                />
                            </div>
                            <div className="flex flex-col gap-1 md:col-span-2">
                                <label className="text-xs font-semibold text-slate-500">Trạng thái cuối cùng</label>
                                <select
                                    className="border border-slate-300 rounded px-2 py-1.5 bg-white w-full"
                                    value={editingItem.Trạng_thái_giao_hàng_NB || ""}
                                    onChange={(e) => setEditingItem({ ...editingItem, Trạng_thái_giao_hàng_NB: e.target.value })}
                                >
                                    <option value="">-- Chọn --</option>
                                    <option value="Giao Thành Công">Giao Thành Công</option>
                                    <option value="Đang Giao">Đang Giao</option>
                                    <option value="Chưa Giao">Chưa Giao</option>
                                    <option value="Hủy">Hủy</option>
                                    <option value="Hoàn">Hoàn</option>
                                </select>
                            </div>

                            {/* Dynamic fields for other properties only if needed - keeping it simple for now as requested */}
                        </div>
                        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
                            <button
                                onClick={() => setEditingItem(null)}
                                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                                Lưu Thay Đổi
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
