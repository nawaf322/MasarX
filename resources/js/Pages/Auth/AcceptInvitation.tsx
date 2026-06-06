import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react';

interface Props {
    token:   string;
    name:    string;
    email:   string;
    orgName: string;
    role:    string;
}

export default function AcceptInvitation({ token, name, email, orgName, role }: Props) {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm,  setShowConfirm]  = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        password:              '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('invitation.accept', { token }));
    };

    return (
        <GuestLayout>
            <Head title={`Join ${orgName}`} />

            <div className="mb-8 text-center">
                {/* Icon */}
                <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
                    <ShieldCheck className="w-7 h-7 text-indigo-600" />
                </div>

                <h1 className="text-2xl font-bold text-gray-900">You're invited!</h1>
                <p className="mt-2 text-sm text-gray-500">
                    Hi <strong>{name}</strong>, you've been invited to join <strong>{orgName}</strong>
                    {role && <> as <span className="font-medium text-indigo-600">{role}</span></>}.
                </p>
                <p className="mt-1 text-xs text-gray-400">{email}</p>
            </div>

            <form onSubmit={submit} className="space-y-5">
                {/* Password */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Create your password
                    </label>
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            placeholder="Min. 8 characters"
                            required
                            autoFocus
                            className={`w-full border rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 bg-gray-50 focus:bg-white transition-colors ${
                                errors.password ? 'border-red-400' : 'border-gray-200'
                            }`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    {errors.password && (
                        <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                    )}
                </div>

                {/* Confirm Password */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Confirm password
                    </label>
                    <div className="relative">
                        <input
                            type={showConfirm ? 'text' : 'password'}
                            value={data.password_confirmation}
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            placeholder="Repeat your password"
                            required
                            className={`w-full border rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 bg-gray-50 focus:bg-white transition-colors ${
                                errors.password_confirmation ? 'border-red-400' : 'border-gray-200'
                            }`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirm(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            tabIndex={-1}
                        >
                            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    {errors.password_confirmation && (
                        <p className="text-red-500 text-xs mt-1">{errors.password_confirmation}</p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={processing || !data.password || !data.password_confirmation}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                    {processing
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Activating account…</>
                        : <><ShieldCheck className="w-4 h-4" /> Activate my account</>
                    }
                </button>

                <p className="text-center text-xs text-gray-400">
                    This invitation link expires in 7 days.
                </p>
            </form>
        </GuestLayout>
    );
}
