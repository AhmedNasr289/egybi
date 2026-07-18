-- ============================================================================
-- EgyBI — Egypt Knowledge Base — seed data (portable: MySQL + SQLite)
-- ============================================================================
-- Every row is real and sourced. Disputed / approximate / estimate figures are
-- flagged in each row's note / certainty_note column (project content rule:
-- never present an uncertain figure as settled fact).
-- Run AFTER schema_mysql.sql (Hostinger) or schema_sqlite.sql (local test).
-- Insert order respects foreign keys (parents before children).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- pharaohs  (signed years: negative = BCE. reign length = reign_end - reign_start)
-- ---------------------------------------------------------------------------
INSERT INTO pharaohs (id, name, dynasty, reign_start, reign_end, era, predecessor_id, certainty_note) VALUES
(1,'Narmer (Menes)','I',-3100,NULL,'Early Dynastic',NULL,'Accession only inferred; no reliable end date'),
(2,'Khasekhemwy','II',-2690,-2686,'Early Dynastic',NULL,'Approximate'),
(3,'Djoser','III',-2670,-2650,'Old Kingdom',NULL,'Approximate'),
(4,'Sneferu','IV',-2613,-2589,'Old Kingdom',NULL,'Approximate'),
(5,'Khufu','IV',-2589,-2566,'Old Kingdom',4,'Approximate'),
(6,'Khafre','IV',-2558,-2532,'Old Kingdom',5,'Djedefre reigned between Khufu and Khafre but is not in this set'),
(7,'Menkaure','IV',-2532,-2503,'Old Kingdom',6,'Approximate'),
(8,'Userkaf','V',-2494,-2487,'Old Kingdom',NULL,'Approximate'),
(9,'Unas','V',-2375,-2345,'Old Kingdom',NULL,'Approximate'),
(10,'Pepi II','VI',-2278,-2184,'Old Kingdom',NULL,'Disputed reign length: Turin King List says 94 years; most Egyptologists now favor ~64'),
(11,'Mentuhotep II','XI',-2055,-2004,'Middle Kingdom',NULL,'Approximate'),
(12,'Amenemhat I','XII',-1991,-1962,'Middle Kingdom',NULL,'Approximate; likely a commoner-vizier founder of the dynasty'),
(13,'Senusret I','XII',-1962,-1926,'Middle Kingdom',12,'Co-regent with Amenemhat I for ~10 years'),
(14,'Amenemhat II','XII',-1926,-1895,'Middle Kingdom',13,'Approximate'),
(15,'Senusret II','XII',-1895,-1878,'Middle Kingdom',14,'Approximate'),
(16,'Senusret III','XII',-1878,-1839,'Middle Kingdom',15,'Possible co-regency with Amenemhat III is disputed'),
(17,'Amenemhat III','XII',-1860,-1814,'Middle Kingdom',16,'Start date disputed depending on co-regency assumption (sources give 1860 or 1839)'),
(18,'Sobekneferu','XII',-1806,-1802,'Middle Kingdom',NULL,'Approximate'),
(19,'Ahmose I','XVIII',-1550,-1525,'New Kingdom',NULL,'Approximate'),
(20,'Hatshepsut','XVIII',-1479,-1458,'New Kingdom',NULL,'Assumed senior kingship over her stepson Thutmose III; later erased from monuments'),
(21,'Thutmose III','XVIII',-1479,-1425,'New Kingdom',NULL,'Nominal co-ruler with Hatshepsut until her death'),
(22,'Amenhotep III','XVIII',-1388,-1351,'New Kingdom',NULL,'Approximate'),
(23,'Akhenaten','XVIII',-1353,-1336,'New Kingdom',NULL,'Approximate'),
(24,'Tutankhamun','XVIII',-1332,-1323,'New Kingdom',NULL,'Parentage disputed; interim successors Smenkhkare/Neferneferuaten are not in this set'),
(25,'Horemheb','XVIII',-1319,-1292,'New Kingdom',NULL,'A general with no heir; installed Ramesses I as successor'),
(26,'Seti I','XIX',-1290,-1279,'New Kingdom',NULL,'Approximate'),
(27,'Ramesses II','XIX',-1279,-1213,'New Kingdom',26,'Approximate'),
(28,'Merneptah','XIX',-1213,-1203,'New Kingdom',27,'Approximate'),
(29,'Ramesses III','XX',-1186,-1155,'New Kingdom',NULL,'Approximate'),
(30,'Ptolemy I Soter','Ptolemaic',-305,-282,'Ptolemaic',NULL,'Exact per Greek administrative records'),
(31,'Ptolemy II Philadelphus','Ptolemaic',-285,-246,'Ptolemaic',30,'Co-regent with Ptolemy I from 285 BCE'),
(32,'Ptolemy XII Auletes','Ptolemaic',-80,-51,'Ptolemaic',NULL,'Reign interrupted 58-55 BCE by exile'),
(33,'Cleopatra VII','Ptolemaic',-51,-30,'Ptolemaic',32,'Exact per Greek/Roman records');

-- ---------------------------------------------------------------------------
-- monuments
-- ---------------------------------------------------------------------------
INSERT INTO monuments (id, name, pharaoh_id, dynasty, construction_start, construction_end, location, certainty_note) VALUES
(1,'Step Pyramid of Djoser',3,'III',-2670,-2650,'Saqqara','Architect Imhotep; approximate'),
(2,'Bent Pyramid',4,'IV',-2610,-2600,'Dahshur','Approximate'),
(3,'Red Pyramid',4,'IV',-2575,-2563,'Dahshur','First true smooth-sided pyramid'),
(4,'Great Pyramid of Khufu',5,'IV',-2589,-2560,'Giza','Approximate'),
(5,'Pyramid of Khafre',6,'IV',-2570,-2530,'Giza','Approximate'),
(6,'Pyramid of Menkaure',7,'IV',-2532,-2510,'Giza','Approximate'),
(7,'Great Sphinx',6,'IV',-2570,-2530,'Giza','Attribution disputed - mainstream favors Khafre; some evidence points to Djedefre/Khufu'),
(8,'Karnak Temple Complex',NULL,'XII-Ptolemaic',-1971,-30,'Thebes/Luxor','Built over ~2000 years by ~30 pharaohs'),
(9,'Luxor Temple',22,'XVIII',-1400,-1213,'Luxor','Completed by Tutankhamun/Horemheb; expanded by Ramesses II'),
(10,'Mortuary Temple of Hatshepsut',20,'XVIII',-1479,-1458,'Deir el-Bahari','Approximate'),
(11,'Colossi of Memnon',22,'XVIII',-1350,-1350,'Luxor West Bank','Remnants of a mortuary temple'),
(12,'Ramesseum',27,'XIX',-1279,-1213,'Luxor West Bank','Approximate'),
(13,'Abu Simbel',27,'XIX',-1264,-1244,'Aswan (Nubia)','Start date disputed +/-20 years depending on Battle of Kadesh chronology'),
(14,'Temple of Seti I',26,'XIX',-1290,-1279,'Abydos','Completed by Ramesses II'),
(15,'Medinet Habu',29,'XX',-1184,-1153,'Luxor West Bank','Approximate'),
(16,'Philae Temple of Isis',NULL,'XXV-Ptolemaic',-690,-221,'Philae/Agilkia, Aswan','Roman-era additions continued into the 2nd century CE'),
(17,'Temple of Horus',NULL,'Ptolemaic',-237,-57,'Edfu','Built under Ptolemy III-XII (not all in this set)'),
(18,'Temple of Kom Ombo',NULL,'Ptolemaic',-180,-47,'Kom Ombo','Approximate'),
(19,'Temple of Hathor',NULL,'Ptolemaic-Roman',NULL,14,'Dendera','Present structure Ptolemaic-Roman, completed ~14 CE (positive year); site occupied since the Old Kingdom'),
(20,'Tomb of Tutankhamun (KV62)',24,'XVIII',-1332,-1323,'Valley of the Kings','Approximate');

-- ---------------------------------------------------------------------------
-- historical_eras  (negative start/end = BCE; NULL end = ongoing)
-- ---------------------------------------------------------------------------
INSERT INTO historical_eras (id, name, start_year, end_year, era_type, description, source_url) VALUES
(1,'Ptolemaic Period',-305,-30,'Hellenistic','Greek Macedonian dynasty founded by Ptolemy I; ended with Cleopatra VII and Roman annexation.','https://www.britannica.com/topic/Ptolemaic-dynasty'),
(2,'Roman & Byzantine Egypt',-30,641,'Roman/Byzantine','Egypt as a Roman then Byzantine province; rise of Coptic Christianity and the Chalcedon schism (451).','https://www.britannica.com/place/ancient-Egypt/Roman-and-Byzantine-Egypt-30-bce-642-ce'),
(3,'Early Islamic Egypt',639,969,'Islamic','Arab conquest (639-642); Umayyad, Abbasid, and Tulunid rule from Fustat.','https://en.wikipedia.org/wiki/Arab_conquest_of_Egypt'),
(4,'Fatimid, Ayyubid & Mamluk',969,1517,'Islamic (medieval)','Founding of Cairo (969), Saladin''s Ayyubids, and the Mamluk Sultanate.','https://www.britannica.com/place/Egypt/The-Fatimid-dynasty-969-1171'),
(5,'Ottoman Egypt',1517,1867,'Ottoman','Ottoman province after Selim I''s 1517 conquest; Muhammad Ali''s modernizing dynasty from 1805.','https://www.britannica.com/place/Egypt/The-Ottomans-1517-1798'),
(6,'Khedivate & British Occupation',1867,1952,'Colonial','Khedivate, 1882 British occupation, 1914 protectorate, 1922 nominal independence; monarchy under Fuad I and Farouk.','https://en.wikipedia.org/wiki/History_of_Egypt_under_the_British'),
(7,'Nasser Era (Republic)',1952,1970,'Modern Republic','1952 Free Officers revolution, republic (1953), Suez Crisis (1956), Aswan High Dam, and the 1967 war.','https://www.britannica.com/place/Egypt/The-revolution-and-the-Republic'),
(8,'Sadat Era',1970,1981,'Modern Republic','1973 October War, Camp David Accords (1978), Egypt-Israel peace (1979); Sadat assassinated 1981.','https://www.britannica.com/biography/Anwar-Sadat'),
(9,'Mubarak Era',1981,2011,'Modern Republic','A 29-year presidency and economic liberalization, ended by the January 25, 2011 revolution.','https://www.britannica.com/biography/Hosni-Mubarak'),
(10,'Post-2011 / El-Sisi Era',2011,NULL,'Modern Republic','2011 revolution, Morsi presidency (2012-13), 2013 military intervention, El-Sisi president from 2014.','https://en.wikipedia.org/wiki/2011_Egyptian_revolution');

-- ---------------------------------------------------------------------------
-- historical_events
-- ---------------------------------------------------------------------------
INSERT INTO historical_events (era_id, name, event_year, event_date_note, description, certainty_note, source_url) VALUES
(1,'Battle of Actium',-31,NULL,'Octavian defeated Antony and Cleopatra, ending their bid to control Rome''s east.',NULL,'https://en.wikipedia.org/wiki/Battle_of_Actium'),
(1,'Death of Cleopatra VII',-30,'Aug 30 BCE','Cleopatra''s suicide after Alexandria fell, ending 275 years of Ptolemaic rule.','Exact day disputed (Aug 10 vs 12, 30 BCE)','https://en.wikipedia.org/wiki/Death_of_Cleopatra'),
(1,'Roman annexation of Egypt',-30,NULL,'Egypt became a personal province of Octavian (Augustus).',NULL,'https://www.britannica.com/place/ancient-Egypt/Roman-and-Byzantine-Egypt-30-bce-642-ce'),
(2,'Council of Chalcedon',451,NULL,'The Coptic church rejected the council ruling, splitting from Constantinople/Rome (Miaphysite schism).',NULL,'https://www.britannica.com/event/Council-of-Chalcedon'),
(2,'Byzantine surrender of Alexandria',641,'Nov 8, 641','Alexandria surrendered by treaty, ending ~670 years of Greco-Roman rule.','Final Byzantine evacuation completed Sept 642','https://en.wikipedia.org/wiki/Siege_of_Alexandria_(641)'),
(3,'Arab conquest of Egypt',639,NULL,'General Amr ibn al-As invaded; conquest completed with Alexandria''s fall (641-642).',NULL,'https://en.wikipedia.org/wiki/Arab_conquest_of_Egypt'),
(3,'Tulunid dynasty founded',868,NULL,'Ahmad ibn Tulun founded Egypt''s first quasi-independent Islamic dynasty and built the Mosque of Ibn Tulun.',NULL,'https://www.britannica.com/biography/Ahmad-ibn-Tulun'),
(4,'Fatimid founding of Cairo',969,NULL,'The Fatimids conquered Egypt and founded al-Qahira (Cairo) with Al-Azhar at its centre.',NULL,'https://www.britannica.com/topic/Fatimid-dynasty'),
(4,'Saladin ends the Fatimid caliphate',1171,NULL,'Saladin abolished the Fatimid caliphate and founded the Ayyubid dynasty.',NULL,'https://en.wikipedia.org/wiki/Ayyubid_dynasty'),
(4,'Mamluk Sultanate founded',1250,NULL,'Slave-soldier (Mamluk) generals overthrew the Ayyubids.',NULL,'https://en.wikipedia.org/wiki/Mamluk_Sultanate'),
(4,'Battle of Ain Jalut',1260,NULL,'An Egyptian-based Mamluk force halted the Mongol advance in Palestine.',NULL,'https://en.wikipedia.org/wiki/Bahri_Mamluks'),
(5,'Ottoman conquest of Egypt',1517,'Jan 24, 1517','Selim I defeated the Mamluks (Battle of Ridaniya) and made Egypt an Ottoman province.',NULL,'https://en.wikipedia.org/wiki/Selim_I'),
(5,'Napoleon''s invasion of Egypt',1798,NULL,'A French occupation briefly interrupted Ottoman/Mamluk control until 1801.',NULL,'https://www.britannica.com/place/Egypt/The-Ottomans-1517-1798'),
(5,'Muhammad Ali takes power',1805,NULL,'An Ottoman-Albanian officer seized power and founded a modernizing dynasty.',NULL,'https://en.wikipedia.org/wiki/History_of_Egypt_under_the_Muhammad_Ali_dynasty'),
(6,'British occupation begins',1882,NULL,'Britain defeated Egyptian forces at Tel el-Kebir after the Urabi revolt, beginning a de facto protectorate.',NULL,'https://www.britannica.com/place/Egypt/Renewed-European-intervention-1879-82'),
(6,'Formal British protectorate declared',1914,NULL,'Britain declared a protectorate as the Ottomans entered WWI on the opposing side.',NULL,'https://en.wikipedia.org/wiki/History_of_Egypt_under_the_British'),
(6,'Declaration of Egyptian Independence',1922,'Feb 28, 1922','Britain ended the protectorate; Fuad I became king, with Britain retaining reserved powers.',NULL,'https://en.wikipedia.org/wiki/Unilateral_Declaration_of_Egyptian_Independence'),
(7,'Free Officers Revolution',1952,'Jul 23, 1952','A coup led by Nasser forced King Farouk''s abdication and exile.',NULL,'https://en.wikipedia.org/wiki/Egyptian_revolution_of_1952'),
(7,'Republic declared',1953,NULL,'The monarchy was formally abolished.',NULL,'https://www.britannica.com/place/Egypt/The-revolution-and-the-Republic'),
(7,'Suez Crisis',1956,NULL,'Nasser nationalized the Suez Canal; Britain, France, and Israel invaded then withdrew under US/Soviet pressure.',NULL,'https://en.wikipedia.org/wiki/Suez_Crisis'),
(7,'Six-Day War',1967,'Jun 5-10, 1967','Israel''s preemptive strikes led to Egypt''s loss of the Sinai Peninsula and Gaza Strip.',NULL,'https://en.wikipedia.org/wiki/Gamal_Abdel_Nasser'),
(7,'Aswan High Dam completed',1970,NULL,'The Soviet-financed dam was completed after Western funding was withdrawn.','Built 1960-1970','https://en.wikipedia.org/wiki/Gamal_Abdel_Nasser'),
(8,'October (Yom Kippur) War',1973,'Oct 6-25, 1973','Egypt''s surprise Suez Canal crossing restored national prestige and enabled later diplomacy.',NULL,'https://www.britannica.com/biography/Anwar-Sadat'),
(8,'Camp David Accords',1978,'Sep 17, 1978','Sadat and Begin, mediated by Carter, signed a peace framework (shared the 1978 Nobel Peace Prize).',NULL,'https://en.wikipedia.org/wiki/Camp_David_Accords'),
(8,'Egypt-Israel Peace Treaty',1979,'Mar 26, 1979','Egypt became the first Arab state to recognize Israel.',NULL,'https://www.britannica.com/biography/Anwar-Sadat'),
(8,'Assassination of Sadat',1981,'Oct 6, 1981','Sadat was killed by Islamic Jihad militants during a military parade.',NULL,'https://en.wikipedia.org/wiki/Assassination_of_Anwar_Sadat'),
(9,'Mubarak becomes president',1981,NULL,'Assumed power immediately after Sadat''s assassination; ruled for 29 years.',NULL,'https://www.britannica.com/biography/Hosni-Mubarak'),
(9,'January 25 Revolution',2011,'Jan 25 - Feb 11, 2011','Arab-Spring protests forced Mubarak''s resignation after 18 days.',NULL,'https://en.wikipedia.org/wiki/2011_Egyptian_revolution'),
(10,'Morsi elected president',2012,NULL,'Mohamed Morsi (Muslim Brotherhood) won Egypt''s first free presidential election.',NULL,'https://en.wikipedia.org/wiki/2013_Egyptian_coup_d%27%C3%A9tat'),
(10,'2013 military intervention',2013,'Jul 3, 2013','Following mass June 30 protests, Gen. el-Sisi led the removal of Morsi.',NULL,'https://en.wikipedia.org/wiki/2013_Egyptian_coup_d%27%C3%A9tat'),
(10,'New Suez Canal opens',2015,'Aug 6, 2015','An ~$8bn expansion enabling two-way transit opened.',NULL,'https://en.wikipedia.org/wiki/Suez_Canal_Area_Development_Project'),
(10,'El-Sisi becomes president',2014,NULL,'Sisi won the 2014 election, was reelected in 2018, and remains president as of 2026.',NULL,'https://en.wikipedia.org/wiki/Egyptian_Crisis_(2011%E2%80%932014)'),
(10,'Grand Egyptian Museum opens',2025,'Nov 1, 2025','Official inauguration after ~two decades of construction.',NULL,'https://sis.gov.eg/en/media-center/events/president-el-sisi-attends-the-historic-opening-ceremony-of-the-grand-egyptian-museum-gem/');

-- ---------------------------------------------------------------------------
-- modern_leaders
-- ---------------------------------------------------------------------------
INSERT INTO modern_leaders (name, title, reign_start_year, reign_end_year, era_id, notes, source_url) VALUES
('Muhammad Ali Pasha','Wali of Egypt',1805,1848,5,'Founder of the modernizing dynasty that ruled (nominally under Ottoman suzerainty) until 1952.','https://en.wikipedia.org/wiki/History_of_Egypt_under_the_Muhammad_Ali_dynasty'),
('King Farouk','King',1936,1952,6,'Last effective king of Egypt; abdicated after the 1952 coup.','https://en.wikipedia.org/wiki/History_of_Egypt_under_the_British'),
('Gamal Abdel Nasser','President',1956,1970,7,'Led the 1952 revolution, president from 1956; nationalized the Suez Canal; died in office 1970.','https://en.wikipedia.org/wiki/Gamal_Abdel_Nasser'),
('Anwar Sadat','President',1970,1981,8,'Signed the 1979 Egypt-Israel peace treaty; assassinated in 1981.','https://www.britannica.com/biography/Anwar-Sadat'),
('Hosni Mubarak','President',1981,2011,9,'Ruled for 29 years; resigned in the 2011 revolution.','https://www.britannica.com/biography/Hosni-Mubarak'),
('Mohamed Morsi','President',2012,2013,10,'First freely elected president; removed by the military in 2013.','https://en.wikipedia.org/wiki/2013_Egyptian_coup_d%27%C3%A9tat'),
('Abdel Fattah el-Sisi','President',2014,NULL,10,'President since 2014; incumbent as of 2026.','https://en.wikipedia.org/wiki/Egyptian_Crisis_(2011%E2%80%932014)');

-- ---------------------------------------------------------------------------
-- indicators  (economy + development time series; World Bank unless noted)
-- ---------------------------------------------------------------------------
INSERT INTO indicators (category, indicator_name, indicator_code, year, value, unit, source, source_url, note) VALUES
('economy','GDP (current US$)','NY.GDP.MKTP.CD',2014,305.60,'USD billion','World Bank','https://data.worldbank.org/indicator/NY.GDP.MKTP.CD?locations=EG',NULL),
('economy','GDP (current US$)','NY.GDP.MKTP.CD',2015,329.37,'USD billion','World Bank','https://data.worldbank.org/indicator/NY.GDP.MKTP.CD?locations=EG',NULL),
('economy','GDP (current US$)','NY.GDP.MKTP.CD',2016,332.44,'USD billion','World Bank','https://data.worldbank.org/indicator/NY.GDP.MKTP.CD?locations=EG',NULL),
('economy','GDP (current US$)','NY.GDP.MKTP.CD',2017,248.36,'USD billion','World Bank','https://data.worldbank.org/indicator/NY.GDP.MKTP.CD?locations=EG','Nominal-USD dip reflects the Nov 2016 EGP flotation, not real contraction'),
('economy','GDP (current US$)','NY.GDP.MKTP.CD',2018,262.59,'USD billion','World Bank','https://data.worldbank.org/indicator/NY.GDP.MKTP.CD?locations=EG',NULL),
('economy','GDP (current US$)','NY.GDP.MKTP.CD',2019,318.68,'USD billion','World Bank','https://data.worldbank.org/indicator/NY.GDP.MKTP.CD?locations=EG',NULL),
('economy','GDP (current US$)','NY.GDP.MKTP.CD',2020,383.82,'USD billion','World Bank','https://data.worldbank.org/indicator/NY.GDP.MKTP.CD?locations=EG',NULL),
('economy','GDP (current US$)','NY.GDP.MKTP.CD',2021,424.67,'USD billion','World Bank','https://data.worldbank.org/indicator/NY.GDP.MKTP.CD?locations=EG',NULL),
('economy','GDP (current US$)','NY.GDP.MKTP.CD',2022,476.75,'USD billion','World Bank','https://data.worldbank.org/indicator/NY.GDP.MKTP.CD?locations=EG','Nominal-USD peak'),
('economy','GDP (current US$)','NY.GDP.MKTP.CD',2023,395.93,'USD billion','World Bank','https://data.worldbank.org/indicator/NY.GDP.MKTP.CD?locations=EG','Nominal-USD decline reflects 2022-23 EGP devaluations, not real contraction'),
('economy','GDP (current US$)','NY.GDP.MKTP.CD',2024,389.06,'USD billion','World Bank','https://data.worldbank.org/indicator/NY.GDP.MKTP.CD?locations=EG','Nominal-USD; local-currency and real GDP grew'),
('economy','GDP per capita (current US$)','NY.GDP.PCAP.CD',2014,3133,'USD','World Bank','https://data.worldbank.org/indicator/NY.GDP.PCAP.CD?locations=EG',NULL),
('economy','GDP per capita (current US$)','NY.GDP.PCAP.CD',2017,2395,'USD','World Bank','https://data.worldbank.org/indicator/NY.GDP.PCAP.CD?locations=EG','Reflects the Nov 2016 EGP flotation'),
('economy','GDP per capita (current US$)','NY.GDP.PCAP.CD',2020,3511,'USD','World Bank','https://data.worldbank.org/indicator/NY.GDP.PCAP.CD?locations=EG',NULL),
('economy','GDP per capita (current US$)','NY.GDP.PCAP.CD',2022,4233,'USD','World Bank','https://data.worldbank.org/indicator/NY.GDP.PCAP.CD?locations=EG','Nominal-USD peak'),
('economy','GDP per capita (current US$)','NY.GDP.PCAP.CD',2024,3338,'USD','World Bank','https://data.worldbank.org/indicator/NY.GDP.PCAP.CD?locations=EG',NULL),
('economy','Agriculture, value added (% of GDP)','NV.AGR.TOTL.ZS',2018,10.83,'% of GDP','World Bank','https://data.worldbank.org/indicator/NV.AGR.TOTL.ZS?locations=EG',NULL),
('economy','Agriculture, value added (% of GDP)','NV.AGR.TOTL.ZS',2020,11.17,'% of GDP','World Bank','https://data.worldbank.org/indicator/NV.AGR.TOTL.ZS?locations=EG',NULL),
('economy','Agriculture, value added (% of GDP)','NV.AGR.TOTL.ZS',2023,10.60,'% of GDP','World Bank','https://data.worldbank.org/indicator/NV.AGR.TOTL.ZS?locations=EG',NULL),
('economy','Industry, value added (% of GDP)','NV.IND.TOTL.ZS',2018,35.33,'% of GDP','World Bank','https://data.worldbank.org/indicator/NV.IND.TOTL.ZS?locations=EG','Includes construction'),
('economy','Industry, value added (% of GDP)','NV.IND.TOTL.ZS',2020,32.37,'% of GDP','World Bank','https://data.worldbank.org/indicator/NV.IND.TOTL.ZS?locations=EG',NULL),
('economy','Industry, value added (% of GDP)','NV.IND.TOTL.ZS',2023,32.73,'% of GDP','World Bank','https://data.worldbank.org/indicator/NV.IND.TOTL.ZS?locations=EG',NULL),
('economy','Services, value added (% of GDP)','NV.SRV.TOTL.ZS',2018,51.64,'% of GDP','World Bank','https://data.worldbank.org/indicator/NV.SRV.TOTL.ZS?locations=EG','Sector shares sum to ~95%; residual is taxes-less-subsidies (WB methodology)'),
('economy','Services, value added (% of GDP)','NV.SRV.TOTL.ZS',2020,52.03,'% of GDP','World Bank','https://data.worldbank.org/indicator/NV.SRV.TOTL.ZS?locations=EG',NULL),
('economy','Services, value added (% of GDP)','NV.SRV.TOTL.ZS',2023,51.65,'% of GDP','World Bank','https://data.worldbank.org/indicator/NV.SRV.TOTL.ZS?locations=EG',NULL),
('development','Adult literacy rate (% ages 15+)','SE.ADT.LITR.ZS',2017,71.0,'% of population','World Bank','https://data.worldbank.org/indicator/SE.ADT.LITR.ZS?locations=EG',NULL),
('development','Adult literacy rate (% ages 15+)','SE.ADT.LITR.ZS',2022,74.5,'% of population','World Bank (via Statista)','https://www.statista.com/statistics/572680/literacy-rate-in-egypt/','Some aggregators show ~79% - likely different year/methodology; spot-check before publishing'),
('development','Individuals using the Internet (% of population)','IT.NET.USER.ZS',2023,72.69,'% of population','World Bank','https://data.worldbank.org/indicator/IT.NET.USER.ZS?locations=EG','2025 industry estimates cite ~81.9% (~96M users) - different source/methodology, do not conflate'),
('development','Access to electricity (% of population)','EG.ELC.ACCS.ZS',1992,93.4,'% of population','World Bank','https://data.worldbank.org/indicator/EG.ELC.ACCS.ZS?locations=EG',NULL),
('development','Access to electricity (% of population)','EG.ELC.ACCS.ZS',2023,100.0,'% of population','World Bank','https://data.worldbank.org/indicator/EG.ELC.ACCS.ZS?locations=EG',NULL);

-- ---------------------------------------------------------------------------
-- suez_canal_revenue  (period_type documents fiscal vs calendar year)
-- ---------------------------------------------------------------------------
INSERT INTO suez_canal_revenue (year, period_type, period_label, revenue_usd_bn, vessels, note, source_url) VALUES
(2016,'FY','FY2015/16',5.100,NULL,'-4.5% YoY','https://en.wikipedia.org/wiki/Suez_Canal_Authority'),
(2017,'FY','FY2016/17',4.900,NULL,'-3.4% YoY','https://en.wikipedia.org/wiki/Suez_Canal_Authority'),
(2018,'FY','FY2017/18',5.700,NULL,'+15.4% YoY','https://en.wikipedia.org/wiki/Suez_Canal_Authority'),
(2019,'CY','CY2019',5.800,NULL,'Calendar-year figure','https://en.wikipedia.org/wiki/Suez_Canal_Authority'),
(2020,'CY','CY2020',5.610,NULL,'COVID dip','https://en.wikipedia.org/wiki/Suez_Canal_Authority'),
(2021,'CY','CY2021',6.300,20649,'Then-record','https://en.wikipedia.org/wiki/Suez_Canal_Authority'),
(2023,'FY','FY2022/23',9.400,NULL,'Record, fiscal year ended June 2023','https://en.wikipedia.org/wiki/Suez_Canal_Authority'),
(2023,'CY','CY2023',10.250,NULL,'Calendar-year; differs from FY2022/23 due to the accounting window, not an error','https://en.wikipedia.org/wiki/Suez_Canal_Authority'),
(2024,'CY','CY2024',3.990,13213,'-61% YoY; Red Sea/Houthi disruption from Nov 2023 cut traffic ~50% and container ships ~90%','https://www.egypttoday.com/Article/3/139635/Egypt%E2%80%99s-Suez-Canal-revenues-go-down-by-61-to-3'),
(2025,'CY','Jul-Nov 2025',1.970,5874,'Partial (Jul-Nov 2025), +17.5% YoY - tentative recovery after the Oct 2025 Gaza ceasefire','https://www.arabnews.com/node/2625560/business-economy');

-- ---------------------------------------------------------------------------
-- exports  (top categories, 2023, Lloyds Bank/Coface trade profile)
-- ---------------------------------------------------------------------------
INSERT INTO exports (category, year, value_usd_bn, pct_of_total, source, source_url, note) VALUES
('Petroleum & electricity',2023,14.000,32.9,'Lloyds Bank/Coface','https://www.lloydsbanktrade.com/en/market-potential/egypt/trade-profile',NULL),
('Ready-made garments',2023,2.300,5.4,'Lloyds Bank/Coface','https://www.lloydsbanktrade.com/en/market-potential/egypt/trade-profile',NULL),
('Urea fertilizers',2023,2.100,4.9,'Lloyds Bank/Coface','https://www.lloydsbanktrade.com/en/market-potential/egypt/trade-profile',NULL),
('Plastics',2023,2.000,4.7,'Lloyds Bank/Coface','https://www.lloydsbanktrade.com/en/market-potential/egypt/trade-profile',NULL),
('Natural gas',2023,1.950,4.6,'Lloyds Bank/Coface','https://www.lloydsbanktrade.com/en/market-potential/egypt/trade-profile',NULL);

-- ---------------------------------------------------------------------------
-- tourism_annual  (arrivals + revenue by year)
-- ---------------------------------------------------------------------------
INSERT INTO tourism_annual (year, arrivals_millions, revenue_usd_bn, note, source_url) VALUES
(2019,NULL,13.030,'Pre-pandemic revenue peak','https://www.worlddata.info/africa/egypt/tourism.php'),
(2020,NULL,4.400,'COVID collapse (~65-70% drop)','https://www.worlddata.info/africa/egypt/tourism.php'),
(2021,NULL,NULL,'2021 revenue disputed: Tourism Ministry stated >$13bn; independent trackers ~$3-4bn (likely fiscal-vs-calendar or definitional)','https://www.dailynewsegypt.com/2022/01/24/tourism-revenues-exceed-13bn-in-2021-returning-to-pre-pandemic-levels-tourism-ministry/'),
(2022,NULL,10.700,'Revenue reported $10.7-14.1bn depending on source (receipts vs expenditure)','https://tradingeconomics.com/egypt/tourism-revenues'),
(2023,14.90,13.600,'Record 14.9M tourists at the time; revenue $13.6-14.1bn depending on source','https://english.news.cn/africa/20240125/9781199585034006bea6b049c812f41b/c.html'),
(2024,15.70,15.300,'Record 15.7M tourists; revenue $15.3bn (converges across Ahram/EgyptToday/AGBI/worlddata)','https://english.ahram.org.eg/News/538201.aspx'),
(2025,19.00,16.700,'~19M tourists - officially confirmed via SIS and the Minister (+21% YoY); revenue $16.70bn (CBE via Trading Economics)','https://sis.gov.eg/en/media-center/news/egypt-tourism-records-historic-growth-in-2025-receiving-19-million-tourists/');

-- ---------------------------------------------------------------------------
-- tourist_sites  (related_monument_id links to monuments where applicable)
-- ---------------------------------------------------------------------------
INSERT INTO tourist_sites (name, location, site_type, is_unesco, related_monument_id, note, source_url) VALUES
('Pyramids of Giza & Sphinx','Giza','Ancient monument',1,4,'Egypt''s marquee site; per-site visitor counts vary 2-3x across aggregators with no single Ministry dataset','https://en.wikipedia.org/wiki/List_of_World_Heritage_Sites_in_Egypt'),
('Grand Egyptian Museum','Giza','Museum',0,NULL,'Opened Nov 2025; ~15,000-19,000 visitors/day in early weeks; world''s largest museum for a single civilization','https://www.egypttoday.com/Article/4/143427/Over-19-000-Visitors-Daily-to-the-Grand-Egyptian-Museum'),
('Egyptian Museum (Tahrir)','Cairo','Museum',0,NULL,'Historic downtown museum; much of its collection moved to the GEM','https://en.wikipedia.org/wiki/Egyptian_Museum'),
('Karnak Temple Complex','Luxor','Ancient monument',1,8,'Part of the Ancient Thebes UNESCO World Heritage site','https://www.worldhistory.org/Karnak/'),
('Valley of the Kings','Luxor','Ancient monument',1,20,'Royal necropolis; part of the Ancient Thebes UNESCO site','https://en.wikipedia.org/wiki/List_of_World_Heritage_Sites_in_Egypt'),
('Abu Simbel','Aswan','Ancient monument',1,13,'Relocated in the 1960s; part of the Nubian Monuments UNESCO site','https://www.britannica.com/place/Abu-Simbel'),
('Hurghada','Red Sea coast','Resort',0,NULL,'Major Red Sea resort destination','https://www.hotelmanagement-network.com/data-insights/source-markets-egypt/'),
('Sharm El-Sheikh','South Sinai','Resort',0,NULL,'Major Red Sea resort destination','https://www.hotelmanagement-network.com/data-insights/source-markets-egypt/');

-- ---------------------------------------------------------------------------
-- tourism_source_markets  (rank: GlobalData 2023; arrivals: press-estimate)
-- ---------------------------------------------------------------------------
INSERT INTO tourism_source_markets (country, market_rank, arrivals_estimate_millions, year, confidence, source_url) VALUES
('Germany',1,1.57,2024,'rank: GlobalData 2023; arrivals: press-estimate','https://www.hotelmanagement-network.com/data-insights/source-markets-egypt/'),
('Russia',2,1.35,2024,'rank: GlobalData 2023; arrivals: press-estimate','https://www.hotelmanagement-network.com/data-insights/source-markets-egypt/'),
('Saudi Arabia',3,1.10,2024,'rank: GlobalData 2023; arrivals: press-estimate','https://www.hotelmanagement-network.com/data-insights/source-markets-egypt/'),
('Italy',4,NULL,2023,'rank: GlobalData 2023','https://www.hotelmanagement-network.com/data-insights/source-markets-egypt/'),
('Sudan',5,NULL,2023,'rank: GlobalData 2023 (5 of top 10 source markets are African)','https://www.hotelmanagement-network.com/data-insights/source-markets-egypt/'),
('United Kingdom',NULL,0.72,2024,'arrivals: press-estimate','https://www.hotelmanagement-network.com/data-insights/source-markets-egypt/'),
('Poland',NULL,0.64,2024,'arrivals: press-estimate','https://www.hotelmanagement-network.com/data-insights/source-markets-egypt/');

-- ---------------------------------------------------------------------------
-- megaprojects
-- ---------------------------------------------------------------------------
INSERT INTO megaprojects (name, category, cost_usd_bn, cost_note, start_year, completion_year, status, scope, significance, source_url) VALUES
('New Administrative Capital','Urban',45.00,'Estimates range $45-60bn; no single audited total exists',2015,NULL,'Partially complete / occupied','~700 km2, planned for 6.5-7 million residents; seat of government from 2024 with 14+ ministries relocated','A Feb 2026 draft law proposing to rename it "Memphis" is an unpassed, contested proposal - not a completed rename','https://en.wikipedia.org/wiki/The_New_Capital'),
('Grand Egyptian Museum','Culture',1.00,'Reported ~$1-1.1bn, up from an initial ~$500M (partly EGP depreciation)',NULL,2025,'Operational','Under construction ~two decades; designed for 100,000+ artifacts, ~57,000 on display incl. the complete Tutankhamun collection','World''s largest museum dedicated to a single civilization; official inauguration Nov 1, 2025','https://www.cbsnews.com/news/grand-egyptian-museum-opening/'),
('New Suez Canal','Infrastructure',8.00,'~$8-9bn (LE 59.4bn), financed via domestic investment certificates - no foreign debt',2014,2015,'Operational','72 km channel (35 km newly dug + 37 km widened/deepened) within the existing 164 km canal; opened Aug 6, 2015 after a one-year build','Projected to raise annual revenue to $12.5bn - a target analysts questioned and that has not been met','https://en.wikipedia.org/wiki/Suez_Canal_Area_Development_Project'),
('Benban Solar Park','Energy',NULL,'Cost not reliably reported across sources',2018,2019,'Operational','Commonly cited 1.8 GW installed; some 2025 reporting cites ~1.465 GW grid-connected with +200 MW expected by 2026','Described as one of the world''s largest solar parks; 2025 coverage calls it 3rd-largest as India/China built larger','https://en.wikipedia.org/wiki/Benban_Solar_Park'),
('Aswan High Dam','Infrastructure',NULL,'Soviet-financed after Western funding was withdrawn',1960,1970,'Operational','Built 1960-1970; controls Nile flooding and generates hydroelectric power','Created Lake Nasser, one of the world''s largest reservoirs; a symbol of the Nasser era','https://en.wikipedia.org/wiki/Gamal_Abdel_Nasser');
