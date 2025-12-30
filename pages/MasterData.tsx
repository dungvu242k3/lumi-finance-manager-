import { Download, Edit2, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { AccountCode, Branch, Market, TransactionType } from '../types';

interface Props {
  accounts: AccountCode[];
  setAccounts: React.Dispatch<React.SetStateAction<AccountCode[]>>;
}

export const MasterData: React.FC<Props> = ({ accounts, setAccounts }) => {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [newAccount, setNewAccount] = useState<Partial<AccountCode>>({
    code: '',
    name: '',
    category: '',
    type: TransactionType.REVENUE,
    branch: Branch.HN,
    market: Market.US,
    status: 'Active',
    note: ''
  });

  const handleImportClick = () => {
    setIsImportModalOpen(true);
  };

  const handleRealImport = () => {
    fileInputRef.current?.click();
  };

  const handleSave = () => {
    if (!newAccount.code || !newAccount.name) return;

    if (editingId) {
      setAccounts(accounts.map(acc => acc.id === editingId ? { ...acc, ...newAccount } as AccountCode : acc));
    } else {
      const account: AccountCode = {
        ...newAccount as AccountCode,
        id: Date.now().toString(),
      };
      setAccounts([...accounts, account]);
    }

    setIsModalOpen(false);
    setEditingId(null);
    setNewAccount({
      code: '', name: '', category: '', type: TransactionType.REVENUE, branch: Branch.HN, market: Market.US, status: 'Active', note: ''
    });
  };

  const handleEdit = (account: AccountCode) => {
    setEditingId(account.id);
    setNewAccount(account);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bạn có chắc muốn xóa mã tài khoản này?')) {
      setAccounts(accounts.filter(a => a.id !== id));
    }
  };

  const handleDownloadTemplate = () => {
    const headers = [
      {
        STT: 1,
        Loai_Danh_Muc: 'Chi phí vận hành',
        Chi_Nhanh: 'Hà Nội',
        Thi_Truong: 'US',
        Ma_TK: '1.1US',
        Ten_Khoan_Muc: 'Ví dụ khoản mục',
        Loai_Thu_Chi: 'CHI',
        Ghi_Chu: 'Mẫu nhập liệu'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(headers);
    XLSX.utils.sheet_add_aoa(ws, [['STT', 'Loai_Danh_Muc', 'Chi_Nhanh', 'Thi_Truong', 'Ma_TK', 'Ten_Khoan_Muc', 'Loai_Thu_Chi', 'Ghi_Chu']], { origin: 'A1' });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mau_Nhap_Lieu");
    XLSX.writeFile(wb, "mau_danh_muc_tai_chinh.xlsx");
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

          const importedAccounts: AccountCode[] = jsonData.map((row: any) => ({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            category: row['Loai_Danh_Muc'] || '',
            branch: row['Chi_Nhanh'] as Branch || Branch.HN,
            market: row['Thi_Truong'] as Market || Market.US,
            code: row['Ma_TK'] || '',
            name: row['Ten_Khoan_Muc'] || '',
            type: (row['Loai_Thu_Chi'] === 'THU' ? TransactionType.REVENUE : TransactionType.EXPENSE) as TransactionType,
            status: 'Active' as 'Active' | 'Inactive',
            note: row['Ghi_Chu'] || ''
          })).filter(acc => acc.code && acc.name); // Filter out empty rows

          setAccounts(prev => [...prev, ...importedAccounts]);
          alert(`Đã import thành công ${importedAccounts.length} bản ghi!`);
        } catch (error) {
          console.error("Error reading file:", error);
          alert("Lỗi khi đọc file Excel. Vui lòng kiểm tra lại định dạng.");
        }

        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsArrayBuffer(file);
    }
  };

  // Helper to remove accents and normalize string for search
  const normalizeString = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };

  const filteredAccounts = accounts.filter(acc => {
    const term = normalizeString(searchTerm);
    const code = normalizeString(acc.code);
    const name = normalizeString(acc.name);
    const category = normalizeString(acc.category || '');
    const note = normalizeString(acc.note || '');

    const matchesSearch = code.includes(term) || name.includes(term) || category.includes(term) || note.includes(term);
    const matchesFilter = filterType === 'all' || acc.type === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm mã TK, tên..."
              className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm w-full sm:w-auto"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as TransactionType | 'all')}
          >
            <option value="all">Tất cả loại</option>
            <option value={TransactionType.REVENUE}>Thu</option>
            <option value={TransactionType.EXPENSE}>Chi</option>
          </select>
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
              const exportData = accounts.map((acc, index) => ({
                'STT': index + 1,
                'Loai_Danh_Muc': acc.category,
                'Chi_Nhanh': acc.branch,
                'Thi_Truong': acc.market,
                'Ma_TK': acc.code,
                'Ten_Khoan_Muc': acc.name,
                'Loai_Thu_Chi': acc.type, // Enum values are already 'THU'/'CHI'
                'Trang_Thai': acc.status === 'Active' ? 'Active' : 'Inactive',
                'Ghi_Chu': acc.note
              }));

              const ws = XLSX.utils.json_to_sheet(exportData);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "Danh_Muc");
              XLSX.writeFile(wb, `Danh_Muc_Tai_Chinh_${new Date().toISOString().split('T')[0]}.xlsx`);
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
              setEditingId(null);
              setNewAccount({
                code: '', name: '', category: '', type: TransactionType.REVENUE, branch: Branch.HN, market: Market.US, status: 'Active', note: ''
              });
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-md"
          >
            <Plus size={18} /> Thêm Mới
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 w-12 text-center">STT</th>
                <th className="px-4 py-3">Loại danh mục</th>
                <th className="px-4 py-3">Chi nhánh</th>
                <th className="px-4 py-3">Thị trường</th>
                <th className="px-4 py-3">Mã TK</th>
                <th className="px-4 py-3">Tên khoản mục</th>
                <th className="px-4 py-3 text-center">Loại thu/chi</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3">Ghi chú</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAccounts.map((acc, index) => (
                <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-center text-slate-500">{index + 1}</td>
                  <td className="px-4 py-3 text-slate-600 font-medium">{acc.category}</td>
                  <td className="px-4 py-3 text-slate-600">{acc.branch}</td>
                  <td className="px-4 py-3 text-slate-600">{acc.market}</td>
                  <td className="px-4 py-3 font-semibold text-blue-600 font-mono">{acc.code}</td>
                  <td className="px-4 py-3 text-slate-800">{acc.name}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium border ${acc.type === TransactionType.REVENUE
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                      {acc.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${acc.status === 'Active' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                      {acc.status === 'Active' ? 'Đang dùng' : 'Ngừng'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 italic truncate max-w-[150px]">{acc.note || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleEdit(acc)} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(acc.id)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredAccounts.length === 0 && (
          <div className="p-8 text-center text-slate-500">Không tìm thấy dữ liệu.</div>
        )}
      </div>

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800">Hướng dẫn Import Excel</h3>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <p className="font-semibold mb-2">Cấu trúc file Excel bắt buộc:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong>STT:</strong> Số thứ tự</li>
                  <li><strong>Loai_Danh_Muc:</strong> Nhóm danh mục (VD: Chi phí vận hành)</li>
                  <li><strong>Chi_Nhanh:</strong> {Object.values(Branch).join(', ')}</li>
                  <li><strong>Thi_Truong:</strong> {Object.values(Market).join(', ')}</li>
                  <li><strong>Ma_TK:</strong> Mã định danh (VD: 1.1US)</li>
                  <li><strong>Ten_Khoan_Muc:</strong> Tên hiển thị</li>
                  <li><strong>Loai_Thu_Chi:</strong> THU hoặc CHI</li>
                  <li><strong>Ghi_Chu:</strong> Ghi chú bổ sung (tùy chọn)</li>
                </ul>
              </div>
              <div className="text-sm text-slate-500 italic">
                * Vui lòng sử dụng file mẫu để đảm bảo định dạng chính xác.
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

      {/* Existing Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800">{editingId ? 'Cập nhật Mã Tài Khoản' : 'Thêm Mã Tài Khoản Mới'}</h3>
              <button onClick={() => {
                setIsModalOpen(false);
                setEditingId(null);
                setNewAccount({
                  code: '', name: '', category: '', type: TransactionType.REVENUE, branch: Branch.HN, market: Market.US, status: 'Active', note: ''
                });
              }} className="text-slate-400 hover:text-red-500 transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Loại Thu/Chi <span className="text-red-500">*</span></label>
                  <select
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    value={newAccount.type}
                    onChange={(e) => setNewAccount({ ...newAccount, type: e.target.value as TransactionType })}
                  >
                    <option value={TransactionType.REVENUE}>Thu</option>
                    <option value={TransactionType.EXPENSE}>Chi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mã TK <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                    placeholder="VD: 1.1US"
                    value={newAccount.code}
                    onChange={(e) => setNewAccount({ ...newAccount, code: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tên Khoản mục <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="VD: Thu tiền từ bill"
                  value={newAccount.name}
                  onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Chi nhánh</label>
                  <select
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newAccount.branch}
                    onChange={(e) => setNewAccount({ ...newAccount, branch: e.target.value as Branch })}
                  >
                    {Object.values(Branch).map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Thị trường</label>
                  <select
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newAccount.market}
                    onChange={(e) => setNewAccount({ ...newAccount, market: e.target.value as Market })}
                  >
                    {Object.values(Market).map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Loại danh mục (Nhóm)</label>
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="VD: Chi phí vận hành"
                  value={newAccount.category}
                  onChange={(e) => setNewAccount({ ...newAccount, category: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú</label>
                <textarea
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ghi chú thêm..."
                  rows={2}
                  value={newAccount.note}
                  onChange={(e) => setNewAccount({ ...newAccount, note: e.target.value })}
                />
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={() => {
                setIsModalOpen(false);
                setEditingId(null);
                setNewAccount({
                  code: '', name: '', category: '', type: TransactionType.REVENUE, branch: Branch.HN, market: Market.US, status: 'Active', note: ''
                });
              }} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Hủy bỏ</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm">Lưu Dữ Liệu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};