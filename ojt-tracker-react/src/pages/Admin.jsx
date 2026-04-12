import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function Admin() {
  const [users, setUsers] = useState([])
  const [allLogs, setAllLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUserId, setSelectedUserId] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchAdminData()
  }, [])

  const fetchAdminData = async () => {
    setLoading(true)
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'user')
      .order('full_name', { ascending: true })

    const { data: logData } = await supabase
      .from('logs')
      .select(`*, users (full_name, school)`)
      .order('log_date', { ascending: false })
    
    if (userData) setUsers(userData)
    if (logData) setAllLogs(logData)
    setLoading(false)
  }

  const calculateProgress = (userId, required) => {
    const userLogs = allLogs.filter(log => log.user_id === userId)
    const rendered = userLogs.reduce((sum, log) => sum + parseFloat(log.hours_rendered || 0), 0)
    const target = required || 600
    return {
      rendered: rendered.toFixed(2),
      percent: Math.min((rendered / target) * 100, 100).toFixed(0)
    }
  }

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.school.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const displayedLogs = selectedUserId 
    ? allLogs.filter(log => log.user_id === selectedUserId)
    : allLogs.slice(0, 15)

  // --- MOVED FUNCTION: Place exportAdminCSV here ---
  const exportAdminCSV = () => {
    const logsToExport = selectedUserId 
      ? allLogs.filter(log => log.user_id === selectedUserId)
      : allLogs;

    const headers = ["Intern Name", "School", "Date", "In", "Out", "Hours", "Task"];
    const rows = logsToExport.map(log => [
      log.users?.full_name,
      log.users?.school,
      log.log_date,
      log.time_in,
      log.time_out,
      log.hours_rendered,
      `"${log.task_description.replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const fileName = selectedUserId ? `OJT_Report_User_${selectedUserId}.csv` : "Full_Municipality_OJT_Report.csv";
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="container"><p>Loading Admin Data...</p></div>

  return (
    <div>
      <nav className="navbar">
        <div className="nav-container">
          <div className="logo">ADMIN - PAOMBONG MUNICIPALITY</div>
          <div className="nav-links">
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}>My Dashboard</a>
            <button className="logout-btn" onClick={() => navigate('/')}>Logout</button>
          </div>
        </div>
      </nav>

      <div className="container">
        <div className="admin-bar">Master Oversight: {users.length} Interns Currently Registered</div>

        {/* Search Bar */}
        <div style={{ marginBottom: '20px' }}>
          <input 
            type="text" 
            placeholder="Search by name or school..." 
            className="input-group"
            style={{ width: '100%', padding: '12px' }}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Intern Progress Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          {filteredUsers.map(user => {
            const stats = calculateProgress(user.id, user.total_required)
            const isSelected = selectedUserId === user.id
            return (
              <div 
                key={user.id} 
                className="card" 
                onClick={() => setSelectedUserId(isSelected ? null : user.id)}
                style={{ 
                  cursor: 'pointer',
                  border: isSelected ? '2px solid #27ae60' : '1px solid transparent',
                  backgroundColor: isSelected ? '#f0fff4' : 'white',
                  transition: 'all 0.2s ease'
                }}
              >
                <h3 style={{ color: '#2c3e50', marginBottom: '5px' }}>{user.full_name}</h3>
                <p style={{ fontSize: '12px', color: '#7f8c8d', margin: '0' }}>{user.school || 'No School Assigned'}</p>
                <div className="progress-bar" style={{ height: '12px', margin: '15px 0' }}>
                  <div className="fill" style={{ width: `${stats.percent}%` }}></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold' }}>
                  <span>{stats.rendered} hrs</span>
                  <span style={{ color: '#27ae60' }}>{stats.percent}% Complete</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* UPDATED HEADER SECTION: Replaces lines 117-127 of your snippet */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3>{selectedUserId ? 'User Specific Logs' : 'Recent Global Activity'}</h3>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={exportAdminCSV} 
              style={{ backgroundColor: '#2980b9', color: 'white', border: 'none', borderRadius: '4px', padding: '5px 15px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              DOWNLOAD CSV
            </button>
            {selectedUserId && (
              <button 
                onClick={() => setSelectedUserId(null)}
                style={{ padding: '5px 15px', cursor: 'pointer', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Intern</th>
              <th>Date</th>
              <th>Task</th>
              <th>Hours</th>
            </tr>
          </thead>
          <tbody>
            {displayedLogs.map((log) => (
              <tr key={log.id}>
                
                <td>

                  <strong>{log.users?.full_name}</strong>
                  <div style={{ fontSize: '10px', color: '#999' }}>{log.users?.school}</div>
                </td>
                <td>{log.log_date}</td>
                <td style={{ fontSize: '13px' }}>{log.task_description}</td>
                <td style={{ fontWeight: 'bold', color: '#2c3e50' }}>{log.hours_rendered}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {displayedLogs.length === 0 && (
          <p style={{ textAlign: 'center', color: '#999', marginTop: '20px' }}>No logs found for this user.</p>
        )}
      </div>
    </div>
  )
}


