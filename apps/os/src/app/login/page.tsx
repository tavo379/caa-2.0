'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { es } from '@/i18n/es'

function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const redirectTo = searchParams.get('redirect') || '/'
    const linkError = searchParams.get('error') === 'reset'

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [resetLoading, setResetLoading] = useState(false)
    const [resetMessage, setResetMessage] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const supabase = createClient()

        const { error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (authError) {
            setError(authError.message)
            setLoading(false)
            return
        }

        router.push(redirectTo)
        router.refresh()
    }

    const handleForgotPassword = async () => {
        setError('')
        setResetMessage('')

        if (!email) {
            setError(es.auth.resetEmailPrompt)
            return
        }

        setResetLoading(true)

        const supabase = createClient()
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset`,
        })

        setResetLoading(false)

        if (resetError) {
            setError(resetError.message)
            return
        }

        setResetMessage(es.auth.resetEmailSent)
    }

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-logo">
                    <img src="/logo.svg" alt="Cacao & Avocado" />
                </div>

                <h1 className="login-title">{es.auth.loginTitle}</h1>
                <p className="login-subtitle">{es.auth.loginSubtitle}</p>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="email" className="form-label">
                            {es.auth.email}
                        </label>
                        <input
                            id="email"
                            type="email"
                            className="form-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="tu@email.com"
                            required
                            autoComplete="email"
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password" className="form-label">
                            {es.auth.password}
                        </label>
                        <input
                            id="password"
                            type="password"
                            className="form-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            autoComplete="current-password"
                        />
                    </div>

                    {(error || (linkError && !resetMessage)) && (
                        <div className="form-error" style={{ marginBottom: 'var(--space-4)' }}>
                            {error || es.auth.resetLinkInvalid}
                        </div>
                    )}

                    {resetMessage && (
                        <div className="form-success" style={{ marginBottom: 'var(--space-4)' }}>
                            {resetMessage}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg"
                        style={{ width: '100%' }}
                        disabled={loading}
                    >
                        {loading ? es.auth.loggingIn : es.auth.loginButton}
                    </button>

                    <button
                        type="button"
                        onClick={handleForgotPassword}
                        disabled={resetLoading}
                        className="login-forgot-link"
                        style={{
                            display: 'block',
                            width: '100%',
                            marginTop: 'var(--space-4)',
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-text-muted, #888)',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            textAlign: 'center',
                        }}
                    >
                        {resetLoading ? es.auth.sendingResetLink : es.auth.forgotPassword}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="login-container"><div className="loading"><div className="spinner"></div></div></div>}>
            <LoginForm />
        </Suspense>
    )
}
