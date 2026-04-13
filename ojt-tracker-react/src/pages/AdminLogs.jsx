import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function AdminLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [schoolFilter, setSchoolFilter] = useState('All')
  const navigate = useNavigate()

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('logs')
      .select(`*, users!inner (full_name, school)`)
      .order('log_date', { ascending: false });
    if (data) setLogs(data);
    setLoading(false);
  }

  const filteredLogs = logs.filter(log => {
    const nameMatch = log.users?.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    const taskMatch = log.task_description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || log.status === statusFilter;
    const matchesSchool = schoolFilter === 'All' || log.users?.school === schoolFilter;
    return (nameMatch || taskMatch) && matchesStatus && matchesSchool;
  });

  const uniqueSchools = Array.from(new Set(logs.map(l => l.users?.school))).filter(Boolean).sort();

  return (
    <div className="admin-page">
      <nav className="navbar">
        <div className="nav-container">
          <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Added your Logo here */}
            <img src="/Paombong.png" alt="Logo" style={{ height: '40px', width: 'auto' }} />
            <span style={{ fontWeight: 'bold', color: '#27ae60', fontSize: '18px' }}> MUNICIPALITY LOG AUDIT </span>
          </div>
          <div className="nav-links">
            <button className="back-btn" onClick={() => navigate('/admin')}>BACK TO DASHBOARD</button>
            <button className="logout-btn" onClick={() => navigate('/')}>Logout</button>
          </div>
        </div>
      </nav>

      <div className="container">
        <div style={{ marginBottom: '20px', marginTop: '20px' }}>
          <h2>Full Municipality Archive</h2>
          <p style={{ color: '#666' }}>Filtering through {filteredLogs.length} total entries.</p>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', backgroundColor: '#fff', padding: '15px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <input type="text" placeholder="Search name or task..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ flex: 2, padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}>
            <option value="All">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
          <select value={schoolFilter} onChange={(e) => setSchoolFilter(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}>
            <option value="All">All Schools</option>
            {uniqueSchools.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <table style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', width: '100%' }}>
          <thead>
            <tr>
              <th>INTERN</th>
              <th>DATE</th>
              <th>TASK</th>
              <th>HRS</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map(log => (
              <tr key={log.id}>
                <td><strong>{log.users?.full_name}</strong><br/><small style={{color: '#999'}}>{log.users?.school}</small></td>
                <td>{log.log_date}</td>
                <td style={{ fontSize: '13px', color: '#444' }}>{log.task_description}</td>
                <td style={{ fontWeight: 'bold' }}>{log.hours_rendered}</td>
                <td>
                  <span className={`status-badge ${log.status || 'pending'}`}>
                    {log.status || 'pending'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .back-btn { 
          background: #27ae60; 
          color: white; 
          border: none; 
          padding: 8px 15px; 
          border-radius: 4px; 
          font-weight: bold; 
          font-size: 11px; 
          cursor: pointer; 
          transition: 0.3s;
          margin-right: 10px;
        }

        .logout-btn { 
          background: #e74c3c; 
          color: white; 
          border: none; 
          padding: 8px 15px; 
          border-radius: 4px; 
          font-weight: bold; 
          font-size: 11px; 
          cursor: pointer; 
          transition: 0.3s; 
        }

        .status-badge { 
          font-size: 10px; 
          font-weight: bold; 
          text-transform: uppercase; 
          padding: 4px 12px; 
          border-radius: 12px; 
          display: inline-block; 
        }

        .status-badge.approved { 
          background: #f0fff4; 
          color: #27ae60; 
          border: 1px solid #27ae60; 
        }

        .status-badge.rejected { 
          background: #fff5f5; 
          color: #e74c3c; 
          border: 1px solid #e74c3c; 
        }

        .status-badge.pending { 
          background: #fef9e7; 
          color: #f39c12; 
          border: 1px solid #f39c12; 
        }

        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; padding: 15px; background: #fafafa; color: #666; font-size: 11px; }
        td { padding: 15px; border-bottom: 1px solid #eee; }
      `}} />
    </div>
  )
}