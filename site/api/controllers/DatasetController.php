<?php
/**
 * DatasetController — serves dataset "snapshots" for the client-side SQL sandbox.
 *
 * The practice sandbox (sql.js / DuckDB-Wasm) runs entirely in the visitor's
 * browser. It calls these endpoints to pull a real, cited slice of the Egypt
 * knowledge base, then CREATE TABLE + INSERT it locally and let the learner
 * query it. Every response includes column types (so the client can build a
 * correctly-typed table) and the dataset's sources (so citations stay attached).
 *
 * Security: only whitelisted table names in $registry are ever queried — the
 * dataset name from the URL is validated against this map before use, so it can
 * never become arbitrary SQL. Read-only SELECT * only.
 */
class DatasetController
{
    /** Whitelisted, publicly exposable datasets. */
    private static array $registry = [
        'pharaohs'               => 'Pharaohs and dynasties (signed years: negative = BCE).',
        'monuments'              => 'Major ancient monuments and their construction windows.',
        'obelisks'               => 'Surviving ancient Egyptian obelisks and where they stand today.',
        'archaeological_discoveries' => 'Landmark archaeological discoveries, their finders and years.',
        'temples'                => 'Major ancient temples by site and principal deity.',
        'royal_women'            => 'Royal women who held real power, from Hatshepsut to Cleopatra VII.',
        'historical_eras'        => 'Historical eras from the Ptolemaic period to the present.',
        'historical_events'      => 'Key dated events across Egyptian history.',
        'modern_leaders'         => 'Modern rulers from Muhammad Ali to the present.',
        'indicators'             => 'Economy & development time-series indicators (World Bank etc.).',
        'suez_canal_revenue'     => 'Suez Canal revenue by year (fiscal & calendar).',
        'exports'                => 'Top Egyptian export categories (2023).',
        'tourism_annual'         => 'Tourist arrivals and revenue by year.',
        'tourist_sites'          => 'Top tourist sites and attractions.',
        'tourism_source_markets' => 'Leading inbound tourism source markets.',
        'megaprojects'           => 'Modern national development megaprojects.',
        'population'             => 'Total population time series (World Bank).',
        'governorates'           => 'All 27 governorates with population and area.',
        'energy_generation'      => 'Electricity generation mix by fuel (2023).',
        'renewable_projects'     => 'Major solar and wind projects.',
        'agriculture'            => 'Main crops and production figures.',
        'water_facts'            => 'Nile, Lake Nasser, Aswan Dam, and GERD facts.',
        'notable_people'         => 'Notable modern Egyptians, incl. Nobel laureates.',
        'universities'           => 'Major Egyptian universities and founding years.',
        'artifacts'              => 'Famous artifacts (Rosetta Stone, Dendera Zodiac, ...).',
        'tech_companies'         => 'Egyptian tech & fintech ecosystem (Fawry, InstaPay, ...).',
        // --- v4: art & cinema, sports, industry, science & space, water ---
        'cultural_figures'       => 'Cinema, music & art icons (Chahine, Umm Kulthum, Mokhtar, ...).',
        'cultural_institutions'  => 'Cultural institutions (Studio Misr, CIFF, GEM, Cairo Opera, ...).',
        'film_industry'          => 'Egyptian film-industry facts, CIFF winners & box office.',
        'athletes'               => 'Notable Egyptian athletes (Salah, El Sherbini, Asal, ...).',
        'sports_titles'          => 'Team & national sporting title tallies (AFCON, CAF CL, squash).',
        'industrial_sectors'     => 'Major industrial sectors and their GDP/export weight.',
        'major_companies'        => 'Largest Egyptian companies (CIB, NBE, Elsewedy, Ezz Steel, ...).',
        'investment_deals'       => 'Landmark investment & IMF deals (Ras El Hekma, SCZONE, ...).',
        'satellites'             => 'Egyptian satellites (EgyptSat, Tiba-1, Nilesat 301, ...).',
        'research_institutions'  => 'Science & space institutions (EgSA, Zewail City, NRC, ...).',
        'scientists'             => 'Modern Egyptian scientists (Zewail, El-Baz, El-Sayed, ...).',
        'water_projects'         => 'Irrigation, land-reclamation & desalination megaprojects.',
        'water_resources'        => 'Water usage split, resources and the structural deficit.',
        // --- v5: transport, education, energy depth, heritage ---
        'transport_projects'     => 'Metro, monorail, high-speed rail & LRT projects.',
        'transport_stats'        => 'Ports, airports, roads, rail & the record bridge.',
        'university_rankings'    => 'Egyptian universities in the QS World Rankings 2026.',
        'green_hydrogen_deals'   => 'Green-hydrogen & ammonia deals (all flagged MoU/FID).',
        'unesco_sites'           => 'The seven UNESCO World Heritage Sites in Egypt.',
        // --- v6: telecom, trade, social media ---
        'telecom_stats'          => 'Mobile, broadband & internet-user time series + speeds.',
        'trade_partners'         => 'Top export destinations & import origins (2023).',
        'social_platforms'       => 'Most-used social platforms in Egypt (2025).',
        // --- v7: agriculture/food, health, climate, economy, demography ---
        'crop_production'        => 'Crop-production time series (FAOSTAT, 2015-2023).',
        'food_facts'             => 'Food-security facts (wheat imports, land, self-sufficiency).',
        'health_stats'           => 'Health-system indicators (beds, doctors, fertility, mortality).',
        'climate_normals'        => 'Temperature & rainfall normals + national climate facts.',
        'economy_series'         => 'Deeper economy series (debt, EGX30, current account, savings).',
        'demographics'           => 'Population composition (age, urban/rural, religion, languages).',
        // --- v8: business, culture economics, defence, sport, logistics ---
        'businessmen'            => 'Prominent Egyptian businessmen & their net worth (Forbes).',
        'cinema_economics'       => 'The business side of Egyptian cinema (box office, exports).',
        'military_strength'      => 'Armed-forces global standing (public Global Firepower figures).',
        'arms_trade'             => 'Egypt as an arms importer (public SIPRI figures).',
        'football'               => 'Football depth (league, Salah, the national team).',
        'handball'               => 'Handball depth (Worlds, Olympics, African titles).',
        'logistics_projects'     => 'Logistics zones, dry ports & the LPI ranking.',
        'megaproject_status'     => 'National mega-projects — their 2026 status.',
    ];

    public static function list(array $config): array
    {
        $items = [];
        foreach (self::$registry as $name => $desc) {
            $items[] = ['name' => $name, 'description' => $desc];
        }
        return Response::ok($items, ['count' => count($items)]);
    }

    public static function snapshot(array $config, string $name): array
    {
        if (!isset(self::$registry[$name])) {
            Response::error("Unknown dataset '{$name}'. Call /datasets for the list.", 404);
        }

        // $name is a validated whitelist key, safe to use as a table identifier.
        $rows = Database::query($config, "SELECT * FROM {$name}");

        $columns = [];
        $orderedRows = [];
        if (!empty($rows)) {
            $colNames = array_keys($rows[0]);
            foreach ($colNames as $col) {
                $columns[] = ['name' => $col, 'type' => self::inferType($rows, $col)];
            }
            foreach ($rows as $r) {
                $line = [];
                foreach ($colNames as $col) {
                    $line[] = self::coerce($r[$col]);
                }
                $orderedRows[] = $line;
            }
        }

        return Response::ok([
            'dataset'          => $name,
            'description'      => self::$registry[$name],
            'columns'          => $columns,
            'rows'             => $orderedRows,
            'row_count'        => count($orderedRows),
            'create_table_sql' => self::buildCreateTable($name, $columns),
            'sources'          => self::sourcesFor($rows),
        ]);
    }

    /** Infer INTEGER / REAL / TEXT for a column from its actual values. */
    private static function inferType(array $rows, string $col): string
    {
        $seen = false;
        $allInt = true;
        $allNum = true;
        foreach ($rows as $r) {
            $v = $r[$col];
            if ($v === null || $v === '') {
                continue;
            }
            $seen = true;
            $s = (string)$v;
            if (!preg_match('/^-?\d+$/', $s)) {
                $allInt = false;
            }
            if (!is_numeric($s)) {
                $allNum = false;
            }
        }
        if (!$seen) {
            return 'TEXT';
        }
        if ($allInt) {
            return 'INTEGER';
        }
        if ($allNum) {
            return 'REAL';
        }
        return 'TEXT';
    }

    /** Coerce string PDO values to native ints/floats so JSON types are clean. */
    private static function coerce($v)
    {
        if ($v === null) {
            return null;
        }
        $s = (string)$v;
        if (preg_match('/^-?\d+$/', $s)) {
            return (int)$s;
        }
        if (is_numeric($s)) {
            return (float)$s;
        }
        return $v;
    }

    private static function buildCreateTable(string $name, array $columns): string
    {
        $defs = [];
        foreach ($columns as $c) {
            $defs[] = "\"{$c['name']}\" {$c['type']}";
        }
        return "CREATE TABLE {$name} (" . implode(', ', $defs) . ");";
    }

    /** Pull distinct source_url values (if the table has one) so citations travel with the data. */
    private static function sourcesFor(array $rows): array
    {
        if (empty($rows) || !array_key_exists('source_url', $rows[0])) {
            return [];
        }
        $urls = [];
        foreach ($rows as $r) {
            if (!empty($r['source_url'])) {
                $urls[$r['source_url']] = true;
            }
        }
        return array_keys($urls);
    }
}
