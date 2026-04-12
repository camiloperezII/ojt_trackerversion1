import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function UpdatePassword() {
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      alert("Update failed: " + error.message)
    } else {
      alert("Password updated successfully!")
      navigate('/')
    }
    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h2>Create New Password</h2>
        <form onSubmit={handleUpdate}>
          <div className="input-group">
            <label>New Password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          </div>
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Updating...' : 'SAVE NEW PASSWORD'}
          </button>
        </form>
      </div>
    </div>
  )
}