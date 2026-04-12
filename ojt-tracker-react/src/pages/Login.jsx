import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate, Link } from 'react-router-dom'

// 1. IMPORT YOUR NEW PNG ICONS
import viewIcon from '../assets/view.png' // This should be a PNG icon for "show password"
import visibilityIcon from '../assets/visibility.png' // This should be a PNG icon for "hide password"

export default function Login() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      let loginEmail = identifier

      if (!identifier.includes('@')) {
        const { data: userProfile, error: userError } = await supabase
          .from('users')
          .select('email')
          .ilike('username', identifier) 
          .single()

        if (userError || !userProfile) {
          throw new Error("Username not found in OJT records.")
        }
        loginEmail = userProfile.email 
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
        email: loginEmail, 
        password 
      })

      if (authError) throw authError

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('id, role, auth_id')
        .eq('email', loginEmail)
        .single()

      if (profileError) throw profileError

      if (!profile.auth_id) {
        await supabase
          .from('users')
          .update({ auth_id: authData.user.id })
          .eq('id', profile.id)
      }

      if (profile?.role === 'admin') navigate('/admin')
      else navigate('/dashboard')

    } catch (error) {
      const errorText = error.message === "Invalid login credentials" 
        ? "Incorrect password. Please try again." 
        : error.message
      setMessage(errorText)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <img src="/Paombong.png" alt="Logo" style={{ height: '50px', width: 'auto', marginBottom: '10px' }} />
          <h2>OJT TRACKER</h2>
          <p>Municipality of Paombong</p>
        </div>

        {message && <div className="error-msg">{message}</div>}

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>Username or Email</label>
            <input 
              type="text" 
              required 
              value={identifier} 
              onChange={(e) => setIdentifier(e.target.value)} 
              placeholder="e.g. juandc123"
            />
          </div>

          <div className="input-group" style={{ position: 'relative' }}>
            <label>Password</label>
            <input 
              type={showPassword ? "text" : "password"} 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••"
              style={{ paddingRight: '45px' }} 
            />
            
            {/* 2. REPLACED SPAN WITH IMG TAG */}
            <img 
              src={showPassword ? visibilityIcon : viewIcon} 
              alt="Toggle Password Visibility"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '40px', // Adjusted for PNG centering
                width: '20px', // Set fixed width for the PNG
                height: 'auto',
                cursor: 'pointer',
                userSelect: 'none',
                opacity: 1.5 // Slight transparency looks cleaner with UI
              }}
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Verifying...' : 'LOGIN'}
          </button>
        </form>

          <div style={{ textAlign: 'center', marginBottom: '20px', marginTop: '-10px' }}>
            <Link to="/forgot-password" style={{ fontSize: '12px', color: '#27ae60', textDecoration: 'none', fontWeight: 'bold' }}>
              Forgot Password?
            </Link>
          </div>

        <div className="login-footer">
          <p>Don't have an account? <Link to="/register">Register here</Link></p>
        </div>
      </div>
    </div>
  )
}