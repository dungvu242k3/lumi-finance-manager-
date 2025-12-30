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