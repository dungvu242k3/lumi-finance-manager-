import { Calendar, DollarSign, Download, Edit2, FileText, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { AccountCode, Branch, Market, Transaction, TransactionType } from '../types';

interface Props {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  accounts: AccountCode[];
  lockedKeys: string[];
}

export const Revenue: React.FC<Props> = ({ transactions, setTransactions, accounts, lockedKeys }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const revenueAccounts = accounts.filter(a => a.type === TransactionType.REVENUE);
  const revenueTransactions = transactions.filter(t => t.type === TransactionType.REVENUE);

  const [newTrans, setNewTrans] = useState<Partial<Transaction>>({
    date: new Date().toISOString().split('T')[0],
    source: 'Thu tiền từ bill',
    branch: Branch.HN,
    market: Market.US,
    accountCode: '',
    description: '',
    amount: 0,
    method: '',
    type: TransactionType.REVENUE
  });

  const resetForm = () => {
    setNewTrans(prev => ({
      ...prev,
      date: new Date().toISOString().split('T')[0],
      source: 'Thu tiền từ bill',
      branch: Branch.HN,
      market: Market.US,
      accountCode: '',
      description: '',
      amount: 0,
      method: ''
    }));
    setEditingId(null);
  };

  const handleSave = () => {
    if (!newTrans.amount || !newTrans.accountCode || !newTrans.date) return;

    const transMonth = newTrans.date?.substring(0, 7);
    const lockKey = `${transMonth}_${newTrans.accountCode}_${newTrans.branch}`;
    if (lockedKeys.includes(lockKey)) {
      alert(`Giao dịch cho tài khoản ${newTrans.accountCode} tại chi nhánh ${newTrans.branch} trong tháng ${transMonth} đã bị KHÓA SỔ. Không thể thực hiện thay đổi.`);
      return;
    }

    if (editingId) {
      setTransactions(transactions.map(t => t.id === editingId ? { ...t, ...newTrans } as Transaction : t));
    } else {
      const trans: Transaction = {
        ...newTrans as Transaction,
        id: Date.now().toString(),
      };
      setTransactions([...transactions, trans]);
    }

    setIsModalOpen(false);
    resetForm();
  };

  const handleEdit = (trans: Transaction) => {
    const transMonth = trans.date.substring(0, 7);
    const lockKey = `${transMonth}_${trans.accountCode}_${trans.branch}`;
    if (lockedKeys.includes(lockKey)) {
      alert(`Giao dịch cho tài khoản ${trans.accountCode} tại chi nhánh ${trans.branch} trong tháng ${transMonth} đã bị KHÓA SỔ. Không thể chỉnh sửa.`);
      return;
    }
    setEditingId(trans.id);
    setNewTrans(trans);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    const trans = transactions.find(t => t.id === id);
    if (trans) {
      const transMonth = trans.date.substring(0, 7);
      const lockKey = `${transMonth}_${trans.accountCode}_${trans.branch}`;
      if (lockedKeys.includes(lockKey)) {
        alert(`Giao dịch cho tài khoản ${trans.accountCode} tại chi nhánh ${trans.branch} trong tháng ${transMonth} đã bị KHÓA SỔ. Không thể xóa.`);
        return;
      }
    }

    if (window.confirm('Bạn có chắc muốn xóa khoản thu này?')) {
      setTransactions(transactions.filter(t => t.id !== id));
    }
  };

  const handleDownloadTemplate = () => {
    const headers = [
      {
        Ngay: new Date().toISOString().split('T')[0],
        Nguon_Thu: 'Thu tiền từ bill',
        Chi_Nhanh: 'Hà Nội',
        Thi_Truong: 'US',
        Ma_TK: '1.1US',
        Noi_Dung: 'Ví dụ thu tiền',
        So_Tien: 1000000,
        Hinh_Thuc: 'CK về TK Công ty'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(headers);
    XLSX.utils.sheet_add_aoa(ws, [['Ngay', 'Nguon_Thu', 'Chi_Nhanh', 'Thi_Truong', 'Ma_TK', 'Noi_Dung', 'So_Tien', 'Hinh_Thuc']], { origin: 'A1' });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mau_Thu_Tien");
    XLSX.writeFile(wb, "mau_thu_tien.xlsx");
  };

  const handleImportClick = () => {
    setIsImportModalOpen(true);
  };

  const handleRealImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          const importedTransactions: Transaction[] = jsonData.map((row: any) => ({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            date: row['Ngay'] ? new Date(row['Ngay']).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            source: row['Nguon_Thu'] || '',
            branch: row['Chi_Nhanh'] as Branch || Branch.HN,
            market: row['Thi_Truong'] as Market || Market.US,
            accountCode: row['Ma_TK'] || '',
            description: row['Noi_Dung'] || '',
            amount: Number(row['So_Tien']) || 0,
            method: row['Hinh_Thuc'] || 'CK',
            type: TransactionType.REVENUE,
          })).filter(t => {
            if (t.amount <= 0 || !t.accountCode) return false;
            const transMonth = t.date.substring(0, 7);
            const lockKey = `${transMonth}_${t.accountCode}_${t.branch}`;
            return !lockedKeys.includes(lockKey);
          });

          if (importedTransactions.length < jsonData.length) {
            const blockedCount = jsonData.length - importedTransactions.length;
            alert(`Đã import thành công ${importedTransactions.length} khoản thu. Đã bỏ qua ${blockedCount} dòng do dữ liệu lỗi hoặc thuộc Tài khoản/Chi nhánh đã KHÓA SỔ.`);
          } else {
            alert(`Đã import thành công ${importedTransactions.length} khoản thu!`);
          }

          setTransactions(prev => [...prev, ...importedTransactions]);
          setIsImportModalOpen(false);
        } catch (error) {
          console.error("Error reading file:", error);
          alert("Lỗi khi đọc file Excel. Vui lòng kiểm tra lại định dạng.");
        }

        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('vi-VN').format(date);
  }

  // Helper to remove accents and normalize string for search
  const normalizeString = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };

  const filteredTrans = revenueTransactions.filter(t =>
    normalizeString(t.description).includes(normalizeString(searchTerm)) ||
    normalizeString(t.accountCode).includes(normalizeString(searchTerm))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Tìm kiếm bill, nội dung..."
            className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-full shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto justify-end">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Download size={18} /> Tải mẫu
          </button>

          <button
            onClick={() => {
              const exportData = revenueTransactions.map((t, index) => ({
                'STT': index + 1,
                'Ngày': t.date,
                'Nguồn thu': t.source,
                'Chi nhánh': t.branch,
                'Thị trường': t.market,
                'Mã TK': t.accountCode,
                'Nội dung': t.description,
                'Số tiền (VNĐ)': t.amount,
                'Hình thức': t.method
              }));

              const ws = XLSX.utils.json_to_sheet(exportData);

              // Set column widths
              ws['!cols'] = [
                { wch: 5 },  // STT
                { wch: 12 }, // Ngày
                { wch: 15 }, // Nguồn thu
                { wch: 10 }, // Chi nhánh
                { wch: 10 }, // Thị trường
                { wch: 15 }, // Mã TK
                { wch: 30 }, // Nội dung
                { wch: 15 }, // Số tiền
                { wch: 15 }  // Hình thức
              ];

              // Format numbers
              const range = XLSX.utils.decode_range(ws['!ref'] || "A1:A1");
              for (let R = range.s.r; R <= range.e.r; ++R) {
                for (let C = range.s.c; C <= range.e.c; ++C) {
                  const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
                  const cell = ws[cell_address];
                  if (cell && cell.t === 'n' && (cell.v > 1000 || cell.v < -1000)) {
                    cell.z = '#,##0';
                  }
                }
              }

              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "Doanh_Thu");
              XLSX.writeFile(wb, `Doanh_Thu_${new Date().toISOString().split('T')[0]}.xlsx`);
            }}
            className="flex items-center gap-2 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Download size={18} /> Xuất Excel
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv, .xlsx, .xls"
            className="hidden"
          />
          <button
            onClick={handleImportClick}
            className="flex items-center gap-2 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Upload size={18} /> Import Excel
          </button>

          <button
            onClick={() => {
              setIsModalOpen(true);
              resetForm();
            }}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto justify-center shadow-md"
          >
            <Plus size={18} /> Ghi nhận Thu
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 w-12 text-center">STT</th>
                <th className="px-4 py-3">Ngày ghi nhận</th>
                <th className="px-4 py-3">Nguồn thu</th>
                <th className="px-4 py-3">Chi nhánh</th>
                <th className="px-4 py-3">Thị trường</th>
                <th className="px-4 py-3">Mã TK</th>
                <th className="px-4 py-3">Nội dung thu</th>
                <th className="px-4 py-3 text-right">Số tiền thu</th>
                <th className="px-4 py-3">Hình thức thu</th>
                <th className="px-4 py-3 text-center">Chứng từ</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTrans.map((t, index) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-center text-slate-500">{index + 1}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(t.date)}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{t.source}</td>
                  <td className="px-4 py-3 text-slate-600">{t.branch}</td>
                  <td className="px-4 py-3 text-slate-600">{t.market}</td>
                  <td className="px-4 py-3 text-blue-600 font-mono font-medium">{t.accountCode}</td>
                  <td className="px-4 py-3 text-slate-700">{t.description}</td>
                  <td className="px-4 py-3 text-right font-bold text-green-600">{formatCurrency(t.amount)}</td>
                  <td className="px-4 py-3 text-slate-600">{t.method}</td>
                  <td className="px-4 py-3 text-center">
                    <button className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 hover:underline">
                      <FileText size={14} /> Link
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleEdit(t)} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(t.id)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredTrans.length === 0 && (
          <div className="p-8 text-center text-slate-500">Chưa có dữ liệu thu.</div>
        )}
      </div>

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800">Hướng dẫn Import Thu Excel</h3>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
                <p className="font-semibold mb-2">Cấu trúc file Excel bắt buộc:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong>Ngay:</strong> Ngày thu (YYYY-MM-DD)</li>
                  <li><strong>Nguon_Thu:</strong> Nguồn tiền (VD: Từ khách hàng)</li>
                  <li><strong>Chi_Nhanh:</strong> {Object.values(Branch).join(', ')}</li>
                  <li><strong>Thi_Truong:</strong> {Object.values(Market).join(', ')}</li>
                  <li><strong>Ma_TK:</strong> Mã trong Master Data (VD: 1.1US)</li>
                  <li><strong>Noi_Dung:</strong> Diễn giải chi tiết</li>
                  <li><strong>So_Tien:</strong> Số tiền (Số nguyên)</li>
                  <li><strong>Hinh_Thuc:</strong> CK, Tiền mặt...</li>
                </ul>
              </div>
              <div className="text-sm text-slate-500 italic">
                * Vui lòng tải file mẫu và nhập liệu đúng cột. Các dòng thiếu tiền hoặc mã TK sẽ bị bỏ qua.
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between gap-3">
              <button
                onClick={handleDownloadTemplate}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors border border-slate-300 flex items-center gap-2"
              >
                <Download size={16} /> Tải file mẫu
              </button>
              <div className="flex gap-2">
                <button onClick={() => setIsImportModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Đóng</button>
                <button onClick={handleRealImport} className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-sm flex items-center gap-2">
                  <Upload size={16} /> Chọn File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-green-600 px-6 py-4 border-b border-green-700 flex justify-between items-center text-white">
              <h3 className="font-bold text-lg flex items-center gap-2"><DollarSign size={20} /> {editingId ? 'Cập nhật Khoản Thu' : 'Thêm Khoản Thu Mới'}</h3>
              <button onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }} className="text-green-100 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày ghi nhận</label>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="date"
                      className="w-full border border-slate-300 rounded-lg py-2.5 pl-9 pr-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                      value={newTrans.date}
                      onChange={(e) => setNewTrans({ ...newTrans, date: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Chi nhánh</label>
                  <select
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                    value={newTrans.branch}
                    onChange={(e) => setNewTrans({ ...newTrans, branch: e.target.value as Branch })}
                  >
                    {Object.values(Branch).map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Thị trường</label>
                  <select
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                    value={newTrans.market}
                    onChange={(e) => setNewTrans({ ...newTrans, market: e.target.value as Market })}
                  >
                    {Object.values(Market).map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mã Tài Khoản</label>
                  <select
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-mono focus:ring-2 focus:ring-green-500 outline-none"
                    value={newTrans.accountCode}
                    onChange={(e) => setNewTrans({ ...newTrans, accountCode: e.target.value })}
                  >
                    <option value="">-- Chọn Mã TK --</option>
                    {revenueAccounts.map(acc => (
                      <option key={acc.id} value={acc.code}>{acc.code} - {acc.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Số tiền (VNĐ)</label>
                  <input
                    type="number"
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-bold text-green-700 focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="0"
                    value={newTrans.amount || ''}
                    onChange={(e) => setNewTrans({ ...newTrans, amount: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nội dung thu</label>
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="VD: Thu tiền bill MGT tháng 12"
                  value={newTrans.description}
                  onChange={(e) => setNewTrans({ ...newTrans, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nguồn thu</label>
                  <input
                    type="text"
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="VD: Thu tiền từ bill"
                    value={newTrans.source}
                    onChange={(e) => setNewTrans({ ...newTrans, source: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hình thức thu</label>
                  <input
                    type="text"
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                    value={newTrans.method}
                    onChange={(e) => setNewTrans({ ...newTrans, method: e.target.value })}
                    placeholder="VD: CK về TK Công ty"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Chứng từ (Link ảnh)</label>
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Hủy</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-sm">Lưu Khoản Thu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};