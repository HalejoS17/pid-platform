import { Route, Routes } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { DashboardPage } from '../pages/DashboardPage';
import {
  InventoryPage,
  MovementsPage,
} from '../pages/HistoricalDataPages';
import { MonthlyImportsPage } from '../pages/MonthlyImportsPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { WaitersPage } from '../pages/WaitersPage';

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="monthly-imports" element={<MonthlyImportsPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="movements" element={<MovementsPage />} />
        <Route path="waiters" element={<WaitersPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
