-- ============================================================================
-- EgyBI — Egypt Knowledge Base — seed_v5.sql
-- ============================================================================
-- Fifth enrichment pass (deeper + broader, current to 2026). Adds:
--   * Transport & infrastructure (new sector): rail/metro/monorail/HSR + stats
--   * Education depth: a QS-2026 university ranking table + education indicators
--   * Energy depth: more renewable projects, green-hydrogen deals, energy series
--   * Heritage depth: UNESCO World Heritage sites + more pharaohs & events
--   * Economy/health/environment TIME SERIES into `indicators` (2010–2024)
-- Portable INSERTs (MySQL prod + SQLite test). Import order:
--   seed -> seed_v2 -> seed_v3 -> seed_v4 -> seed_v5  (-> seed_auto.sql last)
-- Content rule: every row real & cited; disputes/projections/MoUs flagged in-row.
-- ============================================================================

-- ===========================================================================
-- TRANSPORT & INFRASTRUCTURE  (new sector)
-- ===========================================================================
INSERT INTO transport_projects (name, type, length_km, scope, cost_usd_bn, status, partner, source_url) VALUES
('Cairo Metro Line 1 (Red)','metro',44.3,'35 stations, Helwan to New El-Marg',NULL,'Operational (phased from 1987)','French consortium; NAT-operated','https://en.wikipedia.org/wiki/Cairo_Metro_Line_1'),
('Cairo Metro Line 2 (Blue)','metro',21.6,'20 stations, Shubra El-Kheima to El-Mounib',NULL,'Operational (from 1996)','Interinfra (French-led)','https://en.wikipedia.org/wiki/Cairo_Metro'),
('Cairo Metro Line 3 (Green)','metro',41.2,'34 stations, Adly Mansour to Rod El-Farag/Kit-Kat',NULL,'Operational; final phase opened May 2024','Vinci / Alstom / Orascom / Arab Contractors','https://en.wikipedia.org/wiki/Cairo_Metro_Line_3'),
('Cairo Metro Line 4 (Phase 1)','metro',19.0,'17 stations, Hadayek Al-Ashgar to Fostat',NULL,'Under construction (JICA-financed)','JICA (Japan)','https://en.wikipedia.org/wiki/Cairo_Metro'),
('Cairo Monorail (New Capital line)','monorail',54.0,'22 stations, East Cairo to the New Administrative Capital',2.80,'Passenger service began May 2026','Alstom + Arab Contractors + Orascom','https://en.wikipedia.org/wiki/Cairo_Monorail'),
('Cairo Monorail (6th of October line)','monorail',42.0,'13 stations, Giza to 6th of October City',NULL,'Under construction (opening expected 2026)','Alstom + Arab Contractors + Orascom','https://en.wikipedia.org/wiki/Cairo_Monorail'),
('High-Speed Rail (Green Line / Line 1)','high-speed rail',660.0,'Ain Sokhna to Cairo to Marsa Matruh (+Alexandria branch), 230 km/h',NULL,'Under construction (target 2027) [projected]','Siemens Mobility + Orascom + Arab Contractors','https://press.siemens.com/global/en/pressrelease/siemens-mobility-finalizes-contract-2000-km-high-speed-rail-system-egypt'),
('High-Speed Rail network (3 lines)','high-speed rail',2000.0,'60 stations; 41 Velaro + 94 Desiro + 41 Vectron trains',23.00,'Under construction; none operational yet','Siemens Mobility consortium','https://en.wikipedia.org/wiki/High-speed_rail_in_Egypt'),
('Cairo LRT (Adly Mansour to New Capital)','light rail',70.0,'12 stations (Phase 1); ~103 km when complete',1.24,'Phase 1 operational since July 2022','China Railway (CREC) + AVIC (BRI)','https://en.wikipedia.org/wiki/Cairo_Light_Rail_Transit'),
('Abu Qir Metro (Alexandria)','metro',21.7,'20 stations; conversion of the Abu Qir line',1.90,'Under construction','Orascom; AIIB + EIB + EBRD + AFD','https://www.aiib.org/en/projects/details/2022/approved/Egypt-Alexandria-Abou-Qir-Metro-Line.html');

INSERT INTO transport_stats (facility, type, metric, value, year, source_url, note) VALUES
('East Port Said (SCCT)','seaport','Container throughput','3.94 million TEU',2024,'https://www.portseurope.com/suez-canal-container-terminal-s-a-e-teu-handled-2024/','Transshipment hub; TEU from industry aggregators (approximate)'),
('Alexandria Port (incl. Dekheila)','seaport','Container throughput','2.30 million TEU',2024,'https://www.shiphub.co/ports-in-egypt/','Approximate (aggregator)'),
('Damietta Port','seaport','Container throughput','1.77 million TEU',2024,'https://www.shiphub.co/ports-in-egypt/','Approximate (aggregator)'),
('Ain Sokhna Port','seaport','Container throughput','1.75 million TEU',2024,'https://www.logupdateafrica.com/shipping/egypts-sokhna-port-marks-trial-start-of-red-sea-container-terminals-1357548','Approximate (aggregator)'),
('Cairo International Airport','airport','Passengers per year','28.78 million',2024,'https://english.ahram.org.eg/News/537912.aspx','Up from 26.46M in 2023; 211,664 flights'),
('EgyptAir','airline','Passengers carried per year','10.29 million',2024,'https://egyptian-gazette.com/skyward/egyptair-transports-over-10m-passengers-in-2024/','Up from 9.83M in 2023'),
('National road network','road','Total length','~174,800 km (~144,300 paved)',2020,'https://en.wikipedia.org/wiki/Transport_in_Egypt','Main paved roads reached ~30,500 km by end-2024'),
('Egyptian National Railways','rail','Network length','~10,500 km (+~5,500 under construction)',2024,'https://en.wikipedia.org/wiki/Egyptian_National_Railways','DISPUTED: historic ENR core ~5,600 km; higher figure includes new/under-construction lines'),
('Rod El-Farag / Tahya Misr Axis Bridge','bridge','Deck width (Guinness record)','67.3 m',2019,'https://www.guinnessworldrecords.com/news/commercial/2019/6/egypts-new-bridge-becomes-the-widest-cable-stayed-bridge-580736','Official Guinness category is "widest CABLE-STAYED bridge" (often mislabelled suspension in local media)');

-- ===========================================================================
-- EDUCATION  — QS World University Rankings 2026 roster
-- ===========================================================================
INSERT INTO university_rankings (name, founded_year, type, city, enrollment, qs_rank_2026, source_url) VALUES
('Cairo University',1908,'Public','Giza',207853,'347','https://en.wikipedia.org/wiki/Cairo_University'),
('American University in Cairo (AUC)',1919,'Private (non-profit)','New Cairo',6980,'381','https://en.wikipedia.org/wiki/American_University_in_Cairo'),
('Ain Shams University',1950,'Public','Cairo',189822,'543','https://en.wikipedia.org/wiki/Ain_Shams_University'),
('Alexandria University',1938,'Public','Alexandria',182129,'784','https://en.wikipedia.org/wiki/Alexandria_University'),
('Future University in Egypt',2006,'Private','New Cairo',NULL,'901-950','https://enterpriseam.com/egypt/blackboards/more-egyptian-universities-make-global-rankings/'),
('Mansoura University',1972,'Public','Mansoura',140126,'1001-1200','https://en.wikipedia.org/wiki/Mansoura_University'),
('Al-Azhar University',970,'Public','Cairo',NULL,'1001-1200','https://en.wikipedia.org/wiki/Al-Azhar_University'),
('Arab Academy for Science & Technology',1972,'Semi-public','Alexandria',NULL,'1001-1200','https://enterpriseam.com/egypt/blackboards/more-egyptian-universities-make-global-rankings/'),
('Zagazig University',1974,'Public','Zagazig',163709,'1201-1400','https://en.wikipedia.org/wiki/Zagazig_University'),
('Helwan University',1975,'Public','Helwan','197175','1201-1400','https://en.wikipedia.org/wiki/Helwan_University'),
('German University in Cairo (GUC)',2002,'Private (intl.)','New Cairo',12947,'1201-1400','https://en.wikipedia.org/wiki/German_University_in_Cairo'),
('British University in Egypt (BUE)',2005,'Private (intl.)','El Shorouk',10921,'1201-1400','https://en.wikipedia.org/wiki/British_University_in_Egypt'),
('Nile University',2006,'Private (non-profit)','Sheikh Zayed',NULL,'1201-1400','https://en.wikipedia.org/wiki/Nile_University');

-- ===========================================================================
-- ENERGY  — more renewable projects + green-hydrogen deals (all MoU-flagged)
-- ===========================================================================
INSERT INTO renewable_projects (name, type, capacity_mw, location, status, source_url, note) VALUES
('Zafarana Wind Farm','wind',545,'Zafarana, Red Sea','Operational','https://www.amcham.org.eg/publications/industry-insight/issue/78/major-renewable-energy-projects-in-egypt','One of the earliest large wind farms'),
('Gulf of Suez (RGWE) Wind Farm','wind',262,'Gulf of Suez, Ras Ghareb','Operational (2019)','https://www.amcham.org.eg/publications/industry-insight/issue/78/major-renewable-energy-projects-in-egypt','ENGIE / Toyota Tsusho / Orascom'),
('West Bakr Wind','wind',250,'West Bakr, Gulf of Suez','Operational (2021)','https://www.amcham.org.eg/publications/industry-insight/issue/78/major-renewable-energy-projects-in-egypt','Infinity Power / Lekela'),
('Red Sea (RSWE) Wind Farm','wind',500,'Gulf of Suez','Under construction (target 2025)','https://www.amcham.org.eg/publications/industry-insight/issue/78/major-renewable-energy-projects-in-egypt','ENGIE / Toyota Tsusho / Orascom'),
('Aswan High Dam (hydro)','hydro',2800,'Aswan','Operational (legacy, since 1970)','https://www.ecofinagency.com/news-industry/2002-53136-egypt-tops-9-gw-of-renewables-lines-up-18-gw-more','Egypt''s largest hydropower source');

INSERT INTO green_hydrogen_deals (name, partner, product, scope, location, status, source_url) VALUES
('Egypt Green Hydrogen','Scatec / Fertiglobe / Orascom / TSFE','green hydrogen/ammonia','100 MW electrolyser; ~15,000 t/yr H2','Ain Sokhna, SCZONE','Pilot operational; 20-yr Fertiglobe offtake signed Jun 2024 (the only one past MoU)','https://www.scatec.com/en/scatecs-egypt-green-hydrogen-project-signed-20-year-offtake-agreement-with-fertiglobe-based-on-h2global-award/'),
('ACME Egypt','ACME Group','green ammonia','2.2 Mt/yr ammonia; ~$12bn','Ain Sokhna, SCZONE','MoU / framework agreement (2022-23) — no FID','https://www.zawya.com/en/projects/industry/egypts-sczone-indias-acme-sign-framework-agreement-for-green-hydrogen-project-in-sokhna-gereiwhe'),
('AMEA Power H2','AMEA Power','green ammonia','800,000 t/yr ammonia','Ain Sokhna','Framework agreement (2022) — no FID','https://www.amcham.org.eg/publications/industry-insight/issue/77/proposed-green-hydrogen-and-derivative-projects'),
('Masdar / Infinity / Hassan Allam','Masdar / Infinity Power / Hassan Allam','green hydrogen','480,000 t/yr H2 + 2 GW plant','SCZONE + North Coast','Framework agreement (2022) — no FID','https://www.amcham.org.eg/publications/industry-insight/issue/77/proposed-green-hydrogen-and-derivative-projects'),
('SCZONE seven-project batch','EETC / NREA / TSFE + investors','green hydrogen/derivatives','~$40bn over 10 years (7 projects)','SCZONE','7 MoUs signed Feb 2024 — none at FID','https://egyptoil-gas.com/news/egypt-pm-witnesses-the-signing-of-seven-green-hydrogen-mous/');

-- ===========================================================================
-- HERITAGE  — UNESCO World Heritage Sites (all 7) + more pharaohs & events
-- ===========================================================================
INSERT INTO unesco_sites (name, inscription_year, site_type, location, criteria, significance, source_url) VALUES
('Memphis and its Necropolis (Pyramid Fields, Giza to Dahshur)',1979,'Cultural','Giza / Saqqara / Dahshur','i, iii, vi','Old Kingdom capital and its pyramid fields, incl. the Great Pyramid and Djoser''s Step Pyramid','https://whc.unesco.org/en/list/86'),
('Ancient Thebes with its Necropolis',1979,'Cultural','Luxor','i, iii, vi','Karnak & Luxor temples plus the Valley of the Kings and Queens — the New Kingdom capital','https://whc.unesco.org/en/list/87'),
('Nubian Monuments from Abu Simbel to Philae',1979,'Cultural','Aswan','i, iii, vi','Rock temples of Ramesses II and the Sanctuary of Isis, relocated in the 1960s-80s UNESCO salvage','https://whc.unesco.org/en/list/88'),
('Historic Cairo (Islamic Cairo)',1979,'Cultural','Cairo','i, v, vi','One of the world''s greatest concentrations of medieval Islamic architecture','https://whc.unesco.org/en/list/89'),
('Abu Mena',1979,'Cultural','Borg el-Arab, near Alexandria','iv','Early Christian pilgrimage city over the tomb of St Menas (removed from the Danger List in 2025)','https://whc.unesco.org/en/list/90'),
('Saint Catherine Area',2002,'Cultural','South Sinai','i, iii, iv, vi','World''s oldest continuously functioning Christian monastery; sacred to three faiths','https://whc.unesco.org/en/list/954'),
('Wadi Al-Hitan (Whale Valley)',2005,'Natural','Al Fayyum','viii','Fossils of early whales documenting their evolution from land mammals to ocean life','https://whc.unesco.org/en/list/1186');

-- More pharaohs (fill Second Intermediate / Third Intermediate / Late Period gaps).
-- Signed years (negative = BCE); all ancient dates approximate (conventional chronology).
INSERT INTO pharaohs (name, dynasty, reign_start, reign_end, era, certainty_note) VALUES
('Khyan','XV',-1620,-1600,'Second Intermediate','Hyksos king; chronology and king-order highly uncertain'),
('Seqenenre Tao','XVII',-1558,-1554,'Second Intermediate','Approximate; mummy shows fatal battle wounds from the war on the Hyksos'),
('Shoshenq I','XXII',-943,-922,'Third Intermediate','Approximate; often identified with the Biblical "Shishak" — identification debated'),
('Taharqa','XXV',-690,-664,'Third Intermediate','Kushite (Nubian) pharaoh; clashed with Assyria; relatively well-fixed dates'),
('Psamtik I','XXVI',-664,-610,'Late Period','Reunified Egypt under the Saite dynasty; well-fixed dates'),
('Nectanebo II','XXX',-360,-343,'Late Period','The last native-born Egyptian pharaoh');

-- More historical events (signed years; ancient dates approximate).
INSERT INTO historical_events (name, event_year, event_date_note, description, certainty_note, source_url) VALUES
('Battle of Kadesh',-1274,'c. 1274 BCE','Ramesses II vs the Hittites; led to the first known surviving peace treaty','Date approximate (conventional chronology)','https://www.britannica.com/event/Battle-of-Kadesh'),
('Merneptah Stele erected',-1208,'Merneptah Year 5','Victory stele bearing the earliest extrabiblical mention of "Israel"','Approximate','https://en.wikipedia.org/wiki/Merneptah_Stele'),
('Persian conquest (Battle of Pelusium)',-525,'525 BCE','Cambyses II of Persia defeats Psamtik III, beginning the 27th (First Persian) Dynasty','Well-fixed','https://www.britannica.com/place/ancient-Egypt/The-Late-period-664-332-bce'),
('Alexander the Great conquers Egypt',-332,'332 BCE','Macedonian conquest ends Persian rule; Alexandria founded, launching the Hellenistic era','Well-fixed','https://www.britannica.com/place/ancient-Egypt/Macedonian-and-Ptolemaic-Egypt-332-30-bce'),
('Founding of al-Azhar Mosque & University',970,'970-972 CE','Fatimid congregational mosque begun 970; among the world''s oldest universities','Foundation 970; first prayers 972','https://www.britannica.com/topic/al-Azhar-University'),
('Suez Canal opens',1869,'17 Nov 1869','The Mediterranean-Red Sea canal opens to shipping after a decade of construction',NULL,'https://en.wikipedia.org/wiki/Suez_Canal'),
('Discovery of Tutankhamun''s tomb (KV62)',1922,'4 Nov 1922','Howard Carter uncovers the near-intact royal tomb in the Valley of the Kings',NULL,'https://en.wikipedia.org/wiki/Tutankhamun');

-- ===========================================================================
-- TIME SERIES into `indicators` (World Bank WDI / OWID, 2010-2024)
-- Only NEW (indicator_name, year) combinations — no duplicates with prior seeds.
-- ===========================================================================

-- GDP per capita — fill the years missing from earlier seeds (had 2014,17,20,22,24)
INSERT INTO indicators (category, indicator_name, indicator_code, year, value, unit, source, source_url, note) VALUES
('economy','GDP per capita (current US$)','NY.GDP.PCAP.CD',2010,2455.08,'USD','World Bank','https://data.worldbank.org/indicator/NY.GDP.PCAP.CD?locations=EG',NULL),
('economy','GDP per capita (current US$)','NY.GDP.PCAP.CD',2011,2590.64,'USD','World Bank','https://data.worldbank.org/indicator/NY.GDP.PCAP.CD?locations=EG',NULL),
('economy','GDP per capita (current US$)','NY.GDP.PCAP.CD',2012,2996.07,'USD','World Bank','https://data.worldbank.org/indicator/NY.GDP.PCAP.CD?locations=EG',NULL),
('economy','GDP per capita (current US$)','NY.GDP.PCAP.CD',2013,3025.53,'USD','World Bank','https://data.worldbank.org/indicator/NY.GDP.PCAP.CD?locations=EG',NULL),
('economy','GDP per capita (current US$)','NY.GDP.PCAP.CD',2015,3306.98,'USD','World Bank','https://data.worldbank.org/indicator/NY.GDP.PCAP.CD?locations=EG',NULL),
('economy','GDP per capita (current US$)','NY.GDP.PCAP.CD',2016,3270.63,'USD','World Bank','https://data.worldbank.org/indicator/NY.GDP.PCAP.CD?locations=EG',NULL),
('economy','GDP per capita (current US$)','NY.GDP.PCAP.CD',2018,2484.70,'USD','World Bank','https://data.worldbank.org/indicator/NY.GDP.PCAP.CD?locations=EG',NULL),
('economy','GDP per capita (current US$)','NY.GDP.PCAP.CD',2019,2962.99,'USD','World Bank','https://data.worldbank.org/indicator/NY.GDP.PCAP.CD?locations=EG',NULL),
('economy','GDP per capita (current US$)','NY.GDP.PCAP.CD',2021,3827.35,'USD','World Bank','https://data.worldbank.org/indicator/NY.GDP.PCAP.CD?locations=EG',NULL),
('economy','GDP per capita (current US$)','NY.GDP.PCAP.CD',2023,3456.79,'USD','World Bank','https://data.worldbank.org/indicator/NY.GDP.PCAP.CD?locations=EG','Latest-year figure, subject to revision');

-- GDP growth (annual %) 2010-2024 (new indicator)
INSERT INTO indicators (category, indicator_name, indicator_code, year, value, unit, source, source_url, note) VALUES
('economy','GDP growth (annual %)','NY.GDP.MKTP.KD.ZG',2010,5.15,'% annual','World Bank','https://data.worldbank.org/indicator/NY.GDP.MKTP.KD.ZG?locations=EG',NULL),
('economy','GDP growth (annual %)','NY.GDP.MKTP.KD.ZG',2011,1.76,'% annual','World Bank','https://data.worldbank.org/indicator/NY.GDP.MKTP.KD.ZG?locations=EG','Post-2011-revolution slump'),
('economy','GDP growth (annual %)','NY.GDP.MKTP.KD.ZG',2013,2.19,'% annual','World Bank','https://data.worldbank.org/indicator/NY.GDP.MKTP.KD.ZG?locations=EG',NULL),
('economy','GDP growth (annual %)','NY.GDP.MKTP.KD.ZG',2015,4.37,'% annual','World Bank','https://data.worldbank.org/indicator/NY.GDP.MKTP.KD.ZG?locations=EG',NULL),
('economy','GDP growth (annual %)','NY.GDP.MKTP.KD.ZG',2018,5.33,'% annual','World Bank','https://data.worldbank.org/indicator/NY.GDP.MKTP.KD.ZG?locations=EG',NULL),
('economy','GDP growth (annual %)','NY.GDP.MKTP.KD.ZG',2019,5.55,'% annual','World Bank','https://data.worldbank.org/indicator/NY.GDP.MKTP.KD.ZG?locations=EG',NULL),
('economy','GDP growth (annual %)','NY.GDP.MKTP.KD.ZG',2020,3.55,'% annual','World Bank','https://data.worldbank.org/indicator/NY.GDP.MKTP.KD.ZG?locations=EG','Stayed positive through COVID'),
('economy','GDP growth (annual %)','NY.GDP.MKTP.KD.ZG',2022,6.59,'% annual','World Bank','https://data.worldbank.org/indicator/NY.GDP.MKTP.KD.ZG?locations=EG',NULL),
('economy','GDP growth (annual %)','NY.GDP.MKTP.KD.ZG',2023,3.76,'% annual','World Bank','https://data.worldbank.org/indicator/NY.GDP.MKTP.KD.ZG?locations=EG','Subject to revision'),
('economy','GDP growth (annual %)','NY.GDP.MKTP.KD.ZG',2024,2.40,'% annual','World Bank','https://data.worldbank.org/indicator/NY.GDP.MKTP.KD.ZG?locations=EG','Subject to revision');

-- Urban population (% of total) 2010-2024 (new indicator)
INSERT INTO indicators (category, indicator_name, indicator_code, year, value, unit, source, source_url, note) VALUES
('development','Urban population (% of total)','SP.URB.TOTL.IN.ZS',2010,42.91,'% of population','World Bank','https://data.worldbank.org/indicator/SP.URB.TOTL.IN.ZS?locations=EG',NULL),
('development','Urban population (% of total)','SP.URB.TOTL.IN.ZS',2015,42.61,'% of population','World Bank','https://data.worldbank.org/indicator/SP.URB.TOTL.IN.ZS?locations=EG',NULL),
('development','Urban population (% of total)','SP.URB.TOTL.IN.ZS',2020,42.52,'% of population','World Bank','https://data.worldbank.org/indicator/SP.URB.TOTL.IN.ZS?locations=EG',NULL),
('development','Urban population (% of total)','SP.URB.TOTL.IN.ZS',2024,42.80,'% of population','World Bank','https://data.worldbank.org/indicator/SP.URB.TOTL.IN.ZS?locations=EG','Egypt is only ~43% urban — unusually low for its income level');

-- Life expectancy at birth 2010-2022 (2023 already seeded)
INSERT INTO indicators (category, indicator_name, indicator_code, year, value, unit, source, source_url, note) VALUES
('development','Life expectancy at birth','SP.DYN.LE00.IN',2010,69.08,'years','World Bank','https://data.worldbank.org/indicator/SP.DYN.LE00.IN?locations=EG',NULL),
('development','Life expectancy at birth','SP.DYN.LE00.IN',2015,70.14,'years','World Bank','https://data.worldbank.org/indicator/SP.DYN.LE00.IN?locations=EG',NULL),
('development','Life expectancy at birth','SP.DYN.LE00.IN',2019,71.21,'years','World Bank','https://data.worldbank.org/indicator/SP.DYN.LE00.IN?locations=EG',NULL),
('development','Life expectancy at birth','SP.DYN.LE00.IN',2020,69.79,'years','World Bank','https://data.worldbank.org/indicator/SP.DYN.LE00.IN?locations=EG','COVID-related dip (real)'),
('development','Life expectancy at birth','SP.DYN.LE00.IN',2021,68.98,'years','World Bank','https://data.worldbank.org/indicator/SP.DYN.LE00.IN?locations=EG','COVID-related dip (real)'),
('development','Life expectancy at birth','SP.DYN.LE00.IN',2022,71.01,'years','World Bank','https://data.worldbank.org/indicator/SP.DYN.LE00.IN?locations=EG','Rebound');

-- Under-5 mortality (per 1,000) 2010-2024 (new; distinct from infant mortality)
INSERT INTO indicators (category, indicator_name, indicator_code, year, value, unit, source, source_url, note) VALUES
('development','Mortality rate, under-5','SH.DYN.MORT',2010,30.5,'per 1,000 live births','World Bank / UN IGME','https://data.worldbank.org/indicator/SH.DYN.MORT?locations=EG','UN IGME modelled estimate'),
('development','Mortality rate, under-5','SH.DYN.MORT',2015,26.5,'per 1,000 live births','World Bank / UN IGME','https://data.worldbank.org/indicator/SH.DYN.MORT?locations=EG',NULL),
('development','Mortality rate, under-5','SH.DYN.MORT',2020,24.4,'per 1,000 live births','World Bank / UN IGME','https://data.worldbank.org/indicator/SH.DYN.MORT?locations=EG',NULL),
('development','Mortality rate, under-5','SH.DYN.MORT',2024,22.4,'per 1,000 live births','World Bank / UN IGME','https://data.worldbank.org/indicator/SH.DYN.MORT?locations=EG','Halved since the early 1990s');

-- CO2 emissions per capita 2010-2024 (new)
INSERT INTO indicators (category, indicator_name, indicator_code, year, value, unit, source, source_url, note) VALUES
('environment','CO2 emissions per capita','EN.GHG.CO2.PC.CE.AR5',2010,2.374,'t CO2/capita','World Bank','https://data.worldbank.org/indicator/EN.GHG.CO2.PC.CE.AR5?locations=EG',NULL),
('environment','CO2 emissions per capita','EN.GHG.CO2.PC.CE.AR5',2015,2.404,'t CO2/capita','World Bank','https://data.worldbank.org/indicator/EN.GHG.CO2.PC.CE.AR5?locations=EG',NULL),
('environment','CO2 emissions per capita','EN.GHG.CO2.PC.CE.AR5',2020,2.252,'t CO2/capita','World Bank','https://data.worldbank.org/indicator/EN.GHG.CO2.PC.CE.AR5?locations=EG',NULL),
('environment','CO2 emissions per capita','EN.GHG.CO2.PC.CE.AR5',2024,2.503,'t CO2/capita','World Bank','https://data.worldbank.org/indicator/EN.GHG.CO2.PC.CE.AR5?locations=EG','Low per-capita by global standards');

-- Gross tertiary enrollment (%) selected years (new)
INSERT INTO indicators (category, indicator_name, indicator_code, year, value, unit, source, source_url, note) VALUES
('development','Gross tertiary enrollment','SE.TER.ENRR',2010,30.07,'% gross','World Bank','https://data.worldbank.org/indicator/SE.TER.ENRR?locations=EG',NULL),
('development','Gross tertiary enrollment','SE.TER.ENRR',2015,32.88,'% gross','World Bank','https://data.worldbank.org/indicator/SE.TER.ENRR?locations=EG',NULL),
('development','Gross tertiary enrollment','SE.TER.ENRR',2020,38.77,'% gross','World Bank','https://data.worldbank.org/indicator/SE.TER.ENRR?locations=EG',NULL),
('development','Gross tertiary enrollment','SE.TER.ENRR',2024,37.58,'% gross','World Bank','https://data.worldbank.org/indicator/SE.TER.ENRR?locations=EG',NULL);

-- Government expenditure on education (% of GDP) — note the decline (new)
INSERT INTO indicators (category, indicator_name, indicator_code, year, value, unit, source, source_url, note) VALUES
('development','Government expenditure on education','SE.XPD.TOTL.GD.ZS',2010,3.54,'% of GDP','World Bank','https://data.worldbank.org/indicator/SE.XPD.TOTL.GD.ZS?locations=EG',NULL),
('development','Government expenditure on education','SE.XPD.TOTL.GD.ZS',2014,4.25,'% of GDP','World Bank','https://data.worldbank.org/indicator/SE.XPD.TOTL.GD.ZS?locations=EG','Mid-decade peak'),
('development','Government expenditure on education','SE.XPD.TOTL.GD.ZS',2020,2.48,'% of GDP','World Bank','https://data.worldbank.org/indicator/SE.XPD.TOTL.GD.ZS?locations=EG','Sharp decline; latest reported');

-- Energy time series (Ember / IRENA via Our World in Data) — new
INSERT INTO indicators (category, indicator_name, indicator_code, year, value, unit, source, source_url, note) VALUES
('energy','Total electricity generation','OWID.ELEC.GEN',2010,144.4,'TWh','Ember (via OWID)','https://ourworldindata.org/grapher/electricity-generation',NULL),
('energy','Total electricity generation','OWID.ELEC.GEN',2019,200.6,'TWh','Ember (via OWID)','https://ourworldindata.org/grapher/electricity-generation',NULL),
('energy','Total electricity generation','OWID.ELEC.GEN',2023,221.9,'TWh','Ember (via OWID)','https://ourworldindata.org/grapher/electricity-generation',NULL),
('energy','Total electricity generation','OWID.ELEC.GEN',2024,237.4,'TWh','Ember (via OWID)','https://ourworldindata.org/grapher/electricity-generation',NULL),
('energy','Renewable electricity share','OWID.ELEC.REN.SHARE',2015,8.58,'% of generation','Ember (via OWID)','https://ourworldindata.org/grapher/share-electricity-renewables','Includes hydro'),
('energy','Renewable electricity share','OWID.ELEC.REN.SHARE',2020,11.96,'% of generation','Ember (via OWID)','https://ourworldindata.org/grapher/share-electricity-renewables',NULL),
('energy','Renewable electricity share','OWID.ELEC.REN.SHARE',2024,11.20,'% of generation','Ember (via OWID)','https://ourworldindata.org/grapher/share-electricity-renewables','Share fell as gas generation grew'),
('energy','Installed solar PV capacity','IRENA.SOLAR.MW',2018,764,'MW','IRENA (via OWID)','https://ourworldindata.org/grapher/installed-solar-pv-capacity','Before Benban came fully online'),
('energy','Installed solar PV capacity','IRENA.SOLAR.MW',2019,1647,'MW','IRENA (via OWID)','https://ourworldindata.org/grapher/installed-solar-pv-capacity','Benban online'),
('energy','Installed solar PV capacity','IRENA.SOLAR.MW',2024,2590,'MW','IRENA (via OWID)','https://ourworldindata.org/grapher/installed-solar-pv-capacity','IRENA calendar-year basis (differs from Egypt fiscal-year totals)'),
('energy','Installed wind capacity','IRENA.WIND.MW',2018,1130,'MW','IRENA (via OWID)','https://ourworldindata.org/grapher/cumulative-installed-wind-energy-capacity-gigawatts',NULL),
('energy','Installed wind capacity','IRENA.WIND.MW',2024,2199,'MW','IRENA (via OWID)','https://ourworldindata.org/grapher/cumulative-installed-wind-energy-capacity-gigawatts',NULL),
('energy','CO2 emissions (total)','GCB.CO2.TOTAL',2010,202.7,'Mt CO2','Global Carbon Budget (via OWID)','https://ourworldindata.org/grapher/annual-co2-emissions-per-country',NULL),
('energy','CO2 emissions (total)','GCB.CO2.TOTAL',2021,266.8,'Mt CO2','Global Carbon Budget (via OWID)','https://ourworldindata.org/grapher/annual-co2-emissions-per-country','Peak in the series'),
('energy','CO2 emissions (total)','GCB.CO2.TOTAL',2024,258.4,'Mt CO2','Global Carbon Budget (via OWID)','https://ourworldindata.org/grapher/annual-co2-emissions-per-country',NULL);

-- ============================================================================
-- End of seed_v5.sql
-- ============================================================================
