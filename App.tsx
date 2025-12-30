import React, { useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { MasterData } from './pages/MasterData';
import { Revenue } from './pages/Revenue';
import { Cost } from './pages/Cost';
import { Ledger } from './pages/Ledger';
import { Reports } from './pages/Reports';
import { INITIAL_ACCOUNTS, INITIAL_TRANSACTIONS } from './constants';
import { AccountCode, Transaction } from './types';

function App() {
  // Global State (In a real app, use Context or Redux/Zustand)
  const [accounts, setAccounts] = useState<AccountCode[]>(INITIAL_ACCOUNTS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Reports transactions={transactions} />} />
          <Route 
            path="master-data" 
            element={<MasterData accounts={accounts} setAccounts={setAccounts} />} 
          />
          <Route 
            path="revenue" 
            element={<Revenue transactions={transactions} setTransactions={setTransactions} accounts={accounts} />} 
          />
          <Route 
            path="cost" 
            element={<Cost transactions={transactions} setTransactions={setTransactions} accounts={accounts} />} 
          />
          <Route 
            path="ledger" 
            element={<Ledger transactions={transactions} />} 
          />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;