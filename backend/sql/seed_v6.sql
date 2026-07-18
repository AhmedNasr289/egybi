-- ============================================================================
-- EgyBI — Egypt Knowledge Base — seed_v6.sql
-- ============================================================================
-- Sixth enrichment pass: Telecom & internet (time series), trade partners,
-- and social media. Portable INSERTs (MySQL prod + SQLite test). Import order:
--   seed -> v2 -> v3 -> v4 -> v5 -> v6 -> (seed_auto)
-- Every row cited; disputes/estimates/series-breaks flagged in-row.
-- ============================================================================

-- Telecom & internet time series (World Bank/ITU + DataReportal/Ookla) ------
INSERT INTO telecom_stats (indicator, year, value, unit, source_url, note) VALUES
('Mobile subscriptions',2015,94.40,'per 100 people','https://data.worldbank.org/indicator/IT.CEL.SETS.P2?locations=EG','World Bank/ITU'),
('Mobile subscriptions',2017,99.29,'per 100 people','https://data.worldbank.org/indicator/IT.CEL.SETS.P2?locations=EG',NULL),
('Mobile subscriptions',2018,88.74,'per 100 people','https://data.worldbank.org/indicator/IT.CEL.SETS.P2?locations=EG','Drop reflects SIM re-registration/cleanup'),
('Mobile subscriptions',2020,87.23,'per 100 people','https://data.worldbank.org/indicator/IT.CEL.SETS.P2?locations=EG',NULL),
('Mobile subscriptions',2022,90.68,'per 100 people','https://data.worldbank.org/indicator/IT.CEL.SETS.P2?locations=EG',NULL),
('Mobile subscriptions',2024,97.13,'per 100 people','https://data.worldbank.org/indicator/IT.CEL.SETS.P2?locations=EG','~113.2M total subscriptions'),
('Fixed broadband',2015,3.84,'per 100 people','https://data.worldbank.org/indicator/IT.NET.BBND.P2?locations=EG','World Bank/ITU'),
('Fixed broadband',2018,6.27,'per 100 people','https://data.worldbank.org/indicator/IT.NET.BBND.P2?locations=EG',NULL),
('Fixed broadband',2020,8.54,'per 100 people','https://data.worldbank.org/indicator/IT.NET.BBND.P2?locations=EG',NULL),
('Fixed broadband',2022,10.68,'per 100 people','https://data.worldbank.org/indicator/IT.NET.BBND.P2?locations=EG',NULL),
('Fixed broadband',2024,11.69,'per 100 people','https://data.worldbank.org/indicator/IT.NET.BBND.P2?locations=EG',NULL),
('Internet users',2015,37.82,'% of population','https://data.worldbank.org/indicator/IT.NET.USER.ZS?locations=EG','World Bank/ITU (revised series)'),
('Internet users',2018,46.92,'% of population','https://data.worldbank.org/indicator/IT.NET.USER.ZS?locations=EG',NULL),
('Internet users',2019,57.28,'% of population','https://data.worldbank.org/indicator/IT.NET.USER.ZS?locations=EG','Large jump reflects a survey/methodology break, not organic growth'),
('Internet users',2020,71.91,'% of population','https://data.worldbank.org/indicator/IT.NET.USER.ZS?locations=EG',NULL),
('Internet users',2023,74.01,'% of population','https://data.worldbank.org/indicator/IT.NET.USER.ZS?locations=EG',NULL),
('Internet users',2024,74.65,'% of population','https://data.worldbank.org/indicator/IT.NET.USER.ZS?locations=EG','DataReportal cites 96.3M users / 81.9% penetration (Jan 2025, different basis)'),
('Median mobile download speed',2025,24.17,'Mbps','https://datareportal.com/reports/digital-2025-egypt','Ookla Speedtest (Jan 2025); +9.3% YoY'),
('Median fixed download speed',2025,76.67,'Mbps','https://datareportal.com/reports/digital-2025-egypt','Ookla Speedtest (Jan 2025); +18.8% YoY');

-- Trade partners 2023 (OEC / UN Comtrade mirror) ---------------------------
INSERT INTO trade_partners (direction, partner, value_usd_bn, share_pct, year, source_url, note) VALUES
('export','Turkiye',3.76,8.96,2023,'https://oec.world/en/profile/country/egy','Top export destination'),
('export','Italy',3.14,7.46,2023,'https://oec.world/en/profile/country/egy',NULL),
('export','Saudi Arabia',2.67,6.36,2023,'https://oec.world/en/profile/country/egy',NULL),
('export','United Arab Emirates',2.21,5.26,2023,'https://oec.world/en/profile/country/egy',NULL),
('export','United States',1.95,4.64,2023,'https://oec.world/en/profile/country/egy',NULL),
('import','China',12.90,15.50,2023,'https://oec.world/en/profile/country/egy','Top import origin'),
('import','United States',5.39,6.49,2023,'https://oec.world/en/profile/country/egy',NULL),
('import','Saudi Arabia',5.21,6.26,2023,'https://oec.world/en/profile/country/egy',NULL),
('import','Russia',4.95,5.96,2023,'https://oec.world/en/profile/country/egy',NULL),
('import','Germany',4.09,4.92,2023,'https://oec.world/en/profile/country/egy','OEC/UN Comtrade mirror; CAPMAS national figures differ modestly');

-- Social media platforms (DataReportal Digital 2025 Egypt, Jan 2025) -------
INSERT INTO social_platforms (platform, users_millions, rank, year, source_url, note) VALUES
('YouTube',50.70,1,2025,'https://datareportal.com/reports/digital-2025-egypt','By reported ad reach; not unique individuals'),
('Facebook',48.70,2,2025,'https://datareportal.com/reports/digital-2025-egypt',NULL),
('TikTok',41.30,3,2025,'https://datareportal.com/reports/digital-2025-egypt','Adults 18+'),
('Messenger',35.40,4,2025,'https://datareportal.com/reports/digital-2025-egypt',NULL),
('Instagram',20.10,5,2025,'https://datareportal.com/reports/digital-2025-egypt',NULL),
('Snapchat',19.70,6,2025,'https://datareportal.com/reports/digital-2025-egypt',NULL),
('LinkedIn',13.00,7,2025,'https://datareportal.com/reports/digital-2025-egypt',NULL),
('X (Twitter)',5.22,8,2025,'https://datareportal.com/reports/digital-2025-egypt','Likely understated (ad-audience reporting changes)');

-- ============================================================================
-- End of seed_v6.sql
-- ============================================================================
