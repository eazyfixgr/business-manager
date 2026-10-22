import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';
import { useToast } from './ui/Toast';

export function EmailVerificationBanner() {
  const { user, resendVerification, refreshUser } = useAuth();
  const t = useI18n();
  const { notify } = useToast();

  if (!user || user.emailVerified) return null;

  return (
    <div className="verify-banner">
      <span>{t.auth.verifyBanner}</span>
      <button
        type="button"
        className="btn btn-outline btn-sm"
        onClick={async () => {
          try {
            await resendVerification();
            notify(t.auth.verifySent);
          } catch (err) {
            notify(err instanceof Error ? err.message : String(err), 'error');
          }
        }}
      >
        {t.auth.verifyResend}
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => refreshUser()}
      >
        {t.auth.verifyRefresh}
      </button>
    </div>
  );
}
