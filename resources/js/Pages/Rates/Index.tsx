import React from 'react';
import RatesLayout from '@/Layouts/RatesLayout';
import { Head, Link } from '@inertiajs/react';
import { Button } from "@/Components/UI/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/Components/UI/card";
import { ArrowRight, Globe, Calculator, CreditCard, Box } from "lucide-react";
import { useTranslation } from '@/hooks/useTranslation';

export default function Index() {
    const { t } = useTranslation();

    return (
        <RatesLayout title={t('rates.title')}>
            <Head title={t('rates.title')} />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('rates.rate_cards')}</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{t('rates.manage')}</div>
                        <p className="text-xs text-muted-foreground">{t('rates.manage_cards')}</p>
                        <Link href={route('rates.cards.index')}>
                            <Button size="sm" variant="ghost" className="mt-4 w-full justify-between">
                                {t('rates.go_to_cards')} <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('rates.shipping_zones')}</CardTitle>
                        <Globe className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{t('rates.manage')}</div>
                        <p className="text-xs text-muted-foreground">{t('rates.manage_zones')}</p>
                        <Link href={route('rates.zones.index')}>
                            <Button size="sm" variant="ghost" className="mt-4 w-full justify-between">
                                {t('rates.go_to_zones')} <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card className="shadow-sm bg-blue-50 border-blue-100 dark:bg-blue-950/30 dark:border-blue-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-200">{t('rates.calculator')}</CardTitle>
                        <Calculator className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{t('rates.test_rates')}</div>
                        <p className="text-xs text-blue-600/80 dark:text-blue-400/80">{t('rates.simulate_costs')}</p>
                        <Link href={route('rates.calculator')}>
                            <Button size="sm" className="mt-4 w-full bg-primary hover:bg-primary/90">
                                {t('rates.open_calculator')}
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('rates.quick_actions')}</CardTitle>
                    <CardDescription>{t('rates.quick_actions_desc')}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <div className="h-10 w-10 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center shrink-0">
                            <Box className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm">{t('rates.create_rate_card')}</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('rates.create_rate_card_desc')}</p>
                        </div>
                        <Link href={route('rates.cards.index')} className="shrink-0">
                            <Button size="sm" variant="outline">{t('rates.start')}</Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </RatesLayout>
    );
}
