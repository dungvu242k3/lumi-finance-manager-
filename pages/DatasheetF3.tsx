import { Download, Edit, Eye, RefreshCw, Save, Search, Settings, Upload, X } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

// Column Definitions with Field Mapping
const COLUMN_DEFS: { id: string; label: string; field?: keyof F3Data }[] = [
    { id: 'stt', label: 'STT' },
    { id: 'ma_don_hang', label: 'Mã đơn hàng', field: 'Mã_đơn_hàng' },
    { id: 'ngay_len_don', label: 'Ngày lên đơn', field: 'Ngày_lên_đơn' },
    { id: 'mat_hang', label: 'Mặt hàng', field: 'Mặt_hàng' },
    { id: 'name', label: 'Tên khách hàng', field: 'Name' },
    { id: 'khu_vuc', label: 'Khu vực', field: 'Khu_vực' },
    { id: 'city', label: 'City', field: 'City' },
    { id: 'state', label: 'State', field: 'State' },
    { id: 'zipcode', label: 'Zipcode', field: 'Zipcode' },
    { id: 'team', label: 'Chi nhánh (Team)', field: 'Team' },
    { id: 'phi_ffm', label: 'Phí FFM', field: 'Phí_FFM' },
    { id: 'phi_chung', label: 'Chi phí chung', field: 'Phí_Chung' },
    { id: 'phi_bay', label: 'Phí bay', field: 'Phí_bay' },
    { id: 'thue_tk', label: 'Phí thuê TK', field: 'Thuê_TK' },
    { id: 'tien_hang', label: 'Tiền hàng', field: 'Tiền_Hàng' },
    { id: 'ship', label: 'Ship', field: 'Phí_ship' },
    { id: 'doi_soat', label: 'Tiền đã đối soát', field: 'Tiền_Việt_đã_đối_soát' },
    { id: 'kt_xac_nhan', label: 'KT xác nhận', field: 'Kế_toán_xác_nhận_thu_tiền_về' },
    { id: 'tong_tien', label: 'Tổng tiền VNĐ', field: 'Tổng_tiền_VNĐ' },
    { id: 'trang_thai_nb', label: 'Trạng thái NB', field: 'Trạng_thái_giao_hàng_NB' },
    { id: 'ghi_chu', label: 'Ghi chú', field: 'Ghi_chú' },
    { id: 'hinh_thuc_tt', label: 'HT thanh toán', field: 'Hình_thức_thanh_toán' },
    { id: 'ket_qua_check', label: 'Kết quả Check', field: 'Kết_quả_Check' },
    { id: 'ly_do', label: 'Lý do', field: 'Lý_do' },
    { id: 'ma_tracking', label: 'Mã Tracking', field: 'Mã_Tracking' },
    { id: 'nv_van_don', label: 'NV Vận đơn', field: 'NV_Vận_đơn' },
    { id: 'nv_marketing', label: 'NV Marketing', field: 'Nhân_viên_Marketing' },
    { id: 'sale_staff', label: 'NV Sale', field: 'Sale_Staff' },
    { id: 'cskh', label: 'CSKH', field: 'CSKH' },
    { id: 'thoi_gian_cutoff', label: 'Time Cutoff', field: 'Thời_gian_cutoff' },
    { id: 'trang_thai_thu_tien', label: 'TT Thu tiền', field: 'Trạng_thái_thu_tiền' },
    { id: 'dv_van_chuyen', label: 'ĐV Vận chuyển', field: 'Đơn_vị_vận_chuyển' },
    { id: 'thao_tac', label: 'Thao tác' },
];

// Reverse field mapping: F3Data field -> Supabase column name
const F3_TO_SUPABASE_FIELD: Record<string, string> = {
    'Phí_FFM': 'warehouse_fee',
    'Phí_Chung': 'general_fee',
    'Phí_bay': 'flight_fee',
    'Thuê_TK': 'account_rental_fee',
    'Tiền_Hàng': 'goods_amount',
    'Phí_ship': 'shipping_fee',
    'Tiền_Việt_đã_đối_soát': 'reconciled_vnd',
    'Tổng_tiền_VNĐ': 'total_amount_vnd',
    'Kế_toán_xác_nhận_thu_tiền_về': 'accountant_confirm',
    'Trạng_thái_giao_hàng_NB': 'delivery_status_nb',
};

// Dropdown options for KT xác nhận
const KT_XAC_NHAN_OPTIONS = ['', 'Đã xác nhận', 'Chưa xác nhận', 'Đang xử lý'];

// Helper to remove accents and normalize string for search
const normalizeString = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

// Cached NumberFormat instance — avoid re-creating on every render
const currencyFormatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

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

    const [editingCell, setEditingCell] = useState<{ id: string, field: keyof F3Data } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Selection State
    const [selection, setSelection] = useState<{ start: { r: number, c: number }, end: { r: number, c: number } } | null>(null);
    const isSelecting = useRef(false);

    // Refs for event handler data access (avoid re-registering listeners on every data change)
    const dataRef = useRef(data);
    const selectionRef = useRef(selection);
    const editingCellRef = useRef(editingCell);
    const processedDataRef = useRef<F3DataEnhanced[]>([]);
    const paginatedDataRef = useRef<F3DataEnhanced[]>([]);
    const visibleColumnDefsRef = useRef(COLUMN_DEFS);
    const currentPageRef = useRef(currentPage);
    const itemsPerPageRef = useRef(itemsPerPage);


    // Column Settings State
    const [showColumnSettings, setShowColumnSettings] = useState(false);
    const settingsRef = useRef<HTMLDivElement>(null);

    // ... existing useEffect ...



    // Close settings when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
                setShowColumnSettings(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
        const saved = localStorage.getItem('f3_visible_columns');
        return saved ? JSON.parse(saved) : COLUMN_DEFS.map(c => c.id);
    });

    const toggleColumn = (columnId: string) => {
        setVisibleColumns(prev => {
            const newCols = prev.includes(columnId)
                ? prev.filter(c => c !== columnId)
                : [...prev, columnId];
            localStorage.setItem('f3_visible_columns', JSON.stringify(newCols));
            return newCols;
        });
    };

    // Compute visible column definitions
    const visibleColumnDefs = useMemo(() => {
        return COLUMN_DEFS.filter(c => visibleColumns.includes(c.id));
    }, [visibleColumns]);

    // Selection Handlers (Moved here for clarity but logic is independent)
    const handleMouseDown = (r: number, c: number) => {
        isSelecting.current = true;
        setSelection({ start: { r, c }, end: { r, c } });
    };

    const handleMouseEnter = (r: number, c: number) => {
        if (isSelecting.current) {
            setSelection(prev => prev ? { ...prev, end: { r, c } } : null);
        }
    };

    const handleMouseUp = () => {
        isSelecting.current = false;
    };


    const isColVisible = (id: string) => visibleColumns.includes(id);

    // Filters
    const getToday = () => new Date().toISOString().split('T')[0];
    const getTwoDaysAgo = () => {
        const d = new Date();
        d.setDate(d.getDate() - 2);
        return d.toISOString().split('T')[0];
    };

    const [fromDate, setFromDate] = useState(getTwoDaysAgo());
    const [toDate, setToDate] = useState(getToday());
    const debouncedFromDate = useDebounce(fromDate, 500);
    const debouncedToDate = useDebounce(toDate, 500);
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

    // Helper: Parse any date format to timestamp
    const parseSmartDate = (dateStr: string | undefined): number => {
        if (!dateStr) return 0;

        let d = new Date(dateStr);
        if (!isNaN(d.getTime())) return d.getTime();

        // Handle DD/MM/YYYY or M/D/YYYY
        // We will assume M/D/YYYY if primary check fails
        if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
                // Try M/D/YYYY first (US format common in spreadsheets/system exports)
                const m = parseInt(parts[0], 10) - 1;
                const day = parseInt(parts[1], 10);
                const year = parseInt(parts[2], 10);
                d = new Date(year, m, day);
                if (!isNaN(d.getTime())) return d.getTime();
            }
        }
        return 0;
    };

    // Helper to process raw data into enhanced data
    const processRawData = (rawData: (F3Data & { id?: string })[]): F3DataEnhanced[] => {
        return rawData.map(item => ({
            ...item,
            _timestamp: parseSmartDate(item.Ngày_lên_đơn), // Use smart parser
            _searchStr: normalizeString(`
                ${item.Mã_đơn_hàng || ""}
                ${item.City || ""} ${item.State || ""}
                ${item.Mặt_hàng || ""}
                ${item.Sale_Staff || ""} ${item.CSKH || ""}
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

    // Helper to format date for input (YYYY-MM-DD)
    const formatDateForInput = (dateStr?: string) => {
        if (!dateStr) return '';
        try {
            // Handle ISO string
            if (dateStr.includes('T')) {
                return dateStr.split('T')[0];
            }
            // Handle DD/MM/YYYY
            if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    // Assuming DD/MM/YYYY or M/D/YYYY
                    const day = parts[0].padStart(2, '0');
                    const month = parts[1].padStart(2, '0');
                    const year = parts[2];
                    return `${year}-${month}-${day}`;
                }
            }
            // Fallback: try Date object
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
                return d.toISOString().split('T')[0];
            }
        } catch (e) {
            console.warn('Error formatting date:', dateStr, e);
        }
        return '';
    };

    const fetchData = async (useCache = true) => {
        setLoading(true);

        try {
            // Update: Switch to Supabase 'orders' table
            // We use simple fetch with headers for RLS/Auth if needed (Anon key for now)
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            if (!supabaseUrl || !supabaseKey) {
                console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
                setLoading(false);
                return;
            }

            const fetchOrders = async () => {
                // Fetch last 2000 items (or more if pagination needed later) using order by created_at desc
                // Assuming 'created_at' exists, or we use standard select
                // We'll try to select * to see all columns first
                const url = `${supabaseUrl}/rest/v1/orders?select=*&limit=2000&order=created_at.desc.nullslast`;

                try {
                    const res = await fetch(url, {
                        headers: {
                            'apikey': supabaseKey,
                            'Authorization': `Bearer ${supabaseKey}`
                        }
                    });
                    if (res.ok) return res;
                    throw new Error(`Request failed: ${res.statusText}`);
                } catch (e) {
                    console.error('Fetch orders failed', e);
                    return null;
                }
            };

            const fetchRates = async () => {
                try {
                    const url = `${supabaseUrl}/rest/v1/exchange_rates?select=*&limit=1`;
                    const res = await fetch(url, {
                        headers: {
                            'apikey': supabaseKey,
                            'Authorization': `Bearer ${supabaseKey}`
                        }
                    });
                    if (res.ok) return res.json();
                } catch (e) {
                    console.error('Fetch rates failed', e);
                }
                return null;
            };

            const [ordersJson, ratesData] = await Promise.all([
                fetchOrders().then(res => res ? res.json() : null),
                fetchRates()
            ]);

            const ratesJson = Array.isArray(ratesData) && ratesData.length > 0 ? ratesData[0] : null;

            if (ordersJson) {
                console.log("Supabase Orders Data Sample:", ordersJson[0]); // Debug logging

                // Map Supabase 'orders' columns to 'F3Data' structure
                // Precise Mapping based on User Schema
                const rawData = ordersJson.map((order: any) => ({
                    ...order, // Keep original fields for reference

                    // 1. THÔNG TIN ĐỊNH DANH & HỆ THỐNG
                    Mã_đơn_hàng: order.order_code || '', // order_code
                    Ngày_lên_đơn: order.order_date || order.created_at || '', // order_date

                    // 2. THÔNG TIN KHÁCH HÀNG
                    Name: order.customer_name || '', // customer_name
                    Khu_vực: order.country || '', // country (Khu vực thị trường)
                    City: order.city || '', // city
                    State: order.state || '', // state
                    Zipcode: order.zipcode || '', // zipcode

                    // 3. THÔNG TIN SẢN PHẨM
                    Mặt_hàng: order.product || order.product_main || '', // product (Tên sản phẩm chính)

                    // 5. THÔNG TIN NHÂN VIÊN & PHÂN CÔNG
                    Team: order.team || '', // team
                    NV_Vận_đơn: order.delivery_staff || '', // delivery_staff
                    Nhân_viên_Marketing: order.marketing_staff || '', // marketing_staff
                    Sale_Staff: order.sale_staff || '', // sale_staff
                    CSKH: order.cskh || '', // cskh

                    // 4. THÔNG TIN THANH TOÁN & TÀI CHÍNH
                    Phí_FFM: Number(order.warehouse_fee || 0), // warehouse_fee (Phí xử lý đóng hàng & lưu kho)
                    Phí_Chung: Number(order.general_fee || 0), // general_fee
                    Phí_bay: Number(order.flight_fee || 0), // flight_fee
                    Thuê_TK: Number(order.account_rental_fee || 0), // account_rental_fee
                    Tiền_Hàng: Number(order.goods_amount || 0), // goods_amount (Giá trị hàng hóa)
                    Phí_ship: Number(order.shipping_fee || 0), // shipping_fee (Phí ship thu từ khách) -> Mapping to 'Ship' column
                    Tiền_Việt_đã_đối_soát: Number(order.reconciled_vnd || 0), // reconciled_vnd
                    Tổng_tiền_VNĐ: Number(order.total_amount_vnd || 0), // total_amount_vnd

                    // 6. TRẠNG THÁI ĐƠN HÀNG & VẬN CHUYỂN
                    Kế_toán_xác_nhận_thu_tiền_về: order.accountant_confirm || '', // accountant_confirm
                    Trạng_thái_giao_hàng_NB: order.delivery_status_nb || '', // delivery_status_nb
                    Trạng_thái_thu_tiền: order.payment_status || '', // payment_status
                    Đơn_vị_vận_chuyển: order.shipping_unit || order.carrier || '', // shipping_unit (Đơn vị vận chuyển)
                    Thời_gian_cutoff: order.cutoff_time || '', // cutoff_time
                    Mã_Tracking: order.tracking_code || '', // tracking_code
                    Kết_quả_Check: order.check_result || '', // check_result

                    // 8. GHI CHÚ & LÝ DO
                    Ghi_chú: order.note || '', // note
                    Lý_do: order.reason || '', // reason

                    // Khác
                    Hình_thức_thanh_toán: order.payment_method_text || order.payment_method || '', // payment_method_text

                    // ID for internal use
                    id: order.id ? String(order.id) : undefined
                }));

                const enhancedData = processRawData(rawData);
                enhancedData.sort((a, b) => (b._timestamp || 0) - (a._timestamp || 0));

                setData(enhancedData);
            } else {
                setData([]);
            }

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
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            // 1. Get existing ID
            let id = null;
            try {
                const res = await fetch(`${supabaseUrl}/rest/v1/exchange_rates?select=id&limit=1`, {
                    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.length > 0) id = data[0].id;
                }
            } catch (e) { console.warn('Check existing rate failed', e); }

            // 2. Upsert
            const url = `${supabaseUrl}/rest/v1/exchange_rates${id ? `?id=eq.${id}` : ''}`;
            const method = id ? 'PATCH' : 'POST';

            await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Prefer': 'return=minimal'
                },
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





    const handleSaveEdit = async () => {
        if (!editingItem) return;

        try {
            // 1. Update/Create in Firebase
            let newId = editingItem.id;
            const { id, _searchStr, _timestamp, ...updateData } = editingItem;

            if (id) {
                // Update existing
                await fetch(`https://lumi-6dff7-default-rtdb.asia-southeast1.firebasedatabase.app/datasheet/F3/${id}.json`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updateData)
                });
            } else {
                // Create new
                const res = await fetch(`https://lumi-6dff7-default-rtdb.asia-southeast1.firebasedatabase.app/datasheet/F3.json`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updateData)
                });
                const resData = await res.json();
                newId = resData.name;
            }

            // 2. Update local state
            const newData = data.map(item =>
                item.Mã_đơn_hàng === editingItem.Mã_đơn_hàng ? { ...editingItem, id: newId } : item
            );

            // Re-process to update search string and timestamp if changed
            const processedNewData = processRawData(newData);
            // Re-sort
            processedNewData.sort((a, b) => (b._timestamp || 0) - (a._timestamp || 0));

            setData(processedNewData);
            // sessionStorage removed

            setEditingItem(null);
            alert("Đã cập nhật đơn hàng thành công!");

        } catch (error) {
            console.error("Update Error:", error);
            alert("Lỗi khi cập nhật đơn hàng.");
        }
    };

    const handleSaveAll = async () => {
        const newItems = data.filter(item => !item.id);
        if (newItems.length === 0) {
            alert("Không có dữ liệu mới cần lưu!");
            return;
        }

        if (!confirm(`Bạn có chắc muốn lưu ${newItems.length} đơn hàng mới vào hệ thống?`)) return;

        setIsSaving(true);
        try {
            let savedCount = 0;
            const updatedData = [...data];

            // Process in chunks to avoid overwhelming calls if many
            // Using a simple loop for clarity
            for (const item of newItems) {
                const { id, _searchStr, _timestamp, ...postData } = item;
                const res = await fetch(`https://lumi-6dff7-default-rtdb.asia-southeast1.firebasedatabase.app/datasheet/F3.json`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(postData)
                });
                const resData = await res.json();

                // Update local item with new ID
                const index = updatedData.findIndex(d => d.Mã_đơn_hàng === item.Mã_đơn_hàng);
                if (index !== -1) {
                    updatedData[index] = { ...updatedData[index], id: resData.name };
                }
                savedCount++;
            }

            setData(updatedData);
            // sessionStorage removed
            alert(`Đã lưu thành công ${savedCount} đơn hàng mới!`);

        } catch (error) {
            console.error("Save All Error:", error);
            alert("Có lỗi xảy ra khi lưu dữ liệu.");
        } finally {
            setIsSaving(false);
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
                        Phí_FFM: Number(row['Phí FFM'] || row['Phí_FFM'] || 0),
                        Phí_Chung: Number(row['Chi phí chung'] || row['Phí Chung'] || row['Phí_Chung'] || 0),
                        Phí_bay: Number(row['Phí bay'] || row['Phí Bay'] || row['Phí_bay'] || 0),
                        Thuê_TK: Number(row['Phí thuê TK'] || row['Thuê TK'] || row['Thuê_TK'] || 0),
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
                // sessionStorage removed
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
    }, []); // Run once on mount

    // Re-fetch when dates change (debounced)
    useEffect(() => {
        // Avoid double fetch on mount by checking if it's the initial render (optional, but fetchData handles it)
        // Here we just accept one potential extra call or rely on the fact that initial state matches
        fetchData(false);
    }, [debouncedFromDate, debouncedToDate]);

    const handleRefresh = () => {
        fetchData(false); // Force hard refresh
    };

    const formatCurrency = useCallback((amount: number) => {
        return currencyFormatter.format(amount);
    }, []);

    const normalizeString = (str: string) => {
        return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
    };

    // Save a single cell value to Supabase
    const saveCellToSupabase = useCallback(async (itemId: string, field: keyof F3Data, value: number) => {
        const supabaseField = F3_TO_SUPABASE_FIELD[field as string];
        if (!supabaseField || !itemId) return;

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseKey) return;

        try {
            const res = await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${itemId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({ [supabaseField]: value })
            });
            if (!res.ok) {
                console.error('Save cell failed:', res.statusText);
            }
        } catch (error) {
            console.error('Error saving cell to Supabase:', error);
        }
    }, []);

    // 4. Excel-like Copy/Paste & Edit Logic
    const handleCellChange = useCallback((id: string, field: keyof F3Data, value: string) => {
        // Strip everything except digits and minus sign (dots are thousands separators in VN format)
        const rawValue = value.replace(/[^0-9-]/g, '');
        const numValue = parseInt(rawValue, 10);
        const finalValue = isNaN(numValue) ? 0 : numValue;

        setData(prev => {
            const idx = prev.findIndex(item => item.id === id);
            if (idx === -1) return prev;
            const newData = [...prev];
            newData[idx] = { ...newData[idx], [field]: finalValue };
            return newData;
        });
    }, []);

    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement> | React.ClipboardEvent<HTMLInputElement>, id: string, startColId: string) => {
        e.preventDefault();
        const clipboardData = e.clipboardData.getData('text/plain');
        if (!clipboardData) return;

        const rows = clipboardData.split(/\r\n|\n|\r/).filter(row => row.trim() !== '');
        if (rows.length === 0) return;

        // Find start indices
        const startRowIndex = processedData.findIndex(item => item.id === id);
        if (startRowIndex === -1) return;

        const startColIndex = visibleColumnDefs.findIndex(c => c.id === startColId);
        if (startColIndex === -1) return;

        setData(prevData => {
            const newData = [...prevData];
            const dataMap = new Map(newData.map(item => [item.id!, item]));
            const changedItems: { id: string, updates: Record<string, any> }[] = [];

            rows.forEach((rowVal, rOffset) => {
                const targetRowIndex = startRowIndex + rOffset;
                if (targetRowIndex >= processedData.length) return;
                const targetItem = processedData[targetRowIndex];
                if (!targetItem || !targetItem.id) return;

                const cells = rowVal.split('\t');
                const existing = dataMap.get(targetItem.id)!;
                let updatedItem = { ...existing };
                let hasChange = false;
                const supabaseUpdates: Record<string, any> = {};

                cells.forEach((cellVal, cOffset) => {
                    const targetColIndex = startColIndex + cOffset;
                    if (targetColIndex >= visibleColumnDefs.length) return;

                    const colDef = visibleColumnDefs[targetColIndex];
                    if (!colDef.field) return;

                    const isMoney = ['phi_ffm', 'phi_chung', 'phi_bay', 'thue_tk', 'tien_hang', 'ship', 'doi_soat', 'tong_tien'].includes(colDef.id);
                    const supabaseField = F3_TO_SUPABASE_FIELD[colDef.field as string];

                    if (isMoney) {
                        const rawValue = cellVal.replace(/[^0-9.-]/g, '');
                        const numValue = parseFloat(rawValue);
                        if (!isNaN(numValue)) {
                            updatedItem = { ...updatedItem, [colDef.field]: numValue };
                            hasChange = true;
                            if (supabaseField) supabaseUpdates[supabaseField] = numValue;
                        }
                    } else {
                        updatedItem = { ...updatedItem, [colDef.field]: cellVal.trim() };
                        hasChange = true;
                        if (supabaseField) supabaseUpdates[supabaseField] = cellVal.trim();
                    }
                });

                if (hasChange) {
                    dataMap.set(targetItem.id, updatedItem);
                    if (Object.keys(supabaseUpdates).length > 0) {
                        changedItems.push({ id: targetItem.id, updates: supabaseUpdates });
                    }
                }
            });

            // Batch save to Supabase
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
            if (supabaseUrl && supabaseKey && changedItems.length > 0) {
                changedItems.forEach(({ id, updates }) => {
                    fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${id}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': supabaseKey,
                            'Authorization': `Bearer ${supabaseKey}`,
                            'Prefer': 'return=minimal'
                        },
                        body: JSON.stringify(updates)
                    }).catch(err => console.error('Paste save failed for', id, err));
                });
            }

            return Array.from(dataMap.values());
        });
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

    // Sync refs with latest state for use in stable event handlers
    useEffect(() => {
        dataRef.current = data;
    }, [data]);
    useEffect(() => {
        selectionRef.current = selection;
    }, [selection]);
    useEffect(() => {
        editingCellRef.current = editingCell;
    }, [editingCell]);
    useEffect(() => {
        processedDataRef.current = processedData;
    }, [processedData]);
    useEffect(() => {
        paginatedDataRef.current = paginatedData;
    }, [paginatedData]);
    useEffect(() => {
        visibleColumnDefsRef.current = visibleColumnDefs;
    }, [visibleColumnDefs]);
    useEffect(() => {
        currentPageRef.current = currentPage;
    }, [currentPage]);

    // Global Key + Paste Handler (registered ONCE, uses refs for latest data)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
                const sel = selectionRef.current;
                if (sel && !editingCellRef.current) {
                    e.preventDefault();

                    const startR = Math.min(sel.start.r, sel.end.r);
                    const endR = Math.max(sel.start.r, sel.end.r);
                    const startC = Math.min(sel.start.c, sel.end.c);
                    const endC = Math.max(sel.start.c, sel.end.c);
                    const cols = visibleColumnDefsRef.current;
                    const pageData = paginatedDataRef.current;
                    const page = currentPageRef.current;
                    const perPage = itemsPerPageRef.current;

                    const rows = [];
                    for (let r = startR; r <= endR; r++) {
                        const rowData = [];
                        for (let c = startC; c <= endC; c++) {
                            const colId = cols[c].id;
                            const item = pageData[r];
                            let value = '';

                            if (colId === 'stt') value = ((page - 1) * perPage + r + 1).toString();
                            else if (colId === 'ma_don_hang') value = item?.Mã_đơn_hàng || '';
                            else if (colId === 'ngay_len_don') value = formatDateDisplay(item?._timestamp);
                            else if (colId === 'mat_hang') value = item?.Mặt_hàng || '';
                            else if (['phi_ffm', 'phi_chung', 'phi_bay', 'thue_tk', 'tien_hang', 'ship', 'doi_soat', 'kt_xac_nhan', 'tong_tien'].includes(colId)) {
                                const fieldMap: Record<string, keyof F3Data> = {
                                    'phi_ffm': 'Phí_FFM', 'phi_chung': 'Phí_Chung', 'phi_bay': 'Phí_bay',
                                    'thue_tk': 'Thuê_TK', 'tien_hang': 'Tiền_Hàng', 'ship': 'Phí_ship',
                                    'doi_soat': 'Tiền_Việt_đã_đối_soát', 'tong_tien': 'Tổng_tiền_VNĐ'
                                };
                                const field = fieldMap[colId];
                                if (field) value = currencyFormatter.format(item?.[field] as number || 0).replace('₫', '').trim();
                                else value = (item as any)[colId] || '';
                            } else {
                                value = (item as any)[colId] || '';
                                if (colId === 'name') value = item?.Name || '';
                                if (colId === 'khu_vuc') value = item?.Khu_vực === 'US' ? 'US' : 'Canada';
                                if (colId === 'team') value = item?.Team || '';
                            }
                            rowData.push(value);
                        }
                        rows.push(rowData.join('\t'));
                    }
                    navigator.clipboard.writeText(rows.join('\n'));
                }
            }
        };

        // Global Paste Handler
        const handleGlobalPaste = (e: ClipboardEvent) => {
            const sel = selectionRef.current;
            if (!sel || editingCellRef.current) return;

            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

            e.preventDefault();
            const clipboardData = e.clipboardData?.getData('text/plain');
            if (!clipboardData) return;

            const rows = clipboardData.split(/\r\n|\n|\r/).filter(row => row.trim() !== '');
            if (rows.length === 0) return;

            const startR = Math.min(sel.start.r, sel.end.r);
            const startC = Math.min(sel.start.c, sel.end.c);
            const cols = visibleColumnDefsRef.current;
            const procData = processedDataRef.current;
            const page = currentPageRef.current;
            const perPage = itemsPerPageRef.current;

            const pageOffset = (page - 1) * perPage;
            const startRowIndex = pageOffset + startR;
            const startColIndex = startC;

            if (startRowIndex >= procData.length) return;
            if (startColIndex >= cols.length) return;

            setData(prevData => {
                const newData = [...prevData];
                const dataMap = new Map(newData.map(item => [item.id!, item]));
                const changedItems: { id: string, updates: Record<string, any> }[] = [];

                rows.forEach((rowVal, rOffset) => {
                    const targetRowIndex = startRowIndex + rOffset;
                    if (targetRowIndex >= procData.length) return;
                    const targetItem = procData[targetRowIndex];
                    if (!targetItem || !targetItem.id) return;

                    const cells = rowVal.split('\t');
                    const existing = dataMap.get(targetItem.id)!;
                    if (!existing) return;
                    let updatedItem = { ...existing };
                    let hasChange = false;
                    const supabaseUpdates: Record<string, any> = {};

                    cells.forEach((cellVal, cOffset) => {
                        const targetColIndex = startColIndex + cOffset;
                        if (targetColIndex >= cols.length) return;

                        const colDef = cols[targetColIndex];
                        if (!colDef.field) return;

                        const isMoney = ['phi_ffm', 'phi_chung', 'phi_bay', 'thue_tk', 'tien_hang', 'ship', 'doi_soat', 'tong_tien'].includes(colDef.id);
                        const supabaseField = F3_TO_SUPABASE_FIELD[colDef.field as string];

                        if (isMoney) {
                            const rawValue = cellVal.replace(/[^0-9.-]/g, '');
                            const numValue = parseFloat(rawValue);
                            if (!isNaN(numValue)) {
                                updatedItem = { ...updatedItem, [colDef.field]: numValue };
                                hasChange = true;
                                if (supabaseField) supabaseUpdates[supabaseField] = numValue;
                            }
                        } else {
                            updatedItem = { ...updatedItem, [colDef.field]: cellVal.trim() };
                            hasChange = true;
                            if (supabaseField) supabaseUpdates[supabaseField] = cellVal.trim();
                        }
                    });

                    if (hasChange) {
                        dataMap.set(targetItem.id, updatedItem);
                        if (Object.keys(supabaseUpdates).length > 0) {
                            changedItems.push({ id: targetItem.id, updates: supabaseUpdates });
                        }
                    }
                });

                // Batch save to Supabase
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
                if (supabaseUrl && supabaseKey && changedItems.length > 0) {
                    changedItems.forEach(({ id, updates }) => {
                        fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${id}`, {
                            method: 'PATCH',
                            headers: {
                                'Content-Type': 'application/json',
                                'apikey': supabaseKey,
                                'Authorization': `Bearer ${supabaseKey}`,
                                'Prefer': 'return=minimal'
                            },
                            body: JSON.stringify(updates)
                        }).catch(err => console.error('Paste save failed for', id, err));
                    });
                }

                return Array.from(dataMap.values());
            });
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('paste', handleGlobalPaste);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('paste', handleGlobalPaste);
        };
    }, []); // Empty deps — registered once, reads from refs


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
            'Chi nhánh': item.Team,
            'NV Sale': item.Sale_Staff,
            'CSKH': item.CSKH
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "F3_Data");
        XLSX.writeFile(wb, `F3_Data_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const formatDateDisplay = (timestamp?: number) => {
        if (!timestamp) return '-';
        const d = new Date(timestamp);
        if (isNaN(d.getTime())) return '-';
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    };

    // Helper to render money cell with seamless edit
    const renderMoneyCell = (item: F3DataEnhanced, field: keyof F3Data, colId: string) => {
        const isEditing = editingCell?.id === item.id && editingCell?.field === field;
        const value = item[field] as number || 0;

        if (isEditing) {
            return (
                <input
                    type="text"
                    className="w-full text-right bg-white outline-none ring-2 ring-blue-500 rounded px-1 z-10 relative"
                    value={value === 0 ? '' : value.toLocaleString('vi-VN')}
                    onChange={(e) => handleCellChange(item.id!, field, e.target.value)}
                    onBlur={() => {
                        const latestItem = dataRef.current.find(d => d.id === item.id);
                        const latestValue = (latestItem?.[field] as number) || 0;
                        saveCellToSupabase(item.id!, field, latestValue);
                        setEditingCell(null);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            const latestItem = dataRef.current.find(d => d.id === item.id);
                            const latestValue = (latestItem?.[field] as number) || 0;
                            saveCellToSupabase(item.id!, field, latestValue);
                            setEditingCell(null);
                        }
                    }}
                    autoFocus
                />
            );
        }

        return (
            <div
                className="w-full h-full min-h-[20px] outline-none cursor-text focus:bg-blue-50 focus:ring-1 focus:ring-blue-300 rounded px-1 transition-colors"
                tabIndex={0}
                onDoubleClick={() => setEditingCell({ id: item.id!, field })}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        setEditingCell({ id: item.id!, field });
                    }
                    if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
                        e.preventDefault();
                        navigator.clipboard.writeText(value.toLocaleString('vi-VN'));
                        // Optional: Show a small toast or visual feedback? 
                        // For now just copy.
                    }
                }}
                onPaste={(e) => {
                    handlePaste(e, item.id!, colId);
                }}
            >
                {formatCurrency(value)}
            </div>
        );
    };

    // Helper to render dropdown cell with inline edit
    const renderDropdownCell = (item: F3DataEnhanced, field: keyof F3Data, options: string[]) => {
        const isEditing = editingCell?.id === item.id && editingCell?.field === field;
        const value = (item[field] as string) || '';

        if (isEditing) {
            return (
                <select
                    className="w-full bg-white outline-none ring-2 ring-blue-500 rounded px-1 z-10 relative text-sm"
                    value={value}
                    onChange={(e) => {
                        const newValue = e.target.value;
                        setData(prev => {
                            const idx = prev.findIndex(d => d.id === item.id);
                            if (idx === -1) return prev;
                            const newData = [...prev];
                            newData[idx] = { ...newData[idx], [field]: newValue };
                            return newData;
                        });
                        // Save to Supabase
                        const supabaseField = F3_TO_SUPABASE_FIELD[field as string];
                        if (supabaseField && item.id) {
                            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                            const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
                            if (supabaseUrl && supabaseKey) {
                                fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${item.id}`, {
                                    method: 'PATCH',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'apikey': supabaseKey,
                                        'Authorization': `Bearer ${supabaseKey}`,
                                        'Prefer': 'return=minimal'
                                    },
                                    body: JSON.stringify({ [supabaseField]: newValue })
                                }).catch(err => console.error('Save dropdown failed:', err));
                            }
                        }
                        setEditingCell(null);
                    }}
                    onBlur={() => setEditingCell(null)}
                    autoFocus
                >
                    {options.map(opt => (
                        <option key={opt} value={opt}>{opt || '-- Chọn --'}</option>
                    ))}
                </select>
            );
        }

        return (
            <div
                className="w-full h-full min-h-[20px] outline-none cursor-pointer hover:bg-blue-50 rounded px-1 transition-colors"
                onClick={() => setEditingCell({ id: item.id!, field })}
            >
                {value || '-'}
            </div>
        );
    };

    // Helper to render inline text cell with edit
    const renderTextCell = (item: F3DataEnhanced, field: keyof F3Data) => {
        const isEditing = editingCell?.id === item.id && editingCell?.field === field;
        const value = (item[field] as string) || '';

        if (isEditing) {
            return (
                <input
                    type="text"
                    className="w-full bg-white outline-none ring-2 ring-blue-500 rounded px-1 z-10 relative text-sm"
                    defaultValue={value}
                    onBlur={(e) => {
                        const newValue = e.target.value.trim();
                        setData(prev => {
                            const idx = prev.findIndex(d => d.id === item.id);
                            if (idx === -1) return prev;
                            const newData = [...prev];
                            newData[idx] = { ...newData[idx], [field]: newValue };
                            return newData;
                        });
                        // Save to Supabase
                        const supabaseField = F3_TO_SUPABASE_FIELD[field as string];
                        if (supabaseField && item.id) {
                            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                            const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
                            if (supabaseUrl && supabaseKey) {
                                fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${item.id}`, {
                                    method: 'PATCH',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'apikey': supabaseKey,
                                        'Authorization': `Bearer ${supabaseKey}`,
                                        'Prefer': 'return=minimal'
                                    },
                                    body: JSON.stringify({ [supabaseField]: newValue })
                                }).catch(err => console.error('Save text cell failed:', err));
                            }
                        }
                        setEditingCell(null);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            (e.target as HTMLInputElement).blur();
                        }
                    }}
                    autoFocus
                />
            );
        }

        return (
            <div
                className="w-full h-full min-h-[20px] outline-none cursor-text hover:bg-blue-50 rounded px-1 transition-colors"
                onClick={() => setEditingCell({ id: item.id!, field })}
            >
                {value || '-'}
            </div>
        );
    };

    // Revised Render Cell Content
    const renderCellContent = (item: F3DataEnhanced, colId: string, actualIndex: number) => {
        switch (colId) {
            case 'stt': return actualIndex;
            case 'ma_don_hang': return item?.Mã_đơn_hàng || '-';
            case 'ngay_len_don': return formatDateDisplay(item?._timestamp);
            case 'mat_hang': return item?.Mặt_hàng || '-';
            case 'name': return item?.Name || '-';
            case 'khu_vuc': return item?.Khu_vực === 'US' ? 'US' : 'Canada';
            case 'city': return item?.City || '-';
            case 'state': return item?.State || '-';
            case 'zipcode': return item?.Zipcode || '-';
            case 'team': return item?.Team || '-';
            case 'phi_ffm': return renderMoneyCell(item, 'Phí_FFM', 'phi_ffm');
            case 'phi_chung': return renderMoneyCell(item, 'Phí_Chung', 'phi_chung');
            case 'phi_bay': return renderMoneyCell(item, 'Phí_bay', 'phi_bay');
            case 'thue_tk': return renderMoneyCell(item, 'Thuê_TK', 'thue_tk');
            case 'tien_hang': return renderMoneyCell(item, 'Tiền_Hàng', 'tien_hang');
            case 'ship': return renderMoneyCell(item, 'Phí_ship', 'ship');
            case 'doi_soat': return renderMoneyCell(item, 'Tiền_Việt_đã_đối_soát', 'doi_soat');
            case 'kt_xac_nhan': return renderDropdownCell(item, 'Kế_toán_xác_nhận_thu_tiền_về', KT_XAC_NHAN_OPTIONS);
            case 'tong_tien': return renderMoneyCell(item, 'Tổng_tiền_VNĐ', 'tong_tien');
            case 'trang_thai_nb': return renderTextCell(item, 'Trạng_thái_giao_hàng_NB');
            case 'ghi_chu': return item?.Ghi_chú || '-';
            case 'hinh_thuc_tt': return item?.Hình_thức_thanh_toán || '-';
            case 'ket_qua_check': return item?.Kết_quả_Check || '-';
            case 'ly_do': return item?.Lý_do || '-';
            case 'ma_tracking': return item?.Mã_Tracking || '-';
            case 'nv_van_don': return item?.NV_Vận_đơn || '-';
            case 'nv_marketing': return item?.Nhân_viên_Marketing || '-';
            case 'sale_staff': return item?.Sale_Staff || '-';
            case 'cskh': return item?.CSKH || '-';
            case 'thoi_gian_cutoff': return item?.Thời_gian_cutoff || '-';
            case 'trang_thai_thu_tien': return item?.Trạng_thái_thu_tiền || '-';
            case 'dv_van_chuyen': return item?.Đơn_vị_vận_chuyển || '-';
            case 'thao_tac': return (
                <div className="flex items-center justify-center gap-2">
                    <button className="text-blue-500 hover:text-blue-700" title="Xem chi tiết" onClick={(e) => { e.stopPropagation(); setViewingItem(item); }}>
                        <Eye size={16} />
                    </button>
                    <button className="text-yellow-500 hover:text-yellow-700" title="Sửa" onClick={(e) => { e.stopPropagation(); setEditingItem({ ...item }); }}>
                        <Edit size={16} />
                    </button>
                </div>
            );
            default: return '-';
        }
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
                        {Object.entries(exchangeRates)
                            .filter(([key]) => !['id', 'rate_name', 'last_update', 'created_at', 'updated_at', 'last_updated_by'].includes(key) && !key.startsWith('_'))
                            .map(([currency, rate]) => (
                                <div key={currency} className="flex flex-col items-center">
                                    <label className="text-xs font-semibold text-slate-500 mb-1">{currency}</label>
                                    <input
                                        type="number"
                                        value={rate}
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
                                onClick={handleSaveAll}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                                <Save size={16} className={isSaving ? 'animate-spin' : ''} /> Lưu dữ liệu
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

                            {/* Column Settings Button */}
                            <div className="relative" ref={settingsRef}>

                                <button
                                    onClick={() => setShowColumnSettings(!showColumnSettings)}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
                                >
                                    <Settings size={16} /> Cài đặt cột
                                </button>
                                {showColumnSettings && (
                                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 z-50 p-2">
                                        <div className="text-xs font-bold text-slate-500 mb-2 px-2 uppercase">Hiển thị cột</div>
                                        <div className="max-h-60 overflow-y-auto space-y-1">
                                            {COLUMN_DEFS.map(col => (
                                                <label key={col.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={visibleColumns.includes(col.id)}
                                                        onChange={() => toggleColumn(col.id)}
                                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className="text-sm text-slate-700">{col.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
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
                                    {isColVisible('stt') && <th className="px-4 py-3 whitespace-nowrap border border-green-800 bg-[#1e7e34] sticky left-0 z-30">STT</th>}
                                    {isColVisible('ma_don_hang') && <th className="px-4 py-3 whitespace-nowrap border border-green-800 bg-[#1e7e34] sticky left-[60px] z-30">Mã đơn hàng</th>}
                                    {isColVisible('ngay_len_don') && <th className="px-4 py-3 whitespace-nowrap border border-green-800 bg-[#1e7e34]">Ngày lên đơn</th>}
                                    {isColVisible('mat_hang') && <th className="px-4 py-3 whitespace-nowrap border border-green-800 bg-[#1e7e34]">Mặt hàng</th>}
                                    {isColVisible('name') && <th className="px-4 py-3 whitespace-nowrap border border-green-800 bg-[#1e7e34]">Tên khách hàng</th>}
                                    {isColVisible('khu_vuc') && <th className="px-4 py-3 whitespace-nowrap border border-green-800 bg-[#1e7e34]">Khu vực</th>}
                                    {isColVisible('city') && <th className="px-4 py-3 whitespace-nowrap border border-green-800 bg-[#1e7e34]">City</th>}
                                    {isColVisible('state') && <th className="px-4 py-3 whitespace-nowrap border border-green-800 bg-[#1e7e34]">State</th>}
                                    {isColVisible('zipcode') && <th className="px-4 py-3 whitespace-nowrap border border-green-800 bg-[#1e7e34]">Zipcode</th>}
                                    {isColVisible('team') && <th className="px-4 py-3 whitespace-nowrap border border-green-800 bg-[#1e7e34]">Chi nhánh</th>}
                                    {isColVisible('phi_ffm') && <th className="px-4 py-3 text-right whitespace-nowrap border border-green-800 bg-[#1e7e34]">Phí FFM</th>}
                                    {isColVisible('phi_chung') && <th className="px-4 py-3 text-right whitespace-nowrap border border-green-800 bg-[#1e7e34]">Phí Chung</th>}
                                    {isColVisible('phi_bay') && <th className="px-4 py-3 text-right whitespace-nowrap border border-green-800 bg-[#1e7e34]">Phí Bay</th>}
                                    {isColVisible('thue_tk') && <th className="px-4 py-3 text-right whitespace-nowrap border border-green-800 bg-[#1e7e34]">Thuê TK</th>}
                                    {isColVisible('tien_hang') && <th className="px-4 py-3 text-right whitespace-nowrap border border-green-800 bg-[#1e7e34]">Tiền Hàng</th>}
                                    {isColVisible('ship') && <th className="px-4 py-3 text-right whitespace-nowrap border border-green-800 bg-[#1e7e34]">Ship</th>}
                                    {isColVisible('doi_soat') && <th className="px-4 py-3 text-right whitespace-nowrap border border-green-800 bg-[#1e7e34]">Tiền đã đối soát</th>}
                                    {isColVisible('kt_xac_nhan') && <th className="px-4 py-3 text-right whitespace-nowrap border border-green-800 bg-[#1e7e34]">KT xác nhận</th>}
                                    {isColVisible('tong_tien') && <th className="px-4 py-3 text-right whitespace-nowrap border border-green-800 bg-[#1e7e34]">Tổng tiền VNĐ</th>}
                                    {isColVisible('trang_thai_nb') && <th className="px-4 py-3 whitespace-nowrap border border-green-800 bg-[#1e7e34]">Trạng thái NB</th>}
                                    {isColVisible('ghi_chu') && <th className="px-4 py-3 whitespace-nowrap border border-green-800 bg-[#1e7e34] min-w-[200px]">Ghi chú</th>}
                                    {isColVisible('hinh_thuc_tt') && <th className="px-4 py-3 whitespace-nowrap border border-green-800 bg-[#1e7e34]">HT thanh toán</th>}
                                    {isColVisible('ket_qua_check') && <th className="px-4 py-3 whitespace-nowrap border border-green-800 bg-[#1e7e34]">Kết quả Check</th>}
                                    {isColVisible('ly_do') && <th className="px-4 py-3 whitespace-nowrap border border-green-800 bg-[#1e7e34]">Lý do</th>}
                                    {isColVisible('ma_tracking') && <th className="px-4 py-3 whitespace-nowrap border border-green-800 bg-[#1e7e34]">Mã Tracking</th>}
                                    {isColVisible('nv_van_don') && <th className="px-4 py-3 whitespace-nowrap border border-green-800 bg-[#1e7e34]">NV Vận đơn</th>}
                                    {isColVisible('nv_marketing') && <th className="px-4 py-3 whitespace-nowrap border border-green-800 bg-[#1e7e34]">NV Marketing</th>}
                                    {isColVisible('sale_staff') && <th className="px-4 py-3 whitespace-nowrap border border-green-800 bg-[#1e7e34]">NV Sale</th>}
                                    {isColVisible('cskh') && <th className="px-4 py-3 whitespace-nowrap border border-green-800 bg-[#1e7e34]">CSKH</th>}
                                    {isColVisible('thoi_gian_cutoff') && <th className="px-4 py-3 whitespace-nowrap border border-green-800 bg-[#1e7e34]">Time Cutoff</th>}
                                    {isColVisible('trang_thai_thu_tien') && <th className="px-4 py-3 whitespace-nowrap border border-green-800 bg-[#1e7e34]">TT Thu tiền</th>}
                                    {isColVisible('dv_van_chuyen') && <th className="px-4 py-3 whitespace-nowrap border border-green-800 bg-[#1e7e34]">ĐV Vận chuyển</th>}
                                    {isColVisible('thao_tac') && <th className="px-4 py-3 text-center whitespace-nowrap border border-green-800 bg-[#1e7e34] sticky right-0 z-30">Thao tác</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 select-none">
                                {paginatedData.map((item, rIndex) => {
                                    const actualIndex = (currentPage - 1) * itemsPerPage + rIndex + 1;
                                    return (
                                        <tr key={item?.id || rIndex} className="hover:bg-slate-50 group">
                                            {visibleColumnDefs.map((col, cIndex) => {
                                                // Determine sticky classes
                                                let stickyClass = '';
                                                if (col.id === 'stt') stickyClass = 'sticky left-0 z-20 bg-white group-hover:bg-slate-50';
                                                else if (col.id === 'ma_don_hang') stickyClass = 'sticky left-[60px] z-20 bg-white group-hover:bg-slate-50';
                                                else if (col.id === 'thao_tac') stickyClass = 'sticky right-0 z-20 bg-white group-hover:bg-slate-50';

                                                // Determine range selection style
                                                let selectionClass = '';
                                                if (selection) {
                                                    const startR = Math.min(selection.start.r, selection.end.r);
                                                    const endR = Math.max(selection.start.r, selection.end.r);
                                                    const startC = Math.min(selection.start.c, selection.end.c);
                                                    const endC = Math.max(selection.start.c, selection.end.c);

                                                    if (rIndex >= startR && rIndex <= endR && cIndex >= startC && cIndex <= endC) {
                                                        selectionClass = 'bg-blue-100 ring-1 ring-blue-300 relative z-10'; // Highlight
                                                    }
                                                }

                                                // Alignment
                                                const isMoney = ['phi_ffm', 'phi_chung', 'phi_bay', 'thue_tk', 'tien_hang', 'ship', 'doi_soat', 'kt_xac_nhan', 'tong_tien'].includes(col.id);
                                                const alignClass = isMoney ? 'text-right' : (col.id === 'stt' || col.id === 'thao_tac' ? 'text-center' : 'text-left');

                                                return (
                                                    <td
                                                        key={col.id}
                                                        className={`px-4 py-3 border border-slate-200 text-slate-900 ${stickyClass} ${selectionClass} ${alignClass} ${col.id === 'ghi_chu' ? 'max-w-[200px] truncate' : ''} ${col.id === 'ngay_len_don' ? 'whitespace-nowrap' : ''}`}
                                                        onMouseDown={(e) => {
                                                            if (e.button === 0) { // Left click only
                                                                handleMouseDown(rIndex, cIndex);
                                                            }
                                                        }}
                                                        onMouseEnter={() => handleMouseEnter(rIndex, cIndex)}
                                                    >
                                                        {renderCellContent(item, col.id, actualIndex)}
                                                    </td>
                                                );
                                            })}
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
                                    value={formatDateForInput(editingItem.Ngày_lên_đơn)}
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
                                    value={Number(editingItem.Tổng_tiền_VNĐ) || 0}
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
