'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { es } from '@/i18n/es'

function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const redirectTo = searchParams.get('redirect') || '/'

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

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

                    {error && (
                        <div className="form-error" style={{ marginBottom: 'var(--space-4)' }}>
                            {error}
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
