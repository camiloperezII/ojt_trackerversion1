import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

/** * DATA NORMALIZATION UTILITY
 * Groups variations like "L.C.U.P" and "lcup" into a single official name.
 */
const normalizeSchoolName = (name) => {
  if (!name) return 'Unassigned';
  const clean = name.replace(/[\.\-\s]/g, '').toUpperCase();
  const mapping = {
    'LCUP': ['LACO', 'LACON', 'LACONSOLE', 'L.C.U.P', 'LACONSOLACION'],
    'BULSU': ['BSU', 'BULACANSTATE', 'BULACANSTATEUNIVERSITY'],
    'CEU': ['CENTROESCOLAR', 'C.E.U'],
    'UST': ['UNIVERSITYOFSANTOTOMAS', 'U.S.T']
  };

  for (const [officialName, aliases] of Object.entries(mapping)) {
    if (clean === officialName || aliases.includes(clean)) {
      return officialName;
    }
  }
  return name.trim().toUpperCase();
};

// --- GREETING ALGORITHM ---
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "☀️ Good Morning";
  if (hour < 18) return "🌤️ Good Afternoon";
  return "🌙 Good Evening";
};

export default function Admin() {
  const [users, setUsers] = useState([])
  const [allLogs, setAllLogs] = useState([])
  const [profile, setProfile] = useState(null) // State for Admin profile
  const [loading, setLoading] = useState(true)
  const [schoolFilter, setSchoolFilter] = useState('All')
  const [viewMode, setViewMode] = useState('grid') 
  const [selectedUserId, setSelectedUserId] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchAdminData()
  }, [])

  const fetchAdminData = async () => {
    setLoading(true)
    
    // 1. Fetch Admin Profile for Greeting
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: adminProfile } = await supabase
        .from('users')
        .select('full_name')
        .eq('auth_id', user.id)
        .single()
      setProfile(adminProfile)
    }

    // 2. Fetch all interns
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'user')
      .order('full_name', { ascending: true })

    // 3. Fetch all logs with a JOIN to the users table
    const { data: logData, error: logError } = await supabase
      .from('logs')
      .select(`
        *,
        users!inner (
          full_name,
          school
        )
      `)
      .order('log_date', { ascending: false })
    
    if (logError) console.error("Database Join Error:", logError)
    
    if (userData) setUsers(userData)
    if (logData) setAllLogs(logData)
    setLoading(false)
  }

  const uniqueSchools = Array.from(
    new Set(users.map(u => normalizeSchoolName(u.school)))
  ).filter(Boolean).sort();

  const handleStatusUpdate = async (logId, newStatus) => {
    const { error } = await supabase.from('logs').update({ status: newStatus }).eq('id', logId);
    if (error) {
      alert("Database Error: " + error.message);
    } else {
      setAllLogs(prev => prev.map(log => log.id === logId ? { ...log, status: newStatus } : log));
    }
  }

  const calculateProgress = (userId, required) => {
    const userLogs = allLogs.filter(log => 
      log.user_id === userId && log.status === 'approved'
    );
    
    const rendered = userLogs.reduce((sum, log) => sum + parseFloat(log.hours_rendered || 0), 0)
    const target = required || 600
    
    return {
      rendered: rendered.toFixed(2),
      percent: Math.min((rendered / target) * 100, 100).toFixed(0)
    }
  }

  const filteredUsers = users.filter(u => {
    const normalizedUserSchool = normalizeSchoolName(u.school);
    return schoolFilter === 'All' || normalizedUserSchool === schoolFilter;
  });

  const displayedLogs = selectedUserId 
    ? allLogs.filter(log => log.user_id === selectedUserId)
    : allLogs.slice(0, 25)

  const exportAdminCSV = () => {
    const logsToExport = selectedUserId ? allLogs.filter(log => log.user_id === selectedUserId) : allLogs;
    const headers = ["Intern Name", "School", "Date", "In", "Out", "Hours", "Status", "Task"];
    const rows = logsToExport.map(log => [
      log.users?.full_name || 'Unknown', 
      log.users?.school || 'N/A', 
      log.log_date, 
      log.time_in, 
      log.time_out, 
      log.hours_rendered, 
      log.status || 'pending', 
      `"${(log.task_description || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", selectedUserId ? `Report_User_${selectedUserId}.csv` : "Full_Municipality_OJT_Report.csv");
    link.click();
  };

  if (loading) return <div className="container"><p>Connecting to Secure Server...</p></div>

  return (
    <div className="admin-page">
      <nav className="navbar">
        <div className="nav-container">
          <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/Paombong.png" alt="Logo" style={{ height: '40px', width: 'auto' }} />
            <span style={{ fontWeight: 'bold' }}>ADMIN - PAOMBONG MUNICIPALITY</span>
          </div>
          <div className="nav-links">
            <button className="logout-btn" onClick={() => navigate('/')}>Logout</button>
          </div>
        </div>
      </nav>

      <div className="container">
        
        {/* GREETING SECTION */}
        <div style={{ marginBottom: '25px', marginTop: '10px' }}>
          <h2 style={{ color: '#2c3e50', fontSize: '26px', margin: 0 }}>
            {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'Admin'}!
          </h2>
          <p style={{ color: '#7f8c8d', fontSize: '14px', marginTop: '5px' }}>
            There are {filteredUsers.length} interns currently under your supervision.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', backgroundColor: '#fff', padding: '15px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <div className="view-toggle">
              <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}>Gallery View</button>
              <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>Audit View</button>
            </div>
          </div>
          
          <select 
            className="filter-select"
            value={schoolFilter}
            onChange={(e) => setSchoolFilter(e.target.value)}
            style={{ padding: '10px 15px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer' }}
          >
            <option value="All">All Registered Schools</option>
            {uniqueSchools.map(school => (
              <option key={school} value={school}>{school}</option>
            ))}
          </select>
        </div>

        {viewMode === 'grid' ? (
          <div className="view-container">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '15px' }}>
              {filteredUsers.map(user => {
                const stats = calculateProgress(user.id, user.total_required)
                const isSelected = selectedUserId === user.id
                return (
                  <div key={user.id} className={`card ${isSelected ? 'selected' : ''}`} onClick={() => setSelectedUserId(isSelected ? null : user.id)}>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '15px' }}>{user.full_name}</h3>
                    <p style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase' }}>{normalizeSchoolName(user.school)}</p>
                    <div className="progress-bar-mini"><div className="fill" style={{ width: `${stats.percent}%` }}></div></div>
                    <div className="card-footer"><span>{stats.rendered} hrs rendered</span><span>{stats.percent}%</span></div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="view-container list-view-box">
            <table className="compact-table">
              <thead>
                <tr>
                  <th>Intern Name</th>
                  <th>Normalized School</th>
                  <th>Progress</th>
                  <th>Total Hrs (Approved)</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => {
                  const stats = calculateProgress(user.id, user.total_required)
                  const isSelected = selectedUserId === user.id
                  return (
                    <tr key={user.id} className={isSelected ? 'selected-row' : ''} onClick={() => setSelectedUserId(isSelected ? null : user.id)}>
                      <td><strong>{user.full_name}</strong></td>
                      <td style={{ fontSize: '12px', color: '#666' }}>{normalizeSchoolName(user.school)}</td>
                      <td>
                         <div className="progress-bar-list"><div className="fill" style={{ width: `${stats.percent}%` }}></div></div>
                      </td>
                      <td style={{ fontWeight: 'bold', textAlign: 'right' }}>{stats.rendered}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', marginTop: '40px' }}>
          <h3 style={{ margin: 0 }}>{selectedUserId ? 'Detailed Verification Audit' : 'Live Municipality Activity Feed'}</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={exportAdminCSV} className="action-btn download">DOWNLOAD CSV</button>
            {selectedUserId && <button onClick={() => setSelectedUserId(null)} className="action-btn reset">RESET VIEW</button>}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Intern Details</th>
              <th>Log Date</th>
              <th>Task Description</th>
              <th>Hrs</th>
              <th>Verification</th>
            </tr>
          </thead>
          <tbody>
            {displayedLogs.map((log) => (
              <tr key={log.id}>
                <td>
                  <strong>{log.users?.full_name || `Unknown ID: ${log.user_id}`}</strong>
                  <div style={{ fontSize: '10px', color: '#999' }}>{normalizeSchoolName(log.users?.school)}</div>
                </td>
                <td style={{ fontSize: '12px' }}>{log.log_date}</td>
                <td style={{ fontSize: '12px', color: '#444', maxWidth: '300px' }}>{log.task_description}</td>
                <td style={{ fontWeight: 'bold' }}>{log.hours_rendered}</td>
                <td>
                  {(!log.status || log.status === 'pending') ? (
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button onClick={() => handleStatusUpdate(log.id, 'approved')} className="status-btn approve">✓</button>
                      <button onClick={() => handleStatusUpdate(log.id, 'rejected')} className="status-btn reject">✕</button>
                    </div>
                  ) : (
                    <span className={`status-badge ${log.status}`}>{log.status}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .view-toggle { display: flex; background: #f1f1f1; padding: 4px; border-radius: 8px; }
        .view-toggle button { border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: bold; color: #888; transition: 0.2s; }
        .view-toggle button.active { background: #fff; color: #27ae60; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        
        .view-container { max-height: 400px; overflow-y: auto; padding-right: 5px; }
        .list-view-box { background: #fff; border: 1px solid #eee; border-radius: 8px; }

        .compact-table { width: 100%; border-collapse: collapse; cursor: pointer; }
        .compact-table th { background: #fafafa; padding: 12px; text-align: left; font-size: 11px; color: #999; text-transform: uppercase; }
        .compact-table td { padding: 12px; border-bottom: 1px solid #f9f9f9; }
        .selected-row { background: #f0fff4 !important; }

        .card.selected { border: 2px solid #27ae60 !important; background: #fafffb; transform: scale(1.01); }
        .progress-bar-mini, .progress-bar-list { height: 6px; background: #eee; border-radius: 10px; overflow: hidden; }
        .fill { height: 100%; background: #27ae60; border-radius: 10px; }
        .card-footer { display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; color: #27ae60; margin-top: 5px; }

        .status-btn { border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; color: white; font-weight: bold; }
        .status-btn.approve { background: #27ae60; }
        .status-btn.reject { background: #e74c3c; }
        
        .status-badge { font-size: 10px; font-weight: bold; text-transform: uppercase; padding: 4px 12px; border-radius: 12px; display: inline-block; }
        .status-badge.approved { background: #f0fff4; color: #27ae60; border: 1px solid #27ae60; }
        .status-badge.rejected { background: #fff5f5; color: #e74c3c; border: 1px solid #e74c3c; }

        .action-btn { border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; color: white; font-weight: bold; font-size: 11px; }
        .action-btn.download { background: #2980b9; }
        .action-btn.reset { background: #7f8c8d; }
      `}} />
    </div>
  )
}