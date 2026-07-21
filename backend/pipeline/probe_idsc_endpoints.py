#!/usr/bin/env python3
"""
Probe the IDSC prices API for MORE real Egyptian data than the daily pipeline
currently pulls — so we can extend fetch_prices.py against *confirmed* endpoints
instead of guessing.

Why this exists: fetch_prices.py already harvests essentially the whole IDSC
"local" food-price dataset (~131 retail / ~96 wholesale items across 9
categories). The portal, though, is "بوابة الأسعار المحلية والعالمية" — Local AND
Global — which strongly implies a separate GLOBAL/international commodity dataset
(and possibly governorate-level breakdowns) behind sibling endpoints. Those would
be a real, cited, same-source expansion. The dev sandbox can't reach the API
(gov host is HTTP-only / network-blocked), so run this from your own machine and
paste the output back — then the pipeline gets extended on real data, never on
invented items.

Run:
    python backend/pipeline/probe_idsc_endpoints.py

Stdlib only, cert-tolerant (the gov hosts are HTTP-only / sibling certs expired).
It only READS; it writes nothing and changes nothing.
"""
import json, ssl, sys, urllib.request, urllib.error

BASE = "http://app.prices.idsc.gov.eg/api"

# Endpoints we already use (baseline) + plausible siblings for the "global"
# side, governorate breakdowns, and category listings. Unknown names are
# expected to 404 — that's data too (tells us what does NOT exist).
KNOWN = [
    "/PricesData/GetLocalGeneralIndicators",
]
GUESSES = [
    "/PricesData/GetGlobalGeneralIndicators",
    "/PricesData/GetInternationalGeneralIndicators",
    "/PricesData/GetWorldGeneralIndicators",
    "/PricesData/GetGlobalPrices",
    "/PricesData/GetInternationalPrices",
    "/PricesData/GetGovernoratesPrices",
    "/PricesData/GetGovernorates",
    "/PricesData/GetGovernorateGeneralIndicators",
    "/PricesData/GetAllGeneralIndicators",
    "/PricesData/GetGeneralIndicators",
    "/PricesData/GetCategories",
    "/PricesData/GetMainIndicators",
]

def ctx():
    c = ssl.create_default_context()
    c.check_hostname = False
    c.verify_mode = ssl.CERT_NONE
    return c

def get(path):
    url = BASE + path
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": "EgyBI-price-probe/1.0 (+https://egybi.com)",
            "Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=25, context=ctx()) as r:
            raw = r.read().decode("utf-8", "replace")
            try:
                return r.status, json.loads(raw), raw
            except Exception:
                return r.status, None, raw
    except urllib.error.HTTPError as e:
        return e.code, None, "(HTTP error)"
    except Exception as e:
        return 0, None, "(request failed: %s: %s)" % (type(e).__name__, e)

def describe(data):
    if isinstance(data, list):
        n = len(data)
        sample = data[0] if n else None
        keys = list(sample.keys())[:8] if isinstance(sample, dict) else None
        nameE = sample.get("nameE") if isinstance(sample, dict) else None
        return "list[%d]" % n + (" keys=%s" % keys if keys else "") + (" first.nameE=%r" % nameE if nameE else "")
    if isinstance(data, dict):
        return "dict keys=%s" % list(data.keys())[:10]
    return type(data).__name__

def main():
    print("=" * 70)
    print("IDSC endpoint probe —", BASE)
    print("=" * 70)

    # 1) Baseline: how many categories/items do we see today?
    st, data, _ = get(KNOWN[0])
    print("\n[BASELINE] GetLocalGeneralIndicators -> HTTP %s : %s" % (st, describe(data)))
    if isinstance(data, list):
        for c in data:
            print("    cat id=%s nameE=%r nameA=%r" % (c.get("id"), c.get("nameE"), c.get("nameA")))
        # count items across the local categories we already know
        total = 0
        for c in data:
            cid = c.get("id")
            s2, d2, _ = get("/PricesData/GetGeneralIndicatorAllData/%s" % cid)
            r = len(d2.get("retail") or []) if isinstance(d2, dict) else 0
            w = len(d2.get("wholesale") or []) if isinstance(d2, dict) else 0
            total += r + w
            print("      -> cat %s: retail %d, wholesale %d" % (cid, r, w))
        print("    [local total raw rows: %d]" % total)

    # 2) Guessed siblings — which ones actually return data?
    print("\n[DISCOVERY] trying sibling endpoints (404 = doesn't exist, that's fine):")
    hits = []
    for p in GUESSES:
        st, data, raw = get(p)
        ok = st == 200 and data is not None
        if ok:
            hits.append(p)
        print("  %-52s HTTP %-3s %s" % (p, st, describe(data) if ok else raw[:60]))

    # 3) If GetGeneralIndicators exists, enumerate all its categories and count
    #    the retail/wholesale items each one carries — this reveals exactly which
    #    categories are NEW vs the 9 we already pull.
    st, gi, _ = get("/PricesData/GetGeneralIndicators")
    if isinstance(gi, list):
        known = {5, 1, 11, 7, 8, 3, 2, 19, 18}   # the 9 ids GetLocalGeneralIndicators returns
        print("\n[ENUMERATE] GetGeneralIndicators — all %d categories + item counts:" % len(gi))
        new_with_data = []
        for c in gi:
            cid = c.get("id")
            s2, d2, _ = get("/PricesData/GetGeneralIndicatorAllData/%s" % cid)
            r = len(d2.get("retail") or []) if isinstance(d2, dict) else 0
            w = len(d2.get("wholesale") or []) if isinstance(d2, dict) else 0
            is_new = cid not in known
            tag = "   <-- NEW" if is_new else ""
            if is_new and (r + w) > 0:
                new_with_data.append((cid, c.get("nameE"), r, w))
            print("  id=%-3s %-30s retail %-3d wholesale %-3d%s" % (cid, (c.get("nameE") or "?")[:30], r, w, tag))
        print("\n  NEW categories that actually carry data: %d" % len(new_with_data))
        for cid, nm, r, w in new_with_data:
            print("    id=%-3s %-30s (+%d retail, +%d wholesale)" % (cid, (nm or "?")[:30], r, w))

    print("\n" + "-" * 70)
    if hits:
        print("PROMISING endpoints that returned data:")
        for h in hits:
            print("   ", h)
        print("Paste this whole output back — I'll extend fetch_prices.py to pull them")
        print("(as new cited items / a new section), keeping the daily job and guardrail.")
    else:
        print("No sibling endpoint returned data. The API may expose only the local")
        print("food dataset we already pull, or gate 'global' prices behind the web app.")
        print("Paste the output anyway so we can confirm and record it honestly.")
    print("-" * 70)

if __name__ == "__main__":
    sys.exit(main())
