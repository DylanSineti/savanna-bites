import InputError from '@/Components/InputError';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('login'), { onFinish: () => reset('password') });
    };

    return (
        <div className="min-h-screen flex" style={{ background: '#060810', fontFamily: 'system-ui, sans-serif' }}>
            <Head title="Sign In — Savanna Bites" />

            {/* Left panel — branding */}
            <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12" style={{ background: 'linear-gradient(135deg, rgba(233,185,110,.08) 0%, rgba(6,8,16,1) 60%)', borderRight: '1px solid rgba(240,236,228,.06)' }}>
                <Link href="/" className="flex items-center gap-2" style={{ textDecoration: 'none' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #e9b96e, #c8873a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, boxShadow: '0 0 20px rgba(233,185,110,.35)' }}>🌿</div>
                    <span style={{ fontWeight: 800, fontSize: 16, color: '#f0ece4', letterSpacing: '-0.03em', fontFamily: 'Georgia, serif' }}>
                        Savanna<span style={{ color: '#e9b96e' }}>Bites</span>
                    </span>
                </Link>
                <div>
                    <h2 style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.15, marginBottom: 16, color: '#f0ece4', letterSpacing: '-0.04em', fontFamily: 'Georgia, serif' }}>
                        Welcome back to<br />your restaurant HQ
                    </h2>
                    <p style={{ color: 'rgba(240,236,228,.5)', fontSize: 15, lineHeight: 1.7, maxWidth: 340 }}>
                        Orders, analytics, team management and WhatsApp conversations
                        — all in one place.
                    </p>
                </div>
                <p style={{ color: 'rgba(240,236,228,.22)', fontSize: 13 }}>© {new Date().getFullYear()} Savanna Bites</p>
            </div>

            {/* Right panel — form */}
            <div className="flex-1 flex flex-col items-center justify-center p-8" style={{ background: '#060810' }}>
                {/* Mobile logo */}
                <Link href="/" className="flex items-center gap-2 mb-8 lg:hidden" style={{ textDecoration: 'none' }}>
                    <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg, #e9b96e, #c8873a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>🌿</div>
                    <span style={{ fontWeight: 800, fontSize: 15, color: '#f0ece4', letterSpacing: '-0.03em', fontFamily: 'Georgia, serif' }}>
                        Savanna<span style={{ color: '#e9b96e' }}>Bites</span>
                    </span>
                </Link>

                <div className="w-full max-w-md">
                    <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f0ece4', marginBottom: 6, letterSpacing: '-0.03em', fontFamily: 'Georgia, serif' }}>Sign in</h1>
                    <p style={{ fontSize: 14, color: 'rgba(240,236,228,.5)', marginBottom: 32 }}>
                        Don't have an account?{' '}
                        <Link href="/register" style={{ color: '#e9b96e', textDecoration: 'none', fontWeight: 600 }}>Create one free</Link>
                    </p>

                    {status && (
                        <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 12, background: 'rgba(62,207,142,.08)', border: '1px solid rgba(62,207,142,.2)', fontSize: 13, color: '#3ecf8e' }}>
                            {status}
                        </div>
                    )}

                    <form onSubmit={submit} className="space-y-5">
                        <div>
                            <label htmlFor="email" className="block mb-1.5" style={{ fontSize: 13, fontWeight: 600, color: 'rgba(240,236,228,.5)' }}>
                                Email address
                            </label>
                            <input
                                id="email"
                                type="email"
                                name="email"
                                value={data.email}
                                autoComplete="username"
                                autoFocus
                                onChange={(e) => setData('email', e.target.value)}
                                className="w-full outline-none transition"
                                style={{ padding: '11px 14px', borderRadius: 10, border: '1px solid rgba(240,236,228,.08)', background: 'rgba(240,236,228,.04)', color: '#f0ece4', fontSize: 14 }}
                                placeholder="you@example.com"
                            />
                            <InputError message={errors.email} className="mt-1.5" />
                        </div>

                        <div>
                            <label htmlFor="password" className="block mb-1.5" style={{ fontSize: 13, fontWeight: 600, color: 'rgba(240,236,228,.5)' }}>
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                name="password"
                                value={data.password}
                                autoComplete="current-password"
                                onChange={(e) => setData('password', e.target.value)}
                                className="w-full outline-none transition"
                                style={{ padding: '11px 14px', borderRadius: 10, border: '1px solid rgba(240,236,228,.08)', background: 'rgba(240,236,228,.04)', color: '#f0ece4', fontSize: 14 }}
                                placeholder="••••••••"
                            />
                            <InputError message={errors.password} className="mt-1.5" />
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="remember"
                                    checked={data.remember}
                                    onChange={(e) => setData('remember', e.target.checked)}
                                    style={{ accentColor: '#e9b96e', width: 14, height: 14 }}
                                />
                                <span style={{ fontSize: 13, color: 'rgba(240,236,228,.5)' }}>Remember me</span>
                            </label>
                            {canResetPassword && (
                                <Link href={route('password.request')} style={{ fontSize: 13, color: '#e9b96e', textDecoration: 'none', fontWeight: 600 }}>
                                    Forgot password?
                                </Link>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full"
                            style={{
                                padding: '12px',
                                borderRadius: 10,
                                border: 'none',
                                cursor: processing ? 'not-allowed' : 'pointer',
                                opacity: processing ? 0.6 : 1,
                                background: 'linear-gradient(135deg, #e9b96e, #c8873a)',
                                color: '#060810',
                                fontWeight: 700,
                                fontSize: 14,
                                boxShadow: '0 0 28px rgba(233,185,110,.35)',
                                transition: 'all .2s',
                            }}
                        >
                            {processing ? 'Signing in…' : 'Sign in'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

