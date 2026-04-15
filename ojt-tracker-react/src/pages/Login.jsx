import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate, Link } from 'react-router-dom'

// 1. IMPORT YOUR PNG ICONS
import viewIcon from '../assets/view.png' 
import visibilityIcon from '../assets/visibility.png' 

export default function Login() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showMobileWarning, setShowMobileWarning] = useState(false) // State for mobile check
  const navigate = useNavigate()

  // Check for mobile device on mount
  useEffect(() => {
    if (window.innerWidth < 768) {
      setShowMobileWarning(true)
    }
  }, [])

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
      {/* MOBILE WARNING POPUP */}
      {showMobileWarning && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0,
          width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            border: '4px solid #3E2723', 
            padding: '30px',
            textAlign: 'center',
            boxShadow: '10px 10px 0px #000',
            maxWidth: '400px',
            width: '100%'
          }}>
            <h2 style={{ color: '#e74c3c', marginTop: 0, fontSize: '22px' }}>📱 MOBILE DETECTED</h2>
            <p style={{ fontWeight: 'bold', color: '#2c3e50', marginBottom: '10px' }}>
              For the best experience, please use a **Desktop site**.
            </p>
            <p style={{ fontSize: '12px', color: '#7f8c8d', lineHeight: '1.4' }}>
              The OJT Tracker Command Center and Data Tables are optimized for larger screens. 
              Some features may look distorted on mobile.
            </p>
            <button 
              onClick={() => setShowMobileWarning(false)}
              style={{
                marginTop: '25px',
                background: '#3E2723',
                color: 'white',
                border: 'none',
                padding: '12px 25px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                boxShadow: '4px 4px 0px #000'
              }}
            >
              PROCEED ANYWAY
            </button>
          </div>
        </div>
      )}

      <div className="login-card" style={{ background: '#ffffff' }}>
        <div className="login-header">
          <img src="/Paombong.png" alt="Logo" style={{ height: '50px', width: 'auto', marginBottom: '10px' }} />
          <h2 style={{ color: 'var(--primary-color)', letterSpacing: '1px' }}>OJT TRACKER</h2>
          <p style={{ color: '#7f8c8d' }}>Municipality of Paombong</p>
        </div>

        {message && <div className="error-msg">{message}</div>}

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label style={{ color: '#2c3e50' }}>Username or Email</label>
            <input 
              type="text" 
              required 
              value={identifier} 
              onChange={(e) => setIdentifier(e.target.value)} 
              placeholder="e.g. juandc123"
              style={{ border: '2px solid #eee' }}
            />
          </div>

          <div className="input-group" style={{ position: 'relative' }}>
            <label style={{ color: '#2c3e50' }}>Password</label>
            <input 
              type={showPassword ? "text" : "password"} 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••"
              style={{ paddingRight: '45px', border: '2px solid #eee' }} 
            />
            
            <img 
              src={showPassword ? visibilityIcon : viewIcon} 
              alt="Toggle Password Visibility"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '40px', 
                width: '20px', 
                height: 'auto',
                cursor: 'pointer',
                userSelect: 'none',
                opacity: 0.6 
              }}
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading} style={{ background: 'var(--navbar-bg)' }}>
            {loading ? 'Verifying...' : 'LOGIN'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginBottom: '20px', marginTop: '-10px' }}>
          <Link to="/forgot-password" style={{ fontSize: '12px', color: 'var(--primary-color)', textDecoration: 'none', fontWeight: 'bold' }}>
            Forgot Password?
          </Link>
        </div>

        <div className="login-footer">
          <p style={{ color: '#7f8c8d' }}>
            Don't have an account? 
            <Link to="/register" style={{ color: 'var(--primary-color)', fontWeight: 'bold', marginLeft: '5px' }}>
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}