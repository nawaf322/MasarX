import { Button } from "@/Components/UI/button"
import { Input } from "@/Components/UI/input"
import { Label } from "@/Components/UI/label"
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function ResetPassword({ token, email }: { token: string, email: string }) {
    const { props } = usePage();
    const branding = (props as any).branding || {};
    const logoSrc = branding.login_logo_url || branding.logo_url;
    const { data, setData, post, processing, errors, reset } = useForm({
        token: token,
        email: email,
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.store'));
    };

    return (
        <GuestLayout>
            <Head title="Reset Password" />

            <div className="flex flex-col space-y-4 text-left mb-10">
                {logoSrc && (
                    <img src={logoSrc} alt="Logo" className="h-14 w-auto object-contain self-center mb-3 mx-auto drop-shadow-sm" />
                )}
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Set new password</h1>
                <p className="text-sm text-muted-foreground">
                    Please create a new password for your account.
                </p>
            </div>

            <form onSubmit={submit} className="space-y-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-gray-700 font-medium">E-mail</Label>
                        <Input
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            className="bg-gray-50 border-gray-200 focus:bg-white h-12 rounded-xl transition-all"
                            autoComplete="username"
                            onChange={(e) => setData('email', e.target.value)}
                        />
                        {errors.email && <div className="text-red-500 text-xs mt-1">{errors.email}</div>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-gray-700 font-medium">New Password</Label>
                        <Input
                            id="password"
                            type="password"
                            name="password"
                            value={data.password}
                            className="bg-gray-50 border-gray-200 focus:bg-white h-12 rounded-xl transition-all"
                            autoComplete="new-password"
                            onChange={(e) => setData('password', e.target.value)}
                            placeholder="Enter new password"
                        />
                        {errors.password && <div className="text-red-500 text-xs mt-1">{errors.password}</div>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password_confirmation" className="text-gray-700 font-medium">Confirm New Password</Label>
                        <Input
                            id="password_confirmation"
                            type="password"
                            name="password_confirmation"
                            value={data.password_confirmation}
                            className="bg-gray-50 border-gray-200 focus:bg-white h-12 rounded-xl transition-all"
                            autoComplete="new-password"
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            placeholder="Confirm new password"
                        />
                        {errors.password_confirmation && <div className="text-red-500 text-xs mt-1">{errors.password_confirmation}</div>}
                    </div>
                </div>

                <Button
                    type="submit"
                    className="w-full h-12 bg-[#4F46E5] hover:bg-indigo-700 rounded-xl text-md font-semibold transition-all shadow-lg hover:shadow-indigo-500/30"
                    disabled={processing}
                >
                    Reset Password
                </Button>
            </form>
        </GuestLayout>
    );
}
