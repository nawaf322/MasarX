import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage, router, useForm } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import axios from 'axios';

interface Country { id: number; name: string; iso2: string; phone_code?: string | null; }

export default function Edit({ mustVerifyEmail, status, countries = [] }: {
    mustVerifyEmail: boolean;
    status?: string;
    countries?: Country[];
}) {
    const { auth, flash } = usePage().props as any;
    const user = auth.user;

    // ── Address form ─────────────────────────────────────────────────────────
    const { data, setData, patch, processing, errors, recentlySuccessful } = useForm({
        phone:         user.phone         ?? '',
        address:       user.address       ?? '',
        address_line2: user.address_line2 ?? '',
        country_id:    user.country_id    ?? '',
        state_id:      user.state_id      ?? '',
        city_id:       user.city_id       ?? '',
        zip_code:      user.zip_code      ?? '',
    });

    const [states, setStates] = useState<{ id: number; name: string }[]>([]);
    const [cities, setCities] = useState<{ id: number; name: string }[]>([]);

    useEffect(() => {
        if (data.country_id) {
            axios.get(route('customers.locations.states'), { params: { country_id: data.country_id } })
                .then(r => setStates(r.data));
            setCities([]);
        } else {
            setStates([]);
            setCities([]);
        }
    }, [data.country_id]);

    useEffect(() => {
        if (data.state_id) {
            axios.get(route('customers.locations.cities'), { params: { state_id: data.state_id } })
                .then(r => setCities(r.data));
        } else {
            setCities([]);
        }
    }, [data.state_id]);

    const saveAddress = (e: React.FormEvent) => {
        e.preventDefault();
        patch(route('profile.update'));
    };

    // ── 2FA ──────────────────────────────────────────────────────────────────
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [otp, setOtp] = useState('');
    const [twoFaError, setTwoFaError] = useState('');
    const [loading, setLoading] = useState(false);
    const [useSms, setUseSms] = useState(false);

    // Auto-open OTP modal when server redirects back with two_factor_pending flash
    useEffect(() => {
        if (flash?.two_factor_pending) {
            setIsModalOpen(true);
            setTwoFaError('');
        }
    }, [flash?.two_factor_pending]);

    const startSetup = () => {
        setLoading(true);
        router.post(route('profile.two-factor.store'));
    };

    const verifyCode = () => {
        setLoading(true);
        router.post(route('profile.two-factor.verify'), { code: otp }, {
            onError: (err) => { setLoading(false); setTwoFaError(err.code || 'Invalid Code'); },
        });
    };

    const resendCode = (sms = false) => {
        setLoading(true);
        setUseSms(sms);
        router.post(route('profile.two-factor.resend'), { failover: sms });
    };

    const disableTwoFactor = () => {
        if (!confirm('Are you sure you want to disable 2FA?')) return;
        const password = prompt('Please confirm your password to disable 2FA:');
        if (!password) return;
        router.delete(route('profile.two-factor.destroy'), { data: { password } });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Profile" />

            <div className="py-12">
                <div className="max-w-3xl mx-auto sm:px-6 lg:px-8 space-y-6">

                    {flash?.error && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                            <p className="text-sm text-red-700">{flash.error}</p>
                        </div>
                    )}

                    {/* ── Profile Info (read-only) ── */}
                    <div className="p-6 bg-white shadow sm:rounded-lg">
                        <h2 className="text-lg font-semibold text-gray-900 mb-1">Profile Information</h2>
                        <p className="text-sm text-gray-500 mb-6">Your name and email are managed by the system administrator.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700">{user.name}</div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700">{user.email}</div>
                            </div>
                        </div>
                    </div>

                    {/* ── Address & Contact (editable) ── */}
                    <div className="p-6 bg-white shadow sm:rounded-lg">
                        <h2 className="text-lg font-semibold text-gray-900 mb-1">Contact & Address</h2>
                        <p className="text-sm text-gray-500 mb-6">Update your phone number and shipping address.</p>

                        {(recentlySuccessful || flash?.success) && (
                            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded">
                                {flash?.success ?? 'Profile updated successfully.'}
                            </div>
                        )}

                        <form onSubmit={saveAddress} className="space-y-4">
                            {/* Phone */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                <input
                                    type="text"
                                    value={data.phone}
                                    onChange={e => setData('phone', e.target.value)}
                                    placeholder="+15550123456"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                            </div>

                            {/* Address */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                <input
                                    type="text"
                                    value={data.address}
                                    onChange={e => setData('address', e.target.value)}
                                    placeholder="Street address"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                                {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2 <span className="text-gray-400">(optional)</span></label>
                                <input
                                    type="text"
                                    value={data.address_line2}
                                    onChange={e => setData('address_line2', e.target.value)}
                                    placeholder="Apt, suite, floor..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>

                            {/* Country / State / City / Zip */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                                    <select
                                        value={data.country_id}
                                        onChange={e => { setData('country_id', e.target.value); setData('state_id', ''); setData('city_id', ''); }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                                    >
                                        <option value="">Select country...</option>
                                        {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    {errors.country_id && <p className="text-red-500 text-xs mt-1">{errors.country_id}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">State / Province</label>
                                    <select
                                        value={data.state_id}
                                        onChange={e => { setData('state_id', e.target.value); setData('city_id', ''); }}
                                        disabled={states.length === 0}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white disabled:bg-gray-50 disabled:cursor-not-allowed"
                                    >
                                        <option value="">{data.country_id && states.length === 0 ? 'Loading...' : 'Select state...'}</option>
                                        {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                    {/* Show current value as text if no state_id but state text exists */}
                                    {!data.state_id && user.state && <p className="text-gray-500 text-xs mt-1">Current: {user.state}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                    <select
                                        value={data.city_id}
                                        onChange={e => setData('city_id', e.target.value)}
                                        disabled={cities.length === 0}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white disabled:bg-gray-50 disabled:cursor-not-allowed"
                                    >
                                        <option value="">{data.state_id && cities.length === 0 ? 'Loading...' : 'Select city...'}</option>
                                        {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    {!data.city_id && user.city && <p className="text-gray-500 text-xs mt-1">Current: {user.city}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ZIP / Postal Code</label>
                                    <input
                                        type="text"
                                        value={data.zip_code}
                                        onChange={e => setData('zip_code', e.target.value)}
                                        placeholder="00000"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 transition disabled:opacity-50 font-medium"
                                >
                                    {processing ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* ── 2FA ── */}
                    <div className="p-6 bg-white shadow sm:rounded-lg">
                        <h2 className="text-lg font-semibold text-gray-900 mb-1">Security & Two-Factor Authentication</h2>
                        <p className="text-sm text-gray-500 mb-6">Add additional security to your account using two-factor authentication.</p>

                        {user.two_factor_enabled ? (
                            <div className="space-y-4">
                                <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-md flex items-center gap-2">
                                    <span className="text-xl">✅</span>
                                    <div>
                                        <p className="font-bold">Two-Factor Authentication is Enabled.</p>
                                        <p className="text-sm">Your account is secured with Email/SMS verification.</p>
                                    </div>
                                </div>
                                <button onClick={disableTwoFactor} className="text-red-600 hover:text-red-800 text-sm font-medium underline">
                                    Disable 2FA
                                </button>
                            </div>
                        ) : (
                            <div>
                                <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-4 rounded-md mb-4">
                                    ⚠️ Two-Factor Authentication is Disabled.
                                </div>
                                <button
                                    onClick={startSetup}
                                    disabled={loading}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition disabled:opacity-50"
                                >
                                    {loading ? 'Processing...' : 'Enable Two-Factor Authentication'}
                                </button>
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* OTP Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Verify Your Identity</h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Enter the 6-digit code sent to your {useSms ? 'phone' : 'email address'}.
                            </p>
                            <input
                                type="text"
                                value={otp}
                                onChange={e => setOtp(e.target.value)}
                                className="w-full text-center text-3xl tracking-[0.5em] font-mono border border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500 mb-4 py-3"
                                maxLength={6}
                                placeholder="000000"
                            />
                            {twoFaError && <p className="text-red-500 text-sm mb-4">{twoFaError}</p>}
                            {flash?.success && <p className="text-green-600 text-sm mb-4">{flash.success}</p>}
                            <button
                                onClick={verifyCode}
                                disabled={loading || otp.length !== 6}
                                className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 mb-3 disabled:opacity-50"
                            >
                                {loading ? 'Verifying...' : 'Verify Code'}
                            </button>
                            <div className="text-center text-sm text-gray-500 space-y-2">
                                <p>Didn't receive the code?</p>
                                <div className="flex justify-center space-x-4">
                                    <button onClick={() => resendCode(false)} className="text-blue-600 hover:underline">Resend Email</button>
                                    <span className="text-gray-300">|</span>
                                    <button onClick={() => resendCode(true)} className="text-blue-600 hover:underline">Send via SMS/WhatsApp</button>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 px-6 py-3 flex justify-end">
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-600 hover:text-gray-800 text-sm font-medium">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
