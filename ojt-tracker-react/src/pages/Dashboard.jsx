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
  if (start <= lunchStart && end >= lunchEnd) {
    diff -= 1;
  }
  return Math.max(0, diff).toFixed(2);
};

// NEW: Greeting logic based on system time
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "☀️ Good Morning";
  if (hour < 18) return "🌤️ Good Afternoon";
  return "🌙 Good Evening";
};

export default function Dashboard() {
  const [logs, setLogs] = useState([])
  const [totalHours, setTotalHours] = useState(0)
  const [profile, setProfile] = useState(null)
  const requiredHours = 600
  const navigate = useNavigate()

  // Form State
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0])
  const [timeIn, setTimeIn] = useState('')
  const [timeOut, setTimeOut] = useState('')
  const [task, setTask] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    fetchUserAndLogs()
  }, [])

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
        fetchLogs(profileData.id)
      }
    } else {
      navigate('/')
    }
    setLoading(false)
  }

  const fetchLogs = async (userId) => {
    const { data } = await supabase
      .from('logs')
      .select('*')
      .eq('user_id', userId)
      .order('log_date', { ascending: false })

    if (data) {
      setLogs(data)
      const total = data
        .filter(log => log.status === 'approved')
        .reduce((sum, log) => sum + parseFloat(log.hours_rendered || 0), 0)
      setTotalHours(total)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this log?")) {
      const { error } = await supabase.from('logs').delete().eq('id', id)
      if (!error) fetchLogs(profile.id)
      else alert("Delete failed: " + error.message)
    }
  }

  const startEdit = (log) => {
    setEditingId(log.id)
    setLogDate(log.log_date)
    setTimeIn(log.time_in)
    setTimeOut(log.time_out)
    setTask(log.task_description)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setLogDate(new Date().toISOString().split('T')[0])
    setTimeIn('')
    setTimeOut('')
    setTask('')
  }

  const handleSaveLog = async (e) => {
    e.preventDefault()
    if (!profile) return alert("Profile not loaded yet.")
    setLoading(true)

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
      const { error: updateError } = await supabase.from('logs').update(logData).eq('id', editingId)
      error = updateError
    } else {
      const { error: insertError } = await supabase.from('logs').insert([logData])
      error = insertError
    }

    if (!error) {
      cancelEdit()
      fetchLogs(profile.id)
    } else {
      alert("Save failed: " + error.message)
    }
    setLoading(false)
  }

  const progressPercent = Math.min((totalHours / requiredHours) * 100, 100)

  const exportToCSV = () => {
    const headers = ["Date", "Time In", "Time Out", "Hours Rendered", "Status", "Task Description"];
    const rows = logs.map(log => [
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
    link.setAttribute("href", url);
    link.setAttribute("download", `OJT_Logs_${profile?.full_name}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <nav className="navbar">
        <div className="nav-container">
          <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/Paombong.png" alt="Logo" style={{ height: '40px', width: 'auto' }} />
            <span style={{ fontWeight: 'bold' }}> OJT-TRACKER</span>
          </div>
          <div className="nav-links">
            {profile?.role === 'admin' && (
              <button onClick={() => navigate('/admin')} style={{ marginRight: '15px', background: 'none', color: '#27ae60', cursor: 'pointer', border: 'none', fontWeight: 'bold' }}>Admin Panel</button>
            )}
            <button className="logout-btn" onClick={() => navigate('/')}>Logout</button>
          </div>
        </div>
      </nav>

      <div className="container">
        
        {/* NEW GREETING SECTION */}
        <div style={{ marginBottom: '25px', marginTop: '10px' }}>
          <h2 style={{ color: '#2c3e50', fontSize: '26px', margin: 0 }}>
            {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'Intern'}!
          </h2>
          <p style={{ color: '#7f8c8d', fontSize: '14px', marginTop: '5px' }}>
            Let's track your progress for today?
          </p>
        </div>

        <div className="stats">
          <div className="card">
            <h3>Total Approved</h3>
            <p>{totalHours.toFixed(2)} hrs</p>
          </div>
          <div className="card" style={{ borderTopColor: '#f39c12' }}>
            <h3>Remaining</h3>
            <p>{Math.max(requiredHours - totalHours, 0).toFixed(2)} hrs</p>
          </div>
        </div>

        <div className="progress-bar">
          <div className="fill" style={{ width: `${progressPercent}%` }}></div>
        </div>

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
            <button type="submit" className="login-btn" disabled={loading} style={{ flex: 2 }}>
              {loading ? 'SAVING...' : editingId ? 'UPDATE LOG' : 'SAVE DAILY LOG'}
            </button>
            {editingId && (
              <button type="button" onClick={cancelEdit} style={{ flex: 1, backgroundColor: '#7f8c8d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                CANCEL
              </button>
            )}
          </div>
          <p style={{ gridColumn: 'span 2', fontSize: '11px', color: '#666', marginTop: '10px' }}>
            * Note: Shifts covering 12:00 to 13:00 automatically deduct 1 hour for lunch.
          </p>
        </form>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '40px' }}>
          <h3>My Daily Logs</h3>
          <button onClick={exportToCSV} style={{ backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', padding: '10px 20px', fontSize: '12px', cursor: 'pointer' }}>
            EXPORT TO CSV (.csv)
          </button>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>In/Out</th>
              <th>Hrs</th>
              <th>Status</th>
              <th>Task</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
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
    </div>
  )
}