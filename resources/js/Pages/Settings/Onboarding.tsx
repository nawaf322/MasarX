import { Head } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from "@/Components/UI/button";
import { Input } from "@/Components/UI/input";
import { Label } from "@/Components/UI/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/Components/UI/card";
import axios from 'axios';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { useTranslation } from '@/hooks/useTranslation';

export default function Onboarding() {
    const { t } = useTranslation();
    const swal = useSweetAlert();
    const [step, setStep] = useState(1);
    const [data, setFormData] = useState({
        company_name: '',
        tax_id: '',
        currency: 'USD',
        timezone: 'UTC',
        tracking_prefix: 'DEP',
    });
    const [processing, setProcessing] = useState(false);

    const setData = (key: string, value: any) => setFormData(prev => ({ ...prev, [key]: value }));

    const nextStep = () => setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);

    const finish = async () => {
        setProcessing(true);
        try {
            const { data: res } = await axios.post(route('onboarding.complete'), data);
            swal.toast(res?.message || 'Setup complete!', 'success');
            if (res?.redirect) window.location.href = res.redirect;
        } catch (err: any) {
            const msg = err?.response?.data?.errors
                ? Object.values(err.response.data.errors).flat().join(' ')
                : err?.response?.data?.error || err?.response?.data?.message || 'An error occurred.';
            swal.toast(msg, 'error');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <Head title={t('settings.onboarding.title')} />

            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>{t('settings.onboarding.welcome_title')}</CardTitle>
                    <CardDescription>{t('settings.onboarding.welcome_desc')}</CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Step 1: Company */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <h3 className="font-medium">{t('settings.onboarding.step1')}</h3>
                            <div className="space-y-2">
                                <Label>{t('settings.onboarding.company_name')}</Label>
                                <Input value={data.company_name} onChange={e => setData('company_name', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('settings.onboarding.tax_id_nit')}</Label>
                                <Input value={data.tax_id} onChange={e => setData('tax_id', e.target.value)} />
                            </div>
                        </div>
                    )}

                    {/* Step 2: Locale */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <h3 className="font-medium">{t('settings.onboarding.step2')}</h3>
                            <div className="space-y-2">
                                <Label>{t('settings.onboarding.default_currency')}</Label>
                                <Input value={data.currency} onChange={e => setData('currency', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('settings.onboarding.timezone')}</Label>
                                <Input value={data.timezone} onChange={e => setData('timezone', e.target.value)} />
                            </div>
                        </div>
                    )}

                    {/* Step 3: Logistics */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <h3 className="font-medium">{t('settings.onboarding.step3')}</h3>
                            <div className="space-y-2">
                                <Label>{t('settings.onboarding.tracking_prefix')}</Label>
                                <Input value={data.tracking_prefix} onChange={e => setData('tracking_prefix', e.target.value)} />
                                <p className="text-xs text-gray-500">Ex: DEP-0001</p>
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="ghost" onClick={prevStep} disabled={step === 1}>{t('settings.onboarding.back')}</Button>

                    {step < 3 ? (
                        <Button onClick={nextStep}>{t('settings.onboarding.next')}</Button>
                    ) : (
                        <Button onClick={finish} disabled={processing}>{t('settings.onboarding.complete_setup')}</Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
