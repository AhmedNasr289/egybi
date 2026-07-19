/* EgyBI — SQL challenge catalog + the in-browser practice database.
   ---------------------------------------------------------------------------
   This file powers the HackerRank/LeetCode-style Practice page. It ships:
     1. EGYBI_SANDBOX_SQL — CREATE + INSERT statements for a curated, REAL, cited
        slice of the Egypt knowledge base. Every row is a genuine figure that
        also lives in the backend KB (disputed values are noted in challenges).
     2. EGYBI_CHALLENGES — the problem set. Each challenge carries a plain-English
        statement, the "givens" (tables/columns in scope), a starter query, a
        reference solution (used to COMPUTE the expected output live, so it is
        always correct), an order-sensitivity flag for grading, and a sourced
        "Did You Know" reveal.
   The page runs both the learner's query and the reference solution against the
   same sql.js database and grades by comparing result sets. Nothing is mocked. */

window.EGYBI_SANDBOX_SQL = `
CREATE TABLE pharaohs (name TEXT, dynasty TEXT, reign_start INTEGER, reign_end INTEGER, era TEXT);
INSERT INTO pharaohs VALUES
 ('Narmer','I',-3100,-3080,'Early Dynastic'),
 ('Djoser','III',-2670,-2650,'Old Kingdom'),
 ('Sneferu','IV',-2613,-2589,'Old Kingdom'),
 ('Khufu','IV',-2589,-2566,'Old Kingdom'),
 ('Khafre','IV',-2558,-2532,'Old Kingdom'),
 ('Menkaure','IV',-2532,-2503,'Old Kingdom'),
 ('Unas','V',-2375,-2345,'Old Kingdom'),
 ('Pepi II','VI',-2278,-2184,'Old Kingdom'),
 ('Mentuhotep II','XI',-2061,-2010,'Middle Kingdom'),
 ('Senusret III','XII',-1878,-1839,'Middle Kingdom'),
 ('Sobekneferu','XII',-1806,-1802,'Middle Kingdom'),
 ('Ahmose I','XVIII',-1550,-1525,'New Kingdom'),
 ('Hatshepsut','XVIII',-1479,-1458,'New Kingdom'),
 ('Thutmose III','XVIII',-1479,-1425,'New Kingdom'),
 ('Amenhotep III','XVIII',-1388,-1351,'New Kingdom'),
 ('Akhenaten','XVIII',-1353,-1336,'New Kingdom'),
 ('Tutankhamun','XVIII',-1332,-1323,'New Kingdom'),
 ('Seti I','XIX',-1290,-1279,'New Kingdom'),
 ('Ramesses II','XIX',-1279,-1213,'New Kingdom'),
 ('Merneptah','XIX',-1213,-1203,'New Kingdom'),
 ('Ramesses III','XX',-1184,-1153,'New Kingdom'),
 ('Taharqa','XXV',-690,-664,'Third Intermediate'),
 ('Psamtik I','XXVI',-664,-610,'Late Period'),
 ('Nectanebo II','XXX',-360,-343,'Late Period'),
 ('Ptolemy I Soter','Ptolemaic',-305,-282,'Ptolemaic'),
 ('Cleopatra VII','Ptolemaic',-51,-30,'Ptolemaic');

CREATE TABLE monuments (name TEXT, builder TEXT, location TEXT, construction_start INTEGER, construction_end INTEGER);
INSERT INTO monuments VALUES
 ('Step Pyramid of Djoser','Djoser','Saqqara',-2670,-2650),
 ('Great Pyramid of Khufu','Khufu','Giza',-2589,-2560),
 ('Pyramid of Khafre','Khafre','Giza',-2570,-2530),
 ('Great Sphinx','Khafre','Giza',-2570,-2530),
 ('Mortuary Temple of Hatshepsut','Hatshepsut','Deir el-Bahari',-1479,-1458),
 ('Luxor Temple','Amenhotep III','Luxor',-1400,-1213),
 ('Ramesseum','Ramesses II','Luxor West Bank',-1279,-1213),
 ('Abu Simbel','Ramesses II','Aswan',-1264,-1244),
 ('Tomb of Tutankhamun (KV62)','Tutankhamun','Valley of the Kings',-1332,-1323);

CREATE TABLE tourism (year INTEGER, arrivals_millions REAL, revenue_usd_bn REAL);
INSERT INTO tourism VALUES
 (2019,13.1,13.03),(2020,3.5,4.40),(2021,8.0,NULL),(2022,11.7,10.70),
 (2023,14.9,13.6),(2024,15.7,15.3),(2025,19.0,16.7);

CREATE TABLE suez (year INTEGER, revenue_usd_bn REAL, note TEXT);
INSERT INTO suez VALUES
 (2019,5.80,NULL),(2020,5.61,NULL),(2021,6.30,NULL),(2023,10.25,'record'),
 (2024,3.99,'Red Sea shipping crisis');

CREATE TABLE governorates (name TEXT, population_millions REAL, area_km2 INTEGER);
INSERT INTO governorates VALUES
 ('Cairo',10.46,3085),('Giza',9.53,13184),('Sharqia',8.03,4911),('Dakahlia',7.06,3716),
 ('Beheira',6.94,10130),('Minya',6.33,32279),('Qalyubia',6.14,1124),('Sohag',5.71,11547),
 ('Alexandria',5.46,2679),('Gharbia',5.35,1942);

CREATE TABLE indicators (category TEXT, name TEXT, year INTEGER, value REAL, unit TEXT);
INSERT INTO indicators VALUES
 ('economy','GDP (current US$)',2018,262.59,'USD billion'),
 ('economy','GDP (current US$)',2019,318.68,'USD billion'),
 ('economy','GDP (current US$)',2020,383.82,'USD billion'),
 ('economy','GDP (current US$)',2021,424.67,'USD billion'),
 ('economy','GDP (current US$)',2022,476.75,'USD billion'),
 ('economy','GDP (current US$)',2023,395.93,'USD billion'),
 ('economy','GDP (current US$)',2024,389.06,'USD billion'),
 ('economy','Inflation (annual %)',2016,13.81,'% annual'),
 ('economy','Inflation (annual %)',2017,29.51,'% annual'),
 ('economy','Inflation (annual %)',2019,9.15,'% annual'),
 ('economy','Inflation (annual %)',2021,5.21,'% annual'),
 ('economy','Inflation (annual %)',2022,13.90,'% annual'),
 ('economy','Inflation (annual %)',2023,33.88,'% annual'),
 ('economy','Inflation (annual %)',2024,28.27,'% annual'),
 ('development','Hepatitis C prevalence',2016,10.00,'% of population'),
 ('development','Hepatitis C prevalence',2023,0.38,'% of population');

CREATE TABLE exports (category TEXT, value_usd_bn REAL, pct_of_total REAL);
INSERT INTO exports VALUES
 ('Petroleum & electricity',13.6,32.9),('Ready-made garments',2.2,5.4),
 ('Urea fertilizers',2.0,4.9),('Plastics',1.9,4.7),('Natural gas',1.9,4.6);

CREATE TABLE athletes (name TEXT, sport TEXT, birth_year INTEGER, achievement TEXT);
INSERT INTO athletes VALUES
 ('Mohamed Salah','Football',1992,'Top scorer in African World Cup qualifying (20 goals)'),
 ('Nour El Sherbini','Squash',1995,'World No. 1; 8 World Championship titles'),
 ('Mostafa Asal','Squash',2001,'2024-25 World Champion without dropping a game'),
 ('Ali Farag','Squash',1992,'Former World No. 1; 4 World titles'),
 ('Amr Shabana','Squash',1979,'Egypt''s first squash world champion; 4 World Opens'),
 ('Raneem El Welily','Squash',1989,'First Egyptian woman to reach World No. 1'),
 ('Feryal Ashraf','Karate',1998,'Egypt''s first women''s Olympic gold (Tokyo 2020)'),
 ('Ahmed Elgendy','Modern pentathlon',1999,'Olympic gold, Paris 2024'),
 ('Karam Gaber','Wrestling',1979,'Olympic gold, Athens 2004');

CREATE TABLE sports_titles (holder TEXT, competition TEXT, titles INTEGER);
INSERT INTO sports_titles VALUES
 ('Egypt national team','Africa Cup of Nations',7),
 ('Al Ahly','CAF Champions League',12),
 ('Zamalek','CAF Champions League',5),
 ('Egypt (men''s squash)','World Championship (since 2003)',14),
 ('Egypt at the Olympics','Total Olympic medals',38);

CREATE TABLE satellites (name TEXT, launch_year INTEGER, purpose TEXT, partner TEXT);
INSERT INTO satellites VALUES
 ('EgyptSat-1',2007,'Earth observation','Ukraine'),
 ('EgyptSat-2',2014,'Earth observation','Russia'),
 ('EgyptSat-A',2019,'Earth observation','Russia'),
 ('Tiba-1',2019,'Communications','France'),
 ('Nilesat 301',2022,'Communications','France'),
 ('MisrSat-2',2023,'Remote sensing','China'),
 ('NExSat-1',2024,'Experimental remote sensing','Germany');

CREATE TABLE companies (name TEXT, sector TEXT, founded_year INTEGER);
INSERT INTO companies VALUES
 ('Telecom Egypt','Telecom',1854),('National Bank of Egypt','Banking',1898),
 ('Eastern Company','Tobacco',1920),('Elsewedy Electric','Cables & energy',1938),
 ('Commercial International Bank','Banking',1975),('Orascom Construction','Construction',1976),
 ('Juhayna Food Industries','Food & dairy',1983),('EFG Holding','Finance',1984),
 ('Ezz Steel','Steel',1994),('Fawry','Fintech',2008);

CREATE TABLE investment_deals (name TEXT, year INTEGER, value_usd_bn REAL, category TEXT);
INSERT INTO investment_deals VALUES
 ('Ras El Hekma megacity',2024,35.0,'FDI'),
 ('IMF Extended Fund Facility (augmented)',2024,8.0,'IMF'),
 ('IMF Extended Arrangement',2016,12.0,'IMF'),
 ('SCZONE cumulative',2025,10.4,'free-zone'),
 ('State privatization program',2025,6.0,'privatization');

CREATE TABLE cultural_figures (name TEXT, domain TEXT, birth_year INTEGER, death_year INTEGER);
INSERT INTO cultural_figures VALUES
 ('Youssef Chahine','cinema',1926,2008),('Faten Hamama','cinema',1931,2015),
 ('Omar Sharif','cinema',1932,2015),('Adel Imam','cinema',1940,NULL),
 ('Mona Zaki','cinema',1976,NULL),('Umm Kulthum','music',1898,1975),
 ('Amr Diab','music',1961,NULL),('Mohamed Mounir','music',1954,NULL),
 ('Mahmoud Mokhtar','art',1891,1934),('Mahmoud Said','art',1897,1964);

CREATE TABLE water_use (sector TEXT, share_pct REAL);
INSERT INTO water_use VALUES ('Agriculture',86.0),('Municipal',11.5),('Industrial',2.5);

CREATE TABLE businessmen (name TEXT, net_worth_usd_bn REAL, main_sector TEXT, forbes_listed INTEGER);
INSERT INTO businessmen VALUES
 ('Nassef Sawiris',9.9,'Fertilizers & construction',1),
 ('Naguib Sawiris',5.6,'Telecom & mining',1),
 ('Mohamed Mansour',4.0,'Automotive distribution',1),
 ('Youssef Mansour',1.8,'Retail & distribution',1),
 ('Samih Sawiris',1.4,'Real estate & resorts',1),
 ('Yasseen Mansour',1.4,'Real estate & distribution',1);

CREATE TABLE football_titles (club TEXT, league_titles INTEGER);
INSERT INTO football_titles VALUES ('Al Ahly',45),('Zamalek',15),('Ismaily',3),('Al Ittihad',1),('Tersana',1);

CREATE TABLE arms_imports (supplier TEXT, share_pct REAL, period TEXT);
INSERT INTO arms_imports VALUES ('Germany',32.0,'2020-2024'),('Italy',27.0,'2020-2024'),('France',19.0,'2020-2024'),('Other',22.0,'2020-2024');

CREATE TABLE logistics (project TEXT, status TEXT, capacity_teu_per_yr INTEGER);
INSERT INTO logistics VALUES
 ('6th of October Dry Port','Operational',720000),
 ('Damietta DACT terminal','Operational',3300000),
 ('10th of Ramadan Dry Port','Under construction',500000),
 ('Ain Sokhna Port','Operational',NULL),
 ('KEZAD East Port Said','Under construction',NULL);

CREATE TABLE population_years (year INTEGER, population INTEGER);
INSERT INTO population_years VALUES
 (1960,26896479),(1970,34623990),(1980,43950413),(1990,58396618),(2000,73083284),
 (2010,89196072),(2015,99597342),(2020,109315124),(2023,114535772),(2024,116538258);

CREATE TABLE inflation (year INTEGER, rate_pct REAL);
INSERT INTO inflation VALUES
 (2015,10.4),(2016,13.8),(2017,29.5),(2018,14.4),(2019,9.2),
 (2020,5.0),(2021,5.2),(2022,8.5),(2023,33.9),(2024,33.3);

CREATE TABLE exchange_rate (year INTEGER, egp_per_usd REAL);
INSERT INTO exchange_rate VALUES
 (2015,7.83),(2016,18.13),(2017,17.76),(2018,17.91),(2019,16.05),
 (2020,15.74),(2021,15.72),(2022,24.72),(2023,30.90),(2024,50.85);

CREATE TABLE crops (crop TEXT, year INTEGER, million_tonnes REAL);
INSERT INTO crops VALUES
 ('Wheat',2015,9.61),('Wheat',2019,8.56),('Wheat',2021,9.84),('Wheat',2023,9.07),
 ('Rice',2015,4.82),('Rice',2018,3.12),('Rice',2021,4.24),('Rice',2023,6.23),
 ('Maize',2015,7.80),('Maize',2018,5.11),('Maize',2021,8.04),('Maize',2023,7.45),
 ('Sugarcane',2015,15.90),('Sugarcane',2019,15.34),('Sugarcane',2023,14.25);

CREATE TABLE universities (name TEXT, city TEXT, founded INTEGER, qs_rank TEXT);
INSERT INTO universities VALUES
 ('Cairo University','Giza',1908,'347'),
 ('American University in Cairo','Cairo',1919,'381'),
 ('Ain Shams University','Cairo',1950,'543'),
 ('Alexandria University','Alexandria',1938,'784'),
 ('Mansoura University','Mansoura',1972,'1001-1200'),
 ('Al-Azhar University','Cairo',970,'1001-1200'),
 ('Zagazig University','Zagazig',1974,'1201-1400'),
 ('Helwan University','Helwan',1975,'1201-1400');

CREATE TABLE unesco_sites (site TEXT, governorate TEXT, year_inscribed INTEGER, type TEXT);
INSERT INTO unesco_sites VALUES
 ('Memphis and its Necropolis','Giza',1979,'Cultural'),
 ('Ancient Thebes','Luxor',1979,'Cultural'),
 ('Nubian Monuments','Aswan',1979,'Cultural'),
 ('Historic Cairo','Cairo',1979,'Cultural'),
 ('Abu Mena','Alexandria',1979,'Cultural'),
 ('Saint Catherine Area','South Sinai',2002,'Cultural'),
 ('Wadi Al-Hitan (Whale Valley)','Al Fayyum',2005,'Natural');

CREATE TABLE cinema (metric TEXT, value TEXT, year INTEGER);
INSERT INTO cinema VALUES
 ('Domestic box office','$23.5M',2024),
 ('Cinema admissions','12M',2024),
 ('Cinema screens','~410',2025),
 ('Egyptian films in the 2025 top 10','8 of 10',2025),
 ('Top film export market','Saudi Arabia',2024),
 ('Creative sectors share of GDP','~3%',2020);
`;

/* Each challenge: id, sector, difficulty (Easy|Medium|Hard), title, statement,
   givens (schema recap shown to the learner), starter (editor seed), solution
   (reference query — expected output is computed from it), orderMatters (grading),
   didYouKnow (sourced reveal). */
window.EGYBI_CHALLENGES = [
  // ---- History ----
  { id:'his-1', sector:'History', difficulty:'Easy',
    title:'New Kingdom pharaohs',
    statement:'List the name and dynasty of every pharaoh from the New Kingdom era.',
    givens:'pharaohs(name, dynasty, reign_start, reign_end, era). reign_* are signed years (negative = BCE).',
    starter:'SELECT name, dynasty\nFROM pharaohs\nWHERE era = ...;',
    solution:"SELECT name, dynasty FROM pharaohs WHERE era = 'New Kingdom';",
    orderMatters:false,
    didYouKnow:'The New Kingdom (Dyn. XVIII–XX) was Egypt at its imperial height — Hatshepsut, Akhenaten, Tutankhamun and Ramesses II all ruled in it. (Britannica, Oxford History of Ancient Egypt)' },

  { id:'his-2', sector:'History', difficulty:'Easy',
    title:'The five longest reigns',
    statement:'Rank pharaohs by reign length (reign_end − reign_start) and return the top 5 as name and years_reigned, longest first.',
    givens:'pharaohs(name, reign_start, reign_end). Years are signed, so reign_end − reign_start gives a positive length.',
    starter:'SELECT name, (reign_end - reign_start) AS years_reigned\nFROM pharaohs\nORDER BY ...\nLIMIT 5;',
    solution:'SELECT name, (reign_end - reign_start) AS years_reigned FROM pharaohs ORDER BY (reign_end - reign_start) DESC LIMIT 5;',
    orderMatters:true,
    didYouKnow:'Pepi II tops the list at a traditional 94 years — but several Egyptologists argue for ~64. The knowledge base flags this dispute rather than picking a side. (Turin King List; Wikipedia)' },

  { id:'his-3', sector:'History', difficulty:'Medium',
    title:'Pharaohs per era',
    statement:'Count how many pharaohs fall in each era. Return era and a column named pharaohs, ordered by the count from high to low.',
    givens:'pharaohs(name, era). Use GROUP BY.',
    starter:'SELECT era, COUNT(*) AS pharaohs\nFROM pharaohs\nGROUP BY ...\nORDER BY ...;',
    solution:'SELECT era, COUNT(*) AS pharaohs FROM pharaohs GROUP BY era ORDER BY COUNT(*) DESC, era;',
    orderMatters:true,
    didYouKnow:'Egyptologists group ~30 dynasties into eras (Old / Middle / New Kingdom, split by "Intermediate Periods" of fragmentation). (Oxford History of Ancient Egypt)' },

  { id:'his-4', sector:'History', difficulty:'Hard',
    title:'Monuments and their builder’s dynasty',
    statement:'For each monument, show the monument name, who built it, and that builder’s dynasty — by joining monuments to pharaohs. Order by the monument’s construction_start (oldest first).',
    givens:'monuments(name, builder, location, construction_start). pharaohs(name, dynasty). Join monuments.builder = pharaohs.name.',
    starter:'SELECT m.name, m.builder, p.dynasty\nFROM monuments m\nJOIN pharaohs p ON ...\nORDER BY ...;',
    solution:'SELECT m.name, m.builder, p.dynasty FROM monuments m JOIN pharaohs p ON m.builder = p.name ORDER BY m.construction_start;',
    orderMatters:true,
    didYouKnow:'The Great Sphinx and Khafre’s pyramid share a builder and a site (Giza) — the Sphinx’s face is widely thought to be Khafre’s. (Britannica)' },

  // ---- Economy ----
  { id:'eco-1', sector:'Economy', difficulty:'Easy',
    title:'Big export earners',
    statement:'Return the export categories that make up more than 5% of total exports, as category and pct_of_total, largest share first.',
    givens:'exports(category, value_usd_bn, pct_of_total).',
    starter:'SELECT category, pct_of_total\nFROM exports\nWHERE ...\nORDER BY ...;',
    solution:'SELECT category, pct_of_total FROM exports WHERE pct_of_total > 5 ORDER BY pct_of_total DESC;',
    orderMatters:true,
    didYouKnow:'Petroleum & electricity alone are ~33% of Egypt’s goods exports; textiles built on long-staple Egyptian cotton follow. (Lloyds Bank / Coface trade profile)' },

  { id:'eco-2', sector:'Economy', difficulty:'Medium',
    title:'GDP, year by year',
    statement:'From the indicators table, return the year and value of the "GDP (current US$)" series, earliest year first.',
    givens:'indicators(category, name, year, value, unit). Filter name = \'GDP (current US$)\'.',
    starter:"SELECT year, value\nFROM indicators\nWHERE name = ...\nORDER BY year;",
    solution:"SELECT year, value FROM indicators WHERE name = 'GDP (current US$)' ORDER BY year;",
    orderMatters:true,
    didYouKnow:'The 2023–24 dip in nominal-USD GDP is mostly the pound’s devaluation, not real contraction — real GDP kept growing. (World Bank NY.GDP.MKTP.CD)' },

  { id:'eco-3', sector:'Economy', difficulty:'Hard',
    title:'Year-over-year GDP change (window function)',
    statement:'For the "GDP (current US$)" series, return each year, its value, and the change from the previous year (this year minus last year) as a column named yoy_change. Use a window function. The first year’s change will be NULL.',
    givens:'indicators(name, year, value). Use LAG(value) OVER (ORDER BY year). SQLite supports window functions.',
    starter:"SELECT year, value,\n       value - LAG(value) OVER (ORDER BY year) AS yoy_change\nFROM indicators\nWHERE name = 'GDP (current US$)'\nORDER BY year;",
    solution:"SELECT year, value, value - LAG(value) OVER (ORDER BY year) AS yoy_change FROM indicators WHERE name = 'GDP (current US$)' ORDER BY year;",
    orderMatters:true,
    didYouKnow:'Window functions (LAG, LEAD, ROW_NUMBER, running totals) are the backbone of analytics SQL — and they run right here in the browser via SQLite. (SQLite docs)' },

  // ---- Tourism ----
  { id:'tou-1', sector:'Tourism', difficulty:'Easy',
    title:'Years we have revenue for',
    statement:'Return the year and revenue_usd_bn for every year where tourism revenue is recorded (not NULL), earliest first.',
    givens:'tourism(year, arrivals_millions, revenue_usd_bn). Some years have a NULL revenue.',
    starter:'SELECT year, revenue_usd_bn\nFROM tourism\nWHERE revenue_usd_bn IS NOT NULL\nORDER BY year;',
    solution:'SELECT year, revenue_usd_bn FROM tourism WHERE revenue_usd_bn IS NOT NULL ORDER BY year;',
    orderMatters:true,
    didYouKnow:'2021 revenue is deliberately blank — official sources genuinely disagree on the figure, so the KB records NULL rather than guessing. (Ministry of Tourism / CBE)' },

  { id:'tou-2', sector:'Tourism', difficulty:'Medium',
    title:'Revenue per visitor',
    statement:'For years where BOTH arrivals and revenue are known, return year and revenue per visitor in US$ (revenue in billions ÷ arrivals in millions × 1000), rounded to whole dollars, aliased as usd_per_visitor. Newest year first.',
    givens:'tourism(year, arrivals_millions, revenue_usd_bn). revenue_usd_bn/arrivals_millions gives $000s per visitor; ×1000 → US$. Use ROUND(x, 0).',
    starter:'SELECT year,\n       ROUND(revenue_usd_bn / arrivals_millions * 1000, 0) AS usd_per_visitor\nFROM tourism\nWHERE arrivals_millions IS NOT NULL AND revenue_usd_bn IS NOT NULL\nORDER BY year DESC;',
    solution:'SELECT year, ROUND(revenue_usd_bn / arrivals_millions * 1000, 0) AS usd_per_visitor FROM tourism WHERE arrivals_millions IS NOT NULL AND revenue_usd_bn IS NOT NULL ORDER BY year DESC;',
    orderMatters:true,
    didYouKnow:'Egypt hit a record ~19M visitors in 2025 (SIS / Ministry). Spend-per-visitor is a core tourism-BI metric — higher-value tourism beats sheer headcount.' },

  // ---- Suez ----
  { id:'sue-1', sector:'Suez Canal', difficulty:'Easy',
    title:'Suez revenue, ranked',
    statement:'Return year and revenue_usd_bn from the suez table, highest revenue first, so the 2024 collapse sits at the bottom.',
    givens:'suez(year, revenue_usd_bn, note).',
    starter:'SELECT year, revenue_usd_bn\nFROM suez\nORDER BY ...;',
    solution:'SELECT year, revenue_usd_bn FROM suez ORDER BY revenue_usd_bn DESC;',
    orderMatters:true,
    didYouKnow:'Suez revenue fell ~61% to ~$3.99bn in 2024 as Red Sea attacks cut traffic ~90% — Egypt’s single largest hard-currency shock in years. (Suez Canal Authority)' },

  { id:'sue-2', sector:'Suez Canal', difficulty:'Hard',
    title:'The 2024 drop, in percent',
    statement:'Compute the percentage drop in Suez revenue from 2023 to 2024. Return one row with a single column pct_drop = ROUND((rev2023 − rev2024) / rev2023 × 100, 1). Use subqueries to pull each year’s revenue.',
    givens:'suez(year, revenue_usd_bn). Pull 2023 and 2024 with scalar subqueries.',
    starter:"SELECT ROUND(\n  ( (SELECT revenue_usd_bn FROM suez WHERE year=2023)\n  - (SELECT revenue_usd_bn FROM suez WHERE year=2024) )\n  / (SELECT revenue_usd_bn FROM suez WHERE year=2023) * 100, 1) AS pct_drop;",
    solution:"SELECT ROUND(((SELECT revenue_usd_bn FROM suez WHERE year=2023) - (SELECT revenue_usd_bn FROM suez WHERE year=2024)) / (SELECT revenue_usd_bn FROM suez WHERE year=2023) * 100, 1) AS pct_drop;",
    orderMatters:false,
    didYouKnow:'That single number — a ~61% year-on-year collapse — is why the 2024 Suez shock rippled straight into Egypt’s foreign-currency reserves and the IMF programme. (Suez Canal Authority / IMF)' },

  // ---- Demographics ----
  { id:'dem-1', sector:'Demographics', difficulty:'Easy',
    title:'The most populous governorates',
    statement:'Return the name and population_millions of governorates with more than 6 million people, most populous first.',
    givens:'governorates(name, population_millions, area_km2).',
    starter:'SELECT name, population_millions\nFROM governorates\nWHERE ...\nORDER BY ...;',
    solution:'SELECT name, population_millions FROM governorates WHERE population_millions > 6 ORDER BY population_millions DESC;',
    orderMatters:true,
    didYouKnow:'Over 95% of Egyptians live on ~4% of the land — the Nile Valley and Delta. Cairo and Giza alone hold ~20 million people. (CAPMAS)' },

  { id:'dem-2', sector:'Demographics', difficulty:'Medium',
    title:'Population density',
    statement:'Return name and population density (people per km²) as ROUND(population_millions × 1000000 / area_km2, 0) aliased as density, densest first. Note how desert governorates rank low.',
    givens:'governorates(name, population_millions, area_km2). Density = people ÷ area.',
    starter:'SELECT name,\n       ROUND(population_millions * 1000000 / area_km2, 0) AS density\nFROM governorates\nORDER BY density DESC;',
    solution:'SELECT name, ROUND(population_millions * 1000000 / area_km2, 0) AS density FROM governorates ORDER BY ROUND(population_millions * 1000000 / area_km2, 0) DESC;',
    orderMatters:true,
    didYouKnow:'Qalyubia and Cairo are among the densest places on Earth, while vast desert governorates like Minya look sparse on paper — density reveals what a raw population count hides.' },

  // ---- Sports ----
  { id:'spo-1', sector:'Sports', difficulty:'Easy',
    title:'Egypt’s squash roster',
    statement:'Return the name and achievement of every athlete whose sport is Squash, oldest athlete first (by birth_year).',
    givens:'athletes(name, sport, birth_year, achievement).',
    starter:"SELECT name, achievement\nFROM athletes\nWHERE sport = 'Squash'\nORDER BY birth_year;",
    solution:"SELECT name, achievement FROM athletes WHERE sport = 'Squash' ORDER BY birth_year;",
    orderMatters:true,
    didYouKnow:'Since 2003 an Egyptian has won the men’s squash World Championship ~14 times. The country holds multiple top-10 men and women simultaneously. (PSA / olympics.com)' },

  { id:'spo-2', sector:'Sports', difficulty:'Medium',
    title:'Who has the most titles?',
    statement:'From sports_titles, return holder and titles for every holder with more than 5 titles, most titles first.',
    givens:'sports_titles(holder, competition, titles). (One row is a medal count, not titles — the KB notes that.)',
    starter:'SELECT holder, titles\nFROM sports_titles\nWHERE titles > 5\nORDER BY titles DESC;',
    solution:'SELECT holder, titles FROM sports_titles WHERE titles > 5 ORDER BY titles DESC;',
    orderMatters:true,
    didYouKnow:'Al Ahly’s 12 CAF Champions Leagues are an African record, and it was named CAF African Club of the Century in 2000. (CAF)' },

  // ---- Science & Space ----
  { id:'sci-1', sector:'Science & Space', difficulty:'Easy',
    title:'Egypt in orbit',
    statement:'Return the name, launch_year and partner of every satellite, earliest launch first.',
    givens:'satellites(name, launch_year, purpose, partner).',
    starter:'SELECT name, launch_year, partner\nFROM satellites\nORDER BY launch_year;',
    solution:'SELECT name, launch_year, partner FROM satellites ORDER BY launch_year;',
    orderMatters:true,
    didYouKnow:'Egypt has launched satellites since 2007 with partners spanning Ukraine, Russia, France, China and Germany — and now hosts the African Space Agency. (Space in Africa)' },

  { id:'sci-2', sector:'Science & Space', difficulty:'Medium',
    title:'Launch partners, counted',
    statement:'Count how many satellites Egypt launched with each partner. Return partner and a column named launches, most launches first, then partner alphabetically for ties.',
    givens:'satellites(name, launch_year, purpose, partner). Use GROUP BY partner.',
    starter:'SELECT partner, COUNT(*) AS launches\nFROM satellites\nGROUP BY partner\nORDER BY launches DESC, partner;',
    solution:'SELECT partner, COUNT(*) AS launches FROM satellites GROUP BY partner ORDER BY COUNT(*) DESC, partner;',
    orderMatters:true,
    didYouKnow:'MisrSat-2 (2023) was built with a ~$92m Chinese grant and locally assembled/tested — a deliberate step toward home-grown satellite manufacturing. (Space in Africa / CGTN)' },

  // ---- Industry & Investment ----
  { id:'ind-1', sector:'Industry', difficulty:'Easy',
    title:'The old guard',
    statement:'Return the name, sector and founded_year of companies founded before 1950, oldest first.',
    givens:'companies(name, sector, founded_year).',
    starter:'SELECT name, sector, founded_year\nFROM companies\nWHERE founded_year < 1950\nORDER BY founded_year;',
    solution:'SELECT name, sector, founded_year FROM companies WHERE founded_year < 1950 ORDER BY founded_year;',
    orderMatters:true,
    didYouKnow:'Telecom Egypt traces to 1854 and the National Bank of Egypt to 1898 — some of Egypt’s biggest listed firms are over a century old. (company filings / Wikipedia)' },

  { id:'ind-2', sector:'Industry', difficulty:'Medium',
    title:'Investment by category',
    statement:'From investment_deals, return each category and the total value_usd_bn for that category as total_bn, largest total first.',
    givens:'investment_deals(name, year, value_usd_bn, category). Use SUM + GROUP BY.',
    starter:'SELECT category, SUM(value_usd_bn) AS total_bn\nFROM investment_deals\nGROUP BY category\nORDER BY total_bn DESC;',
    solution:'SELECT category, SUM(value_usd_bn) AS total_bn FROM investment_deals GROUP BY category ORDER BY SUM(value_usd_bn) DESC;',
    orderMatters:true,
    didYouKnow:'The 2024 Ras El Hekma deal ($35bn from a UAE/ADQ consortium) is the largest single foreign investment in Egypt’s history. (Bloomberg)' },

  // ---- Culture ----
  { id:'cul-1', sector:'Art & Cinema', difficulty:'Easy',
    title:'The music greats',
    statement:'Return the name and birth_year of every cultural figure whose domain is music, earliest-born first.',
    givens:'cultural_figures(name, domain, birth_year, death_year). domain is cinema / music / art.',
    starter:"SELECT name, birth_year\nFROM cultural_figures\nWHERE domain = 'music'\nORDER BY birth_year;",
    solution:"SELECT name, birth_year FROM cultural_figures WHERE domain = 'music' ORDER BY birth_year;",
    orderMatters:true,
    didYouKnow:'Umm Kulthum, the "Star of the East", so defined Arab music that her Thursday-night radio broadcasts reportedly emptied the streets of Cairo. (Britannica)' },

  { id:'cul-2', sector:'Art & Cinema', difficulty:'Medium',
    title:'Still with us',
    statement:'Return the name and domain of cultural figures who are still living (death_year IS NULL), name A→Z.',
    givens:'cultural_figures(name, domain, birth_year, death_year). A NULL death_year means still living.',
    starter:'SELECT name, domain\nFROM cultural_figures\nWHERE death_year IS NULL\nORDER BY name;',
    solution:'SELECT name, domain FROM cultural_figures WHERE death_year IS NULL ORDER BY name;',
    orderMatters:true,
    didYouKnow:'Handling NULLs correctly (IS NULL, not = NULL) is one of the most common real-world SQL bugs — three-valued logic trips up even senior analysts. (SQLite docs)' },

  // ---- Water ----
  { id:'wat-1', sector:'Water', difficulty:'Easy',
    title:'Where the water goes',
    statement:'Return sector and share_pct from water_use, largest share first.',
    givens:'water_use(sector, share_pct).',
    starter:'SELECT sector, share_pct\nFROM water_use\nORDER BY share_pct DESC;',
    solution:'SELECT sector, share_pct FROM water_use ORDER BY share_pct DESC;',
    orderMatters:true,
    didYouKnow:'Agriculture takes ~86% of Egypt’s water while the country sits well below the international water-scarcity line — which is why every drainage drop is now recycled. (FAO AQUASTAT)' },

  // ================= expanded problem set =================
  // ---- History ----
  { id:'his-5', sector:'History', difficulty:'Medium',
    title:'Rulers who reigned over 30 years',
    statement:'Return the name and reign length (as years_reigned) of every pharaoh who reigned MORE than 30 years, longest first.',
    givens:'Use pharaohs. reign_end − reign_start gives the length.',
    starter:'SELECT name, (reign_end - reign_start) AS years_reigned\nFROM pharaohs\nWHERE ...\nORDER BY ...;',
    solution:'SELECT name, (reign_end - reign_start) AS years_reigned FROM pharaohs WHERE (reign_end - reign_start) > 30 ORDER BY (reign_end - reign_start) DESC;',
    orderMatters:true,
    didYouKnow:'Ramesses II reigned ~66 years and outlived many of his own heirs; the son who finally succeeded him, Merneptah, was already elderly. (Britannica)' },

  { id:'his-6', sector:'History', difficulty:'Medium',
    title:'Oldest monument at each site',
    statement:'For each location, return the location and the earliest construction_start there (as earliest), oldest sites first.',
    givens:'Use monuments. GROUP BY location and take MIN(construction_start).',
    starter:'SELECT location, MIN(construction_start) AS earliest\nFROM monuments\nGROUP BY location\nORDER BY earliest;',
    solution:'SELECT location, MIN(construction_start) AS earliest FROM monuments GROUP BY location ORDER BY MIN(construction_start);',
    orderMatters:true,
    didYouKnow:'Giza’s pyramids predate the Luxor and Aswan temples by over a thousand years — the Great Pyramid was already ancient when Ramesses II ruled. (Oxford History of Ancient Egypt)' },

  { id:'his-7', sector:'History', difficulty:'Hard',
    title:'Longest-reigning pharaoh per era',
    statement:'For each era, return the era, the name of its longest-reigning pharaoh, and that reign length (as years_reigned). Use a window function to rank within each era. Order by years_reigned, longest first.',
    givens:'Use pharaohs. ROW_NUMBER() OVER (PARTITION BY era ORDER BY length DESC) picks the top ruler per era.',
    starter:'SELECT era, name, years_reigned FROM (\n  SELECT era, name, (reign_end - reign_start) AS years_reigned,\n         ROW_NUMBER() OVER (PARTITION BY era ORDER BY (reign_end - reign_start) DESC) AS rn\n  FROM pharaohs\n) WHERE rn = 1\nORDER BY years_reigned DESC;',
    solution:'SELECT era, name, years_reigned FROM (SELECT era, name, (reign_end - reign_start) AS years_reigned, ROW_NUMBER() OVER (PARTITION BY era ORDER BY (reign_end - reign_start) DESC) AS rn FROM pharaohs) WHERE rn = 1 ORDER BY years_reigned DESC;',
    orderMatters:true,
    didYouKnow:'PARTITION BY is how analysts get a “best per group” answer in one query — the workhorse behind “top product per region” dashboards. (SQLite window-function docs)' },

  { id:'his-8', sector:'History', difficulty:'Hard',
    title:'Which era built the most monuments?',
    statement:'Join monuments to their builder in pharaohs, then return each era and how many monuments it built (as monuments), most first.',
    givens:'Join monuments.builder = pharaohs.name, GROUP BY era, COUNT the monuments.',
    starter:'SELECT p.era, COUNT(*) AS monuments\nFROM monuments m\nJOIN pharaohs p ON m.builder = p.name\nGROUP BY p.era\nORDER BY monuments DESC;',
    solution:'SELECT p.era, COUNT(*) AS monuments FROM monuments m JOIN pharaohs p ON m.builder = p.name GROUP BY p.era ORDER BY COUNT(*) DESC, p.era;',
    orderMatters:true,
    didYouKnow:'The New Kingdom left the densest monumental record — Karnak alone grew over 1,500 years as successive pharaohs each added to it. (Britannica)' },

  // ---- Economy ----
  { id:'eco-4', sector:'Economy', difficulty:'Easy',
    title:'Total value of top exports',
    statement:'Return the combined value of all export categories in the table, as total_usd_bn.',
    givens:'Use exports. SUM the value_usd_bn column.',
    starter:'SELECT SUM(value_usd_bn) AS total_usd_bn\nFROM exports;',
    solution:'SELECT SUM(value_usd_bn) AS total_usd_bn FROM exports;',
    orderMatters:false,
    didYouKnow:'These five categories are only Egypt’s TOP exports, not all of them — the country also earns heavily from services like the Suez Canal and tourism, which aren’t “goods”. (Coface)' },

  { id:'eco-5', sector:'Economy', difficulty:'Medium',
    title:'The high-inflation years',
    statement:'From the "Inflation (annual %)" series, return the year and value for every year inflation was above 20%, highest first.',
    givens:'Use indicators, filtering name = \'Inflation (annual %)\'.',
    starter:"SELECT year, value\nFROM indicators\nWHERE name = 'Inflation (annual %)' AND value > 20\nORDER BY value DESC;",
    solution:"SELECT year, value FROM indicators WHERE name = 'Inflation (annual %)' AND value > 20 ORDER BY value DESC;",
    orderMatters:true,
    didYouKnow:'The 2017 and 2023 inflation spikes both followed big devaluations of the pound (2016 float; 2022–24 crisis) — inflation in Egypt tracks the exchange rate closely. (World Bank / CBE)' },

  { id:'eco-6', sector:'Economy', difficulty:'Medium',
    title:'Peak GDP year',
    statement:'From the "GDP (current US$)" series, return the single year with the highest GDP, and that value.',
    givens:'Use indicators (name = \'GDP (current US$)\'). ORDER BY value and LIMIT 1.',
    starter:"SELECT year, value\nFROM indicators\nWHERE name = 'GDP (current US$)'\nORDER BY value DESC\nLIMIT 1;",
    solution:"SELECT year, value FROM indicators WHERE name = 'GDP (current US$)' ORDER BY value DESC LIMIT 1;",
    orderMatters:true,
    didYouKnow:'Nominal-USD GDP peaked in 2022 then fell — but that drop is mostly the pound losing value against the dollar, not the real economy shrinking. (World Bank)' },

  { id:'eco-7', sector:'Economy', difficulty:'Hard',
    title:'The Hepatitis C collapse, in percent',
    statement:'Using the two "Hepatitis C prevalence" rows (2016 and 2023), return the percentage fall from 2016 to 2023 as pct_drop, rounded to 1 decimal.',
    givens:'Use indicators (name = \'Hepatitis C prevalence\'). Pull each year with a scalar subquery.',
    starter:"SELECT ROUND(\n  ((SELECT value FROM indicators WHERE name='Hepatitis C prevalence' AND year=2016)\n - (SELECT value FROM indicators WHERE name='Hepatitis C prevalence' AND year=2023))\n / (SELECT value FROM indicators WHERE name='Hepatitis C prevalence' AND year=2016) * 100, 1) AS pct_drop;",
    solution:"SELECT ROUND(((SELECT value FROM indicators WHERE name='Hepatitis C prevalence' AND year=2016) - (SELECT value FROM indicators WHERE name='Hepatitis C prevalence' AND year=2023)) / (SELECT value FROM indicators WHERE name='Hepatitis C prevalence' AND year=2016) * 100, 1) AS pct_drop;",
    orderMatters:false,
    didYouKnow:'Prevalence fell from ~10% to 0.38% — a ~96% drop — earning Egypt the world’s first WHO “gold tier” on the path to eliminating hepatitis C (2023). (WHO)' },

  // ---- Tourism ----
  { id:'tou-3', sector:'Tourism', difficulty:'Medium',
    title:'Arrivals growth, 2023 to 2025',
    statement:'Return the increase in international arrivals from 2023 to 2025, in millions, as growth_millions.',
    givens:'Use tourism. Subtract the 2023 arrivals from the 2025 arrivals with two subqueries.',
    starter:'SELECT (SELECT arrivals_millions FROM tourism WHERE year=2025)\n     - (SELECT arrivals_millions FROM tourism WHERE year=2023) AS growth_millions;',
    solution:'SELECT (SELECT arrivals_millions FROM tourism WHERE year=2025) - (SELECT arrivals_millions FROM tourism WHERE year=2023) AS growth_millions;',
    orderMatters:false,
    didYouKnow:'Egypt added ~4 million annual visitors in two years to hit a record ~19M in 2025 — tourism is one of its top hard-currency earners alongside the Suez Canal and remittances. (SIS)' },

  // ---- Suez ----
  { id:'sue-3', sector:'Suez Canal', difficulty:'Medium',
    title:'Average revenue, excluding the crisis',
    statement:'Return the average Suez Canal revenue across all years EXCEPT the 2024 crisis year, as avg_rev, rounded to 2 decimals.',
    givens:'Use suez. Exclude year 2024 with a WHERE, then AVG(revenue_usd_bn).',
    starter:'SELECT ROUND(AVG(revenue_usd_bn), 2) AS avg_rev\nFROM suez\nWHERE year <> 2024;',
    solution:'SELECT ROUND(AVG(revenue_usd_bn), 2) AS avg_rev FROM suez WHERE year <> 2024;',
    orderMatters:false,
    didYouKnow:'Even a single crisis year drags an average down sharply — which is why analysts often report medians or exclude known shocks when summarising volatile revenue. (methodology)' },

  // ---- Demographics ----
  { id:'dem-3', sector:'Demographics', difficulty:'Easy',
    title:'Egypt’s total population',
    statement:'Sum the population of all 27 governorates and return it as total_millions, rounded to 1 decimal.',
    givens:'Use governorates. SUM the population_millions column.',
    starter:'SELECT ROUND(SUM(population_millions), 1) AS total_millions\nFROM governorates;',
    solution:'SELECT ROUND(SUM(population_millions), 1) AS total_millions FROM governorates;',
    orderMatters:false,
    didYouKnow:'The governorate populations sum to Egypt’s CAPMAS domestic count (~105M in late 2023) — lower than the World Bank’s ~114M, which also counts Egyptians living abroad. (CAPMAS / World Bank)' },

  { id:'dem-4', sector:'Demographics', difficulty:'Hard',
    title:'Bigger than average',
    statement:'Return the name and population_millions of every governorate whose population is ABOVE the average governorate population, largest first.',
    givens:'Use governorates. Compare each row to a subquery: (SELECT AVG(population_millions) FROM governorates).',
    starter:'SELECT name, population_millions\nFROM governorates\nWHERE population_millions > (SELECT AVG(population_millions) FROM governorates)\nORDER BY population_millions DESC;',
    solution:'SELECT name, population_millions FROM governorates WHERE population_millions > (SELECT AVG(population_millions) FROM governorates) ORDER BY population_millions DESC;',
    orderMatters:true,
    didYouKnow:'Egypt’s population is extremely unevenly spread — a handful of Nile-valley and Delta governorates sit far above average while vast desert ones are nearly empty. (CAPMAS)' },

  // ---- Sports ----
  { id:'spo-3', sector:'Sports', difficulty:'Medium',
    title:'Sports with more than one athlete',
    statement:'Count how many athletes each sport has, and return only the sports with MORE than one athlete, as sport and n, most first.',
    givens:'Use athletes. GROUP BY sport, then HAVING COUNT(*) > 1.',
    starter:'SELECT sport, COUNT(*) AS n\nFROM athletes\nGROUP BY sport\nHAVING COUNT(*) > 1\nORDER BY n DESC;',
    solution:'SELECT sport, COUNT(*) AS n FROM athletes GROUP BY sport HAVING COUNT(*) > 1 ORDER BY COUNT(*) DESC, sport;',
    orderMatters:true,
    didYouKnow:'HAVING filters groups AFTER aggregation, where WHERE filters rows before it — mixing them up is one of the most common SQL interview mistakes. (SQLite docs)' },

  { id:'spo-4', sector:'Sports', difficulty:'Easy',
    title:'The youngest athlete',
    statement:'Return the name and birth_year of the youngest athlete in the table (the latest birth_year).',
    givens:'Use athletes. ORDER BY birth_year descending and take the first row.',
    starter:'SELECT name, birth_year\nFROM athletes\nORDER BY birth_year DESC\nLIMIT 1;',
    solution:'SELECT name, birth_year FROM athletes ORDER BY birth_year DESC LIMIT 1;',
    orderMatters:true,
    didYouKnow:'Mostafa Asal (b. 2001), nicknamed “The Raging Bull”, became world squash champion in 2024–25 without dropping a single game — the first to do so since Jahangir Khan in 1988. (PSA)' },

  // ---- Science & Space ----
  { id:'sci-3', sector:'Science & Space', difficulty:'Medium',
    title:'Satellites by purpose',
    statement:'Count Egypt’s satellites by purpose. Return purpose and a column named n, most common purpose first, then purpose alphabetically for ties.',
    givens:'Use satellites. GROUP BY purpose.',
    starter:'SELECT purpose, COUNT(*) AS n\nFROM satellites\nGROUP BY purpose\nORDER BY n DESC, purpose;',
    solution:'SELECT purpose, COUNT(*) AS n FROM satellites GROUP BY purpose ORDER BY COUNT(*) DESC, purpose;',
    orderMatters:true,
    didYouKnow:'Egypt’s satellite programme is split between Earth-observation craft (agriculture, water, urban monitoring) and communications satellites like Nilesat 301 and Tiba-1. (Space in Africa)' },

  { id:'sci-4', sector:'Science & Space', difficulty:'Easy',
    title:'Recent launches',
    statement:'Return the name and launch_year of every satellite launched AFTER 2019, earliest first.',
    givens:'Use satellites. Filter launch_year > 2019.',
    starter:'SELECT name, launch_year\nFROM satellites\nWHERE launch_year > 2019\nORDER BY launch_year;',
    solution:'SELECT name, launch_year FROM satellites WHERE launch_year > 2019 ORDER BY launch_year;',
    orderMatters:true,
    didYouKnow:'Egypt’s launch cadence accelerated after 2019 as it built up the Egyptian Space Agency and won the bid to host the African Space Agency. (EgSA)' },

  // ---- Industry & Investment ----
  { id:'ind-3', sector:'Industry', difficulty:'Hard',
    title:'Companies by century founded',
    statement:'Group the companies by the century they were founded in, and return century (as a number, e.g. 19 or 21) and companies (the count), earliest century first.',
    givens:'Use companies. The century is (founded_year / 100) + 1 with integer division — e.g. 1898 → 19, 2008 → 21.',
    starter:'SELECT (founded_year / 100) + 1 AS century, COUNT(*) AS companies\nFROM companies\nGROUP BY century\nORDER BY century;',
    solution:'SELECT (founded_year / 100) + 1 AS century, COUNT(*) AS companies FROM companies GROUP BY (founded_year / 100) + 1 ORDER BY (founded_year / 100) + 1;',
    orderMatters:true,
    didYouKnow:'Some of Egypt’s biggest listed firms are strikingly old — Telecom Egypt traces to 1854 and the National Bank of Egypt to 1898, alongside 21st-century fintechs like Fawry. (company filings)' },

  { id:'ind-4', sector:'Industry', difficulty:'Easy',
    title:'Total headline investment',
    statement:'Return the combined headline value of all the investment deals, as total_usd_bn.',
    givens:'Use investment_deals. SUM the value_usd_bn column.',
    starter:'SELECT SUM(value_usd_bn) AS total_usd_bn\nFROM investment_deals;',
    solution:'SELECT SUM(value_usd_bn) AS total_usd_bn FROM investment_deals;',
    orderMatters:false,
    didYouKnow:'Beware double-counting headline figures: the IMF and Ras El Hekma sums measure very different things (a loan facility vs. a foreign direct investment), so adding them is illustrative, not an economic total. (IMF / Bloomberg)' },

  // ---- Art & Cinema ----
  { id:'cul-3', sector:'Art & Cinema', difficulty:'Medium',
    title:'Average lifespan of the greats',
    statement:'For the cultural figures who have died (death_year is not NULL), return their average lifespan in years as avg_lifespan, rounded to 1 decimal.',
    givens:'Use cultural_figures. Lifespan = death_year − birth_year; only include rows where death_year IS NOT NULL.',
    starter:'SELECT ROUND(AVG(death_year - birth_year), 1) AS avg_lifespan\nFROM cultural_figures\nWHERE death_year IS NOT NULL;',
    solution:'SELECT ROUND(AVG(death_year - birth_year), 1) AS avg_lifespan FROM cultural_figures WHERE death_year IS NOT NULL;',
    orderMatters:false,
    didYouKnow:'If you forget the IS NOT NULL filter, SQL skips the NULLs inside AVG automatically — but death_year − birth_year would still be NULL for the living, so filtering makes your intent explicit. (SQLite docs)' },

  { id:'cul-4', sector:'Art & Cinema', difficulty:'Easy',
    title:'Born before 1930',
    statement:'Return the name and domain of every cultural figure born before 1930, earliest-born first.',
    givens:'Use cultural_figures. Filter birth_year < 1930.',
    starter:'SELECT name, domain\nFROM cultural_figures\nWHERE birth_year < 1930\nORDER BY birth_year;',
    solution:'SELECT name, domain FROM cultural_figures WHERE birth_year < 1930 ORDER BY birth_year;',
    orderMatters:true,
    didYouKnow:'This is the generation of Egypt’s cultural golden age — Umm Kulthum, Mahmoud Mokhtar and Youssef Chahine’s forebears shaped Arab music, art and cinema for the century that followed. (Britannica)' },

  // ---- Water ----
  { id:'wat-2', sector:'Water', difficulty:'Easy',
    title:'The thirstiest sector',
    statement:'Return the single sector that uses the largest share of Egypt’s water, with its share_pct.',
    givens:'Use water_use. ORDER BY share_pct descending, LIMIT 1.',
    starter:'SELECT sector, share_pct\nFROM water_use\nORDER BY share_pct DESC\nLIMIT 1;',
    solution:'SELECT sector, share_pct FROM water_use ORDER BY share_pct DESC LIMIT 1;',
    orderMatters:true,
    didYouKnow:'Agriculture’s ~86% share is why Egypt’s water strategy focuses on farming — canal lining, drip irrigation and treating drainage water all target that single sector. (FAO / Ministry of Water Resources)' },

  // ---- Business & wealth ----
  { id:'biz-1', sector:'Business', difficulty:'Easy',
    title:'Egypt’s multi-billionaires',
    statement:'List the name and net_worth_usd_bn of every businessman worth at least 3 billion dollars, richest first.',
    givens:'businessmen(name, net_worth_usd_bn, main_sector, forbes_listed). Filter with WHERE, then ORDER BY descending.',
    starter:'SELECT name, net_worth_usd_bn\nFROM businessmen\nWHERE net_worth_usd_bn >= ...\nORDER BY ...;',
    solution:'SELECT name, net_worth_usd_bn FROM businessmen WHERE net_worth_usd_bn >= 3 ORDER BY net_worth_usd_bn DESC;',
    orderMatters:true,
    didYouKnow:'Nassef Sawiris (~$9.9bn) is Egypt’s richest person; the Sawiris and Mansour families anchor much of the private sector. Net-worth figures are point-in-time Forbes estimates. (Forbes, 2026)' },

  { id:'biz-2', sector:'Business', difficulty:'Medium',
    title:'Combined billionaire wealth',
    statement:'Return a single row with a column named total_bn holding the summed net worth of all Forbes-listed businessmen, rounded to one decimal place.',
    givens:'businessmen(net_worth_usd_bn, forbes_listed). Use SUM(...) with ROUND(..., 1) and filter forbes_listed = 1.',
    starter:'SELECT ROUND(SUM(net_worth_usd_bn), 1) AS total_bn\nFROM businessmen\nWHERE forbes_listed = 1;',
    solution:'SELECT ROUND(SUM(net_worth_usd_bn), 1) AS total_bn FROM businessmen WHERE forbes_listed = 1;',
    orderMatters:false,
    didYouKnow:'Six Egyptians sit on the Forbes real-time billionaires list, together worth roughly $24bn — a striking concentration in a handful of family holdings. (Forbes, 2026)' },

  // ---- Football ----
  { id:'foo-1', sector:'Sports', difficulty:'Easy',
    title:'Egypt’s league title-holders',
    statement:'From football_titles, return each club and its league_titles, most titles first.',
    givens:'football_titles(club, league_titles). Simple ORDER BY descending.',
    starter:'SELECT club, league_titles\nFROM football_titles\nORDER BY ...;',
    solution:'SELECT club, league_titles FROM football_titles ORDER BY league_titles DESC;',
    orderMatters:true,
    didYouKnow:'Al Ahly has won ~68% of all Egyptian Premier League titles ever contested — only seven clubs have ever won it at all. (Wikipedia, Egyptian Premier League)' },

  { id:'foo-2', sector:'Sports', difficulty:'Medium',
    title:'The Cairo duopoly’s share',
    statement:'Compute what percentage of ALL league titles in the table are held by Al Ahly and Zamalek combined. Return one column named cairo_pct, rounded to one decimal.',
    givens:'football_titles(club, league_titles). Divide the two Cairo clubs’ titles by the SUM of all titles × 100. Cast to REAL (× 100.0) so you don’t get integer division.',
    starter:'SELECT ROUND(\n  SUM(CASE WHEN club IN (...) THEN league_titles ELSE 0 END) * 100.0\n  / SUM(league_titles), 1) AS cairo_pct\nFROM football_titles;',
    solution:"SELECT ROUND(SUM(CASE WHEN club IN ('Al Ahly','Zamalek') THEN league_titles ELSE 0 END) * 100.0 / SUM(league_titles), 1) AS cairo_pct FROM football_titles;",
    orderMatters:false,
    didYouKnow:'Ahly and Zamalek — the Cairo Derby — between them hold the overwhelming majority of Egyptian league titles, one of the most lopsided duopolies in world football. (Wikipedia)' },

  // ---- Defence (public figures only) ----
  { id:'def-1', sector:'Defence', difficulty:'Easy',
    title:'Egypt’s main arms suppliers',
    statement:'List each named supplier (exclude the catch-all “Other”) and its share_pct of Egypt’s 2020–2024 arms imports, largest share first.',
    givens:'arms_imports(supplier, share_pct, period). Filter out supplier = ‘Other’, then ORDER BY share_pct descending. Figures are SIPRI shares, not dollar values.',
    starter:"SELECT supplier, share_pct\nFROM arms_imports\nWHERE supplier <> 'Other'\nORDER BY ...;",
    solution:"SELECT supplier, share_pct FROM arms_imports WHERE supplier <> 'Other' ORDER BY share_pct DESC;",
    orderMatters:true,
    didYouKnow:'In 2020–2024 Egypt’s arms imports were European-led — Germany, Italy and France — a shift away from the previously US-heavy mix. All figures are public SIPRI trend-indicator shares. (SIPRI, 2025)' },

  { id:'def-2', sector:'Defence', difficulty:'Medium',
    title:'The European supplier bloc',
    statement:'Return one column named european_share holding the combined share_pct of Germany, Italy and France.',
    givens:'arms_imports(supplier, share_pct). SUM the three named European suppliers with WHERE ... IN (...).',
    starter:"SELECT SUM(share_pct) AS european_share\nFROM arms_imports\nWHERE supplier IN (...);",
    solution:"SELECT SUM(share_pct) AS european_share FROM arms_imports WHERE supplier IN ('Germany','Italy','France');",
    orderMatters:false,
    didYouKnow:'Germany, Italy and France together supplied about 78% of Egypt’s arms imports in 2020–2024, while overall import volume fell ~44% versus the previous five years. (SIPRI, 2025)' },

  // ---- Logistics ----
  { id:'log-1', sector:'Logistics', difficulty:'Medium',
    title:'Operational container capacity',
    statement:'Among projects that are Operational AND have a known capacity, return each project and its capacity_teu_per_yr, largest first.',
    givens:'logistics(project, status, capacity_teu_per_yr). capacity is NULL for ports not measured in TEU — exclude NULLs with IS NOT NULL and filter status = ‘Operational’.',
    starter:"SELECT project, capacity_teu_per_yr\nFROM logistics\nWHERE status = 'Operational'\n  AND capacity_teu_per_yr IS NOT NULL\nORDER BY ...;",
    solution:"SELECT project, capacity_teu_per_yr FROM logistics WHERE status = 'Operational' AND capacity_teu_per_yr IS NOT NULL ORDER BY capacity_teu_per_yr DESC;",
    orderMatters:true,
    didYouKnow:'Egypt is building an inland-port and terminal network — from the 6th of October dry port to Damietta’s new DACT terminal — to turn its Suez geography into a logistics industry. (EBRD, Hapag-Lloyd, 2026)' },

  // ============================ STUDY PATH ============================
  // A topic-graded progression. Each carries an explicit `topic` so the
  // Practice page can present it as a curriculum, beginner → advanced.

  // ---- Basics: SELECT / WHERE / ORDER / LIMIT / DISTINCT ----
  { id:'b-1', sector:'History', topic:'Basics', difficulty:'Easy',
    title:'Your first SELECT',
    statement:'Return the name and era of every pharaoh in the table.',
    givens:'pharaohs(name, dynasty, reign_start, reign_end, era). Just pick two columns — no filter needed.',
    starter:'SELECT name, era\nFROM pharaohs;',
    solution:'SELECT name, era FROM pharaohs;',
    orderMatters:false,
    didYouKnow:'SELECT is the verb behind every question you will ever ask a database. Everything else just refines it. (SQLite docs)' },

  { id:'b-2', sector:'Demographics', topic:'Basics', difficulty:'Easy',
    title:'Egypt since the millennium',
    statement:'Return the year and population for every year from 2000 onward, oldest year first.',
    givens:'population_years(year, population). Use WHERE year >= 2000 and ORDER BY year.',
    starter:'SELECT year, population\nFROM population_years\nWHERE year >= ...\nORDER BY year;',
    solution:'SELECT year, population FROM population_years WHERE year >= 2000 ORDER BY year;',
    orderMatters:true,
    didYouKnow:'Egypt roughly doubled from ~58 million in 1990 to ~116 million by 2024 — one of the fastest large-population growths on Earth. (World Bank)' },

  { id:'b-3', sector:'Agriculture', topic:'Basics', difficulty:'Easy',
    title:'Which crops do we track?',
    statement:'Return each distinct crop name, alphabetically.',
    givens:'crops(crop, year, million_tonnes). Use SELECT DISTINCT and ORDER BY.',
    starter:'SELECT DISTINCT crop\nFROM crops\nORDER BY crop;',
    solution:'SELECT DISTINCT crop FROM crops ORDER BY crop;',
    orderMatters:true,
    didYouKnow:'DISTINCT collapses duplicates — essential when a table stores many rows per thing (here, several years per crop). (SQLite docs)' },

  { id:'b-4', sector:'Education', topic:'Basics', difficulty:'Easy',
    title:'Universities in the capital',
    statement:'Return the name of every university whose city is Cairo.',
    givens:'universities(name, city, founded, qs_rank). Filter with WHERE city = ‘Cairo’.',
    starter:"SELECT name\nFROM universities\nWHERE city = 'Cairo';",
    solution:"SELECT name FROM universities WHERE city = 'Cairo';",
    orderMatters:false,
    didYouKnow:'Egypt placed 20 universities in the QS World University Rankings 2026, led by Cairo University. (QS 2026)' },

  { id:'b-5', sector:'Demographics', topic:'Basics', difficulty:'Easy',
    title:'The three biggest governorates',
    statement:'Return the top 3 governorates by population, with their population_millions, largest first.',
    givens:'governorates(name, population_millions, area_km2). ORDER BY … DESC then LIMIT 3.',
    starter:'SELECT name, population_millions\nFROM governorates\nORDER BY population_millions DESC\nLIMIT 3;',
    solution:'SELECT name, population_millions FROM governorates ORDER BY population_millions DESC LIMIT 3;',
    orderMatters:true,
    didYouKnow:'Cairo and Giza together hold a huge share of Egypt’s people — the Nile has always concentrated life onto a thin ribbon of land. (CAPMAS)' },

  { id:'b-6', sector:'Economy', topic:'Basics', difficulty:'Easy',
    title:'The inflation spikes',
    statement:'Return the year and rate_pct for every year where annual inflation was above 20%, oldest first.',
    givens:'inflation(year, rate_pct). Filter WHERE rate_pct > 20, then ORDER BY year.',
    starter:'SELECT year, rate_pct\nFROM inflation\nWHERE rate_pct > ...\nORDER BY year;',
    solution:'SELECT year, rate_pct FROM inflation WHERE rate_pct > 20 ORDER BY year;',
    orderMatters:true,
    didYouKnow:'Egypt saw inflation spike after the 2016 pound float and again in 2023–24 — annual rates topped 30%. (World Bank / CBE, annual averages)' },

  { id:'b-7', sector:'Economy', topic:'Basics', difficulty:'Easy',
    title:'Rates between two years (BETWEEN)',
    statement:'Return the year and egp_per_usd for the years 2020 through 2023 inclusive, oldest first.',
    givens:'exchange_rate(year, egp_per_usd). Use WHERE year BETWEEN 2020 AND 2023.',
    starter:'SELECT year, egp_per_usd\nFROM exchange_rate\nWHERE year BETWEEN ... AND ...\nORDER BY year;',
    solution:'SELECT year, egp_per_usd FROM exchange_rate WHERE year BETWEEN 2020 AND 2023 ORDER BY year;',
    orderMatters:true,
    didYouKnow:'The pound went from ~16 to the dollar in 2020 to ~50 by 2024 across successive devaluations. (CBE / market rates, approximate year-end)' },

  { id:'b-8', sector:'Education', topic:'Basics', difficulty:'Easy',
    title:'A short list (IN)',
    statement:'Return the name and founded year of the universities founded in exactly 1908, 1919, or 1950, oldest first.',
    givens:'universities(name, founded). Use WHERE founded IN (…).',
    starter:'SELECT name, founded\nFROM universities\nWHERE founded IN (1908, 1919, 1950)\nORDER BY founded;',
    solution:'SELECT name, founded FROM universities WHERE founded IN (1908,1919,1950) ORDER BY founded;',
    orderMatters:true,
    didYouKnow:'IN is shorthand for several OR conditions — cleaner and easier to read. (SQLite docs)' },

  // ---- Aggregation: COUNT / SUM / AVG / GROUP BY / HAVING ----
  { id:'agg-1', sector:'Education', topic:'Aggregation', difficulty:'Easy',
    title:'How many universities?',
    statement:'Return a single number: the count of universities in the table, as a column named n.',
    givens:'universities(...). Use COUNT(*).',
    starter:'SELECT COUNT(*) AS n\nFROM universities;',
    solution:'SELECT COUNT(*) AS n FROM universities;',
    orderMatters:false,
    didYouKnow:'COUNT(*) counts rows; COUNT(column) skips NULLs in that column — a subtle but important difference. (SQLite docs)' },

  { id:'agg-2', sector:'Agriculture', topic:'Aggregation', difficulty:'Easy',
    title:'Total wheat on record',
    statement:'Return the total wheat production across all recorded years as a column named total_mt, rounded to 2 decimals.',
    givens:'crops(crop, year, million_tonnes). SUM(...) with WHERE crop = ‘Wheat’, wrapped in ROUND(…, 2).',
    starter:"SELECT ROUND(SUM(million_tonnes), 2) AS total_mt\nFROM crops\nWHERE crop = 'Wheat';",
    solution:"SELECT ROUND(SUM(million_tonnes), 2) AS total_mt FROM crops WHERE crop = 'Wheat';",
    orderMatters:false,
    didYouKnow:'Egypt grows ~9 million tonnes of wheat a year yet is still the world’s largest wheat importer — it can’t grow enough for 116 million people. (FAOSTAT)' },

  { id:'agg-3', sector:'Agriculture', topic:'Aggregation', difficulty:'Medium',
    title:'Average output per crop',
    statement:'For each crop, return the crop and its average million_tonnes across years as avg_mt (2 decimals), highest average first.',
    givens:'crops(crop, year, million_tonnes). GROUP BY crop, AVG(...), ORDER BY the average descending.',
    starter:'SELECT crop, ROUND(AVG(million_tonnes), 2) AS avg_mt\nFROM crops\nGROUP BY crop\nORDER BY avg_mt DESC;',
    solution:'SELECT crop, ROUND(AVG(million_tonnes),2) AS avg_mt FROM crops GROUP BY crop ORDER BY avg_mt DESC;',
    orderMatters:true,
    didYouKnow:'Sugarcane dwarfs the grains by weight — but most of it becomes sugar, not calories on a plate. (FAOSTAT)' },

  { id:'agg-4', sector:'Economy', topic:'Aggregation', difficulty:'Easy',
    title:'The worst inflation year',
    statement:'Return the single highest annual inflation rate on record, as a column named max_rate.',
    givens:'inflation(year, rate_pct). Use MAX(rate_pct).',
    starter:'SELECT MAX(rate_pct) AS max_rate\nFROM inflation;',
    solution:'SELECT MAX(rate_pct) AS max_rate FROM inflation;',
    orderMatters:false,
    didYouKnow:'MIN and MAX are aggregates too — they collapse a whole column to one value. (SQLite docs)' },

  { id:'agg-5', sector:'Education', topic:'Aggregation', difficulty:'Medium',
    title:'Cities with more than one university (HAVING)',
    statement:'Return each city that has more than one university, with the count as n, most first (ties broken by city name).',
    givens:'universities(name, city). GROUP BY city, then HAVING COUNT(*) > 1. HAVING filters groups; WHERE filters rows.',
    starter:'SELECT city, COUNT(*) AS n\nFROM universities\nGROUP BY city\nHAVING COUNT(*) > 1\nORDER BY n DESC, city;',
    solution:'SELECT city, COUNT(*) AS n FROM universities GROUP BY city HAVING COUNT(*) > 1 ORDER BY n DESC, city;',
    orderMatters:true,
    didYouKnow:'HAVING is the WHERE of the grouped world — it filters after aggregation, so it can reference COUNT/SUM/AVG. (SQLite docs)' },

  { id:'agg-6', sector:'History', topic:'Aggregation', difficulty:'Medium',
    title:'World Heritage by type',
    statement:'Count Egypt’s UNESCO sites by type. Return type and a column named n, most first.',
    givens:'unesco_sites(site, governorate, year_inscribed, type). GROUP BY type.',
    starter:'SELECT type, COUNT(*) AS n\nFROM unesco_sites\nGROUP BY type\nORDER BY n DESC;',
    solution:'SELECT type, COUNT(*) AS n FROM unesco_sites GROUP BY type ORDER BY n DESC;',
    orderMatters:true,
    didYouKnow:'Egypt has 7 UNESCO World Heritage Sites — six cultural and one natural (the Whale Valley fossils in Fayoum). (UNESCO)' },

  { id:'agg-7', sector:'Agriculture', topic:'Aggregation', difficulty:'Medium',
    title:'Total staple output per year',
    statement:'For each year present, return the year and the summed million_tonnes across all crops as total (2 decimals), oldest year first.',
    givens:'crops(crop, year, million_tonnes). GROUP BY year.',
    starter:'SELECT year, ROUND(SUM(million_tonnes), 2) AS total\nFROM crops\nGROUP BY year\nORDER BY year;',
    solution:'SELECT year, ROUND(SUM(million_tonnes),2) AS total FROM crops GROUP BY year ORDER BY year;',
    orderMatters:true,
    didYouKnow:'Grouping by a shared dimension (here, year) is how you turn a long, thin table into a summary. (SQLite docs)' },

  { id:'agg-8', sector:'History', topic:'Aggregation', difficulty:'Hard',
    title:'Reign length by era',
    statement:'For each era, return the era, the count of pharaohs as n, and the average reign length (reign_end − reign_start) as avg_len (1 decimal), longest average first.',
    givens:'pharaohs(name, reign_start, reign_end, era). Years are signed (negative = BCE), so the subtraction is a positive length. GROUP BY era.',
    starter:'SELECT era, COUNT(*) AS n, ROUND(AVG(reign_end - reign_start), 1) AS avg_len\nFROM pharaohs\nGROUP BY era\nORDER BY avg_len DESC;',
    solution:'SELECT era, COUNT(*) AS n, ROUND(AVG(reign_end - reign_start),1) AS avg_len FROM pharaohs GROUP BY era ORDER BY avg_len DESC;',
    orderMatters:true,
    didYouKnow:'You can aggregate an expression, not just a column — AVG(reign_end − reign_start) averages a computed length. (SQLite docs)' },

  // ---- Joins ----
  { id:'jn-1', sector:'History', topic:'Joins', difficulty:'Medium',
    title:'Every monument’s era',
    statement:'Return each monument and the era of the pharaoh who built it. Return columns name and era, ordered by monument name.',
    givens:'monuments(name, builder, …) joins pharaohs(name, era) where monuments.builder = pharaohs.name. Alias the tables (m, p).',
    starter:'SELECT m.name, p.era\nFROM monuments m\nJOIN pharaohs p ON m.builder = p.name\nORDER BY m.name;',
    solution:'SELECT m.name, p.era FROM monuments m JOIN pharaohs p ON m.builder = p.name ORDER BY m.name;',
    orderMatters:true,
    didYouKnow:'A JOIN stitches two tables together on a matching key — the single most important idea in relational databases. (SQLite docs)' },

  { id:'jn-2', sector:'History', topic:'Joins', difficulty:'Medium',
    title:'Heritage meets population',
    statement:'For UNESCO sites in a governorate we have population for, return the site and that governorate’s population_millions, most populous first.',
    givens:'unesco_sites(site, governorate) joins governorates(name, population_millions) on governorate = name. An inner JOIN keeps only matches.',
    starter:'SELECT u.site, g.population_millions\nFROM unesco_sites u\nJOIN governorates g ON u.governorate = g.name\nORDER BY g.population_millions DESC;',
    solution:'SELECT u.site, g.population_millions FROM unesco_sites u JOIN governorates g ON u.governorate = g.name ORDER BY g.population_millions DESC;',
    orderMatters:true,
    didYouKnow:'An inner join returns only rows that match on both sides — sites in governorates outside our slice simply drop out. (SQLite docs)' },

  { id:'jn-3', sector:'History', topic:'Joins', difficulty:'Medium',
    title:'Keep every site (LEFT JOIN)',
    statement:'Return every UNESCO site and its governorate’s population_millions — or NULL when we have no population row for that governorate. Order by site name.',
    givens:'unesco_sites LEFT JOIN governorates on governorate = name. A LEFT JOIN keeps all left-side rows, filling NULLs where there is no match.',
    starter:'SELECT u.site, g.population_millions\nFROM unesco_sites u\nLEFT JOIN governorates g ON u.governorate = g.name\nORDER BY u.site;',
    solution:'SELECT u.site, g.population_millions FROM unesco_sites u LEFT JOIN governorates g ON u.governorate = g.name ORDER BY u.site;',
    orderMatters:true,
    didYouKnow:'The difference between JOIN and LEFT JOIN is whether unmatched left-side rows survive — a classic source of “missing data” bugs. (SQLite docs)' },

  { id:'jn-4', sector:'Demographics', topic:'Joins', difficulty:'Hard',
    title:'Governorates with no listed site (anti-join)',
    statement:'Return the name of every governorate that has NO UNESCO site in our data, alphabetically.',
    givens:'LEFT JOIN governorates → unesco_sites on name = governorate, then keep only rows WHERE the site is NULL. This “anti-join” finds the gaps.',
    starter:'SELECT g.name\nFROM governorates g\nLEFT JOIN unesco_sites u ON g.name = u.governorate\nWHERE u.site IS NULL\nORDER BY g.name;',
    solution:'SELECT g.name FROM governorates g LEFT JOIN unesco_sites u ON g.name = u.governorate WHERE u.site IS NULL ORDER BY g.name;',
    orderMatters:true,
    didYouKnow:'The LEFT-JOIN-then-IS-NULL pattern is the standard way to ask “what’s missing?” — finding the absence of a match. (SQLite docs)' },

  { id:'jn-5', sector:'History', topic:'Joins', difficulty:'Hard',
    title:'Who built the most (join + group)',
    statement:'For each pharaoh who built at least one monument, return the pharaoh name, their era, and how many monuments they built as monuments, most first (ties by name).',
    givens:'pharaohs JOIN monuments on pharaohs.name = monuments.builder, then GROUP BY the pharaoh. Combine a join with aggregation.',
    starter:'SELECT p.name, p.era, COUNT(m.name) AS monuments\nFROM pharaohs p\nJOIN monuments m ON m.builder = p.name\nGROUP BY p.name, p.era\nORDER BY monuments DESC, p.name;',
    solution:'SELECT p.name, p.era, COUNT(m.name) AS monuments FROM pharaohs p JOIN monuments m ON m.builder = p.name GROUP BY p.name, p.era ORDER BY monuments DESC, p.name;',
    orderMatters:true,
    didYouKnow:'Ramesses II was ancient Egypt’s greatest builder — the Ramesseum and Abu Simbel are only the most famous of his monuments. (Britannica)' },

  { id:'jn-6', sector:'History', topic:'Joins', difficulty:'Medium',
    title:'New Kingdom monuments only',
    statement:'Return the names of monuments built by a pharaoh from the New Kingdom era, alphabetically.',
    givens:'monuments JOIN pharaohs on builder = name, then filter WHERE the pharaoh’s era = ‘New Kingdom’.',
    starter:"SELECT m.name\nFROM monuments m\nJOIN pharaohs p ON m.builder = p.name\nWHERE p.era = 'New Kingdom'\nORDER BY m.name;",
    solution:"SELECT m.name FROM monuments m JOIN pharaohs p ON m.builder = p.name WHERE p.era = 'New Kingdom' ORDER BY m.name;",
    orderMatters:true,
    didYouKnow:'The New Kingdom (Dyn. XVIII–XX) was Egypt at its imperial height — the era of Hatshepsut, Tutankhamun and Ramesses II. (Oxford History of Ancient Egypt)' },

  // ---- Subqueries & CTEs ----
  { id:'sub-1', sector:'History', topic:'Subqueries & CTEs', difficulty:'Medium',
    title:'Longer than average',
    statement:'Return the names of pharaohs whose reign length was longer than the average reign length across all pharaohs, alphabetically.',
    givens:'pharaohs(name, reign_start, reign_end). Compare (reign_end − reign_start) to a scalar subquery: (SELECT AVG(reign_end − reign_start) FROM pharaohs).',
    starter:'SELECT name\nFROM pharaohs\nWHERE (reign_end - reign_start) > (SELECT AVG(reign_end - reign_start) FROM pharaohs)\nORDER BY name;',
    solution:'SELECT name FROM pharaohs WHERE (reign_end - reign_start) > (SELECT AVG(reign_end - reign_start) FROM pharaohs) ORDER BY name;',
    orderMatters:true,
    didYouKnow:'A scalar subquery returns one value you can compare against — here, the table’s own average. (SQLite docs)' },

  { id:'sub-2', sector:'Agriculture', topic:'Subqueries & CTEs', difficulty:'Hard',
    title:'Above-average harvest years (CTE)',
    statement:'Using a CTE that totals million_tonnes per year, return the year and total (2 decimals) for years whose total is above the average yearly total, oldest first.',
    givens:'Build WITH yr AS (SELECT year, SUM(million_tonnes) AS t FROM crops GROUP BY year), then filter yr WHERE t > (SELECT AVG(t) FROM yr).',
    starter:'WITH yr AS (\n  SELECT year, SUM(million_tonnes) AS t FROM crops GROUP BY year\n)\nSELECT year, ROUND(t, 2) AS total\nFROM yr\nWHERE t > (SELECT AVG(t) FROM yr)\nORDER BY year;',
    solution:'WITH yr AS (SELECT year, SUM(million_tonnes) AS t FROM crops GROUP BY year) SELECT year, ROUND(t,2) AS total FROM yr WHERE t > (SELECT AVG(t) FROM yr) ORDER BY year;',
    orderMatters:true,
    didYouKnow:'A CTE (WITH …) names a temporary result so the rest of the query can read cleanly — the readable alternative to nested subqueries. (SQLite docs)' },

  { id:'sub-3', sector:'History', topic:'Subqueries & CTEs', difficulty:'Medium',
    title:'Pharaohs who built something (IN)',
    statement:'Return the names of pharaohs who appear as the builder of at least one monument, alphabetically.',
    givens:'pharaohs WHERE name IN (SELECT builder FROM monuments). A subquery can feed an IN list.',
    starter:'SELECT name\nFROM pharaohs\nWHERE name IN (SELECT builder FROM monuments)\nORDER BY name;',
    solution:'SELECT name FROM pharaohs WHERE name IN (SELECT builder FROM monuments) ORDER BY name;',
    orderMatters:true,
    didYouKnow:'IN (SELECT …) is a set-membership test — “is this name anywhere in that list?”. (SQLite docs)' },

  { id:'sub-4', sector:'Agriculture', topic:'Subqueries & CTEs', difficulty:'Hard',
    title:'Each crop’s best year (correlated)',
    statement:'For each crop, return the crop and the year in which it hit its highest million_tonnes, ordered by crop.',
    givens:'A correlated subquery: match million_tonnes to (SELECT MAX(million_tonnes) FROM crops c2 WHERE c2.crop = c.crop). The inner query re-runs per outer row.',
    starter:'SELECT crop, year\nFROM crops c\nWHERE million_tonnes = (\n  SELECT MAX(million_tonnes) FROM crops c2 WHERE c2.crop = c.crop\n)\nORDER BY crop;',
    solution:'SELECT crop, year FROM crops c WHERE million_tonnes = (SELECT MAX(million_tonnes) FROM crops c2 WHERE c2.crop = c.crop) ORDER BY crop;',
    orderMatters:true,
    didYouKnow:'A correlated subquery references the outer row — powerful, but it conceptually runs once per row, so mind the cost on big tables. (SQLite docs)' },

  { id:'sub-5', sector:'Education', topic:'Subqueries & CTEs', difficulty:'Medium',
    title:'The top university city (CTE)',
    statement:'Using a CTE of university counts per city, return the single city with the most universities, with its count n. Break ties alphabetically.',
    givens:'WITH cc AS (SELECT city, COUNT(*) AS n FROM universities GROUP BY city) then ORDER BY n DESC, city LIMIT 1.',
    starter:'WITH cc AS (\n  SELECT city, COUNT(*) AS n FROM universities GROUP BY city\n)\nSELECT city, n\nFROM cc\nORDER BY n DESC, city\nLIMIT 1;',
    solution:'WITH cc AS (SELECT city, COUNT(*) AS n FROM universities GROUP BY city) SELECT city, n FROM cc ORDER BY n DESC, city LIMIT 1;',
    orderMatters:false,
    didYouKnow:'Cairo concentrates a large share of Egypt’s top universities — Cairo University, AUC, Ain Shams and Al-Azhar all sit in the capital. (QS 2026)' },

  { id:'sub-6', sector:'Agriculture', topic:'Subqueries & CTEs', difficulty:'Hard',
    title:'Average of yearly totals (subquery in FROM)',
    statement:'Return one number, avg_total (2 decimals): the average across years of each year’s total crop output.',
    givens:'Aggregate a derived table: SELECT AVG(t) FROM (SELECT year, SUM(million_tonnes) AS t FROM crops GROUP BY year). This is “aggregate an aggregate”.',
    starter:'SELECT ROUND(AVG(t), 2) AS avg_total\nFROM (\n  SELECT year, SUM(million_tonnes) AS t FROM crops GROUP BY year\n);',
    solution:'SELECT ROUND(AVG(t),2) AS avg_total FROM (SELECT year, SUM(million_tonnes) AS t FROM crops GROUP BY year);',
    orderMatters:false,
    didYouKnow:'A subquery in the FROM clause is just a table you built on the fly — you can query it like any other. (SQLite docs)' },

  // ---- Window functions ----
  { id:'win-1', sector:'History', topic:'Window functions', difficulty:'Medium',
    title:'Rank the longest reigns',
    statement:'Return the top 5 pharaohs by reign length: name, the length as len, and a RANK() as rnk (1 = longest). Order by rnk.',
    givens:'pharaohs(name, reign_start, reign_end). RANK() OVER (ORDER BY (reign_end − reign_start) DESC). A window function ranks without collapsing rows.',
    starter:'SELECT name, (reign_end - reign_start) AS len,\n       RANK() OVER (ORDER BY (reign_end - reign_start) DESC) AS rnk\nFROM pharaohs\nORDER BY rnk\nLIMIT 5;',
    solution:'SELECT name, (reign_end - reign_start) AS len, RANK() OVER (ORDER BY (reign_end - reign_start) DESC) AS rnk FROM pharaohs ORDER BY rnk LIMIT 5;',
    orderMatters:true,
    didYouKnow:'Pepi II is traditionally credited with ~94 years on the throne — possibly the longest reign in history, though some scholars argue for ~64. (Turin King List)' },

  { id:'win-2', sector:'Demographics', topic:'Window functions', difficulty:'Hard',
    title:'Population growth per period',
    statement:'For each row in population_years, return year, population, and the change from the previous listed year as growth (this minus previous). Oldest first; the first row’s growth is NULL.',
    givens:'Use population − LAG(population) OVER (ORDER BY year). LAG reaches back one row.',
    starter:'SELECT year, population,\n       population - LAG(population) OVER (ORDER BY year) AS growth\nFROM population_years\nORDER BY year;',
    solution:'SELECT year, population, population - LAG(population) OVER (ORDER BY year) AS growth FROM population_years ORDER BY year;',
    orderMatters:true,
    didYouKnow:'LAG/LEAD let a row peek at its neighbours — the foundation of every “change since last period” metric. (SQLite docs)' },

  { id:'win-3', sector:'Economy', topic:'Window functions', difficulty:'Hard',
    title:'Year-on-year inflation swing',
    statement:'For each year, return year, rate_pct, and the change in the rate from the previous year as delta (1 decimal), oldest first.',
    givens:'inflation(year, rate_pct). Use rate_pct − LAG(rate_pct) OVER (ORDER BY year), wrapped in ROUND(…, 1).',
    starter:'SELECT year, rate_pct,\n       ROUND(rate_pct - LAG(rate_pct) OVER (ORDER BY year), 1) AS delta\nFROM inflation\nORDER BY year;',
    solution:'SELECT year, rate_pct, ROUND(rate_pct - LAG(rate_pct) OVER (ORDER BY year),1) AS delta FROM inflation ORDER BY year;',
    orderMatters:true,
    didYouKnow:'Inflation jumped from ~5% in 2021 to ~34% by 2023 — the delta column makes that shock jump off the page. (World Bank / CBE)' },

  { id:'win-4', sector:'Agriculture', topic:'Window functions', difficulty:'Hard',
    title:'Latest year per crop (ROW_NUMBER + PARTITION)',
    statement:'For each crop, number its rows from the most recent year (rn = 1) to oldest, using a partitioned window. Return crop, year, million_tonnes and rn, ordered by crop then rn.',
    givens:'ROW_NUMBER() OVER (PARTITION BY crop ORDER BY year DESC). PARTITION BY restarts the numbering per crop.',
    starter:'SELECT crop, year, million_tonnes,\n       ROW_NUMBER() OVER (PARTITION BY crop ORDER BY year DESC) AS rn\nFROM crops\nORDER BY crop, rn;',
    solution:'SELECT crop, year, million_tonnes, ROW_NUMBER() OVER (PARTITION BY crop ORDER BY year DESC) AS rn FROM crops ORDER BY crop, rn;',
    orderMatters:true,
    didYouKnow:'PARTITION BY is “GROUP BY that keeps the rows” — you get a number per group without collapsing the detail. (SQLite docs)' },

  { id:'win-5', sector:'Agriculture', topic:'Window functions', difficulty:'Hard',
    title:'Cumulative wheat (running total)',
    statement:'For wheat only, return each year, its million_tonnes, and the running cumulative total up to and including that year as cumulative (2 decimals), oldest first.',
    givens:'SUM(million_tonnes) OVER (ORDER BY year) accumulates as the window slides forward. Filter WHERE crop = ‘Wheat’.',
    starter:"SELECT year, million_tonnes,\n       ROUND(SUM(million_tonnes) OVER (ORDER BY year), 2) AS cumulative\nFROM crops\nWHERE crop = 'Wheat'\nORDER BY year;",
    solution:"SELECT year, million_tonnes, ROUND(SUM(million_tonnes) OVER (ORDER BY year),2) AS cumulative FROM crops WHERE crop = 'Wheat' ORDER BY year;",
    orderMatters:true,
    didYouKnow:'A running total is just SUM() with an ORDER BY inside the window — no self-join required. (SQLite docs)' },

  { id:'win-6', sector:'Economy', topic:'Window functions', difficulty:'Hard',
    title:'The pound’s yearly slide (% change)',
    statement:'For each year, return year, egp_per_usd, and the percent change from the previous year as pct (1 decimal), oldest first.',
    givens:'(rate − LAG(rate)) × 100.0 / LAG(rate) OVER (ORDER BY year). Use 100.0 (not 100) to force real division.',
    starter:'SELECT year, egp_per_usd,\n       ROUND((egp_per_usd - LAG(egp_per_usd) OVER (ORDER BY year)) * 100.0\n             / LAG(egp_per_usd) OVER (ORDER BY year), 1) AS pct\nFROM exchange_rate\nORDER BY year;',
    solution:'SELECT year, egp_per_usd, ROUND((egp_per_usd - LAG(egp_per_usd) OVER (ORDER BY year)) * 100.0 / LAG(egp_per_usd) OVER (ORDER BY year),1) AS pct FROM exchange_rate ORDER BY year;',
    orderMatters:true,
    didYouKnow:'2016 and 2022–24 stand out as the big devaluation jumps — the percent-change column turns raw rates into a story. (CBE, approximate)' },

  // ---- Dates & time (signed years / age arithmetic) ----
  { id:'dt-1', sector:'History', topic:'Dates & time', difficulty:'Easy',
    title:'How long did they reign?',
    statement:'Return the 5 longest-reigning pharaohs: name and years reigned (reign_end − reign_start) as years, longest first.',
    givens:'pharaohs(name, reign_start, reign_end). Years are signed integers (negative = BCE), so the subtraction gives a positive length.',
    starter:'SELECT name, reign_end - reign_start AS years\nFROM pharaohs\nORDER BY years DESC\nLIMIT 5;',
    solution:'SELECT name, reign_end - reign_start AS years FROM pharaohs ORDER BY years DESC LIMIT 5;',
    orderMatters:true,
    didYouKnow:'Storing years as signed integers (BCE negative) makes date maths just… subtraction — no calendar library needed. (project convention)' },

  { id:'dt-2', sector:'Art & Cinema', topic:'Dates & time', difficulty:'Medium',
    title:'A lifetime in years',
    statement:'For cultural figures whose death year is known, return name and age at death (death_year − birth_year) as age, oldest age first, top 5.',
    givens:'cultural_figures(name, birth_year, death_year). Exclude living/unknown with WHERE death_year IS NOT NULL.',
    starter:'SELECT name, death_year - birth_year AS age\nFROM cultural_figures\nWHERE death_year IS NOT NULL\nORDER BY age DESC\nLIMIT 5;',
    solution:'SELECT name, death_year - birth_year AS age FROM cultural_figures WHERE death_year IS NOT NULL ORDER BY age DESC LIMIT 5;',
    orderMatters:true,
    didYouKnow:'Some birth/death dates for Golden-Age stars like Umm Kulthum are genuinely disputed — the knowledge base flags those rather than picking a side. (Wikipedia)' },

  { id:'dt-3', sector:'Education', topic:'Dates & time', difficulty:'Medium',
    title:'Century-old institutions',
    statement:'Return the name and age (2026 − founded) of every university more than 100 years old, oldest first.',
    givens:'universities(name, founded). Compute 2026 − founded and filter WHERE it is greater than 100.',
    starter:'SELECT name, 2026 - founded AS age\nFROM universities\nWHERE 2026 - founded > 100\nORDER BY age DESC;',
    solution:'SELECT name, 2026 - founded AS age FROM universities WHERE 2026 - founded > 100 ORDER BY age DESC;',
    orderMatters:true,
    didYouKnow:'Al-Azhar has taught since 970 CE — over a thousand years — making it one of the oldest continuously operating universities on Earth. (Britannica)' },

  { id:'dt-4', sector:'History', topic:'Dates & time', difficulty:'Medium',
    title:'Years on the World Heritage list',
    statement:'For each UNESCO site, return the site and how many years it has been listed (2026 − year_inscribed) as years_listed, longest-listed first (ties by site name).',
    givens:'unesco_sites(site, year_inscribed). Simple year arithmetic.',
    starter:'SELECT site, 2026 - year_inscribed AS years_listed\nFROM unesco_sites\nORDER BY years_listed DESC, site;',
    solution:'SELECT site, 2026 - year_inscribed AS years_listed FROM unesco_sites ORDER BY years_listed DESC, site;',
    orderMatters:true,
    didYouKnow:'Six of Egypt’s seven sites were inscribed in a single year, 1979 — a landmark moment for the young World Heritage list. (UNESCO)' },

  // ---- Text & CASE (strings, CASE, COALESCE) ----
  { id:'txt-1', sector:'Education', topic:'Text & CASE', difficulty:'Easy',
    title:'Names containing a word (LIKE)',
    statement:'Return the name of every university whose name contains the word “University”, alphabetically.',
    givens:'Use WHERE name LIKE ‘%University%’. The % wildcard matches any run of characters.',
    starter:"SELECT name\nFROM universities\nWHERE name LIKE '%University%'\nORDER BY name;",
    solution:"SELECT name FROM universities WHERE name LIKE '%University%' ORDER BY name;",
    orderMatters:true,
    didYouKnow:'LIKE with % is pattern matching; use it for “contains”, “starts with” (‘abc%’) and “ends with” (‘%abc’). (SQLite docs)' },

  { id:'txt-2', sector:'History', topic:'Text & CASE', difficulty:'Easy',
    title:'Pharaohs starting with R',
    statement:'Return the names of pharaohs whose name starts with the letter R, alphabetically.',
    givens:'WHERE name LIKE ‘R%’.',
    starter:"SELECT name\nFROM pharaohs\nWHERE name LIKE 'R%'\nORDER BY name;",
    solution:"SELECT name FROM pharaohs WHERE name LIKE 'R%' ORDER BY name;",
    orderMatters:true,
    didYouKnow:'Three kings named Ramesses appear here — the name means “Ra has fashioned him”. (Britannica)' },

  { id:'txt-3', sector:'Demographics', topic:'Text & CASE', difficulty:'Medium',
    title:'Longest governorate names (LENGTH)',
    statement:'Return the 5 governorates with the longest names: name and its LENGTH as len, longest first (ties by name).',
    givens:'Use the LENGTH(name) function.',
    starter:'SELECT name, LENGTH(name) AS len\nFROM governorates\nORDER BY len DESC, name\nLIMIT 5;',
    solution:'SELECT name, LENGTH(name) AS len FROM governorates ORDER BY len DESC, name LIMIT 5;',
    orderMatters:true,
    didYouKnow:'String functions like LENGTH, UPPER, LOWER, SUBSTR and TRIM are everyday tools for cleaning messy text data. (SQLite docs)' },

  { id:'txt-4', sector:'Economy', topic:'Text & CASE', difficulty:'Medium',
    title:'Label the inflation years (CASE)',
    statement:'For each year, return year, rate_pct, and a band: ‘Low’ if under 10, ‘Moderate’ if under 25, otherwise ‘High’. Oldest year first.',
    givens:'Use a CASE WHEN … THEN … expression. The first matching branch wins.',
    starter:"SELECT year, rate_pct,\n       CASE WHEN rate_pct < 10 THEN 'Low'\n            WHEN rate_pct < 25 THEN 'Moderate'\n            ELSE 'High' END AS band\nFROM inflation\nORDER BY year;",
    solution:"SELECT year, rate_pct, CASE WHEN rate_pct < 10 THEN 'Low' WHEN rate_pct < 25 THEN 'Moderate' ELSE 'High' END AS band FROM inflation ORDER BY year;",
    orderMatters:true,
    didYouKnow:'CASE is SQL’s if/else — it turns raw numbers into human-readable categories right in the query. (SQLite docs)' },

  { id:'txt-5', sector:'Business', topic:'Text & CASE', difficulty:'Medium',
    title:'Fill the blanks (COALESCE)',
    statement:'Return every businessman and their net worth, but show 0 where the net worth is NULL. Columns: name and worth, richest first.',
    givens:'businessmen(name, net_worth_usd_bn). Use COALESCE(net_worth_usd_bn, 0) to substitute 0 for NULL.',
    starter:'SELECT name, COALESCE(net_worth_usd_bn, 0) AS worth\nFROM businessmen\nORDER BY worth DESC;',
    solution:'SELECT name, COALESCE(net_worth_usd_bn, 0) AS worth FROM businessmen ORDER BY worth DESC;',
    orderMatters:true,
    didYouKnow:'COALESCE returns the first non-NULL of its arguments — the clean way to supply a default for missing data. (SQLite docs)' },

  // ---- Set operations ----
  { id:'set-1', sector:'Demographics', topic:'Set operations', difficulty:'Medium',
    title:'All the places (UNION)',
    statement:'Return one combined, de-duplicated, alphabetical list of place names: every university city and every governorate name, in a single column named place.',
    givens:'SELECT city FROM universities UNION SELECT name FROM governorates. UNION stacks two result sets and removes duplicates.',
    starter:'SELECT city AS place FROM universities\nUNION\nSELECT name FROM governorates\nORDER BY place;',
    solution:'SELECT city AS place FROM universities UNION SELECT name FROM governorates ORDER BY place;',
    orderMatters:true,
    didYouKnow:'UNION removes duplicates; UNION ALL keeps them (and is faster). Pick based on whether duplicates matter. (SQLite docs)' },

  { id:'set-2', sector:'Education', topic:'Set operations', difficulty:'Medium',
    title:'Cities that are both (INTERSECT)',
    statement:'Return the cities that are BOTH a university city AND a governorate name in our data, alphabetically.',
    givens:'SELECT city FROM universities INTERSECT SELECT name FROM governorates. INTERSECT keeps only rows present in both sets.',
    starter:'SELECT city FROM universities\nINTERSECT\nSELECT name FROM governorates\nORDER BY city;',
    solution:'SELECT city FROM universities INTERSECT SELECT name FROM governorates ORDER BY city;',
    orderMatters:true,
    didYouKnow:'INTERSECT is set algebra in SQL — the overlap of two lists, no join required. (SQLite docs)' },

  { id:'set-3', sector:'Demographics', topic:'Set operations', difficulty:'Hard',
    title:'Governorates without a university (EXCEPT)',
    statement:'Return the governorate names that are NOT a university city in our data, alphabetically.',
    givens:'SELECT name FROM governorates EXCEPT SELECT city FROM universities. EXCEPT subtracts the second set from the first.',
    starter:'SELECT name FROM governorates\nEXCEPT\nSELECT city FROM universities\nORDER BY name;',
    solution:'SELECT name FROM governorates EXCEPT SELECT city FROM universities ORDER BY name;',
    orderMatters:true,
    didYouKnow:'EXCEPT (called MINUS in some databases) answers “in A but not in B” — a clean alternative to an anti-join for single columns. (SQLite docs)' },

  { id:'set-4', sector:'Economy', topic:'Set operations', difficulty:'Medium',
    title:'Every year we have data for',
    statement:'Return a single de-duplicated, sorted list of every year that appears in either the inflation table or the crops table, in a column named year.',
    givens:'SELECT year FROM inflation UNION SELECT year FROM crops.',
    starter:'SELECT year FROM inflation\nUNION\nSELECT year FROM crops\nORDER BY year;',
    solution:'SELECT year FROM inflation UNION SELECT year FROM crops ORDER BY year;',
    orderMatters:true,
    didYouKnow:'UNION lets you pool a dimension (here, years) from tables that don’t otherwise join — handy for building a complete axis. (SQLite docs)' },
];

/* EGYBI_TABLE_DOCS — plain-language documentation for every sandbox table.
   The Practice page auto-renders the docs for whichever tables a challenge's
   query touches, so learners always see exactly what they're querying: what one
   row means, each column, units, the signed-year convention, NULL meanings, and
   a real sample row. Keyed by table name. */
window.EGYBI_TABLE_DOCS = {
  pharaohs: {
    row: 'one ancient Egyptian ruler',
    desc: '26 pharaohs from Narmer (~3100 BCE) to Cleopatra VII. Reign years are SIGNED integers — negative = BCE — so reign_end − reign_start is a positive length.',
    columns: [['name','ruler name'],['dynasty','dynasty number (Roman numerals, e.g. XVIII)'],['reign_start','reign began (signed year, − = BCE)'],['reign_end','reign ended (signed year)'],['era','Old Kingdom / Middle Kingdom / New Kingdom / …']],
    sample: "('Ramesses II','XIX',-1279,-1213,'New Kingdom')"
  },
  monuments: {
    row: 'one monument and who built it',
    desc: 'Major monuments with construction windows (signed years) and the pharaoh who built them. builder matches a pharaohs.name, so the two tables JOIN on that.',
    columns: [['name','monument name'],['builder','pharaoh who built it (→ pharaohs.name)'],['location','where it stands'],['construction_start','build began (signed year)'],['construction_end','build finished (signed year)']],
    sample: "('Abu Simbel','Ramesses II','Aswan',-1264,-1244)"
  },
  tourism: {
    row: 'one year of tourism',
    desc: 'Arrivals and revenue by year, 2019–2025. Some cells are NULL where sources genuinely disagree (e.g. 2021 revenue) — use IS NULL / IS NOT NULL, never = NULL.',
    columns: [['year','calendar year'],['arrivals_millions','international arrivals, in millions (may be NULL)'],['revenue_usd_bn','tourism revenue, US$ billions (may be NULL)']],
    sample: '(2025, 19.0, 16.7)'
  },
  suez: {
    row: 'one year of Suez Canal revenue',
    desc: 'Suez Canal revenue by year (US$ billions). 2022 is intentionally omitted to keep a clean calendar-year comparison; 2024 shows the Red Sea-crisis collapse.',
    columns: [['year','calendar year'],['revenue_usd_bn','canal revenue, US$ billions'],['note','a short flag such as "record" or the crisis reason (may be NULL)']],
    sample: "(2024, 3.99, 'Red Sea shipping crisis')"
  },
  governorates: {
    row: 'one of Egypt’s 27 governorates',
    desc: 'All 27 governorates with population (CAPMAS, Nov 2023) and area. This is the table behind the choropleth map on the Explore page.',
    columns: [['name','governorate name'],['population_millions','population in millions'],['area_km2','area in square kilometres']],
    sample: "('Cairo', 10.46, 3085)"
  },
  indicators: {
    row: 'one (indicator, year) data point',
    desc: 'A long/tall time-series table: many indicators stacked, one row per year. Filter by name to isolate a single series (e.g. name = \'GDP (current US$)\').',
    columns: [['category','economy / development'],['name','the indicator, e.g. "GDP (current US$)"'],['year','the year'],['value','the numeric value'],['unit','the unit, e.g. "USD billion"']],
    sample: "('economy','GDP (current US$)',2024, 389.06,'USD billion')"
  },
  exports: {
    row: 'one export category',
    desc: 'Egypt’s top goods-export categories (2023) with value and share of total exports.',
    columns: [['category','export category'],['value_usd_bn','value, US$ billions'],['pct_of_total','share of total exports, %']],
    sample: "('Petroleum & electricity', 13.6, 32.9)"
  },
  athletes: {
    row: 'one notable athlete',
    desc: 'Egyptian athletes across sports (football, squash, karate, pentathlon, wrestling), each with a headline achievement. Filter by sport to focus a discipline.',
    columns: [['name','athlete'],['sport','their sport'],['birth_year','year of birth'],['achievement','headline achievement']],
    sample: "('Nour El Sherbini','Squash',1995,'World No. 1; 8 World titles')"
  },
  sports_titles: {
    row: 'one team/nation title tally',
    desc: 'Title counts across different competitions. Because the competitions differ, compare within a competition, not across — one row (Olympics) is a medal count, not titles.',
    columns: [['holder','team or nation'],['competition','the competition'],['titles','number of titles/medals']],
    sample: "('Al Ahly','CAF Champions League',12)"
  },
  satellites: {
    row: 'one Egyptian satellite',
    desc: 'Egypt’s satellites, 2007–2024, with launch year, purpose and the international partner that built/launched them.',
    columns: [['name','satellite name'],['launch_year','year launched'],['purpose','Earth observation / Communications / …'],['partner','partner country']],
    sample: "('Nilesat 301',2022,'Communications','France')"
  },
  companies: {
    row: 'one large Egyptian company',
    desc: 'Ten of Egypt’s largest/oldest companies by founding year and sector — handy for date arithmetic (company age = a year − founded_year).',
    columns: [['name','company'],['sector','industry'],['founded_year','year founded']],
    sample: "('National Bank of Egypt','Banking',1898)"
  },
  investment_deals: {
    row: 'one landmark deal',
    desc: 'Major investment and IMF deals by value and category (FDI / IMF / free-zone / privatization). Values are headline US$ billions.',
    columns: [['name','the deal'],['year','year'],['value_usd_bn','headline value, US$ billions'],['category','FDI / IMF / free-zone / privatization']],
    sample: "('Ras El Hekma megacity',2024, 35.0,'FDI')"
  },
  cultural_figures: {
    row: 'one cultural icon',
    desc: 'Cinema, music and art figures. death_year is NULL for those still living — the classic case where IS NULL matters.',
    columns: [['name','the figure'],['domain','cinema / music / art'],['birth_year','year of birth'],['death_year','year of death, or NULL if still living']],
    sample: "('Umm Kulthum','music',1898,1975)"
  },
  water_use: {
    row: 'one water-use sector',
    desc: 'How Egypt’s water is split across three sectors (shares add to 100%). Small but perfect for ORDER BY and simple aggregation.',
    columns: [['sector','Agriculture / Municipal / Industrial'],['share_pct','share of national water use, %']],
    sample: "('Agriculture', 86.0)"
  }
};
