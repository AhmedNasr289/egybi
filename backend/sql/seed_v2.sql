-- ============================================================================
-- EgyBI — Egypt Knowledge Base — seed data v2 (enrichment; portable MySQL+SQLite)
-- ============================================================================
-- Run AFTER schema_*.sql and seed.sql. Adds demographics, geography, energy,
-- agriculture, water, culture/people, universities, artifacts, more pharaohs,
-- and additional economic/development indicators. Real & cited; disputes flagged.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- population  (World Bank SP.POP.TOTL, mid-year estimates)
-- ---------------------------------------------------------------------------
INSERT INTO population (year, population, source, source_url, note) VALUES
(1960,26896479,'World Bank','https://data.worldbank.org/indicator/SP.POP.TOTL?locations=EG',NULL),
(1970,34623990,'World Bank','https://data.worldbank.org/indicator/SP.POP.TOTL?locations=EG',NULL),
(1980,43950413,'World Bank','https://data.worldbank.org/indicator/SP.POP.TOTL?locations=EG',NULL),
(1990,58396618,'World Bank','https://data.worldbank.org/indicator/SP.POP.TOTL?locations=EG',NULL),
(2000,73083284,'World Bank','https://data.worldbank.org/indicator/SP.POP.TOTL?locations=EG',NULL),
(2010,89196072,'World Bank','https://data.worldbank.org/indicator/SP.POP.TOTL?locations=EG',NULL),
(2015,99597342,'World Bank','https://data.worldbank.org/indicator/SP.POP.TOTL?locations=EG',NULL),
(2020,109315124,'World Bank','https://data.worldbank.org/indicator/SP.POP.TOTL?locations=EG',NULL),
(2022,112618250,'World Bank','https://data.worldbank.org/indicator/SP.POP.TOTL?locations=EG',NULL),
(2023,114535772,'World Bank','https://data.worldbank.org/indicator/SP.POP.TOTL?locations=EG',NULL),
(2024,116538258,'World Bank','https://data.worldbank.org/indicator/SP.POP.TOTL?locations=EG','WB/UN de-facto estimate; CAPMAS (residents in Egypt) reported ~107M in Nov 2024 - a real methodology gap, kept separate');

-- ---------------------------------------------------------------------------
-- governorates  (CAPMAS Nov-2023 estimate + area)
-- ---------------------------------------------------------------------------
INSERT INTO governorates (name, capital, population, area_km2, data_year, source_url) VALUES
('Cairo','Cairo',10456284,3085,2023,'https://en.wikipedia.org/wiki/Governorates_of_Egypt'),
('Giza','Giza',9534283,13184,2023,'https://en.wikipedia.org/wiki/Governorates_of_Egypt'),
('Sharqia','Zagazig',8032683,4911,2023,'https://en.wikipedia.org/wiki/Governorates_of_Egypt'),
('Dakahlia','Mansoura',7058212,3538,2023,'https://en.wikipedia.org/wiki/Governorates_of_Egypt'),
('Beheira','Damanhur',6940234,9826,2023,'https://en.wikipedia.org/wiki/Governorates_of_Egypt'),
('Minya','Minya',6332918,32279,2023,'https://en.wikipedia.org/wiki/Governorates_of_Egypt'),
('Qalyubia','Banha',6137896,1124,2023,'https://en.wikipedia.org/wiki/Governorates_of_Egypt'),
('Sohag','Sohag',5714903,11022,2023,'https://en.wikipedia.org/wiki/Governorates_of_Egypt'),
('Alexandria','Alexandria',5703824,2300,2023,'https://en.wikipedia.org/wiki/Governorates_of_Egypt'),
('Gharbia','Tanta',5483000,1942,2023,'https://en.wikipedia.org/wiki/Governorates_of_Egypt'),
('Asyut','Asyut',5071485,25926,2023,'https://en.wikipedia.org/wiki/Governorates_of_Egypt'),
('Monufia','Shibin El Kom',4743341,2499,2023,'https://en.wikipedia.org/wiki/Governorates_of_Egypt'),
('Faiyum','Faiyum',4141222,6068,2023,'https://en.wikipedia.org/wiki/Governorates_of_Egypt'),
('Kafr El Sheikh','Kafr El Sheikh',3731540,3467,2023,'https://en.wikipedia.org/wiki/Governorates_of_Egypt'),
('Qena','Qena',3651215,10798,2023,'https://en.wikipedia.org/wiki/Governorates_of_Egypt'),
('Beni Suef','Beni Suef',3618395,10954,2023,'https://en.wikipedia.org/wiki/Governorates_of_Egypt'),
('Damietta','Damietta',2023380,910,2023,'https://en.wikipedia.org/wiki/Governorates_of_Egypt'),
('Aswan','Aswan',1698201,62726,2023,'https://en.wikipedia.org/wiki/Governorates_of_Egypt'),
('Ismailia','Ismailia',1482999,5067,2023,'https://en.wikipedia.org/wiki/Governorates_of_Egypt'),
('Luxor','Luxor',1429385,460,2023,'https://en.wikipedia.org/wiki/Governorates_of_Egypt'),
('Suez','Suez',843385,9002,2023,'https://en.wikipedia.org/wiki/Governorates_of_Egypt'),
('Port Said','Port Said',835193,1345,2023,'https://en.wikipedia.org/wiki/Governorates_of_Egypt'),
('Matrouh','Marsa Matruh',580304,166563,2023,'https://en.wikipedia.org/wiki/Governorates_of_Egypt'),
('North Sinai','Arish',544494,28992,2023,'https://en.wikipedia.org/wiki/Governorates_of_Egypt'),
('Red Sea','Hurghada',409394,119099,2023,'https://en.wikipedia.org/wiki/Governorates_of_Egypt'),
('New Valley','Kharga',324600,440098,2023,'https://en.wikipedia.org/wiki/Governorates_of_Egypt'),
('South Sinai','El Tor',145934,31272,2023,'https://en.wikipedia.org/wiki/Governorates_of_Egypt');

-- ---------------------------------------------------------------------------
-- energy_generation  (Ember, 2023 electricity mix)
-- ---------------------------------------------------------------------------
INSERT INTO energy_generation (fuel, share_pct, year, source, source_url) VALUES
('Natural gas',84.0,2023,'Ember','https://ember-energy.org/countries-and-regions/egypt/'),
('Oil & other fossil',4.0,2023,'Ember','https://ember-energy.org/countries-and-regions/egypt/'),
('Hydropower (mostly Aswan)',7.0,2023,'Ember','https://ember-energy.org/countries-and-regions/egypt/'),
('Wind & solar',5.0,2023,'Ember','https://ember-energy.org/countries-and-regions/egypt/');

-- ---------------------------------------------------------------------------
-- renewable_projects
-- ---------------------------------------------------------------------------
INSERT INTO renewable_projects (name, type, capacity_mw, location, status, source_url, note) VALUES
('Benban Solar Park','solar',1800,'Aswan','Operational','https://en.wikipedia.org/wiki/Benban_Solar_Park','~1.8 GW commonly cited; some 2025 reporting cites ~1.465 GW grid-connected'),
('Gabal El Zeit Wind','wind',580,'Gulf of Suez','Operational','https://sdgs.un.org/partnerships/gabel-el-zeit-wind-farm-complex-ensuring-access-affordable-reliable-and-modern-energy','~51.7% capacity factor'),
('Suez Wind (ACWA/Hassan Allam)','wind',1100,'Gulf of Suez','Under construction','https://africa-energy-portal.org/news/egypt-acwa-and-hassan-allam-build-11-gw-wind-power-complex-gabal-el-zeit','Financial close Jan 2025; operations targeted Q2 2027 (projection)'),
('Amunet Wind Farm','wind',500,'Ras Ghareb','Under construction','https://www.amcham.org.eg/publications/industry-insight/issue/78/major-renewable-energy-projects-in-egypt','Expected operational 2025 (projection)'),
('Kom Ombo Solar','solar',200,'Aswan','Operational','https://www.amcham.org.eg/publications/industry-insight/issue/78/major-renewable-energy-projects-in-egypt','Achieved a record-low tariff'),
('Abydos 1 Solar (AMEA Power)','solar',500,'Kom Ombo','Operational','https://www.amcham.org.eg/publications/industry-insight/issue/78/major-renewable-energy-projects-in-egypt','Operational since Dec 2024');

-- ---------------------------------------------------------------------------
-- agriculture
-- ---------------------------------------------------------------------------
INSERT INTO agriculture (crop, figure, year, source, source_url, note) VALUES
('Cotton','2.1 million metric kentars','2023','EgyptToday / USDA FAS','https://www.egypttoday.com/Article/1/134079/Egypt-s-output-of-cotton-hits-2-1M-metric-kentars','Egypt supplies ~25-30% of global extra-long-staple (ELS) cotton'),
('Wheat','9.8 million tonnes','MY2023/24','USDA FAS (forecast)','https://www.fas.usda.gov/data/egypt-citrus-annual-7','Forecast figure'),
('Rice (milled)','~3.8 million tonnes','2020-2023 avg','FAO','https://www.fao.org/faostat/','Average over 2020-23'),
('Sugarcane','~12.4 million tonnes','2021','FAO / Statista','https://www.fao.org/faostat/','Most recent found (2021)'),
('Oranges','~3.7 million tonnes','2023/24','USDA FAS (projection)','https://www.fas.usda.gov/data/egypt-citrus-annual-7','Projection; citrus exports exceed 2M tonnes');

-- ---------------------------------------------------------------------------
-- water_facts
-- ---------------------------------------------------------------------------
INSERT INTO water_facts (item, value, note, source_url) VALUES
('Nile length','~6,650 km','Britannica cites ~6,650 km; Wikipedia now cites 7,088 km - sources disagree on the total. The reach within Egypt is not firmly sourced.','https://www.britannica.com/place/Nile-River'),
('Lake Nasser capacity','~132-169 billion m3','Created by the Aswan High Dam; sources give a range. Extends ~320 km inside Egypt + ~160 km in Sudan.','https://en.wikipedia.org/wiki/Lake_Nasser'),
('Aswan High Dam','111 m high, 3,830 m crest','Built 1960-1970; generates hydropower and controls Nile flooding.','https://www.britannica.com/topic/Aswan-High-Dam'),
('GERD (Ethiopia)','5,150 MW; reservoir ~74 bcm','Africa''s largest hydro project; reservoir filling completed Sept 2024, inaugurated Sept 2025 WITHOUT a binding tripartite agreement. An active, unresolved dispute affecting Egypt''s water security.','https://en.wikipedia.org/wiki/Grand_Ethiopian_Renaissance_Dam'),
('Egypt Nile allocation (1959 treaty)','55.5 billion m3 / year','Against national demand (~80 bcm) exceeding renewable resources (~60 bcm) - a structural water deficit.','https://www.egyptindependent.com/egypt-and-sudan-reaffirm-nile-water-rights-and-joint-1959-agreement/');

-- ---------------------------------------------------------------------------
-- notable_people
-- ---------------------------------------------------------------------------
INSERT INTO notable_people (name, field, birth_year, death_year, nobel, significance, source_url) VALUES
('Naguib Mahfouz','Literature',1911,2006,'Nobel Literature 1988','First Arabic-language Nobel laureate in Literature.','https://en.wikipedia.org/wiki/List_of_Egyptian_Nobel_laureates_and_nominees'),
('Ahmed Zewail','Chemistry',1946,2016,'Nobel Chemistry 1999','Femtochemistry (femtosecond spectroscopy); first Arab science Nobel laureate.','https://www.britannica.com/biography/Ahmed-Zewail'),
('Mohamed ElBaradei','Law / diplomacy',1942,NULL,'Nobel Peace 2005','Led the IAEA; shared the 2005 Peace Prize.','https://en.wikipedia.org/wiki/List_of_Egyptian_Nobel_laureates_and_nominees'),
('Anwar Sadat','Politics',1918,1981,'Nobel Peace 1978','Shared the 1978 Peace Prize for the Egypt-Israel peace.','https://www.britannica.com/biography/Anwar-Sadat'),
('Boutros Boutros-Ghali','Diplomacy',1922,2016,NULL,'6th UN Secretary-General (1992-96); first African/Arab to hold the post.','https://en.wikipedia.org/wiki/Boutros_Boutros-Ghali'),
('Umm Kulthum','Music',1904,1975,NULL,'The most celebrated singer in the Arab world; a national icon.','https://en.wikipedia.org/wiki/Umm_Kulthum'),
('Omar Sharif','Film',1932,2015,NULL,'Star of Lawrence of Arabia and Doctor Zhivago.','https://en.wikipedia.org/wiki/Omar_Sharif'),
('Magdi Yacoub','Medicine',1935,NULL,NULL,'Pioneering cardiothoracic / heart-transplant surgeon.','https://en.wikipedia.org/wiki/Magdi_Yacoub'),
('Naguib Sawiris','Business',1954,NULL,NULL,'Telecom billionaire; built Orascom Telecom.','https://en.wikipedia.org/wiki/Naguib_Sawiris'),
('Mohamed Salah','Football',1992,NULL,NULL,'Egypt captain; Liverpool forward; record foreign Premier League goalscorer.','https://www.britannica.com/biography/Mohamed-Salah'),
('Farouk El-Baz','Space science',1938,NULL,NULL,'NASA Apollo lunar geologist; helped choose Moon-landing sites.','https://en.wikipedia.org/wiki/Farouk_El-Baz'),
('Taha Hussein','Literature',1889,1973,NULL,'The "Dean of Arabic Literature"; modernist writer and education reformer.','https://en.wikipedia.org/wiki/List_of_Egyptian_Nobel_laureates_and_nominees');

-- ---------------------------------------------------------------------------
-- universities
-- ---------------------------------------------------------------------------
INSERT INTO universities (name, founded_year, type, note, source_url) VALUES
('Al-Azhar University',970,'Public / religious','Egypt''s oldest degree-granting institution; among the world''s oldest universities.','https://en.wikipedia.org/wiki/Al-Azhar_University'),
('Cairo University',1908,'Public','Second-oldest; formerly Fuad I University.','https://en.wikipedia.org/wiki/Cairo_University'),
('American University in Cairo (AUC)',1919,'Private','Founded by the American Mission in Egypt.','https://en.wikipedia.org/wiki/American_University_in_Cairo'),
('Alexandria University',1938,'Public','Formerly Farouk I University; third public university.','https://en.wikipedia.org/wiki/Alexandria_University'),
('Ain Shams University',1950,'Public','Third-oldest non-sectarian public Egyptian university.','https://en.wikipedia.org/wiki/Ain_Shams_University');

-- ---------------------------------------------------------------------------
-- artifacts
-- ---------------------------------------------------------------------------
INSERT INTO artifacts (name, dated, significance, current_location, source_url) VALUES
('Rosetta Stone','196 BCE','A trilingual (hieroglyphic, Demotic, Greek) decree under Ptolemy V; enabled Champollion''s 1822 decipherment of hieroglyphs.','British Museum, London','https://en.wikipedia.org/wiki/Rosetta_Stone'),
('Dendera Zodiac','Late Ptolemaic','A rare ancient sky-map ceiling relief from the Hathor temple at Dendera; removed to France in 1821.','Louvre, Paris','https://en.wikipedia.org/wiki/Dendera_zodiac'),
('Serapeum of Alexandria','246-221 BCE','Temple of Serapis built under Ptolemy III, housing a "daughter" library of the Great Library; destroyed 391 CE.','Alexandria (ruins)','http://www.bibalex.org/alexmed/projects/Details.aspx?ID=5036d643-6d40-4c7f-a189-e7a2331101ca'),
('Bibliotheca Alexandrina','2002 (modern)','A modern library and cultural complex commemorating the ancient Library of Alexandria.','Alexandria','http://www.bibalex.org/');

-- ---------------------------------------------------------------------------
-- additional pharaohs  (ids 34-39; Met Museum dates, approximate)
-- ---------------------------------------------------------------------------
INSERT INTO pharaohs (id, name, dynasty, reign_start, reign_end, era, predecessor_id, certainty_note) VALUES
(34,'Djedefre','IV',-2528,-2520,'Old Kingdom',5,'Son/successor of Khufu; first to use "Son of Ra". Old Kingdom dates approximate'),
(35,'Shepseskaf','IV',-2472,-2467,'Old Kingdom',NULL,'Last king of the 4th Dynasty; approximate'),
(36,'Teti','VI',-2323,-2291,'Old Kingdom',NULL,'Founder of the 6th Dynasty; approximate'),
(37,'Merenre I','VI',-2255,-2246,'Old Kingdom',NULL,'4th king of the 6th Dynasty; approximate'),
(38,'Ptolemy III Euergetes','Ptolemaic',-246,-222,'Ptolemaic',31,'Built the Alexandria Serapeum'),
(39,'Ptolemy V Epiphanes','Ptolemaic',-204,-181,'Ptolemaic',NULL,'The Rosetta Stone king');
