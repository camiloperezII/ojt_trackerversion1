import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

// --- 1. MASTER HELPER ALGORITHMS ---
const formatStandardTime = (timeStr) => {
  if (!timeStr) return "";
  let [hours, minutes] = timeStr.split(':');
  hours = parseInt(hours);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
};

export default function Logs() {
  // --- 2. STATE MANAGEMENT ---
  const [allLogs, setAllLogs] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const navigate = useNavigate()

  useEffect(() => {
    fetchUserAndLogs()
  }, [])

  // --- 3. DATA FETCHING (Personal Logs) ---
  const fetchUserAndLogs = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const { data: profileData } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', user.id)
        .single()
      
      if (profileData) {
        setProfile(profileData)
        const { data: logsData } = await supabase
          .from('logs')
          .select('*')
          .eq('user_id', profileData.id)
          .order('log_date', { ascending: false })
        
        if (logsData) setAllLogs(logsData)
      }
    } else {
      navigate('/')
    }
    setLoading(false)
  }

  // --- 4. CSV EXPORT LOGIC ---
  const exportToCSV = () => {
    if (filteredLogs.length === 0) return alert("No logs available to export.");
    const headers = ["Log Date", "Time In", "Time Out", "Hours Rendered", "Task Description", "Status"];
    const rows = filteredLogs.map(log => [
      log.log_date,
      formatStandardTime(log.time_in),
      formatStandardTime(log.time_out),
      log.hours_rendered,
      `"${(log.task_description || "").replace(/"/g, '""')}"`,
      log.status || 'pending'
    ]);
    const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `my_rendering_audit_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this log?")) {
      const { error } = await supabase.from('logs').delete().eq('id', id)
      if (!error) fetchUserAndLogs();
    }
  }

  // --- 5. FILTERING LOGIC ---
  const filteredLogs = allLogs.filter(log => {
    const taskMatch = log.task_description.toLowerCase().includes(searchTerm.toLowerCase());
    const dateMatch = log.log_date.includes(searchTerm);
    const matchesStatus = statusFilter === 'All' || log.status === statusFilter;
    return (taskMatch || dateMatch) && matchesStatus;
  });

  return (
    <div className="admin-page">
      <nav className="navbar">
        <div className="nav-container">
          <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/Paombong.png" alt="Logo" style={{ height: '40px' }} />
            <span style={{ fontWeight: 'bold', color: 'var(--nav-text)', fontSize: '18px' }}> OJT LOG ARCHIVE </span>
          </div>
          <div className="nav-links">
            <button className="back-btn" onClick={() => navigate('/dashboard')}>BACK TO DASHBOARD</button>
            <button className="logout-btn" onClick={() => navigate('/')}>Logout</button>
          </div>
        </div>
      </nav>

      <div className="container">
        <div style={{ marginBottom: '25px', marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h2 style={{ color: 'var(--text-main)', fontSize: '26px', margin: 0 }}>My Rendering History</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '5px' }}>
              Auditing {filteredLogs.length} personal entries for {profile?.full_name}
            </p>
          </div>
          <button onClick={exportToCSV} className="export-btn">📥 DOWNLOAD CSV</button>
        </div>

        {/* Master Filter Card */}
        <div className="filter-card">
          <input 
            type="text" 
            placeholder="Search tasks or date..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="blocky-input"
            style={{ flex: 2 }}
          />
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)} 
            className="blocky-input" 
            style={{ flex: 1 }}
          >
            <option value="All">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {loading ? (
          <div className="filter-card" style={{ textAlign: 'center' }}>Loading your secure records...</div>
        ) : (
          <div className="table-container">
            <table className="master-table">
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>IN / OUT</th>
                  <th>HRS</th>
                  <th>STATUS</th>
                  <th>TASK DESCRIPTION</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <tr key={log.id}>
                      <td><strong>{log.log_date}</strong></td>
                      <td style={{ fontSize: '12px' }}>
                        {formatStandardTime(log.time_in)} - {formatStandardTime(log.time_out)}
                      </td>
                      <td style={{ fontWeight: 'bold' }}>{log.hours_rendered}</td>
                      <td>
                        <span className={`status-badge ${log.status || 'pending'}`}>
                          {log.status || 'pending'}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '300px' }}>
                        {log.task_description}
                      </td>
                      <td>
                        <button 
                          onClick={() => handleDelete(log.id)} 
                          className="mini-action-btn del"
                        >✕</button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No logs found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .back-btn { background: var(--primary-color); color: white; border: none; padding: 8px 15px; border-radius: 4px; font-weight: bold; font-size: 11px; cursor: pointer; transition: 0.3s; margin-right: 10px; }
        .logout-btn { background: #e74c3c; color: white; border: none; padding: 8px 15px; border-radius: 4px; font-weight: bold; font-size: 11px; cursor: pointer; }
        
        .export-btn { 
          background: var(--navbar-bg); 
          color: var(--nav-text); 
          border: 3px solid #3E2723; 
          box-shadow: 4px 4px 0px rgba(0,0,0,0.1); 
          padding: 10px 18px; 
          font-weight: bold; 
          font-size: 12px; 
          cursor: pointer; 
          transition: 0.1s;
        }
        .export-btn:hover { transform: translate(-1px, -1px); box-shadow: 5px 5px 0px rgba(0,0,0,0.1); }
        .export-btn:active { transform: translate(2px, 2px); box-shadow: 0px 0px 0px transparent; }

        /* Master Design Components */
        .filter-card { display: flex; gap: 10px; margin-bottom: 25px; background: var(--card-bg); padding: 15px; border: 3px solid #3E2723; box-shadow: 6px 6px 0px rgba(0,0,0,0.1); }
        .blocky-input { padding: 10px; border: 2px solid #3E2723; background: var(--card-bg); color: var(--text-main); font-size: 13px; outline: none; }

        .table-container { background: var(--card-bg); border: 3px solid #3E2723; box-shadow: 8px 8px 0px rgba(0,0,0,0.1); overflow: hidden; margin-bottom: 50px; }
        .master-table { width: 100%; border-collapse: collapse; }
        .master-table th { text-align: left; padding: 15px; background: rgba(0,0,0,0.05); color: var(--text-muted); font-size: 11px; text-transform: uppercase; border-bottom: 3px solid #3E2723; }
        .master-table td { padding: 15px; border-bottom: 1px solid rgba(0,0,0,0.05); color: var(--text-main); }
        .master-table tr:hover { background: rgba(0,0,0,0.02); }

        .status-badge { font-size: 9px; font-weight: bold; text-transform: uppercase; padding: 4px 10px; border: 2px solid #3E2723; display: inline-block; }
        .status-badge.approved { color: var(--primary-color); }
        .status-badge.rejected { color: #e74c3c; background: #fff5f5; }
        .status-badge.pending { color: #f39c12; background: #fef9e7; }

        .mini-action-btn { 
          display: flex; align-items: center; justify-content: center;
          border: 2px solid #3E2723; width: 28px; height: 28px; 
          cursor: pointer; color: white; font-weight: bold; font-size: 12px; 
          transition: 0.1s; padding: 0; line-height: 0;
        }
        .mini-action-btn.del { background: #e74c3c; }
        .mini-action-btn:hover { transform: translate(-1px, -1px); box-shadow: 2px 2px 0px #3E2723; }
      `}} />
    </div>
  )
}