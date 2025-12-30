import { useState } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { INITIAL_ACCOUNTS, INITIAL_TRANSACTIONS } from './constants';
import { Cost } from './pages/Cost';
import { Ledger } from './pages/Ledger';
import { MasterData } from './pages/MasterData';
import { Reports } from './pages/Reports';
import { Revenue } from './pages/Revenue';
import { AccountCode, Transaction } from './types';

function App() {
  // Global State (In a real app, use Context or Redux/Zustand)
  const [accounts, setAccounts] = useState<AccountCode[]>(INITIAL_ACCOUNTS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [lockedKeys, setLockedKeys] = useState<string[]>([]);

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
            element={<Revenue transactions={transactions} setTransactions={setTransactions} accounts={accounts} lockedKeys={lockedKeys} />}
          />
          <Route
            path="cost"
            element={<Cost transactions={transactions} setTransactions={setTransactions} accounts={accounts} lockedKeys={lockedKeys} />}
          />
          <Route
            path="ledger"
            element={<Ledger transactions={transactions} lockedKeys={lockedKeys} setLockedKeys={setLockedKeys} />}
          />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;