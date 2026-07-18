-- ============================================================================
-- EgyBI — Egypt Knowledge Base — seed_v8.sql
-- ============================================================================
-- Eighth enrichment pass (2026-current): prominent businessmen, cinema
-- economics, military standing (public), arms trade (SIPRI), football & handball
-- depth, logistics projects, and mega-project 2026 status. Portable INSERTs.
-- Import order: seed -> v2 -> v3 -> v4 -> v5 -> v6 -> v7 -> v8 -> (seed_auto)
-- Every row cited; net-worth is point-in-time; projections/targets/disputes
-- flagged in-row. Military & arms content is public figures/rankings only.
-- ============================================================================

-- Prominent Egyptian businessmen (Forbes; stake-value trackers where flagged) --
INSERT INTO businessmen (name, net_worth_usd_bn, year, main_company, sector, source_url, note) VALUES
('Nassef Sawiris',9.9,2026,'OCI / Orascom Construction; ~6% Adidas; Aston Villa FC','Fertilizers, construction, investments','https://www.forbes.com/profile/nassef-sawiris/','Egypt''s richest; Forbes real-time #347. Net worth is a point-in-time estimate.'),
('Naguib Sawiris',5.6,2026,'Orascom TMT Investments; mining, media','Telecom, mining, investments','https://www.forbes.com/profile/naguib-sawiris/','Forbes #735. Billionaires.Africa valued private holdings higher (~$9bn) — disputed by valuation method.'),
('Samih Sawiris',1.4,2026,'Orascom Development Holding','Real estate & resorts','https://www.forbes.com/profile/samih-sawiris/','Forbes #2756; point-in-time.'),
('Mohamed Mansour',4.0,2026,'Mansour Group (GM & Caterpillar distribution)','Automotive/equipment distribution','https://www.forbes.com/profile/mohamed-mansour/','Forbes #1043; point-in-time.'),
('Youssef Mansour',1.8,2026,'Mansour Group (Metro supermarkets, L''Oreal Egypt)','Retail, distribution','https://www.forbes.com/profile/youssef-mansour/','Forbes #2247; point-in-time.'),
('Yasseen Mansour',1.4,2026,'Mansour Group; Palm Hills Developments','Real estate, distribution','https://www.forbes.com/profile/yasseen-mansour/','Forbes #2769; point-in-time.'),
('Ahmed Ezz',1.07,2025,'Ezz Steel (66% stake)','Steel','https://www.billionaires.africa/2025/10/28/ahmed-ezz-earns-22-million-ezz-steel-shares/','NOT on Forbes real-time list; figure = value of his Ezz Steel stake, not full net worth; volatile.'),
('Safwan Thabet',0.57,2025,'Juhayna Food Industries (50.1% via Pharon)','Food & beverage','https://www.billionaires.africa/2025/08/16/safwan-thabet-81-million-juhayna-stake/','NOT Forbes-listed; figure = Juhayna stake value (Aug 2025); estimate.'),
('Hisham Talaat Moustafa',NULL,2025,'Talaat Moustafa Group (~43% stake)','Real estate & hospitality','https://www.forbesmiddleeast.com/lists/top-100-ceos-2025/hesham-talaat-moustafa/','On Forbes ME CEO list; no published net-worth figure (third-party estimates $265M-$1.4bn, unverified).');

-- Art & cinema economics (the business side) ---------------------------------
INSERT INTO cinema_economics (metric, value, year, source_url, note) VALUES
('Domestic box office','~$23.5M','2024','https://www.screendaily.com/news/egyptian-box-office-set-to-surpass-pre-covid-levels-in-2025/5211272.article','Cairo Industry Days market study'),
('Domestic box office (forecast)','~$37M (EGP 1.8bn)','2025','https://www.screendaily.com/news/egyptian-box-office-set-to-surpass-pre-covid-levels-in-2025/5211272.article','Near pre-COVID 2019 level; the USD value is depressed by the pound''s depreciation'),
('Cinema admissions','12M (2024) then 14.3M forecast (2025)','2024-2025','https://www.screendaily.com/news/egyptian-box-office-set-to-surpass-pre-covid-levels-in-2025/5211272.article','2025 is a forecast'),
('Cinema screens','~400-420','2025','https://www.screendaily.com/news/egyptian-box-office-set-to-surpass-pre-covid-levels-in-2025/5211272.article','Approximate range'),
('Egyptian films in the 2025 domestic top 10','8 of 10','2025','https://www.screendaily.com/news/egyptian-box-office-set-to-surpass-pre-covid-levels-in-2025/5211272.article','Local product dominates the domestic charts'),
('Top film export market','Saudi Arabia — 33 films earned ~$53M','2024','https://variety.com/2025/film/global/saudi-arabia-egyptian-film-industry-1236589572/','Saudi Arabia is now the #1 export market — more than 2x the domestic take'),
('Creative & cultural sectors share of GDP','~3%','2020','https://unctad.org/system/files/official-document/ditctsce2024d2_ch01_en.pdf','UNCTAD estimate; no national CCI definition — approximate'),
('Monetisation: production cash rebate','30% + a 20% off-site supplement','2025','https://celluloidpact.com/film-fixer-line-producer-egypt/','A lever to attract foreign productions; currently limited to EMPC-anchored shoots'),
('Monetisation: Studio Misr','Oldest Arab studio (est. 1935), under fresh investment','2025','https://www.empc.com.eg/','Base for co-production & film-tourism expansion'),
('Monetisation: Giza Film Production City','New studio city under construction beside the pyramids','2026','https://en.wikipedia.org/wiki/Egyptian_Media_Production_City','Under construction; aimed at film-tourism / co-production draw');

-- Military standing (public figures only — Global Firepower 2026) -------------
INSERT INTO military_strength (metric, value, year, source_url, note) VALUES
('Global Firepower rank','19 of 145',2026,'https://www.globalfirepower.com/country-military-strength-detail.php?country_id=egypt','Public GFP estimate; a lower PowerIndex = stronger'),
('PowerIndex score','0.3651',2026,'https://www.globalfirepower.com/country-military-strength-detail.php?country_id=egypt','Public GFP estimate (0.0 = a theoretical perfect score)'),
('Rank in Africa','1 of 38',2026,'https://www.globalfirepower.com/countries-listing-africa.php','#1 in Africa (Algeria 2nd, Nigeria 3rd)'),
('Rank in GFP Middle East region','4',2026,'https://www.globalfirepower.com/countries-listing-middle-east.php','GFP''s ME grouping places Turkiye, Israel and Iran above Egypt'),
('Active personnel','438,500',2026,'https://www.globalfirepower.com/country-military-strength-detail.php?country_id=egypt','Public GFP estimate'),
('Reserve personnel','479,000',2026,'https://www.globalfirepower.com/country-military-strength-detail.php?country_id=egypt','Public GFP estimate'),
('Annual defence budget','US$5.19 billion',2026,'https://www.globalfirepower.com/country-military-strength-detail.php?country_id=egypt','GFP methodology; lower than some other public estimates'),
('Total aircraft','1,088',2026,'https://www.globalfirepower.com/country-military-strength-detail.php?country_id=egypt','GFP reported stock count'),
('Total tanks','3,620',2026,'https://www.globalfirepower.com/country-military-strength-detail.php?country_id=egypt','GFP reported stock count'),
('Total naval assets','149 vessels',2026,'https://www.globalfirepower.com/country-military-strength-detail.php?country_id=egypt','GFP reported count');

-- Arms trade (SIPRI — Egypt as an importer; figures/shares only) --------------
INSERT INTO arms_trade (metric, value, period, source_url, note) VALUES
('Global arms-importer rank','8th','2020-2024','https://www.sipri.org/sites/default/files/2025-03/fs_2503_at_2024_0.pdf','SIPRI Table 2; one of 4 MENA states in the global top 10'),
('Share of global arms imports','3.3%','2020-2024','https://www.sipri.org/sites/default/files/2025-03/fs_2503_at_2024_0.pdf','SIPRI'),
('Prior-period share','5.8%','2015-2019','https://www.sipri.org/sites/default/files/2025-03/fs_2503_at_2024_0.pdf','For comparison'),
('Trend vs prior 5-year period','-44% (volume)','2015-19 to 2020-24','https://www.sipri.org/sites/default/files/2025-03/fs_2503_at_2024_0.pdf','A sharp decline'),
('Rank shift','3rd (2015-19) to 8th (2020-24)','across periods','https://www.sipri.org/commentary/topical-backgrounder/2025/recent-trends-international-arms-transfers-middle-east-and-north-africa','Per the SIPRI MENA backgrounder'),
('Top supplier #1','Germany — 32%','2020-2024','https://www.sipri.org/sites/default/files/2025-03/fs_2503_at_2024_0.pdf','Egypt was Germany''s #2 recipient'),
('Top supplier #2','Italy — 27%','2020-2024','https://www.sipri.org/sites/default/files/2025-03/fs_2503_at_2024_0.pdf','Egypt was Italy''s #2 recipient'),
('Top supplier #3','France — 19%','2020-2024','https://www.sipri.org/sites/default/files/2025-03/fs_2503_at_2024_0.pdf','The supplier mix is now European, not US-led');

-- Football depth -------------------------------------------------------------
INSERT INTO football (item, detail, value, source_url, note) VALUES
('Egyptian Premier League','Founded (unifying local leagues)','1948','https://en.wikipedia.org/wiki/Egyptian_Premier_League',NULL),
('Al Ahly — league titles','Record; ~68% of all titles ever','45','https://en.wikipedia.org/wiki/Egyptian_Premier_League',NULL),
('Zamalek — league titles','Second-most','15','https://en.wikipedia.org/wiki/Zamalek_SC',NULL),
('Ismaily — league titles','Third; only 7 clubs have ever won it','3','https://en.wikipedia.org/wiki/Egyptian_Premier_League',NULL),
('Mohamed Salah — Egypt','Caps / goals; the all-time top scorer','121 caps, 68 goals','https://en.wikipedia.org/wiki/Mohamed_Salah','As of July 2026; grows with his career'),
('Mohamed Salah — Liverpool','Goals, all competitions (3rd in club history)','~257','https://www.nbcsports.com/soccer/news/mohamed-salah-liverpool-stats-all-time-records-video-highlights','Date-dependent tally'),
('Mohamed Salah — Premier League','Goals; top foreign scorer in PL history, 4th all-time','~193','https://www.premierleague.com/en/players/118748/mohamed-salah/stats','Date-dependent'),
('Mohamed Salah — PL Golden Boots','2017-18 (record 32), 2018-19, 2021-22, 2024-25','4','https://en.wikipedia.org/wiki/Mohamed_Salah',NULL),
('Mohamed Salah — PFA Player of the Year','A record 3rd win in 2024-25','3','https://en.wikipedia.org/wiki/Mohamed_Salah',NULL),
('Egypt — AFCON titles','A record for any nation','7','https://www.olympics.com/en/news/africa-cup-of-nations-afcon-winners-list-champions-record','1957-2010'),
('Egypt — AFCON runner-up finishes','1962, 2017, 2021','3','https://en.wikipedia.org/wiki/Egypt_at_the_Africa_Cup_of_Nations',NULL),
('Egypt — AFCON 2025 (in Morocco)','Reached the semi-finals','4th place','https://www.olympics.com/en/news/afcon-2025-egypt-results-scorers-and-standing-full-list','Lost the SF to Senegal and the 3rd-place playoff to Nigeria'),
('Egypt — 2026 World Cup','Qualified (won CAF Group A undefeated); Salah 9 goals','Qualified','https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/egypt-qualify','Coach Hossam Hassan; 7 clean sheets in qualifying'),
('Omar Marmoush','Manchester City transfer (Jan 2025)','GBP 59m','https://en.wikipedia.org/wiki/Omar_Marmoush','A key Egypt forward');

-- Handball depth -------------------------------------------------------------
INSERT INTO handball (item, detail, value, source_url, note) VALUES
('World Championship — best finish','4th (2001, France) — then the best ever by a non-European team','4th','https://en.wikipedia.org/wiki/Egypt_men%27s_national_handball_team',NULL),
('World Championship 2021','Egypt HOSTED (first 32-team edition); finished 7th','7th','https://en.wikipedia.org/wiki/2021_World_Men%27s_Handball_Championship','Lost the QF to eventual champions Denmark'),
('Olympics — Tokyo 2020','Best Olympic finish','4th','https://en.wikipedia.org/wiki/Egypt_men%27s_national_handball_team','Lost the bronze match to Spain'),
('Olympics — Paris 2024','Lost the QF to Spain in extra time','5th','https://en.wikipedia.org/wiki/Egypt_men%27s_national_handball_team',NULL),
('African Championship titles','A record, tied with Tunisia','10','https://en.wikipedia.org/wiki/Egypt_men%27s_national_handball_team','1991-2026'),
('2026 African Championship (Rwanda)','Beat Tunisia 37-24 in the final','Won','https://en.wikipedia.org/wiki/Egypt_men%27s_national_handball_team','31 Jan 2026'),
('Junior (U-21) World Championship','1993 champions','1','https://en.wikipedia.org/wiki/Egypt_men%27s_national_junior_handball_team',NULL),
('Youth (U-19) World Championship','2019 champions — first non-European winners','1','https://egyptindependent.com/egypts-u-19-handball-team-wins-world-championship/','Beat Germany 32-28'),
('Ali Zein','Long-serving left back','480 goals in 316 caps','https://en.wikipedia.org/wiki/Egypt_men%27s_national_handball_team','As of the 2025 Worlds');

-- Logistics projects & performance -------------------------------------------
INSERT INTO logistics_projects (name, detail, value, year, status, source_url, note) VALUES
('6th of October Dry Port','Egypt''s first inland dry port (El Sewedy / SLP / DB Schenker)','720,000 TEU/yr; US$70.5M','2023','Operational','https://www.ebrd.com/home/work-with-us/projects/psd/51830.html','First PPP in the sector; rail-connected'),
('Suez Canal Economic Zone (SCZONE)','6 ports + 4 industrial zones, ~455 km2; ~$16bn attracted','108.7 Mt cargo (FY2025/26)','2025/26','Operational','https://www.logupdateafrica.com/shipping/sczone-secures-16bn-as-egypt-expands-logistics-ambitions-1359065','Revenue EGP 15.9bn, +37% YoY'),
('Ain Sokhna Port','World''s deepest man-made port basin (Guinness)','19 m depth','2025','Operational','https://www.dailynewsegypt.com/2025/11/17/sczone-sky-ports-sign-mou-to-develop-multi-purpose-terminal-at-ain-sokhna-port/','Certified 1 Oct 2025'),
('Damietta — DACT container terminal','New alliance terminal (Hapag-Lloyd / Eurogate / Contship)','3.3M TEU initial capacity','2026','Operational (new)','https://www.hapag-lloyd.com/en/company/press/releases/2026/02/new-damietta-alliance-container-terminals--dact--launches-commer.html','First vessel 14 Feb 2026; ~80% transshipment'),
('10th of Ramadan Dry Port','Operated by MEDLOG (MSC); 250 feddan','up to 500,000 TEU/yr','2025','Under construction','https://www.dailynewsegypt.com/2025/01/07/egypt-signs-agreement-with-swiss-medlog-for-10th-of-ramadan-dry-port-project/','~2027 operations target'),
('KEZAD East Port Said (AD Ports Group)','50-yr usufruct; 20 km2 total, Phase 1 = 2.8 km2','US$120M','2025','Under construction','https://www.adportsgroup.com/en/news-and-media/2025/05/04/ad-ports-group-and-egypts-suez-canal-economic-zone-sign-agreement','Quay works from end-2025'),
('Golden Triangle Economic Zone','Upper Egypt (Qena/Safaga/El Qoseir); 2.23M feddan','mining, industry, tourism','2017','Under development','https://www.sis.gov.eg/Story/114916?lang=en-us','Includes a planned Safaga dry port'),
('World Bank Logistics Performance Index','Egypt''s LPI score (up from 2.82 in 2018)','3.1 (rank 57-58 of 139)','2023','Actual','https://data.worldbank.org/indicator/LP.LPI.OVRL.XQ?locations=EG','Rank disputed: 57th (press) vs 58th (SIS); score 3.1 is unambiguous'),
('Rail freight upgrade (Alstom)','6th Oct-Alexandria + Belbeis-10th of Ramadan freight lines','EUR 690M','2025','Under construction','https://www.railjournal.com/freight/egypt-to-upgrade-key-main-lines/','Aim: rail freight 8M -> 13M tons/yr by 2030'),
('National seaport capacity target','Annual seaport cargo capacity','~185 Mt -> 400 Mt/yr','by 2030','Target','https://sis.gov.eg/en/media-center/files/how-will-egypt-become-a-global-hub-for-trade-and-logistics/','Official SIS target'),
('National container capacity target','Annual container handling','12M -> 40M TEU/yr','by 2030','Target','https://sis.gov.eg/en/media-center/files/how-will-egypt-become-a-global-hub-for-trade-and-logistics/','Official SIS target'),
('National logistics corridors','Integrated international logistics corridors','7 corridors','by 2030','Target','https://www.egypttoday.com/Article/1/136479/Egypt-develops-7-integrated-logistic-corridors-to-enhance-national-transport','SIS earlier cited 5');

-- National mega-project 2026 status ------------------------------------------
INSERT INTO megaproject_status (project, status_2026, key_figure, cost_or_scope, source_url, note) VALUES
('New Administrative Capital (The New Capital)','Occupied but sparsely; the seat of government','~30,000 residents (mid-2025)','Phase 1 for ~500k; long-term 6.5-7M target','https://english.aawsat.com/arab-world/5296623','The 6.5-7M population and 50,000 govt staff are capacity targets, not current'),
('NAC — government relocation','Completed — inaugurated as the seat of government 2 Apr 2024','~50,000 govt employees when full','Government district by Dar Al-Handasah','https://en.wikipedia.org/wiki/The_New_Capital',NULL),
('Iconic Tower (NAC)','Completed (2024) — the tallest building in Africa','394 m, 77 floors','Built by China State Construction','https://en.wikipedia.org/wiki/Iconic_Tower_(Egypt)','Overtook the Great Mosque of Algiers tower'),
('Grand Egyptian Museum (GEM)','Fully inaugurated 1 Nov 2025 (public entry 4 Nov)','>100,000 artifacts; full Tutankhamun (5,398 pieces)','US$1.2 billion','https://www.france24.com/en/culture/20251101-watch-live-egypt-unveils-grand-egyptian-museum-dedicated-to-its-ancient-civilization','Soft/trial opening was Oct 2024; ~5M visitors/yr is a projection'),
('Cairo Monorail — NAC / East Nile line','OPERATIONAL (May 2026) — Africa''s longest monorail','56.5 km; ~16 of 22 stations at launch','Part of a EUR 2.7bn two-line contract','https://meobserver.news/transport/2026/05/10/egypt-opens-first-monorail-line-linking-cairo-to-new-administrative-capital/','Alstom + Arab Contractors + Orascom'),
('Cairo Monorail — 6th of October line','Under construction — delayed','45 km; 13 stations (planned)','Same EUR 2.7bn consortium','https://en.wikipedia.org/wiki/Cairo_Monorail','No firm operation date'),
('Egypt High-Speed Rail (Siemens)','Under construction — no section operational yet','~2,000 km, 3 lines (world''s 6th-largest)','EUR 8.1bn contract (2022)','https://en.wikipedia.org/wiki/High-speed_rail_in_Egypt','First segment (Ain Sokhna-6th Oct) targeted Q1 2027 (projection)'),
('El Dabaa Nuclear Power Plant','Under construction — all 4 units; reactor vessel installed Nov 2025','4.8 GW','US$28.75bn; Russia finances 85%','https://www.world-nuclear-news.org/articles/presidents-launch-installation-of-el-dabaas-second-unit','First unit ~2028, full plant ~2030 (projections; the earlier 2026 target slipped)'),
('New Alamein City','Under build-out — phased','~205 km2; 15 towers, 3 universities','3M+ residents long-term (target)','https://en.wikipedia.org/wiki/New_Alamein','Named "Capital of Arab Resorts" in 2025'),
('Mostakbal Misr (New Delta agriculture)','Under expansion','~350,000 feddans cultivated','Targets 4.5M feddans by 2027 (projection)','https://enterpriseam.com/egypt/hardhats/mostaqbal-misr-is-working-toward-reclaiming-4-5-mn-feddans-for-agriculture-by-2027/','Treated-wastewater irrigation'),
('Hayah Karima (Decent Life)','Phase 1 done; Phase 2 launched FY2025/26','Phase 1: 1,477 villages, ~18M people','Phase 1 EGP 350bn; Phase 2 EGP 25bn','https://www.sis.gov.eg/Story/214106/Egypt-to-launch-Decent-Life-Phase-2-with-EGP-25-bln-development-projects?lang=en-us','Program targets ~4,500 villages (target)'),
('Benban Solar Park','Operational (2019) — the largest solar park in Africa','~1.65 GW','37.2 km2, 41 PV plants','https://sis.gov.eg/en/presidency/internal-affairs/national-projects/benban-the-largest-solar-power-plant-in-aswan/',NULL);

-- ============================================================================
-- End of seed_v8.sql
-- ============================================================================
