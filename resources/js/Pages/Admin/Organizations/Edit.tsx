import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/Components/UI/button';
import { Input } from '@/Components/UI/input';
import { Label } from '@/Components/UI/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/UI/card';
import { ArrowLeft, Building2 } from 'lucide-react';

export default function Edit({ organization }: { organization: any }) {
    const { t } = useTranslation();
    const { data, setData, put, processing, errors } = useForm({
        name: organization.name || '',
        email: organization.email || '',
        phone: organization.phone || '',
        address: organization.address || '',
        city: organization.city || '',
        country: organization.country || '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('admin.organizations.update', organization.id));
    };

    return (
        <AuthenticatedLayout>
            <Head title={t('organizations.edit')} />
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-center gap-3">
                    <Link href={route('admin.organizations.show', organization.id)}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('organizations.edit')}</h1>
                        <p className="text-sm text-muted-foreground">{organization.name}</p>
                    </div>
                </div>

                <form onSubmit={submit}>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Building2 className="h-4 w-4 text-primary" />
                                {t('organizations.org_info')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">{t('organizations.name')} <span className="text-red-500">*</span></Label>
                                <Input id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} required />
                                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">{t('organizations.email')}</Label>
                                    <Input id="email" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} />
                                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">{t('organizations.phone')}</Label>
                                    <Input id="phone" value={data.phone} onChange={(e) => setData('phone', e.target.value)} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="address">{t('settings.company.address')}</Label>
                                    <Input id="address" value={data.address} onChange={(e) => setData('address', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="city">{t('settings.company.city')}</Label>
                                    <Input id="city" value={data.city} onChange={(e) => setData('city', e.target.value)} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="country">{t('settings.company.country')}</Label>
                                <Input id="country" value={data.country} onChange={(e) => setData('country', e.target.value)} />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-3 mt-6">
                        <Link href={route('admin.organizations.show', organization.id)}>
                            <Button type="button" variant="outline">{t('common.cancel')}</Button>
                        </Link>
                        <Button type="submit" disabled={processing}>
                            {processing ? t('common.loading') : t('common.save')}
                        </Button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
