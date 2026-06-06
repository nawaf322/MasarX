import SettingsLayout from '@/Layouts/SettingsLayout';
import axios from 'axios';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { useTranslation } from '@/hooks/useTranslation';
import { SettingsShell } from './_components/SettingsShell';
import { SettingsSection } from './_components/SettingsSection';
import { SettingsField } from './_components/SettingsField';
import { SettingsSaveBar } from './_components/SettingsSaveBar';
import { Input } from '@/Components/UI/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/UI/select';
import { Inbox, RefreshCw, Hash, Shuffle, ArrowUpDown } from 'lucide-react';
import { useState } from 'react';

interface Props {
    settings: {
        code_prefix: string;
        code_format: string;
        code_length: number;
    };
    preview: string;
}

export default function LockersSettings({ settings, preview: initialPreview }: Props) {
    const { t } = useTranslation();
    const alert = useSweetAlert();
    const [previewCode, setPreviewCode] = useState(initialPreview);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const [formState, setFormState] = useState({
        code_prefix: settings.code_prefix ?? 'LCK',
        code_format: settings.code_format ?? 'random',
        code_length: settings.code_length ?? 6,
    });

    // Proxy to keep template code compatible
    const form = {
        data: formState,
        setData: (key: string, value: any) => setFormState(prev => ({ ...prev, [key]: value })),
        errors: formErrors,
        processing: saving,
        isDirty: true,
    };

    function refreshPreview() {
        setRefreshing(true);
        axios.get(route('settings.lockers.preview'))
            .then(res => {
                setPreviewCode(res.data.preview ?? res.data.code);
            })
            .finally(() => setRefreshing(false));
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setFormErrors({});
        setSaving(true);
        try {
            await axios.post(route('settings.lockers.update'), formState);
            alert.success(t('settings.lockers.saved'));
            refreshPreview();
        } catch (err: any) {
            const errs = err?.response?.data?.errors;
            if (errs) {
                const mapped: Record<string, string> = {};
                Object.entries(errs).forEach(([k, v]: any) => { mapped[k] = Array.isArray(v) ? v[0] : v; });
                setFormErrors(mapped);
            }
            alert.error(t('settings.validation_error'), t('settings.check_form'));
        } finally {
            setSaving(false);
        }
    }

    const exampleCode = (() => {
        const prefix = (form.data.code_prefix || 'LCK').toUpperCase();
        const len = Math.max(4, Math.min(12, Number(form.data.code_length) || 6));
        if (form.data.code_format === 'sequential') {
            return `${prefix}-${'0'.repeat(len - 1)}1`;
        }
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let sample = '';
        for (let i = 0; i < len; i++) sample += chars[Math.floor(Math.random() * chars.length)];
        return `${prefix}-${sample}`;
    })();

    return (
        <SettingsLayout title={t('settings.lockers.title')}>
            <SettingsShell
                title={t('settings.lockers.title')}
                description={t('settings.lockers.desc')}
            >
                <form onSubmit={submit}>
                    <SettingsSection
                        title={t('settings.lockers.code_section_title')}
                        description={t('settings.lockers.code_section_desc')}
                    >
                        {/* Preview card — spans both columns via fullWidth trick using md:col-span-2 */}
                        <div className="md:col-span-2 mb-2">
                            <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-5 py-4 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white border border-indigo-100 flex items-center justify-center shrink-0 shadow-sm">
                                    <Inbox className="h-5 w-5 text-indigo-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-indigo-500 font-medium uppercase tracking-wider">{t('settings.lockers.preview_label')}</p>
                                    <p className="text-2xl font-bold font-mono text-indigo-700 tracking-widest mt-0.5">{previewCode || exampleCode}</p>
                                    <p className="text-xs text-indigo-400 mt-1">{t('settings.lockers.preview_hint')}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={refreshPreview}
                                    disabled={refreshing}
                                    className="p-2.5 rounded-xl border border-indigo-200 text-indigo-400 hover:text-indigo-600 hover:bg-white hover:border-indigo-300 transition-colors disabled:opacity-50"
                                    title={t('lockers.regenerate')}
                                >
                                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>

                        {/* Prefix */}
                        <SettingsField
                            label={t('settings.lockers.prefix_label')}
                            help={t('settings.lockers.prefix_hint')}
                        >
                            <Input
                                value={form.data.code_prefix}
                                onChange={e => form.setData('code_prefix', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                                maxLength={10}
                                placeholder="LCK"
                                className="font-mono uppercase"
                            />
                            {form.errors.code_prefix && <p className="text-destructive text-xs mt-1">{form.errors.code_prefix}</p>}
                        </SettingsField>

                        {/* Format */}
                        <SettingsField
                            label={t('settings.lockers.format_label')}
                            help={t('settings.lockers.format_hint')}
                        >
                            <Select
                                value={form.data.code_format}
                                onValueChange={v => form.setData('code_format', v)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="random">
                                        <span className="flex items-center gap-2">
                                            <Shuffle className="h-3.5 w-3.5 text-muted-foreground" />
                                            {t('settings.lockers.format_random')}
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="sequential">
                                        <span className="flex items-center gap-2">
                                            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                                            {t('settings.lockers.format_sequential')}
                                        </span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            {form.errors.code_format && <p className="text-destructive text-xs mt-1">{form.errors.code_format}</p>}
                        </SettingsField>

                        {/* Length */}
                        <SettingsField
                            label={t('settings.lockers.length_label')}
                            help={t('settings.lockers.length_hint')}
                        >
                            <div className="flex items-center gap-3">
                                <Input
                                    type="number"
                                    min={4}
                                    max={12}
                                    value={form.data.code_length}
                                    onChange={e => form.setData('code_length', Number(e.target.value))}
                                    className="w-28"
                                />
                                <span className="text-sm text-muted-foreground">{t('settings.lockers.length_unit')}</span>
                            </div>
                            {form.errors.code_length && <p className="text-destructive text-xs mt-1">{form.errors.code_length}</p>}
                        </SettingsField>

                        {/* Info box */}
                        <div className="md:col-span-2">
                            <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 flex items-start gap-3">
                                <Hash className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                <div className="text-sm text-muted-foreground space-y-1">
                                    <p>{t('settings.lockers.info_random')}</p>
                                    <p>{t('settings.lockers.info_sequential')}</p>
                                    <p className="font-medium text-foreground">{t('settings.lockers.info_example')}: <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">{exampleCode}</code></p>
                                </div>
                            </div>
                        </div>
                    </SettingsSection>

                    <SettingsSaveBar isDirty={form.isDirty} processing={form.processing} />
                </form>
            </SettingsShell>
        </SettingsLayout>
    );
}
