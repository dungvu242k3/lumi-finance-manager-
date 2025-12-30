import { AccountCode, Branch, Market, Transaction, TransactionType } from './types';

export const INITIAL_ACCOUNTS: AccountCode[] = [
  // From Section 1: Master Data Table
  { id: '1', code: '1.1US', name: 'Thu tiền từ bill', category: 'Thu', type: TransactionType.REVENUE, branch: Branch.HN, market: Market.US, status: 'Active' },
  { id: '2', code: '1.1CA', name: 'Thu tiền từ bill', category: 'Thu', type: TransactionType.REVENUE, branch: Branch.HN, market: Market.CAN, status: 'Active' },
  { id: '3', code: '2.1US', name: 'Phí FFM', category: 'Chi phí vận hành', type: TransactionType.EXPENSE, branch: Branch.HN, market: Market.US, status: 'Active' },
  { id: '4', code: '2.2UC', name: 'Phí FFM', category: 'Chi phí vận hành', type: TransactionType.EXPENSE, branch: Branch.HCM, market: Market.AUS, status: 'Active' },
  { id: '5', code: '7.1', name: 'Chi lương', category: 'Chi phí nhân sự', type: TransactionType.EXPENSE, branch: Branch.HN, market: Market.NONE, status: 'Active' },
  { id: '6', code: '8', name: 'BHXH', category: 'Chi phí bảo hiểm', type: TransactionType.EXPENSE, branch: Branch.COMPANY, market: Market.NONE, status: 'Active' },
  { id: '7', code: '9.2', name: 'Thuê VP + điện nước', category: 'Chi phí cố định', type: TransactionType.EXPENSE, branch: Branch.HCM, market: Market.NONE, status: 'Active' },
  
  // Additional Accounts
  { id: '8', code: '1.2US', name: 'Thu tiền từ bill', category: 'Thu', type: TransactionType.REVENUE, branch: Branch.HCM, market: Market.US, status: 'Active' },
  { id: '9', code: '1.2UC', name: 'Thu tiền từ bill', category: 'Thu', type: TransactionType.REVENUE, branch: Branch.HCM, market: Market.AUS, status: 'Active' },
  { id: '10', code: '3.1CA', name: 'Chi thuê TK DKZ', category: 'Phí thuê tài khoản', type: TransactionType.EXPENSE, branch: Branch.HN, market: Market.CAN, status: 'Active' },
  { id: '11', code: '6', name: 'Chi Ads', category: 'Chi phí ADS', type: TransactionType.EXPENSE, branch: Branch.OTHER, market: Market.NONE, status: 'Active' },
  { id: '12', code: '7.2', name: 'Chi lương', category: 'Chi phí nhân sự', type: TransactionType.EXPENSE, branch: Branch.HCM, market: Market.NONE, status: 'Active' },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  // Nov 2025 Data (Closed Month Simulation)
  { id: 'prev1', date: '2025-11-15', type: TransactionType.REVENUE, source: 'Thu tiền từ bill', branch: Branch.HN, market: Market.US, accountCode: '1.1US', description: 'Bill MGT T11', amount: 450000000, method: 'CK', proofUrl: '' },
  { id: 'prev2', date: '2025-11-20', type: TransactionType.EXPENSE, source: 'Chi FFM', branch: Branch.HN, market: Market.US, accountCode: '2.1US', description: 'Chi FFM T11', amount: 150000000, method: 'CK', proofUrl: '' },
  { id: 'prev3', date: '2025-11-25', type: TransactionType.EXPENSE, source: 'Chi Ads', branch: Branch.OTHER, market: Market.NONE, accountCode: '6', description: 'Chi Ads T11', amount: 120000000, method: 'CK', proofUrl: '' },

  // Dec 2025 Data (Current Month)
  { id: 'r1', date: '2025-12-01', type: TransactionType.REVENUE, source: 'Thu tiền từ bill', branch: Branch.HN, market: Market.US, accountCode: '1.1US', description: 'Bill MGT', amount: 120000000, method: 'CK về TK Công ty', proofUrl: 'link_anh_1' },
  { id: 'r2', date: '2025-12-01', type: TransactionType.REVENUE, source: 'Thu tiền từ bill', branch: Branch.HN, market: Market.CAN, accountCode: '1.1CA', description: 'Bill BEE', amount: 85000000, method: 'CK về TK CN 1', proofUrl: 'link_anh_2' },
  { id: 'c1', date: '2025-12-01', type: TransactionType.EXPENSE, source: 'Chi FFM từ DT bill', branch: Branch.HN, market: Market.US, accountCode: '2.1US', description: 'Chi FFM MGT', amount: 100000000, method: 'Cấn trừ từ DT Bill', proofUrl: 'link_anh_5' },
  { id: 'c2', date: '2025-12-01', type: TransactionType.EXPENSE, source: 'Chi thuê TK từ DT bill', branch: Branch.HN, market: Market.CAN, accountCode: '3.1CA', description: 'Chi thuê TK DKZ', amount: 80000000, method: 'Cấn trừ từ DT Bill', proofUrl: 'link_anh_6' },
  
  { id: 'r3', date: '2025-12-02', type: TransactionType.REVENUE, source: 'Thu tiền từ bill', branch: Branch.HCM, market: Market.US, accountCode: '1.2US', description: 'Bill MGT', amount: 98000000, method: 'CK về TK Công ty', proofUrl: 'link_anh_3' },
  { id: 'c3', date: '2025-12-02', type: TransactionType.EXPENSE, source: 'Chi Ads từ TK CTy', branch: Branch.OTHER, market: Market.NONE, accountCode: '6', description: 'Chi Ads cho MG', amount: 68000000, method: 'CK từ TK Công ty', proofUrl: 'link_anh_7' },
  
  { id: 'r4', date: '2025-12-03', type: TransactionType.REVENUE, source: 'Thu tiền từ bill', branch: Branch.HCM, market: Market.AUS, accountCode: '1.2UC', description: 'Bill BEE', amount: 65000000, method: 'CK về TK CN 2', proofUrl: 'link_anh_4' },
  { id: 'c4', date: '2025-12-03', type: TransactionType.EXPENSE, source: 'Chi lương từ TK CTy', branch: Branch.HCM, market: Market.NONE, accountCode: '7.2', description: 'Chi lương', amount: 65000000, method: 'CK từ TK Công ty', proofUrl: 'link_anh_8' },
  
  // Future/Late Dec Data
  { id: 'r5', date: '2025-12-15', type: TransactionType.REVENUE, source: 'Thu tiền từ bill', branch: Branch.HN, market: Market.US, accountCode: '1.1US', description: 'Bill MGT đợt 2', amount: 200000000, method: 'CK', proofUrl: '' },
  { id: 'c5', date: '2025-12-20', type: TransactionType.EXPENSE, source: 'Chi Lương', branch: Branch.HN, market: Market.NONE, accountCode: '7.1', description: 'Lương HN T12', amount: 90000000, method: 'CK', proofUrl: '' },
];