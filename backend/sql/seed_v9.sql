-- ============================================================================
-- EgyBI — Egypt Knowledge Base — seed_v9.sql
-- ============================================================================
-- Ninth enrichment pass: history & heritage depth — surviving ancient Egyptian
-- obelisks and where they stand today, landmark archaeological discoveries,
-- major temples by principal deity, and royal women who held real power.
-- Import order: seed -> v2 -> v3 -> v4 -> v5 -> v6 -> v7 -> v8 -> v9 -> (seed_auto)
--
-- Sourcing rules kept from earlier passes: every row carries a source_url, and
-- where Egyptologists genuinely disagree (attribution, chronology, who found
-- what first) the dispute is stated in certainty_note rather than smoothed away.
-- Ancient dates are signed integers: negative = BCE, matching `pharaohs`.
-- Chronology note: this file follows the conventional modern (Shaw/Baines)
-- chronology already used by `pharaohs`; older popular sources sometimes run
-- New Kingdom reigns ~10 years earlier, which is flagged per-row where relevant.
-- ============================================================================

-- Surviving ancient Egyptian obelisks and their present locations ------------
-- Source: the consolidated list at https://en.wikipedia.org/wiki/Egyptian_obelisks
INSERT INTO obelisks (name, pharaoh, original_site, current_city, current_country, height_m, year_moved, source_url, certainty_note) VALUES
('Unfinished Obelisk','Hatshepsut','Aswan quarry','Aswan','Egypt',41.75,NULL,'https://en.wikipedia.org/wiki/Egyptian_obelisks','Never completed — abandoned in the granite quarry after cracking; still attached to bedrock. Would have been the largest ever raised.'),
('Lateran Obelisk','Thutmose III / Thutmose IV','Karnak','Rome','Italy',32.18,NULL,'https://en.wikipedia.org/wiki/Egyptian_obelisks','Tallest standing ancient Egyptian obelisk anywhere. Begun under Thutmose III, erected under Thutmose IV.'),
('Unfinished Obelisk (Akoris)','Ptolemaic (unattributed)','Akoris','Akoris','Egypt',32.00,NULL,'https://en.wikipedia.org/wiki/Egyptian_obelisks','Attributed to the Ptolemaic period; individual ruler not established.'),
('Karnak Obelisk of Hatshepsut','Hatshepsut','Karnak','Luxor','Egypt',29.56,NULL,'https://en.wikipedia.org/wiki/Egyptian_obelisks','Tallest obelisk still standing in Egypt.'),
('Vatican Obelisk','Unknown','Alexandria','Vatican City','Vatican City',25.50,NULL,'https://en.wikipedia.org/wiki/Egyptian_obelisks','Original commissioning pharaoh unknown — it carries no pharaonic inscription.'),
('Luxor Obelisk (in situ)','Ramesses II','Luxor Temple','Luxor','Egypt',25.03,NULL,'https://en.wikipedia.org/wiki/Egyptian_obelisks','The surviving half of a pair; its twin now stands in Paris.'),
('Luxor Obelisk (Paris)','Ramesses II','Luxor Temple','Paris','France',22.83,1833,'https://en.wikipedia.org/wiki/Egyptian_obelisks','Shipped 1833; sources differ on the milestone year — commonly also given as erected at Place de la Concorde in 1836.'),
('Flaminio Obelisk','Seti I / Ramesses II','Heliopolis','Rome','Italy',24.00,NULL,'https://en.wikipedia.org/wiki/Egyptian_obelisks','Begun under Seti I and finished under his son Ramesses II — attribution is shared.'),
('Obelisk of Montecitorio','Psamtik II','Heliopolis','Rome','Italy',21.79,NULL,'https://en.wikipedia.org/wiki/Egyptian_obelisks','Used as the gnomon of a sundial in Roman Rome.'),
('Karnak Obelisk of Thutmose I','Thutmose I','Karnak','Luxor','Egypt',21.20,NULL,'https://en.wikipedia.org/wiki/Egyptian_obelisks',NULL),
('Cleopatra''s Needle (London)','Thutmose III','Heliopolis','London','United Kingdom',21.00,1878,'https://en.wikipedia.org/wiki/Egyptian_obelisks','Despite the name it predates Cleopatra VII by roughly 1,400 years.'),
('Cleopatra''s Needle (New York)','Thutmose III','Heliopolis','New York','United States',21.00,1881,'https://en.wikipedia.org/wiki/Egyptian_obelisks','Twin of the London needle; the name is a modern misnomer.'),
('Unfinished Obelisk (Minya)','Ptolemaic (unattributed)','New Minya','Minya','Egypt',21.00,NULL,'https://en.wikipedia.org/wiki/Egyptian_obelisks','Ptolemaic period; individual ruler not established.'),
('Al-Masalla Obelisk','Senusret I','Heliopolis','Cairo','Egypt',20.40,NULL,'https://en.wikipedia.org/wiki/Egyptian_obelisks','The oldest obelisk still standing where it was raised, at ancient Heliopolis (modern Matariya).'),
('Obelisk of Theodosius','Thutmose III','Karnak','Istanbul','Turkey',18.54,NULL,'https://en.wikipedia.org/wiki/Egyptian_obelisks','Only the upper portion survives; re-erected in the Hippodrome by Theodosius I.'),
('Tahrir Obelisk','Ramesses II','Tanis','Cairo','Egypt',17.00,2020,'https://en.wikipedia.org/wiki/Egyptian_obelisks','Moved from San al-Hagar (Tanis) and re-erected in Tahrir Square in 2020.'),
('Cairo Airport Obelisk','Ramesses II','Tanis','Cairo','Egypt',16.97,1984,'https://en.wikipedia.org/wiki/Egyptian_obelisks',NULL),
('Hanging Obelisk','Ramesses II','Tanis','Cairo','Egypt',15.50,NULL,'https://en.wikipedia.org/wiki/Egyptian_obelisks',NULL),
('Pantheon Obelisk','Ramesses II','Heliopolis','Rome','Italy',14.52,NULL,'https://en.wikipedia.org/wiki/Egyptian_obelisks',NULL),
('Gezira Obelisk','Ramesses II','Tanis','Cairo','Egypt',13.50,NULL,'https://en.wikipedia.org/wiki/Egyptian_obelisks',NULL),
('Abgig Obelisk','Senusret I','Faiyum','Faiyum','Egypt',12.70,NULL,'https://en.wikipedia.org/wiki/Egyptian_obelisks','Unusually round-topped rather than pyramidion-capped.'),
('Philae Obelisk','Ptolemy IX','Philae','Dorset','United Kingdom',6.70,1815,'https://en.wikipedia.org/wiki/Egyptian_obelisks','Its bilingual inscription helped confirm the decipherment of hieroglyphs.'),
('Boboli Obelisk','Ramesses II','Heliopolis','Florence','Italy',6.34,1790,'https://en.wikipedia.org/wiki/Egyptian_obelisks',NULL),
('Elephant and Obelisk','Apries','Sais','Rome','Italy',5.47,NULL,'https://en.wikipedia.org/wiki/Egyptian_obelisks','Mounted on Bernini''s elephant outside Santa Maria sopra Minerva.'),
('Abu Simbel Obelisks','Ramesses II','Abu Simbel','Aswan','Egypt',3.13,NULL,'https://en.wikipedia.org/wiki/Egyptian_obelisks',NULL),
('Urbino Obelisk','Apries','Sais','Urbino','Italy',3.00,NULL,'https://en.wikipedia.org/wiki/Egyptian_obelisks',NULL),
('Poznan Obelisk','Ramesses II','Athribis','Poznan','Poland',3.00,2002,'https://en.wikipedia.org/wiki/Egyptian_obelisks',NULL),
('Matteiano Obelisk','Ramesses II','Heliopolis','Rome','Italy',2.68,NULL,'https://en.wikipedia.org/wiki/Egyptian_obelisks',NULL),
('Durham Obelisk','Amenhotep II','Thebaid','Durham','United Kingdom',2.15,1838,'https://en.wikipedia.org/wiki/Egyptian_obelisks',NULL),
('Dogali Obelisk','Ramesses II','Heliopolis','Rome','Italy',2.00,NULL,'https://en.wikipedia.org/wiki/Egyptian_obelisks',NULL),
('Karnak Obelisk of Seti II','Seti II','Karnak','Luxor','Egypt',0.95,NULL,'https://en.wikipedia.org/wiki/Egyptian_obelisks',NULL),
('Luxor Museum Obelisk','Ramesses III','Karnak','Luxor','Egypt',0.95,1923,'https://en.wikipedia.org/wiki/Egyptian_obelisks',NULL),
('Obelisks of Nectanebo II','Nectanebo II','Hermopolis','London','United Kingdom',0.95,NULL,'https://en.wikipedia.org/wiki/Egyptian_obelisks','Held by the British Museum.');

-- Landmark archaeological discoveries ---------------------------------------
INSERT INTO archaeological_discoveries (name, discovery_year, discoverer, site, significance, source_url, certainty_note) VALUES
('Tomb of Tutankhamun (KV62)',1922,'Howard Carter','Valley of the Kings, Luxor','A near-intact royal burial; some 5,398 objects were catalogued from it, transforming public knowledge of New Kingdom material culture.','https://www.worldhistory.org/article/705/wonderful-things-howard-carters-discovery-of-tutan/','Found in November 1922; clearance of the tomb then took roughly a decade.'),
('Bust of Nefertiti',1912,'Ludwig Borchardt (German Oriental Society)','Tell el-Amarna','Found in the workshop of the sculptor Thutmose; became one of the most recognised faces of the ancient world.','https://www.smb.museum/en/museums-institutions/aegyptisches-museum-und-papyrussammlung/collection-research/bust-of-nefertiti/discovery-and-partage/','Excavated 6 December 1912. The legality of its removal under the partage agreement is disputed to this day; Egypt has repeatedly requested its return.'),
('Khufu Ship',1954,'Kamal el-Mallakh','Giza, beside the Great Pyramid','A full-size cedar vessel buried disassembled in a sealed pit next to Khufu''s pyramid; one of the oldest surviving planked boats.','https://www.history.com/articles/ancient-egypt-10-best-discoveries-king-tut-pyramids','Reassembled over years from more than a thousand pieces.'),
('Deir el-Bahari Royal Cache (DB320)',1881,'Emil Brugsch (Antiquities Service)','Deir el-Bahari, Luxor','A hidden cache into which priests moved dozens of royal mummies to protect them from robbers, including Seti I.','https://www.worldhistory.org/article/705/wonderful-things-howard-carters-discovery-of-tutan/','Officially cleared in 1881 — the mummy of Seti I was recovered on 6 June 1881. The tomb had been found earlier by the local Abd el-Rassul family, so "discovery" credit is genuinely contested.'),
('Royal Tombs of Tanis',1939,'Pierre Montet','Tanis (San al-Hagar)','Intact burials of Psusennes I, Amenemope and Shoshenq II with gold, silver, lapis lazuli and funerary masks — among the only undisturbed royal burials ever found.','https://en.wikipedia.org/wiki/Tanis,_Egypt','Excavated 1939-1940; the find was overshadowed almost immediately by the outbreak of the Second World War.'),
('Saqqara coffin caches',2020,'Egyptian mission, Ministry of Tourism and Antiquities','Saqqara','More than one hundred sealed, painted wooden coffins with mummies, amulets, masks and funerary statues from the Late Period, stacked in deep burial shafts.','https://www.washingtonpost.com/world/2021/04/22/tombs-saqqara-new-discoveries-are-rewriting-ancient-egypts-history/','Announced in stages during 2020; excavation at the site is ongoing, so totals reported in the press have kept rising.'),
('The Lost Golden City (Aten)',2021,'Egyptian mission led by Zahi Hawass','West bank, Luxor','A large 3,000-year-old urban settlement with mudbrick houses, streets and workshops, dated to the reign of Amenhotep III.','https://www.nationalgeographic.com/history/history-magazine/article/lost-golden-city-luxor-discovered-archaeologists-egypt','Widely described as the most significant find since Tutankhamun''s tomb; that ranking is a press characterisation, not a scholarly measure.');

-- Major temples by principal deity -------------------------------------------
INSERT INTO temples (name, site, principal_deity, built_by, period, build_start, build_end, source_url, certainty_note) VALUES
('Karnak Temple Complex','Karnak, Luxor','Amun (with Mut and Khonsu — the Theban triad)','Many rulers, cumulatively','Middle Kingdom to Ptolemaic',NULL,NULL,'https://www.touropia.com/ancient-egyptian-temples/','Built, expanded and redecorated over more than 1,500 years — no single builder or completion date.'),
('Temple of Khonsu','Karnak, Luxor','Khonsu','Ramesses III','New Kingdom',-1186,-1155,'https://en.wikipedia.org/wiki/List_of_ancient_Egyptian_temples','Described as an almost complete New Kingdom temple.'),
('Abu Simbel Temples','Abu Simbel','Ra-Horakhty, Amun, Ptah (Great Temple); Hathor (Small Temple)','Ramesses II','New Kingdom',NULL,NULL,'https://www.touropia.com/ancient-egyptian-temples/','Popular sources date Ramesses II''s reign 1290-1224 BCE; the conventional modern chronology used elsewhere in this database gives 1279-1213 BCE. Relocated in the 1960s to escape Lake Nasser.'),
('Temple of Isis at Philae','Philae, Aswan','Isis','Begun under Nectanebo I, extended by Ptolemies and Romans','Late Period to Roman',-380,NULL,'https://www.touropia.com/ancient-egyptian-temples/','Construction begun c. 380-362 BCE under Nectanebo I; the complex grew for centuries afterwards. Moved to Agilkia Island in the Nubian rescue campaign.'),
('Temple of Horus at Edfu','Edfu','Horus','Ptolemy III to Ptolemy XII','Ptolemaic',-237,-57,'https://www.touropia.com/ancient-egyptian-temples/','Begun 237 BCE, completed roughly 180 years later in 57 BCE; among the best-preserved temples in Egypt.'),
('Temple of Hathor at Dendera','Dendera','Hathor','Ptolemaic rulers with Roman additions','Ptolemaic to Roman',NULL,NULL,'https://www.touropia.com/ancient-egyptian-temples/','Famous for its astronomical ceiling; the Dendera zodiac from this temple is now in the Louvre.'),
('Temple of Kom Ombo','Kom Ombo, Aswan Governorate','Sobek (shared with Haroeris)','Ptolemaic dynasty','Ptolemaic',-180,-47,'https://en.wikipedia.org/wiki/List_of_ancient_Egyptian_temples','Unusual double temple with mirrored halves for two deities; Roman-period additions followed.'),
('Temple of Seti I at Abydos','Abydos','Osiris','Seti I, likely completed by Ramesses II','New Kingdom',NULL,NULL,'https://www.touropia.com/ancient-egyptian-temples/','Holds the Abydos King List. Whether Ramesses II completed it is stated as likely rather than certain.'),
('Mortuary Temple of Ramesses III (Medinet Habu)','Medinet Habu, Luxor','Amun','Ramesses III','New Kingdom',-1182,-1151,'https://en.wikipedia.org/wiki/List_of_ancient_Egyptian_temples','Its walls carry the fullest surviving account of the Sea Peoples invasions.'),
('Serapeum of Alexandria','Alexandria','Serapis','Ptolemy III Euergetes','Ptolemaic',-246,-222,'https://en.wikipedia.org/wiki/List_of_ancient_Egyptian_temples','Destroyed in late antiquity; known largely from texts and excavation.'),
('Temple of Debod','Originally near Aswan','Amun','Adikhalamani','Ptolemaic-era Nubian',-200,NULL,'https://en.wikipedia.org/wiki/List_of_ancient_Egyptian_temples','Given to Spain and re-erected in Madrid during the UNESCO Nubian rescue campaign — an entire temple now standing outside Egypt.');

-- Royal women who held real power --------------------------------------------
INSERT INTO royal_women (name, dynasty, period_start, period_end, role, known_for, source_url, certainty_note) VALUES
('Hatshepsut','XVIII',-1479,-1458,'Regent, then reigning pharaoh','Ruled first as regent for her stepson Thutmose III, then took the full titulary of pharaoh; mounted an ambitious building programme including her terraced mortuary temple at Deir el-Bahari.','https://en.wikipedia.org/wiki/Hatshepsut','Counted as the fifth ruler of the Eighteenth Dynasty. Her monuments were later defaced, and the motive for that erasure remains debated.'),
('Nefertiti','XVIII',-1353,-1336,'Great Royal Wife of Akhenaten','Depicted alongside the king in official ceremonies far more prominently than a consort normally was, during the Amarna religious upheaval.','https://en.wikipedia.org/wiki/Nefertiti','Whether she later ruled in her own right under another name is one of the most actively disputed questions in Egyptology. Her burial has never been securely identified.'),
('Tiye','XVIII',NULL,NULL,'Great Royal Wife of Amenhotep III','Came from a non-royal family yet became a trusted political adviser, corresponding with foreign courts; mother of Akhenaten.','https://www.havefunwithhistory.com/egyptian-queens/','Exact dates of birth and death are not firmly fixed.'),
('Nefertari','XIX',NULL,NULL,'First Great Royal Wife of Ramesses II','Honoured with the small temple at Abu Simbel and a richly painted tomb in the Valley of the Queens.','https://www.havefunwithhistory.com/egyptian-queens/','Regnal dates for her lifetime are tied to Ramesses II''s reign, which itself varies by chronology.'),
('Ahhotep I','XVII-XVIII',NULL,NULL,'Regent for Ahmose I','Acted as regent around 1550 BCE during the wars that expelled the Hyksos and opened the New Kingdom.','https://www.havefunwithhistory.com/egyptian-queens/','The c. 1550 BCE date is approximate; the identities of the several royal women named Ahhotep are debated.'),
('Cleopatra VII','Ptolemaic',-51,-30,'Reigning queen (last active Ptolemaic ruler)','The final effective ruler of Ptolemaic Egypt; her death in 30 BCE ended three centuries of Ptolemaic rule and brought Egypt under Rome.','https://en.wikipedia.org/wiki/Death_of_Cleopatra','The exact day of her death is disputed (10 vs 12 August 30 BCE), as recorded elsewhere in this database.'),
('Arsinoe IV','Ptolemaic',-48,-47,'Rival claimant to the throne','Declared herself ruler in opposition to her sister Cleopatra VII during the Alexandrian war.','https://www.havefunwithhistory.com/egyptian-queens/','Her brief claim was never universally recognised.');
