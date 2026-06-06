import SettingsLayout from "@/Layouts/SettingsLayout";
import axios from 'axios';
import { useTranslation } from "@/hooks/useTranslation";
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { SettingsShell } from "./_components/SettingsShell";
import { SettingsSection } from "./_components/SettingsSection";
import { Badge } from "@/Components/UI/badge";
import { Button } from "@/Components/UI/button";
import {
    Brain, Route, Truck, Users, BarChart3, Save,
    Info, Clock, Zap, RefreshCw, Eye, EyeOff,
    CheckCircle, XCircle, Loader2, KeyRound, Cpu,
} from "lucide-react";
import { useState } from "react";
import { useTranslation as useRawT } from "react-i18next";

// ── Types ──────────────────────────────────────────────────────────────────

interface GaConfig {
    route: {
        enabled: boolean; population_size: number; generations: number;
        mutation_rate: number; crossover_rate: number; elite_count: number; tournament_k: number;
    };
    carrier: {
        enabled: boolean; population_size: number; generations: number;
        mutation_rate: number; cost_weight: number; time_weight: number; reliability_weight: number;
    };
    insights: {
        enabled: boolean; cache_minutes: number; history_days: number; delay_threshold_hours: number;
    };
    load_balancer: {
        enabled: boolean; population_size: number; generations: number; mutation_rate: number;
    };
}

interface AiConfig {
    provider: string;
    api_key: string;   // '***REDACTED***' when set, '' when not
    model: string;
    configured: boolean;
}

interface RunLog {
    id: number; type: string; fitness_score: number | null;
    generation_count: number | null; execution_time_ms: number | null;
    status: string; created_at: string;
}

interface Props {
    ga_config: GaConfig;
    run_history: RunLog[];
    ai_config: AiConfig;
}

// ── Model lists per provider ───────────────────────────────────────────────

const OPENAI_MODELS = [
    { value: 'gpt-4o',           label: 'GPT-4o (best quality)' },
    { value: 'gpt-4o-mini',      label: 'GPT-4o Mini (fast & cheap)' },
    { value: 'gpt-3.5-turbo',    label: 'GPT-3.5 Turbo (legacy)' },
];
const ANTHROPIC_MODELS = [
    { value: 'claude-opus-4-6',            label: 'Claude Opus 4.6 (most capable)' },
    { value: 'claude-sonnet-4-6',          label: 'Claude Sonnet 4.6 (balanced)' },
    { value: 'claude-haiku-4-5-20251001',  label: 'Claude Haiku 4.5 (fast & cheap)' },
];

// ── Component ──────────────────────────────────────────────────────────────

export default function GeneticAlgorithmSettings({ ga_config, run_history, ai_config }: Props) {
    const { t } = useTranslation();
    const swal = useSweetAlert();

    // ── GA config form ─────────────────────────────────────────────────────
    const [gaData, setGaData] = useState<Record<string, any>>({
        route_enabled:              ga_config.route.enabled,
        route_population_size:      ga_config.route.population_size,
        route_generations:          ga_config.route.generations,
        route_mutation_rate:        ga_config.route.mutation_rate,
        route_crossover_rate:       ga_config.route.crossover_rate,
        route_elite_count:          ga_config.route.elite_count,
        route_tournament_k:         ga_config.route.tournament_k,
        carrier_enabled:            ga_config.carrier.enabled,
        carrier_population_size:    ga_config.carrier.population_size,
        carrier_generations:        ga_config.carrier.generations,
        carrier_mutation_rate:      ga_config.carrier.mutation_rate,
        carrier_cost_weight:        ga_config.carrier.cost_weight,
        carrier_time_weight:        ga_config.carrier.time_weight,
        carrier_reliability_weight: ga_config.carrier.reliability_weight,
        insights_enabled:               ga_config.insights.enabled,
        insights_cache_minutes:         ga_config.insights.cache_minutes,
        insights_history_days:          ga_config.insights.history_days,
        insights_delay_threshold_hours: ga_config.insights.delay_threshold_hours,
        lb_enabled:         ga_config.load_balancer.enabled,
        lb_population_size: ga_config.load_balancer.population_size,
        lb_generations:     ga_config.load_balancer.generations,
        lb_mutation_rate:   ga_config.load_balancer.mutation_rate,
    });
    const [gaProcessing, setGaProcessing] = useState(false);

    const data = gaData;
    const setData = (key: string, value: any) => setGaData(prev => ({ ...prev, [key]: value }));
    const processing = gaProcessing;

    // ── AI config form ─────────────────────────────────────────────────────
    const [aiData, setAiData] = useState({
        provider: ai_config.provider || '',
        api_key:  '',   // Never prefill the real key — user types new one to replace
        model:    ai_config.model || '',
    });
    const [aiProcessing, setAiProcessing] = useState(false);

    const aiForm = {
        data: aiData,
        setData: (key: string, value: any) => setAiData(prev => ({ ...prev, [key]: value })),
        processing: aiProcessing,
    };

    const [showKey, setShowKey] = useState(false);
    const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
    const [testMsg, setTestMsg] = useState('');

    const keyIsSet = ai_config.configured || ai_config.api_key === '***REDACTED***';

    const handleGaSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setGaProcessing(true);
        try {
            const { data: res } = await axios.post(route("settings.genetic-algorithm.save"), gaData);
            swal.toast(res?.message || t('settings.save_success') || 'Saved.', 'success');
        } catch (err: any) {
            const msg = err?.response?.data?.errors
                ? Object.values(err.response.data.errors).flat().join(' ')
                : err?.response?.data?.error || err?.response?.data?.message || 'An error occurred.';
            swal.toast(msg, 'error');
        } finally {
            setGaProcessing(false);
        }
    };

    const handleAiSave = async (e: React.FormEvent) => {
        e.preventDefault();
        // If user left api_key blank and key is already set, don't overwrite it
        const payload: Record<string, string> = {
            provider: aiData.provider,
            model: aiData.model,
        };
        if (aiData.api_key.trim()) {
            payload.api_key = aiData.api_key.trim();
        }
        setAiProcessing(true);
        try {
            const { data: res } = await axios.post(route('settings.ai.save'), payload);
            swal.toast(res?.message || t('settings.save_success') || 'Saved.', 'success');
        } catch (err: any) {
            const msg = err?.response?.data?.errors
                ? Object.values(err.response.data.errors).flat().join(' ')
                : err?.response?.data?.error || err?.response?.data?.message || 'An error occurred.';
            swal.toast(msg, 'error');
        } finally {
            setAiProcessing(false);
        }
    };

    const handleTestConnection = async () => {
        setTestStatus('loading');
        setTestMsg('');
        try {
            const res = await fetch(route('ai.test'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '',
                    'Accept': 'application/json',
                },
            });
            const json = await res.json();
            if (json.ok) {
                setTestStatus('ok');
                setTestMsg(json.message || 'Connection successful');
            } else {
                setTestStatus('error');
                setTestMsg(json.message || 'Connection failed');
            }
        } catch (err: any) {
            setTestStatus('error');
            setTestMsg(err.message || 'Network error');
        }
    };

    const TYPE_LABELS: Record<string, string> = {
        route_optimizer:  t("genetic_algorithm.type_route"),
        carrier_selector: t("genetic_algorithm.type_carrier"),
        load_balancer:    t("genetic_algorithm.type_load_balancer"),
        insights:         t("genetic_algorithm.type_insights"),
    };

    const TYPE_ICONS: Record<string, React.ReactNode> = {
        route_optimizer:  <Route className="h-3.5 w-3.5" />,
        carrier_selector: <Truck className="h-3.5 w-3.5" />,
        load_balancer:    <Users className="h-3.5 w-3.5" />,
        insights:         <BarChart3 className="h-3.5 w-3.5" />,
    };

    /* ── reusable field builders ── */
    const numInput = (
        field: keyof typeof data,
        label: string,
        min: number,
        max: number,
        step: number = 1
    ) => (
        <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">{label}</label>
            <input
                type="number"
                min={min}
                max={max}
                step={step}
                value={data[field] as number}
                onChange={(e) => setData(field, parseFloat(e.target.value))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
        </div>
    );

    const toggle = (field: keyof typeof data, label: string) => (
        <div className="flex items-center justify-between py-1">
            <label className="text-sm font-medium text-foreground">{label}</label>
            <button
                type="button"
                onClick={() => setData(field, !data[field])}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    data[field] ? "bg-[var(--brand-primary)]" : "bg-muted-foreground/30"
                }`}
            >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    data[field] ? "translate-x-6" : "translate-x-1"
                }`} />
            </button>
        </div>
    );

    const modelOptions = aiForm.data.provider === 'anthropic' ? ANTHROPIC_MODELS
        : aiForm.data.provider === 'openai' ? OPENAI_MODELS
        : [];

    return (
        <SettingsLayout title={t("genetic_algorithm.settings_title")}>
            <SettingsShell
                title={t("genetic_algorithm.settings_title")}
                description={t("genetic_algorithm.settings_description")}
                headerAction={
                    <div className="p-2.5 rounded-xl bg-violet-100 dark:bg-violet-900/40">
                        <Brain className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                    </div>
                }
            >

                {/* ── AI Provider Configuration ── */}
                <SettingsSection
                    title={t("genetic_algorithm.ai_provider") || "AI Provider (LLM)"}
                    description={t("genetic_algorithm.ai_provider_desc") || "Configure an OpenAI or Anthropic API key to enable natural-language shipment analysis and operational insights. Without a key the system uses built-in rule-based analysis."}
                    fullWidth
                >
                    <form onSubmit={handleAiSave} className="space-y-5">
                        {/* Status badge */}
                        <div className="flex items-center gap-3">
                            {ai_config.configured ? (
                                <Badge variant="default" className="gap-1.5 bg-green-600 text-white">
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    {t("genetic_algorithm.ai_status_active") || "Active"} — {ai_config.provider === 'anthropic' ? 'Anthropic (Claude)' : 'OpenAI (GPT)'}
                                </Badge>
                            ) : (
                                <Badge variant="secondary" className="gap-1.5">
                                    <XCircle className="h-3.5 w-3.5" />
                                    {t("genetic_algorithm.ai_status_inactive") || "Not configured — using rule-based analysis"}
                                </Badge>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Provider */}
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-foreground">
                                    {t("genetic_algorithm.ai_provider_label") || "Provider"}
                                </label>
                                <select
                                    value={aiForm.data.provider}
                                    onChange={(e) => {
                                        aiForm.setData('provider', e.target.value);
                                        aiForm.setData('model', '');
                                    }}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <option value="">{t("genetic_algorithm.ai_no_provider") || "— None (rule-based only) —"}</option>
                                    <option value="openai">OpenAI (GPT-4o)</option>
                                    <option value="anthropic">Anthropic (Claude)</option>
                                </select>
                            </div>

                            {/* Model */}
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-foreground">
                                    {t("genetic_algorithm.ai_model") || "Model"}
                                </label>
                                {modelOptions.length > 0 ? (
                                    <select
                                        value={aiForm.data.model}
                                        onChange={(e) => aiForm.setData('model', e.target.value)}
                                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        <option value="">— Select model —</option>
                                        {modelOptions.map((m) => (
                                            <option key={m.value} value={m.value}>{m.label}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        value={aiForm.data.model}
                                        onChange={(e) => aiForm.setData('model', e.target.value)}
                                        placeholder="Select a provider first"
                                        disabled={!aiForm.data.provider}
                                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm disabled:opacity-50"
                                    />
                                )}
                            </div>

                            {/* API Key */}
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-foreground">
                                    <KeyRound className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                                    {t("genetic_algorithm.ai_api_key") || "API Key"}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showKey ? 'text' : 'password'}
                                        value={aiForm.data.api_key}
                                        onChange={(e) => aiForm.setData('api_key', e.target.value)}
                                        placeholder={keyIsSet
                                            ? (t("genetic_algorithm.ai_key_set") || "Key saved — enter new key to replace")
                                            : (t("genetic_algorithm.ai_key_placeholder") || "sk-... or ant-...")}
                                        className="w-full rounded-md border border-input bg-background pl-3 pr-9 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowKey((v) => !v)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        tabIndex={-1}
                                    >
                                        {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                {keyIsSet && !aiForm.data.api_key && (
                                    <p className="text-xs text-green-600 flex items-center gap-1">
                                        <CheckCircle className="h-3 w-3" />
                                        {t("genetic_algorithm.ai_key_stored") || "Key is securely stored (encrypted). Leave blank to keep it."}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Info box: what the AI does */}
                        <div className="rounded-lg bg-violet-50 border border-violet-100 p-3 text-xs text-violet-800 space-y-1">
                            <p className="font-semibold flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5" />{t("genetic_algorithm.ai_what_it_does") || "What the AI does in MasarX"}</p>
                            <ul className="list-disc list-inside space-y-0.5 pl-1">
                                <li>{t("genetic_algorithm.ai_feature_shipment") || "Shipment risk analysis: delays, exceptions, pending payments"}</li>
                                <li>{t("genetic_algorithm.ai_feature_ops") || "Operational dashboard: natural-language summary of your fleet status"}</li>
                                <li>{t("genetic_algorithm.ai_feature_fallback") || "Without an API key: built-in rule-based logic runs automatically"}</li>
                            </ul>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button
                                type="submit"
                                disabled={aiForm.processing}
                                className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
                            >
                                {aiForm.processing
                                    ? <><RefreshCw className="h-4 w-4 animate-spin" />{t("genetic_algorithm.saving") || "Saving…"}</>
                                    : <><Save className="h-4 w-4" />{t("genetic_algorithm.save_ai") || "Save AI Settings"}</>
                                }
                            </Button>

                            {ai_config.configured && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="gap-2"
                                    onClick={handleTestConnection}
                                    disabled={testStatus === 'loading'}
                                >
                                    {testStatus === 'loading'
                                        ? <><Loader2 className="h-4 w-4 animate-spin" />Testing…</>
                                        : <><Zap className="h-4 w-4" />{t("genetic_algorithm.test_connection") || "Test Connection"}</>
                                    }
                                </Button>
                            )}

                            {testStatus === 'ok' && (
                                <span className="flex items-center gap-1 text-sm text-green-600">
                                    <CheckCircle className="h-4 w-4" />{testMsg}
                                </span>
                            )}
                            {testStatus === 'error' && (
                                <span className="flex items-center gap-1 text-sm text-red-600">
                                    <XCircle className="h-4 w-4" />{testMsg}
                                </span>
                            )}
                        </div>
                    </form>
                </SettingsSection>

                {/* ── GA Algorithm Config ─────────────────────────────── */}
                <form onSubmit={handleGaSave} className="space-y-0">

                    {/* ── Route Optimizer ── */}
                    <SettingsSection
                        title={t("genetic_algorithm.route_optimizer")}
                        description={t("genetic_algorithm.route_optimizer_desc")}
                        fullWidth
                    >
                        <div className="space-y-4">
                            {toggle("route_enabled", t("genetic_algorithm.enabled"))}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {numInput("route_population_size", t("genetic_algorithm.population_size"), 10, 500)}
                                {numInput("route_generations",     t("genetic_algorithm.generations"),     10, 1000)}
                                {numInput("route_elite_count",     t("genetic_algorithm.elite_count"),     1, 10)}
                                {numInput("route_tournament_k",    t("genetic_algorithm.tournament_k"),    2, 10)}
                                {numInput("route_mutation_rate",   t("genetic_algorithm.mutation_rate"),   0.001, 0.5, 0.001)}
                                {numInput("route_crossover_rate",  t("genetic_algorithm.crossover_rate"),  0.1, 1.0, 0.01)}
                            </div>
                        </div>
                    </SettingsSection>

                    {/* ── Carrier Selector ── */}
                    <SettingsSection
                        title={t("genetic_algorithm.carrier_selector")}
                        description={t("genetic_algorithm.carrier_selector_desc")}
                        fullWidth
                    >
                        <div className="space-y-4">
                            {toggle("carrier_enabled", t("genetic_algorithm.enabled"))}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {numInput("carrier_population_size",    t("genetic_algorithm.population_size"),     10, 200)}
                                {numInput("carrier_generations",        t("genetic_algorithm.generations"),         10, 500)}
                                {numInput("carrier_mutation_rate",      t("genetic_algorithm.mutation_rate"),       0.001, 0.5, 0.001)}
                                {numInput("carrier_cost_weight",        t("genetic_algorithm.cost_weight"),         0, 1, 0.05)}
                                {numInput("carrier_time_weight",        t("genetic_algorithm.time_weight"),         0, 1, 0.05)}
                                {numInput("carrier_reliability_weight", t("genetic_algorithm.reliability_weight"), 0, 1, 0.05)}
                            </div>
                            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Info className="h-3.5 w-3.5 flex-shrink-0" />
                                {t("genetic_algorithm.weights_note")}
                            </p>
                        </div>
                    </SettingsSection>

                    {/* ── Insights Engine ── */}
                    <SettingsSection
                        title={t("genetic_algorithm.insights_engine")}
                        description={t("genetic_algorithm.insights_engine_desc")}
                        fullWidth
                    >
                        <div className="space-y-4">
                            {toggle("insights_enabled", t("genetic_algorithm.enabled"))}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {numInput("insights_cache_minutes",         t("genetic_algorithm.cache_minutes"),         1, 1440)}
                                {numInput("insights_history_days",          t("genetic_algorithm.history_days"),          7, 365)}
                                {numInput("insights_delay_threshold_hours", t("genetic_algorithm.delay_threshold_hours"), 0.5, 48, 0.5)}
                            </div>
                        </div>
                    </SettingsSection>

                    {/* ── Load Balancer ── */}
                    <SettingsSection
                        title={t("genetic_algorithm.load_balancer")}
                        description={t("genetic_algorithm.load_balancer_desc")}
                        fullWidth
                    >
                        <div className="space-y-4">
                            {toggle("lb_enabled", t("genetic_algorithm.enabled"))}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {numInput("lb_population_size", t("genetic_algorithm.population_size"), 10, 200)}
                                {numInput("lb_generations",     t("genetic_algorithm.generations"),     10, 500)}
                                {numInput("lb_mutation_rate",   t("genetic_algorithm.mutation_rate"),   0.001, 0.5, 0.001)}
                            </div>
                        </div>
                    </SettingsSection>

                    {/* ── Save GA Button ── */}
                    <div className="flex justify-end pt-4 border-t border-border/60">
                        <button
                            type="submit"
                            disabled={processing}
                            className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60 transition-opacity"
                        >
                            {processing
                                ? <><RefreshCw className="h-4 w-4 animate-spin" />{t("genetic_algorithm.saving")}</>
                                : <><Save className="h-4 w-4" />{t("genetic_algorithm.save_changes")}</>
                            }
                        </button>
                    </div>
                </form>

                {/* ── Run History ── */}
                <div className="mt-8 space-y-3">
                    <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold text-foreground">{t("genetic_algorithm.run_history")}</h3>
                        <span className="ml-auto text-xs text-muted-foreground">{t("genetic_algorithm.run_history_last10") || "Last 10 runs"}</span>
                    </div>
                    {run_history.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                            <Zap className="h-6 w-6 mx-auto mb-2 text-muted-foreground/40" />
                            <p>{t("genetic_algorithm.no_run_history") || "No runs yet. GA algorithms execute automatically when dispatch optimizes routes, assigns carriers, or balances workload."}</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {run_history.map((log) => (
                                <div
                                    key={log.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-muted/40 text-sm border border-border/40"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">{TYPE_ICONS[log.type] ?? <Zap className="h-3.5 w-3.5" />}</span>
                                        <span className="font-medium">{TYPE_LABELS[log.type] ?? log.type}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        {log.fitness_score != null && (
                                            <span>{t("genetic_algorithm.fitness")}: <span className="font-mono">{log.fitness_score.toFixed(4)}</span></span>
                                        )}
                                        {log.generation_count != null && (
                                            <span>{log.generation_count} gen</span>
                                        )}
                                        {log.execution_time_ms != null && (
                                            <span className="font-mono">{log.execution_time_ms}ms</span>
                                        )}
                                        <Badge
                                            variant={log.status === "completed" ? "default" : log.status === "partial" ? "secondary" : "destructive"}
                                            className="text-[10px]"
                                        >
                                            {log.status}
                                        </Badge>
                                        <span>{new Date(log.created_at).toLocaleString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </SettingsShell>
        </SettingsLayout>
    );
}
