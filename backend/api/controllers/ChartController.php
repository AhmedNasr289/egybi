<?php
/**
 * ChartController — pre-shaped, aggregated data for server-rendered dashboards
 * and charts (the "Explore Egypt Data" section). Each endpoint returns data
 * already ordered and grouped for a specific visualization, so the frontend
 * charting layer (Chart.js etc.) can consume it directly.
 *
 * All queries are fixed SELECTs against the knowledge base — read-only, no user
 * input reaches the SQL.
 */
class ChartController
{
    public static function gdp(array $config): array
    {
        $rows = Database::query($config,
            "SELECT year, value, note FROM indicators
             WHERE indicator_name = 'GDP (current US\$)' ORDER BY year");
        return Response::ok([
            'title'  => 'Egypt GDP (current US$)',
            'unit'   => 'USD billion',
            'series' => $rows,
            'source' => 'World Bank (NY.GDP.MKTP.CD)',
            'note'   => 'Nominal-USD swings (2017, 2022-24) largely reflect EGP devaluations, not real contraction.',
        ]);
    }

    public static function suezRevenue(array $config): array
    {
        // Calendar-year series for a clean single line; fiscal-year rows are flagged separately.
        $rows = Database::query($config,
            "SELECT year, period_type, period_label, revenue_usd_bn, vessels, note
             FROM suez_canal_revenue ORDER BY year, period_type");
        return Response::ok([
            'title'  => 'Suez Canal Revenue',
            'unit'   => 'USD billion',
            'series' => $rows,
            'source' => 'Suez Canal Authority / news reporting',
            'note'   => 'Mixes fiscal-year (FY) and calendar-year (CY) rows - see period_type. The 2024 collapse reflects Red Sea shipping disruption from Nov 2023.',
        ]);
    }

    public static function tourism(array $config): array
    {
        $rows = Database::query($config,
            "SELECT year, arrivals_millions, revenue_usd_bn, note FROM tourism_annual ORDER BY year");
        return Response::ok([
            'title'  => 'Egypt Tourism - Arrivals & Revenue',
            'series' => $rows,
            'units'  => ['arrivals_millions' => 'million visitors', 'revenue_usd_bn' => 'USD billion'],
            'source' => 'Ministry of Tourism & Antiquities / CBE / UNWTO',
            'note'   => '2025 (~19M) is officially confirmed via SIS/the Minister. 2021 revenue is disputed between sources.',
        ]);
    }

    public static function gdpComposition(array $config): array
    {
        $rows = Database::query($config,
            "SELECT indicator_name, year, value FROM indicators
             WHERE indicator_code IN ('NV.AGR.TOTL.ZS','NV.IND.TOTL.ZS','NV.SRV.TOTL.ZS')
             ORDER BY year, indicator_name");
        // Group into series keyed by sector for a stacked chart.
        $bySector = [];
        foreach ($rows as $r) {
            $sector = str_replace(', value added (% of GDP)', '', $r['indicator_name']);
            $bySector[$sector][] = ['year' => (int)$r['year'], 'value' => (float)$r['value']];
        }
        return Response::ok([
            'title'   => 'GDP Composition by Sector',
            'unit'    => '% of GDP',
            'sectors' => $bySector,
            'source'  => 'World Bank (value added, % of GDP)',
            'note'    => 'Shares sum to ~95%; the residual is taxes-less-subsidies (World Bank methodology).',
        ]);
    }

    public static function exports(array $config): array
    {
        $rows = Database::query($config,
            "SELECT category, value_usd_bn, pct_of_total FROM exports ORDER BY value_usd_bn DESC");
        return Response::ok([
            'title'  => 'Top Egyptian Export Categories (2023)',
            'unit'   => 'USD billion',
            'series' => $rows,
            'source' => 'Lloyds Bank / Coface trade profile',
        ]);
    }

    public static function timeline(array $config): array
    {
        $eras = Database::query($config,
            "SELECT id, name, start_year, end_year, era_type, description FROM historical_eras ORDER BY start_year");
        $events = Database::query($config,
            "SELECT era_id, name, event_year, event_date_note, description, certainty_note
             FROM historical_events ORDER BY event_year");
        return Response::ok([
            'title'  => 'Egypt Through the Ages',
            'eras'   => $eras,
            'events' => $events,
            'note'   => 'Years are signed: negative = BCE, positive = CE.',
        ]);
    }

    public static function megaprojects(array $config): array
    {
        $rows = Database::query($config,
            "SELECT name, category, cost_usd_bn, cost_note, start_year, completion_year, status, scope, significance, source_url
             FROM megaprojects ORDER BY completion_year IS NULL DESC, completion_year DESC");
        return Response::ok([
            'title'   => 'Modern Egypt - National Megaprojects',
            'projects' => $rows,
        ]);
    }

    /** A handful of headline "stat" figures for the landing-page animated counters. */
    public static function highlights(array $config): array
    {
        $tourism = Database::query($config,
            "SELECT arrivals_millions, revenue_usd_bn FROM tourism_annual WHERE year = 2025");
        $gdp = Database::query($config,
            "SELECT value FROM indicators WHERE indicator_name = 'GDP (current US\$)' ORDER BY year DESC LIMIT 1");
        $pepi = Database::query($config,
            "SELECT (reign_end - reign_start) AS yrs FROM pharaohs WHERE name = 'Pepi II'");
        return Response::ok([
            'tourists_2025_millions' => $tourism[0]['arrivals_millions'] ?? null,
            'tourism_revenue_2025_bn' => $tourism[0]['revenue_usd_bn'] ?? null,
            'gdp_latest_bn'          => $gdp[0]['value'] ?? null,
            'longest_reign_years'    => $pepi[0]['yrs'] ?? null,
            'note' => 'Real figures from the knowledge base. Pepi II 94-year reign is the traditional (disputed) Turin King List figure.',
        ]);
    }

    public static function population(array $config): array
    {
        $rows = Database::query($config, "SELECT year, population, note FROM population ORDER BY year");
        return Response::ok([
            'title'  => 'Egypt Population',
            'unit'   => 'people',
            'series' => $rows,
            'source' => 'World Bank (SP.POP.TOTL)',
            'note'   => 'WB/UN de-facto estimate; CAPMAS (residents in Egypt) reports a lower figure - a real methodology gap.',
        ]);
    }

    public static function energy(array $config): array
    {
        $rows = Database::query($config, "SELECT fuel, share_pct FROM energy_generation ORDER BY share_pct DESC");
        return Response::ok([
            'title'  => 'Electricity Generation Mix (2023)',
            'unit'   => '% of generation',
            'series' => $rows,
            'source' => 'Ember',
            'note'   => 'The grid is ~88% fossil (mostly natural gas); wind + solar rose to ~5% by 2023.',
        ]);
    }

    public static function governorates(array $config): array
    {
        $rows = Database::query($config,
            "SELECT name, capital, population, area_km2 FROM governorates ORDER BY population DESC LIMIT 12");
        return Response::ok([
            'title'  => 'Largest Governorates by Population',
            'series' => $rows,
            'source' => 'CAPMAS (Nov 2023 estimate)',
            'note'   => 'Top 12 of 27 governorates. Over 95% of Egyptians live on ~4% of the land (Nile Valley/Delta).',
        ]);
    }

    /** Inflation and EGP/USD together — the FX-crisis story on one chart. */
    public static function prices(array $config): array
    {
        $inflation = Database::query($config,
            "SELECT year, value FROM indicators WHERE indicator_code = 'FP.CPI.TOTL.ZG' ORDER BY year");
        $fx = Database::query($config,
            "SELECT year, value FROM indicators WHERE indicator_code = 'PA.NUS.FCRF' ORDER BY year");
        return Response::ok([
            'title'     => 'Inflation & the Egyptian Pound',
            'inflation' => $inflation,
            'exchange'  => $fx,
            'source'    => 'World Bank (FP.CPI.TOTL.ZG, PA.NUS.FCRF)',
            'note'      => 'The 2017 and 2023 inflation spikes track the 2016 float and the 2022-24 devaluations. Exchange rate is a period average; year-end 2024 was ~50.9.',
        ]);
    }

    public static function digital(array $config): array
    {
        $ict = Database::query($config,
            "SELECT year, value, note FROM indicators WHERE indicator_name = 'ICT sector share of GDP' ORDER BY year");
        $companies = Database::query($config,
            "SELECT name, sector, founded_year, milestone FROM tech_companies ORDER BY founded_year");
        return Response::ok([
            'title'        => 'The Digital Economy',
            'ict_gdp_share' => $ict,
            'companies'    => $companies,
            'source'       => 'MCIT / company reporting',
            'note'         => 'The ICT sector nearly doubled its GDP share (3.2% to 5.8%) and was the fastest-growing sector for ~7 years.',
        ]);
    }

    /** Water-use split (doughnut) + the irrigation/desalination megaprojects. */
    public static function waterUsage(array $config): array
    {
        $usage = Database::query($config,
            "SELECT metric, share_pct, value_bcm, note FROM water_resources
             WHERE category = 'usage' ORDER BY share_pct DESC");
        $projects = Database::query($config,
            "SELECT name, category, scope, status FROM water_projects ORDER BY id");
        return Response::ok([
            'title'    => 'Water Use & Irrigation',
            'usage'    => $usage,
            'projects' => $projects,
            'unit'     => 'share of national water use (%)',
            'source'   => 'FAO AQUASTAT / Ministry of Water Resources & Irrigation',
            'note'     => 'Agriculture dominates at ~86%. FAO shares rest on a 2010 baseline - the proportion is stable, the absolute volume is dated.',
        ]);
    }

    /** Sporting title tallies (bar). Mixed competitions - see note. */
    public static function sportsTitles(array $config): array
    {
        $rows = Database::query($config,
            "SELECT holder, competition, titles, detail, note FROM sports_titles ORDER BY titles DESC");
        return Response::ok([
            'title'  => 'Egyptian Sporting Titles',
            'series' => $rows,
            'source' => 'CAF / FIFA / PSA / Egyptian Olympic Committee',
            'note'   => 'Mixes competition types (AFCON, CAF Champions League, squash worlds, Olympic medals) - compare within a competition, not across.',
        ]);
    }

    /** Transport & infrastructure — projects + facility stats. */
    public static function transport(array $config): array
    {
        $projects = Database::query($config,
            "SELECT name, type, length_km, cost_usd_bn, status FROM transport_projects ORDER BY length_km DESC");
        $stats = Database::query($config,
            "SELECT facility, type, metric, value, year FROM transport_stats ORDER BY type, facility");
        return Response::ok([
            'title'    => 'Transport & Infrastructure',
            'projects' => $projects,
            'stats'    => $stats,
            'source'   => 'Siemens / Alstom / Vinci / port & airport authorities / Wikipedia',
            'note'     => 'The Siemens high-speed-rail network is still under construction (nothing operational yet); costs are approximate. Port TEU figures come from aggregators.',
        ]);
    }

    /** Egyptian universities in the QS World University Rankings 2026. */
    public static function universities(array $config): array
    {
        $rows = Database::query($config,
            "SELECT name, founded_year, type, city, enrollment, qs_rank_2026 FROM university_rankings ORDER BY founded_year");
        return Response::ok([
            'title'  => 'Universities (QS World Rankings 2026)',
            'series' => $rows,
            'source' => 'QS World University Rankings 2026 / university profiles',
            'note'   => 'QS 2026 ranks; some are bands (e.g. 1201-1400). 20 Egyptian universities made QS 2026, up from 15.',
        ]);
    }

    /** Energy time series — electricity generation & the renewable share. */
    public static function energyTrend(array $config): array
    {
        $gen = Database::query($config,
            "SELECT year, value FROM indicators WHERE indicator_name = 'Total electricity generation' ORDER BY year");
        $ren = Database::query($config,
            "SELECT year, value FROM indicators WHERE indicator_name = 'Renewable electricity share' ORDER BY year");
        return Response::ok([
            'title'      => 'Electricity: generation & renewable share',
            'generation' => $gen,
            'renewable_share' => $ren,
            'units'      => ['generation' => 'TWh', 'renewable_share' => '% of generation'],
            'source'     => 'Ember / IRENA via Our World in Data',
            'note'       => 'Generation keeps climbing; the renewable share dipped after 2020 as gas capacity grew faster than wind and solar.',
        ]);
    }

    /** Telecom & internet — the connectivity climb. */
    public static function telecom(array $config): array
    {
        $internet = Database::query($config,
            "SELECT year, value FROM telecom_stats WHERE indicator = 'Internet users' ORDER BY year");
        $mobile = Database::query($config,
            "SELECT year, value FROM telecom_stats WHERE indicator = 'Mobile subscriptions' ORDER BY year");
        $broadband = Database::query($config,
            "SELECT year, value FROM telecom_stats WHERE indicator = 'Fixed broadband' ORDER BY year");
        return Response::ok([
            'title'          => 'Connectivity in Egypt',
            'internet_users' => $internet,
            'mobile_per_100' => $mobile,
            'fixed_broadband_per_100' => $broadband,
            'source'         => 'World Bank / ITU; DataReportal & Ookla for 2025',
            'note'           => 'The 2019 jump in internet use is a survey/methodology break, not organic growth. Mobile subs per 100 dipped in 2018 after a SIM re-registration clean-up.',
        ]);
    }

    /** Top trade partners — export destinations & import origins (2023). */
    public static function tradePartners(array $config): array
    {
        $exports = Database::query($config,
            "SELECT partner, value_usd_bn, share_pct FROM trade_partners WHERE direction = 'export' ORDER BY value_usd_bn DESC");
        $imports = Database::query($config,
            "SELECT partner, value_usd_bn, share_pct FROM trade_partners WHERE direction = 'import' ORDER BY value_usd_bn DESC");
        return Response::ok([
            'title'   => 'Egypt trade partners (2023)',
            'exports' => $exports,
            'imports' => $imports,
            'unit'    => 'US$ billion',
            'source'  => 'OEC / UN Comtrade mirror',
            'note'    => 'China dominates imports (~15.5%); exports are more spread out, led by Turkiye and Italy. Figures differ modestly from CAPMAS national statistics.',
        ]);
    }

    /** Most-used social platforms in Egypt (2025). */
    public static function social(array $config): array
    {
        $rows = Database::query($config,
            "SELECT platform, users_millions, rank FROM social_platforms ORDER BY rank");
        return Response::ok([
            'title'  => 'Most-used social platforms (2025)',
            'series' => $rows,
            'unit'   => 'million users (ad reach)',
            'source' => 'DataReportal Digital 2025 Egypt',
            'note'   => 'Ranked by reported advertising reach, not unique individuals — figures can exceed the eligible-age population and should be read as reach, not headcount.',
        ]);
    }

    /** Crop-production time series (FAOSTAT) — the food staples. */
    public static function crops(array $config): array
    {
        $rows = Database::query($config,
            "SELECT crop, year, production_tonnes FROM crop_production
             WHERE crop IN ('Wheat','Rice (paddy)','Maize') ORDER BY crop, year");
        return Response::ok([
            'title'  => 'Crop production (million tonnes)',
            'series' => $rows,
            'source' => 'FAOSTAT (Crops & Livestock Products, official 2015-2023)',
            'note'   => 'Egypt grows ~9M tonnes of wheat a year yet is still the world largest wheat importer — domestic output cannot keep up with ~106M mouths. Rice dipped hard in 2018 when acreage was cut to save Nile water.',
        ]);
    }

    /** Health system — fertility fall + hospital-bed strain. */
    public static function health(array $config): array
    {
        $fertility = Database::query($config,
            "SELECT year, value FROM health_stats WHERE indicator = 'Total fertility rate' ORDER BY year");
        $beds = Database::query($config,
            "SELECT year, value FROM health_stats WHERE indicator = 'Hospital beds' ORDER BY year");
        return Response::ok([
            'title'      => 'Health: fertility & hospital capacity',
            'fertility'  => $fertility,
            'hospital_beds' => $beds,
            'units'      => ['fertility' => 'births per woman', 'hospital_beds' => 'per 1,000 people'],
            'source'     => 'World Bank / WHO Global Health Observatory',
            'note'       => 'Fertility fell from a 2014 peak of ~3.5 toward ~2.75, but hospital beds per 1,000 keep sliding as the population grows faster than capacity. The flat 2021-2023 fertility is likely a carried-forward estimate.',
        ]);
    }

    /** Deeper economy — external debt & the EGX30 boom. */
    public static function economyDepth(array $config): array
    {
        $debt = Database::query($config,
            "SELECT year, value FROM economy_series WHERE indicator = 'External debt stocks' ORDER BY year");
        $egx = Database::query($config,
            "SELECT year, value FROM economy_series WHERE indicator = 'EGX30 index (year-end)' ORDER BY year");
        return Response::ok([
            'title'  => 'External debt & the EGX30',
            'external_debt_usd_bn' => $debt,
            'egx30' => $egx,
            'source' => 'World Bank (external debt) / EGX (index)',
            'note'   => 'External debt peaked at ~$168bn in 2023 before IMF and Ras El Hekma inflows eased it. The EGX30 quadrupled 2020-2025 — partly a real boom, partly investors using equities to outrun inflation.',
        ]);
    }

    /** Climate normals for the three reference cities. */
    public static function climate(array $config): array
    {
        $rows = Database::query($config,
            "SELECT place, avg_temp_c, annual_rainfall_mm, note FROM climate_normals
             WHERE place IN ('Cairo','Alexandria','Aswan') ORDER BY annual_rainfall_mm DESC");
        return Response::ok([
            'title'  => 'Climate normals',
            'series' => $rows,
            'source' => 'climate-data.org / World Bank Climate Knowledge Portal',
            'note'   => 'Alexandria on the coast gets ~181mm of rain a year; Cairo and Aswan get ~10mm. About 96% of Egypt is desert, which is why the Nile is existential.',
        ]);
    }

    /** Egypt's wealthiest — net worth (Forbes). */
    public static function businessmen(array $config): array
    {
        $rows = Database::query($config,
            "SELECT name, net_worth_usd_bn, main_company, sector FROM businessmen
             WHERE net_worth_usd_bn IS NOT NULL ORDER BY net_worth_usd_bn DESC");
        return Response::ok([
            'title'  => 'Egypt richest, by net worth (US$ billion)',
            'series' => $rows,
            'source' => 'Forbes real-time billionaires / Billionaires.Africa (stake values, flagged)',
            'note'   => 'Point-in-time estimates that move with share prices and the pound. Nassef Sawiris leads; the Sawiris and Mansour families dominate. Ahmed Ezz and Safwan Thabet are stake valuations, not Forbes-listed net worth.',
        ]);
    }

    /** Arms imports — Egypt's top supplier countries (SIPRI, public). */
    public static function armsSuppliers(array $config): array
    {
        $rows = Database::query($config,
            "SELECT metric, value FROM arms_trade WHERE metric LIKE 'Top supplier%' ORDER BY metric");
        return Response::ok([
            'title'  => 'Egypt arms imports, by supplier (2020-2024)',
            'series' => $rows,
            'source' => 'SIPRI Arms Transfers Database (public)',
            'note'   => 'Germany, Italy and France now supply the bulk of Egypt imports — a European shift. Egypt fell from the world 3rd-largest arms importer (2015-19) to 8th (2020-24), a 44% drop in volume. Figures and shares only.',
        ]);
    }

    /** Industry sectors + largest companies + landmark investment deals. */
    public static function industry(array $config): array
    {
        $sectors = Database::query($config,
            "SELECT sector, key_fact, metric, year FROM industrial_sectors ORDER BY id");
        $companies = Database::query($config,
            "SELECT name, sector, founded_year, metric, metric_value, significance FROM major_companies ORDER BY founded_year");
        $deals = Database::query($config,
            "SELECT name, year, value_usd_bn, counterparty, category, certainty_note FROM investment_deals ORDER BY value_usd_bn DESC");
        return Response::ok([
            'title'     => 'Industry, Companies & Investment',
            'sectors'   => $sectors,
            'companies' => $companies,
            'deals'     => $deals,
            'source'    => 'Wikipedia / CEOWORLD / IMF / Bloomberg / Arab News',
            'note'      => 'Deal values are headline figures; SCZONE cumulative totals and privatization targets are approximate/moving (see certainty_note).',
        ]);
    }
}
