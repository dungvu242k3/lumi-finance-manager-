export enum TransactionType {
  REVENUE = 'THU',
  EXPENSE = 'CHI'
}

export enum Branch {
  HN = 'Hà Nội',
  HCM = 'HCM',
  COMPANY = 'Toàn Công Ty',
  OTHER = 'Khác'
}

export enum Market {
  US = 'US',
  CAN = 'CAN',
  AUS = 'ÚC',
  KR = 'KR',
  JP = 'JP',
  NONE = '-'
}

export interface AccountCode {
  id: string;
  code: string; // e.g., 1.1US
  name: string; // e.g., Thu tiền từ bill
  category: string; // e.g., Revenue, Operating Cost
  type: TransactionType;
  branch: Branch;
  market: Market;
  status: 'Active' | 'Inactive'; // Trạng thái
  note?: string; // Ghi chú
}

export interface Transaction {
  id: string;
  date: string; // ISO Date string
  type: TransactionType;
  source: string; // Nguồn thu/chi
  branch: Branch;
  market: Market;
  accountCode: string; // Refers to AccountCode.code
  description: string; // Nội dung
  amount: number;
  method: string; // CK, Cash
  proofUrl?: string; // Link ảnh
  isLocked?: boolean; // For ledger locking
}

export interface PeriodLock {
  month: string; // YYYY-MM
  isLocked: boolean;
  openingBalance: number;
  closingBalance: number;
}

export interface AuditLog {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOCK_PERIOD';
  entity: 'TRANSACTION' | 'ACCOUNT_CODE' | 'LEDGER';
  entityId: string;
  timestamp: number;
  user: string;
  details: string; // Describe what changed
}

export interface F3Data {
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
  Phí_Chung: number;
  Phí_bay: number;
  Phí_ship: number;
  State: string;
  Team: string;
  Thuê_TK: number;
  Thời_gian_cutoff: string;
  Tiền_Hàng: number;
  Tiền_Việt_đã_đối_soát: number;
  Trạng_thái_giao_hàng_NB: string;
  Trạng_thái_thu_tiền: string;
  Tổng_tiền_VNĐ: number;
  Phí_FFM?: number;
  Zipcode: string;
  Đơn_vị_vận_chuyển: string;
}

export interface BusinessResultRow {
  id: string;
  month: string;
  product: string;
  market: string;
  branch: string;
  cogs: number;
  overhead: number;
}

export interface ExchangeRates {
  US: number;
  CAD: number;
  AUD: number;
  JPY: number;
  KRW: number;
}