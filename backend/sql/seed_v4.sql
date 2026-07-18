-- ============================================================================
-- EgyBI — Egypt Knowledge Base — seed_v4.sql
-- ============================================================================
-- Fourth enrichment pass. Adds five new sectors: Art & Cinema, Sports,
-- Industry/Investment/Companies, Science & Space, Water & Irrigation.
-- Portable INSERTs (run on both MySQL prod and SQLite test).
-- Import order: seed.sql -> seed_v2.sql -> seed_v3.sql -> seed_v4.sql
--
-- Content rule: every row is real and cited (source_url). Disputed, approximate
-- or projected figures are flagged in-row (certainty_note / note), never smoothed.
-- Data current to 2025/2026 where available.
-- ============================================================================

-- ===========================================================================
-- ART & CINEMA
-- ===========================================================================

-- cultural_figures — cinema, music and art icons ----------------------------
INSERT INTO cultural_figures (name, domain, role, birth_year, death_year, signature_work, significance, certainty_note, source_url) VALUES
('Youssef Chahine','cinema','director',1926,2008,'Alexandria... Why? (1979)','Berlin Silver Bear; Cannes 50th-anniversary award (1997)',NULL,'https://en.wikipedia.org/wiki/Youssef_Chahine'),
('Salah Abu Seif','cinema','director',1915,1996,'The Beginning and the End (1960)','"Father of Egyptian realism"',NULL,'https://en.wikipedia.org/wiki/Salah_Abu_Seif'),
('Naguib el-Rihani','cinema','actor/comedian',1889,1949,'Ghazal al-Banat (1949)','"Father of Comedy" of Egyptian cinema',NULL,'https://en.wikipedia.org/wiki/Naguib_El-Rihani'),
('Faten Hamama','cinema','actress',1931,2015,'The Nightingale''s Prayer (1959)','Leading lady of the Golden Age',NULL,'https://en.wikipedia.org/wiki/Faten_Hamama'),
('Omar Sharif','cinema','actor',1932,2015,'Lawrence of Arabia (1962)','Egypt''s global film star; also Doctor Zhivago (1965)',NULL,'https://www.britannica.com/biography/Omar-Sharif'),
('Soad Hosny','cinema','actress',1943,2001,'Watch Out for Zouzou (1972)','"Cinderella of Egyptian Cinema"','Death (London, 2001) ruled suicide but disputed','https://en.wikipedia.org/wiki/Soad_Hosny'),
('Ahmed Zaki','cinema','actor',1949,2005,'Nasser 56 (1996)','One of the most acclaimed dramatic actors of his generation','Birth year varies across sources (1949 vs 1946)','https://en.wikipedia.org/wiki/Ahmed_Zaki_(actor)'),
('Nour El-Sherif','cinema','actor',1946,2015,'The Yacoubian Building (2006)','Prolific leading man of Egyptian film & TV',NULL,'https://en.wikipedia.org/wiki/Nour_El-Sherif'),
('Adel Imam','cinema','actor/comedian',1940,NULL,'The Yacoubian Building (2006)','Among the Arab world''s most famous comedians; also The Terrorist (1994)',NULL,'https://en.wikipedia.org/wiki/Adel_Emam'),
('Yousra','cinema','actress',1951,NULL,'Hadduta Masreya','Frequent Youssef Chahine collaborator',NULL,'https://en.wikipedia.org/wiki/Yousra'),
('Mona Zaki','cinema','actress',1976,NULL,'The Days of Sadat (2001)','Leading contemporary actress','Birth date given as 17 or 18 Nov 1976','https://en.wikipedia.org/wiki/Mona_Zaki'),
('Ahmed Helmy','cinema','actor/comedian',1968,NULL,'El Nazer (2000)','Top contemporary box-office comedian','Birth year varies (1968 vs 1969)','https://en.wikipedia.org/wiki/Ahmed_Helmy'),
('Shadia','cinema','actress/singer',1931,2017,'My Wife, the Director General (1966)','Star of 100+ films across the Golden Age',NULL,'https://en.wikipedia.org/wiki/Shadia'),
('Umm Kulthum','music','singer',1898,1975,NULL,'"Star of the East"; the defining voice of 20th-century Arab music','Birth year disputed (record ~1898; Britannica gives 1904)','https://www.britannica.com/biography/Umm-Kulthum-Egyptian-musician'),
('Sayed Darwish','music','singer/composer',1892,1923,NULL,'"Father of Egyptian popular music"; composed the national-anthem melody',NULL,'https://en.wikipedia.org/wiki/Sayed_Darwish'),
('Mohammed Abdel Wahab','music','singer/composer',1900,1991,NULL,'Fused Western and Arab styles; reshaped Arab music','Birth year approximate (c. 1900)','https://www.britannica.com/biography/Muhammad-Abd-al-Wahhab'),
('Farid al-Atrash','music','singer/oud',1910,1974,NULL,'"King of the Oud"; ~500 songs and 31 films',NULL,'https://en.wikipedia.org/wiki/Farid_al-Atrash'),
('Abdel Halim Hafez','music','singer',1929,1977,NULL,'"The Dark Nightingale"; tens of millions of records sold',NULL,'https://www.britannica.com/biography/Abd-al-Halim-Hafiz'),
('Warda Al-Jazairia','music','singer',1939,2012,NULL,'"The Algerian Rose"; a leading Egyptian voice with ~300 songs',NULL,'https://en.wikipedia.org/wiki/Warda_Al-Jazairia'),
('Mohamed Mounir','music','singer',1954,NULL,NULL,'"El King"; fused Nubian music with jazz, blues and reggae',NULL,'https://en.wikipedia.org/wiki/Mohamed_Mounir'),
('Amr Diab','music','singer',1961,NULL,NULL,'Best-selling Arab artist; Guinness record for most World Music Awards',NULL,'https://www.guinnessworldrecords.com/world-records/439460'),
('Ali Hassan Kuban','music','bandleader',1929,2001,NULL,'Brought Nubian music to world stages',NULL,'https://en.wikipedia.org/wiki/Ali_Hassan_Kuban'),
('Mahmoud Mokhtar','art','sculptor',1891,1934,'Nahdet Misr (unveiled 1928)','"Father" of modern Egyptian sculpture',NULL,'https://en.wikipedia.org/wiki/Mahmoud_Mokhtar'),
('Mahmoud Said','art','painter',1897,1964,NULL,'Pioneer of modern Egyptian painting; Venice Biennale (1938, 1948)',NULL,'https://en.wikipedia.org/wiki/Mahmoud_Sa%27id'),
('Inji Efflatoun','art','painter',1924,1989,NULL,'Marxist-feminist pioneer; painted prison portraits (imprisoned 1959-63)',NULL,'https://en.wikipedia.org/wiki/Inji_Aflatoun');

-- cultural_institutions -----------------------------------------------------
INSERT INTO cultural_institutions (name, type, founded_year, location, significance, source_url) VALUES
('Studio Misr','studio',1935,'Cairo','Financed by economist Talaat Harb (opened 12 Oct 1935); launched the Golden Age of Egyptian cinema','https://en.wikipedia.org/wiki/Studio_Misr'),
('Cairo International Film Festival','festival',1976,'Cairo','The only FIAPF Category-A competitive feature festival in Africa and the Arab world; founded by critic Kamal El Mallakh','https://en.wikipedia.org/wiki/Cairo_International_Film_Festival'),
('Cairo Opera House','opera',1988,'Cairo','A gift from Japan; replaced the Khedivial Opera House (1869, burned 1971)','https://en.wikipedia.org/wiki/Cairo_Opera_House'),
('Museum of Islamic Art','museum',1903,'Cairo','Among the world''s largest Islamic-art collections (100,000+ objects)','https://egymonuments.gov.eg/en/museums/museum-of-islamic-art'),
('Grand Egyptian Museum (GEM)','museum',2025,'Giza','Largest single-civilization museum; full Tutankhamun collection. Phased: soft opening 2024, official inauguration 1 Nov 2025','https://en.wikipedia.org/wiki/Grand_Egyptian_Museum'),
('Bibliotheca Alexandrina','library',2002,'Alexandria','Modern revival of the ancient Library of Alexandria','https://en.wikipedia.org/wiki/Bibliotheca_Alexandrina');

-- film_industry — dated facts & metrics -------------------------------------
INSERT INTO film_industry (metric, year, value, note, source_url) VALUES
('Feature films produced (historical total)',NULL,'4,000+','Historically the majority of all Arab film output','https://en.wikipedia.org/wiki/Cinema_of_Egypt'),
('Golden Age',NULL,'1930s-1960s','By the 1950s Egypt''s industry was the world''s third largest, behind Hollywood and Bombay','https://english.ahram.org.eg/NewsContent/50/1209/366778'),
('CIFF Golden Pyramid (45th edition)',2024,'The New Year That Never Came (Romania)','Nov 13-22, 2024; the 2023 edition was canceled due to the Gaza war','https://cineuropa.org/en/newsdetail/469700'),
('CIFF Golden Pyramid (46th edition)',2025,'Dragonfly (Paul Andrew Williams)','Nov 12-21, 2025; jury chaired by Nuri Bilge Ceylan; 80 films from 45+ countries','https://variety.com/2025/film/global/cairo-winners-dragonfly-once-upon-a-time-in-gaza-1236589358'),
('Box office (projected)',2025,'~EGP 1.8bn (~$37m)','~14.3m admissions; recovery to pre-COVID levels; ~400+ screens','https://screendaily.com/news/egyptian-box-office-set-to-surpass-pre-covid-levels-in-2025/5211272.article'),
('Egyptian share of domestic box office',2025,'~70%','Egyptian films are ~20% of titles but ~70% of box office; 8 of 2025''s top 10 were Egyptian','https://screendaily.com/news/egyptian-box-office-set-to-surpass-pre-covid-levels-in-2025/5211272.article'),
('Single-day box-office record',2024,'EGP 23.1m','Sons of Rizk 3, Eid 2024','https://egyptianstreets.com/2024/07/09/blockbuster-brilliance-egypts-top-5-highest-grossing-films'),
('All-time top-grossing film',NULL,'Kira & El Gin (EGP 104.2m)','Highest-grossing Egyptian film to date','https://egyptianstreets.com/2024/07/09/blockbuster-brilliance-egypts-top-5-highest-grossing-films'),
('Top film export market',2024,'Saudi Arabia ($53m)','33 Egyptian films earned $53m in Saudi Arabia in 2024','https://screendaily.com/news/egyptian-box-office-set-to-surpass-pre-covid-levels-in-2025/5211272.article'),
('International recognition',2021,'Feathers — Cannes Critics'' Week Grand Prize','Omar El Zohairy; Aisha Can''t Fly Away at Cannes Un Certain Regard 2025','https://en.wikipedia.org/wiki/Feathers_(film)');

-- ===========================================================================
-- SPORTS
-- ===========================================================================

-- athletes ------------------------------------------------------------------
INSERT INTO athletes (name, sport, birth_year, achievement, achievement_year, certainty_note, source_url) VALUES
('Mohamed Salah','Football',1992,'All-time leading scorer in African World Cup qualifying (20 goals); ~63 goals in ~108 caps for Egypt','2026',NULL,'https://en.wikipedia.org/wiki/Mohamed_Salah'),
('Nour El Sherbini','Squash',1995,'World No. 1; 8 World Championship titles (2024-25 crown equalled Nicol David''s record)','2024-25',NULL,'https://ussquash.org/2025/05/egypts-el-sherbini-and-asal-crowned-psa-world-champions/'),
('Mostafa Asal','Squash',2001,'World No. 1; 2024-25 World Champion — first man since Jahangir Khan (1988) to win it without dropping a game','2024-25',NULL,'https://ussquash.org/2025/05/egypts-el-sherbini-and-asal-crowned-psa-world-champions/'),
('Ali Farag','Squash',1992,'Former World No. 1; 4 World titles','2018-2023',NULL,'https://en.wikipedia.org/wiki/Ali_Farag'),
('Amr Shabana','Squash',1979,'Former World No. 1; 4 World Opens — Egypt''s first squash world champion','2003-2009',NULL,'https://en.wikipedia.org/wiki/Amr_Shabana'),
('Ramy Ashour','Squash',1987,'Former World No. 1; 3 World titles','2008-2014',NULL,'https://en.wikipedia.org/wiki/Ramy_Ashour'),
('Karim Abdel Gawad','Squash',1991,'2016 World Champion; reached World No. 1 (2017)','2016',NULL,'https://en.wikipedia.org/wiki/Karim_Abdel_Gawad'),
('Raneem El Welily','Squash',1989,'First Egyptian woman to reach World No. 1; 2017 World Champion','2017',NULL,'https://en.wikipedia.org/wiki/Raneem_El_Welily'),
('Ahmed Elgendy','Modern pentathlon',1999,'Olympic gold at Paris 2024 — Egypt''s most recent Olympic gold','2024',NULL,'https://en.wikipedia.org/wiki/Ahmed_Elgendy'),
('Feryal Ashraf','Karate',1998,'Tokyo 2020 (2021) gold, women''s kumite +61 kg — Egypt''s first-ever women''s Olympic gold','2021','Her gold was in KARATE, not taekwondo','https://en.wikipedia.org/wiki/Feryal_Ashraf'),
('Hedaya Malak','Taekwondo',1993,'Two Olympic bronze medals (Rio 2016, Tokyo 2020)','2016, 2021',NULL,'https://en.wikipedia.org/wiki/Hedaya_Malak'),
('Karam Gaber','Wrestling (Greco-Roman)',1979,'Olympic gold Athens 2004; silver London 2012','2004',NULL,'https://en.wikipedia.org/wiki/Karam_Gaber');

-- sports_titles -------------------------------------------------------------
INSERT INTO sports_titles (holder, competition, titles, detail, note, source_url) VALUES
('Egypt national football team','Africa Cup of Nations',7,'A record — the most of any nation: 1957, 1959, 1986, 1998, 2006, 2008, 2010; the only nation to win three in a row (2006-2008-2010)','Qualified for the 2026 World Cup (4th appearance), undefeated in qualifying','https://www.olympics.com/en/news/africa-cup-of-nations-afcon-winners-list-champions-record'),
('Egypt national football team','FIFA World Cup appearances',4,'1934, 1990, 2018 — plus qualified for 2026','Salah sealed 2026 qualification with a brace vs Djibouti','https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026'),
('Al Ahly SC','CAF Champions League',12,'African record — 1982, 1987, 2001, 2005, 2006, 2008, 2012, 2013, 2020, 2021, 2023, 2024','CAF African Club of the Century (2000)','https://www.cafonline.com/caf-champions-league/news/ahly-crowned-champions-of-africa-for-record-extending-12th-title/'),
('Zamalek SC','CAF Champions League',5,'Second-most among Egyptian clubs; CAF named it 2nd Club of the Century','Cairo Derby vs Al Ahly contested since 1917','https://en.wikipedia.org/wiki/Zamalek_SC'),
('Egypt (men''s squash)','Men''s World Championship (since 2003)',14,'An Egyptian has won the men''s World Championship ~14 times since 2003','Egypt dominates PSA rankings across men and women','https://www.olympics.com/en/news/nour-el-sherbini-egypt-squash-dominance-explained'),
('Egypt at the Olympics','Total Olympic medals',38,'8 gold, 11 silver, 19 bronze (per SIS/Ahram after Paris 2024)','First African & Arab nation to compete (Stockholm 1912); independent tallies vary slightly','https://www.sis.gov.eg/Story/158593/'),
('Egypt men''s national handball team','World Championship best finish',4,'Best finish 4th (2001, hosted) — then the best ever by a non-European team; Olympic 4th at Tokyo 2020','Repeated African champions; hosted the 2021 World Championship','https://en.wikipedia.org/wiki/Egypt_men%27s_national_handball_team');

-- ===========================================================================
-- INDUSTRY, INVESTMENT, BUSINESS & COMPANIES
-- ===========================================================================

-- industrial_sectors --------------------------------------------------------
INSERT INTO industrial_sectors (sector, key_fact, metric, year, source_url) VALUES
('Petroleum & natural gas','Egypt''s largest industrial sector and single biggest industrial driver','Oil & gas > 20% of GDP','2024','https://en.wikipedia.org/wiki/Economy_of_Egypt'),
('Manufacturing (overall)','Non-petroleum industrial exports rose 73.8% to $32.5bn in FY2023/24; employs ~29% of the workforce','Secondary sector 32.1% of GDP','FY2023/24','https://africa-hr.com/blog/manufacturing-industry-in-egypt/'),
('Textiles & garments','Built on premium long-staple Egyptian cotton','~12% of export earnings','2023','https://en.wikipedia.org/wiki/Economy_of_Egypt'),
('Pharmaceuticals','Largest in MENA; produces ~91-93% of domestic medicine; exported $447m in 2024','~30% of the regional market','2024','https://africa-hr.com/blog/manufacturing-industry-in-egypt/'),
('Steel','Ezz Steel produced 6.4m tonnes of crude steel in 2024 — the largest in the Arab world/Africa','6.4m tonnes','2024','https://aisusteel.org/en/34260/'),
('Automotive assembly','A significant assembly base with ~86,000 workers','~17 assembly plants','2024','https://en.wikipedia.org/wiki/Economy_of_Egypt'),
('Cement & construction materials','Core of the secondary sector alongside steel; a major domestic-demand industry','Major domestic industry',NULL,'https://en.wikipedia.org/wiki/Economy_of_Egypt');

-- major_companies -----------------------------------------------------------
INSERT INTO major_companies (name, sector, founded_year, metric, metric_value, significance, source_url) VALUES
('Commercial International Bank (CIB)','Banking',1975,'market cap','$7.86bn (Feb 2024)','Most valuable listed Egyptian company','https://ceoworld.biz/2024/02/13/egypts-largest-companies-by-market-capitalization-2024/'),
('National Bank of Egypt (NBE)','Banking (state)',1898,'assets','>$170bn','Largest bank by assets; ~19m customers','https://en.wikipedia.org/wiki/National_Bank_of_Egypt'),
('Talaat Moustafa Group','Real estate',NULL,'market cap','$2.87bn (2024)','Top Egyptian real-estate developer','https://ceoworld.biz/2024/02/13/egypts-largest-companies-by-market-capitalization-2024/'),
('Orascom Construction','Construction/EPC',1976,NULL,NULL,'Egypt''s first multinational (Onsi Sawiris); dual-listed Egypt/UAE','https://en.wikipedia.org/wiki/Orascom_Construction'),
('Elsewedy Electric','Cables/energy',1938,'revenue','$4.8bn (2023)','>18,000 employees; regional cables & energy leader','https://en.wikipedia.org/wiki/Elsewedy_Electric'),
('Ezz Steel','Steel',1994,'output','6.4m t crude steel (2024)','Largest steelmaker in the Arab world/Africa (Ahmed Ezz)','https://en.wikipedia.org/wiki/Ezz_Steel'),
('Eastern Company','Tobacco',1920,NULL,NULL,'State-linked tobacco monopoly; a top-10 EGX company by market cap','https://ceoworld.biz/2024/02/13/egypts-largest-companies-by-market-capitalization-2024/'),
('EFG Holding (EFG Hermes)','Finance',1984,NULL,NULL,'Leading MENA investment bank — brokerage, asset management, NBFS, fintech','https://en.wikipedia.org/wiki/EFG_Holding'),
('Juhayna Food Industries','Food/dairy',1983,NULL,NULL,'Dairy & juice leader (Safwan Thabet); EGX-listed','https://en.wikipedia.org/wiki/Juhayna_Food_Industries'),
('Fawry','Fintech',2008,'IPO','EGP 1.64bn (2019)','Egypt''s first fintech IPO; first tech unicorn (2020)','https://lucidityinsights.com/spotlights/fawry-egypts-fintech-ipo-success-story'),
('e-finance (eFinance Investment Group)','Fintech / gov payments',2005,'IPO','2021 (retail 61.4x oversubscribed)','Backbone of the government''s digital-payments infrastructure','https://en.wikipedia.org/wiki/E-finance_(company)'),
('Telecom Egypt','Telecom (state)',1854,NULL,NULL,'Incumbent operator; a top-10 EGX company by market cap','https://ceoworld.biz/2024/02/13/egypts-largest-companies-by-market-capitalization-2024/');

-- investment_deals ----------------------------------------------------------
INSERT INTO investment_deals (name, year, value_usd_bn, counterparty, category, significance, certainty_note, source_url) VALUES
('Ras El Hekma megacity deal',2024,35.00,'UAE / ADQ-led consortium','FDI','Largest single FDI deal in Egypt''s history — a 170 km2 Mediterranean megacity; $15bn advance + $20bn within two months; Egypt keeps a 35% profit share','A "$150bn total investment over the project life" figure is a forward projection','https://www.bloomberg.com/news/articles/2024-02-23/egypt-clinches-biggest-deal-ever-with-uae-investing-35-billion'),
('IMF Extended Fund Facility (augmented)',2024,8.00,'IMF','IMF','March 2024 augmentation to a ~$8bn total after the Red Sea/Suez shock halved canal revenue','The $8bn is the expanded total (original $3bn Dec-2022 EFF augmented by ~$5bn), not $8bn of new money','https://www.imf.org/en/news/articles/2024/03/29/pr24101-egypt-imf-executive-board-completes-first-second-reviews-eff-approves-augmentation'),
('IMF Extended Fund Facility (original)',2022,3.00,'IMF','IMF','A 46-month Extended Fund Facility agreed December 2022','Later augmented in March 2024','https://www.imf.org/en/news/articles/2024/03/29/pr24101-egypt-imf-executive-board-completes-first-second-reviews-eff-approves-augmentation'),
('IMF Extended Arrangement',2016,12.00,'IMF','IMF','A 3-year EFF approved Nov 2016; triggered the float of the pound (EGP 8.8 -> ~17.8/USD within days)',NULL,'https://www.imf.org/en/news/articles/2016/11/11/pr16501-egypt-executive-board-approves-12-billion-extended-arrangement'),
('Suez Canal Economic Zone (SCZONE) cumulative',2025,10.40,'Multiple (~50% Chinese-origin)','free-zone','334 projects worth ~$10.4bn since mid-2022; FY2024/25 finalized 129 projects worth $4.4bn (~31,000 direct jobs)','Cumulative totals vary by source/window ($8.3-11.6bn) — treat as approximate','https://www.arabnews.com/node/2615493/business-economy'),
('State privatization / asset-sale program',2025,6.00,'Various investors','privatization','~$6bn completed across 21 deals in 11 sectors (reported May 2025), driven by the IMF State Ownership Policy','Forward targets have been repeatedly revised and missed — treat as moving','https://english.news.cn/africa/20250506/7fbf3f588d8448c18c209cfabe9963ad/c.html');

-- ===========================================================================
-- SCIENCE, SPACE & RESEARCH
-- ===========================================================================

-- satellites ----------------------------------------------------------------
INSERT INTO satellites (name, launch_year, launch_date_note, purpose, partner, status, source_url) VALUES
('EgyptSat-1 (MisrSat-1)',2007,'17 Apr 2007','First Earth remote-sensing satellite (100 kg)','NARSS + Yuzhnoye (Ukraine)','Contact lost 2010','https://en.wikipedia.org/wiki/EgyptSat_1'),
('EgyptSat-2',2014,'16 Apr 2014','Earth observation','RKK Energia (Russia)','Failed 2015 (insurance funded EgyptSat-A)','https://en.wikipedia.org/wiki/EgyptSat-A'),
('EgyptSat-A',2019,'21 Feb 2019','Earth-observation imaging','NARSS + RKK Energia; Baikonur','Operational','https://en.wikipedia.org/wiki/EgyptSat-A'),
('Tiba-1',2019,'26 Nov 2019','Communications / broadband (first telecom sat; ~15-yr life)','Thales Alenia + Airbus; Ariane 5, Kourou','Operational','https://sis.gov.eg/en/media-center/news/egypt-launches-tiba-1-communication-satellite/'),
('Nilesat 301',2022,'8 Jun 2022','Comms / DTH TV + broadband (Ku/Ka, 38 transponders, 15-yr life)','Thales Alenia; SpaceX Falcon 9','Operational','https://spaceinafrica.com/2022/06/08/egypt-launches-nilesat-301-aboard-spacex-falcon-9/'),
('MisrSat-2',2023,'4 Dec 2023','Remote sensing (2 m pan / 8 m multispectral) — climate, agriculture, water','China (LM-2C, Jiuquan); ~$92m Chinese grant; local assembly/integration/test','Operational','https://spaceinafrica.com/2023/12/04/egypt-launches-misrsat-2/'),
('NExSat-1',2024,'3 Feb 2024','Experimental remote-sensing microsat (67 kg, 5.7 m multispectral)','EgSA + Berlin Space Technologies (Germany); Smart Dragon-3','Operational','https://spaceinafrica.com/2024/02/03/egypt-launches-experimental-satellite-nexsat-1/');

-- research_institutions -----------------------------------------------------
INSERT INTO research_institutions (name, type, founded_year, location, significance, source_url) VALUES
('Egyptian Space Agency (EgSA)','Space agency',2018,'Egyptian Space City, New Administrative Capital','Established by Law No. 3 of 2018; its ~115-acre HQ also hosts the African Space Agency','https://en.wikipedia.org/wiki/Egyptian_Space_Agency'),
('African Space Agency','Continental agency',2019,'New Administrative Capital','The pan-African space body, hosted by Egypt after it won the African Union bid (2019)','https://en.wikipedia.org/wiki/African_Space_Agency'),
('Zewail City of Science, Technology & Innovation','Research / education',2012,'6th of October City','Non-profit named after Nobel laureate Ahmed Zewail (concept 1999, decree 2011, established 2012)','https://en.wikipedia.org/wiki/Zewail_City_of_Science,_Technology_and_Innovation'),
('National Research Centre (NRC)','R&D institute',1956,'Dokki, Giza','Egypt''s largest multidisciplinary R&D body: ~4,700+ researchers, 14 divisions / 108 departments','https://en.wikipedia.org/wiki/National_Research_Centre_(Egypt)');

-- scientists ----------------------------------------------------------------
INSERT INTO scientists (name, field, birth_year, death_year, award, significance, source_url) VALUES
('Ahmed Zewail','Chemistry (femtochemistry)',1946,2016,'Nobel Prize in Chemistry, 1999','Pioneer of femtochemistry; namesake of Zewail City','https://en.wikipedia.org/wiki/Ahmed_Zewail'),
('Farouk El-Baz','Space geology',1938,NULL,NULL,'NASA geologist who helped select the Apollo lunar-landing sites','https://en.wikipedia.org/wiki/Farouk_El-Baz'),
('Mostafa El-Sayed','Physical chemistry / nanoscience',1933,NULL,'2007 U.S. National Medal of Science','Gold-nanoparticle cancer therapy; Georgia Tech; the "El-Sayed rule"','https://en.wikipedia.org/wiki/Mostafa_El-Sayed'),
('Magued Iskander','Geotechnical engineering',NULL,NULL,NULL,'NYU Tandon professor; pioneered transparent-soil modeling','https://engineering.nyu.edu/faculty/magued-iskander'),
('Hany Farid','Digital image forensics',1966,NULL,NULL,'UC Berkeley; called the "father" of digital image forensics / deepfake detection','https://en.wikipedia.org/wiki/Hany_Farid');

-- ===========================================================================
-- WATER & IRRIGATION
-- ===========================================================================

-- water_projects ------------------------------------------------------------
INSERT INTO water_projects (name, category, scope, cost_note, status, certainty_note, source_url) VALUES
('New Delta / Mostakbal Misr (Future of Egypt)','land-reclamation','Total 2.2M feddans; target 4.5M feddans by 2027','~LE300bn (~$15bn cited)','Launched Mar 2021; ~800,000 feddans reclaimed by 2024','The 4.5M-by-2027 figure is a target/projection','https://www.egyptindependent.com/12-key-facts-about-the-new-delta-project-one-of-egypts-largest-agricultural-mega-projects/'),
('Toshka / New Valley (South Egypt Development)','land-reclamation','Add ~600,000 acres, expandable to ~1M acres; Sheikh Zayed Canal (50 km) + Mubarak Pumping Station (1.2M m3/hr)',NULL,'Revived under Sisi; first harvests 2022','The 1M-acre figure is aspirational; the original 1997 plan was widely called a mega-failure','https://en.wikipedia.org/wiki/New_Valley_Project'),
('1.5 Million Feddan Program','land-reclamation','1.5M feddans nationally (Farafra and others)',NULL,'~440,000 feddans cultivated; ~875,000 handed to beneficiaries; 4,500+ companies active (2025-26)','Progress figures vary by report','https://www.dailynewsegypt.com/2026/07/04/egyptian-countryside-development-reviews-progress-on-1-5-million-feddan-project-before-parliament-committee/'),
('Bahr El-Baqar treatment plant','water-treatment','5.6M m3/day — treats mixed agricultural + industrial + sewage drainage; supports reclaiming 456,000 feddans in Sinai',NULL,'Operational; holds 3 Guinness World Records',NULL,'https://sis.gov.eg/en/media-center/news/guinness-record-bahr-al-baqr-project-certified-as-biggest-wastewater-plant-worldwide/'),
('New Delta / El-Hammam treatment plant','water-treatment','7.5M m3/day — treats agricultural drainage water to reclaim ~2.2M feddans',NULL,'Operational; Guinness record for its type','Distinct from Bahr El-Baqar (5.6M m3/day, a different plant type)','https://waterhq.world/issue-sections/country-reports/egypt/new-delta-irrigation-water-treatment-plant-achieves-four-guinness-world-records/'),
('National desalination program','desalination','Target 8.8M m3/day by 2050; Phase 1 ~3.3M m3/day by ~2025; seawater RO, renewable-powered','~$8bn total','TSFE + PPP-led; first SWRO batch ~900,000 m3/day','The 8.8M m3/day / 2050 figure is a government target, not delivered capacity','https://www.zawya.com/en/projects/utilities/egypt-is-targeting-desalination-capacity-of-88mln-m3-day-by-2050-minister-u8d5y5at'),
('Canal Rehabilitation (lining) project','canal','Line/rehabilitate 20,000 km of canals (of ~55,000 km total); saves ~5 bn m3/yr in seepage','~$2.6bn','Announced 2020; ~4,000+ km lined; ~1.35M feddans converted to drip irrigation',NULL,'https://water.fanack.com/egypt/water-infrastructure-in-egypt/');

-- water_resources -----------------------------------------------------------
INSERT INTO water_resources (metric, value_bcm, share_pct, category, note, source_url) VALUES
('Agricultural water use',67.00,86.00,'usage','FAO AQUASTAT (2010 baseline; the proportion is stable, the absolute m3 is dated)','https://www.fao.org/aquastat/en/countries-and-basins/country-profiles/country/EGY/index.html'),
('Municipal water use',9.00,11.50,'usage','FAO AQUASTAT','https://www.fao.org/aquastat/en/countries-and-basins/country-profiles/country/EGY/index.html'),
('Industrial water use',2.00,2.50,'usage','FAO AQUASTAT','https://www.fao.org/aquastat/en/countries-and-basins/country-profiles/country/EGY/index.html'),
('Total water withdrawal',78.00,NULL,'resource','FAO AQUASTAT (2010 baseline)','https://www.fao.org/aquastat/en/countries-and-basins/country-profiles/country/EGY/index.html'),
('Total renewable water resources',58.30,NULL,'resource','FAO — 55.5 from the Nile, ~1.3 groundwater, ~0.5 internal surface','https://www.fao.org/aquastat/en/countries-and-basins/country-profiles/country/EGY/index.html'),
('Egypt''s 1959 treaty Nile share',55.50,NULL,'resource','Of 74 bn m3 split with Sudan (18.5 bn m3)','https://www.britannica.com/topic/Aswan-High-Dam'),
('Lake Nasser gross capacity',169.00,NULL,'resource','One of the world''s largest reservoirs (Aswan High Dam)','https://en.wikipedia.org/wiki/Lake_Nasser'),
('Dependency on upstream Nile inflow',NULL,97.00,'resource','~97% of renewable water resources originate outside Egypt','https://www.nature.com/articles/s41467-021-24747-9'),
('Structural water deficit',-40.00,NULL,'deficit','By the late 2010s (from a +20 surplus in the 1960s); closed via drainage reuse, groundwater and virtual-water food imports','https://www.nature.com/articles/s41467-021-24747-9'),
('Aswan evaporation loss',12.00,NULL,'deficit','Roughly 10-16 bn m3/yr (20-30% of Nile yield) — the dam''s key water cost','https://www.britannica.com/topic/Aswan-High-Dam');

-- ===========================================================================
-- ADDITIONS TO EXISTING TABLES
-- ===========================================================================

-- megaprojects — add the El Dabaa nuclear plant (energy megaproject) ---------
INSERT INTO megaprojects (name, category, cost_usd_bn, cost_note, start_year, completion_year, status, scope, significance, source_url) VALUES
('El Dabaa Nuclear Power Plant','Energy',30.00,'~$30bn (some sources ~$28.75bn); Russia finances ~85% via a 22-year state loan',2022,2030,'Under construction','4 x VVER-1200 (Gen III+) reactors = 4,800 MW (4.8 GW)','Egypt''s and the region''s first nuclear power plant (Rosatom build; NPPA operator). First-unit grid connection targeted 2028 [projected], all four units ~2030','https://en.wikipedia.org/wiki/El_Dabaa_Nuclear_Power_Plant');

-- indicators — R&D spending and the Hepatitis-C elimination milestone --------
INSERT INTO indicators (category, indicator_name, indicator_code, year, value, unit, source, source_url, note) VALUES
('development','Research & development expenditure','GB.XPD.RSDV.GD.ZS',2022,1.02,'% of GDP','World Bank','https://data.worldbank.org/indicator/GB.XPD.RSDV.GD.ZS?locations=EG',NULL),
('development','Research & development expenditure','GB.XPD.RSDV.GD.ZS',2023,1.03,'% of GDP','World Bank','https://data.worldbank.org/indicator/GB.XPD.RSDV.GD.ZS?locations=EG','Above the ~1% threshold and the world average (~0.43%); predominantly public-funded'),
('development','Hepatitis C prevalence','WHO',2016,10.00,'% of population','WHO','https://www.who.int/news/item/09-10-2023-who-commends-egypt-for-its-progress-on-the-path-to-eliminate-hepatitis-c','Pre-campaign baseline'),
('development','Hepatitis C prevalence','WHO',2023,0.38,'% of population','WHO','https://www.who.int/news/item/09-10-2023-who-commends-egypt-for-its-progress-on-the-path-to-eliminate-hepatitis-c','WHO "gold tier" on the path to elimination (9 Oct 2023) — the first country worldwide; via the "100 Million Seha" campaign using locally made antivirals');

-- ============================================================================
-- End of seed_v4.sql
-- ============================================================================
