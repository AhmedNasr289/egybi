-- ============================================================================
-- EgyBI — Egypt Knowledge Base — seed data v3 (economic + digital + social)
-- ============================================================================
-- Run AFTER schema_*.sql, seed.sql, seed_v2.sql. Adds economic time series
-- (inflation, EGP/USD, unemployment, FDI, debt, reserves, remittances),
-- digital-economy indicators, social/development indicators, and the tech
-- ecosystem. Real & cited (World Bank / IMF / UNCTAD / CBE / MCIT); the FX-crisis
-- distortions and FY-vs-CY / FDI-vs-remittances gotchas are flagged in-row.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- indicators (category 'economy') — inflation
-- ---------------------------------------------------------------------------
INSERT INTO indicators (category, indicator_name, indicator_code, year, value, unit, source, source_url, note) VALUES
('economy','Inflation (annual CPI)','FP.CPI.TOTL.ZG',2010,11.27,'%','World Bank','https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG?locations=EG',NULL),
('economy','Inflation (annual CPI)','FP.CPI.TOTL.ZG',2013,9.47,'%','World Bank','https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG?locations=EG',NULL),
('economy','Inflation (annual CPI)','FP.CPI.TOTL.ZG',2016,13.81,'%','World Bank','https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG?locations=EG',NULL),
('economy','Inflation (annual CPI)','FP.CPI.TOTL.ZG',2017,29.51,'%','World Bank','https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG?locations=EG','Passthrough from the Nov-2016 EGP float'),
('economy','Inflation (annual CPI)','FP.CPI.TOTL.ZG',2019,9.15,'%','World Bank','https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG?locations=EG',NULL),
('economy','Inflation (annual CPI)','FP.CPI.TOTL.ZG',2020,5.04,'%','World Bank','https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG?locations=EG',NULL),
('economy','Inflation (annual CPI)','FP.CPI.TOTL.ZG',2021,5.21,'%','World Bank','https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG?locations=EG',NULL),
('economy','Inflation (annual CPI)','FP.CPI.TOTL.ZG',2022,13.90,'%','World Bank','https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG?locations=EG',NULL),
('economy','Inflation (annual CPI)','FP.CPI.TOTL.ZG',2023,33.88,'%','World Bank','https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG?locations=EG','Highest annual print in the series, from the 2022-24 devaluations; monthly urban CPI peaked ~38% Sept 2023'),
('economy','Inflation (annual CPI)','FP.CPI.TOTL.ZG',2024,28.27,'%','World Bank','https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG?locations=EG',NULL);

-- indicators (economy) — EGP/USD exchange rate (period average)
INSERT INTO indicators (category, indicator_name, indicator_code, year, value, unit, source, source_url, note) VALUES
('economy','EGP/USD exchange rate','PA.NUS.FCRF',2010,5.62,'EGP per USD','World Bank','https://data.worldbank.org/indicator/PA.NUS.FCRF?locations=EG','Period average'),
('economy','EGP/USD exchange rate','PA.NUS.FCRF',2013,6.87,'EGP per USD','World Bank','https://data.worldbank.org/indicator/PA.NUS.FCRF?locations=EG','Period average'),
('economy','EGP/USD exchange rate','PA.NUS.FCRF',2016,10.03,'EGP per USD','World Bank','https://data.worldbank.org/indicator/PA.NUS.FCRF?locations=EG','Nov 2016 free float (~8.9 -> ~17)'),
('economy','EGP/USD exchange rate','PA.NUS.FCRF',2017,17.78,'EGP per USD','World Bank','https://data.worldbank.org/indicator/PA.NUS.FCRF?locations=EG','Period average'),
('economy','EGP/USD exchange rate','PA.NUS.FCRF',2019,16.77,'EGP per USD','World Bank','https://data.worldbank.org/indicator/PA.NUS.FCRF?locations=EG','Period average'),
('economy','EGP/USD exchange rate','PA.NUS.FCRF',2021,15.64,'EGP per USD','World Bank','https://data.worldbank.org/indicator/PA.NUS.FCRF?locations=EG','Period average'),
('economy','EGP/USD exchange rate','PA.NUS.FCRF',2022,19.16,'EGP per USD','World Bank','https://data.worldbank.org/indicator/PA.NUS.FCRF?locations=EG','March 2022 step devaluation'),
('economy','EGP/USD exchange rate','PA.NUS.FCRF',2023,30.63,'EGP per USD','World Bank','https://data.worldbank.org/indicator/PA.NUS.FCRF?locations=EG','Period average'),
('economy','EGP/USD exchange rate','PA.NUS.FCRF',2024,45.30,'EGP per USD','World Bank','https://data.worldbank.org/indicator/PA.NUS.FCRF?locations=EG','Period average understates post-March 2024 float; year-end ~50.9');

-- indicators (economy) — unemployment (modeled ILO)
INSERT INTO indicators (category, indicator_name, indicator_code, year, value, unit, source, source_url, note) VALUES
('economy','Unemployment rate','SL.UEM.TOTL.ZS',2010,8.76,'%','World Bank (modeled ILO)','https://data.worldbank.org/indicator/SL.UEM.TOTL.ZS?locations=EG',NULL),
('economy','Unemployment rate','SL.UEM.TOTL.ZS',2013,13.15,'%','World Bank (modeled ILO)','https://data.worldbank.org/indicator/SL.UEM.TOTL.ZS?locations=EG','Post-2011-revolution peak'),
('economy','Unemployment rate','SL.UEM.TOTL.ZS',2016,12.45,'%','World Bank (modeled ILO)','https://data.worldbank.org/indicator/SL.UEM.TOTL.ZS?locations=EG',NULL),
('economy','Unemployment rate','SL.UEM.TOTL.ZS',2019,7.85,'%','World Bank (modeled ILO)','https://data.worldbank.org/indicator/SL.UEM.TOTL.ZS?locations=EG',NULL),
('economy','Unemployment rate','SL.UEM.TOTL.ZS',2022,6.55,'%','World Bank (modeled ILO)','https://data.worldbank.org/indicator/SL.UEM.TOTL.ZS?locations=EG',NULL),
('economy','Unemployment rate','SL.UEM.TOTL.ZS',2024,6.82,'%','World Bank (modeled ILO)','https://data.worldbank.org/indicator/SL.UEM.TOTL.ZS?locations=EG','Modeled estimate; vintage-dependent');

-- indicators (economy) — FDI (UNCTAD, calendar year)
INSERT INTO indicators (category, indicator_name, indicator_code, year, value, unit, source, source_url, note) VALUES
('economy','FDI net inflows','UNCTAD-WIR',2020,5.85,'USD billion','UNCTAD WIR','https://unctad.org/system/files/official-document/wir2025_annex-tables_en.pdf','Calendar year. FDI is NOT remittances (which are ~3-5x larger)'),
('economy','FDI net inflows','UNCTAD-WIR',2021,5.12,'USD billion','UNCTAD WIR','https://unctad.org/system/files/official-document/wir2025_annex-tables_en.pdf','Calendar year'),
('economy','FDI net inflows','UNCTAD-WIR',2022,11.40,'USD billion','UNCTAD WIR','https://unctad.org/system/files/official-document/wir2025_annex-tables_en.pdf','Calendar year'),
('economy','FDI net inflows','UNCTAD-WIR',2023,9.84,'USD billion','UNCTAD WIR','https://unctad.org/system/files/official-document/wir2025_annex-tables_en.pdf','Calendar year. NB: CBE fiscal-year FY2023/24 ~$46bn includes a one-off $35bn Ras El Hekma UAE deal - not a recurring flow');

-- indicators (economy) — government debt (IMF) & reserves (WB)
INSERT INTO indicators (category, indicator_name, indicator_code, year, value, unit, source, source_url, note) VALUES
('economy','Government gross debt','GGXWDG_NGDP',2017,97.8,'% of GDP','IMF DataMapper','https://www.imf.org/external/datamapper/profile/EGY',NULL),
('economy','Government gross debt','GGXWDG_NGDP',2019,80.1,'% of GDP','IMF DataMapper','https://www.imf.org/external/datamapper/profile/EGY',NULL),
('economy','Government gross debt','GGXWDG_NGDP',2021,89.9,'% of GDP','IMF DataMapper','https://www.imf.org/external/datamapper/profile/EGY',NULL),
('economy','Government gross debt','GGXWDG_NGDP',2023,95.9,'% of GDP','IMF DataMapper','https://www.imf.org/external/datamapper/profile/EGY',NULL),
('economy','Government gross debt','GGXWDG_NGDP',2024,90.9,'% of GDP','IMF DataMapper','https://www.imf.org/external/datamapper/profile/EGY','IMF estimate'),
('economy','Total reserves (incl. gold)','FI.RES.TOTL.CD',2019,44.60,'USD billion','World Bank','https://data.worldbank.org/indicator/FI.RES.TOTL.CD?locations=EG',NULL),
('economy','Total reserves (incl. gold)','FI.RES.TOTL.CD',2022,32.14,'USD billion','World Bank','https://data.worldbank.org/indicator/FI.RES.TOTL.CD?locations=EG','FX-crisis drawdown'),
('economy','Total reserves (incl. gold)','FI.RES.TOTL.CD',2023,33.07,'USD billion','World Bank','https://data.worldbank.org/indicator/FI.RES.TOTL.CD?locations=EG',NULL),
('economy','Total reserves (incl. gold)','FI.RES.TOTL.CD',2024,44.92,'USD billion','World Bank','https://data.worldbank.org/indicator/FI.RES.TOTL.CD?locations=EG','CBE net international reserves hit a record ~$47.1bn end-2024 (different definition)');

-- indicators (economy) — remittances (WB, calendar year)
INSERT INTO indicators (category, indicator_name, indicator_code, year, value, unit, source, source_url, note) VALUES
('economy','Personal remittances received','BX.TRF.PWKR.CD.DT',2010,12.45,'USD billion','World Bank','https://data.worldbank.org/indicator/BX.TRF.PWKR.CD.DT?locations=EG','Egypt is a top-10 global recipient'),
('economy','Personal remittances received','BX.TRF.PWKR.CD.DT',2017,24.74,'USD billion','World Bank','https://data.worldbank.org/indicator/BX.TRF.PWKR.CD.DT?locations=EG',NULL),
('economy','Personal remittances received','BX.TRF.PWKR.CD.DT',2019,26.78,'USD billion','World Bank','https://data.worldbank.org/indicator/BX.TRF.PWKR.CD.DT?locations=EG',NULL),
('economy','Personal remittances received','BX.TRF.PWKR.CD.DT',2021,31.49,'USD billion','World Bank','https://data.worldbank.org/indicator/BX.TRF.PWKR.CD.DT?locations=EG','Record'),
('economy','Personal remittances received','BX.TRF.PWKR.CD.DT',2022,28.33,'USD billion','World Bank','https://data.worldbank.org/indicator/BX.TRF.PWKR.CD.DT?locations=EG',NULL),
('economy','Personal remittances received','BX.TRF.PWKR.CD.DT',2023,19.53,'USD billion','World Bank','https://data.worldbank.org/indicator/BX.TRF.PWKR.CD.DT?locations=EG','Not a real earnings drop - expats diverted to the parallel FX market during the crisis'),
('economy','Personal remittances received','BX.TRF.PWKR.CD.DT',2024,29.56,'USD billion','World Bank','https://data.worldbank.org/indicator/BX.TRF.PWKR.CD.DT?locations=EG','Recovered after the March-2024 float, but sources DISAGREE on the exact 2024 figure: ~$29.6bn vs ~$22.7bn (World Bank, cited as 7th-largest recipient). Both reflect FX-channel distortion, not real earnings change - use as a disputed figure.');

-- ---------------------------------------------------------------------------
-- indicators (category 'digital') — ICT & connectivity
-- ---------------------------------------------------------------------------
INSERT INTO indicators (category, indicator_name, indicator_code, year, value, unit, source, source_url, note) VALUES
('digital','Individuals using the Internet','IT.NET.USER.ZS',2022,72.20,'% of population','World Bank','https://data.worldbank.org/indicator/IT.NET.USER.ZS?locations=EG',NULL),
('digital','Individuals using the Internet','IT.NET.USER.ZS',2023,72.69,'% of population','World Bank','https://data.worldbank.org/indicator/IT.NET.USER.ZS?locations=EG','DataReportal cites ~82M users early 2024 (industry estimate, different basis)'),
('digital','Mobile subscriptions (per 100 people)','IT.CEL.SETS.P2',2023,92.83,'per 100 people','World Bank','https://data.worldbank.org/indicator/IT.CEL.SETS.P2?locations=EG','DataReportal: ~110.5M connections early 2024 (SIMs exceed people)'),
('digital','ICT sector share of GDP','MCIT',2018,3.2,'% of GDP','MCIT (via Business Today Egypt)','https://www.businesstodayegypt.com/Article/1/4833/Egypt-s-ICT-sector-contributes-to-GDP-by-5-8','FY2017/18'),
('digital','ICT sector share of GDP','MCIT',2024,5.8,'% of GDP','MCIT (via Business Today Egypt)','https://www.businesstodayegypt.com/Article/1/4833/Egypt-s-ICT-sector-contributes-to-GDP-by-5-8','FY2023/24; fastest-growing sector ~14-16%/yr for ~7 years. MCIT targets 8% by 2030 (projection)');

-- ---------------------------------------------------------------------------
-- indicators (category 'development') — health & human development
-- ---------------------------------------------------------------------------
INSERT INTO indicators (category, indicator_name, indicator_code, year, value, unit, source, source_url, note) VALUES
('development','Life expectancy at birth','SP.DYN.LE00.IN',2023,71.6,'years','World Bank','https://data.worldbank.org/indicator/SP.DYN.LE00.IN?locations=EG','Male 69.5, female 73.8'),
('development','Infant mortality rate','SP.DYN.IMRT.IN',2023,16.1,'per 1,000 live births','World Bank','https://data.worldbank.org/indicator/SP.DYN.IMRT.IN?locations=EG',NULL),
('development','Physicians (per 1,000 people)','SH.MED.PHYS.ZS',2020,0.68,'per 1,000 people','World Bank','https://data.worldbank.org/indicator/SH.MED.PHYS.ZS?locations=EG','Latest available WB data point (2020)'),
('development','Human Development Index','HDI',2023,0.754,'index (0-1)','UNDP HDR 2025','https://mped.gov.eg/singlenews?id=6282&lang=en','Rank 100 of 193; "high human development"'),
('development','Current health expenditure','SH.XPD.CHEX.GD.ZS',2022,4.7,'% of GDP','World Bank','https://data.worldbank.org/indicator/SH.XPD.CHEX.GD.ZS?locations=EG','Total (public+private); govt-budgeted share is lower (~1-1.4%)'),
('development','National poverty rate','CAPMAS-HIECS',2018,32.5,'% of population','CAPMAS','https://english.ahram.org.eg/News/477989.aspx','FY2017/18'),
('development','National poverty rate','CAPMAS-HIECS',2020,29.7,'% of population','CAPMAS','https://english.ahram.org.eg/News/477989.aspx','FY2019/20; first recorded decline since 1999. No newer official rate confirmed');

-- ---------------------------------------------------------------------------
-- tech_companies  (Egyptian tech / fintech ecosystem)
-- ---------------------------------------------------------------------------
INSERT INTO tech_companies (name, sector, founded_year, milestone, source_url) VALUES
('Fawry','Payments',2008,'Egypt''s first tech unicorn (Aug 2020, market cap passed ~$1.07bn); listed on the EGX in 2019.','https://www.egypttoday.com/Article/3/91018/Fawry-becomes-1st-Egyptian-unicorn-with-1B-market-cap'),
('InstaPay (IPN)','Payments',2022,'The Central Bank of Egypt''s instant bank-to-bank network; ~11.5M users in year one, ~$53bn annual value by 2024.','https://www.cbe.org.eg/en/payment-systems-and-services/instant-payment-network'),
('MNT-Halan','Fintech',2018,'Lending/payments for the unbanked; Egypt''s first fintech unicorn (2023); a later round valued it ~$1.4bn.','https://www.wamda.com/2026/06/mnt-halan-reaches-1-4-billion-valuation-investment-round-led-al-ahly-capital'),
('Swvl','Mobility',2017,'Mass-transit/bus-booking app; often called Egypt''s first unicorn; listed on NASDAQ via SPAC in 2022.','https://en.wikipedia.org/wiki/Swvl'),
('Vezeeta','Healthtech',2012,'Healthtech platform for booking doctor appointments and managing medical bookings.','https://en.wikipedia.org/wiki/Vezeeta');
