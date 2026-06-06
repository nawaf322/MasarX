import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
// Lazy load ReactQuillNew to avoid SSR/Runtime issues with React 19
const ReactQuill = React.lazy(() => import('react-quill-new'));
import 'react-quill-new/dist/quill.snow.css';
import { Button } from "@/Components/UI/button";
import { Label } from "@/Components/UI/label";
import { useTranslation } from 'react-i18next';
import { Tabs, TabsList, TabsTrigger } from "@/Components/UI/tabs";

interface NotificationsEditorProps {
    event: string;
    channel: string;
    templates: any[]; // Pass all templates to allow filtering by language
    onSave: (content: string, subject: string, language: string, designType: string | null) => void;
    branding: any;
}

export const NotificationsEditor = ({ event, channel, templates, onSave, branding }: NotificationsEditorProps) => {
    const { t } = useTranslation();
    const [language, setLanguage] = useState('en');

    // Find template for current config
    const getCurrentTemplate = (lang: string) => {
        return templates.find(t => t.event_key === event && t.channel === channel && t.language === lang);
    };

    const currentTemplate = getCurrentTemplate(language) || getCurrentTemplate('en') || {};

    const [content, setContent] = useState(currentTemplate.content || '');
    const [subject, setSubject] = useState(currentTemplate.subject || '');
    const [previewMode, setPreviewMode] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // Initialize activeTemplate from explicit DB column 'design_type'
    const [activeTemplate, setActiveTemplate] = useState<'classic' | 'modern' | 'minimalist' | null>(
        (currentTemplate.design_type as any) || null
    );

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Sync when event/channel OR Language changes
    useEffect(() => {
        const tmpl = getCurrentTemplate(language) || {};
        setContent(tmpl.content || '');
        setSubject(tmpl.subject || '');
        // Update active template from DB
        setActiveTemplate((tmpl.design_type as any) || null);
    }, [event, channel, language, templates]);

    const handleSave = () => {
        onSave(content, subject, language, activeTemplate);
    };

    // Preset Templates - Premium Designs
    const applyTemplate = (type: 'classic' | 'modern' | 'minimalist') => {
        setActiveTemplate(type); // Instant visual feedback
        const primary = branding.primary_color || '#4F46E5';
        const logo = branding.logo_url || '';

        let newContent = '';

        if (type === 'modern') {
            // Card Style, Shadow, Centered
            newContent = `
<div data-design="modern" style="background-color: #f3f4f6; padding: 40px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
    <div style="max-w_idth: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <div style="background-color: ${primary}; padding: 30px; text-align: center;">
            <img src="${logo}" alt="Logo" style="height: 28px; border: 0;">
        </div>
        <div style="padding: 40px 30px; color: #374151;">
            <h2 style="margin-top: 0; color: #111827; font-size: 24px; font-weight: bold;">Shipment Update</h2>
            <p style="font-size: 16px; line-height: 1.6;">Hello {{customer_name}},</p>
            <p style="font-size: 16px; line-height: 1.6;">We have an update regarding your shipment.</p>
            
            <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td style="padding-bottom: 10px; color: #6b7280; font-size: 12px; text-transform: uppercase;">Tracking Number</td>
                        <td style="padding-bottom: 10px; color: #6b7280; font-size: 12px; text-transform: uppercase; text-align: right;">Status</td>
                    </tr>
                    <tr>
                        <td style="font-size: 18px; font-weight: bold; color: #111827; font-family: monospace;">{{tracking_number}}</td>
                        <td style="font-size: 18px; font-weight: bold; color: ${primary}; text-align: right;">{{status}}</td>
                    </tr>
                </table>
            </div>

            <div style="text-align: center; margin-top: 35px;">
                <a href="{{tracking_url}}" style="background-color: ${primary}; color: #ffffff; padding: 14px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Track Shipment</a>
            </div>
            
            <p style="margin-top: 30px; font-size: 14px; color: #6b7280; text-align: center;">Reference Date: {{date}}</p>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
            &copy; ${new Date().getFullYear()} MasarX. All rights reserved.
        </div>
    </div>
</div>`;
        } else if (type === 'classic') {
            // Corporate, Header Bar, Clean
            newContent = `
<div data-design="classic" style="font-family: Arial, sans-serif; color: #333333; line-height: 1.6;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-bottom: 3px solid ${primary};">
        <tr>
            <td style="padding: 20px;">
                <img src="${logo}" alt="Logo" style="height: 28px;">
            </td>
            <td style="padding: 20px; text-align: right; color: ${primary}; font-weight: bold;">
                SHIPMENT NOTIFICATION
            </td>
        </tr>
    </table>
    
    <div style="padding: 40px 20px; max-width: 600px; margin: 0 auto;">
        <h3 style="color: #000000; border-bottom: 1px solid #eeeeee; padding-bottom: 10px;">Dear {{customer_name}},</h3>
        <p>Your package with tracking number <strong>{{tracking_number}}</strong> has been updated.</p>
        
        <table width="100%" style="margin: 20px 0; border: 1px solid #eeeeee;">
            <tr style="background-color: #f8f8f8;">
                <td style="padding: 10px; border-bottom: 1px solid #eeeeee; font-weight: bold;">Current Status</td>
                <td style="padding: 10px; border-bottom: 1px solid #eeeeee;">{{status}}</td>
            </tr>
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eeeeee; font-weight: bold;">Date</td>
                <td style="padding: 10px; border-bottom: 1px solid #eeeeee;">{{date}}</td>
            </tr>
        </table>
        
        <p>You can track the progress of your delivery at any time:</p>
        <p><a href="{{tracking_url}}" style="color: ${primary}; text-decoration: underline;">{{tracking_url}}</a></p>
        
        <p style="margin-top: 40px; color: #999999; font-size: 12px;">This is an automated message. Please do not reply.</p>
    </div>
</div>`;
        } else {
            // Minimalist / Plain HTML
            newContent = `
<div data-design="minimalist" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 20px; color: #1c1c1e;">
    <div style="margin-bottom: 20px;">
        <strong style="color: ${primary}; font-size: 18px;">{{status}}</strong>
    </div>
    <p style="margin: 0 0 10px;">Tracking Code: <strong>{{tracking_number}}</strong></p>
    <p style="margin: 0 0 20px;">Hello {{customer_name}}, keeping you in the loop regarding your shipment.</p>
    
    <a href="{{tracking_url}}" style="color: ${primary}; text-decoration: none; border-bottom: 1px solid ${primary};">Track Package &rarr;</a>
    
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px dashed #e5e5ea; font-size: 11px; color: #8e8e93;">
        Sent via MasarX • {{date}}
    </div>
</div>`;
        }

        setContent(newContent);
    };

    // renderPreview replicates master.blade.php logic roughly for preview
    const renderPreview = () => {
        const logoUrl = branding.logo_url || 'https://via.placeholder.com/150x50?text=Logo';
        const companyName = branding.company_name || 'MasarX Logistics';
        const color = branding.primary_color || '#1f2937';

        // Mock variable replacement
        let previewHtml = content
            .replace(/{{customer_name}}/g, 'John Doe')
            .replace(/{{tracking_number}}/g, 'TRK-123456789')
            .replace(/{{status}}/g, 'In Transit')
            .replace(/{{tracking_url}}/g, '#')
            .replace(/{{date}}/g, new Date().toISOString().split('T')[0]);

        return (
            <div className="border rounded-lg overflow-hidden shadow-sm max-w-[600px] mx-auto mt-4 bg-white">
                <div style={{ backgroundColor: color }} className="p-6 text-center">
                    {branding.logo_url ? <img src={logoUrl} alt="Logo" className="h-8 mx-auto" /> : <h1 className="text-white text-xl font-bold">{companyName}</h1>}
                </div>
                <div className="p-8 text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewHtml) }} />
                <div className="bg-gray-50 p-4 text-center text-xs text-gray-400">
                    &copy; {new Date().getFullYear()} {companyName}. All rights reserved.
                </div>
            </div>
        );
    };

    const modules = {
        toolbar: [
            [{ 'header': [1, 2, false] }],
            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['link', 'color', 'code-block'],
            ['clean']
        ],
    };

    // Detection logic removed in favor of explicit DB storage 'design_type'

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b pb-4">
                <div className="flex items-center gap-2">
                    <Button
                        variant={activeTemplate === 'classic' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => applyTemplate('classic')}
                        className={activeTemplate === 'classic' ? 'bg-primary text-primary-foreground transition-all duration-300' : 'transition-all duration-300'}
                    >
                        {t('settings.notifications.editor_classic')}
                    </Button>
                    <Button
                        variant={activeTemplate === 'modern' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => applyTemplate('modern')}
                        className={activeTemplate === 'modern' ? 'bg-primary text-primary-foreground transition-all duration-300' : 'transition-all duration-300'}
                    >
                        {t('settings.notifications.editor_modern')}
                    </Button>
                    <Button
                        variant={activeTemplate === 'minimalist' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => applyTemplate('minimalist')}
                        className={activeTemplate === 'minimalist' ? 'bg-primary text-primary-foreground transition-all duration-300' : 'transition-all duration-300'}
                    >
                        {t('settings.notifications.editor_minimal')}
                    </Button>
                </div>
                <div className="flex items-center gap-2">
                    <Tabs value={language} onValueChange={setLanguage}>
                        <TabsList>
                            <TabsTrigger value="en">{t('settings.notifications.lang_en')}</TabsTrigger>
                            <TabsTrigger value="es">{t('settings.notifications.lang_es')}</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <Button variant={previewMode ? "secondary" : "outline"} size="sm" onClick={() => setPreviewMode(!previewMode)}>
                        {previewMode ? t('settings.notifications.editor_edit_mode') : t('settings.notifications.editor_preview')}
                    </Button>
                </div>
            </div>

            {previewMode ? (
                <div className="bg-gray-100 p-8 rounded-lg min-h-[400px]">
                    {renderPreview()}
                </div>
            ) : (
                <div className="grid gap-4">
                    {channel === 'email' && (
                        <div>
                            <Label>{t('settings.notifications.editor_subject')}</Label>
                            <input
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder={t('settings.notifications.editor_subject_placeholder')}
                            />
                        </div>
                    )}
                    <div>
                        <Label>{t('settings.notifications.editor_content')}</Label>
                        {isMounted && (
                            <React.Suspense fallback={<div className="h-[300px] border rounded bg-gray-50 flex items-center justify-center text-gray-400">{t('settings.notifications.editor_loading')}</div>}>
                                <ReactQuill
                                    theme="snow"
                                    value={content}
                                    onChange={setContent}
                                    modules={modules}
                                    className="bg-white rounded-md h-[300px] mb-12"
                                />
                            </React.Suspense>
                        )}
                    </div>
                </div>
            )}

            <div className="flex justify-end pt-4">
                <Button onClick={handleSave}>{t('settings.notifications.editor_save_template')} ({language.toUpperCase()})</Button>
            </div>
        </div>
    );
};
