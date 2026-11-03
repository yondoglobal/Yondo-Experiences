"""Parse the supplier price list into:
   - web/src/data/catalogue.json  : public catalogue (selling prices ONLY, no costs)
   - db/seed_*.sql                : experiences + price_rows (with costs) for Supabase
"""
import json, re, sys, datetime, openpyxl, os
sys.path.insert(0, os.path.dirname(__file__))
from meta import M, CATS, EXCLUDE_PREFIX

SRC = sys.argv[1] if len(sys.argv) > 1 else 'pricelist.xlsx'
TODAY = datetime.date(2026, 11, 3)
FEE = 0.05          # banking + payment gateway
FLOOR = 5.0         # minimum net profit per unit (AED) to show a price
OUT_WEB = '../web/src/data/catalogue.json'
OUT_DB = '../db'

def norm(s): return re.sub(r'\s+', ' ', str(s or '')).strip()
def slug(s): return re.sub(r'[^a-z0-9]+', '-', norm(s).lower()).strip('-')[:80]
def d(s):
    if isinstance(s, (datetime.date, datetime.datetime)): return s.date() if isinstance(s, datetime.datetime) else s
    m, dd, y = [int(x) for x in str(s).split('/')]
    return datetime.date(y, m, dd)
def num(x):
    try: return round(float(x or 0), 2)
    except: return 0.0

wb = openpyxl.load_workbook(SRC, data_only=True); ws = wb.active
rows = [r for r in list(ws.iter_rows(values_only=True))[1:] if r and r[0]]

price_rows = []
for r in rows:
    att, tix = norm(r[0]), norm(r[1])
    price_rows.append(dict(attraction=att, ticket=tix, origins=norm(r[2]), start=str(d(r[3])), end=str(d(r[4])),
        rec_adult=num(r[5]), rec_child=num(r[6]), rec_trip=num(r[7]),
        cost_adult=num(r[8]), cost_child=num(r[9]), cost_trip=num(r[10])))

def excluded(att): return any(att.startswith(p) for p in EXCLUDE_PREFIX)

missing = sorted({p['attraction'] for p in price_rows if p['attraction'] not in M and not excluded(p['attraction'])})
if missing: print('NO META:', missing)

DISCOUNT = 5.0      # default Yondo discount off the standard price (admin can change it live)
import math
def sell(rec, cost, fl):
    if not rec or rec <= 0: return None
    # Postgres round() is half away from zero
    disc = math.floor(rec * (1 - DISCOUNT / 100) + 0.5)
    return min(rec, max(disc, math.ceil(round((cost + fl) / (1 - FEE), 9))))

def sellable(p):
    ra, rt, ca, ct = p['rec_adult'], p['rec_trip'], p['cost_adult'], p['cost_trip']
    if ra > 0 and rt > 0: return (ra + rt) * (1 - FEE) - (ca + ct) >= FLOOR
    if ra > 0: return ra * (1 - FEE) - ca >= FLOOR
    if rt > 0: return rt * (1 - FEE) - ct >= FLOOR
    return False

# ---- public catalogue
exps = {}
stats = dict(rows=len(price_rows), hidden_floor=0, past=0)
for p in price_rows:
    att = p['attraction']
    if excluded(att) or att not in M: continue
    meta = M[att]
    if p['end'] < str(TODAY): stats['past'] += 1; continue
    if not sellable(p): stats['hidden_floor'] += 1; continue
    combined = p['rec_adult'] > 0 and p['rec_trip'] > 0
    adult = sell(p['rec_adult'], p['cost_adult'], 0 if combined else FLOOR)
    trip = sell(p['rec_trip'], p['cost_trip'], FLOOR)
    child_floor = 0 if combined else FLOOR
    child = sell(p['rec_child'], p['cost_child'], child_floor) if (adult and p['rec_child'] > 0 and p['rec_child'] * (1 - FEE) - p['cost_child'] >= child_floor) else None
    e = exps.setdefault(att, dict(slug=slug(meta['name']), src=att, name=meta['name'], cat=meta['cat'], emirate=meta['emirate'],
                                  blurb=meta['blurb'], img=meta['img'], featured=meta['featured'], hidden=meta['hidden'], options={}))
    okey = slug(att) + '--' + slug(p['ticket'])
    o = e['options'].setdefault(okey, dict(key=okey, name=p['ticket'], unit=('person+trip' if adult and trip else 'trip' if trip else 'person'),
                                           origins=set(), periods=[]))
    o['origins'].update([x.strip() for x in p['origins'].split(',') if x.strip()])
    per = dict(s=p['start'], e=p['end'], a=adult, c=child, t=trip,
               ma=p['rec_adult'] or None, mc=(p['rec_child'] if child else None), mt=p['rec_trip'] or None)
    o['periods'].append({k: v for k, v in per.items() if v is not None})

out = []
for e in exps.values():
    opts = []
    for o in e['options'].values():
        o['origins'] = sorted(o['origins'])
        o['periods'].sort(key=lambda x: (x['s'], x['e']))
        n = o['name'].lower()
        tags = []
        if 'open dated' in n or 'any day' in n: tags.append('Open-dated')
        elif 'dated ticket' in n: tags.append('Date-specific')
        if 'private' in n: tags.append('Private')
        elif 'sharing' in n or 'shared' in n: tags.append('Shared')
        if 'transfer' in n and 'direct reporting' not in n: tags.append('Transfers')
        o.pop('unit', None)
        # price shown "from": cheapest current-or-future unit price
        vals = [x.get('a') or x.get('t') for x in o['periods'] if (x.get('a') or x.get('t'))]
        o['_from'] = min(vals)
        opts.append(o)
    opts.sort(key=lambda o: o['_from'])
    for o in opts: o.pop('_from')
    e['options'] = opts
    out.append(e)

order = list(CATS.keys())
out.sort(key=lambda e: (order.index(e['cat']), not e['featured'], e['name']))
os.makedirs(os.path.dirname(OUT_WEB), exist_ok=True)
pub = dict(generated=str(TODAY), showStandardPrice=True, reviewsUrl='https://share.google/wpT4mj3k5yt2fROYn',
           writeReviewUrl='https://share.google/wpT4mj3k5yt2fROYn', experiences=out)
json.dump(pub, open(OUT_WEB, 'w'), separators=(',', ':'), ensure_ascii=False)

vis = [e for e in out if not e['hidden']]
print(f"experiences public={len(vis)} hidden={len(out)-len(vis)} options={sum(len(e['options']) for e in vis)}", stats)
print('size KB', os.path.getsize(OUT_WEB) // 1024)

# ---- DB seed (experiences meta + raw price rows WITH costs) -> SQL
os.makedirs(OUT_DB, exist_ok=True)
def q(v):
    if v is None: return 'null'
    if isinstance(v, bool): return 'true' if v else 'false'
    if isinstance(v, (int, float)): return repr(v)
    return "'" + str(v).replace("'", "''") + "'"

exp_rows = []
for att, meta in M.items():
    exp_rows.append(f"({q(slug(meta['name']))},{q(att)},{q(meta['name'])},{q(meta['cat'])},{q(meta['emirate'])},{q(meta['blurb'])},{q(meta['img'])},{q(meta['featured'])},{q(meta['hidden'])})")
with open(f'{OUT_DB}/seed_experiences.sql', 'w') as f:
    f.write("insert into public.experiences (slug, source_name, name, category, emirate, blurb, image_key, featured, hidden) values\n")
    f.write(',\n'.join(exp_rows))
    f.write("\non conflict (source_name) do update set slug=excluded.slug, name=excluded.name, category=excluded.category, emirate=excluded.emirate, blurb=excluded.blurb, image_key=excluded.image_key, featured=excluded.featured, hidden=excluded.hidden;\n")

json.dump(price_rows, open(f'{OUT_DB}/price_rows.json', 'w'), ensure_ascii=False)
print('price rows', len(price_rows))
