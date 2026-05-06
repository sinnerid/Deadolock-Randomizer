import json, re, urllib.request

print("Fetching items...")
req = urllib.request.Request(
    "https://assets.deadlock-api.com/v2/items?language=english",
    headers={"User-Agent": "Mozilla/5.0"}
)
with urllib.request.urlopen(req) as r:
    data = json.loads(r.read())

upgrades = [i for i in data if i.get('type') == 'upgrade']
disabled = [i for i in upgrades if i.get('disabled') and i.get('name') and not i['name'].startswith('item_') and i.get('item_tier')]
disabled.sort(key=lambda x: (x.get('item_slot_type',''), x.get('item_tier',0), x.get('name','')))

def clean(text):
    if not text: return ''
    return re.sub(r'<[^>]+>', '', text).strip()

def get_key_stats(props):
    skip = {'AbilityCooldown','AbilityDuration','AbilityCastRange','AbilityUnitTargetLimit',
            'AbilityCastDelay','AbilityChannelTime','AbilityPostCastDuration','AbilityCharges',
            'AbilityCooldownBetweenCharge','AbilityResourceCost','ChannelMoveSpeed','AuraRadius'}
    stats = []
    for k, v in (props or {}).items():
        if k in skip: continue
        val = v.get('value')
        label = v.get('label') or k
        postfix = v.get('postfix') or ''
        prefix = (v.get('prefix') or '').replace('{s:sign}', '±')
        if val is None or str(val) == '0' or val == 0: continue
        stats.append(f'{label}: {prefix}{val}{postfix}')
    return stats

slot_colors  = {'weapon': '#4b8fff', 'spirit': '#a855f7', 'vitality': '#22c55e'}
slot_labels  = {'weapon': 'Weapon',  'spirit': 'Spirit',  'vitality': 'Vitality'}

html_rows = ''
cur_slot = None

for item in disabled:
    slot       = item.get('item_slot_type', '')
    tier       = item.get('item_tier', '?')
    name       = item.get('name', '')
    img        = item.get('shop_image_webp') or item.get('image_webp') or item.get('image') or ''
    desc       = clean((item.get('description') or {}).get('desc', ''))
    stats      = get_key_stats(item.get('properties') or {})
    cost       = item.get('cost')
    activation = item.get('activation', 'passive')
    color      = slot_colors.get(slot, '#888')
    label      = slot_labels.get(slot, slot)

    if slot != cur_slot:
        cur_slot = slot
        html_rows += f'''
        <tr class="slot-header">
          <td colspan="4" style="background:{color}22;color:{color};padding:10px 16px;font-weight:700;font-size:13px;letter-spacing:2px;text-transform:uppercase;border-left:3px solid {color}">
            {label} Items
          </td>
        </tr>'''

    img_html = (f'<img src="{img}" style="width:48px;height:48px;object-fit:contain;border-radius:6px;background:#ffffff0a">'
                if img else '<div style="width:48px;height:48px;border-radius:6px;background:#ffffff0a;display:flex;align-items:center;justify-content:center;color:#555;font-size:20px">?</div>')

    stats_html = ' '.join(f'<span class="stat">{s}</span>' for s in stats) if stats else '<span style="color:#555">—</span>'

    badge     = f'<span style="background:{color}22;color:{color};border:1px solid {color}44;padding:1px 7px;border-radius:4px;font-size:10px;font-weight:700">T{tier}</span>'
    act_badge = ('<span style="background:#f59e0b22;color:#f59e0b;border:1px solid #f59e0b44;padding:1px 6px;border-radius:4px;font-size:10px;margin-left:4px">ACTIVE</span>'
                 if activation not in ('passive', 'press', 'hold_toggle') else '')
    cost_html = f'<div style="color:#c8922a;font-size:11px;margin-top:3px">{cost:,} souls</div>' if cost else ''

    html_rows += f'''
        <tr>
          <td style="padding:10px 12px;text-align:center;width:64px">{img_html}</td>
          <td style="padding:10px 12px;width:200px">
            <div style="font-weight:600;margin-bottom:3px">{name} {badge} {act_badge}</div>
            {cost_html}
          </td>
          <td style="padding:10px 12px;color:#9ca3af;font-size:12px;max-width:280px">{desc or "—"}</td>
          <td style="padding:10px 12px;font-size:11px;line-height:2">{stats_html}</td>
        </tr>'''

html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Deadlock — Disabled Items</title>
<style>
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{ background:#0f0e1a; color:#e0e0e0; font-family:'Segoe UI',sans-serif; font-size:13px; padding:40px; }}
h1 {{ font-size:22px; font-weight:700; margin-bottom:6px; }}
.sub {{ color:#6b7280; font-size:13px; margin-bottom:28px; }}
table {{ width:100%; border-collapse:collapse; }}
th {{ padding:10px 12px; text-align:left; color:#6b7280; font-size:11px; letter-spacing:1px; text-transform:uppercase; border-bottom:1px solid #ffffff12; }}
tr:not(.slot-header):hover td {{ background:#ffffff05; }}
td {{ border-bottom:1px solid #ffffff08; vertical-align:middle; }}
.stat {{ display:inline-block; background:#ffffff08; border:1px solid #ffffff10; border-radius:4px; padding:1px 7px; font-size:11px; color:#d1d5db; margin:2px 3px 2px 0; }}
</style>
</head>
<body>
<h1>Deadlock — Disabled Items</h1>
<p class="sub">{len(disabled)} items &nbsp;·&nbsp; <code style="color:#4b8fff">disabled: true</code> in API &nbsp;·&nbsp; sorted by slot &amp; tier</p>
<table>
  <thead>
    <tr>
      <th></th>
      <th>Name</th>
      <th>Description</th>
      <th>Stats</th>
    </tr>
  </thead>
  <tbody>{html_rows}
  </tbody>
</table>
</body>
</html>'''

out = 'e:/DeadlockRandomizer/Deadlock-Randomizer/disabled_items.html'
with open(out, 'w', encoding='utf-8') as f:
    f.write(html)
print(f"Written {len(disabled)} items to {out}")
