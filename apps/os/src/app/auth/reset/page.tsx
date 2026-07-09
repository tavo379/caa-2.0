'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { es } from '@/i18n/es'

export default function ResetPasswordPage() {
    const router = useRouter()

    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [done, setDone] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (password.length < 8) {
            setError(es.auth.passwordTooShort)
            return
        }
        if (password !== confirm) {
            setError(es.auth.passwordMismatch)
            return
        }

        setLoading(true)

        const supabase = createClient()
        const { error: updateError } = await supabase.auth.updateUser({ password })

        if (updateError) {
            setError(updateError.message)
            setLoading(false)
            return
        }

        setDone(true)
        setTimeout(() => {
            router.push('/')
            router.refresh()
        }, 1200)
    }

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-logo">
                    <img src="/logo.svg" alt="Cacao & Avocado" />
                </div>

                <h1 className="login-title">{es.auth.resetTitle}</h1>
                <p className="login-subtitle">{es.auth.resetSubtitle}</p>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="password" className="form-label">
                            {es.auth.newPassword}
                        </label>
                        <input
                            id="password"
                            type="password"
                            className="form-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            autoComplete="new-password"
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirm" className="form-label">
                            {es.auth.confirmPassword}
                        </label>
                        <input
                            id="confirm"
                            type="password"
                            className="form-input"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            placeholder="••••••••"
                            required
                            autoComplete="new-password"
                        />
                    </div>

                    {error && (
                        <div className="form-error" style={{ marginBottom: 'var(--space-4)' }}>
                            {error}
                        </div>
                    )}

                    {done && (
                        <div className="form-success" style={{ marginBottom: 'var(--space-4)' }}>
                            {es.auth.passwordUpdated}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg"
                        style={{ width: '100%' }}
                        disabled={loading || done}
                    >
                        {loading ? es.auth.updatingPassword : es.auth.updatePassword}
                    </button>
                </form>
            </div>
        </div>
    )
}
