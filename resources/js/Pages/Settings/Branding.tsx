import React, { useState, useEffect, useRef } from 'react';
import SettingsLayout from '@/Layouts/SettingsLayout';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { Input } from "@/Components/UI/input";
import { Button } from "@/Components/UI/button";
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { SettingsShell } from './_components/SettingsShell';
import { SettingsSection } from './_components/SettingsSection';
import { SettingsField } from './_components/SettingsField';
import { SettingsSaveBar } from './_components/SettingsSaveBar';
import { Switch } from "@/Components/UI/switch";
import { Label } from "@/Components/UI/label";
import { useTranslation } from '@/hooks/useTranslation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/Components/UI/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/UI/select";
import { ZoomIn, RotateCcw, Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Branding({ branding }: { branding: any }) {
    const { t } = useTranslation();

    // Fallback if branding prop is missing or structure is different
    const initialData = branding || {};

    const [formState, setFormState] = useState<Record<string, any>>({
        site_name: initialData.app_name || 'Deprixa Plus',
        primary_color: initialData.primary_color || '#4F46E5',
        secondary_color: initialData.secondary_color || '#10B981',
        accent_color: initialData.accent_color || '#F59E0B',
        ui_theme: initialData.ui_theme || 'system',
        sidebar_compact: initialData.sidebar_compact || false,

        // Fuentes
        primary_font: initialData.primary_font || 'Inter',
        secondary_font: initialData.secondary_font || 'Inter',
        base_font_size: initialData.base_font_size || '16px',

        // Layout & Cards
        layout_density: initialData.layout_density || 'normal',
        card_skin: initialData.card_skin || 'shadow',
        layout_background: initialData.layout_background || 'oklch(98.5% 0.002 247.839)',
        sidebar_menu_order: initialData.sidebar_menu_order || null,

        // Notificaciones
        notification_style: initialData.notification_style || 'toast',
        notification_group_style: initialData.notification_group_style || 'stacked',
        notification_max_count: initialData.notification_max_count ?? 4,
        notification_position: initialData.notification_position || 'top-right',
        notification_duration: initialData.notification_duration || 5000,
        monochrome_mode: initialData.monochrome_mode ?? false,

        // Login
        login_welcome_text: initialData.login_welcome_text || '',
        login_form_position: initialData.login_form_position || 'right',
        login_visible_fields: initialData.login_visible_fields || ['email', 'password', 'remember'],

        // File objects
        logo: null as File | null,
        sublogo: null as File | null,
        favicon: null as File | null,
        login_logo: null as File | null,
        login_image: null as File | null,
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    const data = formState;
    const setData = (key: string, value: any) => setFormState(prev => ({ ...prev, [key]: value }));
    const errors = formErrors;
    const isDirty = true;

    const [previews, setPreviews] = useState({
        logo: initialData.logo_url,
        sublogo: initialData.sublogo_url,
        favicon: initialData.favicon_url,
        login_logo: initialData.login_logo_url,
        login_image: initialData.login_image_url,
    });
    
    const [previewDialog, setPreviewDialog] = useState<{ open: boolean; image: string | null; field: string | null }>({
        open: false,
        image: null,
        field: null,
    });
    
    const [colorPreview, setColorPreview] = useState(false);

    const alert = useSweetAlert();
    const objectUrlsRef = useRef<Record<string, string>>({});

    // Validación de archivos en frontend
    const validateFile = (file: File, field: 'logo' | 'sublogo' | 'favicon' | 'login_logo' | 'login_image'): string | null => {
        const maxSizes: Record<string, number> = {
            logo: 2 * 1024 * 1024, // 2MB
            sublogo: 2 * 1024 * 1024, // 2MB
            favicon: 1024 * 1024, // 1MB
            login_logo: 2 * 1024 * 1024, // 2MB
            login_image: 4 * 1024 * 1024, // 4MB
        };

        const allowedTypes: Record<string, string[]> = {
            logo: ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/svg+xml', 'image/webp'],
            sublogo: ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/svg+xml', 'image/webp'],
            favicon: ['image/x-icon', 'image/vnd.microsoft.icon', 'image/png'],
            login_logo: ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/svg+xml', 'image/webp'],
            login_image: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
        };

        if (file.size > maxSizes[field]) {
            const maxMB = maxSizes[field] / (1024 * 1024);
            return t('settings.branding.file_too_large', { max: maxMB });
        }

        if (!allowedTypes[field].includes(file.type)) {
            return t('settings.branding.invalid_file_type');
        }

        return null;
    };

    const handleFileChange = async (field: 'logo' | 'sublogo' | 'favicon' | 'login_logo' | 'login_image', file: File | null) => {
        if (file) {
            const error = await validateFile(file, field);
            if (error) {
                // Si es solo una advertencia de dimensiones, mostrar pero continuar
                if (error.includes('dimensions_warning')) {
                    const proceed = window.confirm(error + '\n\n' + t('settings.branding.continue_anyway'));
                    if (!proceed) return;
                } else {
                    alert.error(error);
                    return;
                }
            }

            // Limpiar URL anterior si existe
            if (objectUrlsRef.current[field]) {
                URL.revokeObjectURL(objectUrlsRef.current[field]);
            }

            const objectUrl = URL.createObjectURL(file);
            objectUrlsRef.current[field] = objectUrl;
            setPreviews(prev => ({ ...prev, [field]: objectUrl }));
            setData(field, file);
        } else {
            setData(field, null);
        }
    };

    // Limpiar object URLs al desmontar o cambiar previews
    useEffect(() => {
        return () => {
            Object.values(objectUrlsRef.current).forEach(url => {
                if (url && url.startsWith('blob:')) {
                    URL.revokeObjectURL(url);
                }
            });
        };
    }, []);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormErrors({});
        setProcessing(true);
        try {
            const fd = new FormData();
            // Append all non-file fields
            const fileFields = ['logo', 'sublogo', 'favicon', 'login_logo', 'login_image'];
            Object.entries(formState).forEach(([key, value]) => {
                if (fileFields.includes(key)) {
                    if (value instanceof File) fd.append(key, value);
                } else if (Array.isArray(value)) {
                    value.forEach((v: any) => fd.append(`${key}[]`, v));
                } else if (typeof value === 'boolean') {
                    fd.append(key, value ? '1' : '0');
                } else if (value !== null && value !== undefined) {
                    fd.append(key, String(value));
                }
            });
            const { data: res } = await axios.post(route('settings.branding.update'), fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            alert.success(res?.message || t('settings.save_success'));
            // Full reload so shared branding props update and template applies all changes
            router.reload();
        } catch (err: any) {
            const errs = err?.response?.data?.errors;
            if (errs) {
                const mapped: Record<string, string> = {};
                Object.entries(errs).forEach(([k, v]: any) => { mapped[k] = Array.isArray(v) ? v[0] : v; });
                setFormErrors(mapped);
                alert.error(Object.values(mapped).join(' '));
            } else {
                alert.error(err?.response?.data?.error || t('settings.branding.save_error'));
            }
        } finally {
            setProcessing(false);
        }
    };

    const openPreviewDialog = (image: string, field: string) => {
        setPreviewDialog({ open: true, image, field });
    };

    const handleRestoreDefault = (field: 'logo' | 'sublogo' | 'favicon' | 'login_logo' | 'login_image') => {
        setData(field, null);
        const url = field === 'logo' ? initialData.logo_url : field === 'sublogo' ? initialData.sublogo_url : field === 'favicon' ? initialData.favicon_url : field === 'login_logo' ? initialData.login_logo_url : initialData.login_image_url;
        setPreviews(prev => ({ ...prev, [field]: url ?? null }));
        if (objectUrlsRef.current[field]) {
            URL.revokeObjectURL(objectUrlsRef.current[field]);
            objectUrlsRef.current[field] = '';
        }
    };

    const cardClass = data.card_skin === 'bordered'
        ? "rounded-xl border-2 border-border bg-card p-5 w-full"
        : "rounded-xl border border-border bg-card p-5 shadow-sm w-full";

    return (
        <SettingsLayout title={t('settings.menu.branding')}>
            <SettingsShell
                description={t('settings.branding.desc')}
                className="max-w-6xl"
            >
                <form onSubmit={submit} className="space-y-8">

                    {/* ——— Theme & Appearance (estilo apa) ——— */}
                    <SettingsSection
                        fullWidth
                        title={t('settings.branding.ui_theme')}
                        description={t('settings.branding.ui_theme_desc') || "Customize the appearance of the app. Select theme and mode."}
                    >
                        <div className="space-y-6">
                            {/* Theme: tarjetas visuales System / Light / Dark */}
                            <div>
                                <p className="text-sm font-medium text-foreground mb-3">{t('settings.branding.theme') || "Theme"}</p>
                                <p className="text-sm text-muted-foreground mb-4">{t('settings.branding.theme_desc') || "Choose how the app looks."}</p>
                                <div className="grid grid-cols-3 gap-4">
                                    {(['system', 'light', 'dark'] as const).map((theme) => (
                                        <button
                                            key={theme}
                                            type="button"
                                            onClick={() => setData('ui_theme', theme)}
                                            className={cn(
                                                "relative flex flex-col rounded-xl border-2 bg-card p-4 text-left transition-all hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
                                                data.ui_theme === theme ? "border-primary ring-2 ring-primary/20 shadow-sm" : "border-border"
                                            )}
                                        >
                                            <div className="flex items-center gap-2 mb-3">
                                                {theme === 'system' && <Monitor className="h-5 w-5 text-muted-foreground" />}
                                                {theme === 'light' && <Sun className="h-5 w-5 text-muted-foreground" />}
                                                {theme === 'dark' && <Moon className="h-5 w-5 text-muted-foreground" />}
                                                <span className="text-sm font-medium capitalize">{theme === 'system' ? t('settings.branding.theme_system') || 'System' : theme === 'light' ? t('settings.branding.theme_light') || 'Light' : t('settings.branding.theme_dark') || 'Dark'}</span>
                                            </div>
                                            <div className={cn(
                                                "h-12 rounded-lg overflow-hidden flex",
                                                theme === 'system' && "bg-gradient-to-br from-background to-muted",
                                                theme === 'light' && "bg-background border border-border",
                                                theme === 'dark' && "bg-zinc-800 border border-zinc-700"
                                            )}>
                                                {theme === 'system' && (
                                                    <>
                                                        <div className="flex-1 bg-background border-r border-border" />
                                                        <div className="flex-1 bg-zinc-800" />
                                                    </>
                                                )}
                                                {theme === 'light' && (
                                                    <div className="flex-1 flex flex-col justify-center gap-1 px-2">
                                                        <div className="h-1 w-full bg-muted-foreground/20 rounded" />
                                                        <div className="h-1 w-4/5 bg-muted-foreground/15 rounded" />
                                                        <div className="h-1 w-3/5 bg-muted-foreground/10 rounded" />
                                                    </div>
                                                )}
                                                {theme === 'dark' && (
                                                    <div className="flex-1 flex flex-col justify-center gap-1 px-2">
                                                        <div className="h-1 w-full bg-zinc-500/40 rounded" />
                                                        <div className="h-1 w-4/5 bg-zinc-500/30 rounded" />
                                                        <div className="h-1 w-3/5 bg-zinc-500/20 rounded" />
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Primary Color: swatches + custom (estilo apa) */}
                            <div className={cardClass}>
                                <p className="text-sm font-medium text-foreground mb-1">{t('settings.branding.primary_color')}</p>
                                <p className="text-sm text-muted-foreground mb-4">{t('settings.branding.primary_color_desc') || "Choose a color that will be used as the primary color for your theme."}</p>
                                <div className="flex flex-wrap gap-3 mb-4">
                                    {['#4F46E5', '#2563eb', '#10B981', '#F59E0B', '#ef4444', '#ec4899'].map((hex) => (
                                        <button
                                            key={hex}
                                            type="button"
                                            onClick={() => setData('primary_color', hex)}
                                            className={cn(
                                                "w-10 h-10 rounded-lg border-2 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/30",
                                                data.primary_color === hex ? "border-primary ring-2 ring-primary/30 scale-105" : "border-border"
                                            )}
                                            style={{ backgroundColor: hex }}
                                            aria-label={hex}
                                        />
                                    ))}
                                </div>
                                <div className="flex items-center gap-3">
                                    <Input type="color" value={data.primary_color} onChange={e => setData('primary_color', e.target.value)} className="w-12 h-12 p-1 cursor-pointer rounded-lg border border-border" />
                                    <Input value={data.primary_color} onChange={e => setData('primary_color', e.target.value)} className="font-mono text-sm uppercase flex-1 h-10 rounded-lg border border-input" placeholder="#4F46E5" />
                                </div>
                                {errors.primary_color && <p className="text-sm text-destructive mt-1">{errors.primary_color}</p>}
                            </div>

                            {/* Secondary & Accent + Color Preview */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                                <div className={cardClass}>
                                    <SettingsField id="secondary_color" label={t('settings.branding.secondary_color')} error={errors.secondary_color}>
                                        <div className="flex items-center gap-3 mt-2">
                                            <Input type="color" value={data.secondary_color} onChange={e => setData('secondary_color', e.target.value)} className="w-11 h-11 p-1 cursor-pointer rounded-lg border border-border" />
                                            <Input value={data.secondary_color} onChange={e => setData('secondary_color', e.target.value)} className="font-mono text-sm uppercase flex-1 h-10 rounded-lg border border-input" placeholder="#10B981" />
                                        </div>
                                    </SettingsField>
                                </div>
                                <div className={cardClass}>
                                    <SettingsField id="accent_color" label={t('settings.branding.accent_color')} error={errors.accent_color}>
                                        <div className="flex items-center gap-3 mt-2">
                                            <Input type="color" value={data.accent_color} onChange={e => setData('accent_color', e.target.value)} className="w-11 h-11 p-1 cursor-pointer rounded-lg border border-border" />
                                            <Input value={data.accent_color} onChange={e => setData('accent_color', e.target.value)} className="font-mono text-sm uppercase flex-1 h-10 rounded-lg border border-input" placeholder="#F59E0B" />
                                        </div>
                                    </SettingsField>
                                </div>
                            </div>
                            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-5">
                                <Label className="text-sm font-medium text-foreground mb-3 block">{t('settings.branding.color_preview')}</Label>
                                <div className="flex flex-wrap gap-3">
                                    <div className="flex-1 min-w-[100px] h-12 rounded-lg flex items-center justify-center text-white text-sm font-medium shadow-sm" style={{ backgroundColor: data.primary_color }}>Primary</div>
                                    <div className="flex-1 min-w-[100px] h-12 rounded-lg flex items-center justify-center text-white text-sm font-medium shadow-sm" style={{ backgroundColor: data.secondary_color }}>Secondary</div>
                                    <div className="flex-1 min-w-[100px] h-12 rounded-lg flex items-center justify-center text-white text-sm font-medium shadow-sm" style={{ backgroundColor: data.accent_color }}>Accent</div>
                                </div>
                            </div>
                        </div>
                    </SettingsSection>

                    {/* Logos & Assets — estilo apa */}
                    <SettingsSection
                        title={t('settings.branding.assets_title')}
                        description={t('settings.branding.assets_desc')}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                            <div className={cardClass}>
                                <SettingsField
                                    id="logo"
                                    label={t('settings.branding.logo')}
                                    error={errors.logo}
                                    help="Visible on Sidebar. Rec: 200x50px PNG"
                                >
                                    <div className="flex flex-col gap-3">
                                        <div className="h-24 flex items-center justify-center bg-muted/30 border border-dashed border-muted-foreground/25 rounded-md overflow-hidden relative group">
                                            {previews.logo ? (
                                                <>
                                                    <img src={previews.logo} alt="Logo Preview" className="h-16 object-contain" />
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            size="sm"
                                                            onClick={() => openPreviewDialog(previews.logo!, 'logo')}
                                                            className="h-8"
                                                        >
                                                            <ZoomIn className="w-4 h-4 mr-1" />
                                                            {t('settings.branding.preview')}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => handleRestoreDefault('logo')}
                                                            className="h-8"
                                                        >
                                                            <RotateCcw className="w-4 h-4 mr-1" />
                                                            {t('settings.branding.restore')}
                                                        </Button>
                                                    </div>
                                                </>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">No image</span>
                                            )}
                                        </div>
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={e => e.target.files && handleFileChange('logo', e.target.files[0])}
                                            className="text-xs"
                                        />
                                    </div>
                                </SettingsField>
                            </div>
                            <div className={cardClass}>
                                <SettingsField
                                    id="sublogo"
                                    label={t('settings.branding.sublogo')}
                                    error={errors.sublogo}
                                    help={t('settings.branding.sublogo_help')}
                                >
                                    <div className="flex flex-col gap-3">
                                        <div className="h-24 flex items-center justify-center bg-muted/30 border border-dashed border-muted-foreground/25 rounded-md overflow-hidden relative group">
                                            {previews.sublogo ? (
                                                <>
                                                    <img src={previews.sublogo} alt="Sublogo Preview" className="h-16 object-contain" />
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            size="sm"
                                                            onClick={() => openPreviewDialog(previews.sublogo!, 'sublogo')}
                                                            className="h-8"
                                                        >
                                                            <ZoomIn className="w-4 h-4 mr-1" />
                                                            {t('settings.branding.preview')}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => handleRestoreDefault('sublogo')}
                                                            className="h-8"
                                                        >
                                                            <RotateCcw className="w-4 h-4 mr-1" />
                                                            {t('settings.branding.restore')}
                                                        </Button>
                                                    </div>
                                                </>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">No image</span>
                                            )}
                                        </div>
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={e => e.target.files && handleFileChange('sublogo', e.target.files[0])}
                                            className="text-xs"
                                        />
                                    </div>
                                </SettingsField>
                            </div>
                            <div className={cardClass}>
                                <SettingsField
                                    id="login_logo"
                                    label={t('settings.branding.login_logo')}
                                    error={errors.login_logo}
                                    help={t('settings.branding.login_logo_help')}
                                >
                                    <div className="flex flex-col gap-3">
                                        <div className="h-24 flex items-center justify-center bg-muted/30 border border-dashed border-muted-foreground/25 rounded-md overflow-hidden relative group">
                                            {previews.login_logo ? (
                                                <>
                                                    <img src={previews.login_logo} alt="Login Logo Preview" className="h-16 object-contain" />
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            size="sm"
                                                            onClick={() => openPreviewDialog(previews.login_logo!, 'login_logo')}
                                                            className="h-8"
                                                        >
                                                            <ZoomIn className="w-4 h-4 mr-1" />
                                                            {t('settings.branding.preview')}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => handleRestoreDefault('login_logo')}
                                                            className="h-8"
                                                        >
                                                            <RotateCcw className="w-4 h-4 mr-1" />
                                                            {t('settings.branding.restore')}
                                                        </Button>
                                                    </div>
                                                </>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">No image</span>
                                            )}
                                        </div>
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={e => e.target.files && handleFileChange('login_logo', e.target.files[0])}
                                            className="text-xs"
                                        />
                                    </div>
                                </SettingsField>
                            </div>
                        </div>

                        {/* Fila 2: Favicon y Login Background */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                            {/* Favicon */}
                            <div className="border border-border rounded-lg p-4 bg-card">
                                <SettingsField
                                    id="favicon"
                                    label={t('settings.branding.favicon')}
                                    error={errors.favicon}
                                    help="Tab Icon. Rec: 32x32px .ico or .png"
                                >
                                    <div className="flex flex-col gap-3">
                                        <div className="h-16 flex items-center justify-center bg-muted/30 border border-dashed border-muted-foreground/25 rounded-md overflow-hidden">
                                            {previews.favicon ? (
                                                <img src={previews.favicon} alt="Favicon Preview" className="h-8 w-8 object-contain" />
                                            ) : (
                                                <span className="text-xs text-muted-foreground">No image</span>
                                            )}
                                        </div>
                                        <Input
                                            type="file"
                                            accept=".ico,.png"
                                            onChange={e => e.target.files && handleFileChange('favicon', e.target.files[0])}
                                            className="text-xs"
                                        />
                                    </div>
                                </SettingsField>
                            </div>
                            <div className={cardClass}>
                                <SettingsField
                                    id="login_image"
                                    label={t('settings.branding.login_image')}
                                    error={errors.login_image}
                                    help={t('settings.branding.login_image_help')}
                                >
                                    <div className="flex flex-col gap-3">
                                        <div className="h-24 flex items-center justify-center bg-muted/30 border border-dashed border-muted-foreground/25 rounded-md overflow-hidden relative group">
                                            {previews.login_image ? (
                                                <>
                                                    <img src={previews.login_image} alt="Login Banner Preview" className="w-full h-full object-cover opacity-80" />
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            size="sm"
                                                            onClick={() => openPreviewDialog(previews.login_image!, 'login_image')}
                                                            className="h-8"
                                                        >
                                                            <ZoomIn className="w-4 h-4 mr-1" />
                                                            {t('settings.branding.preview')}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => handleRestoreDefault('login_image')}
                                                            className="h-8"
                                                        >
                                                            <RotateCcw className="w-4 h-4 mr-1" />
                                                            {t('settings.branding.restore')}
                                                        </Button>
                                                    </div>
                                                </>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">No image</span>
                                            )}
                                        </div>
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={e => e.target.files && handleFileChange('login_image', e.target.files[0])}
                                            className="text-xs"
                                        />
                                    </div>
                                </SettingsField>
                            </div>
                        </div>
                    </SettingsSection>

                    {/* Behavior — Card Skin + Layout background + Compact */}
                    <SettingsSection
                        fullWidth
                        title={t('settings.branding.behavior_title')}
                        description={t('settings.branding.behavior_desc')}
                    >
                        <div className="space-y-4 w-full">
                            <div className={cn(cardClass, "flex items-center justify-between flex-wrap gap-4")}>
                                <div>
                                    <p className="font-medium text-foreground text-sm">{t('settings.branding.sidebar_compact')}</p>
                                    <p className="text-sm text-muted-foreground">{t('settings.branding.sidebar_compact_desc')}</p>
                                </div>
                                <Switch
                                    checked={data.sidebar_compact}
                                    onCheckedChange={(checked) => setData('sidebar_compact', checked)}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                                <div className={cardClass}>
                                    <p className="text-sm font-medium text-foreground mb-1">Card Skin</p>
                                    <p className="text-xs text-muted-foreground mb-3">Style of cards across the app.</p>
                                    <Select value={data.card_skin} onValueChange={(v) => setData('card_skin', v)}>
                                        <SelectTrigger className="h-11 w-full border border-input rounded-lg" aria-label="Card Skin">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="shadow">Shadow</SelectItem>
                                            <SelectItem value="bordered">Bordered</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className={cardClass}>
                                    <p className="text-sm font-medium text-foreground mb-1">{t('settings.branding.layout_background')}</p>
                                    <p className="text-xs text-muted-foreground mb-3">{t('settings.branding.layout_background_desc')}</p>
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-12 h-12 rounded-lg border border-border shrink-0"
                                            style={{ backgroundColor: data.layout_background }}
                                            title={data.layout_background}
                                        />
                                        <Input
                                            value={data.layout_background}
                                            onChange={e => setData('layout_background', e.target.value)}
                                            placeholder="oklch(98.5% 0.002 247.839)"
                                            className="font-mono text-sm flex-1 rounded-lg border border-input"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setData('layout_background', 'oklch(98.5% 0.002 247.839)')}
                                        className="mt-2 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <span
                                            className="inline-block w-3 h-3 rounded-sm border border-border shrink-0 bg-[oklch(98.5%_0.002_247.839)]"
                                        />
                                        {t('settings.branding.recommended')}: oklch(98.5% 0.002 247.839)
                                    </button>
                                </div>
                            </div>
                        </div>
                    </SettingsSection>

                    {/* Typography — estilo apa */}
                    <SettingsSection
                        fullWidth
                        title={t('settings.branding.fonts_title')}
                        description={t('settings.branding.fonts_desc')}
                    >
                        <div className="space-y-5 w-full">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                                <div className={cardClass}>
                                    <SettingsField id="primary_font" label={t('settings.branding.primary_font')} error={errors.primary_font}>
                                        <Select value={data.primary_font} onValueChange={(v) => setData('primary_font', v)}>
                                            <SelectTrigger className="h-11 w-full border border-input bg-background rounded-lg font-medium" aria-label={t('settings.branding.primary_font')}>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Inter">Inter</SelectItem>
                                                <SelectItem value="Roboto">Roboto</SelectItem>
                                                <SelectItem value="Open Sans">Open Sans</SelectItem>
                                                <SelectItem value="Lato">Lato</SelectItem>
                                                <SelectItem value="Montserrat">Montserrat</SelectItem>
                                                <SelectItem value="Poppins">Poppins</SelectItem>
                                                <SelectItem value="Raleway">Raleway</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </SettingsField>
                                </div>
                                <div className={cardClass}>
                                    <SettingsField id="secondary_font" label={t('settings.branding.secondary_font')} error={errors.secondary_font}>
                                        <Select value={data.secondary_font} onValueChange={(v) => setData('secondary_font', v)}>
                                            <SelectTrigger className="h-11 w-full border border-input bg-background rounded-lg font-medium" aria-label={t('settings.branding.secondary_font')}>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Inter">Inter</SelectItem>
                                                <SelectItem value="Roboto">Roboto</SelectItem>
                                                <SelectItem value="Open Sans">Open Sans</SelectItem>
                                                <SelectItem value="Lato">Lato</SelectItem>
                                                <SelectItem value="Montserrat">Montserrat</SelectItem>
                                                <SelectItem value="Poppins">Poppins</SelectItem>
                                                <SelectItem value="Raleway">Raleway</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </SettingsField>
                                </div>
                            </div>
                            <div className={cardClass}>
                                <SettingsField id="base_font_size" label={t('settings.branding.base_font_size')} error={errors.base_font_size}>
                                    <Select value={data.base_font_size} onValueChange={(v) => setData('base_font_size', v)}>
                                        <SelectTrigger className="h-11 w-full max-w-sm border border-input bg-background rounded-lg font-medium" aria-label={t('settings.branding.base_font_size')}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="14px">14px (Pequeño)</SelectItem>
                                            <SelectItem value="16px">16px (Normal)</SelectItem>
                                            <SelectItem value="18px">18px (Grande)</SelectItem>
                                            <SelectItem value="20px">20px (Muy Grande)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </SettingsField>
                            </div>
                        </div>
                    </SettingsSection>

                    {/* De aquí abajo: ancho completo */}
                    <div className="w-full space-y-10">
                    {/* Layout — estilo apa */}
                    <SettingsSection
                        fullWidth
                        title={t('settings.branding.layout_title')}
                        description={t('settings.branding.layout_desc')}
                    >
                        <div className={cardClass}>
                            <SettingsField
                                id="layout_density"
                                label={t('settings.branding.layout_density')}
                                error={errors.layout_density}
                            >
                                <Select value={data.layout_density} onValueChange={(v) => setData('layout_density', v)}>
                                    <SelectTrigger className="h-11 w-full max-w-sm border border-input bg-background rounded-lg font-medium" aria-label={t('settings.branding.layout_density')}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="compact">{t('settings.branding.density_compact')}</SelectItem>
                                        <SelectItem value="normal">{t('settings.branding.density_normal')}</SelectItem>
                                        <SelectItem value="spacious">{t('settings.branding.density_spacious')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </SettingsField>
                        </div>
                    </SettingsSection>

                    {/* Notification — estilo apa: Group Style cards, Max Count, Position, Card Skin, Monochrome */}
                    <SettingsSection
                        fullWidth
                        title="Notification"
                        description="Choose Notification position and group style for your application."
                    >
                        <div className="space-y-6 w-full">
                            {/* Notification Group Style: Stacked | Expanded */}
                            <div className="w-full">
                                <p className="text-sm font-medium text-foreground mb-2">Notification Group Style</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setData('notification_group_style', 'stacked')}
                                        className={cn(
                                            "rounded-xl border-2 bg-card p-5 text-left transition-all min-h-[100px] flex flex-col justify-center",
                                            data.notification_group_style === 'stacked' ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"
                                        )}
                                    >
                                        <span className="text-sm font-medium">Stacked</span>
                                        <div className="mt-3 flex flex-col gap-1">
                                            <div className="h-6 rounded bg-muted/60 w-full max-w-[80%]" />
                                            <div className="h-6 rounded bg-muted/50 w-full max-w-[70%]" />
                                            <div className="h-6 rounded bg-muted/40 w-full max-w-[60%]" />
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setData('notification_group_style', 'expanded')}
                                        className={cn(
                                            "rounded-xl border-2 bg-card p-5 text-left transition-all min-h-[100px] flex flex-col justify-center",
                                            data.notification_group_style === 'expanded' ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"
                                        )}
                                    >
                                        <span className="text-sm font-medium">Expanded</span>
                                        <div className="mt-3 flex flex-col gap-2">
                                            <div className="h-6 rounded bg-muted/60 w-full" />
                                            <div className="h-6 rounded bg-muted/50 w-full" />
                                            <div className="h-6 rounded bg-muted/40 w-full" />
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Notification Max Count: 1–5 */}
                            <div className={cn(cardClass, "w-full")}>
                                <p className="text-sm font-medium text-foreground mb-2">Notification Max Count</p>
                                <div className="flex flex-wrap gap-2">
                                    {[1, 2, 3, 4, 5].map((n) => (
                                        <button
                                            key={n}
                                            type="button"
                                            onClick={() => setData('notification_max_count', n)}
                                            className={cn(
                                                "w-11 h-11 rounded-lg border-2 text-sm font-medium transition-all",
                                                data.notification_max_count === n
                                                    ? "border-primary bg-primary text-primary-foreground"
                                                    : "border-border bg-background hover:border-primary/50"
                                            )}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                                <div className={cardClass}>
                                    <p className="text-sm font-medium text-foreground mb-2">Notification Position</p>
                                    <Select value={data.notification_position} onValueChange={(v) => setData('notification_position', v)}>
                                        <SelectTrigger className="h-11 w-full border border-input rounded-lg" aria-label="Notification Position">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="top-right">{t('settings.branding.position_top_right')}</SelectItem>
                                            <SelectItem value="top-left">{t('settings.branding.position_top_left')}</SelectItem>
                                            <SelectItem value="bottom-right">{t('settings.branding.position_bottom_right')}</SelectItem>
                                            <SelectItem value="bottom-left">{t('settings.branding.position_bottom_left')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className={cardClass}>
                                    <p className="text-sm font-medium text-foreground mb-2">Card Skin</p>
                                    <Select value={data.card_skin} onValueChange={(v) => setData('card_skin', v)}>
                                        <SelectTrigger className="h-11 w-full border border-input rounded-lg" aria-label="Card Skin">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="shadow">Shadow</SelectItem>
                                            <SelectItem value="bordered">Bordered</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Theme Chrome Mode: Monochrome */}
                            <div className={cn(cardClass, "flex items-center justify-between flex-wrap gap-4")}>
                                <div>
                                    <p className="font-medium text-foreground text-sm">Monochrome Mode</p>
                                    <p className="text-sm text-muted-foreground">Theme chrome mode.</p>
                                </div>
                                <Switch
                                    checked={data.monochrome_mode}
                                    onCheckedChange={(checked) => setData('monochrome_mode', checked)}
                                />
                            </div>

                            <div className={cn(cardClass, "w-full")}>
                                <SettingsField
                                    id="notification_duration"
                                    label={t('settings.branding.notification_duration')}
                                    error={errors.notification_duration}
                                    help={t('settings.branding.notification_duration_help')}
                                >
                                    <Input
                                        type="number"
                                        value={data.notification_duration}
                                        onChange={e => setData('notification_duration', parseInt(e.target.value) || 5000)}
                                        min={1000}
                                        max={30000}
                                        step={500}
                                        className="h-11 w-full max-w-xs border border-input rounded-lg"
                                    />
                                </SettingsField>
                            </div>
                        </div>
                    </SettingsSection>

                    {/* Login Page — estilo apa */}
                    <SettingsSection
                        fullWidth
                        title={t('settings.branding.login_title')}
                        description={t('settings.branding.login_desc')}
                    >
                        <div className="space-y-5 w-full">
                            <div className={cardClass}>
                                <SettingsField
                                    id="login_welcome_text"
                                    label={t('settings.branding.login_welcome_text')}
                                    error={errors.login_welcome_text}
                                >
                                    <textarea
                                        value={data.login_welcome_text}
                                        onChange={e => setData('login_welcome_text', e.target.value)}
                                        rows={3}
                                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        placeholder={t('settings.branding.login_welcome_placeholder')}
                                    />
                                </SettingsField>
                            </div>
                            <div className={cardClass}>
                                <SettingsField
                                    id="login_form_position"
                                    label={t('settings.branding.login_form_position')}
                                    error={errors.login_form_position}
                                >
                                    <Select value={data.login_form_position} onValueChange={(v) => setData('login_form_position', v)}>
                                        <SelectTrigger className="h-11 w-full max-w-sm border border-input bg-background rounded-lg font-medium" aria-label={t('settings.branding.login_form_position')}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="left">{t('settings.branding.position_left')}</SelectItem>
                                            <SelectItem value="right">{t('settings.branding.position_right')}</SelectItem>
                                            <SelectItem value="center">{t('settings.branding.position_center')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </SettingsField>
                            </div>
                        </div>
                    </SettingsSection>

                    </div>

                    {/* Preview Dialog */}
                    <Dialog open={previewDialog.open} onOpenChange={(open) => setPreviewDialog({ ...previewDialog, open })}>
                        <DialogContent className="max-w-4xl">
                            <DialogHeader>
                                <DialogTitle>{t('settings.branding.preview')} - {previewDialog.field}</DialogTitle>
                            </DialogHeader>
                            {previewDialog.image && (
                                <div className="flex items-center justify-center p-4">
                                    <img src={previewDialog.image} alt="Preview" className="max-w-full max-h-[70vh] object-contain" />
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>

                    <SettingsSaveBar
                        processing={processing}
                        isDirty={isDirty}
                    />
                </form>
            </SettingsShell>
        </SettingsLayout>
    );
}
