import { BarChart3, Bell, BookOpen, CreditCard, Database, LayoutDashboard, Menu, UserCircle, Wallet, X } from 'lucide-react';
import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

// Định nghĩa kiểu dữ liệu cho Props (nếu dùng TypeScript)
interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
}

const Sidebar = ({ isOpen, setIsOpen }: SidebarProps) => {
  const navItems = [
    { name: 'Tổng quan & Báo cáo', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Quản lý tài chính nền tảng', path: '/master-data', icon: <Database size={20} /> },
    { name: 'Quản lý Thu', path: '/revenue', icon: <Wallet size={20} /> },
    { name: 'Quản lý Chi', path: '/cost', icon: <CreditCard size={20} /> },
    { name: 'Sổ quỹ & Dòng tiền', path: '/ledger', icon: <BookOpen size={20} /> },
    { name: 'Báo cáo tài chính quản trị', path: '/management-reports', icon: <BarChart3 size={20} /> },
    { name: 'Dữ liệu F3', path: '/f3-datasheet', icon: <Database size={20} /> },
  ];

  return (
    <>
      {/* Overlay: Lớp nền tối khi mở menu trên mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar chính */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#00A651] text-white transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:inset-0 shadow-xl flex flex-col`}>
        {/* Header của Sidebar */}
        <div className="flex items-center justify-between h-16 px-6 bg-[#008f45] shrink-0 shadow-sm">
          <span className="text-xl font-bold tracking-wider text-white">LUMI<span className="text-green-100">FINANCE</span></span>
          <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setIsOpen(false)}>
            <X size={24} />
          </button>
        </div>

        {/* Danh sách Menu */}
        <div className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          <div className="text-xs font-semibold text-green-100 uppercase tracking-wider mb-4 px-2 opacity-80">Menu Chính</div>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)}
              end={item.path === '/'} // Chỉ active chính xác khi ở trang chủ
              className={({ isActive }) =>
                `flex items-center px-4 py-3 rounded-lg transition-all duration-200 group ${isActive
                  ? 'bg-white text-[#00A651] shadow-md transform scale-105'
                  : 'text-green-50 hover:bg-[#008f45] hover:text-white'
                }`
              }
            >
              <span className={`mr-3 transition-transform duration-200 group-hover:scale-110`}>{item.icon}</span>
              <span className="font-medium text-sm">{item.name}</span>
            </NavLink>
          ))}
        </div>

        {/* Footer của Sidebar (User Info) */}
        <div className="p-4 bg-[#008f45] shrink-0 border-t border-green-500/30">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#00A651] font-bold shadow-sm">
              A
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">Admin User</p>
              <p className="text-xs text-green-100 truncate">Ban Giám Đốc</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const location = useLocation();

  // Logic lấy title: Dùng startsWith để hỗ trợ các trang con (ví dụ: /revenue/create vẫn hiện title đúng)
  const getTitle = () => {
    const path = location.pathname;

    if (path === '/') return 'Tổng quan & Báo cáo';
    if (path.startsWith('/management-reports')) return 'Báo cáo tài chính quản trị';
    if (path.startsWith('/master-data')) return 'Quản lý tài chính nền tảng';
    if (path.startsWith('/revenue')) return 'Quản lý Thu';
    if (path.startsWith('/cost')) return 'Quản lý Chi phí';
    if (path.startsWith('/ledger')) return 'Sổ quỹ Thu - Chi & Dòng tiền';
    if (path.startsWith('/f3-datasheet')) return 'Dữ liệu F3';

    return 'Lumi Finance';
  };

  return (
    <div className="flex h-screen overflow-hidden bg-green-50/30 text-slate-800">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full relative transition-all duration-300">

        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between px-4 sm:px-8 z-10 shrink-0">
          <div className="flex items-center">
            <button
              className="mr-4 md:hidden p-2 rounded-md text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-slate-800 truncate">{getTitle()}</h1>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-4">
            <button className="p-2 text-slate-500 hover:bg-slate-100 hover:text-[#00A651] rounded-full relative transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
            </button>
            <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block"></div>
            <button className="flex items-center space-x-2 text-slate-600 hover:text-[#00A651] p-1 rounded-full hover:bg-slate-50 transition-colors">
              <UserCircle size={24} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-green-50/30 p-4 sm:p-6 lg:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto min-h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};