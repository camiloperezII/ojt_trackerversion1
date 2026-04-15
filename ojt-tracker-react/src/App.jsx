import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Admin from './pages/Admin';
import Dashboard from './pages/Dashboard';
import ForgotPassword from './pages/ForgotPassword';
import UpdatePassword from './pages/UpdatePassword';
import Logs from './pages/Logs';
import AdminLogs from './pages/AdminLogs';
import ThemeSwitcher from './pages/ThemeSwitcher'; // Assuming it's in your pages folder

function App() {
  return (
    <Router>
      {/* The Switcher is placed to be globally accessible 
          and doesn't reload when the page content changes.
      */}
      <ThemeSwitcher />

      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/update-password" element={<UpdatePassword />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="/admin-logs" element={<AdminLogs />} />
      </Routes>
    </Router>
  );
}

export default App;