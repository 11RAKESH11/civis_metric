import { useState } from 'react';
import EyeTracking from './EyeTracking';
import KineticGrid from './KineticGrid';

// Demo sign-in: any ID and password opens the workspace. The ID is kept only to greet you by name.
const UserIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0116 0" /></svg>
);
const LockIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></svg>
);
const EyeIcon = ({ off }) => (
  <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />{off && <path d="M4 4l16 16" />}
  </svg>
);

const FIELD = 'w-full rounded-lg border border-line-control bg-surface py-3 pl-10 pr-3.5 text-base text-ink outline-none transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-primary/25';

export default function LoginPage({ onLogin, onBack }) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    const id = (e.currentTarget.elements.namedItem('loginpage-field-0')?.value || '').trim();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      if (onLogin) onLogin('engineer', id);
    }, 600);
  };

  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-bg p-4 sm:p-8">
      <KineticGrid className="absolute inset-0 -z-10 h-full w-full pointer-events-none" />

      <main className="page-enter grid w-full max-w-4xl overflow-hidden rounded-3xl border border-line shadow-e2 md:grid-cols-[1.05fr_1fr]">
        {/* Brand side */}
        <section className="relative flex flex-col bg-nav p-7 text-on-nav sm:p-10">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="group inline-flex items-center gap-2.5 self-start rounded-full border border-white/25 bg-white/5 py-1.5 pl-1.5 pr-4 text-sm font-semibold transition-colors duration-200 hover:border-stripe hover:bg-white/10"
            >
              {/* The arrow slides out to the left and a house slides in as the circle turns orange */}
              <span className="relative grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-white/10 transition-colors duration-200 group-hover:bg-stripe group-hover:text-black">
                <svg aria-hidden="true" className="absolute h-4 w-4 transition-all duration-300 ease-out group-hover:-translate-x-6 group-hover:opacity-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
                <svg aria-hidden="true" className="absolute h-4 w-4 translate-x-6 opacity-0 transition-all duration-300 ease-out group-hover:translate-x-0 group-hover:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11l8-7 8 7M6 10v10h12V10M10 20v-6h4v6" /></svg>
              </span>
              Back to home
            </button>
          )}
          <h1 className="mt-5">
            <img src="/logo-dark.webp" alt="CivisMetric, material estimation platform" width="900" height="229" className="h-12 w-auto sm:h-14" />
          </h1>

          <div className="my-8 flex flex-1 items-center justify-center md:my-10">
            <EyeTracking size={92} gap={26} shut={passwordFocused && !showPassword} className="origin-center scale-[0.8] sm:scale-100" />
          </div>

          <h2 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">Construction estimating, with the workings shown.</h2>
          <p className="mt-3 max-w-sm text-base">Access your estimation engine, 3D visualizers and civil engineering workspace.</p>
        </section>

        {/* Form side */}
        <section className="relative bg-surface p-7 sm:p-10">
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-stripe" />
          <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>

          <form onSubmit={handleLogin} className="mt-7 space-y-5">
            <div>
              <label htmlFor="loginpage-field-0" className="mb-1.5 block text-sm font-semibold">Engineering ID / Email</label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center"><UserIcon /></span>
                <input id="loginpage-field-0" name="loginpage-field-0" type="text" required autoComplete="username" placeholder="E.g. CE-9082" className={FIELD} />
              </div>
            </div>

            <div>
              <label htmlFor="loginpage-field-1" className="mb-1.5 block text-sm font-semibold">Password</label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center"><LockIcon /></span>
                <input
                  id="loginpage-field-1"
                  name="loginpage-field-1"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  className={`${FIELD} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-1.5 my-auto grid h-9 w-9 place-items-center rounded-md hover:bg-sunken"
                >
                  <EyeIcon off={showPassword} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full overflow-hidden rounded-lg bg-primary py-3.5 text-base font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-80"
            >
              {isLoading ? (
                <svg aria-label="Signing in" className="mx-auto h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
              ) : (
                <span className="flex items-center justify-center gap-2">Sign in <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span></span>
              )}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
