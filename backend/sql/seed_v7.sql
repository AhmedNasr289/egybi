-- ============================================================================
-- EgyBI — Egypt Knowledge Base — seed_v7.sql
-- ============================================================================
-- Seventh enrichment pass. Import order:
--   seed -> v2 -> v3 -> v4 -> v5 -> v6 -> v7 -> (seed_auto)
-- Every row cited; disputes/estimates/projections flagged in-row.
--
-- Sections:
--   1. Governorate map layers (2017 census population + urban %) via UPDATEs
--   2. Agriculture & food + health  (added when that research batch lands)
--   3. Economy depth + climate + demography  (added when that batch lands)
-- ============================================================================

-- ===========================================================================
-- 1. GOVERNORATE MAP LAYERS
--    census_2017 = CAPMAS 2017 census (via citypopulation.de); the 27 sum to
--    94,798,827 = the published national census total (self-consistency check).
--    urban_pct   = urban share, Wikipedia governorates table citing CAPMAS ~2016
--                  (a proxy; ~1-2 points off the strict 2017 census split).
-- ===========================================================================
UPDATE governorates SET census_2017=9539673, urban_pct=100.0 WHERE name='Cairo';
UPDATE governorates SET census_2017=8632021, urban_pct=58.6  WHERE name='Giza';
UPDATE governorates SET census_2017=5627420, urban_pct=44.7  WHERE name='Qalyubia';
UPDATE governorates SET census_2017=5163750, urban_pct=98.8  WHERE name='Alexandria';
UPDATE governorates SET census_2017=6171613, urban_pct=19.5  WHERE name='Beheira';
UPDATE governorates SET census_2017=3362185, urban_pct=23.1  WHERE name='Kafr El Sheikh';
UPDATE governorates SET census_2017=6492381, urban_pct=28.2  WHERE name='Dakahlia';
UPDATE governorates SET census_2017=1496765, urban_pct=38.7  WHERE name='Damietta';
UPDATE governorates SET census_2017=7163824, urban_pct=23.1  WHERE name='Sharqia';
UPDATE governorates SET census_2017=4999633, urban_pct=30.0  WHERE name='Gharbia';
UPDATE governorates SET census_2017=4301601, urban_pct=20.6  WHERE name='Monufia';
UPDATE governorates SET census_2017=749371,  urban_pct=100.0 WHERE name='Port Said';
UPDATE governorates SET census_2017=1303993, urban_pct=45.4  WHERE name='Ismailia';
UPDATE governorates SET census_2017=728180,  urban_pct=100.0 WHERE name='Suez';
UPDATE governorates SET census_2017=450328,  urban_pct=60.2  WHERE name='North Sinai';
UPDATE governorates SET census_2017=102018,  urban_pct=51.1  WHERE name='South Sinai';
UPDATE governorates SET census_2017=3596954, urban_pct=22.5  WHERE name='Faiyum';
UPDATE governorates SET census_2017=3154100, urban_pct=23.2  WHERE name='Beni Suef';
UPDATE governorates SET census_2017=5497095, urban_pct=18.9  WHERE name='Minya';
UPDATE governorates SET census_2017=4383289, urban_pct=26.5  WHERE name='Asyut';
UPDATE governorates SET census_2017=4967409, urban_pct=21.4  WHERE name='Sohag';
UPDATE governorates SET census_2017=3164281, urban_pct=19.7  WHERE name='Qena';
UPDATE governorates SET census_2017=1250209, urban_pct=37.8  WHERE name='Luxor';
UPDATE governorates SET census_2017=1473975, urban_pct=42.3  WHERE name='Aswan';
UPDATE governorates SET census_2017=359888,  urban_pct=95.1  WHERE name='Red Sea';
UPDATE governorates SET census_2017=241247,  urban_pct=48.0  WHERE name='New Valley';
UPDATE governorates SET census_2017=425624,  urban_pct=70.6  WHERE name='Matrouh';
-- Sources: https://www.citypopulation.de/en/egypt/cities/  (2017 census)
--          https://en.wikipedia.org/wiki/Governorates_of_Egypt  (urban %, ~2016)

-- ===========================================================================
-- 2. AGRICULTURE & FOOD + HEALTH SYSTEM
-- ===========================================================================

-- Crop production (FAOSTAT QCL, official 2015-2023, tonnes) ------------------
INSERT INTO crop_production (crop, year, production_tonnes, source_url, note) VALUES
('Wheat',2015,9607736,'https://www.fao.org/faostat/en/#data/QCL','FAOSTAT official'),
('Wheat',2017,8421071,'https://www.fao.org/faostat/en/#data/QCL',NULL),
('Wheat',2019,8558807,'https://www.fao.org/faostat/en/#data/QCL',NULL),
('Wheat',2021,9842411,'https://www.fao.org/faostat/en/#data/QCL',NULL),
('Wheat',2023,9065380,'https://www.fao.org/faostat/en/#data/QCL','Egypt is the world''s largest wheat importer despite this domestic output'),
('Rice (paddy)',2015,4817964,'https://www.fao.org/faostat/en/#data/QCL','FAOSTAT official'),
('Rice (paddy)',2018,3123708,'https://www.fao.org/faostat/en/#data/QCL','Low year — water-saving acreage cuts'),
('Rice (paddy)',2021,4241894,'https://www.fao.org/faostat/en/#data/QCL',NULL),
('Rice (paddy)',2023,6228827,'https://www.fao.org/faostat/en/#data/QCL',NULL),
('Maize',2015,7803183,'https://www.fao.org/faostat/en/#data/QCL','FAOSTAT official'),
('Maize',2018,5111236,'https://www.fao.org/faostat/en/#data/QCL','Low year'),
('Maize',2021,8035715,'https://www.fao.org/faostat/en/#data/QCL',NULL),
('Maize',2023,7446859,'https://www.fao.org/faostat/en/#data/QCL',NULL),
('Sugarcane',2015,15903336,'https://www.fao.org/faostat/en/#data/QCL','FAOSTAT official'),
('Sugarcane',2019,15335972,'https://www.fao.org/faostat/en/#data/QCL',NULL),
('Sugarcane',2023,14252296,'https://www.fao.org/faostat/en/#data/QCL',NULL),
('Sugar beet',2015,11982946,'https://www.fao.org/faostat/en/#data/QCL','FAOSTAT official'),
('Sugar beet',2019,12247170,'https://www.fao.org/faostat/en/#data/QCL',NULL),
('Sugar beet',2023,14058070,'https://www.fao.org/faostat/en/#data/QCL','Now rivals sugarcane as a sugar source'),
('Tomatoes',2015,7737827,'https://www.fao.org/faostat/en/#data/QCL','FAOSTAT official; Egypt is a top-5 global producer'),
('Tomatoes',2019,6814460,'https://www.fao.org/faostat/en/#data/QCL',NULL),
('Tomatoes',2023,7115604,'https://www.fao.org/faostat/en/#data/QCL',NULL),
('Potatoes',2015,4955445,'https://www.fao.org/faostat/en/#data/QCL','FAOSTAT official'),
('Potatoes',2019,5200563,'https://www.fao.org/faostat/en/#data/QCL',NULL),
('Potatoes',2023,8572519,'https://www.fao.org/faostat/en/#data/QCL','Strong upward trend'),
('Oranges',2015,3351307,'https://www.fao.org/faostat/en/#data/QCL','FAOSTAT official; Egypt is the world''s top orange exporter'),
('Oranges',2019,3067630,'https://www.fao.org/faostat/en/#data/QCL',NULL),
('Oranges',2023,3471724,'https://www.fao.org/faostat/en/#data/QCL',NULL);

-- Food facts -----------------------------------------------------------------
INSERT INTO food_facts (fact, value, year, source_url, note) VALUES
('World''s largest wheat importer','Confirmed','2023-2026','https://ukragroconsult.com/en/news/egypt-remains-the-worlds-largest-wheat-importer-despite-efforts-to-boost-domestic-production/','Long-standing status (corroborated by USDA FAS)'),
('Wheat import volume','~13.3 million tonnes','2025','https://www.world-grain.com/articles/18340-egypt-wheat-imports-expected-to-rise','Varies by marketing year (~10.5Mt in 2022/23, an 8-year low, to ~13.3Mt in 2025)'),
('Wheat self-sufficiency ratio','44.6%','2023','https://en.amwalalghad.com/egypts-wheat-self-sufficiency-rises-in-23/','CAPMAS-sourced; DISPUTED — USDA-implied estimates are higher (~50-55%)'),
('Agriculture share of employment','18.29%','2023','https://data.worldbank.org/indicator/SL.AGR.EMPL.ZS?locations=EG','World Bank/ILO modelled; down from 28.4% in 2010'),
('Agriculture share of GDP','10.60%','2023','https://data.worldbank.org/indicator/NV.AGR.TOTL.ZS?locations=EG','World Bank; down from 13.3% in 2010'),
('Cultivated land','10.44 million feddans (~4.38M ha)','2023','https://en.amwalalghad.com/egypts-cultivated-land-expands-to-10-44m-feddans-in-2023-capmas/','CAPMAS; a different definition from the World Bank ag-land figure (~4.06M ha)');

-- Health system (World Bank / WHO GHO) ---------------------------------------
INSERT INTO health_stats (indicator, year, value, unit, source_url, note) VALUES
('Hospital beds',2010,1.40,'per 1,000','https://data.worldbank.org/indicator/SH.MED.BEDS.ZS?locations=EG',NULL),
('Hospital beds',2015,1.25,'per 1,000','https://data.worldbank.org/indicator/SH.MED.BEDS.ZS?locations=EG',NULL),
('Hospital beds',2019,1.19,'per 1,000','https://data.worldbank.org/indicator/SH.MED.BEDS.ZS?locations=EG',NULL),
('Hospital beds',2021,1.06,'per 1,000','https://data.worldbank.org/indicator/SH.MED.BEDS.ZS?locations=EG','Latest available; slow decline as population outpaces beds'),
('Physicians',2014,0.73,'per 1,000','https://data.worldbank.org/indicator/SH.MED.PHYS.ZS?locations=EG',NULL),
('Physicians',2018,0.72,'per 1,000','https://data.worldbank.org/indicator/SH.MED.PHYS.ZS?locations=EG',NULL),
('Physicians',2020,0.67,'per 1,000','https://data.worldbank.org/indicator/SH.MED.PHYS.ZS?locations=EG','Latest available'),
('Nurses & midwives',2013,1.83,'per 1,000','https://data.worldbank.org/indicator/SH.MED.NUMW.P3?locations=EG',NULL),
('Nurses & midwives',2018,1.79,'per 1,000','https://data.worldbank.org/indicator/SH.MED.NUMW.P3?locations=EG','Latest available'),
('Health expenditure',2015,5.06,'% of GDP','https://data.worldbank.org/indicator/SH.XPD.CHEX.GD.ZS?locations=EG',NULL),
('Health expenditure',2021,4.61,'% of GDP','https://data.worldbank.org/indicator/SH.XPD.CHEX.GD.ZS?locations=EG',NULL),
('Health expenditure',2023,4.88,'% of GDP','https://data.worldbank.org/indicator/SH.XPD.CHEX.GD.ZS?locations=EG','Latest'),
('Health expenditure per capita',2021,176.94,'US$','https://data.worldbank.org/indicator/SH.XPD.CHEX.PC.CD?locations=EG','Peak'),
('Health expenditure per capita',2023,141.41,'US$','https://data.worldbank.org/indicator/SH.XPD.CHEX.PC.CD?locations=EG','Drop partly reflects EGP devaluation'),
('Total fertility rate',2010,3.30,'births/woman','https://data.worldbank.org/indicator/SP.DYN.TFRT.IN?locations=EG',NULL),
('Total fertility rate',2014,3.49,'births/woman','https://data.worldbank.org/indicator/SP.DYN.TFRT.IN?locations=EG','Peak — an unexpected fertility rebound'),
('Total fertility rate',2018,3.02,'births/woman','https://data.worldbank.org/indicator/SP.DYN.TFRT.IN?locations=EG',NULL),
('Total fertility rate',2020,2.85,'births/woman','https://data.worldbank.org/indicator/SP.DYN.TFRT.IN?locations=EG',NULL),
('Total fertility rate',2023,2.75,'births/woman','https://data.worldbank.org/indicator/SP.DYN.TFRT.IN?locations=EG','Flat 2021-2023 (likely a carried-forward estimate)'),
('Maternal mortality ratio',2015,24,'per 100,000 births','https://data.worldbank.org/indicator/SH.STA.MMRT?locations=EG','WHO/UN modelled estimate'),
('Maternal mortality ratio',2020,31,'per 100,000 births','https://data.worldbank.org/indicator/SH.STA.MMRT?locations=EG','COVID-era spike (modelled)'),
('Maternal mortality ratio',2021,42,'per 100,000 births','https://data.worldbank.org/indicator/SH.STA.MMRT?locations=EG','COVID-era peak (modelled)'),
('Maternal mortality ratio',2023,17,'per 100,000 births','https://data.worldbank.org/indicator/SH.STA.MMRT?locations=EG','Sharp recovery; latest (modelled)'),
('DPT3 immunization',2015,93,'% of infants','https://data.worldbank.org/indicator/SH.IMM.IDPT?locations=EG','WHO/UNICEF estimate'),
('DPT3 immunization',2023,96,'% of infants','https://data.worldbank.org/indicator/SH.IMM.IDPT?locations=EG','Consistently 93-97% through 2010-2023');

-- ===========================================================================
-- 3. ECONOMY DEPTH + CLIMATE + DEMOGRAPHY
-- ===========================================================================

-- Economy time series (World Bank / EGX / WTTC) ------------------------------
INSERT INTO economy_series (indicator, year, value, unit, source_url, note) VALUES
('Current account balance',2021,-4.38,'% of GDP','https://data.worldbank.org/indicator/BN.CAB.XOKA.GD.ZS?locations=EG','World Bank'),
('Current account balance',2022,-2.21,'% of GDP','https://data.worldbank.org/indicator/BN.CAB.XOKA.GD.ZS?locations=EG',NULL),
('Current account balance',2023,-3.17,'% of GDP','https://data.worldbank.org/indicator/BN.CAB.XOKA.GD.ZS?locations=EG',NULL),
('Current account balance',2024,-5.69,'% of GDP','https://data.worldbank.org/indicator/BN.CAB.XOKA.GD.ZS?locations=EG','Latest; may be revised'),
('Tax revenue',2013,13.5,'% of GDP','https://data.worldbank.org/indicator/GC.TAX.TOTL.GD.ZS?locations=EG','World Bank'),
('Tax revenue',2015,12.5,'% of GDP','https://data.worldbank.org/indicator/GC.TAX.TOTL.GD.ZS?locations=EG','Latest year the World Bank reports a value'),
('Gross national savings',2020,16.3,'% of GDP','https://data.worldbank.org/indicator/NY.GNS.ICTR.ZS?locations=EG','World Bank'),
('Gross national savings',2023,14.8,'% of GDP','https://data.worldbank.org/indicator/NY.GNS.ICTR.ZS?locations=EG',NULL),
('Gross national savings',2024,9.3,'% of GDP','https://data.worldbank.org/indicator/NY.GNS.ICTR.ZS?locations=EG','Sharp drop; may be revised'),
('External debt stocks',2020,132.5,'US$ billion','https://data.worldbank.org/indicator/DT.DOD.DECT.CD?locations=EG','World Bank'),
('External debt stocks',2022,163.1,'US$ billion','https://data.worldbank.org/indicator/DT.DOD.DECT.CD?locations=EG',NULL),
('External debt stocks',2023,168.2,'US$ billion','https://data.worldbank.org/indicator/DT.DOD.DECT.CD?locations=EG','Series peak'),
('External debt stocks',2024,156.0,'US$ billion','https://data.worldbank.org/indicator/DT.DOD.DECT.CD?locations=EG','Eased after IMF/Ras El Hekma inflows'),
('Tourism direct share of GDP',2023,8.0,'% of GDP','https://www.statista.com/statistics/1317338/contribution-of-travel-and-tourism-to-gdp-in-egypt/','WTTC DIRECT contribution; distinct from the ~24% TOTAL contribution'),
('EGX30 index (year-end)',2020,10845.26,'points','https://en.wikipedia.org/wiki/EGX_30','Wikipedia annual-returns table'),
('EGX30 index (year-end)',2021,11949.18,'points','https://en.wikipedia.org/wiki/EGX_30',NULL),
('EGX30 index (year-end)',2022,14598.53,'points','https://en.wikipedia.org/wiki/EGX_30',NULL),
('EGX30 index (year-end)',2023,24832.71,'points','https://en.wikipedia.org/wiki/EGX_30','Surged as the pound devalued — equities as an inflation hedge'),
('EGX30 index (year-end)',2025,41828.97,'points','https://afrivestia.com/en/learn/egx-30-performance-2025-2026-egypt-stock-market-guide','Closed 31 Dec 2025 (the 2024 close was ~30,000-32,000, not precisely sourced)');

-- Climate normals + national facts -------------------------------------------
INSERT INTO climate_normals (place, avg_temp_c, annual_rainfall_mm, source_url, note) VALUES
('Cairo',22.1,10,'https://en.climate-data.org/africa/egypt/cairo-governorate/cairo-3392/','climate-data.org normal; a little over 10 mm rain a year'),
('Alexandria',20.8,181,'https://en.climate-data.org/africa/egypt/alexandria-governorate/alexandria-515/','Wettest of the three — Mediterranean coast'),
('Aswan',26.6,10,'https://en.climate-data.org/africa/egypt/aswan-governorate/aswan-6344/','Effectively near-zero desert rainfall'),
('Egypt (national)',NULL,12,'https://climateknowledgeportal.worldbank.org/sites/default/files/2021-04/15723-WB_Egypt%20Country%20Profile-WEB-2_0.pdf','~0 mm in the southern desert to ~200 mm on the north coast; ~96% of the land is desert'),
('Egypt (record high)',50.9,NULL,'https://english.ahram.org.eg/News/525049.aspx','Aswan, 7 June 2024 — broke the 1961 record of 50.3 C');

-- Demography composition -----------------------------------------------------
INSERT INTO demographics (indicator, value, unit, year, source_url, note) VALUES
('Median age','24.1','years','2023','https://www.cia.gov/the-world-factbook/countries/egypt/','CIA World Factbook estimate — a very young population'),
('Population ages 0-14','32.4','% of population','2023','https://data.worldbank.org/indicator/SP.POP.0014.TO.ZS?locations=EG','World Bank; nearly a third are children'),
('Population ages 65+','5.0','% of population','2023','https://data.worldbank.org/indicator/SP.POP.65UP.TO.ZS?locations=EG','World Bank (4.97%)'),
('Urban population','42.7','% of population','2023','https://data.worldbank.org/indicator/SP.URB.TOTL.IN.ZS?locations=EG','World Bank; so ~57% rural — unusually rural for its income level'),
('Population growth rate','1.69','% per year','2023','https://data.worldbank.org/indicator/SP.POP.GROW?locations=EG','World Bank'),
('Religion (Muslim)','~90','% (estimated)','2023','https://www.cia.gov/the-world-factbook/countries/egypt/','ESTIMATE — Egypt''s census does NOT record religion; predominantly Sunni. Commonly cited 85-90%'),
('Religion (Christian)','~10','% (estimated)','2023','https://www.cia.gov/the-world-factbook/countries/egypt/','ESTIMATE — no official figure; majority Coptic Orthodox. Church-linked estimates run higher (~10-18%)'),
('Main languages','Arabic (official); English & French widely understood','','2024','https://theodora.com/world_fact_book_2024/egypt/egypt_people.html','CIA World Factbook'),
('Total fertility rate','2.75','births per woman','2023','https://data.worldbank.org/indicator/SP.DYN.TFRT.IN?locations=EG','Fell from a 2014 peak of ~3.5; see health_stats for the full series');

-- ============================================================================
-- End of seed_v7.sql
-- ============================================================================
