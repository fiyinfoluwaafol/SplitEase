import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// TODO: Replace with Logo and Graphic for Right half of UserAuthPage
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

// Importing page components to be used for page routing
import UserAuthPage from './pages/UserAuthPage/UserAuthPage';
import DashboardPage from './pages/DashboardPage/DashboardPage';
import NotFoundPage from './pages/NotFoundPage/NotFoundPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<UserAuthPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  )
}

export default App;
