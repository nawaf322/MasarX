import { usePage, router } from '@inertiajs/react';
import { useEffect } from 'react';
import { Button } from "@/Components/UI/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/Components/UI/dropdown-menu";
import { Languages } from "lucide-react";
import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
    const { i18n } = useTranslation();
    const { props } = usePage();

    // Backend locale is the single source of truth — shared by HandleInertiaRequests
    // on every Inertia navigation. Keep i18n in sync so page content and indicator agree.
    const normalize = (l: string) => l.split('-')[0];
    const backendLocale = normalize(((props as any).locale as string) || 'en');
    const active = backendLocale;

    useEffect(() => {
        if (i18n.language !== backendLocale) {
            i18n.changeLanguage(backendLocale);
        }
    }, [backendLocale]);

    const languages = [
        { code: 'en', label: 'English', flag: '🇺🇸' },
        { code: 'es', label: 'Español', flag: '🇪🇸' },
    ];

    const handleLanguageChange = (code: string) => {
        i18n.changeLanguage(code); // Immediate frontend switch
        router.post(route('settings.locale.update'), {
            language: code,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                window.location.reload();
            }
        });
    };

    const currentLanguage = languages.find(l => l.code === active) || languages[0];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <Languages className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    <span className="sr-only">Switch Language</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[150px]">
                {languages.map((lang) => (
                    <DropdownMenuItem
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                        className={`cursor-pointer gap-2 font-medium ${active === lang.code ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : ''}`}
                    >
                        <span>{lang.label}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
