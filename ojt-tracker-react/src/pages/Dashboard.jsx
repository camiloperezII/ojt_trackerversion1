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

const calculateHoursWithLunch = (timeIn, timeOut) => {
  if (!timeIn || !timeOut) return "0.00";
  const start = new Date(`1970-01-01T${timeIn}:00`);
  const end = new Date(`1970-01-01T${timeOut}:00`);
  let diff = (end - start) / (1000 * 60 * 60);
  if (diff < 0) diff += 24;
  const lunchStart = new Date(`1970-01-01T12:00:00`);
  const lunchEnd = new Date(`1970-01-01T13:00:00`);
  if (start <= lunchStart && end >= lunchEnd) diff -= 1;
  return Math.max(0, diff).toFixed(2);
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "☀️ Good Morning";
  if (hour < 18) return "🌤️ Good Afternoon";
  return "🌙 Good Evening";
};

const calculateEstimatedFinish = (remainingHours) => {
  if (remainingHours <= 0) return "Completed!";
  let daysNeeded = Math.ceil(remainingHours / 8); 
  let currentDate = new Date();
  let workDaysAdded = 0;
  while (workDaysAdded < daysNeeded) {
    currentDate.setDate(currentDate.getDate() + 1);
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) workDaysAdded++;
  }
  return currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function Dashboard() {
  // --- STATE MANAGEMENT ---
  const [recentLogs, setRecentLogs] = useState([]) 
  const [totalHours, setTotalHours] = useState(0)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const navigate = useNavigate()

  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0])
  const [timeIn, setTimeIn] = useState('')
  const [timeOut, setTimeOut] = useState('')
  const [task, setTask] = useState('')

  const requiredHours = profile?.total_hours_required || 600

  useEffect(() => {
    fetchUserAndData()
  }, [])

  // --- DATA FETCHING ---
  const fetchUserAndData = async () => {
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
        await Promise.all([
          fetchRecentLogs(profileData.id),
          fetchTotalApprovedHours(profileData.id)
        ])
      }
    } else {
      navigate('/')
    }
    setLoading(false)
  }

  const fetchRecentLogs = async (userId) => {
    const { data } = await supabase
      .from('logs')
      .select('*')
      .eq('user_id', userId)
      .order('log_date', { ascending: false })
      .limit(5)
    if (data) setRecentLogs(data)
  }

  const fetchTotalApprovedHours = async (userId) => {
    const { data } = await supabase
      .from('logs')
      .select('hours_rendered') 
      .eq('user_id', userId)
      .eq('status', 'approved')
    
    if (data) {
      const total = data.reduce((sum, log) => sum + parseFloat(log.hours_rendered || 0), 0)
      setTotalHours(total)
    }
  }

  // --- EVENT HANDLERS ---
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure?")) {
      const { error } = await supabase.from('logs').delete().eq('id', id)
      if (!error) {
        fetchRecentLogs(profile.id)
        fetchTotalApprovedHours(profile.id)
      }
    }
  }

  const startEdit = (log) => {
    setEditingId(log.id); 
    setLogDate(log.log_date); 
    setTimeIn(log.time_in); 
    setTimeOut(log.time_out); 
    setTask(log.task_description);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const cancelEdit = () => { 
    setEditingId(null); 
    setLogDate(new Date().toISOString().split('T')[0]); 
    setTimeIn(''); setTimeOut(''); setTask(''); 
  }

  const handleSaveLog = async (e) => {
    e.preventDefault(); 
    if (!profile) return;
    setLoading(true);
    const logData = { 
        user_id: profile.id, 
        log_date: logDate, 
        time_in: timeIn, 
        time_out: timeOut, 
        hours_rendered: calculateHoursWithLunch(timeIn, timeOut), 
        task_description: task, 
        status: 'pending' 
    }
    
    const { error } = editingId 
        ? await supabase.from('logs').update(logData).eq('id', editingId)
        : await supabase.from('logs').insert([logData]);

    if (!error) { 
      cancelEdit(); 
      fetchRecentLogs(profile.id); 
      fetchTotalApprovedHours(profile.id); 
    }
    setLoading(false);
  }

  const remaining = Math.max(requiredHours - totalHours, 0)
  const progressPercent = Math.min((totalHours / requiredHours) * 100, 100)

  return (
    <div className="admin-page">
      <nav className="navbar">
        <div className="nav-container">
          <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/Paombong.png" alt="Logo" style={{ height: '40px' }} />
            <span style={{ fontWeight: 'bold', color: 'var(--nav-text)', fontSize: '18px' }}> OJT TRACKER </span>
          </div>
          <div className="nav-links">
            <button className="back-btn" onClick={() => navigate('/logs')}>LOG HISTORY</button>
            {profile?.role === 'admin' && (
              <button className="back-btn" onClick={() => navigate('/admin')}>ADMIN PANEL</button>
            )}
            <button className="logout-btn" onClick={() => navigate('/')}>Logout</button>
          </div>
        </div>
      </nav>

      <div className="container">
        <div style={{ marginBottom: '25px', marginTop: '10px' }}>
          <h2 style={{ color: 'var(--text-main)', fontSize: '26px', margin: 0 }}>
            {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'Intern'}!
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '5px' }}>Logged in as Intern at Paombong Municipal Office.</p>
        </div>

        {/* Master Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '25px' }}>
          <div className="filter-card stat-box">
            <label>TOTAL APPROVED</label>
            <p>{totalHours.toFixed(2)} hrs</p>
          </div>
          <div className="filter-card stat-box" style={{ borderColor: '#f39c12' }}>
            <label>HOURS REMAINING</label>
            <p>{remaining.toFixed(2)} hrs</p>
          </div>
          <div className="filter-card stat-box" style={{ borderColor: 'var(--primary-color)' }}>
            <label>EST. COMPLETION</label>
            <p style={{ fontSize: '18px' }}>{calculateEstimatedFinish(remaining)}</p>
          </div>
        </div>

        {/* Master Progress Bar */}
        <div className="master-progress-container">
            <div className="master-progress-fill" style={{ width: `${progressPercent}%` }}>
                <span className="progress-label">{progressPercent.toFixed(0)}%</span>
            </div>
        </div>

        {/* Master Clock In/Out Form */}
        <form onSubmit={handleSaveLog} className="filter-card form-container">
          <h3 style={{ margin: '0 0 15px 0', color: 'var(--text-main)' }}>{editingId ? "Update Activity Log" : "New Daily Time Record"}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
              <div className="input-unit">
                <label>Log Date</label>
                <input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} required className="blocky-input" />
              </div>
              <div className="input-unit">
                <label>Time In</label>
                <input type="time" value={timeIn} onChange={(e) => setTimeIn(e.target.value)} required className="blocky-input" />
              </div>
              <div className="input-unit">
                <label>Time Out</label>
                <input type="time" value={timeOut} onChange={(e) => setTimeOut(e.target.value)} required className="blocky-input" />
              </div>
          </div>
          <div className="input-unit" style={{ marginTop: '15px' }}>
            <label>Task Description / Work Details</label>
            <textarea placeholder="Specify work done..." value={task} onChange={(e) => setTask(e.target.value)} required className="blocky-input" style={{ minHeight: '80px' }} />
          </div>
          
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button type="submit" className="export-btn" disabled={loading} style={{ flex: 2 }}>
                {loading ? 'PROCESSING...' : editingId ? 'UPDATE RECORD' : 'SAVE DAILY RECORD'}
            </button>
            {editingId && <button type="button" onClick={cancelEdit} className="logout-btn" style={{ flex: 1 }}>CANCEL</button>}
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '10px', fontStyle: 'italic' }}>*System automatically deducts 1hr lunch break if 12PM-1PM is overlapped.</p>
        </form>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '40px', marginBottom: '15px' }}>
          <h3 style={{ color: 'var(--text-main)', margin: 0 }}>Recent Activity Feed</h3>
          <button onClick={() => navigate('/logs')} className="text-link-btn">VIEW FULL HISTORY →</button>
        </div>

        {/* Master Table */}
        <div className="table-container">
          <table className="master-table">
            <thead>
              <tr>
                <th>DATE</th>
                <th>IN / OUT</th>
                <th>HRS</th>
                <th>STATUS</th>
                <th>TASKS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map((log) => (
                <tr key={log.id}>
                  <td><strong>{log.log_date}</strong></td>
                  <td style={{ fontSize: '12px' }}>{formatStandardTime(log.time_in)} - {formatStandardTime(log.time_out)}</td>
                  <td style={{ fontWeight: 'bold' }}>{log.hours_rendered}</td>
                  <td><span className={`status-badge ${log.status || 'pending'}`}>{log.status || 'pending'}</span></td>
                  <td style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '200px' }}>{log.task_description}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button onClick={() => startEdit(log)} className="mini-action-btn edit">EDIT</button>
                      <button onClick={() => handleDelete(log.id)} className="mini-action-btn del">DEL</button>
                    </div>
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
        .export-btn { background: var(--navbar-bg); color: var(--nav-text); border: 3px solid #3E2723; box-shadow: 4px 4px 0px rgba(0,0,0,0.1); padding: 12px; font-weight: bold; font-size: 13px; cursor: pointer; width: 100%; }
        
        .filter-card { background: var(--card-bg); padding: 20px; border: 3px solid #3E2723; box-shadow: 6px 6px 0px rgba(0,0,0,0.1); margin-bottom: 25px; }
        .stat-box { display: flex; flex-direction: column; align-items: flex-start; justify-content: center; }
        .stat-box label { font-size: 10px; font-weight: bold; color: var(--text-muted); margin-bottom: 5px; }
        .stat-box p { font-size: 22px; font-weight: bold; margin: 0; color: var(--text-main); }

        .input-unit { display: flex; flex-direction: column; gap: 5px; }
        .input-unit label { font-size: 11px; font-weight: bold; color: var(--text-muted); }
        .blocky-input { padding: 10px; border: 2px solid #3E2723; background: var(--card-bg); color: var(--text-main); font-size: 13px; outline: none; box-sizing: border-box; width: 100%; }

        .master-progress-container { height: 30px; background: rgba(0,0,0,0.05); border: 3px solid #3E2723; margin-bottom: 30px; position: relative; overflow: hidden; border-radius: 2px; }
        .master-progress-fill { height: 100%; background: var(--primary-color); display: flex; align-items: center; justify-content: flex-end; transition: width 0.5s ease-in-out; }
        .progress-label { color: white; font-weight: bold; font-size: 12px; padding-right: 10px; text-shadow: 1px 1px 0px rgba(0,0,0,0.5); }

        .table-container { background: var(--card-bg); border: 3px solid #3E2723; box-shadow: 8px 8px 0px rgba(0,0,0,0.1); overflow: hidden; margin-bottom: 50px; }
        .master-table { width: 100%; border-collapse: collapse; }
        .master-table th { text-align: left; padding: 15px; background: rgba(0,0,0,0.05); color: var(--text-muted); font-size: 11px; text-transform: uppercase; border-bottom: 3px solid #3E2723; }
        .master-table td { padding: 12px 15px; border-bottom: 1px solid rgba(0,0,0,0.05); color: var(--text-main); }
        
        .status-badge { font-size: 9px; font-weight: bold; text-transform: uppercase; padding: 4px 10px; border: 2px solid #3E2723; display: inline-block; }
        .status-badge.approved { color: var(--primary-color); }
        .status-badge.rejected { color: #e74c3c; background: #fff5f5; }
        
        .mini-action-btn { border: 2px solid #3E2723; padding: 4px 8px; font-size: 10px; font-weight: bold; cursor: pointer; color: white; transition: 0.1s; }
        .mini-action-btn.edit { background: var(--primary-color); }
        .mini-action-btn.del { background: #e74c3c; }
        .mini-action-btn:hover { transform: translate(-1px, -1px); box-shadow: 2px 2px 0px #3E2723; }

        .text-link-btn { background: none; border: none; color: var(--primary-color); font-weight: bold; font-size: 12px; cursor: pointer; }
      `}} />
    </div>
  )
}