import React, { useState, useRef } from 'react';
import { Transaction, TransactionType, Branch, Market, AccountCode } from '../types';
import { Plus, Search, Upload, ExternalLink, Trash2, Edit2, X, AlertCircle, FileText, Download } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  accounts: AccountCode[];
}

export const Cost: React.FC<Props> = ({ transactions, setTransactions, accounts }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const costAccounts = accounts.filter(a => a.type === TransactionType.EXPENSE);
  const costTransactions = transactions.filter(t => t.type === TransactionType.EXPENSE);

  const [newTrans, setNewTrans] = useState<Partial<Transaction>>({
    date: new Date().toISOString().split('T')[0],
    source: '',
    branch: Branch.HN,
    market: Market.US,
    accountCode: '',
    description: '',
    amount: 0,
    method: 'CK từ TK Công ty',
    type: TransactionType.EXPENSE
  });

  const handleSave = () => {
    if (!newTrans.amount || !newTrans.accountCode) return;
    const trans: Transaction = {
      ...newTrans as Transaction,
      id: Date.now().toString(),
    };
    setTransactions([...transactions, trans]);
    setIsModalOpen(false);
    // Reset state but keep convenient defaults
    setNewTrans(prev => ({ ...prev, description: '', amount: 0, accountCode: '', source: '' }));
  };

  const handleDownloadTemplate = () => {
    const headers = ['Ngay', 'Nguon_Chi', 'Chi_Nhanh', 'Thi_Truong', 'Ma_TK', 'Noi_Dung', 'So_Tien', 'Hinh_Thuc'];
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "mau_chi_phi.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setTimeout(() => {
        alert(`Đã import dữ liệu chi phí từ file "${file.name}" thành công!`);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 1000);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('vi-VN').format(date);
  }

  const filteredTrans = costTransactions.filter(t => 
    t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.accountCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.source.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
       <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div className="relative w-full sm:w-80">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
           <input 
             type="text" 
             placeholder="Tìm kiếm nội dung chi, nguồn..." 
             className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 w-full shadow-sm"
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
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto justify-center shadow-md"
          >
            <Plus size={18} /> Ghi nhận Chi
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
                <th className="px-4 py-3">Nguồn chi</th>
                <th className="px-4 py-3">Chi nhánh</th>
                <th className="px-4 py-3">Thị trường</th>
                <th className="px-4 py-3">Mã TK</th>
                <th className="px-4 py-3">Nội dung chi</th>
                <th className="px-4 py-3 text-right">Số tiền chi (VNĐ)</th>
                <th className="px-4 py-3">Hình thức chi</th>
                <th className="px-4 py-3 text-center">Chứng từ (GD)</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTrans.map((t, index) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-center text-slate-500">{index + 1}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(t.date)}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{t.source}</td>
                  <td className="px-4 py-3 text-slate-600">{t.branch === Branch.OTHER ? '-' : t.branch}</td>
                  <td className="px-4 py-3 text-slate-600">{t.market}</td>
                  <td className="px-4 py-3 text-blue-600 font-mono font-medium">{t.accountCode}</td>
                  <td className="px-4 py-3 text-slate-700">{t.description}</td>
                  <td className="px-4 py-3 text-right font-bold text-red-600">{formatCurrency(t.amount)}</td>
                  <td className="px-4 py-3 text-slate-600">{t.method}</td>
                  <td className="px-4 py-3 text-center">
                    <button className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 hover:underline">
                        <FileText size={14} /> Link
                     </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"><Edit2 size={16} /></button>
                       <button className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredTrans.length === 0 && (
          <div className="p-8 text-center text-slate-500">Chưa có dữ liệu chi phí.</div>
        )}
      </div>

       {/* Modal */}
       {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-red-600 px-6 py-4 border-b border-red-700 flex justify-between items-center text-white">
              <h3 className="font-bold text-lg flex items-center gap-2"><AlertCircle size={20} /> Ghi nhận Chi Phí</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-red-100 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày ghi nhận</label>
                    <input 
                        type="date" 
                        className="w-full border border-slate-300 rounded-lg py-2.5 px-2 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                        value={newTrans.date}
                        onChange={(e) => setNewTrans({...newTrans, date: e.target.value})}
                      />
                 </div>
                 <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Chi nhánh</label>
                    <select 
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                      value={newTrans.branch}
                      onChange={(e) => setNewTrans({...newTrans, branch: e.target.value as Branch})}
                    >
                      {Object.values(Branch).map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Thị trường</label>
                    <select 
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                      value={newTrans.market}
                      onChange={(e) => setNewTrans({...newTrans, market: e.target.value as Market})}
                    >
                      {Object.values(Market).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                 </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-semibold text-slate-700 mb-1">Mã Tài Khoản</label>
                   <select 
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-mono focus:ring-2 focus:ring-red-500 outline-none"
                      value={newTrans.accountCode}
                      onChange={(e) => setNewTrans({...newTrans, accountCode: e.target.value})}
                   >
                     <option value="">-- Chọn Mã TK --</option>
                     {costAccounts.map(acc => (
                       <option key={acc.id} value={acc.code}>{acc.code} - {acc.name}</option>
                     ))}
                   </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Số tiền (VNĐ)</label>
                    <input 
                      type="number" 
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-bold text-red-700 focus:ring-2 focus:ring-red-500 outline-none"
                      placeholder="0"
                      value={newTrans.amount}
                      onChange={(e) => setNewTrans({...newTrans, amount: Number(e.target.value)})}
                    />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nội dung chi</label>
                <input 
                  type="text" 
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="VD: Chi phí Ads, Lương tháng 12..."
                  value={newTrans.description}
                  onChange={(e) => setNewTrans({...newTrans, description: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nguồn chi</label>
                    <input 
                      type="text" 
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                      value={newTrans.source}
                      onChange={(e) => setNewTrans({...newTrans, source: e.target.value})}
                      placeholder="VD: Chi từ tài khoản công ty"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Hình thức chi</label>
                    <input 
                      type="text" 
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                      value={newTrans.method}
                      onChange={(e) => setNewTrans({...newTrans, method: e.target.value})}
                      placeholder="VD: CK từ TK Công ty"
                    />
                  </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Chứng từ (Link ảnh)</label>
                <input 
                  type="text" 
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Hủy</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm">Lưu Khoản Chi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};