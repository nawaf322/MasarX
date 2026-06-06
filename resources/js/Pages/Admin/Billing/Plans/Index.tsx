import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/Components/UI/button';
import { Card, CardContent } from '@/Components/UI/card';
import { Badge } from '@/Components/UI/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/Components/UI/dropdown-menu';
import { Plus, MoreHorizontal, Edit, ToggleLeft, ToggleRight, Users, ArrowLeft } from 'lucide-react';
import { useSweetAlert } from '@/hooks/useSweetAlert';

interface Plan {
    id: number;
    name: string;
    slug: string;
    description?: string;
    price_monthly: number;
    price_quarterly?: number;
    price_semiannual?: number;
    price_annual?: number;
    currency: string;
    trial_days: number;
    grace_period_days: number;
    is_active: boolean;
    sort_order: number;
    subscriptions_count: number;
}

export default function PlansIndex({ plans }: { plans: Plan[] }) {
    const { t } = useTranslation();
    const alert = useSweetAlert();

    const toggle = async (plan: Plan) => {
        const confirmed = await alert.confirm(
            plan.is_active ? t('saas_billing.confirm_deactivate_plan') : t('saas_billing.confirm_activate_plan'),
            ''
        );
        if (confirmed) {
            router.post(route('admin.billing.plans.toggle', plan.id), {}, { preserveScroll: true });
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title={t('saas_billing.plans')} />
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href={route('admin.billing.dashboard')}>
                            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">{t('saas_billing.plans')}</h1>
                            <p className="text-sm text-muted-foreground mt-1">{t('saas_billing.plans_desc')}</p>
                        </div>
                    </div>
                    <Link href={route('admin.billing.plans.create')}>
                        <Button size="sm" className="gap-1">
                            <Plus className="h-4 w-4" /> {t('common.create')}
                        </Button>
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {plans.map((plan) => (
                        <Card key={plan.id} className={`relative ${!plan.is_active ? 'opacity-60' : ''}`}>
                            <CardContent className="p-5 space-y-3">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-semibold text-foreground">{plan.name}</p>
                                        <p className="text-xs text-muted-foreground">{plan.slug}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Badge className={plan.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}>
                                            {plan.is_active ? t('common.active') : t('common.inactive')}
                                        </Badge>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem asChild>
                                                    <Link href={route('admin.billing.plans.edit', plan.id)} className="flex items-center gap-2">
                                                        <Edit className="h-4 w-4" /> {t('common.edit')}
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => toggle(plan)} className="flex items-center gap-2">
                                                    {plan.is_active
                                                        ? <><ToggleLeft className="h-4 w-4" /> {t('common.deactivate')}</>
                                                        : <><ToggleRight className="h-4 w-4" /> {t('common.activate')}</>
                                                    }
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-2xl font-bold text-foreground">
                                        ${Number(plan.price_monthly).toFixed(2)}
                                        <span className="text-sm font-normal text-muted-foreground">/{t('saas_billing.monthly').toLowerCase()}</span>
                                    </p>
                                    {plan.price_annual && (
                                        <p className="text-xs text-muted-foreground">${Number(plan.price_annual).toFixed(2)}/{t('saas_billing.annual').toLowerCase()}</p>
                                    )}
                                </div>

                                <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 border-t border-border">
                                    <span className="flex items-center gap-1">
                                        <Users className="h-3 w-3" />
                                        {plan.subscriptions_count} {t('saas_billing.subscriptions')}
                                    </span>
                                    {plan.trial_days > 0 && (
                                        <span>{plan.trial_days}d {t('saas_billing.trial')}</span>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
