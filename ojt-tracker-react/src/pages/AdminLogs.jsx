import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

/** * 1. HELPER ALGORITHMS (Normalization & Formatting) */
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

export default function AdminLogs() {
  // --- 2. STATE MANAGEMENT ---
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [schoolFilter, setSchoolFilter] = useState('All')
  const navigate = useNavigate()

  useEffect(() => {
    fetchAllData()
  }, [])

  // --- 3. DATA FETCHING ---
  const fetchAllData = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('logs')
      .select(`*, users!inner (full_name, school)`)
      .order('log_date', { ascending: false });
    if (data) setLogs(data);
    setLoading(false);
  }

  // --- 4. EVENT HANDLERS (Verification & Export) ---
  const handleStatusUpdate = async (logId, newStatus) => {
    const { error } = await supabase
      .from('logs')
      .update({ status: newStatus })
      .eq('id', logId);

    if (!error) {
      setLogs(prev => prev.map(log => 
        log.id === logId ? { ...log, status: newStatus } : log
      ));
    }
  }

  const exportToCSV = () => {
    if (filteredLogs.length === 0) return alert("No logs to export.");
    const headers = ["Intern Name", "School", "Date", "In", "Out", "Task Description", "Hours", "Status"];
    const rows = filteredLogs.map(log => [
      log.users?.full_name || 'N/A',
      normalizeSchoolName(log.users?.school),
      log.log_date,
      formatStandardTime(log.time_in),
      formatStandardTime(log.time_out),
      `"${(log.task_description || "").replace(/"/g, '""')}"`,
      log.hours_rendered,
      log.status || 'pending'
    ]);
    const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `municipality_audit_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  // --- 5. FILTERING LOGIC ---
  const filteredLogs = logs.filter(log => {
    const nameMatch = log.users?.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    const taskMatch = log.task_description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || log.status === statusFilter;
    const matchesSchool = schoolFilter === 'All' || normalizeSchoolName(log.users?.school) === schoolFilter;
    return (nameMatch || taskMatch) && matchesStatus && matchesSchool;
  });

  const uniqueSchools = Array.from(new Set(logs.map(l => normalizeSchoolName(l.users?.school)))).filter(Boolean).sort();

  return (
    <div className="admin-page">
      <nav className="navbar">
        <div className="nav-container">
          <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/Paombong.png" alt="Logo" style={{ height: '40px' }} />
            <span style={{ fontWeight: 'bold', color: 'var(--nav-text)', fontSize: '18px' }}> MUNICIPALITY LOG AUDIT </span>
          </div>
          <div className="nav-links">
            <button className="back-btn" onClick={() => navigate('/admin')}>BACK TO DASHBOARD</button>
            <button className="logout-btn" onClick={() => navigate('/')}>Logout</button>
          </div>
        </div>
      </nav>

      <div className="container">
        <div style={{ marginBottom: '20px', marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h2 style={{ color: 'var(--text-main)', margin: 0 }}>Full Municipality Archive</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Auditing {filteredLogs.length} entries.</p>
          </div>
          <button onClick={exportToCSV} className="export-btn">📥 EXPORT CSV</button>
        </div>

        {/* Filter Bar */}
        <div className="filter-card">
          <input 
            type="text" 
            placeholder="Search name or task..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="blocky-input"
            style={{ flex: 2 }}
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="blocky-input" style={{ flex: 1 }}>
            <option value="All">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
          <select value={schoolFilter} onChange={(e) => setSchoolFilter(e.target.value)} className="blocky-input" style={{ flex: 1 }}>
            <option value="All">All Schools</option>
            {uniqueSchools.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Audit Table */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>INTERN</th>
                <th>DATE / TIME</th>
                <th>TASK DESCRIPTION</th>
                <th>HRS</th>
                <th>VERIFICATION</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => (
                <tr key={log.id}>
                  <td>
                    <strong style={{ color: 'var(--text-main)' }}>{log.users?.full_name}</strong><br/>
                    <small style={{ color: 'var(--text-muted)' }}>{normalizeSchoolName(log.users?.school)}</small>
                  </td>
                  <td>
                    <div style={{ color: 'var(--text-main)', fontSize: '13px' }}>{log.log_date}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {formatStandardTime(log.time_in)} - {formatStandardTime(log.time_out)}
                    </div>
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '280px' }}>{log.task_description}</td>
                  <td style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{log.hours_rendered}</td>
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
        .export-btn { background: var(--navbar-bg); color: var(--nav-text); border: 3px solid #3E2723; box-shadow: 4px 4px 0px rgba(0,0,0,0.1); padding: 10px 18px; font-weight: bold; font-size: 12px; cursor: pointer; }
        
        .filter-card { display: flex; gap: 10px; margin-bottom: 25px; background: var(--card-bg); padding: 15px; border: 3px solid #3E2723; box-shadow: 6px 6px 0px rgba(0,0,0,0.1); }
        .blocky-input { padding: 10px; border: 2px solid #3E2723; background: var(--card-bg); color: var(--text-main); font-size: 13px; outline: none; }

        .table-container { background: var(--card-bg); border: 3px solid #3E2723; box-shadow: 8px 8px 0px rgba(0,0,0,0.1); overflow: hidden; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; padding: 15px; background: rgba(0,0,0,0.05); color: var(--text-muted); font-size: 11px; text-transform: uppercase; border-bottom: 3px solid #3E2723; }
        td { padding: 15px; border-bottom: 1px solid rgba(0,0,0,0.05); }

        /* FIXED ALIGNMENT CSS */
        .action-btn { 
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid #3E2723; 
            width: 32px; 
            height: 32px; 
            cursor: pointer; 
            color: white; 
            font-weight: bold; 
            font-size: 16px; 
            transition: 0.2s;
            padding: 0;
            line-height: 0;
        }
        .action-btn.approve { background: var(--primary-color); }
        .action-btn.reject { background: #e74c3c; }
        .action-btn:hover { transform: translate(-2px, -2px); box-shadow: 2px 2px 0px #3E2723; }

        .status-badge { font-size: 10px; font-weight: bold; text-transform: uppercase; padding: 4px 12px; border: 2px solid #3E2723; display: inline-block; }
        .status-badge.approved { color: var(--primary-color); }
        .status-badge.rejected { color: #e74c3c; background: #fff5f5; }
        
        .logout-btn { background: #e74c3c; color: white; border: none; padding: 8px 15px; border-radius: 4px; font-weight: bold; font-size: 11px; cursor: pointer; }
      `}} />
    </div>
  )
}