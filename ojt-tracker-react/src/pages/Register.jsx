import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate, Link } from 'react-router-dom'

// 1. IMPORT YOUR PNG ICONS
import viewIcon from '../assets/view.png' // This should be a PNG icon for "show password"
import visibilityIcon from '../assets/visibility.png' // This should be a PNG icon for "hide password"

const normalizeSchoolName = (name) => {
  if (!name) return 'Unassigned';
  const clean = name.replace(/[\.\-\s]/g, '').toUpperCase();
  const mapping = {
    'LCUP': ['LCON', 'LACON', 'LACONSOLE', 'L.C.U.P', 'LACONSOLACION'],
    'BULSU': ['BSU', 'BULACANSTATE', 'BULACANSTATEUNIVERSITY'],
    'CEU': ['CENTROESCOLAR', 'C.E.U'],
    'UST': ['UNIVERSITYOFSANTOTOMAS', 'U.S.T']
  };
  for (const [officialName, aliases] of Object.entries(mapping)) {
    if (clean === officialName || aliases.includes(clean)) return officialName;
  }
  return name.trim().toUpperCase();
};

export default function Register() {
const [formData, setFormData] = useState({
  email: '',
  username: '',
  fullName: '',
  school: '',
  password: '',
  totalRequired: '600' // Set as string to match input behavior
})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
      })

      if (authError) throw authError

      if (authData.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert([{
            auth_id: authData.user.id,
            username: formData.username.trim().toLowerCase(),
            email: formData.email.trim().toLowerCase(),
            full_name: formData.fullName.trim(),
            school: normalizeSchoolName(formData.school),
            total_required: parseInt(formData.totalRequired) || 600,
            role: 'user'
          }])

        if (profileError) {
          console.error("Database Insert Error:", profileError);
          throw new Error(`Auth created, but profile failed: ${profileError.message}`);
        }

        alert("Registration successful! You can now log in.")
        navigate('/') 
      }
    } catch (err) {
      console.error("Registration Process Error:", err);
      setMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: '650px' }}>
        <div className="login-header">
          <img src="/Paombong.png" alt="Logo" style={{ height: '50px', width: 'auto', marginBottom: '10px' }} />
          <h2>INTERN REGISTRATION</h2>
          <p>Paombong Municipality OJT Portal</p>
        </div>

        {message && <div className="error-msg" style={{ background: '#ffebee', color: '#c62828', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: '0.9rem' }}>
          {message}
        </div>}

        <form onSubmit={handleRegister} className="registration-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          {/* Row 1 */}
          <div className="input-group">
            <label>Full Name</label>
            <input type="text" required placeholder="Juan Dela Cruz" onChange={(e) => setFormData({...formData, fullName: e.target.value})} />
          </div>
          <div className="input-group">
            <label>Email Address</label>
            <input type="email" required placeholder="you@email.com" onChange={(e) => setFormData({...formData, email: e.target.value})} />
          </div>

          {/* Row 2 */}
          <div className="input-group">
            <label>School</label>
            <input type="text" required placeholder="Enter Full School Name (Do not use abbreviations) " onChange={(e) => setFormData({...formData, school: e.target.value})} />
          </div>
          <div className="input-group">
            <label>Required Hrs</label>
            <input type="number" defaultValue="600" onChange={(e) => setFormData({...formData, totalRequired: e.target.value})} />
          </div>

          {/* Row 3 */}
          <div className="input-group">
            <label>Username (Internal ID)</label>
            <input type="text" required placeholder="juandc123" onChange={(e) => setFormData({...formData, username: e.target.value})} />
          </div>

          {/* PASSWORD FIELD WITH PNG TOGGLE */}
          <div className="input-group" style={{ position: 'relative' }}>
            <label>Password</label>
            <input 
              type={showPassword ? "text" : "password"} 
              required 
              placeholder="Choose a strong password" 
              onChange={(e) => setFormData({...formData, password: e.target.value})} 
              style={{ paddingRight: '45px' }}
            />
            {/* 2. REPLACED SPAN WITH IMG TAG */}
            <img 
              src={showPassword ? visibilityIcon : viewIcon} 
              alt="Toggle Visibility"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '40px', 
                width: '20px', 
                height: 'auto',
                cursor: 'pointer',
                userSelect: 'none',
                opacity: 1.5
              }}
            />
          </div>

          <button type="submit" className="login-btn" style={{ gridColumn: 'span 2', marginTop: '10px' }} disabled={loading}>
            {loading ? 'Processing...' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <div className="login-footer">
          <p>Already registered? <Link to="/">Login here</Link></p>
        </div>
      </div>
    </div>
  )
}