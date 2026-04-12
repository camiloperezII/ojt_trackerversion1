import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { Link } from 'react-router-dom'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleResetRequest = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // This is where the user will be sent after clicking the email link
      redirectTo: 'http://localhost:5173/update-password', 
    })

    if (error) {
      setMessage("Error: " + error.message)
    } else {
      setMessage("Check your email for the reset link!")
    }
    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h2>Reset Password</h2>
        <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>
          Enter your email and we'll send you a link to get back into your account.
        </p>
        
        {message && <div className="error-msg" style={{ backgroundColor: '#eafaf1', color: '#27ae60' }}>{message}</div>}
        
        <form onSubmit={handleResetRequest}>
          <div className="input-group">
            <label>Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Sending...' : 'SEND RESET LINK'}
          </button>
        </form>
        <div className="login-footer">
          <Link to="/">Back to Login</Link>
        </div>
      </div>
    </div>
  )
}