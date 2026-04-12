import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMessage(error.message)
    else navigate('/dashboard')
    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h2>OJT TRACKER</h2>
          <p>Municipality of Paombong</p>
        </div>

        {message && <div className="error-msg">{message}</div>}

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>Email Address</label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="Enter your email"
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Enter your password"
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Authenticating...' : 'LOGIN'}
          </button>
        </form>

        <div className="login-footer">
          <p>Don't have an account? <a href="#" onClick={() => alert('Sign up logic can go here!')}>Register here</a></p>
        </div>
      </div>
    </div>
  )
}