import { useState, type FormEvent } from 'react';
import { Building2, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';

type Mode = 'signin' | 'signup';

export function Login() {
  const { signIn, signUp, resetPassword } = useAuth();
  const t = useI18n();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onForgot = async () => {
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError(t.auth.resetNoEmail);
      return;
    }
    try {
      await resetPassword(email.trim());
      setInfo(t.auth.resetSent);
    } catch {
      setError(t.auth.errorGeneric);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signup') {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      if (mode === 'signup') {
        if (code === 'auth/email-already-in-use') setError(t.auth.errorEmailInUse);
        else if (code === 'auth/weak-password') setError(t.auth.errorWeakPassword);
        else if (code === 'auth/invalid-email') setError(t.auth.errorInvalidEmail);
        else setError(t.auth.errorGeneric);
      } else {
        const invalid =
          code === 'auth/invalid-credential' ||
          code === 'auth/user-not-found' ||
          code === 'auth/wrong-password' ||
          code === 'auth/invalid-email';
        setError(invalid ? t.auth.errorInvalid : t.auth.errorGeneric);
      }
    } finally {
      setBusy(false);
    }
  };

  const switchMode = () => {
    setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
    setError(null);
    setInfo(null);
  };

  const isSignup = mode === 'signup';

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <span className="brand-logo">
          <Building2 size={26} />
        </span>
        <h1>{isSignup ? t.auth.signUpTitle : t.app.name}</h1>
        <p className="auth-subtitle">
          {isSignup ? t.auth.signUpSubtitle : t.auth.subtitle}
        </p>

        <form className="auth-form" onSubmit={onSubmit}>
          {error && <div className="auth-error">{error}</div>}
          {info && <div className="auth-info">{info}</div>}

          <div className="field">
            <label htmlFor="email">{t.auth.email}</label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="password">{t.auth.password}</label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? (
              <>
                <Loader2 size={16} className="spin" />
                {isSignup ? t.auth.signingUp : t.auth.signingIn}
              </>
            ) : isSignup ? (
              t.auth.signUp
            ) : (
              t.auth.signIn
            )}
          </button>
        </form>

        {!isSignup ? (
          <div className="auth-forgot">
            <button type="button" onClick={onForgot}>
              {t.auth.forgot}
            </button>
          </div>
        ) : null}

        <div className="auth-switch">
          {isSignup ? t.auth.haveAccount : t.auth.noAccount}{' '}
          <button type="button" onClick={switchMode}>
            {isSignup ? t.auth.signIn : t.auth.signUp}
          </button>
        </div>
      </div>
    </div>
  );
}
