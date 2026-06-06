import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { Button } from "@/Components/UI/button";
import { Input } from "@/Components/UI/input";
import {
    Scan, CheckCircle2, AlertCircle, AlertTriangle, ArrowLeft,
    ExternalLink, Printer, PackagePlus, Package,
    Layers, ArrowRight, ClipboardList,
} from "lucide-react";
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Badge } from "@/Components/UI/badge";
import { useTranslation } from '@/hooks/useTranslation';

export default function Receive() {
    const { t } = useTranslation();
    const [trackingNumber, setTrackingNumber]   = useState('');
    const [lastScanned,    setLastScanned]       = useState<any>(null);
    const [scanHistory,    setScanHistory]       = useState<any[]>([]);
    const [error,          setError]             = useState<string | null>(null);
    const [warning,        setWarning]           = useState<{ message: string; shipment: any } | null>(null);
    const [processing,     setProcessing]        = useState(false);

    const successAudio = useRef<HTMLAudioElement | null>(null);
    const errorAudio   = useRef<HTMLAudioElement | null>(null);
    const inputRef     = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
        if (typeof window !== 'undefined') {
            successAudio.current = new Audio('https://codeskulptor-demos.commondatastorage.googleapis.com/pang/pop.mp3');
            errorAudio.current   = new Audio('https://codeskulptor-demos.commondatastorage.googleapis.com/assets/soundboard/explode.wav');
        }
    }, []);

    const handleScan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!trackingNumber.trim() || processing) return;

        setProcessing(true);
        setError(null);
        setWarning(null);

        try {
            const response = await axios.post(route('warehouse.scan'), {
                tracking_number: trackingNumber,
            });

            const shipment = response.data.shipment;
            successAudio.current?.play().catch(() => {});
            setLastScanned(shipment);
            setScanHistory(prev => [shipment, ...prev].slice(0, 10));
            setTrackingNumber('');
        } catch (err: any) {
            const data = err.response?.data;
            if (data?.warning) {
                // Already received or dispatched — translate by code, not raw backend message
                errorAudio.current?.play().catch(() => {});
                const warnMsg = data.code === 'already_dispatched'
                    ? t('warehouse.already_dispatched', { status: data.shipment?.status ?? '' })
                    : t('warehouse.already_received');
                setWarning({ message: warnMsg, shipment: data.shipment });
                setLastScanned(null);
            } else {
                errorAudio.current?.play().catch(() => {});
                setError(data?.message || t('warehouse.tracking_not_found'));
            }
            setTrackingNumber('');
        } finally {
            setProcessing(false);
            inputRef.current?.focus();
        }
    };

    const sessionCount = scanHistory.length;

    return (
        <AuthenticatedLayout>
            <Head title={t('warehouse.receive_title')} />

            <div className="py-8 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between gap-4">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href={route('warehouse.index')} className="gap-2 text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="h-4 w-4" />
                            {t('warehouse.back_to_warehouse')}
                        </Link>
                    </Button>

                    {/* B) Session counter + quick access */}
                    {sessionCount > 0 && (
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 rounded-full px-3 py-1 text-sm font-medium">
                                <Package className="h-3.5 w-3.5" />
                                <span className="tabular-nums font-bold">{sessionCount}</span>
                                <span>{t('warehouse.session_scanned')}</span>
                            </div>
                            <Button size="sm" variant="outline" asChild className="h-8 gap-1.5">
                                <Link href={route('warehouse.inventory.index')}>
                                    <Layers className="h-3.5 w-3.5" />
                                    {t('warehouse.go_to_inventory')}
                                </Link>
                            </Button>
                            <Button size="sm" asChild className="h-8 gap-1.5 bg-gray-900 hover:bg-black text-white">
                                <Link href={route('warehouse.manifests.create')}>
                                    <ClipboardList className="h-3.5 w-3.5" />
                                    {t('warehouse.go_to_manifests')}
                                </Link>
                            </Button>
                        </div>
                    )}
                </div>

                {/* Title */}
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 rounded-lg">
                        <Scan className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {t('warehouse.receive_title')}
                        </h2>
                        <p className="text-muted-foreground text-sm">{t('warehouse.receive_subtitle')}</p>
                    </div>
                </div>

                {/* Scan input area */}
                <div className={`p-6 rounded-2xl border-2 transition-all ${
                    error
                        ? 'border-red-300 bg-red-50 dark:bg-red-950/20'
                        : warning
                            ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/20'
                            : lastScanned && !processing
                                ? 'border-green-300 bg-green-50 dark:bg-green-950/20'
                                : 'border-gray-200 bg-white dark:bg-gray-900 shadow-sm'
                }`}>
                    <form onSubmit={handleScan} className="flex gap-3">
                        <div className="relative flex-1">
                            <Scan className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <Input
                                ref={inputRef}
                                value={trackingNumber}
                                onChange={e => setTrackingNumber(e.target.value)}
                                placeholder={t('warehouse.scan_placeholder')}
                                className="pl-11 h-14 text-lg font-mono"
                                autoFocus
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={processing}
                            className="h-14 px-8 text-base bg-primary hover:bg-primary/90"
                        >
                            {processing ? t('warehouse.processing') : t('warehouse.process')}
                        </Button>
                    </form>

                    {error && (
                        <div className="flex items-center gap-2 mt-4 text-red-600 font-semibold animate-pulse">
                            <AlertCircle className="h-5 w-5 shrink-0" />
                            {error}
                        </div>
                    )}

                    {warning && (
                        <div className="flex items-start gap-2 mt-4 text-amber-700 font-semibold">
                            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                            <div>
                                <div>{warning.message}</div>
                                {warning.shipment && (
                                    <div className="font-mono text-sm font-normal text-amber-600 mt-0.5">
                                        #{warning.shipment.tracking_number}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {lastScanned && !error && !warning && (
                        <div className="flex items-center gap-2 mt-4 text-green-700 font-semibold">
                            <CheckCircle2 className="h-5 w-5 shrink-0" />
                            {t('warehouse.package_loaded')} <span className="font-mono">{lastScanned.tracking_number}</span>
                        </div>
                    )}
                </div>

                {/* A) Post-scan action card — solo en éxito real */}
                {lastScanned && !error && !warning && (
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-green-200 dark:border-green-800 shadow-sm overflow-hidden">
                        <div className="bg-green-50 dark:bg-green-950/30 px-5 py-3 border-b border-green-100 dark:border-green-800 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-semibold text-green-800 dark:text-green-300">
                                {t('warehouse.next_steps')}
                            </span>
                        </div>

                        <div className="p-5">
                            {/* Shipment summary */}
                            <div className="flex items-center gap-3 mb-5">
                                <div className="p-2.5 bg-blue-50 dark:bg-blue-950 rounded-lg shrink-0">
                                    <Package className="h-5 w-5 text-blue-600" />
                                </div>
                                <div className="min-w-0">
                                    <div className="font-mono font-bold text-gray-900 dark:text-white text-base">
                                        #{lastScanned.tracking_number}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                                        <span className="truncate">{lastScanned.sender_details?.name ?? '—'}</span>
                                        <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate font-medium text-foreground">
                                            {lastScanned.receiver_details?.city ?? lastScanned.receiver_details?.name ?? '—'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Action buttons */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <Button variant="outline" className="h-auto py-3 flex-col gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300" asChild>
                                    <Link href={route('shipments.show', lastScanned.id)}>
                                        <ExternalLink className="h-5 w-5" />
                                        <span className="text-xs font-medium">{t('warehouse.view_shipment')}</span>
                                    </Link>
                                </Button>

                                <Button
                                    variant="outline"
                                    className="h-auto py-3 flex-col gap-1.5 border-gray-200 text-gray-700 hover:bg-gray-50"
                                    onClick={() => window.open(route('shipments.label', lastScanned.id), '_blank')}
                                >
                                    <Printer className="h-5 w-5" />
                                    <span className="text-xs font-medium">{t('warehouse.print_label')}</span>
                                </Button>

                                <Button variant="outline" className="h-auto py-3 flex-col gap-1.5 border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300" asChild>
                                    <Link href={route('warehouse.manifests.create')}>
                                        <PackagePlus className="h-5 w-5" />
                                        <span className="text-xs font-medium">{t('warehouse.add_to_manifest')}</span>
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Scan history */}
                {scanHistory.length > 0 && (
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-between items-center">
                            <h3 className="font-semibold text-gray-900 dark:text-white">{t('warehouse.recent_scans')}</h3>
                            <Badge variant="outline">{scanHistory.length}</Badge>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {scanHistory.map((shipment, idx) => (
                                <div key={idx} className="px-4 py-3 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                                        <span className="font-mono font-semibold text-sm text-gray-900 dark:text-white">
                                            {shipment.tracking_number}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-gray-500">
                                        <span className="hidden sm:block">{shipment.sender_details?.name}</span>
                                        <ArrowRight className="h-3.5 w-3.5 hidden sm:block" />
                                        <span>{shipment.receiver_details?.city ?? shipment.receiver_details?.name}</span>
                                        <span className="text-xs text-gray-400">
                                            {new Date(shipment.updated_at || Date.now()).toLocaleTimeString()}
                                        </span>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" asChild>
                                            <Link href={route('shipments.show', shipment.id)}>
                                                <ExternalLink className="h-3.5 w-3.5" />
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* C) Floating bottom bar */}
            {sessionCount > 0 && (
                <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-900 dark:bg-gray-800 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-gray-700">
                    <Package className="h-4 w-4 text-green-400 shrink-0" />
                    <span className="text-sm font-bold tabular-nums text-green-400">{sessionCount}</span>
                    <span className="text-sm text-gray-300">{t('warehouse.session_scanned')}</span>
                    <span className="text-gray-600 mx-1">·</span>
                    <Button size="sm" variant="ghost" asChild className="h-7 text-xs text-gray-200 hover:text-white hover:bg-gray-700 gap-1">
                        <Link href={route('warehouse.inventory.index')}>
                            <Layers className="h-3.5 w-3.5" />
                            {t('warehouse.go_to_inventory')}
                        </Link>
                    </Button>
                    <Button size="sm" variant="ghost" asChild className="h-7 text-xs text-gray-200 hover:text-white hover:bg-gray-700 gap-1">
                        <Link href={route('warehouse.manifests.create')}>
                            <ClipboardList className="h-3.5 w-3.5" />
                            {t('warehouse.go_to_manifests')}
                        </Link>
                    </Button>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
