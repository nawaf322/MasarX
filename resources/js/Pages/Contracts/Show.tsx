import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useTranslation } from '@/hooks/useTranslation';
import Swal from 'sweetalert2';
import {
    X, RotateCcw, PenLine, FileSignature, CheckCircle2, ArrowLeft,
    Printer, FileText, User, Calendar, Tag, Hash, Download, Trash2,
    Edit, Clock, Shield,
} from 'lucide-react';

interface UserObj  { id: number; name: string; email: string }
interface RateCard { id: number; name: string }
interface Contract {
    id: number;
    contract_number: string;
    title: string;
    terms: string | null;
    status: string;
    start_date: string;
    end_date: string | null;
    file_path: string | null;
    file_paths: string[] | null;
    signed_at: string | null;
    created_at: string;
    customer: UserObj;
    rate_card: RateCard | null;
    signed_by: UserObj | null;
    signature_path: string | null;
}
interface Props { contract: Contract }

const STATUS_STYLES: Record<string, { badge: string; dot: string }> = {
    draft:     { badge: 'bg-gray-100 text-gray-700',    dot: 'bg-gray-400' },
    active:    { badge: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
    expired:   { badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
    cancelled: { badge: 'bg-red-100 text-red-700',      dot: 'bg-red-500' },
};

// ── Signature Pad Modal ─────────────────────────────────────────────────
interface SignatureModalProps {
    onClose: () => void;
    onConfirm: (dataUrl: string) => void;
    processing: boolean;
}

function SignatureModal({ onClose, onConfirm, processing }: SignatureModalProps) {
    const { t } = useTranslation();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [drawing, setDrawing]     = useState(false);
    const [hasStrokes, setHasStrokes] = useState(false);
    const lastPos = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        canvas.width  = rect.width;
        canvas.height = rect.height;
        const ctx = canvas.getContext('2d')!;
        ctx.lineCap     = 'round';
        ctx.lineJoin    = 'round';
        ctx.lineWidth   = 2.5;
        ctx.strokeStyle = '#1a1a2e';
    }, []);

    function getPos(e: React.MouseEvent | React.TouchEvent) {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        if ('touches' in e) {
            const touch = e.touches[0];
            return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
        }
        return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
    }

    const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        setDrawing(true);
        lastPos.current = getPos(e);
    }, []);

    const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        if (!drawing) return;
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        const pos = getPos(e);
        if (lastPos.current) {
            ctx.beginPath();
            ctx.moveTo(lastPos.current.x, lastPos.current.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
            setHasStrokes(true);
        }
        lastPos.current = pos;
    }, [drawing]);

    const stopDraw = useCallback(() => {
        setDrawing(false);
        lastPos.current = null;
    }, []);

    function clearCanvas() {
        const canvas = canvasRef.current!;
        canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
        setHasStrokes(false);
    }

    function handleConfirm() {
        if (!hasStrokes) return;
        onConfirm(canvasRef.current!.toDataURL('image/png'));
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <FileSignature className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-gray-900">{t('contracts.sign_modal_title')}</h3>
                            <p className="text-xs text-gray-500">{t('contracts.sign_modal_subtitle')}</p>
                        </div>
                    </div>
                    <button onClick={onClose} disabled={processing}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="px-6 py-5">
                    <p className="text-xs text-gray-500 mb-3 flex items-center gap-1.5">
                        <PenLine className="w-3.5 h-3.5" />
                        {t('contracts.sign_instruction')}
                    </p>
                    <div className="relative rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 overflow-hidden" style={{ cursor: 'crosshair' }}>
                        <div className="absolute inset-x-6 pointer-events-none" style={{ bottom: '28%', borderTop: '1px solid #d1d5db' }} />
                        {!hasStrokes && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="text-gray-300 text-sm font-medium select-none">{t('contracts.sign_instruction')}</span>
                            </div>
                        )}
                        <canvas ref={canvasRef} className="w-full touch-none" style={{ height: '180px', display: 'block' }}
                            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
                    </div>
                    <div className="flex justify-end mt-2">
                        <button type="button" onClick={clearCanvas} disabled={!hasStrokes || processing}
                            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-40 transition-colors">
                            <RotateCcw className="w-3 h-3" />
                            {t('contracts.sign_clear')}
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
                    <button type="button" onClick={onClose} disabled={processing}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60">
                        {t('common.cancel')}
                    </button>
                    <button type="button" onClick={handleConfirm} disabled={!hasStrokes || processing}
                        className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        {processing
                            ? <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            : <CheckCircle2 className="w-4 h-4" />
                        }
                        {t('contracts.sign_submit')}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Info Row helper ─────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value, iconColor = 'text-gray-400', bgColor = 'bg-gray-50' }: {
    icon: React.ElementType; label: string; value: React.ReactNode;
    iconColor?: string; bgColor?: string;
}) {
    return (
        <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-lg ${bgColor} flex items-center justify-center shrink-0 mt-0.5`}>
                <Icon className={`w-4 h-4 ${iconColor}`} />
            </div>
            <div className="min-w-0">
                <p className="text-xs text-gray-400">{label}</p>
                <div className="text-sm font-semibold text-gray-800 break-words">{value}</div>
            </div>
        </div>
    );
}

// ── Main Page ───────────────────────────────────────────────────────────
export default function ContractShow({ contract }: Props) {
    const { t } = useTranslation();
    const [showSignModal, setShowSignModal] = useState(false);
    const [signing, setSigning] = useState(false);

    const statusStyle = STATUS_STYLES[contract.status] ?? STATUS_STYLES.draft;
    const filePaths   = contract.file_paths ?? (contract.file_path ? [contract.file_path] : []);

    function handleSign(dataUrl: string) {
        setSigning(true);
        router.post(route('contracts.sign', contract.id), { signature: dataUrl }, {
            onFinish: () => { setSigning(false); setShowSignModal(false); },
        });
    }

    function handleDelete() {
        Swal.fire({
            title: t('contracts.delete_confirm'),
            text: contract.title,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: t('common.delete'),
            cancelButtonText: t('common.cancel'),
            reverseButtons: true,
            customClass: { popup: 'rounded-2xl shadow-2xl', confirmButton: 'rounded-lg font-medium', cancelButton: 'rounded-lg font-medium' },
        }).then((result) => {
            if (result.isConfirmed) router.delete(route('contracts.destroy', contract.id));
        });
    }

    return (
        <AuthenticatedLayout>
            <Head title={contract.contract_number} />

            {showSignModal && (
                <SignatureModal onClose={() => setShowSignModal(false)} onConfirm={handleSign} processing={signing} />
            )}

            <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">

                {/* ── Page header ── */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href={route('contracts.index')}
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors shrink-0">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-2xl font-bold text-gray-900 truncate">{contract.title}</h1>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusStyle.badge}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                                {t(`contracts.status_${contract.status}`)}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 font-mono mt-0.5">{contract.contract_number}</p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                        {['draft', 'active'].includes(contract.status) && !contract.signed_at && (
                            <button onClick={() => setShowSignModal(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm">
                                <FileSignature className="w-4 h-4" />
                                {t('contracts.sign')}
                            </button>
                        )}
                        {filePaths.map((path, i) => (
                            <a key={i} href={`/storage/${path}`} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm">
                                <Download className="w-4 h-4" />
                                {t('contracts.download_pdf')}{filePaths.length > 1 ? ` (${i + 1})` : ''}
                            </a>
                        ))}
                        <a href={route('contracts.print', contract.id)} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                            <Printer className="w-4 h-4" />
                            {t('contracts.print')}
                        </a>
                        <Link href={route('contracts.edit', contract.id)}
                            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                            <Edit className="w-4 h-4" />
                            {t('common.edit')}
                        </Link>
                        <button onClick={handleDelete}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors">
                            <Trash2 className="w-4 h-4" />
                            {t('common.delete')}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* ── Left sidebar: contract details ── */}
                    <div className="space-y-5">

                        {/* Info card */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">{t('contracts.contract_details')}</h3>
                            <div className="space-y-4">
                                <InfoRow icon={Hash}      label={t('contracts.contract_number')} value={<span className="font-mono">{contract.contract_number}</span>} iconColor="text-indigo-500" bgColor="bg-indigo-50" />
                                <InfoRow icon={User}      label={t('contracts.customer')}        value={contract.customer.name}  iconColor="text-blue-500"   bgColor="bg-blue-50" />
                                <InfoRow icon={Tag}       label={t('contracts.rate_card')}       value={contract.rate_card?.name ?? t('contracts.no_rate_card')} iconColor="text-purple-500" bgColor="bg-purple-50" />
                                <InfoRow icon={Calendar}  label={t('contracts.start_date')}      value={contract.start_date}     iconColor="text-green-500"  bgColor="bg-green-50" />
                                <InfoRow icon={Clock}     label={t('contracts.end_date')}        value={contract.end_date ?? t('contracts.no_end_date')} iconColor="text-amber-500" bgColor="bg-amber-50" />
                                <InfoRow icon={FileText}  label={t('contracts.created_at')}      value={new Date(contract.created_at).toLocaleDateString()} iconColor="text-gray-400" bgColor="bg-gray-50" />
                            </div>
                        </div>

                        {/* Signature info card */}
                        {contract.signed_at && (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Shield className="w-3.5 h-3.5" />
                                    {t('contracts.signature')}
                                </h3>
                                <div className="space-y-4">
                                    {contract.signed_by && (
                                        <InfoRow icon={User}     label={t('contracts.signed_by')} value={contract.signed_by.name} iconColor="text-green-500" bgColor="bg-green-50" />
                                    )}
                                    <InfoRow icon={Calendar} label={t('contracts.signed_at')} value={new Date(contract.signed_at).toLocaleString()} iconColor="text-green-500" bgColor="bg-green-50" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Right: signature image + terms (2 cols) ── */}
                    <div className="lg:col-span-2 space-y-5">

                        {/* Signature image */}
                        {contract.signature_path && (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                                    {t('contracts.signature')}
                                </h3>
                                <div className="border border-gray-100 rounded-xl bg-gray-50 p-6 inline-block">
                                    <img
                                        src={`/storage/${contract.signature_path}`}
                                        alt={t('contracts.signature')}
                                        className="max-h-36 max-w-sm object-contain"
                                    />
                                </div>
                                <p className="text-xs text-gray-400 mt-3">
                                    {t('contracts.signature_on_file')}
                                    {contract.signed_by && ` · ${contract.signed_by.name}`}
                                    {contract.signed_at && ` · ${new Date(contract.signed_at).toLocaleString()}`}
                                </p>
                            </div>
                        )}

                        {/* Unsigned CTA */}
                        {['draft', 'active'].includes(contract.status) && !contract.signed_at && (
                            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                                    <FileSignature className="w-6 h-6 text-amber-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-amber-800">{t('contracts.not_signed_yet')}</p>
                                    <p className="text-xs text-amber-600 mt-0.5">{t('contracts.sign_modal_subtitle')}</p>
                                </div>
                                <button onClick={() => setShowSignModal(true)}
                                    className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700 transition-colors">
                                    <FileSignature className="w-4 h-4" />
                                    {t('contracts.sign')}
                                </button>
                            </div>
                        )}

                        {/* Terms */}
                        {contract.terms && (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <FileText className="w-3.5 h-3.5" />
                                    {t('contracts.terms')}
                                </h3>
                                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{contract.terms}</pre>
                            </div>
                        )}

                        {/* No content placeholder */}
                        {!contract.terms && !contract.signature_path && ['active', 'draft'].includes(contract.status) && contract.signed_at && (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
                                <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                <p className="text-sm">{t('contracts.no_terms')}</p>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
