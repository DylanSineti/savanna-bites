import InputError from '@/Components/InputError';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        restaurant_name: '',
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <div className="flex min-h-screen" style={{ background: '#060810', fontFamily: 'system-ui, sans-serif' }}>
            <Head title="Create Account — Savanna Bites" />

            {/* Left panel — branding */}
            <div className="flex-col justify-between hidden p-12 lg:flex lg:w-1/2" style={{ background: 'linear-gradient(135deg, rgba(233,185,110,.08) 0%, rgba(6,8,16,1) 60%)', borderRight: '1px solid rgba(240,236,228,.06)' }}>
                <Link href="/" className="flex items-center gap-2" style={{ textDecoration: 'none' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #e9b96e, #c8873a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, boxShadow: '0 0 20px rgba(233,185,110,.35)' }}>🌿</div>
                    <span style={{ fontWeight: 800, fontSize: 16, color: '#f0ece4', letterSpacing: '-0.03em', fontFamily: 'Georgia, serif' }}>
                        Savanna<span style={{ color: '#e9b96e' }}>Bites</span>
                    </span>
                </Link>
                <div>
                    <h2 style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.15, marginBottom: 16, color: '#f0ece4', letterSpacing: '-0.04em', fontFamily: 'Georgia, serif' }}>
                        Start managing your<br />restaurant today
                    </h2>
                    <p style={{ color: 'rgba(240,236,228,.5)', fontSize: 15, lineHeight: 1.7, maxWidth: 340, marginBottom: 32 }}>
                        Set up your menu, connect WhatsApp, and start accepting orders
                        — completely free to get started.
                    </p>
                    <ul className="space-y-3">
                        {['WhatsApp order automation', 'Live sales dashboard', 'Customer review collection', 'Integrated Paynow payments'].map((item) => (
                            <li key={item} className="flex items-center gap-2">
                                <svg width="14" height="14" fill="none" viewBox="0 0 20 20" style={{ flexShrink: 0 }}>
                                    <path fillRule="evenodd" clipRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fill="#3ecf8e" />
                                </svg>
                                <span style={{ fontSize: 13, color: 'rgba(240,236,228,.5)' }}>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <p style={{ color: 'rgba(240,236,228,.22)', fontSize: 13 }}>© {new Date().getFullYear()} Savanna Bites</p>
            </div>

            {/* Right panel — form */}
            <div className="flex flex-col items-center justify-center flex-1 p-8" style={{ background: '#060810' }}>
                {/* Mobile logo */}
                <Link href="/" className="flex items-center gap-2 mb-8 lg:hidden" style={{ textDecoration: 'none' }}>
                    <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg, #e9b96e, #c8873a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>🌿</div>
                    <span style={{ fontWeight: 800, fontSize: 15, color: '#f0ece4', letterSpacing: '-0.03em', fontFamily: 'Georgia, serif' }}>
                        Savanna<span style={{ color: '#e9b96e' }}>Bites</span>
                    </span>
                </Link>

                <div className="w-full max-w-md">
                    <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f0ece4', marginBottom: 6, letterSpacing: '-0.03em', fontFamily: 'Georgia, serif' }}>Create your account</h1>
                    <p style={{ fontSize: 14, color: 'rgba(240,236,228,.5)', marginBottom: 32 }}>
                        Already have an account?{' '}
                        <Link href="/login" style={{ color: '#e9b96e', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
                    </p>

                    <form onSubmit={submit} className="space-y-5">
                        <div>
                            <label htmlFor="restaurant_name" className="block mb-1.5" style={{ fontSize: 13, fontWeight: 600, color: 'rgba(240,236,228,.5)' }}>
                                Restaurant name
                            </label>
                            <input
                                id="restaurant_name"
                                name="restaurant_name"
                                type="text"
                                value={data.restaurant_name}
                                autoFocus
                                onChange={(e) => setData('restaurant_name', e.target.value)}
                                required
                                className="w-full transition outline-none"
                                style={{ padding: '11px 14px', borderRadius: 10, border: '1px solid rgba(240,236,228,.08)', background: 'rgba(240,236,228,.04)', color: '#f0ece4', fontSize: 14 }}
                                placeholder="Savanna Bites"
                            />
                            <InputError message={errors.restaurant_name} className="mt-1.5" />
                        </div>

                        <div>
                            <label htmlFor="name" className="block mb-1.5" style={{ fontSize: 13, fontWeight: 600, color: 'rgba(240,236,228,.5)' }}>
                                Full name
                            </label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                value={data.name}
                                autoComplete="name"
                                onChange={(e) => setData('name', e.target.value)}
                                required
                                className="w-full transition outline-none"
                                style={{ padding: '11px 14px', borderRadius: 10, border: '1px solid rgba(240,236,228,.08)', background: 'rgba(240,236,228,.04)', color: '#f0ece4', fontSize: 14 }}
                                placeholder="Tafadzwa Chikwanda"
                            />
                            <InputError message={errors.name} className="mt-1.5" />
                        </div>

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
                                onChange={(e) => setData('email', e.target.value)}
                                required
                                className="w-full transition outline-none"
                                style={{ padding: '11px 14px', borderRadius: 10, border: '1px solid rgba(240,236,228,.08)', background: 'rgba(240,236,228,.04)', color: '#f0ece4', fontSize: 14 }}
                                placeholder="you@example.com"
                            />
                            <InputError message={errors.email} className="mt-1.5" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="password" className="block mb-1.5" style={{ fontSize: 13, fontWeight: 600, color: 'rgba(240,236,228,.5)' }}>
                                    Password
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    name="password"
                                    value={data.password}
                                    autoComplete="new-password"
                                    onChange={(e) => setData('password', e.target.value)}
                                    required
                                    className="w-full transition outline-none"
                                    style={{ padding: '11px 14px', borderRadius: 10, border: '1px solid rgba(240,236,228,.08)', background: 'rgba(240,236,228,.04)', color: '#f0ece4', fontSize: 14 }}
                                    placeholder="••••••••"
                                />
                                <InputError message={errors.password} className="mt-1.5" />
                            </div>
                            <div>
                                <label htmlFor="password_confirmation" className="block mb-1.5" style={{ fontSize: 13, fontWeight: 600, color: 'rgba(240,236,228,.5)' }}>
                                    Confirm password
                                </label>
                                <input
                                    id="password_confirmation"
                                    type="password"
                                    name="password_confirmation"
                                    value={data.password_confirmation}
                                    autoComplete="new-password"
                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                    required
                                    className="w-full transition outline-none"
                                    style={{ padding: '11px 14px', borderRadius: 10, border: '1px solid rgba(240,236,228,.08)', background: 'rgba(240,236,228,.04)', color: '#f0ece4', fontSize: 14 }}
                                    placeholder="••••••••"
                                />
                                <InputError message={errors.password_confirmation} className="mt-1.5" />
                            </div>
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
                            {processing ? 'Creating account…' : 'Create account'}
                        </button>

                        <p className="text-center" style={{ fontSize: 12, color: 'rgba(240,236,228,.22)' }}>
                            By registering you agree to our terms of service.
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}


