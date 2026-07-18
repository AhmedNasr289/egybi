-- ============================================================================
-- EgyBI — Egypt Knowledge Base — SQLite schema (LOCAL TESTING ONLY)
-- ============================================================================
-- Mirror of schema_mysql.sql for local dev/testing against the same seed.sql.
-- Production deploys to MySQL on Hostinger via schema_mysql.sql. Column
-- semantics are identical; only the DDL dialect differs.
-- ============================================================================

PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS tourism_source_markets;
DROP TABLE IF EXISTS tourist_sites;
DROP TABLE IF EXISTS tourism_annual;
DROP TABLE IF EXISTS exports;
DROP TABLE IF EXISTS suez_canal_revenue;
DROP TABLE IF EXISTS indicators;
DROP TABLE IF EXISTS modern_leaders;
DROP TABLE IF EXISTS historical_events;
DROP TABLE IF EXISTS historical_eras;
DROP TABLE IF EXISTS megaprojects;
DROP TABLE IF EXISTS monuments;
DROP TABLE IF EXISTS pharaohs;

CREATE TABLE pharaohs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT NOT NULL,
  dynasty         TEXT NOT NULL,
  reign_start     INTEGER,   -- signed year: negative = BCE, positive = CE
  reign_end       INTEGER,
  era             TEXT NOT NULL,
  predecessor_id  INTEGER REFERENCES pharaohs (id),
  certainty_note  TEXT
);

CREATE TABLE monuments (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  name               TEXT NOT NULL,
  pharaoh_id         INTEGER REFERENCES pharaohs (id),
  dynasty            TEXT,
  construction_start INTEGER,   -- signed year: negative = BCE, positive = CE
  construction_end   INTEGER,
  location           TEXT,
  certainty_note     TEXT
);

CREATE TABLE historical_eras (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  start_year  INTEGER,
  end_year    INTEGER,
  era_type    TEXT,
  description  TEXT,
  source_url  TEXT
);

CREATE TABLE historical_events (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  era_id          INTEGER REFERENCES historical_eras (id),
  name            TEXT NOT NULL,
  event_year      INTEGER,
  event_date_note TEXT,
  description     TEXT,
  certainty_note  TEXT,
  source_url      TEXT
);

CREATE TABLE modern_leaders (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT NOT NULL,
  title            TEXT,
  reign_start_year INTEGER,
  reign_end_year   INTEGER,
  era_id           INTEGER REFERENCES historical_eras (id),
  notes            TEXT,
  source_url       TEXT
);

CREATE TABLE indicators (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  category       TEXT NOT NULL,
  indicator_name TEXT NOT NULL,
  indicator_code TEXT,
  year           INTEGER NOT NULL,
  value          REAL,
  unit           TEXT,
  source         TEXT,
  source_url     TEXT,
  note           TEXT
);

CREATE TABLE suez_canal_revenue (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  year           INTEGER NOT NULL,
  period_type    TEXT NOT NULL,
  period_label   TEXT,
  revenue_usd_bn REAL,
  vessels        INTEGER,
  note           TEXT,
  source_url     TEXT
);

CREATE TABLE exports (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  category     TEXT NOT NULL,
  year         INTEGER NOT NULL,
  value_usd_bn REAL,
  pct_of_total REAL,
  source       TEXT,
  source_url   TEXT,
  note         TEXT
);

CREATE TABLE tourism_annual (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  year              INTEGER NOT NULL UNIQUE,
  arrivals_millions REAL,
  revenue_usd_bn    REAL,
  note              TEXT,
  source_url        TEXT
);

CREATE TABLE tourist_sites (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  name                TEXT NOT NULL,
  location            TEXT,
  site_type           TEXT,
  is_unesco           INTEGER NOT NULL DEFAULT 0,
  related_monument_id INTEGER REFERENCES monuments (id),
  note                TEXT,
  source_url          TEXT
);

CREATE TABLE tourism_source_markets (
  id                         INTEGER PRIMARY KEY AUTOINCREMENT,
  country                    TEXT NOT NULL,
  market_rank                INTEGER,
  arrivals_estimate_millions REAL,
  year                       INTEGER,
  confidence                 TEXT,
  source_url                 TEXT
);

CREATE TABLE megaprojects (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT NOT NULL,
  category        TEXT,
  cost_usd_bn     REAL,
  cost_note       TEXT,
  start_year      INTEGER,
  completion_year INTEGER,
  status          TEXT,
  scope           TEXT,
  significance    TEXT,
  source_url      TEXT
);

-- --- v2 enrichment tables (mirror of schema_mysql.sql additions) ---
DROP TABLE IF EXISTS population;
CREATE TABLE population (
  id INTEGER PRIMARY KEY AUTOINCREMENT, year INTEGER NOT NULL UNIQUE,
  population INTEGER, source TEXT, source_url TEXT, note TEXT
);
DROP TABLE IF EXISTS governorates;
CREATE TABLE governorates (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, capital TEXT,
  population INTEGER, area_km2 INTEGER, data_year INTEGER, source_url TEXT,
  census_2017 INTEGER, urban_pct REAL   -- v7: per-governorate map layers
);
DROP TABLE IF EXISTS energy_generation;
CREATE TABLE energy_generation (
  id INTEGER PRIMARY KEY AUTOINCREMENT, fuel TEXT NOT NULL, share_pct REAL,
  year INTEGER, source TEXT, source_url TEXT
);
DROP TABLE IF EXISTS renewable_projects;
CREATE TABLE renewable_projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT,
  capacity_mw INTEGER, location TEXT, status TEXT, source_url TEXT, note TEXT
);
DROP TABLE IF EXISTS agriculture;
CREATE TABLE agriculture (
  id INTEGER PRIMARY KEY AUTOINCREMENT, crop TEXT NOT NULL, figure TEXT,
  year TEXT, source TEXT, source_url TEXT, note TEXT
);
DROP TABLE IF EXISTS water_facts;
CREATE TABLE water_facts (
  id INTEGER PRIMARY KEY AUTOINCREMENT, item TEXT NOT NULL, value TEXT, note TEXT, source_url TEXT
);
DROP TABLE IF EXISTS notable_people;
CREATE TABLE notable_people (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, field TEXT,
  birth_year INTEGER, death_year INTEGER, nobel TEXT, significance TEXT, source_url TEXT
);
DROP TABLE IF EXISTS universities;
CREATE TABLE universities (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, founded_year INTEGER,
  type TEXT, note TEXT, source_url TEXT
);
DROP TABLE IF EXISTS artifacts;
CREATE TABLE artifacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, dated TEXT,
  significance TEXT, current_location TEXT, source_url TEXT
);
DROP TABLE IF EXISTS tech_companies;
CREATE TABLE tech_companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, sector TEXT,
  founded_year INTEGER, milestone TEXT, source_url TEXT
);

-- --- v4 enrichment tables: art & cinema, sports, industry/investment,
-- --- science & space, water & irrigation (mirror of schema_mysql.sql) ---

-- Art & Cinema -------------------------------------------------------------
DROP TABLE IF EXISTS cultural_figures;
CREATE TABLE cultural_figures (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
  domain TEXT,            -- cinema / music / art
  role TEXT,              -- actor, director, singer, composer, painter, sculptor
  birth_year INTEGER,     -- signed year; NULL if unknown
  death_year INTEGER,
  signature_work TEXT, significance TEXT, certainty_note TEXT, source_url TEXT
);
DROP TABLE IF EXISTS cultural_institutions;
CREATE TABLE cultural_institutions (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
  type TEXT, founded_year INTEGER, location TEXT, significance TEXT, source_url TEXT
);
DROP TABLE IF EXISTS film_industry;
CREATE TABLE film_industry (
  id INTEGER PRIMARY KEY AUTOINCREMENT, metric TEXT NOT NULL,
  year INTEGER, value TEXT, note TEXT, source_url TEXT
);

-- Sports -------------------------------------------------------------------
DROP TABLE IF EXISTS athletes;
CREATE TABLE athletes (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, sport TEXT,
  birth_year INTEGER, achievement TEXT, achievement_year TEXT,
  certainty_note TEXT, source_url TEXT
);
DROP TABLE IF EXISTS sports_titles;
CREATE TABLE sports_titles (
  id INTEGER PRIMARY KEY AUTOINCREMENT, holder TEXT NOT NULL, competition TEXT,
  titles INTEGER, detail TEXT, note TEXT, source_url TEXT
);

-- Industry, investment, business, companies --------------------------------
DROP TABLE IF EXISTS industrial_sectors;
CREATE TABLE industrial_sectors (
  id INTEGER PRIMARY KEY AUTOINCREMENT, sector TEXT NOT NULL,
  key_fact TEXT, metric TEXT, year TEXT, source_url TEXT
);
DROP TABLE IF EXISTS major_companies;
CREATE TABLE major_companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, sector TEXT,
  founded_year INTEGER, metric TEXT, metric_value TEXT, significance TEXT, source_url TEXT
);
DROP TABLE IF EXISTS investment_deals;
CREATE TABLE investment_deals (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, year INTEGER,
  value_usd_bn REAL, counterparty TEXT, category TEXT,
  significance TEXT, certainty_note TEXT, source_url TEXT
);

-- Science, space & research ------------------------------------------------
DROP TABLE IF EXISTS satellites;
CREATE TABLE satellites (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, launch_year INTEGER,
  launch_date_note TEXT, purpose TEXT, partner TEXT, status TEXT, source_url TEXT
);
DROP TABLE IF EXISTS research_institutions;
CREATE TABLE research_institutions (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT,
  founded_year INTEGER, location TEXT, significance TEXT, source_url TEXT
);
DROP TABLE IF EXISTS scientists;
CREATE TABLE scientists (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, field TEXT,
  birth_year INTEGER, death_year INTEGER, award TEXT, significance TEXT, source_url TEXT
);

-- Water & irrigation -------------------------------------------------------
DROP TABLE IF EXISTS water_projects;
CREATE TABLE water_projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT,
  scope TEXT, cost_note TEXT, status TEXT, certainty_note TEXT, source_url TEXT
);
DROP TABLE IF EXISTS water_resources;
CREATE TABLE water_resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT, metric TEXT NOT NULL, value_bcm REAL,
  share_pct REAL, category TEXT, note TEXT, source_url TEXT
);

-- --- v5 enrichment tables: transport, education, energy, heritage ---
DROP TABLE IF EXISTS transport_projects;
CREATE TABLE transport_projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT,
  length_km REAL, scope TEXT, cost_usd_bn REAL, status TEXT, partner TEXT, source_url TEXT
);
DROP TABLE IF EXISTS transport_stats;
CREATE TABLE transport_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT, facility TEXT NOT NULL, type TEXT,
  metric TEXT, value TEXT, year INTEGER, source_url TEXT, note TEXT
);
DROP TABLE IF EXISTS university_rankings;
CREATE TABLE university_rankings (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, founded_year INTEGER,
  type TEXT, city TEXT, enrollment INTEGER, qs_rank_2026 TEXT, source_url TEXT
);
DROP TABLE IF EXISTS green_hydrogen_deals;
CREATE TABLE green_hydrogen_deals (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, partner TEXT,
  product TEXT, scope TEXT, location TEXT, status TEXT, source_url TEXT
);
DROP TABLE IF EXISTS unesco_sites;
CREATE TABLE unesco_sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, inscription_year INTEGER,
  site_type TEXT, location TEXT, criteria TEXT, significance TEXT, source_url TEXT
);

-- --- v6 enrichment tables: telecom, trade partners, social media ---
DROP TABLE IF EXISTS telecom_stats;
CREATE TABLE telecom_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT, indicator TEXT NOT NULL, year INTEGER,
  value REAL, unit TEXT, source_url TEXT, note TEXT
);
DROP TABLE IF EXISTS trade_partners;
CREATE TABLE trade_partners (
  id INTEGER PRIMARY KEY AUTOINCREMENT, direction TEXT NOT NULL, partner TEXT NOT NULL,
  value_usd_bn REAL, share_pct REAL, year INTEGER, source_url TEXT, note TEXT
);
DROP TABLE IF EXISTS social_platforms;
CREATE TABLE social_platforms (
  id INTEGER PRIMARY KEY AUTOINCREMENT, platform TEXT NOT NULL, users_millions REAL,
  rank INTEGER, year INTEGER, source_url TEXT, note TEXT
);

-- --- v7 enrichment tables: agriculture/food, health, climate ---
DROP TABLE IF EXISTS crop_production;
CREATE TABLE crop_production (
  id INTEGER PRIMARY KEY AUTOINCREMENT, crop TEXT NOT NULL, year INTEGER,
  production_tonnes INTEGER, source_url TEXT, note TEXT
);
DROP TABLE IF EXISTS food_facts;
CREATE TABLE food_facts (
  id INTEGER PRIMARY KEY AUTOINCREMENT, fact TEXT NOT NULL, value TEXT,
  year TEXT, source_url TEXT, note TEXT
);
DROP TABLE IF EXISTS health_stats;
CREATE TABLE health_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT, indicator TEXT NOT NULL, year INTEGER,
  value REAL, unit TEXT, source_url TEXT, note TEXT
);
DROP TABLE IF EXISTS climate_normals;
CREATE TABLE climate_normals (
  id INTEGER PRIMARY KEY AUTOINCREMENT, place TEXT NOT NULL, avg_temp_c REAL,
  annual_rainfall_mm REAL, source_url TEXT, note TEXT
);
DROP TABLE IF EXISTS economy_series;
CREATE TABLE economy_series (
  id INTEGER PRIMARY KEY AUTOINCREMENT, indicator TEXT NOT NULL, year INTEGER,
  value REAL, unit TEXT, source_url TEXT, note TEXT
);
DROP TABLE IF EXISTS demographics;
CREATE TABLE demographics (
  id INTEGER PRIMARY KEY AUTOINCREMENT, indicator TEXT NOT NULL, value TEXT,
  unit TEXT, year TEXT, source_url TEXT, note TEXT
);

-- --- v8 enrichment tables: businessmen, cinema economics, military, arms,
-- --- football, handball, logistics, megaproject 2026 status ---
DROP TABLE IF EXISTS businessmen;
CREATE TABLE businessmen (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, net_worth_usd_bn REAL,
  year INTEGER, main_company TEXT, sector TEXT, source_url TEXT, note TEXT
);
DROP TABLE IF EXISTS cinema_economics;
CREATE TABLE cinema_economics (
  id INTEGER PRIMARY KEY AUTOINCREMENT, metric TEXT NOT NULL, value TEXT,
  year TEXT, source_url TEXT, note TEXT
);
DROP TABLE IF EXISTS military_strength;
CREATE TABLE military_strength (
  id INTEGER PRIMARY KEY AUTOINCREMENT, metric TEXT NOT NULL, value TEXT,
  year INTEGER, source_url TEXT, note TEXT
);
DROP TABLE IF EXISTS arms_trade;
CREATE TABLE arms_trade (
  id INTEGER PRIMARY KEY AUTOINCREMENT, metric TEXT NOT NULL, value TEXT,
  period TEXT, source_url TEXT, note TEXT
);
DROP TABLE IF EXISTS football;
CREATE TABLE football (
  id INTEGER PRIMARY KEY AUTOINCREMENT, item TEXT NOT NULL, detail TEXT,
  value TEXT, source_url TEXT, note TEXT
);
DROP TABLE IF EXISTS handball;
CREATE TABLE handball (
  id INTEGER PRIMARY KEY AUTOINCREMENT, item TEXT NOT NULL, detail TEXT,
  value TEXT, source_url TEXT, note TEXT
);
DROP TABLE IF EXISTS logistics_projects;
CREATE TABLE logistics_projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, detail TEXT,
  value TEXT, year TEXT, status TEXT, source_url TEXT, note TEXT
);
DROP TABLE IF EXISTS megaproject_status;
CREATE TABLE megaproject_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT, project TEXT NOT NULL, status_2026 TEXT,
  key_figure TEXT, cost_or_scope TEXT, source_url TEXT, note TEXT
);
