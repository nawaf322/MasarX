import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/Components/UI/button';
import { Input } from '@/Components/UI/input';
import { Label } from '@/Components/UI/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/UI/card';
import { ArrowLeft, Building2, User } from 'lucide-react';

export default function Create() {
    const { t } = useTranslation();
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        email: '',
        phone: '',
        address: '',
        admin_name: '',
        admin_email: '',
        admin_password: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('admin.organizations.store'));
    };

    return (
        <AuthenticatedLayout>
            <Head title={t('organizations.create')} />
            <div className="max-w-2xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link href={route('admin.organizations.index')}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('organizations.create')}</h1>
                        <p className="text-sm text-muted-foreground">{t('organizations.create_subtitle')}</p>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    {/* Org Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Building2 className="h-4 w-4 text-primary" />
                                {t('organizations.org_info')}
                            </CardTitle>
                            <CardDescription>{t('organizations.org_info_desc')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">{t('organizations.name')} <span className="text-red-500">*</span></Label>
                                <Input id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} required />
                                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">{t('organizations.email')} <span className="text-red-500">*</span></Label>
                                    <Input id="email" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} required />
                                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">{t('organizations.phone')}</Label>
                                    <Input id="phone" value={data.phone} onChange={(e) => setData('phone', e.target.value)} />
                                    {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="address">{t('settings.company.address')}</Label>
                                <Input id="address" value={data.address} onChange={(e) => setData('address', e.target.value)} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Admin User */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <User className="h-4 w-4 text-primary" />
                                {t('organizations.admin_user')}
                            </CardTitle>
                            <CardDescription>{t('organizations.admin_user_desc')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="admin_name">{t('organizations.name')} <span className="text-red-500">*</span></Label>
                                    <Input id="admin_name" value={data.admin_name} onChange={(e) => setData('admin_name', e.target.value)} required />
                                    {errors.admin_name && <p className="text-xs text-destructive">{errors.admin_name}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="admin_email">{t('organizations.email')} <span className="text-red-500">*</span></Label>
                                    <Input id="admin_email" type="email" value={data.admin_email} onChange={(e) => setData('admin_email', e.target.value)} required />
                                    {errors.admin_email && <p className="text-xs text-destructive">{errors.admin_email}</p>}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="admin_password">{t('settings.users.new_password')} <span className="text-red-500">*</span></Label>
                                <Input id="admin_password" type="password" value={data.admin_password} onChange={(e) => setData('admin_password', e.target.value)} required minLength={8} />
                                {errors.admin_password && <p className="text-xs text-destructive">{errors.admin_password}</p>}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-3">
                        <Link href={route('admin.organizations.index')}>
                            <Button type="button" variant="outline">{t('common.cancel')}</Button>
                        </Link>
                        <Button type="submit" disabled={processing}>
                            {processing ? t('common.loading') : t('organizations.provision_action')}
                        </Button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
