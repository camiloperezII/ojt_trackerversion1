import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const [logs, setLogs] = useState([])
  const [totalHours, setTotalHours] = useState(0)
  const [role, setRole] = useState('user')
  const requiredHours = 600
  const navigate = useNavigate()

  // Form State
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0])
  const [timeIn, setTimeIn] = useState('')
  const [timeOut, setTimeOut] = useState('')
  const [task, setTask] = useState('')
  const [loading, setLoading] = useState(false)
  
  // NEW: State to track if we are editing an existing log
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('users').select('role').eq('auth_id', user.id).single()
        if (data) setRole(data.role)
      }
    }
    checkUser()
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    const { data } = await supabase.from('logs').select('*').order('log_date', { ascending: false })
    if (data) {
      setLogs(data)
      const total = data.reduce((sum, log) => sum + parseFloat(log.hours_rendered || 0), 0)
      setTotalHours(total)
    }
  }

  // NEW: Function to delete a log
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this log?")) {
      const { error } = await supabase.from('logs').delete().eq('id', id)
      if (!error) fetchLogs()
      else alert("Delete failed: " + error.message)
    }
  }

  // NEW: Function to setup the form for editing
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
    setLoading(true)

    const start = new Date(`1970-01-01T${timeIn}:00`)
    const end = new Date(`1970-01-01T${timeOut}:00`)
    const diffInMs = end - start
    const hours = diffInMs > 0 ? (diffInMs / (1000 * 60 * 60)).toFixed(2) : 0

    const logData = {
      log_date: logDate,
      time_in: timeIn,
      time_out: timeOut,
      hours_rendered: hours,
      task_description: task
    }

    let error;
    if (editingId) {
      // UPDATE existing log
      const { error: updateError } = await supabase.from('logs').update(logData).eq('id', editingId)
      error = updateError
    } else {
      // INSERT new log
      const { error: insertError } = await supabase.from('logs').insert([logData])
      error = insertError
    }

    if (!error) {
      cancelEdit()
      fetchLogs()
    } else {
      alert("Save failed: " + error.message)
    }
    setLoading(false)
  }

  const progressPercent = Math.min((totalHours / requiredHours) * 100, 100)

  const exportToCSV = () => {
  // 1. Define the headers
  const headers = ["Date", "Time In", "Time Out", "Hours Rendered", "Task Description"];
  
  // 2. Map the logs into rows
  const rows = logs.map(log => [
    log.log_date,
    log.time_in,
    log.time_out,
    log.hours_rendered,
    `"${log.task_description.replace(/"/g, '""')}"` // Wrap in quotes to handle commas in tasks
  ]);

  // 3. Combine headers and rows into a single string
  const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");

  // 4. Create a hidden link and trigger the download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `OJT_Logs_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

  return (
    <div>
      <nav className="navbar">
        <div className="nav-container">
          <div className="logo">OJT-TRACKER</div>
          <div className="nav-links">
            {role === 'admin' && (
              <a href="#" className="admin-link" onClick={(e) => { e.preventDefault(); navigate('/admin'); }} style={{ marginRight: '15px' }}>Admin Panel</a>
            )}
            <button className="logout-btn" onClick={() => navigate('/')}>Logout</button>
          </div>
        </div>
      </nav>

      <div className="container">
        <div className="stats">
          <div className="card"><h3>Total Rendered</h3><p>{totalHours.toFixed(2)} hrs</p></div>
          <div className="card" style={{ borderTopColor: '#f39c12' }}><h3>Remaining</h3><p>{Math.max(requiredHours - totalHours, 0).toFixed(2)} hrs</p></div>
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
            <button type="submit" className="login-btn" disabled={loading} style={{ flex: 2 }}>
              {loading ? 'SAVING...' : editingId ? 'UPDATE LOG' : 'SAVE DAILY LOG'}
            </button>
            {editingId && (
              <button type="button" onClick={cancelEdit} style={{ flex: 1, backgroundColor: '#7f8c8d' }}>
                CANCEL
              </button>
            )}
          </div>
        </form>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '40px' }}>
          <h3>My Daily Logs</h3>
          <button 
            onClick={exportToCSV} 
            style={{ backgroundColor: '#27ae60', padding: '10px 20px', fontSize: '12px' }}
            >
            EXPORT TO CSV (.csv)
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>In/Out</th>
              <th>Hrs</th>
              <th>Task Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{log.log_date}</td>
                <td style={{ fontSize: '12px' }}>{log.time_in} - {log.time_out}</td>
                <td><strong>{log.hours_rendered}</strong></td>
                <td>{log.task_description}</td>
                <td>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={() => startEdit(log)} style={{ padding: '5px', fontSize: '10px', background: '#27ae60' }}>EDIT</button>
                    <button onClick={() => handleDelete(log.id)} style={{ padding: '5px', fontSize: '10px', background: '#e74c3c' }}>DEL</button>
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