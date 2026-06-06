<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice {{ $shipment->tracking_number }}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @media print {
            .no-print {
                display: none;
            }

            body {
                -webkit-print-color-adjust: exact;
            }
        }
    </style>
</head>

<body class="bg-gray-100 p-8 font-sans print:bg-white print:p-0">

    <div class="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-lg print:shadow-none print:w-full">

        <!-- Header -->
        <div class="flex justify-between items-start mb-8 border-b pb-8">
            <div>
                <h1 class="text-3xl font-bold text-gray-800">{{ __('invoice.title') }}</h1>
                <p class="text-gray-500 mt-1">#INV-{{ $shipment->id }}</p>
                <p class="text-gray-500 text-sm mt-1">{{ __('invoice.date') }}: {{ $shipment->created_at->format('M d, Y') }}</p>
            </div>
            <div class="text-right">
                <h2 class="text-xl font-bold text-blue-600">{{ $company['name'] }}</h2>
                <p class="text-gray-600 text-sm">{{ $company['address'] }}</p>
                <p class="text-gray-600 text-sm">{{ $company['email'] }}</p>
                <p class="text-gray-600 text-sm">{{ $company['phone'] }}</p>
            </div>
        </div>

        <!-- Bill To -->
        <div class="flex justify-between mb-8">
            <div class="w-1/2">
                <h3 class="text-gray-600 font-semibold mb-2">{{ __('invoice.bill_to') }}:</h3>
                <p class="font-bold text-gray-800">{{ $shipment->sender_details['name'] ?? 'Guest Customer' }}</p>
                <p class="text-gray-600 text-sm">{{ $shipment->sender_details['city'] ?? '' }}</p>
                <p class="text-gray-600 text-sm">{{ $shipment->sender_details['country'] ?? '' }}</p>
            </div>
            <div class="w-1/2 text-right">
                <h3 class="text-gray-600 font-semibold mb-2">{{ __('invoice.shipment_details') }}:</h3>
                <p class="text-sm"><span class="font-semibold">{{ __('invoice.tracking') }}:</span> {{ $shipment->tracking_number }}</p>
                <p class="text-sm capitalize"><span class="font-semibold">{{ __('invoice.status') }}:</span>
                    {{ __('shipments.status.' . $shipment->status) ?? str_replace('_', ' ', $shipment->status) }}</p>
            </div>
        </div>

        <!-- Table -->
        <table class="w-full mb-8">
            <thead>
                <tr class="bg-gray-50 border-b border-gray-200">
                    <th class="text-left py-3 px-4 font-semibold text-gray-600">{{ __('invoice.description') }}</th>
                    <th class="text-right py-3 px-4 font-semibold text-gray-600">{{ __('invoice.amount') }}</th>
                </tr>
            </thead>
            <tbody>
                <tr class="border-b border-gray-100">
                    <td class="py-3 px-4 text-gray-800">{{ __('invoice.service') }} - {{ $shipment->tracking_number }}</td>
                    <td class="text-right py-3 px-4 text-gray-800">${{ $shipment->subtotal ?? '0.00' }}</td>
                </tr>
                <tr class="border-b border-gray-100">
                    <td class="py-3 px-4 text-gray-800">{{ __('invoice.tax') }}</td>
                    <td class="text-right py-3 px-4 text-gray-800">${{ $shipment->tax ?? '0.00' }}</td>
                </tr>
                <tr class="border-b border-gray-100">
                    <td class="py-3 px-4 text-gray-800">{{ __('invoice.discount') }}</td>
                    <td class="text-right py-3 px-4 text-gray-800">-${{ $shipment->discount ?? '0.00' }}</td>
                </tr>
            </tbody>
            <tfoot>
                <tr>
                    <td class="pt-4 text-right font-bold text-gray-800">{{ __('invoice.total') }}:</td>
                    <td class="pt-4 text-right font-bold text-blue-600 text-xl">${{ $shipment->total ?? '0.00' }}</td>
                </tr>
            </tfoot>
        </table>

        <!-- Footer -->
        <div class="text-center text-gray-500 text-sm border-t pt-8">
            <p>{{ __('invoice.thanks') }}</p>
            <p class="mt-2">{{ __('invoice.payable') }} {{ $company['name'] }}.</p>
        </div>

        <!-- Print Actions -->
        <div class="fixed bottom-8 right-8 no-print">
            <button onclick="window.print()"
                class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow-lg flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                    class="lucide lucide-printer">
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6" />
                    <rect x="6" y="14" width="12" height="8" />
                </svg>
                {{ __('invoice.print') }}
            </button>
        </div>
    </div>
</body>

</html>