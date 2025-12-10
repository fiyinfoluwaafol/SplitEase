import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css'
import { UserProvider } from './contexts/UserContext';
import { Toaster } from './components/ui/toaster';

// Importing page components
import UserAuthPage from './pages/UserAuthPage/UserAuthPage';
import DashboardPage from './pages/DashboardPage/DashboardPage';
import GroupsPage from './pages/GroupsPage/GroupsPage';
import GroupDetailPage from './pages/GroupDetailPage/GroupDetailPage';
import AllocatePage from './pages/AllocatePage/AllocatePage';
import ExpensesPage from './pages/ExpensesPage/ExpensesPage';
import SettlePage from './pages/SettlePage/SettlePage';
import NotFoundPage from './pages/NotFoundPage/NotFoundPage';

function App() {
  return (
    <Router>
      <UserProvider>
        <Routes>
          <Route path="/" element={<UserAuthPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/groups/:id" element={<GroupDetailPage />} />
          <Route path="/groups/:groupId/allocate" element={<AllocatePage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/settle" element={<SettlePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <Toaster />
      </UserProvider>
    </Router>
  )
}

export default App;
