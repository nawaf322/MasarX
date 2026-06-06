import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { Package, Truck, MapPin, Clock, CheckCircle, Calendar, TrendingUp } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
    assigned_shipments: any[];
    assigned_pickups: any[];
    stats: {
        deliveries_today: number;
        deliveries_week: number;
        deliveries_month: number;
        pending_deliveries: number;
        pickups_pending: number;
    };
}

export default function DriverDashboard({ assigned_shipments, assigned_pickups, stats }: Props) {
    const { t } = useTranslation();

    const statCards = [
        { label: 'Pending Deliveries', value: stats.pending_deliveries, icon: Package, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
        { label: 'Delivered Today', value: stats.deliveries_today, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
        { label: 'This Week', value: stats.deliveries_week, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
        { label: 'This Month', value: stats.deliveries_month, icon: Calendar, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' },
        { label: 'Pickups Pending', value: stats.pickups_pending, icon: MapPin, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
    ];

    const statusColor: Record<string, string> = {
        pending: 'bg-yellow-100 text-yellow-800',
        picked_up: 'bg-sky-100 text-sky-800',
        in_transit: 'bg-blue-100 text-blue-800',
        out_for_delivery: 'bg-violet-100 text-violet-800',
        delivered: 'bg-green-100 text-green-800',
        cancelled: 'bg-red-100 text-red-700',
    };

    return (
        <AuthenticatedLayout>
            <Head title="My Dashboard" />
            <div className="max-w-6xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">My Dashboard</h1>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                    {statCards.map(card => (
                        <div key={card.label} className={`rounded-xl border p-4 ${card.bg}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <card.icon className={`h-5 w-5 ${card.color}`} />
                                <span className="text-xs font-medium text-gray-600">{card.label}</span>
                            </div>
                            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Assigned Shipments */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Truck className="h-5 w-5 text-indigo-600" />
                                <h2 className="font-semibold text-gray-900">Assigned Shipments</h2>
                            </div>
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-medium">{assigned_shipments.length}</span>
                        </div>
                        <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                            {assigned_shipments.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">
                                    <Package className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                                    <p className="text-sm">No assigned shipments</p>
                                </div>
                            ) : assigned_shipments.map((s: any) => (
                                <div key={s.id} className="px-5 py-3 hover:bg-gray-50 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">{s.tracking_number}</p>
                                        <p className="text-xs text-gray-500">{s.receiver_details?.city || '\u2014'}, {s.receiver_details?.country || '\u2014'}</p>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[s.status] || 'bg-gray-100 text-gray-600'}`}>
                                        {(s.status || 'pending').replace(/_/g, ' ')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Assigned Pickups */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-orange-600" />
                                <h2 className="font-semibold text-gray-900">My Pickups</h2>
                            </div>
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">{assigned_pickups.length}</span>
                        </div>
                        <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                            {assigned_pickups.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">
                                    <MapPin className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                                    <p className="text-sm">No pending pickups</p>
                                </div>
                            ) : assigned_pickups.map((p: any) => (
                                <div key={p.id} className="px-5 py-3 hover:bg-gray-50">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-sm font-semibold text-gray-900">{p.contact_name}</p>
                                        <span className="text-xs text-gray-500">{p.scheduled_for ? new Date(p.scheduled_for).toLocaleString() : '\u2014'}</span>
                                    </div>
                                    <p className="text-xs text-gray-500">{p.pickup_address}</p>
                                    {p.contact_phone && <p className="text-xs text-gray-400">{p.contact_phone}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
