import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, usePage, router } from '@inertiajs/react';
import { Button } from "@/Components/UI/button";
import { ArrowLeft, Check, ChevronRight, Save, CreditCard, Wallet, Banknote, MapPin, Package, Truck, Hash, ImagePlus, FileCheck, X, Wind, Anchor } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from 'react';
import StepSenderReceiver from './Wizard/StepSenderReceiver';
import StepPackage from './Wizard/StepPackage';
import StepService from './Wizard/StepService';
import { PaymentStatus } from '@/types/enums';
import { useTranslation } from '@/hooks/useTranslation';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { Label } from "@/Components/UI/label";
import { RadioGroup, RadioGroupItem } from "@/Components/UI/radio-group";

export default function CreateShipmentWizard() {
    const { props } = usePage();
    const pageProps = props as any;
    const effectiveSettings = pageProps.effectiveSettings || {};
    const trackingPreview = pageProps.tracking_preview || '';
    const countries = pageProps.countries || [];
    const usCountry = countries.find((c: any) => c.iso2 === 'US');
    const defaultCountryId = usCountry?.id ?? null;
    const paymentMethods = pageProps.paymentMethods || [
        { id: 'manual', label: 'Pago manual', enabled: true },
    ];
    const DRAFT_KEY = 'masarx_shipment_draft';
    const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 horas

    const [currentStep, setCurrentStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [restoredDraft, setRestoredDraft] = useState(false);
    const [attachmentPhoto, setAttachmentPhoto] = useState<File | null>(null);
    const [attachmentPaymentProof, setAttachmentPaymentProof] = useState<File | null>(null);
    const [stepErrors, setStepErrors] = useState<Record<number, Record<string, string>>>({});
    const [step2CalculationDone, setStep2CalculationDone] = useState(false);
    const [step2CalculationStale, setStep2CalculationStale] = useState(false);
    const hasRestoredRef = useRef(false);
    const { t } = useTranslation();
    const alert = useSweetAlert();

    const STEPS = [
        { id: 1, name: t('shipments.wizard.step1') || 'Origin & Destination', component: StepSenderReceiver },
        { id: 2, name: t('shipments.wizard.step2') || 'Package Details', component: StepPackage },
        { id: 3, name: t('shipments.wizard.step3') || 'Service Selection', component: StepService },
        { id: 4, name: t('shipments.wizard.step4') || 'Review & Confirm', component: null },
    ];

    const { data, setData, errors } = useForm({
        sender_customer_id: null as number | null,
        receiver_customer_id: null as number | null,
        sender_details: {
            name: '',
            phone: '',
            company: '',
            address: '',
            city: '',
            state: '',
            country: usCountry?.name ?? 'USA',
            country_code: 'US',
            country_id: defaultCountryId,
            state_id: null as number | null,
            city_id: null as number | null,
            tax_id: ''
        },
        receiver_details: {
            name: '',
            phone: '',
            company: '',
            address: '',
            city: '',
            state: '',
            country: usCountry?.name ?? 'USA',
            country_code: 'US',
            country_id: defaultCountryId,
            state_id: null as number | null,
            city_id: null as number | null
        },
        packages: null as any[] | null,
        package_details: {
            weight: 1,
            dimensions: { length: 10, width: 10, height: 10 },
            pieces: 1,
            content_description: ''
        },
        service_type: '',
        payment_status: PaymentStatus.UNPAID,
        payment_method: 'manual',
        rate_data: null as any,
    });

    const packages = data.packages && Array.isArray(data.packages) && data.packages.length > 0
        ? data.packages
        : [{
            id: '1',
            weight: 1,
            pieces: 1,
            declared_value: 0,
            length: 10,
            width: 10,
            height: 10,
            content_description: '',
            items: [],
        }];

    // Restaurar borrador al cargar (ej. tras actualizar navegador)
    // Si viene un customer prefill (?customer_id=X), tiene prioridad absoluta sobre cualquier borrador.
    useEffect(() => {
        if (typeof window === 'undefined' || hasRestoredRef.current) return;
        hasRestoredRef.current = true;

        // Calculator prefill — highest priority, clears any existing draft
        try {
            const calcRaw = localStorage.getItem('masarx_calculator_prefill');
            if (calcRaw) {
                localStorage.removeItem('masarx_calculator_prefill');
                try { localStorage.removeItem(DRAFT_KEY); } catch {}
                const cp = JSON.parse(calcRaw);
                if (cp.sender_details)   setData('sender_details',   { ...data.sender_details,   ...cp.sender_details });
                if (cp.receiver_details) setData('receiver_details', { ...data.receiver_details, ...cp.receiver_details });
                if (cp.package_details)  setData('package_details',  cp.package_details);
                if (cp.service_type)     setData('service_type',     cp.service_type);
                if (cp.rate_data)        setData('rate_data',        cp.rate_data);
                return;
            }
        } catch { localStorage.removeItem('masarx_calculator_prefill'); }

        const prefill = pageProps.prefillCustomer as any;
        if (prefill) {
            // Prefill from customer profile — discard any stale draft so it doesn't mask the customer data.
            try { localStorage.removeItem(DRAFT_KEY); } catch {}
            setData('sender_details', {
                name:         prefill.name         ?? '',
                phone:        prefill.phone        ?? '',
                company:      prefill.company      ?? '',
                address:      prefill.address      ?? '',
                city:         prefill.city         ?? '',
                state:        prefill.state        ?? '',
                country:      prefill.country      ?? '',
                country_code: prefill.country_code ?? '',
                country_id:   prefill.country_id   ?? null,
                state_id:     prefill.state_id     ?? null,
                city_id:      prefill.city_id      ?? null,
                tax_id:       prefill.tax_id       ?? '',
            });
            setData('sender_customer_id', prefill.id);
            return;
        }

        // No prefill: restore draft if one exists and hasn't expired.
        try {
            const s = localStorage.getItem(DRAFT_KEY);
            if (s) {
                const draft = JSON.parse(s);
                if (draft?.data && (!draft.savedAt || Date.now() - draft.savedAt <= DRAFT_MAX_AGE_MS)) {
                    if (draft.step) setCurrentStep(draft.step);
                    const d = draft.data;
                    if (d?.sender_details) setData('sender_details', d.sender_details);
                    if (d?.receiver_details) setData('receiver_details', d.receiver_details);
                    if (d?.packages) setData('packages', d.packages);
                    if (d?.package_details) setData('package_details', d.package_details);
                    if (d?.service_type) setData('service_type', d.service_type ?? '');
                    if (d?.payment_method) setData('payment_method', d.payment_method ?? 'manual');
                    if (d?.rate_data) setData('rate_data', d.rate_data);
                    if (d?.sender_customer_id != null) setData('sender_customer_id', d.sender_customer_id);
                    if (d?.receiver_customer_id != null) setData('receiver_customer_id', d.receiver_customer_id);
                    setRestoredDraft(true);
                }
            }
        } catch { localStorage.removeItem(DRAFT_KEY); }
    }, []);

    // Autoguardar borrador al cambiar paso o datos
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const toSave = {
                step: currentStep,
                data: {
                    sender_details: data.sender_details,
                    receiver_details: data.receiver_details,
                    packages: data.packages,
                    package_details: data.package_details,
                    service_type: data.service_type,
                    payment_method: data.payment_method,
                    rate_data: data.rate_data,
                    sender_customer_id: data.sender_customer_id,
                    receiver_customer_id: data.receiver_customer_id,
                },
                savedAt: Date.now(),
            };
            localStorage.setItem(DRAFT_KEY, JSON.stringify(toSave));
        } catch {}
    }, [currentStep, data]);

    const handleCalculationComplete = useCallback((done: boolean, stale: boolean) => {
        setStep2CalculationDone(done);
        setStep2CalculationStale(stale);
    }, []);

    const step1Valid = (d: typeof data.sender_details) =>
        d?.name?.trim() && d?.phone?.trim() && d?.address?.trim() &&
        (d?.country_code || d?.country) && (d?.state_id || d?.state?.trim()) && (d?.city_id || d?.city?.trim());
    const canProceedStep1 = step1Valid(data.sender_details as any) && step1Valid(data.receiver_details as any);
    const canProceedStep2 = packages.length >= 1 &&
        packages.every(p =>
            (Number(p.weight) || 0) > 0 &&
            (Number(p.pieces) || 0) >= 1 &&
            (Number(p.length) || 0) > 0 &&
            (Number(p.width) || 0) > 0 &&
            (Number(p.height) || 0) > 0 &&
            (typeof p.content_description === 'string' ? p.content_description.trim() : '').length > 0
        ) &&
        step2CalculationDone &&
        !step2CalculationStale;

    const validateStep = (step: number): boolean => {
        const errors: Record<string, string> = {};
        
        if (step === 1) {
            const sender = data.sender_details;
            const receiver = data.receiver_details;
            
            if (!sender?.name?.trim()) errors['sender_details.name'] = t('shipments.wizard.validation.name_required');
            if (!sender?.phone?.trim()) errors['sender_details.phone'] = t('shipments.wizard.validation.phone_required');
            if (!sender?.address?.trim()) errors['sender_details.address'] = t('shipments.wizard.validation.address_required');
            if (!sender?.country_id && !sender?.country_code && !sender?.country) errors['sender_details.country'] = t('shipments.wizard.validation.country_required');
            if (!sender?.state_id && !sender?.state?.trim()) errors['sender_details.state'] = t('shipments.wizard.validation.state_required');
            if (!sender?.city_id && !sender?.city?.trim()) errors['sender_details.city'] = t('shipments.wizard.validation.city_required');
            
            if (!receiver?.name?.trim()) errors['receiver_details.name'] = t('shipments.wizard.validation.name_required');
            if (!receiver?.phone?.trim()) errors['receiver_details.phone'] = t('shipments.wizard.validation.phone_required');
            if (!receiver?.address?.trim()) errors['receiver_details.address'] = t('shipments.wizard.validation.address_required');
            if (!receiver?.country_id && !receiver?.country_code && !receiver?.country) errors['receiver_details.country'] = t('shipments.wizard.validation.country_required');
            if (!receiver?.state_id && !receiver?.state?.trim()) errors['receiver_details.state'] = t('shipments.wizard.validation.state_required');
            if (!receiver?.city_id && !receiver?.city?.trim()) errors['receiver_details.city'] = t('shipments.wizard.validation.city_required');

            // Prevent same customer as both sender and receiver
            if (
                data.sender_customer_id != null &&
                data.receiver_customer_id != null &&
                data.sender_customer_id === data.receiver_customer_id
            ) {
                errors['same_customer'] = t('shipments.wizard.validation.same_customer_origin_dest');
            }
        }
        
        if (step === 2) {
            const pkgs = packages;
            if (!pkgs || pkgs.length === 0) {
                errors['packages'] = t('shipments.wizard.validation.packages_required');
            } else {
                pkgs.forEach((p, idx) => {
                    if (!p.weight || Number(p.weight) <= 0) errors[`packages.${idx}.weight`] = t('shipments.wizard.validation.weight_required');
                    if (!p.length || Number(p.length) <= 0) errors[`packages.${idx}.length`] = t('shipments.wizard.validation.length_required');
                    if (!p.width || Number(p.width) <= 0) errors[`packages.${idx}.width`] = t('shipments.wizard.validation.width_required');
                    if (!p.height || Number(p.height) <= 0) errors[`packages.${idx}.height`] = t('shipments.wizard.validation.height_required');
                    if (p.declared_value === undefined || p.declared_value === null) errors[`packages.${idx}.declared_value`] = t('shipments.wizard.validation.declared_value_required');
                    if (!p.pieces || Number(p.pieces) < 1) errors[`packages.${idx}.pieces`] = t('shipments.wizard.validation.pieces_required');
                    const desc = typeof p.content_description === 'string' ? p.content_description.trim() : '';
                    if (!desc) errors[`packages.${idx}.content_description`] = t('shipments.wizard.validation.content_description_required');
                });
            }
            if (!step2CalculationDone) {
                errors['calculation'] = t('shipments.wizard.validation.calculation_required') || 'Debe calcular las tarifas antes de continuar';
            }
            if (step2CalculationStale) {
                errors['calculation_stale'] = t('shipments.wizard.calculation_stale');
            }
        }
        
        if (step === 3) {
            if (!data.service_type?.trim()) errors['service_type'] = t('shipments.wizard.validation.service_required');
            if (!data.rate_data) errors['rate_data'] = t('shipments.wizard.validation.rate_required');
        }
        
        setStepErrors(prev => ({ ...prev, [step]: errors }));
        return Object.keys(errors).length === 0;
    };

    const nextStep = async () => {
        if (!validateStep(currentStep)) {
            const firstErrorKey = Object.keys(stepErrors[currentStep] || {})[0];
            if (firstErrorKey) {
                setTimeout(() => {
                    const element = document.querySelector(`[name="${firstErrorKey}"], [data-field="${firstErrorKey}"]`) as HTMLElement;
                    if (!element) {
                        const input = document.querySelector(`input[id*="${firstErrorKey.split('.').pop()}"]`) as HTMLElement;
                        input?.focus();
                        input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    } else {
                        element.focus();
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 100);
            }
            alert?.error?.(
                t('shipments.wizard.validation.complete_required_fields') || 'Complete los campos obligatorios',
                t('shipments.wizard.validation.check_fields') || 'Revise los campos marcados en rojo'
            );
            return;
        }
        
        if (currentStep === 1 && !canProceedStep1) return;
        if (currentStep === 1) {
            const promises: Promise<void>[] = [];
            const customerId = data.sender_customer_id as number | null;
            if (customerId && data.sender_details) {
                promises.push(
                    import('axios').then(({ default: axios }) =>
                        axios.put(route('api.customers.update', customerId), {
                            name: data.sender_details.name,
                            phone: data.sender_details.phone,
                            address: data.sender_details.address,
                            country_id: data.sender_details.country_id,
                            state_id: data.sender_details.state_id,
                            city_id: data.sender_details.city_id,
                            country: data.sender_details.country,
                            state: data.sender_details.state,
                            city: data.sender_details.city,
                        }).then(() => { }).catch(() => { })
                    )
                );
            }
            const receiverId = data.receiver_customer_id as number | null;
            if (receiverId && data.receiver_details) {
                promises.push(
                    import('axios').then(({ default: axios }) =>
                        axios.put(route('api.customers.update', receiverId), {
                            name: data.receiver_details.name,
                            phone: data.receiver_details.phone,
                            address: data.receiver_details.address,
                            country_id: data.receiver_details.country_id,
                            state_id: data.receiver_details.state_id,
                            city_id: data.receiver_details.city_id,
                            country: data.receiver_details.country,
                            state: data.receiver_details.state,
                            city: data.receiver_details.city,
                        }).then(() => { }).catch(() => { })
                    )
                );
            }
            await Promise.all(promises);
        }
        if (currentStep === 2 && !canProceedStep2) return;
        if (currentStep < STEPS.length) setCurrentStep(c => c + 1);
    };

    const prevStep = () => {
        if (currentStep > 1) setCurrentStep(c => c - 1);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload: any = {
            sender_details: data.sender_details,
            receiver_details: data.receiver_details,
            service_type: data.service_type,
            payment_status: data.payment_method === 'manual' ? PaymentStatus.UNPAID : PaymentStatus.PENDING,
            payment_method: data.payment_method,
            rate_data: data.rate_data,
        };
        if (attachmentPhoto) payload.attachment_photo = attachmentPhoto;
        if (data.payment_method === 'manual' && attachmentPaymentProof) payload.attachment_payment_proof = attachmentPaymentProof;
        if (packages.length > 0) {
            payload.packages = packages.map(p => ({
                weight: p.weight,
                pieces: p.pieces,
                length: p.length,
                width: p.width,
                height: p.height,
                declared_value: p.declared_value ?? (p.items?.reduce((s: number, i: any) => s + (i.quantity || 0) * (i.unit_value || 0), 0) ?? 0),
                content_description: p.content_description,
                items: (p.items || []).map((i: any) => ({
                    description: i.description,
                    quantity: i.quantity,
                    unit_value: i.unit_value,
                })),
            }));
        } else {
            payload.package_details = data.package_details;
        }
        setSubmitting(true);
        router.post(route('shipments.store'), payload, {
            preserveScroll: true,
            onFinish: () => setSubmitting(false),
            onSuccess: () => { try { localStorage.removeItem(DRAFT_KEY); } catch {} },
            onError: (errors) => {
                const firstVal = Object.values(errors || {})[0];
                const msg = (errors?.rate_data || errors?.message || (typeof firstVal === 'string' ? firstVal : null)) as string | null;
                const title = t('shipments.wizard.create_error_title') || t('common.error_title') || 'Error';
                const text = msg || t('shipments.wizard.create_error_desc') || t('common.error_server') || 'Please try again.';
                alert?.error?.(title, text);
            },
        });
    };

    const renderProgress = () => (
        <div className="w-full py-6">
            <div className="flex items-center justify-between relative">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 -z-10"></div>
                <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary -z-10 transition-all duration-300"
                    style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
                ></div>
                {STEPS.map((step) => (
                    <div key={step.id} className="flex flex-col items-center bg-gray-50 dark:bg-gray-900 px-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors border-2 ${currentStep >= step.id ? 'bg-primary border-primary text-primary-foreground' : 'bg-white border-gray-300 text-gray-400'}`}>
                            {currentStep > step.id ? <Check className="h-5 w-5" /> : step.id}
                        </div>
                        <span className={`text-xs font-medium mt-2 ${currentStep >= step.id ? 'text-blue-600' : 'text-gray-400'}`}>{step.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <AuthenticatedLayout>
            <Head title={t('shipments.create_new') || 'New Shipment'} />
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <Link href={route('shipments.index')} className="text-sm font-medium text-gray-500 hover:text-gray-900 flex items-center gap-1 mb-2">
                            <ArrowLeft className="h-4 w-4" />
                            {t('shipments.back') || 'Back to Shipments'}
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900">{t('shipments.create_new') || 'New Shipment'}</h1>
                    </div>
                </div>

                {restoredDraft && (
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                        {t('shipments.wizard.draft_restored') || 'Draft restored'}
                    </div>
                )}

                {renderProgress()}

                <div className="mt-8 mb-8 min-h-[400px]">
                    {currentStep === 1 && (
                        <StepSenderReceiver data={data} setData={setData} errors={{ ...errors, ...stepErrors[1] }} countries={countries} step1Valid={step1Valid} />
                    )}
                    {currentStep === 2 && (
                        <StepPackage
                            data={data}
                            setData={setData}
                            errors={{ ...errors, ...stepErrors[2] }}
                            effectiveSettings={effectiveSettings}
                            onCalculationComplete={handleCalculationComplete}
                        />
                    )}
                    {currentStep === 3 && (
                        <StepService data={data} setData={setData} errors={{ ...errors, ...stepErrors[3] }} />
                    )}
                    {currentStep === 4 && (
                        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-200 text-sm">
                                <Save className="h-5 w-5 shrink-0 text-amber-600" />
                                <p>{t('shipments.wizard.draft_pending_hint') || 'Si cierras o sales por error, este envío quedará guardado como borrador hasta que lo finalices o elimines.'}</p>
                            </div>

                            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg shadow-gray-200/50 dark:shadow-none space-y-6">
                                <h3 className="font-bold text-xl border-b border-gray-200 dark:border-gray-700 pb-4 text-gray-900 dark:text-gray-100">{t('shipments.wizard.review')}</h3>

                                {trackingPreview && (
                                    <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary shrink-0">
                                            <Hash className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('shipments.wizard.tracking_preview')}</p>
                                            <p className="font-mono font-semibold text-gray-900 dark:text-gray-100">{trackingPreview}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-100 dark:border-emerald-900/50">
                                        <div className="flex items-center gap-2 mb-2">
                                            <MapPin className="h-4 w-4 text-emerald-600" />
                                            <p className="font-semibold text-emerald-800 dark:text-emerald-300 text-sm">{t('shipments.wizard.origin')}</p>
                                        </div>
                                        <p className="font-semibold text-gray-900 dark:text-gray-100">{data.sender_details?.name}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{data.sender_details?.city}, {data.sender_details?.country}</p>
                                    </div>
                                    <div className="p-5 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-100 dark:border-blue-900/50">
                                        <div className="flex items-center gap-2 mb-2">
                                            <MapPin className="h-4 w-4 text-blue-600" />
                                            <p className="font-semibold text-blue-800 dark:text-blue-300 text-sm">{t('shipments.wizard.destination')}</p>
                                        </div>
                                        <p className="font-semibold text-gray-900 dark:text-gray-100">{data.receiver_details?.name}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{data.receiver_details?.city}, {data.receiver_details?.country}</p>
                                    </div>
                                </div>

                                <div className="p-5 rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border border-violet-100 dark:border-violet-900/50">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/50 text-violet-600 shrink-0">
                                            {data.rate_data?.service_mode === 'air'  ? <Wind className="h-6 w-6" />
                                             : data.rate_data?.service_mode === 'sea' ? <Anchor className="h-6 w-6" />
                                             : <Truck className="h-6 w-6" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold text-gray-900 dark:text-gray-100">
                                                    {data.rate_data?.service_name ?? data.rate_data?.carrier_name ?? 'Local'}
                                                </p>
                                                {data.rate_data?.service_mode && (
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold
                                                        ${data.rate_data.service_mode === 'air'  ? 'bg-sky-100 text-sky-700'
                                                        : data.rate_data.service_mode === 'sea'  ? 'bg-blue-100 text-blue-700'
                                                        : 'bg-amber-100 text-amber-700'}`}>
                                                        {data.rate_data.service_mode === 'air'  ? (t('services.mode_air')  || 'Air')
                                                        : data.rate_data.service_mode === 'sea'  ? (t('services.mode_sea')  || 'Sea')
                                                        : (t('services.mode_land') || 'Land')}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                                                <Package className="h-3.5 w-3.5" />
                                                {packages.reduce((s, p) => s + (Number(p.weight) || 0), 0)}{effectiveSettings.weight_unit || 'kg'} • {packages.reduce((s, p) => s + (Number(p.pieces) || 1), 0)} {t('shipments.wizard.pieces')}
                                            </p>
                                        </div>
                                    </div>
                                    {data.rate_data?.breakdown && (
                                        <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4 space-y-2 text-sm border-t border-violet-200 dark:border-violet-800 mt-4">
                                            <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('shipments.wizard.price_breakdown')}</p>
                                            {data.rate_data.breakdown.base !== undefined && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600 dark:text-gray-400">{t('shipments.wizard.base_price')}</span>
                                                    <span className="font-medium">{data.rate_data.currency || effectiveSettings.currency || 'USD'} {Number(data.rate_data.breakdown.base).toFixed(2)}</span>
                                                </div>
                                            )}
                                            {data.rate_data.breakdown.weight_charge !== undefined && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600 dark:text-gray-400">{t('shipments.wizard.weight_charge')}</span>
                                                    <span className="font-medium">{data.rate_data.currency || effectiveSettings.currency || 'USD'} {Number(data.rate_data.breakdown.weight_charge).toFixed(2)}</span>
                                                </div>
                                            )}
                                            {data.rate_data.breakdown.handling_fee !== undefined && data.rate_data.breakdown.handling_fee > 0 && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600 dark:text-gray-400">{t('shipments.wizard.handling_fee')}</span>
                                                    <span className="font-medium">{data.rate_data.currency || effectiveSettings.currency || 'USD'} {Number(data.rate_data.breakdown.handling_fee).toFixed(2)}</span>
                                                </div>
                                            )}
                                            {data.rate_data.breakdown.subtotal !== undefined && (
                                                <div className="flex justify-between font-medium border-t pt-1 mt-1">
                                                    <span>{t('shipments.wizard.subtotal')}</span>
                                                    <span>{data.rate_data.currency || effectiveSettings.currency || 'USD'} {Number(data.rate_data.breakdown.subtotal).toFixed(2)}</span>
                                                </div>
                                            )}
                                            {data.rate_data.breakdown.fuel !== undefined && data.rate_data.breakdown.fuel > 0 && (
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-gray-500 dark:text-gray-400">{t('shipments.wizard.fuel_surcharge')} ({effectiveSettings.fuel_surcharge_percent || 0}%)</span>
                                                    <span>{data.rate_data.currency || effectiveSettings.currency || 'USD'} {Number(data.rate_data.breakdown.fuel).toFixed(2)}</span>
                                                </div>
                                            )}
                                            {data.rate_data.breakdown.insurance !== undefined && data.rate_data.breakdown.insurance > 0 && (
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-gray-500 dark:text-gray-400">{t('shipments.wizard.insurance')} ({effectiveSettings.insurance_percent || 0}%)</span>
                                                    <span>{data.rate_data.currency || effectiveSettings.currency || 'USD'} {Number(data.rate_data.breakdown.insurance).toFixed(2)}</span>
                                                </div>
                                            )}
                                            {data.rate_data.breakdown.tax !== undefined && data.rate_data.breakdown.tax > 0 && (
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-gray-500 dark:text-gray-400">{t('shipments.wizard.tax')} ({effectiveSettings.tax_rate || 0}%)</span>
                                                    <span>{data.rate_data.currency || effectiveSettings.currency || 'USD'} {Number(data.rate_data.breakdown.tax).toFixed(2)}</span>
                                                </div>
                                            )}
                                            {data.rate_data.breakdown.base_surcharge !== undefined && data.rate_data.breakdown.base_surcharge > 0 && (
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-gray-500 dark:text-gray-400">{t('shipments.wizard.base_surcharge')}</span>
                                                    <span>{data.rate_data.currency || effectiveSettings.currency || 'USD'} {Number(data.rate_data.breakdown.base_surcharge).toFixed(2)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between font-bold border-t pt-2 mt-2 text-lg text-violet-600 dark:text-violet-400">
                                                <span>{t('shipments.wizard.total')}</span>
                                                <span>{data.rate_data.currency || effectiveSettings.currency || 'USD'} {data.rate_data.total_price ?? 0}</span>
                                            </div>
                                        </div>
                                    )}
                                    {!data.rate_data?.breakdown && (
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{effectiveSettings.currency || 'USD'} {data.rate_data?.total_price ?? 0}</p>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <Label className="text-base font-semibold text-gray-900 dark:text-gray-100">{t('shipments.wizard.payment_method')}</Label>
                                    <RadioGroup
                                        value={data.payment_method || 'manual'}
                                        onValueChange={(v) => setData('payment_method', v)}
                                        className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4"
                                    >
                                        {paymentMethods.filter((m: any) => m.enabled).map((m: any) => (
                                            <div
                                                key={m.id}
                                                className={`flex items-center space-x-2 border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                                                    data.payment_method === m.id
                                                        ? 'border-primary bg-primary/10 shadow-md shadow-primary/10'
                                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                                }`}
                                                onClick={() => setData('payment_method', m.id)}
                                            >
                                                <RadioGroupItem value={m.id} id={m.id} />
                                                <Label htmlFor={m.id} className="flex items-center gap-2 cursor-pointer flex-1 font-medium">
                                                    {m.id === 'stripe' && <CreditCard className="h-5 w-5" />}
                                                    {m.id === 'paypal' && <Wallet className="h-5 w-5" />}
                                                    {m.id === 'manual' && <Banknote className="h-5 w-5" />}
                                                    {m.label}
                                                </Label>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                </div>

                                <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('shipments.wizard.attachments_optional') || 'Adjuntos (opcional)'}</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1.5 mb-1">
                                                <ImagePlus className="h-4 w-4" /> {t('shipments.wizard.attachment_photo') || 'Foto del paquete'}
                                            </Label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="file"
                                                    accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
                                                    className="block w-full text-sm text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 dark:file:bg-gray-800 dark:file:text-gray-300"
                                                    onChange={(e) => setAttachmentPhoto(e.target.files?.[0] || null)}
                                                />
                                                {attachmentPhoto && (
                                                    <Button type="button" size="sm" variant="ghost" className="shrink-0 text-red-600" onClick={() => setAttachmentPhoto(null)}>
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1">{t('shipments.wizard.attachment_formats') || 'JPG, PNG, GIF, WebP, PDF. Máx. 5MB'}</p>
                                        </div>
                                        {data.payment_method === 'manual' && (
                                            <div>
                                                <Label className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1.5 mb-1">
                                                    <FileCheck className="h-4 w-4" /> {t('shipments.wizard.attachment_payment') || 'Comprobante de pago'}
                                                </Label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="file"
                                                        accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
                                                        className="block w-full text-sm text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 dark:file:bg-gray-800 dark:file:text-gray-300"
                                                        onChange={(e) => setAttachmentPaymentProof(e.target.files?.[0] || null)}
                                                    />
                                                    {attachmentPaymentProof && (
                                                        <Button type="button" size="sm" variant="ghost" className="shrink-0 text-red-600" onClick={() => setAttachmentPaymentProof(null)}>
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-400 mt-1">{t('shipments.wizard.attachment_formats') || 'JPG, PNG, PDF. Máx. 5MB'}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-between border-t pt-6">
                    <Button variant="outline" onClick={prevStep} disabled={currentStep === 1}>
                        {t('shipments.wizard.prev')}
                    </Button>
                    {currentStep < 4 ? (
                        <Button
                            onClick={nextStep}
                            disabled={
                                (currentStep === 1 && !canProceedStep1) ||
                                (currentStep === 2 && !canProceedStep2) ||
                                (currentStep === 3 && !data.service_type)
                            }
                        >
                            {t('shipments.wizard.next')} <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button onClick={submit} className="bg-green-600 hover:bg-green-700" disabled={submitting} type="button">
                            {submitting ? t('shipments.wizard.processing') : (
                                <>{t('shipments.wizard.confirm')} <Save className="ml-2 h-4 w-4" /></>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
