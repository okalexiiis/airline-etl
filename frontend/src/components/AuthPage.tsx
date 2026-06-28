import React, { useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { authClient } from '../services/auth.client';

interface AuthPageProps {
  onLoginSuccess: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await authClient.signIn.email({ email, password });
      if (response.error) {
        setError(response.error.message || 'Invalid email or password.');
      } else {
        onLoginSuccess();
      }
    } catch (err: any) {
      setError('A connection error occurred. Please verify backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-viewport">
      <div className="auth-card">
        <h1 className="auth-title">AeroSent</h1>

        <div className="auth-info" id="auth-info-desc">
          Sign-ups are disabled. Use seeded credentials.
        </div>

        {error && (
          <div className="auth-error" role="alert">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} aria-describedby="auth-info-desc">
          <div className="auth-field-group">
            <label htmlFor="auth-email">Email Address</label>
            <input
              id="auth-email"
              type="email"
              className="auth-field"
              placeholder="name@aerosent.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoFocus
              autoComplete="email"
            />
          </div>

          <div className="auth-field-group">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              className="auth-field"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={16} aria-hidden="true" />
                Signing In…
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
