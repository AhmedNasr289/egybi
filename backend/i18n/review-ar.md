# Arabic catalogue review — backend/i18n/ar.tsv

Reviewed all 955 lines on 2026-11-17. **157 lines** were rewritten in the PR that adds this file
(153 proposed here, line 43 brought in line with the glossary, and lines 96, 195 and 412
shortened to fit the SEO title and description limits). The glossary is
`backend/i18n/glossary-ar.tsv`; `backend/verify/i18n.py` fails (GLOSSARY TERM) if a rejected
variant comes back. I checked every proposal by script against
the English line: identical HTML tag set (only title/alt/aria-label/placeholder values may differ),
identical numbers once Arabic-Indic digits are normalised, three fields per row, no tabs, and no
Latin `, ; ? "` outside tags and entities. 

Overall the catalogue is already good: correct MSA, Arabic punctuation throughout, « » quotation
marks, arrows already mirrored for RTL (→ becomes ←), and Arabic-Indic digits used consistently.
Most of the work is removing calques and making terms consistent, not fixing errors.

## Problems by category (proposal counts)

| Code | Count | What it covers |
|---|---|---|
| literal | 56 | Calques and English word order: "اجعل شخصًا في القاهرة يقرأ خطتك", "بالحجة من الخريطة", "اختر عدسة", "إنسان في الحلقة", "كل حقيقة حقيقية", "لا أحدهما مخطئ", "حيث" used as a connector, "كيف يتم/تم", and four meaning fixes (Cairo *data* analyst dropped in the $49 title, "two dozen" rendered as "about twenty", "الرقم الأنسب" for *tidier* number, "contested sources" when the *models* are contested). |
| rhythm | 49 | Heavy or clumsy phrasing, chiefly the repeated "ما تبلغه فترة بعد ظهر عادية", "انقر … لبطاقة الحي", "ما ليست عليه". |
| term | 44 | One English term rendered several ways (glossary below). |
| local | 2 | «فكّها» beside صرف for breaking big notes; "مربعات سكنية" in place of the loanword "بلوكات". |
| name | 1 | Upper Egypt explained as الصعيد, the name Egyptians actually use. |
| register | 1 | "حسابك، واختيارك" → "حسابك، والقرار لك". |
| english | 0 | Brand and service names (EgyBI, OpenStreetMap, Google, SIPRI, POWER, SRTM, OSMnx) are correctly kept in Latin script; nothing needed translating. |
| rtl | 0 | No Latin punctuation, straight quotes or wrong-direction arrows found. |

## Form of address

**Second person masculine singular (أنت), with singular imperatives on buttons** (اختر، احفظ، اعرض،
خطّط). The catalogue already uses this almost everywhere, and it is the norm on Egyptian travel and
news sites (اكتشف، احجز، تعرّف). It reads directly and warmly without being colloquial. The site speaks
of itself as "we" (نحن) and the reader as "you", and I kept that. The one exception, the newsletter
button "أرسلوا لي «البردية»" (line 300), is the reader addressing the team, which is natural, so I left it.

## Glossary (one rendering per term)

- planner / trip planner / route planner → مخطِّط الرحلة (short form in context: المخطِّط)
- Plan (menu item) → خطّط رحلتك
- Plan your route → خطّط مسار رحلتك
- dossier → ملف الرحلة
- Papyrus dossier → ملف «البردية»
- briefing → ملخّص (ملخّصك)
- Plan check → مراجعة الخطة
- The Papyrus (newsletter) → «البردية»
- fair prices → الأسعار العادلة
- tips / entry / rides → البقشيش / رسوم الدخول / التنقلات
- governorate → محافظة
- sourced / cited → موثّق المصدر / موثّق
- named source → مصدر محدّد
- named guides → أدلة سياحية نذكرها بالاسم
- flagged (a dispute) → ننبّه إليه / مع التنبيه إلى الخلاف
- tidy number → الرقم المريح
- measured heat → الحرارة المقيسة
- measured site → موقع نقيس حرارته
- what a normal afternoon reaches → ما تبلغه الحرارة عادةً بعد الظهر
- mean daily maximum → متوسط الحرارة العظمى اليومية
- heat band (legend range) → فئة حرارة (legend labels left as they are)
- tile-free map → خريطة مرسومة داخل الصفحة
- gazetteer → دليل الأماكن
- pipeline → خط المعالجة
- normalised per km² → منسوبة إلى كل كيلومتر مربع
- display name → الاسم الظاهر
- page-view count → إحصاء مشاهدات الصفحات
- scrambled (hashed) → مموَّه
- cookies → ملفات تعريف الارتباط (also in the short menu label)
- What this map is not → ما لا تصلح له هذه الخريطة
- What these numbers are not → ما لا تعنيه هذه الأرقام
- Turin King List → بردية تورينو الملكية
- hepatitis C → التهاب الكبد الوبائي سي
- Hollywood on the Nile → هوليوود الشرق (the established Arabic nickname)
- Upper Egypt → الصعيد («مصر العليا»)
- Thoth / Seshat / Ibi → تحوت / سشات / إيبي
- Abu Simbel, Luxor, Aswan, Giza, Saqqara, Valley of the Kings, Siwa, Dahab, Hurghada, Karnak,
  Dendera, Philae, Abydos → أبو سمبل، الأقصر، أسوان، الجيزة، سقارة، وادي الملوك، سيوة، دهب، الغردقة،
  الكرنك، دندرة، فيلة، أبيدوس (already correct and consistent across all pages)

## Before and after

| Line | Before | After |
|---|---|---|
| 231 | اجعل شخصًا في القاهرة يقرأ خطتك. | اعرض خطتك على شخص في القاهرة ليراجعها. |
| 577 | كل حقيقة حقيقية وموثّقة. | كل معلومة حقيقية وموثّقة. |
| 277 | … مصدران محترمان — حيث تكون الخطوة المريحة اختيار أحدهما والسكوت. | … مصدران محترمان — وكان الأسهل أن نختار أحدهما ونسكت. |
| 412 | مراجعة رحلة مصر بيد محلل في القاهرة — ٤٩ دولارًا | مراجعة رحلة مصر بيد محلل بيانات في القاهرة — ٤٩ دولارًا (the title had dropped *data*; shortened to fit 65 characters) |
| 694 | اختر عدسة، ثم انقر أي محافظة. | اختر ما تعرضه الخريطة، ثم انقر أي محافظة. |
| 600 | إنسان في الحلقة | مراجعة بشرية |
| 753 | مصر، بالحجة من الخريطة. | مصر، بحجج من الخريطة. |
| 309 | الحرارة التي تبلغها فترة بعد ظهر عادية في أشهرك | ما تبلغه الحرارة عادةً بعد الظهر في أشهرك |
| 284 | لا أحدهما مخطئ … بدل أن نختار الرقم الأنسب. | وليس أيٌّ منهما خاطئًا … بدل أن نختار الرقم المريح. |
| 667 | نحو عشرين رسمًا بيانيًا (for "two dozen") | قرابة أربعة وعشرين رسمًا بيانيًا |

## Not proposed, but worth a decision

- **Month abbreviations (467–478)**: ينا، فبر، مار… Arabic readers rarely see truncated month names.
  If the table has room, the full names (يناير … ديسمبر, at most 6 letters) read better. This depends
  on the layout, so I did not propose it.
- **Line 300** "أرسلوا لي «البردية»": a good choice. Keep it unless the team wants every button in the
  singular.
- **"خط المعالجة"** for *pipeline* stays as it is: consistent and understood, though technical for
  travellers. It appears only in the method sections.

## Lines a native Egyptian reviewer should still check

Meaning-sensitive. These need a human check against the English, whether or not I changed them:

- **Privacy and data collection:** 96, 98, 105, 107, 108, 110, 111, 112, 113, 114, 117–121, 123,
  124, 126, 127, 129, 131, 951 (password hashing, the Google sign-in, the session cookie).
- **Account and passwords:** 895–942, especially 911, 915, 917, 932, 936 ("signs you out everywhere
  else") and 939.
- **Community posting consent:** 551, 607, 611.
- **Paid service and prices:** 232, 333–335, 405, 409, 412–426 (the $49 offer and "How paying works",
  426), 341, 343, 356, 361, 363, 365.
- **Safety and health:** 424 (no visa, health or safety advice), 692 (not for navigation or
  emergencies), 728 (the health layer is not a care directory), 771–785, 864–867.
- **Climate caveats:** 460, 461, 464, 512, 513 (what the temperatures do and do not mean).
- **Contested facts:** 63–66 (IMF, green hydrogen, the GERD dam figures), 284 (the two population
  figures), 49 and 181 (hepatitis C and the WHO wording "تشهد لها").
- **Technical renderings to confirm:** 307, 529, 585, 632, 660, 676, 678 (*tile-free*, which I
  render as "مرسومة داخل الصفحة"); 710 (*quantile bins*, "فئات مئينية"); 850/853 (إنتروبيا الاتجاه).
