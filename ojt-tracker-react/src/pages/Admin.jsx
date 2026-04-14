import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

/** * 1. HELPER ALGORITHMS (Master Logic) */
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

const formatStandardTime = (timeStr) => {
  if (!timeStr) return "";
  let [hours, minutes] = timeStr.split(':');
  hours = parseInt(hours);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "☀️ Good Morning";
  if (hour < 18) return "🌤️ Good Afternoon";
  return "🌙 Good Evening";
};

export default function Admin() {
  // --- 2. STATE MANAGEMENT ---
  const [users, setUsers] = useState([])
  const [recentLogs, setRecentLogs] = useState([]) 
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [schoolFilter, setSchoolFilter] = useState('All')
  const [searchTerm, setSearchTerm] = useState('') 
  const [viewMode, setViewMode] = useState('grid') 
  const [selectedUserId, setSelectedUserId] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchAdminData()
  }, [searchTerm, schoolFilter, selectedUserId])

  // --- 3. DATA FETCHING ---
  const fetchAdminData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: adminProfile } = await supabase.from('users').select('full_name').eq('auth_id', user.id).single()
      setProfile(adminProfile)
    }

    let userQuery = supabase.from('users').select('*').eq('role', 'user').order('full_name', { ascending: true });
    if (searchTerm) {
      userQuery = userQuery.ilike('full_name', `%${searchTerm}%`);
    }
    const { data: userData } = await userQuery;

    let logQuery = supabase
      .from('logs')
      .select(`*, users!inner (full_name, school)`)
      .order('log_date', { ascending: false });

    if (selectedUserId) {
      logQuery = logQuery.eq('user_id', selectedUserId);
    } else {
      logQuery = logQuery.limit(5);
    }

    const { data: logData } = await logQuery;
    
    if (userData) setUsers(userData)
    if (logData) setRecentLogs(logData)
    setLoading(false)
  }

  // --- 4. EVENT HANDLERS ---
  const handleStatusUpdate = async (logId, newStatus) => {
    const { error } = await supabase.from('logs').update({ status: newStatus }).eq('id', logId);
    if (!error) {
      setRecentLogs(prev => prev.map(log => log.id === logId ? { ...log, status: newStatus } : log));
    }
  }

  const uniqueSchools = Array.from(new Set(users.map(u => normalizeSchoolName(u.school)))).filter(Boolean).sort();

  const filteredUsers = users.filter(u => {
    const normalizedUserSchool = normalizeSchoolName(u.school);
    return schoolFilter === 'All' || normalizedUserSchool === schoolFilter;
  });

  return (
    <div className="admin-page">
      <nav className="navbar">
        <div className="nav-container">
          <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/Paombong.png" alt="Logo" style={{ height: '40px' }} />
            <span style={{ fontWeight: 'bold', color: 'var(--nav-text)', fontSize: '18px' }}>ADMIN COMMAND CENTER</span>
          </div>
          <div className="nav-links">
            <button className="back-btn" onClick={() => navigate('/admin-logs')}>FULL ARCHIVE</button>
            <button className="logout-btn" onClick={() => navigate('/')}>Logout</button>
          </div>
        </div>
      </nav>

      <div className="container">
        <div style={{ marginBottom: '25px', marginTop: '10px' }}>
          <h2 style={{ color: 'var(--text-main)', fontSize: '26px', margin: 0 }}>
            {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'Admin'}!
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '5px' }}>
            Managing {filteredUsers.length} interns in the directory.
          </p>
        </div>

        {/* Search and Filters - Blocky Style */}
        <div className="filter-card">
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flex: 1 }}>
            <input 
              type="text" 
              placeholder="Search name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="blocky-input"
              style={{ width: '200px' }}
            />
            <div className="view-toggle">
              <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}>Gallery</button>
              <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>Audit</button>
            </div>
          </div>
          
          <select 
            className="blocky-input"
            value={schoolFilter}
            onChange={(e) => setSchoolFilter(e.target.value)}
          >
            <option value="All">All Schools</option>
            {uniqueSchools.map(school => (
              <option key={school} value={school}>{school}</option>
            ))}
          </select>
        </div>

        {/* Intern Directory Container */}
        <div className="directory-scroll-box">
          {viewMode === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '15px', padding: '5px' }}>
              {filteredUsers.map(user => (
                <div 
                  key={user.id} 
                  className={`intern-block ${selectedUserId === user.id ? 'selected' : ''}`}
                  onClick={() => setSelectedUserId(selectedUserId === user.id ? null : user.id)}
                >
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '15px' }}>{user.full_name}</h3>
                  <p style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{normalizeSchoolName(user.school)}</p>
                  <p style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '10px', color: 'var(--primary-color)' }}>
                    {selectedUserId === user.id ? '● SELECTED' : '● ACTIVE'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <table className="master-table compact">
              <thead>
                <tr><th>Intern Name</th><th>School</th><th>Status</th></tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr 
                    key={user.id} 
                    onClick={() => setSelectedUserId(selectedUserId === user.id ? null : user.id)}
                    className={selectedUserId === user.id ? 'selected-row' : ''}
                  >
                    <td><strong>{user.full_name}</strong></td>
                    <td>{normalizeSchoolName(user.school)}</td>
                    <td style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>ACTIVE</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Activity Feed Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', marginTop: '40px' }}>
          <h3 style={{ margin: 0, color: 'var(--text-main)' }}>
            {selectedUserId ? `Activity for ${recentLogs[0]?.users?.full_name}` : "Recent Municipality Activity"}
          </h3>
          {selectedUserId && (
             <button onClick={() => setSelectedUserId(null)} className="clear-btn">CLEAR SELECTION</button>
          )}
        </div>

        <div className="table-container">
          <table className="master-table">
            <thead>
              <tr>
                <th>INTERN</th>
                <th>DATE / TIME</th>
                <th>TASK</th>
                <th>HRS</th>
                <th>VERIFICATION</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <strong>{log.users?.full_name}</strong>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{normalizeSchoolName(log.users?.school)}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '12px' }}>{log.log_date}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{formatStandardTime(log.time_in)} - {formatStandardTime(log.time_out)}</div>
                  </td>
                  <td style={{ fontSize: '12px', maxWidth: '300px' }}>{log.task_description}</td>
                  <td style={{ fontWeight: 'bold' }}>{log.hours_rendered}</td>
                  <td>
                    {(!log.status || log.status === 'pending') ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleStatusUpdate(log.id, 'approved')} className="action-btn approve">✓</button>
                        <button onClick={() => handleStatusUpdate(log.id, 'rejected')} className="action-btn reject">✕</button>
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
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .back-btn { background: var(--primary-color); color: white; border: none; padding: 8px 15px; border-radius: 4px; font-weight: bold; font-size: 11px; cursor: pointer; transition: 0.3s; margin-right: 10px; }
        .logout-btn { background: #e74c3c; color: white; border: none; padding: 8px 15px; border-radius: 4px; font-weight: bold; font-size: 11px; cursor: pointer; }
        .clear-btn { background: #7f8c8d; color: white; border: none; padding: 5px 12px; border-radius: 4px; cursor: pointer; font-size: 11px; }

        /* Master Design Components */
        .filter-card { display: flex; gap: 10px; margin-bottom: 25px; background: var(--card-bg); padding: 15px; border: 3px solid #3E2723; box-shadow: 6px 6px 0px rgba(0,0,0,0.1); }
        .blocky-input { padding: 10px; border: 2px solid #3E2723; background: var(--card-bg); color: var(--text-main); font-size: 13px; outline: none; }
        
        .view-toggle { display: flex; background: rgba(0,0,0,0.05); padding: 4px; border: 2px solid #3E2723; }
        .view-toggle button { border: none; padding: 6px 12px; cursor: pointer; font-size: 11px; font-weight: bold; background: transparent; color: #888; }
        .view-toggle button.active { background: #3E2723; color: white; }

        /* Intern Directory Blocks */
        .directory-scroll-box { height: 320px; overflow-y: scroll; border: 3px solid #3E2723; background: rgba(0,0,0,0.02); padding: 15px; border-radius: 4px; }
        .directory-scroll-box::-webkit-scrollbar { width: 8px; }
        .directory-scroll-box::-webkit-scrollbar-thumb { background: #3E2723; }

        .intern-block { background: var(--card-bg); padding: 15px; border: 2px solid #3E2723; box-shadow: 4px 4px 0px rgba(0,0,0,0.1); cursor: pointer; transition: 0.1s; }
        .intern-block:hover { transform: translate(-2px, -2px); box-shadow: 6px 6px 0px rgba(0,0,0,0.1); }
        .intern-block.selected { border-color: var(--primary-color); background: rgba(39, 174, 96, 0.05); transform: translate(2px, 2px); box-shadow: 0px 0px 0px transparent; }

        /* Master Table */
        .table-container { background: var(--card-bg); border: 3px solid #3E2723; box-shadow: 8px 8px 0px rgba(0,0,0,0.1); overflow: hidden; margin-bottom: 50px; }
        .master-table { width: 100%; border-collapse: collapse; }
        .master-table th { text-align: left; padding: 15px; background: rgba(0,0,0,0.05); color: var(--text-muted); font-size: 11px; text-transform: uppercase; border-bottom: 3px solid #3E2723; }
        .master-table td { padding: 15px; border-bottom: 1px solid rgba(0,0,0,0.05); color: var(--text-main); }
        .master-table tr:hover { background: rgba(0,0,0,0.02); cursor: pointer; }
        .selected-row { background: rgba(39, 174, 96, 0.1) !important; }

        /* Centered Action Buttons Fix */
        .action-btn { 
            display: flex; align-items: center; justify-content: center;
            border: 2px solid #3E2723; width: 32px; height: 32px; 
            cursor: pointer; color: white; font-weight: bold; font-size: 16px; 
            transition: 0.2s; padding: 0; line-height: 0;
        }
        .action-btn.approve { background: var(--primary-color); }
        .action-btn.reject { background: #e74c3c; }
        .action-btn:hover { transform: translate(-2px, -2px); box-shadow: 2px 2px 0px #3E2723; }

        .status-badge { font-size: 10px; font-weight: bold; text-transform: uppercase; padding: 4px 12px; border: 2px solid #3E2723; display: inline-block; }
        .status-badge.approved { color: var(--primary-color); }
        .status-badge.rejected { color: #e74c3c; background: #fff5f5; }
      `}} />
    </div>
  )
}