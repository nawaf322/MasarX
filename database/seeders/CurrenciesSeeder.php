<?php
// *************************************************************************
// *                                                                       *
// * DEPRIXA PLUS - The All-in-One Courier  & Logistics Platform           *
// * Copyright (c) CODDINGPRO. All Rights Reserved                         *
// *                                                                       *
// *************************************************************************
// *                                                                       *
// * Email: soporte@coddingpro.com                                         *
// * Website: https://code-market.shop                                     *
// *                                                                       *
// *************************************************************************
// *                                                                       *
// * This software is furnished under a license and may be used and copied *
// * only  in  accordance  with  the  terms  of such  license and with the *
// * inclusion of the above copyright notice.                              *
// * If you Purchased from Codecanyon, Please read the full License from   *
// * here- http://codecanyon.net/licenses/standard                         *
// *                                                                       *
// *************************************************************************

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Currency;
use Illuminate\Support\Facades\DB;

class CurrenciesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Pobla todas las monedas ISO 4217 sin eliminar las existentes.
     */
    public function run(): void
    {
        $currencies = [
            ['code' => 'USD', 'name' => 'United States Dollar', 'symbol' => '$', 'exchange_rate' => 1.000000, 'is_primary' => true, 'is_active' => true],
            ['code' => 'EUR', 'name' => 'Euro', 'symbol' => '€', 'exchange_rate' => 0.920000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'GBP', 'name' => 'British Pound', 'symbol' => '£', 'exchange_rate' => 0.790000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'COP', 'name' => 'Colombian Peso', 'symbol' => '$', 'exchange_rate' => 3900.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'MXN', 'name' => 'Mexican Peso', 'symbol' => '$', 'exchange_rate' => 17.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'JPY', 'name' => 'Japanese Yen', 'symbol' => '¥', 'exchange_rate' => 150.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'CNY', 'name' => 'Chinese Yuan', 'symbol' => '¥', 'exchange_rate' => 7.200000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'CAD', 'name' => 'Canadian Dollar', 'symbol' => '$', 'exchange_rate' => 1.350000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'AUD', 'name' => 'Australian Dollar', 'symbol' => '$', 'exchange_rate' => 1.520000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'BRL', 'name' => 'Brazilian Real', 'symbol' => 'R$', 'exchange_rate' => 4.950000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'ARS', 'name' => 'Argentine Peso', 'symbol' => '$', 'exchange_rate' => 850.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'CLP', 'name' => 'Chilean Peso', 'symbol' => '$', 'exchange_rate' => 950.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'PEN', 'name' => 'Peruvian Sol', 'symbol' => 'S/', 'exchange_rate' => 3.700000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'AED', 'name' => 'United Arab Emirates Dirham', 'symbol' => 'د.إ', 'exchange_rate' => 3.670000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'AFN', 'name' => 'Afghan Afghani', 'symbol' => '؋', 'exchange_rate' => 70.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'ALL', 'name' => 'Albanian Lek', 'symbol' => 'L', 'exchange_rate' => 95.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'AMD', 'name' => 'Armenian Dram', 'symbol' => '֏', 'exchange_rate' => 400.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'ANG', 'name' => 'Netherlands Antillean Guilder', 'symbol' => 'ƒ', 'exchange_rate' => 1.800000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'AOA', 'name' => 'Angolan Kwanza', 'symbol' => 'Kz', 'exchange_rate' => 830.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'AWG', 'name' => 'Aruban Florin', 'symbol' => 'ƒ', 'exchange_rate' => 1.800000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'AZN', 'name' => 'Azerbaijani Manat', 'symbol' => '₼', 'exchange_rate' => 1.700000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'BAM', 'name' => 'Bosnia-Herzegovina Convertible Mark', 'symbol' => 'KM', 'exchange_rate' => 1.800000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'BBD', 'name' => 'Barbadian Dollar', 'symbol' => '$', 'exchange_rate' => 2.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'BDT', 'name' => 'Bangladeshi Taka', 'symbol' => '৳', 'exchange_rate' => 110.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'BGN', 'name' => 'Bulgarian Lev', 'symbol' => 'лв', 'exchange_rate' => 1.800000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'BHD', 'name' => 'Bahraini Dinar', 'symbol' => '.د.ب', 'exchange_rate' => 0.377000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'BIF', 'name' => 'Burundian Franc', 'symbol' => 'FBu', 'exchange_rate' => 2850.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'BMD', 'name' => 'Bermudan Dollar', 'symbol' => '$', 'exchange_rate' => 1.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'BND', 'name' => 'Brunei Dollar', 'symbol' => '$', 'exchange_rate' => 1.350000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'BOB', 'name' => 'Bolivian Boliviano', 'symbol' => 'Bs.', 'exchange_rate' => 6.900000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'BSD', 'name' => 'Bahamian Dollar', 'symbol' => '$', 'exchange_rate' => 1.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'BTN', 'name' => 'Bhutanese Ngultrum', 'symbol' => 'Nu.', 'exchange_rate' => 83.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'BWP', 'name' => 'Botswanan Pula', 'symbol' => 'P', 'exchange_rate' => 13.500000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'BYN', 'name' => 'Belarusian Ruble', 'symbol' => 'Br', 'exchange_rate' => 3.300000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'BZD', 'name' => 'Belize Dollar', 'symbol' => '$', 'exchange_rate' => 2.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'CDF', 'name' => 'Congolese Franc', 'symbol' => 'FC', 'exchange_rate' => 2750.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'CHF', 'name' => 'Swiss Franc', 'symbol' => 'CHF', 'exchange_rate' => 0.880000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'CKD', 'name' => 'Cook Islands Dollar', 'symbol' => '$', 'exchange_rate' => 1.520000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'CRC', 'name' => 'Costa Rican Colón', 'symbol' => '₡', 'exchange_rate' => 520.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'CUP', 'name' => 'Cuban Peso', 'symbol' => '$', 'exchange_rate' => 24.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'CVE', 'name' => 'Cape Verdean Escudo', 'symbol' => '$', 'exchange_rate' => 101.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'CZK', 'name' => 'Czech Koruna', 'symbol' => 'Kč', 'exchange_rate' => 23.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'DJF', 'name' => 'Djiboutian Franc', 'symbol' => 'Fdj', 'exchange_rate' => 178.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'DKK', 'name' => 'Danish Krone', 'symbol' => 'kr', 'exchange_rate' => 6.860000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'DOP', 'name' => 'Dominican Peso', 'symbol' => 'RD$', 'exchange_rate' => 56.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'DZD', 'name' => 'Algerian Dinar', 'symbol' => 'د.ج', 'exchange_rate' => 134.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'EGP', 'name' => 'Egyptian Pound', 'symbol' => '£', 'exchange_rate' => 31.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'ERN', 'name' => 'Eritrean Nakfa', 'symbol' => 'Nfk', 'exchange_rate' => 15.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'ETB', 'name' => 'Ethiopian Birr', 'symbol' => 'Br', 'exchange_rate' => 56.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'FJD', 'name' => 'Fijian Dollar', 'symbol' => '$', 'exchange_rate' => 2.250000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'FKP', 'name' => 'Falkland Islands Pound', 'symbol' => '£', 'exchange_rate' => 0.790000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'FOK', 'name' => 'Faroese Króna', 'symbol' => 'kr', 'exchange_rate' => 6.860000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'GEL', 'name' => 'Georgian Lari', 'symbol' => '₾', 'exchange_rate' => 2.650000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'GGP', 'name' => 'Guernsey Pound', 'symbol' => '£', 'exchange_rate' => 0.790000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'GHS', 'name' => 'Ghanaian Cedi', 'symbol' => '₵', 'exchange_rate' => 12.500000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'GIP', 'name' => 'Gibraltar Pound', 'symbol' => '£', 'exchange_rate' => 0.790000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'GMD', 'name' => 'Gambian Dalasi', 'symbol' => 'D', 'exchange_rate' => 67.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'GNF', 'name' => 'Guinean Franc', 'symbol' => 'FG', 'exchange_rate' => 8600.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'GTQ', 'name' => 'Guatemalan Quetzal', 'symbol' => 'Q', 'exchange_rate' => 7.800000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'GYD', 'name' => 'Guyanaese Dollar', 'symbol' => '$', 'exchange_rate' => 209.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'HKD', 'name' => 'Hong Kong Dollar', 'symbol' => '$', 'exchange_rate' => 7.830000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'HNL', 'name' => 'Honduran Lempira', 'symbol' => 'L', 'exchange_rate' => 24.700000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'HRK', 'name' => 'Croatian Kuna', 'symbol' => 'kn', 'exchange_rate' => 6.900000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'HTG', 'name' => 'Haitian Gourde', 'symbol' => 'G', 'exchange_rate' => 132.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'HUF', 'name' => 'Hungarian Forint', 'symbol' => 'Ft', 'exchange_rate' => 360.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'IDR', 'name' => 'Indonesian Rupiah', 'symbol' => 'Rp', 'exchange_rate' => 15750.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'ILS', 'name' => 'Israeli New Sheqel', 'symbol' => '₪', 'exchange_rate' => 3.650000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'IMP', 'name' => 'Manx Pound', 'symbol' => '£', 'exchange_rate' => 0.790000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'INR', 'name' => 'Indian Rupee', 'symbol' => '₹', 'exchange_rate' => 83.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'IQD', 'name' => 'Iraqi Dinar', 'symbol' => 'ع.د', 'exchange_rate' => 1310.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'IRR', 'name' => 'Iranian Rial', 'symbol' => '﷼', 'exchange_rate' => 42000.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'ISK', 'name' => 'Icelandic Króna', 'symbol' => 'kr', 'exchange_rate' => 138.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'JEP', 'name' => 'Jersey Pound', 'symbol' => '£', 'exchange_rate' => 0.790000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'JMD', 'name' => 'Jamaican Dollar', 'symbol' => '$', 'exchange_rate' => 155.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'JOD', 'name' => 'Jordanian Dinar', 'symbol' => 'د.ا', 'exchange_rate' => 0.709000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'KES', 'name' => 'Kenyan Shilling', 'symbol' => 'KSh', 'exchange_rate' => 128.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'KGS', 'name' => 'Kyrgystani Som', 'symbol' => 'с', 'exchange_rate' => 89.500000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'KHR', 'name' => 'Cambodian Riel', 'symbol' => '៛', 'exchange_rate' => 4050.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'KID', 'name' => 'Kiribati Dollar', 'symbol' => '$', 'exchange_rate' => 1.520000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'KMF', 'name' => 'Comorian Franc', 'symbol' => 'CF', 'exchange_rate' => 450.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'KRW', 'name' => 'South Korean Won', 'symbol' => '₩', 'exchange_rate' => 1330.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'KWD', 'name' => 'Kuwaiti Dinar', 'symbol' => 'د.ك', 'exchange_rate' => 0.307000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'KYD', 'name' => 'Cayman Islands Dollar', 'symbol' => '$', 'exchange_rate' => 0.833000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'KZT', 'name' => 'Kazakhstani Tenge', 'symbol' => '₸', 'exchange_rate' => 450.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'LAK', 'name' => 'Laotian Kip', 'symbol' => '₭', 'exchange_rate' => 20800.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'LBP', 'name' => 'Lebanese Pound', 'symbol' => 'ل.ل', 'exchange_rate' => 15000.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'LKR', 'name' => 'Sri Lankan Rupee', 'symbol' => 'Rs', 'exchange_rate' => 325.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'LRD', 'name' => 'Liberian Dollar', 'symbol' => '$', 'exchange_rate' => 190.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'LSL', 'name' => 'Lesotho Loti', 'symbol' => 'L', 'exchange_rate' => 18.800000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'LYD', 'name' => 'Libyan Dinar', 'symbol' => 'ل.د', 'exchange_rate' => 4.850000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'MAD', 'name' => 'Moroccan Dirham', 'symbol' => 'د.م.', 'exchange_rate' => 10.100000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'MDL', 'name' => 'Moldovan Leu', 'symbol' => 'L', 'exchange_rate' => 18.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'MGA', 'name' => 'Malagasy Ariary', 'symbol' => 'Ar', 'exchange_rate' => 4500.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'MKD', 'name' => 'Macedonian Denar', 'symbol' => 'ден', 'exchange_rate' => 56.500000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'MMK', 'name' => 'Myanma Kyat', 'symbol' => 'K', 'exchange_rate' => 2100.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'MNT', 'name' => 'Mongolian Tugrik', 'symbol' => '₮', 'exchange_rate' => 3400.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'MOP', 'name' => 'Macanese Pataca', 'symbol' => 'MOP$', 'exchange_rate' => 8.030000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'MRU', 'name' => 'Mauritanian Ouguiya', 'symbol' => 'UM', 'exchange_rate' => 40.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'MUR', 'name' => 'Mauritian Rupee', 'symbol' => '₨', 'exchange_rate' => 45.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'MVR', 'name' => 'Maldivian Rufiyaa', 'symbol' => 'Rf', 'exchange_rate' => 15.400000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'MWK', 'name' => 'Malawian Kwacha', 'symbol' => 'MK', 'exchange_rate' => 1680.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'MYR', 'name' => 'Malaysian Ringgit', 'symbol' => 'RM', 'exchange_rate' => 4.750000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'MZN', 'name' => 'Mozambican Metical', 'symbol' => 'MT', 'exchange_rate' => 64.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'NAD', 'name' => 'Namibian Dollar', 'symbol' => '$', 'exchange_rate' => 18.800000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'NGN', 'name' => 'Nigerian Naira', 'symbol' => '₦', 'exchange_rate' => 1450.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'NIO', 'name' => 'Nicaraguan Córdoba', 'symbol' => 'C$', 'exchange_rate' => 36.800000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'NOK', 'name' => 'Norwegian Krone', 'symbol' => 'kr', 'exchange_rate' => 10.500000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'NPR', 'name' => 'Nepalese Rupee', 'symbol' => '₨', 'exchange_rate' => 133.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'NZD', 'name' => 'New Zealand Dollar', 'symbol' => '$', 'exchange_rate' => 1.640000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'OMR', 'name' => 'Omani Rial', 'symbol' => 'ر.ع.', 'exchange_rate' => 0.385000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'PAB', 'name' => 'Panamanian Balboa', 'symbol' => 'B/.', 'exchange_rate' => 1.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'PGK', 'name' => 'Papua New Guinean Kina', 'symbol' => 'K', 'exchange_rate' => 3.750000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'PHP', 'name' => 'Philippine Peso', 'symbol' => '₱', 'exchange_rate' => 56.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'PKR', 'name' => 'Pakistani Rupee', 'symbol' => '₨', 'exchange_rate' => 278.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'PLN', 'name' => 'Polish Zloty', 'symbol' => 'zł', 'exchange_rate' => 4.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'PYG', 'name' => 'Paraguayan Guarani', 'symbol' => '₲', 'exchange_rate' => 7300.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'QAR', 'name' => 'Qatari Rial', 'symbol' => 'ر.ق', 'exchange_rate' => 3.640000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'RON', 'name' => 'Romanian Leu', 'symbol' => 'lei', 'exchange_rate' => 4.600000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'RSD', 'name' => 'Serbian Dinar', 'symbol' => 'дин.', 'exchange_rate' => 108.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'RUB', 'name' => 'Russian Ruble', 'symbol' => '₽', 'exchange_rate' => 92.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'RWF', 'name' => 'Rwandan Franc', 'symbol' => 'FRw', 'exchange_rate' => 1300.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'SAR', 'name' => 'Saudi Riyal', 'symbol' => 'ر.س', 'exchange_rate' => 3.750000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'SBD', 'name' => 'Solomon Islands Dollar', 'symbol' => '$', 'exchange_rate' => 8.400000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'SCR', 'name' => 'Seychellois Rupee', 'symbol' => '₨', 'exchange_rate' => 13.500000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'SDG', 'name' => 'Sudanese Pound', 'symbol' => '£', 'exchange_rate' => 600.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'SEK', 'name' => 'Swedish Krona', 'symbol' => 'kr', 'exchange_rate' => 10.400000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'SGD', 'name' => 'Singapore Dollar', 'symbol' => '$', 'exchange_rate' => 1.350000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'SHP', 'name' => 'Saint Helena Pound', 'symbol' => '£', 'exchange_rate' => 0.790000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'SLE', 'name' => 'Sierra Leonean Leone', 'symbol' => 'Le', 'exchange_rate' => 22500.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'SOS', 'name' => 'Somali Shilling', 'symbol' => 'Sh', 'exchange_rate' => 570.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'SRD', 'name' => 'Surinamese Dollar', 'symbol' => '$', 'exchange_rate' => 38.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'SSP', 'name' => 'South Sudanese Pound', 'symbol' => '£', 'exchange_rate' => 1300.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'STN', 'name' => 'São Tomé and Príncipe Dobra', 'symbol' => 'Db', 'exchange_rate' => 22.700000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'SYP', 'name' => 'Syrian Pound', 'symbol' => '£', 'exchange_rate' => 13000.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'SZL', 'name' => 'Swazi Lilangeni', 'symbol' => 'L', 'exchange_rate' => 18.800000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'THB', 'name' => 'Thai Baht', 'symbol' => '฿', 'exchange_rate' => 36.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'TJS', 'name' => 'Tajikistani Somoni', 'symbol' => 'SM', 'exchange_rate' => 10.950000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'TMT', 'name' => 'Turkmenistani Manat', 'symbol' => 'T', 'exchange_rate' => 3.500000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'TND', 'name' => 'Tunisian Dinar', 'symbol' => 'د.ت', 'exchange_rate' => 3.100000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'TOP', 'name' => 'Tongan Pa\'anga', 'symbol' => 'T$', 'exchange_rate' => 2.360000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'TRY', 'name' => 'Turkish Lira', 'symbol' => '₺', 'exchange_rate' => 32.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'TTD', 'name' => 'Trinidad and Tobago Dollar', 'symbol' => 'TT$', 'exchange_rate' => 6.780000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'TVD', 'name' => 'Tuvaluan Dollar', 'symbol' => '$', 'exchange_rate' => 1.520000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'TWD', 'name' => 'New Taiwan Dollar', 'symbol' => 'NT$', 'exchange_rate' => 31.500000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'TZS', 'name' => 'Tanzanian Shilling', 'symbol' => 'Sh', 'exchange_rate' => 2500.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'UAH', 'name' => 'Ukrainian Hryvnia', 'symbol' => '₴', 'exchange_rate' => 37.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'UGX', 'name' => 'Ugandan Shilling', 'symbol' => 'USh', 'exchange_rate' => 3700.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'UYU', 'name' => 'Uruguayan Peso', 'symbol' => '$U', 'exchange_rate' => 39.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'UZS', 'name' => 'Uzbekistani Som', 'symbol' => 'so\'m', 'exchange_rate' => 12350.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'VES', 'name' => 'Venezuelan Bolívar Soberano', 'symbol' => 'Bs.S.', 'exchange_rate' => 36.200000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'VND', 'name' => 'Vietnamese Dong', 'symbol' => '₫', 'exchange_rate' => 24500.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'VUV', 'name' => 'Vanuatu Vatu', 'symbol' => 'VT', 'exchange_rate' => 119.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'WST', 'name' => 'Samoan Tala', 'symbol' => 'T', 'exchange_rate' => 2.700000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'XAF', 'name' => 'CFA Franc BEAC', 'symbol' => 'FCFA', 'exchange_rate' => 600.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'XCD', 'name' => 'East Caribbean Dollar', 'symbol' => '$', 'exchange_rate' => 2.700000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'XDR', 'name' => 'Special Drawing Rights', 'symbol' => 'SDR', 'exchange_rate' => 0.750000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'XOF', 'name' => 'CFA Franc BCEAO', 'symbol' => 'CFA', 'exchange_rate' => 600.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'XPF', 'name' => 'CFP Franc', 'symbol' => '₣', 'exchange_rate' => 110.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'YER', 'name' => 'Yemeni Rial', 'symbol' => '﷼', 'exchange_rate' => 250.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'ZAR', 'name' => 'South African Rand', 'symbol' => 'R', 'exchange_rate' => 18.800000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'ZMW', 'name' => 'Zambian Kwacha', 'symbol' => 'ZK', 'exchange_rate' => 24.000000, 'is_primary' => false, 'is_active' => true],
            ['code' => 'ZWL', 'name' => 'Zimbabwean Dollar', 'symbol' => '$', 'exchange_rate' => 362.000000, 'is_primary' => false, 'is_active' => true],
        ];

        // Insertar solo las que no existen (usando updateOrCreate para no duplicar)
        foreach ($currencies as $currency) {
            Currency::updateOrCreate(
                ['code' => $currency['code']],
                [
                    'name' => $currency['name'],
                    'symbol' => $currency['symbol'],
                    'exchange_rate' => $currency['exchange_rate'],
                    'is_primary' => $currency['is_primary'],
                    'is_active' => $currency['is_active'],
                ]
            );
        }

        $this->command->info('Currencies seeded successfully. Total: ' . count($currencies));
    }
}
