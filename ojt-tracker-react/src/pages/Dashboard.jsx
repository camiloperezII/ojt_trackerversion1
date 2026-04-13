import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

// --- 1. HELPER ALGORITHMS ---
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
  const requiredHours = 600
  const navigate = useNavigate()

  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0])
  const [timeIn, setTimeIn] = useState('')
  const [timeOut, setTimeOut] = useState('')
  const [task, setTask] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    fetchUserAndData()
  }, [])

  // --- DATA FETCHING (OPTIMIZED) ---
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
        // Parallel fetching for 100-user scalability
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
      .limit(5) // Only fetch what we need for the dashboard
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
    setTimeIn(''); 
    setTimeOut(''); 
    setTask(''); 
  }

  const handleSaveLog = async (e) => {
    e.preventDefault(); 
    if (!profile) return;
    setLoading(true);
    const hours = calculateHoursWithLunch(timeIn, timeOut);
    const logData = { 
        user_id: profile.id, 
        log_date: logDate, 
        time_in: timeIn, 
        time_out: timeOut, 
        hours_rendered: hours, 
        task_description: task, 
        status: 'pending' 
    }
    
    let error;
    if (editingId) { 
        error = (await supabase.from('logs').update(logData).eq('id', editingId)).error; 
    } else { 
        error = (await supabase.from('logs').insert([logData])).error; 
    }

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
    <div>
      <nav className="navbar">
        <div className="nav-container">
          <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/Paombong.png" alt="Logo" style={{ height: '40px', width: 'auto' }} />
            <span style={{ fontWeight: 'bold' }}> OJT-TRACKER</span>
          </div>
          <div className="nav-links">
            <button className="nav-btn" onClick={() => navigate('/logs')}>MY LOG HISTORY</button>
            {profile?.role === 'admin' && (
              <button className="nav-btn" onClick={() => navigate('/admin')}>ADMIN PANEL</button>
            )}
            <button className="logout-btn" onClick={() => navigate('/')}>Logout</button>
          </div>
        </div>
      </nav>

      <div className="container">
        <div style={{ marginBottom: '25px', marginTop: '10px' }}>
          <h2 style={{ color: '#2c3e50', fontSize: '26px', margin: 0 }}>
            {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'Intern'}!
          </h2>
          <p style={{ color: '#7f8c8d', fontSize: '14px', marginTop: '5px' }}>Ready to track your progress today?</p>
        </div>

        <div className="stats">
          <div className="card"><h3>Total Approved</h3><p>{totalHours.toFixed(2)} hrs</p></div>
          <div className="card" style={{ borderTopColor: '#f39c12' }}><h3>Remaining</h3><p>{remaining.toFixed(2)} hrs</p></div>
          <div className="card" style={{ borderTopColor: '#27ae60' }}><h3>Est. Finish Date</h3><p style={{ color: '#27ae60', fontWeight: 'bold' }}>{calculateEstimatedFinish(remaining)}</p></div>
        </div>

        <div className="progress-bar"><div className="fill" style={{ width: `${progressPercent}%` }}></div></div>

        <form onSubmit={handleSaveLog}>
          <h3>{editingId ? "Update Log Entry" : "Clock In / Out"}</h3>
          <div className="input-group" style={{ gridColumn: 'span 2' }}>
            <label>Log Date</label>
            <input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} required />
          </div>
          <div className="input-group">
            <label>Time In</label>
            <input type="time" value={timeIn} onChange={(e) => setTimeIn(e.target.value)} required />
          </div>
          <div className="input-group">
            <label>Time Out</label>
            <input type="time" value={timeOut} onChange={(e) => setTimeOut(e.target.value)} required />
          </div>
          <div className="input-group" style={{ gridColumn: 'span 2' }}>
            <label>Task Description</label>
            <textarea placeholder="Work details..." value={task} onChange={(e) => setTask(e.target.value)} required />
          </div>
          <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px' }}>
            <button type="submit" className="login-btn" disabled={loading} style={{ flex: 2 }}>{loading ? 'SAVING...' : editingId ? 'UPDATE LOG' : 'SAVE DAILY LOG'}</button>
            {editingId && <button type="button" onClick={cancelEdit} style={{ flex: 1, backgroundColor: '#7f8c8d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>CANCEL</button>}
          </div>
          <p style={{ color: '#7f8c8d', fontSize: '14px', marginTop: '10px' }}>*Automatically reduce 1hr if 12pm - 1pm is included*</p>
        </form>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '40px' }}>
          <h3>Recent Activity</h3>
          <button onClick={() => navigate('/logs')} style={{ background: 'none', color: '#27ae60', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
            VIEW FULL HISTORY →
          </button>
        </div>

        <table>
          <thead>
            <tr><th>Date</th><th>In/Out</th><th>Hrs</th><th>Status</th><th>Task</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {recentLogs.map((log) => (
              <tr key={log.id}>
                <td>{log.log_date}</td>
                <td style={{ fontSize: '12px' }}>{log.time_in} - {log.time_out}</td>
                <td><strong>{log.hours_rendered}</strong></td>
                <td>
                  <span style={{ 
                    fontSize: '10px', padding: '3px 8px', borderRadius: '10px', fontWeight: 'bold', textTransform: 'uppercase', 
                    backgroundColor: log.status === 'approved' ? '#eafaf1' : log.status === 'rejected' ? '#fdedec' : '#fef9e7', 
                    color: log.status === 'approved' ? '#27ae60' : log.status === 'rejected' ? '#e74c3c' : '#f39c12' 
                  }}>
                    {log.status || 'pending'}
                  </span>
                </td>
                <td style={{ fontSize: '12px', color: '#666' }}>{log.task_description}</td>
                <td>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={() => startEdit(log)} style={{ padding: '5px 10px', fontSize: '10px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>EDIT</button>
                    <button onClick={() => handleDelete(log.id)} style={{ padding: '5px 10px', fontSize: '10px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>DEL</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .nav-btn { background-color: #27ae60; color: white; border: none; padding: 8px 15px; border-radius: 4px; font-weight: bold; font-size: 11px; cursor: pointer; transition: background 0.3s ease; margin-right: 10px; }
        .nav-btn:hover { background-color: #219150; }
        .logout-btn { background-color: #e74c3c; color: white; border: none; padding: 8px 15px; border-radius: 4px; font-weight: bold; font-size: 11px; cursor: pointer; transition: background 0.3s ease; }
        .logout-btn:hover { background-color: #c0392b; }
      `}} />
    </div>
  )
}