import json, urllib.request, urllib.parse, time, sys
def g(q, hl):
    u='https://suggestqueries.google.com/complete/search?client=firefox&hl=%s&q=%s'%(hl,urllib.parse.quote(q))
    try:
        d=json.loads(urllib.request.urlopen(u,timeout=15).read().decode('utf-8','replace'))
        return d[1]
    except Exception as e: return ['ERR '+str(e)[:60]]
def y(q):
    u='https://suggest.yandex.ru/suggest-ya.cgi?v=4&part=%s'%urllib.parse.quote(q)
    try:
        d=json.loads(urllib.request.urlopen(u,timeout=15).read().decode('utf-8','replace'))
        return d[1]
    except Exception as e: return ['ERR '+str(e)[:60]]


TOPICS = {
 'en': {
  'tipping': ['tipping in egypt','how much to tip in egypt','baksheesh egypt'],
  'scams_giza': ['giza scams','egypt scams','camel ride giza price'],
  'best_time': ['best time to visit egypt','egypt weather in','egypt in december'],
  'gem': ['grand egyptian museum tickets','grand egyptian museum price'],
  'visa': ['egypt visa on arrival','egypt visa fee'],
  'ramadan': ['ramadan 2027 egypt','visiting egypt during ramadan'],
  'abu_simbel': ['abu simbel sun festival','abu simbel tickets'],
  'itinerary': ['egypt itinerary','egypt itinerary 7 days','egypt itinerary 10 days'],
  'luxor': ['luxor in one day','luxor itinerary'],
  'cost': ['egypt trip cost','how much money for egypt','egypt entry ticket prices'],
  'uber_airport': ['uber cairo airport','cairo airport to giza'],
  'hieroglyphs': ['name in hieroglyphics','write my name in hieroglyphs','cartouche name'],
  'heat': ['luxor weather','aswan weather in','is egypt too hot in'],
 },
 'ru': {
  'tipping': ['чаевые в египте'],
  'samostoyatelno': ['египет самостоятельно'],
  'excursions': ['экскурсии из хургады цены','экскурсии из шарм эль шейха цены'],
  'best_time': ['когда лучше ехать в египет','погода в египте в'],
  'money': ['какие деньги брать в египет','карты в египте'],
  'visa': ['виза в египет'],
 },
 'ar': {
  'best_time': ['أفضل وقت لزيارة مصر','الطقس في الاقصر'],
  'tickets': ['أسعار تذاكر الأهرامات','اسعار تذاكر المتحف المصري الكبير'],
  'prices': ['اسعار الخضروات اليوم','سعر الدولار اليوم'],
  'hieroglyphs': ['اسمك بالهيروغليفي','كتابة الاسم بالهيروغليفية'],
 }
}
EN_L='abcdefghijklmnopqrstuvwxyz'; RU_L='абвгдежзиклмнопрстуфхцчшэя'; AR_L='ابتثجحخدرزسشصطعفقكلمنهوي'
import collections
out={}
for lang,topics in TOPICS.items():
    letters={'en':EN_L,'ru':RU_L,'ar':AR_L}[lang]
    for t,seeds in topics.items():
        allsug=collections.OrderedDict(); ysug=collections.OrderedDict(); base_hits=0
        for s in seeds:
            b=g(s,lang)
            if b and not b[0].startswith('ERR'): base_hits+=len(b)
            for x in b: allsug[x]=1
            for L in letters:
                for x in g(s+' '+L,lang): allsug[x]=1
                time.sleep(0.05)
            if lang=='ru':
                for x in y(s): ysug[x]=1
                for L in letters:
                    for x in y(s+' '+L): ysug[x]=1
                    time.sleep(0.05)
        sug=[k for k in allsug if not k.startswith('ERR')]
        out[f'{lang}:{t}']={'seeds':seeds,'google_base':base_hits,'google_distinct':len(sug),'google':sug,
                            'yandex_distinct':len([k for k in ysug if not k.startswith('ERR')]),'yandex':[k for k in ysug if not k.startswith('ERR')]}
        print(lang,t,'base',base_hits,'distinct',len(sug),'yandex',out[f'{lang}:{t}']['yandex_distinct'],flush=True)
json.dump(out,open(sys.argv[1],'w'),ensure_ascii=False,indent=1)
