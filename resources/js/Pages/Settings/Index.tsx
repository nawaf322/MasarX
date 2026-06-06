import React, { useState } from 'react';
import SettingsLayout from '@/Layouts/SettingsLayout';
import { Button } from "@/Components/UI/button";
import { Input } from "@/Components/UI/input";
import { Label } from "@/Components/UI/label";
import { Textarea } from "@/Components/UI/textarea";
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { Avatar, AvatarFallback, AvatarImage } from "@/Components/UI/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/Components/UI/tabs";
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useTranslation } from '@/hooks/useTranslation';

export default function SettingsProfile() {
    const { t } = useTranslation();
    const swal = useSweetAlert();
    const user = usePage().props.auth.user;

    const [data, setFormData] = useState({ name: user.name, email: user.email, bio: "Startups and Logistics enthusiast." });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);
    const [recentlySuccessful, setRecentlySuccessful] = useState(false);

    const setData = (key: string, value: any) => setFormData(prev => ({ ...prev, [key]: value }));

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        setProcessing(true);
        try {
            const { data: res } = await axios.patch(route('profile.update'), data);
            swal.toast(res?.message || t('settings.profile.saved') || 'Saved.', 'success');
            setRecentlySuccessful(true);
            setTimeout(() => setRecentlySuccessful(false), 2000);
        } catch (err: any) {
            const errs = err?.response?.data?.errors;
            if (errs) {
                const mapped: Record<string, string> = {};
                Object.entries(errs).forEach(([k, v]: any) => { mapped[k] = Array.isArray(v) ? v[0] : v; });
                setErrors(mapped);
            } else {
                swal.toast(err?.response?.data?.error || 'An error occurred.', 'error');
            }
        } finally {
            setProcessing(false);
        }
    };

    return (
        <SettingsLayout
            title={t('settings.profile.title')}
        >
            <form onSubmit={submit} className="space-y-8">

                <div className="flex items-center gap-x-6">
                    <Avatar className="h-20 w-20">
                        <AvatarImage src={`https://ui.shadcn.com/avatars/04.png`} />
                        <AvatarFallback>CN</AvatarFallback>
                    </Avatar>
                    <Button type="button" variant="outline" size="sm">
                        {t('settings.profile.change_avatar')}
                    </Button>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="name">{t('settings.profile.username')}</Label>
                    <Input
                        id="name"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        placeholder={t('settings.profile.username_placeholder')}
                    />
                    <p className="text-[0.8rem] text-muted-foreground">
                        {t('settings.profile.username_help')}
                    </p>
                </div>


                <div className="space-y-2">
                    <Label htmlFor="email">{t('settings.profile.email')}</Label>
                    <Input
                        id="email"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        disabled // Typically email change requires verification
                    />
                    <p className="text-[0.8rem] text-muted-foreground">
                        {t('settings.profile.email_help')}
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="bio">{t('settings.profile.bio')}</Label>
                    <Textarea
                        id="bio"
                        className="resize-none"
                        placeholder={t('settings.profile.bio_placeholder')}
                        value={data.bio}
                        onChange={(e) => setData('bio', e.target.value)}
                    />
                    <p className="text-[0.8rem] text-muted-foreground">
                        {t('settings.profile.bio_help')}
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <Button type="submit" disabled={processing}>{t('settings.profile.update_profile')}</Button>
                    {recentlySuccessful && <p className="text-sm text-green-600">{t('settings.profile.saved')}</p>}
                </div>
            </form>
        </SettingsLayout>
    );
}
