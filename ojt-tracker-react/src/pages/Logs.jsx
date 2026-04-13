import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function Logs() {
  const [logs, setLogs] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // NEW: Search and Filter States
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  
  const navigate = useNavigate()

  useEffect(() => {
    fetchUserAndLogs()
  }, [])

  const fetchUserAndLogs = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profileData } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', user.id)
        .single()
      if (profileData) {
        setProfile(profileData)
        const { data: logData } = await supabase
          .from('logs')
          .select('*')
          .eq('user_id', profileData.id)
          .order('log_date', { ascending: false })
        if (logData) setLogs(logData)
      }
    } else { 
      navigate('/') 
    }
    setLoading(false)
  }

  // LOGIC: Filter logs based on search and status
  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.task_description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportToCSV = () => {
    const headers = ["Date", "Time In", "Time Out", "Hours Rendered", "Status", "Task Description"];
    // Export only the filtered results
    const rows = filteredLogs.map(log => [
      log.log_date, 
      log.time_in, 
      log.time_out, 
      log.hours_rendered, 
      log.status || 'pending', 
      `"${log.task_description.replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Filtered_OJT_Logs_${profile?.full_name}.csv`;
    link.click();
  };

  if (loading) return <div className="container"><p>Loading Archive...</p></div>

  return (
    <div>
      <nav className="navbar">
        <div className="nav-container">
          <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/Paombong.png" alt="Logo" style={{ height: '40px' }} />
            <span style={{ fontWeight: 'bold' }}>FULL LOG HISTORY</span>
          </div>
          <div className="nav-links">
            <button className="nav-btn" onClick={() => navigate('/dashboard')}>BACK TO DASHBOARD</button>
            <button className="logout-btn" onClick={() => navigate('/')}>Logout</button>
          </div>
        </div>
      </nav>

      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', marginTop: '20px' }}>
          <div>
            <h2 style={{ margin: 0 }}>Archive for {profile?.full_name}</h2>
            <p style={{ color: '#666', fontSize: '14px' }}>
              Showing {filteredLogs.length} of {logs.length} entries
            </p>
          </div>
          <button onClick={exportToCSV} style={{ backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', padding: '12px 20px', cursor: 'pointer', fontWeight: 'bold' }}>
            EXPORT FILTERED TO CSV
          </button>
        </div>

        {/* NEW: Filter and Search Bar */}
        <div style={{ display: 'flex', gap: '15px', marginBottom: '25px', backgroundColor: '#fff', padding: '15px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <input 
            type="text" 
            placeholder="🔍 Search tasks" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 2, padding: '10px 15px', borderRadius: '6px', border: '1px solid #ddd' }}
          />
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer' }}
          >
            <option value="All">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <table style={{ backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <thead>
            <tr><th>Date</th><th>In/Out</th><th>Hrs</th><th>Status</th><th>Task Description</th></tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => (
              <tr key={log.id}>
                <td>{log.log_date}</td>
                <td style={{ fontSize: '12px' }}>{log.time_in} - {log.time_out}</td>
                <td><strong>{log.hours_rendered}</strong></td>
                <td>
                  <span style={{ 
                    fontSize: '10px', 
                    padding: '3px 8px', 
                    borderRadius: '10px', 
                    fontWeight: 'bold', 
                    textTransform: 'uppercase', 
                    backgroundColor: log.status === 'approved' ? '#eafaf1' : log.status === 'rejected' ? '#fdedec' : '#fef9e7', 
                    color: log.status === 'approved' ? '#27ae60' : log.status === 'rejected' ? '#e74c3c' : '#f39c12' 
                  }}>
                    {log.status || 'pending'}
                  </span>
                </td>
                <td style={{ fontSize: '12px', color: '#666' }}>{log.task_description}</td>
              </tr>
            ))}
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#999' }}>No logs found matching your filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .nav-btn {
          background-color: #27ae60;
          color: white;
          border: none;
          padding: 8px 15px;
          border-radius: 4px;
          font-weight: bold;
          font-size: 11px;
          cursor: pointer;
          transition: background 0.3s ease;
          margin-right: 10px;
        }
        .nav-btn:hover {
          background-color: #219150;
        }
        .logout-btn {
          background-color: #e74c3c;
          color: white;
          border: none;
          padding: 8px 15px;
          border-radius: 4px;
          font-weight: bold;
          font-size: 11px;
          cursor: pointer;
          transition: background 0.3s ease;
        }
        .logout-btn:hover {
          background-color: #c0392b;
        }
      `}} />
    </div>
  )
}