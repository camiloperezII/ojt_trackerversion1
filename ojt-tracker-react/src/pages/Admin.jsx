import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

/** * DATA NORMALIZATION UTILITY */
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
    if (clean === officialName || aliases.includes(clean)) return officialName;
  }
  return name.trim().toUpperCase();
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "☀️ Good Morning";
  if (hour < 18) return "🌤️ Good Afternoon";
  return "🌙 Good Evening";
};

export default function Admin() {
  const [users, setUsers] = useState([])
  const [recentLogs, setRecentLogs] = useState([]) // Optimized: Top 5 snapshot
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [schoolFilter, setSchoolFilter] = useState('All')
  const [searchTerm, setSearchTerm] = useState('') 
  const [viewMode, setViewMode] = useState('grid') 
  const [selectedUserId, setSelectedUserId] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchAdminData()
  }, [searchTerm, schoolFilter])

  const fetchAdminData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: adminProfile } = await supabase.from('users').select('full_name').eq('auth_id', user.id).single()
      setProfile(adminProfile)
    }

    // Optimization: Fetch interns with server-side search
    let userQuery = supabase.from('users').select('*').eq('role', 'user').order('full_name', { ascending: true });
    if (searchTerm) {
      userQuery = userQuery.ilike('full_name', `%${searchTerm}%`);
    }
    const { data: userData } = await userQuery;

    // Optimization: Fetch ONLY the 5 latest logs for the quick feed snapshot
    const { data: logData } = await supabase
      .from('logs')
      .select(`*, users!inner (full_name, school)`)
      .order('log_date', { ascending: false })
      .limit(5);
    
    if (userData) setUsers(userData)
    if (logData) setRecentLogs(logData)
    setLoading(false)
  }

  const uniqueSchools = Array.from(new Set(users.map(u => normalizeSchoolName(u.school)))).filter(Boolean).sort();

  const handleStatusUpdate = async (logId, newStatus) => {
    const { error } = await supabase.from('logs').update({ status: newStatus }).eq('id', logId);
    if (!error) {
      setRecentLogs(prev => prev.map(log => log.id === logId ? { ...log, status: newStatus } : log));
    }
  }

  // Local filter for schools (efficient for 100 users)
  const filteredUsers = users.filter(u => {
    const normalizedUserSchool = normalizeSchoolName(u.school);
    return schoolFilter === 'All' || normalizedUserSchool === schoolFilter;
  });

  if (loading && users.length === 0) return <div className="container"><p>Connecting to Secure Server...</p></div>

  return (
    <div className="admin-page">
      <nav className="navbar">
        <div className="nav-container">
          <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/Paombong.png" alt="Logo" style={{ height: '40px', width: 'auto' }} />
            <span style={{ fontWeight: 'bold' }}>ADMIN - PAOMBONG MUNICIPALITY</span>
          </div>
          <div className="nav-links">
            <button className="nav-btn" onClick={() => navigate('/admin-logs')}>FULL AUDIT LOG</button>
            <button className="logout-btn" onClick={() => navigate('/')}>Logout</button>
          </div>
        </div>
      </nav>

      <div className="container">
        <div style={{ marginBottom: '25px', marginTop: '10px' }}>
          <h2 style={{ color: '#2c3e50', fontSize: '26px', margin: 0 }}>
            {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'Admin'}!
          </h2>
          <p style={{ color: '#7f8c8d', fontSize: '14px', marginTop: '5px' }}>
            There are {filteredUsers.length} interns currently in the directory.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', backgroundColor: '#fff', padding: '15px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flex: 1 }}>
            <input 
              type="text" 
              placeholder="Quick search name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', width: '200px' }}
            />
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
              {filteredUsers.map(user => (
                <div key={user.id} className="card" style={{ border: '1px solid #eee', padding: '15px', borderRadius: '10px', background: 'white' }}>
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '15px' }}>{user.full_name}</h3>
                  <p style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase' }}>{normalizeSchoolName(user.school)}</p>
                  <p style={{ fontSize: '11px', color: '#27ae60', fontWeight: 'bold', marginTop: '10px' }}>Active Intern</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="view-container list-view-box">
            <table className="compact-table">
              <thead>
                <tr><th>Intern Name</th><th>Normalized School</th><th>Status</th></tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.id}>
                    <td><strong>{user.full_name}</strong></td>
                    <td style={{ fontSize: '12px', color: '#666' }}>{normalizeSchoolName(user.school)}</td>
                    <td style={{ color: '#27ae60', fontSize: '11px', fontWeight: 'bold' }}>ACTIVE</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', marginTop: '40px' }}>
          <h3 style={{ margin: 0 }}>Live Municipality Activity Feed (Latest 5)</h3>
          <button onClick={() => navigate('/admin-logs')} style={{ background: 'none', color: '#27ae60', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
            VIEW FULL AUDIT →
          </button>
        </div>

        <table>
          <thead>
            <tr><th>Intern Details</th><th>Log Date</th><th>Task Description</th><th>Hrs</th><th>Verification</th></tr>
          </thead>
          <tbody>
            {recentLogs.map((log) => (
              <tr key={log.id}>
                <td>
                  <strong>{log.users?.full_name}</strong>
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
        .nav-btn { background: #27ae60; color: white; border: none; padding: 8px 15px; border-radius: 4px; font-weight: bold; font-size: 11px; cursor: pointer; transition: 0.3s; margin-right: 10px; }
        .nav-btn:hover { background: #219150; }
        .view-toggle { display: flex; background: #f1f1f1; padding: 4px; border-radius: 8px; }
        .view-toggle button { border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: bold; color: #888; transition: 0.2s; }
        .view-toggle button.active { background: #fff; color: #27ae60; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .view-container { max-height: 350px; overflow-y: auto; padding-right: 5px; }
        .list-view-box { background: #fff; border: 1px solid #eee; border-radius: 8px; }
        .compact-table { width: 100%; border-collapse: collapse; }
        .compact-table th { background: #fafafa; padding: 12px; text-align: left; font-size: 11px; color: #999; text-transform: uppercase; }
        .compact-table td { padding: 12px; border-bottom: 1px solid #f9f9f9; }
        .status-btn { border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; color: white; font-weight: bold; }
        .status-btn.approve { background: #27ae60; }
        .status-btn.reject { background: #e74c3c; }
        .status-badge { font-size: 10px; font-weight: bold; text-transform: uppercase; padding: 4px 12px; border-radius: 12px; display: inline-block; }
        .status-badge.approved { background: #f0fff4; color: #27ae60; border: 1px solid #27ae60; }
        .status-badge.rejected { background: #fff5f5; color: #e74c3c; border: 1px solid #e74c3c; }
        .logout-btn { background: #e74c3c; color: white; border: none; padding: 8px 15px; border-radius: 4px; font-weight: bold; font-size: 11px; cursor: pointer; transition: 0.3s; }
      `}} />
    </div>
  )
}