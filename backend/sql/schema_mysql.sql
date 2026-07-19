-- ============================================================================
-- EgyBI — Egypt Knowledge Base — MySQL schema (for Hostinger MySQL / MariaDB)
-- ============================================================================
-- A single, normalized relational knowledge base combining ancient-Egypt
-- reference tables with modern history, economics, tourism, and development
-- data. Every table carries source / note columns so each fact stays cited and
-- any disputed/approximate figure can be flagged in-row (project content rule).
--
-- Import order: run this file first (creates tables), then seed.sql (inserts).
-- Charset utf8mb4 throughout so Arabic names/notes are safe to store later.
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------------
-- ANCIENT EGYPT
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS pharaohs;
CREATE TABLE pharaohs (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name            VARCHAR(120) NOT NULL,
  dynasty         VARCHAR(40)  NOT NULL,
  reign_start     INT          NULL,   -- signed year: negative = BCE (-2589 = 2589 BCE), positive = CE
  reign_end       INT          NULL,   -- reign length = reign_end - reign_start (both signed)
  era             VARCHAR(60)  NOT NULL,
  predecessor_id  INT UNSIGNED NULL,   -- self-reference for well-documented succession chains
  certainty_note  VARCHAR(400) NULL,   -- flags disputed dates / reign lengths
  PRIMARY KEY (id),
  KEY idx_pharaohs_dynasty (dynasty),
  KEY idx_pharaohs_era (era),
  CONSTRAINT fk_pharaohs_predecessor FOREIGN KEY (predecessor_id) REFERENCES pharaohs (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS monuments;
CREATE TABLE monuments (
  id                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name                  VARCHAR(160) NOT NULL,
  pharaoh_id            INT UNSIGNED NULL,   -- commissioning pharaoh, where attributable
  dynasty               VARCHAR(60)  NULL,
  construction_start    INT          NULL,   -- signed year: negative = BCE, positive = CE
  construction_end      INT          NULL,
  location              VARCHAR(120) NULL,
  certainty_note        VARCHAR(400) NULL,   -- e.g. Sphinx attribution dispute
  PRIMARY KEY (id),
  KEY idx_monuments_location (location),
  CONSTRAINT fk_monuments_pharaoh FOREIGN KEY (pharaoh_id) REFERENCES pharaohs (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- MODERN HISTORY (Ptolemaic -> present)
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS historical_eras;
CREATE TABLE historical_eras (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(120) NOT NULL,
  start_year  INT NULL,   -- negative = BCE (e.g. -305 = 305 BCE), positive = CE
  end_year    INT NULL,   -- NULL = ongoing / present
  era_type    VARCHAR(60) NULL,  -- e.g. 'Hellenistic','Roman','Islamic','Modern Republic'
  description TEXT NULL,
  source_url  VARCHAR(400) NULL,
  PRIMARY KEY (id),
  KEY idx_eras_start (start_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS historical_events;
CREATE TABLE historical_events (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  era_id         INT UNSIGNED NULL,
  name           VARCHAR(200) NOT NULL,
  event_year     INT NULL,   -- negative = BCE
  event_date_note VARCHAR(120) NULL,  -- exact day / month if known
  description    TEXT NULL,
  certainty_note VARCHAR(400) NULL,   -- flags disputed dates
  source_url     VARCHAR(400) NULL,
  PRIMARY KEY (id),
  KEY idx_events_year (event_year),
  CONSTRAINT fk_events_era FOREIGN KEY (era_id) REFERENCES historical_eras (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS modern_leaders;
CREATE TABLE modern_leaders (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name             VARCHAR(120) NOT NULL,
  title            VARCHAR(120) NULL,   -- Pasha / Khedive / King / President
  reign_start_year INT NULL,
  reign_end_year   INT NULL,   -- NULL = incumbent
  era_id           INT UNSIGNED NULL,
  notes            VARCHAR(500) NULL,
  source_url       VARCHAR(400) NULL,
  PRIMARY KEY (id),
  KEY idx_leaders_start (reign_start_year),
  CONSTRAINT fk_leaders_era FOREIGN KEY (era_id) REFERENCES historical_eras (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- ECONOMY
-- ---------------------------------------------------------------------------

-- Generic time-series table for pure (year, value) metrics — economy & development.
DROP TABLE IF EXISTS indicators;
CREATE TABLE indicators (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  category       VARCHAR(40)  NOT NULL,  -- 'economy' | 'development'
  indicator_name VARCHAR(160) NOT NULL,  -- e.g. 'GDP (current US$)'
  indicator_code VARCHAR(60)  NULL,      -- e.g. World Bank 'NY.GDP.MKTP.CD'
  year           INT          NOT NULL,
  value          DECIMAL(18,4) NULL,
  unit           VARCHAR(60)  NULL,      -- 'USD billion','% of GDP','% of population'
  source         VARCHAR(120) NULL,
  source_url     VARCHAR(400) NULL,
  note           VARCHAR(400) NULL,
  PRIMARY KEY (id),
  KEY idx_ind_cat (category),
  KEY idx_ind_name_year (indicator_name, year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS suez_canal_revenue;
CREATE TABLE suez_canal_revenue (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  year           INT NOT NULL,
  period_type    VARCHAR(10) NOT NULL,  -- 'CY' (calendar) | 'FY' (fiscal, Jul-Jun)
  period_label   VARCHAR(30) NULL,      -- e.g. 'FY2022/23'
  revenue_usd_bn DECIMAL(8,3) NULL,
  vessels        INT NULL,
  note           VARCHAR(400) NULL,     -- flags Red Sea disruption etc.
  source_url     VARCHAR(400) NULL,
  PRIMARY KEY (id),
  KEY idx_suez_year (year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS exports;
CREATE TABLE exports (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  category     VARCHAR(120) NOT NULL,   -- e.g. 'Petroleum & electricity'
  year         INT NOT NULL,
  value_usd_bn DECIMAL(8,3) NULL,
  pct_of_total DECIMAL(6,2) NULL,
  source       VARCHAR(120) NULL,
  source_url   VARCHAR(400) NULL,
  note         VARCHAR(400) NULL,
  PRIMARY KEY (id),
  KEY idx_exports_year (year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- TOURISM
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS tourism_annual;
CREATE TABLE tourism_annual (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  year              INT NOT NULL,
  arrivals_millions DECIMAL(6,2) NULL,
  revenue_usd_bn    DECIMAL(7,3) NULL,
  note              VARCHAR(400) NULL,
  source_url        VARCHAR(400) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tourism_year (year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS tourist_sites;
CREATE TABLE tourist_sites (
  id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name                VARCHAR(160) NOT NULL,
  location            VARCHAR(120) NULL,
  site_type           VARCHAR(60)  NULL,   -- 'Ancient monument','Museum','Resort'
  is_unesco           TINYINT(1)   NOT NULL DEFAULT 0,
  related_monument_id INT UNSIGNED NULL,   -- links to monuments where applicable
  note                VARCHAR(400) NULL,
  source_url          VARCHAR(400) NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_sites_monument FOREIGN KEY (related_monument_id) REFERENCES monuments (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS tourism_source_markets;
CREATE TABLE tourism_source_markets (
  id                        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  country                   VARCHAR(80) NOT NULL,
  market_rank               INT NULL,
  arrivals_estimate_millions DECIMAL(6,2) NULL,
  year                      INT NULL,
  confidence                VARCHAR(30) NULL,  -- 'official' | 'press-estimate'
  source_url                VARCHAR(400) NULL,
  PRIMARY KEY (id),
  KEY idx_markets_year (year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- NATIONAL DEVELOPMENT / MEGAPROJECTS
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS megaprojects;
CREATE TABLE megaprojects (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name            VARCHAR(160) NOT NULL,
  category        VARCHAR(80)  NULL,   -- 'Urban','Culture','Infrastructure','Energy'
  cost_usd_bn     DECIMAL(8,2) NULL,
  cost_note       VARCHAR(400) NULL,   -- flags estimate ranges
  start_year      INT NULL,
  completion_year INT NULL,
  status          VARCHAR(60)  NULL,   -- 'Operational','Partially complete','Under construction'
  scope           VARCHAR(500) NULL,
  significance    VARCHAR(500) NULL,
  source_url      VARCHAR(400) NULL,
  PRIMARY KEY (id),
  KEY idx_mega_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- DEMOGRAPHY & GEOGRAPHY
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS population;
CREATE TABLE population (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  year       INT NOT NULL,
  population BIGINT NULL,
  source     VARCHAR(120) NULL,
  source_url VARCHAR(400) NULL,
  note       VARCHAR(400) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pop_year (year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS governorates;
CREATE TABLE governorates (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(80) NOT NULL,
  capital    VARCHAR(80) NULL,
  population  BIGINT NULL,
  area_km2    INT NULL,
  data_year   INT NULL,
  source_url  VARCHAR(400) NULL,
  census_2017 INT NULL,          -- v7: 2017 CAPMAS census population (map layer)
  urban_pct   DECIMAL(5,2) NULL, -- v7: urban share % (~2016 CAPMAS proxy, map layer)
  PRIMARY KEY (id),
  KEY idx_gov_pop (population)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- ENERGY & RESOURCES
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS energy_generation;
CREATE TABLE energy_generation (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  fuel       VARCHAR(60) NOT NULL,
  share_pct  DECIMAL(5,2) NULL,
  year       INT NULL,
  source     VARCHAR(120) NULL,
  source_url VARCHAR(400) NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS renewable_projects;
CREATE TABLE renewable_projects (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(120) NOT NULL,
  type        VARCHAR(40) NULL,      -- solar | wind
  capacity_mw INT NULL,
  location    VARCHAR(120) NULL,
  status      VARCHAR(60) NULL,
  source_url  VARCHAR(400) NULL,
  note        VARCHAR(300) NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS agriculture;
CREATE TABLE agriculture (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  crop       VARCHAR(60) NOT NULL,
  figure     VARCHAR(60) NULL,
  year       VARCHAR(20) NULL,
  source     VARCHAR(120) NULL,
  source_url VARCHAR(400) NULL,
  note       VARCHAR(300) NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS water_facts;
CREATE TABLE water_facts (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  item       VARCHAR(120) NOT NULL,
  value      VARCHAR(120) NULL,
  note       VARCHAR(500) NULL,
  source_url VARCHAR(400) NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- CULTURE, PEOPLE & HERITAGE
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS notable_people;
CREATE TABLE notable_people (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name         VARCHAR(120) NOT NULL,
  field        VARCHAR(80) NULL,
  birth_year   INT NULL,
  death_year   INT NULL,
  nobel        VARCHAR(120) NULL,   -- e.g. 'Nobel Literature 1988' or NULL
  significance VARCHAR(400) NULL,
  source_url   VARCHAR(400) NULL,
  PRIMARY KEY (id),
  KEY idx_people_field (field)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS universities;
CREATE TABLE universities (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name         VARCHAR(120) NOT NULL,
  founded_year INT NULL,
  type         VARCHAR(40) NULL,
  note         VARCHAR(300) NULL,
  source_url   VARCHAR(400) NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS artifacts;
CREATE TABLE artifacts (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name             VARCHAR(120) NOT NULL,
  dated            VARCHAR(60) NULL,
  significance     VARCHAR(500) NULL,
  current_location VARCHAR(120) NULL,
  source_url       VARCHAR(400) NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS tech_companies;
CREATE TABLE tech_companies (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name         VARCHAR(80) NOT NULL,
  sector       VARCHAR(60) NULL,     -- payments | fintech | mobility | healthtech
  founded_year INT NULL,
  milestone    VARCHAR(400) NULL,
  source_url   VARCHAR(400) NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- v4 enrichment: art & cinema, sports, industry/investment, science & space,
-- water & irrigation. Every row real & cited; disputed figures flagged in-row.
-- ============================================================================

-- Art & Cinema -------------------------------------------------------------
DROP TABLE IF EXISTS cultural_figures;
CREATE TABLE cultural_figures (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name           VARCHAR(120) NOT NULL,
  domain         VARCHAR(20) NULL,     -- cinema | music | art
  role           VARCHAR(60) NULL,     -- actor | director | singer | composer | painter | sculptor
  birth_year     INT NULL,             -- signed year; NULL if unknown
  death_year     INT NULL,
  signature_work VARCHAR(300) NULL,
  significance   VARCHAR(400) NULL,
  certainty_note VARCHAR(300) NULL,
  source_url     VARCHAR(400) NULL,
  PRIMARY KEY (id),
  KEY idx_cf_domain (domain)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS cultural_institutions;
CREATE TABLE cultural_institutions (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name         VARCHAR(120) NOT NULL,
  type         VARCHAR(40) NULL,       -- studio | festival | opera | museum | library
  founded_year INT NULL,
  location     VARCHAR(120) NULL,
  significance VARCHAR(500) NULL,
  source_url   VARCHAR(400) NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS film_industry;
CREATE TABLE film_industry (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  metric     VARCHAR(160) NOT NULL,
  year       INT NULL,
  value      VARCHAR(160) NULL,
  note       VARCHAR(500) NULL,
  source_url VARCHAR(400) NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sports -------------------------------------------------------------------
DROP TABLE IF EXISTS athletes;
CREATE TABLE athletes (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name             VARCHAR(120) NOT NULL,
  sport            VARCHAR(60) NULL,
  birth_year       INT NULL,
  achievement      VARCHAR(500) NULL,
  achievement_year VARCHAR(40) NULL,
  certainty_note   VARCHAR(300) NULL,
  source_url       VARCHAR(400) NULL,
  PRIMARY KEY (id),
  KEY idx_ath_sport (sport)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS sports_titles;
CREATE TABLE sports_titles (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  holder      VARCHAR(120) NOT NULL,
  competition VARCHAR(120) NULL,
  titles      INT NULL,
  detail      VARCHAR(500) NULL,
  note        VARCHAR(300) NULL,
  source_url  VARCHAR(400) NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Industry, investment, business, companies --------------------------------
DROP TABLE IF EXISTS industrial_sectors;
CREATE TABLE industrial_sectors (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  sector     VARCHAR(80) NOT NULL,
  key_fact   VARCHAR(500) NULL,
  metric     VARCHAR(120) NULL,
  year       VARCHAR(20) NULL,
  source_url VARCHAR(400) NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS major_companies;
CREATE TABLE major_companies (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name         VARCHAR(120) NOT NULL,
  sector       VARCHAR(60) NULL,
  founded_year INT NULL,
  metric       VARCHAR(60) NULL,      -- market cap | revenue | employees
  metric_value VARCHAR(80) NULL,
  significance VARCHAR(400) NULL,
  source_url   VARCHAR(400) NULL,
  PRIMARY KEY (id),
  KEY idx_mc_sector (sector)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS investment_deals;
CREATE TABLE investment_deals (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name           VARCHAR(160) NOT NULL,
  year           INT NULL,
  value_usd_bn   DECIMAL(8,2) NULL,
  counterparty   VARCHAR(120) NULL,
  category       VARCHAR(40) NULL,     -- FDI | IMF | privatization | free-zone
  significance   VARCHAR(500) NULL,
  certainty_note VARCHAR(300) NULL,
  source_url     VARCHAR(400) NULL,
  PRIMARY KEY (id),
  KEY idx_id_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Science, space & research ------------------------------------------------
DROP TABLE IF EXISTS satellites;
CREATE TABLE satellites (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name             VARCHAR(80) NOT NULL,
  launch_year      INT NULL,
  launch_date_note VARCHAR(60) NULL,
  purpose          VARCHAR(300) NULL,
  partner          VARCHAR(200) NULL,
  status           VARCHAR(120) NULL,
  source_url       VARCHAR(400) NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS research_institutions;
CREATE TABLE research_institutions (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name         VARCHAR(120) NOT NULL,
  type         VARCHAR(60) NULL,
  founded_year INT NULL,
  location     VARCHAR(120) NULL,
  significance VARCHAR(500) NULL,
  source_url   VARCHAR(400) NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS scientists;
CREATE TABLE scientists (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name         VARCHAR(120) NOT NULL,
  field        VARCHAR(120) NULL,
  birth_year   INT NULL,
  death_year   INT NULL,
  award        VARCHAR(200) NULL,
  significance VARCHAR(500) NULL,
  source_url   VARCHAR(400) NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Water & irrigation -------------------------------------------------------
DROP TABLE IF EXISTS water_projects;
CREATE TABLE water_projects (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name           VARCHAR(140) NOT NULL,
  category       VARCHAR(60) NULL,     -- land-reclamation | water-treatment | desalination | canal
  scope          VARCHAR(500) NULL,
  cost_note      VARCHAR(160) NULL,
  status         VARCHAR(300) NULL,
  certainty_note VARCHAR(300) NULL,
  source_url     VARCHAR(400) NULL,
  PRIMARY KEY (id),
  KEY idx_wp_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS water_resources;
CREATE TABLE water_resources (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  metric     VARCHAR(160) NOT NULL,
  value_bcm  DECIMAL(8,2) NULL,        -- billion cubic metres, where applicable
  share_pct  DECIMAL(5,2) NULL,        -- for the usage split
  category   VARCHAR(40) NULL,         -- usage | resource | deficit
  note       VARCHAR(400) NULL,
  source_url VARCHAR(400) NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- v5 enrichment: transport & infrastructure, education, energy depth, heritage.
-- Every row real & cited; projections/MoUs/disputed figures flagged in-row.
-- ============================================================================

DROP TABLE IF EXISTS transport_projects;
CREATE TABLE transport_projects (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(120) NOT NULL,
  type        VARCHAR(60) NULL,        -- metro | monorail | high-speed rail | LRT | ...
  length_km   DECIMAL(7,1) NULL,
  scope       VARCHAR(300) NULL,
  cost_usd_bn DECIMAL(7,2) NULL,
  status      VARCHAR(200) NULL,
  partner     VARCHAR(200) NULL,
  source_url  VARCHAR(400) NULL,
  PRIMARY KEY (id),
  KEY idx_tp_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS transport_stats;
CREATE TABLE transport_stats (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  facility   VARCHAR(120) NOT NULL,
  type       VARCHAR(40) NULL,         -- seaport | airport | airline | road | rail | bridge
  metric     VARCHAR(120) NULL,
  value      VARCHAR(80) NULL,
  year       INT NULL,
  source_url VARCHAR(400) NULL,
  note       VARCHAR(300) NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS university_rankings;
CREATE TABLE university_rankings (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name         VARCHAR(140) NOT NULL,
  founded_year INT NULL,
  type         VARCHAR(60) NULL,
  city         VARCHAR(80) NULL,
  enrollment   INT NULL,
  qs_rank_2026 VARCHAR(40) NULL,       -- QS WUR 2026 band (some are ranges)
  source_url   VARCHAR(400) NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS green_hydrogen_deals;
CREATE TABLE green_hydrogen_deals (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(140) NOT NULL,
  partner    VARCHAR(200) NULL,
  product    VARCHAR(80) NULL,         -- green hydrogen | green ammonia | green methanol
  scope      VARCHAR(300) NULL,
  location   VARCHAR(120) NULL,
  status     VARCHAR(200) NULL,        -- ALWAYS flags MoU/framework/FID
  source_url VARCHAR(400) NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS unesco_sites;
CREATE TABLE unesco_sites (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name             VARCHAR(160) NOT NULL,
  inscription_year INT NULL,
  site_type        VARCHAR(20) NULL,    -- Cultural | Natural
  location         VARCHAR(120) NULL,
  criteria         VARCHAR(40) NULL,
  significance     VARCHAR(400) NULL,
  source_url       VARCHAR(400) NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- v6 enrichment: telecom & internet, trade partners, social media.
-- ============================================================================
DROP TABLE IF EXISTS telecom_stats;
CREATE TABLE telecom_stats (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  indicator  VARCHAR(80) NOT NULL,
  year       INT NULL,
  value      DECIMAL(10,2) NULL,
  unit       VARCHAR(40) NULL,
  source_url VARCHAR(400) NULL,
  note       VARCHAR(300) NULL,
  PRIMARY KEY (id),
  KEY idx_tel_ind (indicator)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS trade_partners;
CREATE TABLE trade_partners (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  direction    VARCHAR(10) NOT NULL,   -- export | import
  partner      VARCHAR(60) NOT NULL,
  value_usd_bn DECIMAL(8,2) NULL,
  share_pct    DECIMAL(5,2) NULL,
  year         INT NULL,
  source_url   VARCHAR(400) NULL,
  note         VARCHAR(300) NULL,
  PRIMARY KEY (id),
  KEY idx_trade_dir (direction)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS social_platforms;
CREATE TABLE social_platforms (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  platform       VARCHAR(40) NOT NULL,
  users_millions DECIMAL(7,2) NULL,
  rank           INT NULL,
  year           INT NULL,
  source_url     VARCHAR(400) NULL,
  note           VARCHAR(300) NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- v7 enrichment: agriculture/food, health system, climate.
-- ============================================================================
DROP TABLE IF EXISTS crop_production;
CREATE TABLE crop_production (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  crop              VARCHAR(40) NOT NULL,
  year              INT NULL,
  production_tonnes BIGINT NULL,
  source_url        VARCHAR(400) NULL,
  note              VARCHAR(300) NULL,
  PRIMARY KEY (id),
  KEY idx_crop (crop)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS food_facts;
CREATE TABLE food_facts (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  fact       VARCHAR(160) NOT NULL,
  value      VARCHAR(160) NULL,
  year       VARCHAR(30) NULL,
  source_url VARCHAR(400) NULL,
  note       VARCHAR(400) NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS health_stats;
CREATE TABLE health_stats (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  indicator  VARCHAR(80) NOT NULL,
  year       INT NULL,
  value      DECIMAL(10,2) NULL,
  unit       VARCHAR(40) NULL,
  source_url VARCHAR(400) NULL,
  note       VARCHAR(300) NULL,
  PRIMARY KEY (id),
  KEY idx_health_ind (indicator)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS climate_normals;
CREATE TABLE climate_normals (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  place              VARCHAR(60) NOT NULL,
  avg_temp_c         DECIMAL(5,2) NULL,
  annual_rainfall_mm DECIMAL(7,2) NULL,
  source_url         VARCHAR(400) NULL,
  note               VARCHAR(300) NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS economy_series;
CREATE TABLE economy_series (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  indicator  VARCHAR(80) NOT NULL,
  year       INT NULL,
  value      DECIMAL(14,2) NULL,
  unit       VARCHAR(40) NULL,
  source_url VARCHAR(400) NULL,
  note       VARCHAR(300) NULL,
  PRIMARY KEY (id),
  KEY idx_econ_ind (indicator)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS demographics;
CREATE TABLE demographics (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  indicator  VARCHAR(80) NOT NULL,
  value      VARCHAR(160) NULL,
  unit       VARCHAR(40) NULL,
  year       VARCHAR(30) NULL,
  source_url VARCHAR(400) NULL,
  note       VARCHAR(400) NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- v8 enrichment: businessmen, cinema economics, military, arms trade,
-- football, handball, logistics, megaproject 2026 status.
-- ============================================================================
DROP TABLE IF EXISTS businessmen;
CREATE TABLE businessmen (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name             VARCHAR(80) NOT NULL,
  net_worth_usd_bn DECIMAL(6,2) NULL,
  year             INT NULL,
  main_company     VARCHAR(160) NULL,
  sector           VARCHAR(120) NULL,
  source_url       VARCHAR(400) NULL,
  note             VARCHAR(500) NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS cinema_economics;
CREATE TABLE cinema_economics (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  metric     VARCHAR(160) NOT NULL,
  value      VARCHAR(200) NULL,
  year       VARCHAR(30) NULL,
  source_url VARCHAR(400) NULL,
  note       VARCHAR(500) NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS military_strength;
CREATE TABLE military_strength (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  metric     VARCHAR(120) NOT NULL,
  value      VARCHAR(120) NULL,
  year       INT NULL,
  source_url VARCHAR(400) NULL,
  note       VARCHAR(400) NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS arms_trade;
CREATE TABLE arms_trade (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  metric     VARCHAR(120) NOT NULL,
  value      VARCHAR(120) NULL,
  period     VARCHAR(40) NULL,
  source_url VARCHAR(400) NULL,
  note       VARCHAR(400) NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS football;
CREATE TABLE football (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  item       VARCHAR(120) NOT NULL,
  detail     VARCHAR(300) NULL,
  value      VARCHAR(120) NULL,
  source_url VARCHAR(400) NULL,
  note       VARCHAR(400) NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS handball;
CREATE TABLE handball (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  item       VARCHAR(120) NOT NULL,
  detail     VARCHAR(300) NULL,
  value      VARCHAR(120) NULL,
  source_url VARCHAR(400) NULL,
  note       VARCHAR(400) NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS logistics_projects;
CREATE TABLE logistics_projects (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(140) NOT NULL,
  detail     VARCHAR(300) NULL,
  value      VARCHAR(120) NULL,
  year       VARCHAR(30) NULL,
  status     VARCHAR(60) NULL,
  source_url VARCHAR(400) NULL,
  note       VARCHAR(400) NULL,
  PRIMARY KEY (id),
  KEY idx_log_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS megaproject_status;
CREATE TABLE megaproject_status (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  project       VARCHAR(140) NOT NULL,
  status_2026   VARCHAR(120) NULL,
  key_figure    VARCHAR(200) NULL,
  cost_or_scope VARCHAR(200) NULL,
  source_url    VARCHAR(400) NULL,
  note          VARCHAR(400) NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- === seed_v9: history & heritage depth ======================================
DROP TABLE IF EXISTS obelisks;
CREATE TABLE obelisks (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name            VARCHAR(140) NOT NULL,
  pharaoh         VARCHAR(120) NULL,
  original_site   VARCHAR(120) NULL,
  current_city    VARCHAR(120) NULL,
  current_country VARCHAR(80) NULL,
  height_m        DECIMAL(6,2) NULL,
  year_moved      SMALLINT NULL,
  source_url      VARCHAR(400) NULL,
  certainty_note  VARCHAR(400) NULL,
  PRIMARY KEY (id),
  KEY idx_obelisk_country (current_country)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS archaeological_discoveries;
CREATE TABLE archaeological_discoveries (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name           VARCHAR(160) NOT NULL,
  discovery_year SMALLINT NULL,
  discoverer     VARCHAR(160) NULL,
  site           VARCHAR(120) NULL,
  significance   VARCHAR(400) NULL,
  source_url     VARCHAR(400) NULL,
  certainty_note VARCHAR(400) NULL,
  PRIMARY KEY (id),
  KEY idx_disc_year (discovery_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS temples;
CREATE TABLE temples (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name            VARCHAR(140) NOT NULL,
  site            VARCHAR(120) NULL,
  principal_deity VARCHAR(120) NULL,
  built_by        VARCHAR(160) NULL,
  period          VARCHAR(80) NULL,
  build_start     SMALLINT NULL,
  build_end       SMALLINT NULL,
  source_url      VARCHAR(400) NULL,
  certainty_note  VARCHAR(400) NULL,
  PRIMARY KEY (id),
  KEY idx_temple_deity (principal_deity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS royal_women;
CREATE TABLE royal_women (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name           VARCHAR(120) NOT NULL,
  dynasty        VARCHAR(40) NULL,
  period_start   SMALLINT NULL,
  period_end     SMALLINT NULL,
  role           VARCHAR(140) NULL,
  known_for      VARCHAR(400) NULL,
  source_url     VARCHAR(400) NULL,
  certainty_note VARCHAR(400) NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
