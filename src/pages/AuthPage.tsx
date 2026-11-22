import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useAppStore } from '../context/AppStoreContext';
import { validateSignupForm } from '../utils/realEstateLogic';
import { BUSINESS_CONTACT_EMAIL, isValidEmail } from '../utils/bookingAndOtpLogic';

export function AuthPage() {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'login' ? 'login' : 'signup';
  const [mode, setMode] = useState<'signup' | 'login'>(initialMode);
  const [authMethod, setAuthMethod] = useState<'otp' | 'password'>('otp');

  const {
    signUpLocal,
    loginLocal,
    loginWithVerifiedEmailOtp,
    loginDemoBroker,
    connectGoogleAccount,
    connectGitHubAccount,
  } = useAppStore();
  const navigate = useNavigate();

  const [companyName, setCompanyName] = useState('');
  const [whatsapp, setWhatsapp] = useState('+91 ');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Social providers state
  const [googleBusy, setGoogleBusy] = useState(false);
  const [githubBusy, setGithubBusy] = useState(false);

  // Email OTP state
  const [otpStep, setOtpStep] = useState<'email' | 'code'>('email');
  const [otpCode, setOtpCode] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpStatusMsg, setOtpStatusMsg] = useState<string | null>(null);
  const [previewOtpHint, setPreviewOtpHint] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const resetMessages = () => {
    setFormError(null);
    setFieldErrors({});
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (mode === 'signup') {
      const check = validateSignupForm({ companyName, whatsapp, email, password });
      if (!check.valid) {
        setFieldErrors(check.errors);
        return;
      }
      const res = signUpLocal({ companyName, whatsapp, email, password });
      if (!res.ok) {
        setFormError(res.error || 'Could not create account.');
        return;
      }
      navigate('/dashboard', { replace: true });
      return;
    }

    if (!email.trim() || !password) {
      setFormError('Enter your email address and password.');
      return;
    }
    const res = loginLocal(email, password);
    if (!res.ok) {
      setFormError(res.error || 'Invalid credentials.');
      return;
    }
    navigate('/dashboard', { replace: true });
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    resetMessages();
    setOtpStatusMsg(null);
    setPreviewOtpHint(null);

    if (mode === 'signup' && companyName.trim().length < 2) {
      setFieldErrors({ companyName: 'Enter your company, brokerage, or builder name.' });
      return;
    }
    if (!isValidEmail(email)) {
      setFieldErrors({ email: 'Enter a valid email address to receive your 6-digit OTP.' });
      return;
    }

    setOtpBusy(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data?.error || 'Could not send verification code.');
        if (typeof data?.waitSeconds === 'number') {
          setResendCooldown(data.waitSeconds);
        }
        return;
      }

      setOtpStep('code');
      setResendCooldown(30);
      setOtpStatusMsg(data.message || `6-digit verification code sent to ${email.trim()}.`);
      if (data.delivery === 'preview' && data.previewOtp) {
        setPreviewOtpHint(String(data.previewOtp));
      }
    } catch {
      setFormError('Network error while sending OTP. Please try again.');
    } finally {
      setOtpBusy(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    const cleanCode = otpCode.replace(/\s+/g, '');
    if (!/^\d{6}$/.test(cleanCode)) {
      setFieldErrors({ otp: 'Enter the 6-digit numeric code.' });
      return;
    }

    setOtpBusy(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: cleanCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data?.error || 'Invalid verification code.');
        return;
      }

      loginWithVerifiedEmailOtp({
        email: data.verifiedEmail || email.trim(),
        companyName: mode === 'signup' ? companyName : undefined,
        whatsapp: mode === 'signup' ? whatsapp : undefined,
      });
      navigate('/dashboard', { replace: true });
    } catch {
      setFormError('Network error while verifying OTP.');
    } finally {
      setOtpBusy(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleBusy(true);
    resetMessages();
    const res = await connectGoogleAccount();
    setGoogleBusy(false);
    if (!res.ok) {
      setFormError(res.error || 'Google sign-in failed.');
      return;
    }
    navigate('/dashboard', { replace: true });
  };

  const handleGitHubLogin = async () => {
    setGithubBusy(true);
    resetMessages();
    const res = await connectGitHubAccount();
    setGithubBusy(false);
    if (!res.ok) {
      setFormError(res.error || 'GitHub sign-in failed.');
      return;
    }
    navigate('/dashboard', { replace: true });
  };

  const handleDemoBroker = () => {
    loginDemoBroker();
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-[calc(100vh-68px)] bg-[#FAF7F2] flex items-center justify-center px-5 py-10 sm:py-14">
      <div className="w-full max-w-[500px] rounded-[32px] bg-white border border-[#17120F]/[0.08] p-7 sm:p-10 shadow-editorial">
        {/* Top Mode Toggle & Demo Workspace */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="inline-flex p-1 rounded-full bg-[#EFE6D6]/75">
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setOtpStep('email');
                resetMessages();
              }}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                mode === 'signup'
                  ? 'bg-[#17120F] text-[#FAF7F2]'
                  : 'text-[#17120F]/75 hover:text-[#17120F]'
              }`}
            >
              Start free
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setOtpStep('email');
                resetMessages();
              }}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                mode === 'login'
                  ? 'bg-[#17120F] text-[#FAF7F2]'
                  : 'text-[#17120F]/75 hover:text-[#17120F]'
              }`}
            >
              Log in
            </button>
          </div>

          <button
            type="button"
            onClick={handleDemoBroker}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9D7D44] hover:text-[#17120F] transition-colors cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5" />
            Demo Workspace
          </button>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#17120F]">
          {mode === 'signup' ? 'Launch your agency catalog' : 'Welcome back to EstateDirect'}
        </h1>
        <p className="text-sm text-[#17120F]/65 mt-1.5">
          {mode === 'signup'
            ? 'Free forever for brokers, agents, owners, and builders.'
            : 'Sign in with Google, Email OTP, GitHub, or password.'}
        </p>

        {/* PROMINENT TOP FREE AUTH PROVIDERS (Google + GitHub) */}
        <div className="mt-6 space-y-2.5">
          <button
            type="button"
            data-testid="google-signin-btn"
            onClick={() => void handleGoogleLogin()}
            disabled={googleBusy}
            className="gsi-material-button w-full"
          >
            <span className="w-5 h-5 shrink-0">
              <svg
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 48 48"
                className="block w-full h-full"
              >
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
            </span>
            <span>
              {googleBusy
                ? 'Connecting Google...'
                : mode === 'signup'
                  ? 'Continue with Google'
                  : 'Sign in with Google'}
            </span>
          </button>

          <button
            type="button"
            data-testid="github-signin-btn"
            onClick={() => void handleGitHubLogin()}
            disabled={githubBusy}
            className="w-full h-11 rounded-full border border-[#17120F]/15 bg-[#FAF7F2] hover:bg-[#EFE6D6]/70 text-[#17120F] text-sm font-semibold inline-flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="w-4 h-4 fill-current shrink-0">
              <path d="M12 0.3C5.37 0.3 0 5.67 0 12.3c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.05-.02-2.06-3.34.73-4.04-1.61-4.04-1.61-.55-1.38-1.33-1.75-1.33-1.75-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49 1 .11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.48 5.92.43.37.81 1.1.81 2.22 0 1.6-.01 2.9-.01 3.29 0 .32.22.7.82.58C20.57 22.1 24 17.6 24 12.3 24 5.67 18.63 0.3 12 0.3z" />
            </svg>
            <span>{githubBusy ? 'Connecting GitHub...' : 'Continue with GitHub (Free)'}</span>
          </button>

          <p className="text-[11px] text-[#17120F]/55 text-center">
            Google sign-in also enables Google Calendar, Gmail confirmations &amp; Meet virtual tours.
          </p>
        </div>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#17120F]/10" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#17120F]/45">
            or use email
          </span>
          <div className="h-px flex-1 bg-[#17120F]/10" />
        </div>

        {/* Auth Method Switcher: Email OTP vs Password */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[#FAF7F2] border border-[#17120F]/[0.08] mb-5">
          <button
            type="button"
            data-testid="tab-email-otp"
            onClick={() => {
              setAuthMethod('otp');
              resetMessages();
            }}
            className={`inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              authMethod === 'otp'
                ? 'bg-[#17120F] text-[#FAF7F2]'
                : 'text-[#17120F]/70 hover:text-[#17120F]'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            Email OTP
          </button>
          <button
            type="button"
            data-testid="tab-email-password"
            onClick={() => {
              setAuthMethod('password');
              resetMessages();
            }}
            className={`inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              authMethod === 'password'
                ? 'bg-[#17120F] text-[#FAF7F2]'
                : 'text-[#17120F]/70 hover:text-[#17120F]'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            Password
          </button>
        </div>

        {formError && (
          <div
            role="alert"
            className="mb-4 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800"
          >
            {formError}
          </div>
        )}

        {/* EMAIL OTP FLOW */}
        {authMethod === 'otp' ? (
          otpStep === 'email' ? (
            <form onSubmit={(e) => void handleSendOtp(e)} noValidate className="space-y-4">
              {mode === 'signup' && (
                <>
                  <div>
                    <label
                      htmlFor="otp-company"
                      className="block text-xs font-semibold text-[#17120F]/75 mb-1.5"
                    >
                      Company / Builder Name
                    </label>
                    <input
                      id="otp-company"
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g., Sovereign Estates Bengaluru"
                      className="w-full rounded-2xl bg-[#FAF7F2] border border-[#17120F]/12 px-4 py-3 text-sm text-[#17120F]"
                    />
                    {fieldErrors.companyName && (
                      <p className="text-xs text-red-700 mt-1">{fieldErrors.companyName}</p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="otp-whatsapp"
                      className="block text-xs font-semibold text-[#17120F]/75 mb-1.5"
                    >
                      WhatsApp Number (for direct buyer chats)
                    </label>
                    <input
                      id="otp-whatsapp"
                      type="tel"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="+91 98204 11890"
                      className="w-full rounded-2xl bg-[#FAF7F2] border border-[#17120F]/12 px-4 py-3 text-sm text-[#17120F]"
                    />
                  </div>
                </>
              )}

              <div>
                <label
                  htmlFor="otp-email"
                  className="block text-xs font-semibold text-[#17120F]/75 mb-1.5"
                >
                  Work Email Address (for 6-digit OTP &amp; booking alerts)
                </label>
                <input
                  id="otp-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="founder@agency.in"
                  className="w-full rounded-2xl bg-[#FAF7F2] border border-[#17120F]/12 px-4 py-3 text-sm text-[#17120F]"
                />
                {fieldErrors.email && (
                  <p className="text-xs text-red-700 mt-1">{fieldErrors.email}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={otpBusy}
                data-testid="send-otp-btn"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#17120F] text-[#FAF7F2] text-sm font-bold hover:bg-[#261E19] transition-colors cursor-pointer disabled:opacity-60"
              >
                {otpBusy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  <>
                    Send 6-Digit Email OTP
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={(e) => void handleVerifyOtp(e)} noValidate className="space-y-4">
              {otpStatusMsg && (
                <div className="rounded-2xl bg-[#EFE6D6]/65 border border-[#C9A96E]/45 px-4 py-3 text-xs text-[#17120F] space-y-1.5">
                  <p className="font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#238845] shrink-0" />
                    {otpStatusMsg}
                  </p>
                  {previewOtpHint && (
                    <div className="pt-1 flex items-center justify-between gap-2">
                      <span className="text-[#17120F]/75">Preview Verification Code:</span>
                      <span
                        data-testid="preview-otp-code"
                        className="font-mono-code text-sm font-extrabold tracking-[0.2em] px-2.5 py-0.5 rounded-lg bg-[#17120F] text-[#FAF7F2]"
                      >
                        {previewOtpHint}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="otp-code-input"
                    className="block text-xs font-semibold text-[#17120F]/75"
                  >
                    Enter 6-Digit Code sent to {email}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep('email');
                      setOtpCode('');
                      setPreviewOtpHint(null);
                    }}
                    className="text-xs font-semibold text-[#9D7D44] hover:text-[#17120F] cursor-pointer"
                  >
                    Change email
                  </button>
                </div>
                <input
                  id="otp-code-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="w-full rounded-2xl bg-[#FAF7F2] border border-[#17120F]/12 px-4 py-3.5 text-center font-mono-code text-xl font-bold tracking-[0.35em] text-[#17120F]"
                />
                {fieldErrors.otp && <p className="text-xs text-red-700 mt-1">{fieldErrors.otp}</p>}
              </div>

              <button
                type="submit"
                disabled={otpBusy}
                data-testid="verify-otp-btn"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#17120F] text-[#FAF7F2] text-sm font-bold hover:bg-[#261E19] transition-colors cursor-pointer disabled:opacity-60"
              >
                {otpBusy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Verify OTP &amp; Continue
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs text-[#17120F]/60 pt-1">
                <span>Didn&apos;t receive the email?</span>
                <button
                  type="button"
                  disabled={resendCooldown > 0 || otpBusy}
                  onClick={() => void handleSendOtp()}
                  className="inline-flex items-center gap-1 font-semibold text-[#17120F] disabled:opacity-45 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                </button>
              </div>
            </form>
          )
        ) : (
          /* EMAIL & PASSWORD FLOW */
          <form onSubmit={handlePasswordSubmit} noValidate className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label
                    htmlFor="auth-company"
                    className="block text-xs font-semibold text-[#17120F]/75 mb-1.5"
                  >
                    Company / Brokerage Name
                  </label>
                  <input
                    id="auth-company"
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g., Sovereign Estates"
                    className="w-full rounded-2xl bg-[#FAF7F2] border border-[#17120F]/12 px-4 py-3 text-sm text-[#17120F]"
                  />
                  {fieldErrors.companyName && (
                    <p className="text-xs text-red-700 mt-1">{fieldErrors.companyName}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="auth-whatsapp"
                    className="block text-xs font-semibold text-[#17120F]/75 mb-1.5"
                  >
                    WhatsApp Number (with country code)
                  </label>
                  <input
                    id="auth-whatsapp"
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="+91 98204 11890"
                    className="w-full rounded-2xl bg-[#FAF7F2] border border-[#17120F]/12 px-4 py-3 text-sm text-[#17120F]"
                  />
                  {fieldErrors.whatsapp && (
                    <p className="text-xs text-red-700 mt-1">{fieldErrors.whatsapp}</p>
                  )}
                </div>
              </>
            )}

            <div>
              <label
                htmlFor="auth-email"
                className="block text-xs font-semibold text-[#17120F]/75 mb-1.5"
              >
                Work Email
              </label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="founder@agency.in"
                className="w-full rounded-2xl bg-[#FAF7F2] border border-[#17120F]/12 px-4 py-3 text-sm text-[#17120F]"
              />
              {fieldErrors.email && (
                <p className="text-xs text-red-700 mt-1">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="auth-password"
                className="block text-xs font-semibold text-[#17120F]/75 mb-1.5"
              >
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'Minimum 6 characters' : 'Enter password'}
                className="w-full rounded-2xl bg-[#FAF7F2] border border-[#17120F]/12 px-4 py-3 text-sm text-[#17120F]"
              />
              {fieldErrors.password && (
                <p className="text-xs text-red-700 mt-1">{fieldErrors.password}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full mt-2 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#17120F] text-[#FAF7F2] text-sm font-bold hover:bg-[#261E19] transition-colors cursor-pointer"
            >
              {mode === 'signup' ? 'Create free workspace' : 'Log in to dashboard'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Free Providers & Support Note */}
        <div className="mt-6 pt-5 border-t border-[#17120F]/[0.08] flex items-start gap-2.5 text-[11px] text-[#17120F]/60">
          <ShieldCheck className="w-4 h-4 text-[#9D7D44] shrink-0 mt-0.5" />
          <p>
            100% free sign-in options: Google, Email OTP (via{' '}
            <span className="font-mono-code text-[#17120F]/80">{BUSINESS_CONTACT_EMAIL}</span>),
            GitHub &amp; Email/Password. Need help?{' '}
            <Link to="/contact" className="font-semibold text-[#17120F] underline">
              Contact us
            </Link>
            .
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-[#17120F]/55">
          Just browsing?{' '}
          <Link to="/c/aurelia-estates" className="font-semibold text-[#17120F] underline">
            Explore the live demo catalog
          </Link>
        </p>
      </div>
    </div>
  );
}
