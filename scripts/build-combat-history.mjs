import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { keyValues } from './lib/keyvalues.mjs';
import { createHash } from 'node:crypto';
const read = p => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const cache = JSON.parse(gunzipSync(readFileSync(new URL('./data/combat-history.json.gz', import.meta.url))));
const source = JSON.parse(gunzipSync(readFileSync(new URL('./data/patch-sources.json.gz', import.meta.url))));
const patches = read('../src/data/patches.json').patches;
const heroes = [...read('../src/data/heroes-2011.json').heroes, ...read('../src/data/hero-releases.json').batches.flatMap(b => b.heroes)];
const icons = read('../src/data/hero-icons.json').heroes;
const names = new Map([...cache.labels.abilities.result.data.itemabilities, ...cache.labels.items.result.data.itemabilities].map(a => [String(a.id), a]));
const english = new Map([...names.values()].map(a => [a.name, a.name_english_loc || a.name_loc]));
const pretty = s => s.replace(/^item_/, '').replace(/_/g, ' ').replace(/\b\w/g, x => x.toUpperCase());
const plain = s => s.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const nums = v => (Array.isArray(v) ? v : String(typeof v === 'object' ? v?.value ?? '' : v ?? '').split(/\s+/)).map(Number).filter(Number.isFinite);
const positive = v => nums(v).some(n => n > 0);
function values(a) {
  return Object.assign({}, ...Object.values(a.AbilitySpecial ?? {}).filter(v => typeof v === 'object'), a.AbilityValues ?? {});
}
function spec(id, a) {
  const v = values(a), entries = Object.entries(v).filter(([k]) => !/scepter|shard|talent|bonus|tooltip|linked|special|require|facet/i.test(k));
  const first = regex => entries.find(([k, val]) => regex.test(k) && positive(val))?.[1];
  const behavior = a.AbilityBehavior ?? '';
  const passive = /PASSIVE/.test(behavior);
  const damage = nums(a.AbilityDamage).some(n => n > 0) ? nums(a.AbilityDamage) : nums(entries.find(([k,val])=>!/^break_on_|gods_strength/.test(k)&& /^(damage|damage_per_second|damage_per_tick|initial_damage|base_damage|blast_damage|nuke_damage|impact_damage|strike_damage|attack_damage)$|^[a-z_]+_damage$/.test(k)&&positive(val))?.[1]);
  const heal = nums(first(/^(heal_amount|heal|health_restore)$/));
  const stun = nums(first(/^(stun_duration|stun|bash_duration|stun_duration_min|min_stun)$/));
  const slow = nums(first(/^(movement_slow|movespeed_slow|slow|slow_movement_speed|slow_movement_speed_pct|movespeed)$/));
  const summon = /summon|persuasion|enchant$|treants|serpent_ward|eidolon|spirit_bear|wolves|spiderling|tombstone/.test(id);
  const mobility = /blink|waveform|time_walk|ball_lightning|skewer|pounce|burrowstrike|force_staff/.test(id);
  const shield = nums(first(/^(damage_absorb|damage_absorption|barrier|shield_capacity|shield|absorb_amount)$/));
  const duration = nums(first(/^(duration|buff_duration|debuff_duration|slow_duration)$/) ?? a.AbilityDuration);
  const scepter = a.IsGrantedByScepter === '1' || a.HasScepterUpgrade === '1' || /RequiresScepter/.test(JSON.stringify(a));
  const shard = a.IsGrantedByShard === '1' || a.HasShardUpgrade === '1' || /RequiresShard/.test(JSON.stringify(a));
  const properties = Object.fromEntries(Object.entries(v).filter(([k])=>!/^special_bonus_|scepter|shard|tooltip|linked|require|facet|var_type/i.test(k)).map(([k,val])=>[k,nums(val)]).filter(([,val])=>val.some(n=>n!==0)));
  const result = { id, name: english.get(id) || pretty(id.replace(/^[^_]+_/, '')), passive, properties,
    channel: nums(a.AbilityChannelTime), toggle: /TOGGLE/.test(behavior),
    damageOverTime: (entries.some(([k])=>/^(damage_per_second|damage_per_tick|damage_interval|tick_interval|blade_fury_damage_tick)$/.test(k)) || /^(doom_bringer_doom|pudge_rot|venomancer_poison_nova|viper_viper_strike)$/.test(id)) && damage.length>0,
    ultimate: /ULTIMATE/.test(a.AbilityType??''), hidden: /HIDDEN/.test(behavior),
    granted: a.IsGrantedByScepter === '1' ? 'scepter' : a.IsGrantedByShard === '1' ? 'shard' : undefined,
    cooldown: nums(v.AbilityCooldown ?? a.AbilityCooldown), mana: nums(v.AbilityManaCost ?? a.AbilityManaCost), damage, heal, stun, slow, shield, duration,
    range: nums(v.AbilityCastRange ?? a.AbilityCastRange), area: /AOE/.test(behavior) || /area|radius|width_(?:initial|end)/.test(entries.map(([k])=>k).join(' ')),
    line: entries.some(([k])=>/width_(?:initial|end)/.test(k)),
    ally: /FRIENDLY/.test(a.AbilityUnitTargetTeam ?? '') && !/ENEMY/.test(a.AbilityUnitTargetTeam ?? ''),
    summon, mobility, scepter, shard,
    // Keep upgrade values separate: buying the upgrade is required.
    upgrades: Object.fromEntries(Object.entries(v).filter(([k,val]) => /scepter|shard/i.test(k) || val && typeof val === 'object' && ('special_bonus_scepter' in val || 'special_bonus_shard' in val)).map(([k,val])=>[k, val])),
    talent: id.startsWith('special_bonus_') ? Object.fromEntries(Object.entries(v).filter(([k])=>k!=='var_type')) : undefined,
    modifiers: Object.entries(v).flatMap(([field,val])=>val&&typeof val==='object'?Object.entries(val).filter(([key])=>/^special_bonus_/.test(key)).map(([key,amount])=>({field,upgrade:key,amount:nums(amount)[0]??0})):[]),
  };
  // Structural ability facts are separate from generic damage: these spells
  // may affect buildings, and range bonuses are not cast range or free damage.
  if (id === 'sniper_take_aim') result.siege = { kind: 'range', rangeBonus: nums(v.passive_attack_range_bonus ?? v.bonus_attack_range), activeRangeBonus: nums(v.active_attack_range_bonus) };
  if (id === 'pugna_nether_blast') {
    const mod=nums(v.structure_damage_mod)[0]??.5;
    result.siege={kind:'blast',buildingMultiplier:mod>1?mod/100:mod,radius:nums(v.radius)};
  }
  if (id === 'jakiro_liquid_fire') result.siege={kind:'fire',buildingMultiplier:(nums(v.building_dmg_pct)[0]??100)/100,attackSlow:nums(v.slow_attack_speed_pct).map(n=>Math.abs(n)/100)};
  if (id === 'dragon_knight_elder_dragon_form') result.siege={kind:'form',rangeBonus:nums(v.bonus_attack_range),dot:nums(v.corrosive_damage_per_second??v.corrosive_breath_damage),dotDuration:nums(v.corrosive_duration??v.corrosive_breath_duration)};
  if (id === 'shadow_shaman_mass_serpent_ward') result.siege={kind:'wards',wardCount:nums(v.ward_count),wardDamage:nums(v.ward_damage_tooltip??v.damage_tooltip??v.damage_min),wardRange:nums(v.attack_range_tooltip)};
  for(const val of Object.values(a.AbilitySpecial??{}))if(val?.LinkedSpecialBonus){
    const field=Object.keys(val).find(k=>!['var_type','LinkedSpecialBonus','LinkedSpecialBonusField','LinkedSpecialBonusOperation'].includes(k));
    if(field)result.modifiers.push({field,upgrade:val.LinkedSpecialBonus,amount:null});
  }
  return result;
}
const catalogue = {}, changelog = {};
let economyRules={passiveGoldPerMinute:85,bountyMultiplier:1,creepBase:35,meleeGrowth:1,rangedGrowth:1,neutralGrowth:0,assistNetWorth:false,sources:[]};
for (const patch of patches) {
  const snapshot = cache.snapshots[patch.id];
  const h = {}, a = {}, items = {};
  for (const file of snapshot.files) {
    const content=cache.files[snapshot.base+file]??'';
    const parsed = file.endsWith('.json') ? (content ? JSON.parse(content) : {}) : keyValues(content);
    Object.assign(h, parsed.DOTAHeroes); Object.assign(a, parsed.DOTAAbilities);
    Object.assign(items, parsed.DOTAItems);
  }
  for(const hero of Object.values(h)) if(hero && typeof hero==='object')Object.assign(a,hero.AbilityDefinitions);
  // Older item files use DOTAAbilities too.
  for (const [key,val] of Object.entries(a)) if (key.startsWith('item_')) items[key] = val;
  const specs = Object.fromEntries(Object.entries(a).filter(([k,v])=>typeof v==='object' && !k.startsWith('item_')).map(([k,v])=>[k,spec(k,v)]));
  for(const ability of Object.values(specs))for(const m of ability.modifiers)if(m.amount===null)m.amount=nums(values(a[m.upgrade]??{}).value)[0]??0;
  const heroRows = {};
  for (const hero of heroes) {
    const original = h[icons[hero.id]?.valveName]; if (!original) continue;
    const kit = Object.entries(original).filter(([k,v])=>/^Ability\d+$/.test(k) && specs[v] && !/^special_bonus_|attribute_bonus|generic_hidden/.test(v))
      .map(([,v])=>v).filter((id,i,list)=>list.indexOf(id)===i);
    const talents = Object.entries(original).filter(([k,v])=>/^Ability\d+$/.test(k) && String(v).startsWith('special_bonus_')).map(([,v])=>v);
    heroRows[hero.id] = { kit, talents, stats: Object.fromEntries(Object.entries(original).filter(([k])=>/^(Attribute(Base|.*Gain)|AttackDamageM|AttackRange$|MovementSpeed|StatusHealthRegen|StatusManaRegen)/.test(k)).map(([k,v])=>[k,Number(v)])) };
  }
  const itemRows = Object.fromEntries(Object.entries(items).filter(([k,v])=>typeof v==='object' && !/recipe|empty|courier|ward|aegis|cheese|token|container|bag|custom|neutral|river_painter|event/.test(k) && Number(v.ItemCost)>0 && Number(v.ItemCost)<10000).map(([id,v])=> {
    const vals = values(v); const num = key => nums(vals[key])[0] ?? 0;
    return [id, { ...spec(id,v), name: english.get(id) || pretty(id), cost: Number(v.ItemCost),
      attack: num('bonus_damage') + (num('bonus_agility')+num('bonus_strength')+num('bonus_intellect'))*.35,
      health: num('bonus_health') + num('bonus_strength')*12, speed: num('bonus_movement_speed')/350,
      spells: num('spell_amp')/100, evasion: num('bonus_evasion')/100 }];
  }));
  catalogue[patch.id] = { source: { date: snapshot.date, url: `https://github.com/${snapshot.repo}/tree/${snapshot.sha}/${snapshot.base.split(snapshot.sha+'/')[1]}`, provisional: snapshot.provisional },
    heroes: heroRows, abilities: specs, items: itemRows };
  const changes = [];
  const modern = patch.sources.filter(s=>s.url.includes('/datafeed/patchnotes?'));
  function add(note, context, s, extra={}) {
    if (!note?.note || note.hide_dot) return;
    const text = plain(note.note); if (!text || /^Example \d|^Old Formula/.test(text)) return;
    const category = note.aghanims === 'shard' || /shard/i.test(text) ? 'Shard' : note.aghanims === 'scepter' || /scepter|aghanim/i.test(text) ? 'Scepter' : /talent/i.test(context) || /talent/i.test(text) ? 'Talent' : /rework|replac|no longer|now |new ability|added/i.test(text) ? 'Rework / rules' : /cooldown/i.test(text) ? 'Cooldown' : 'Balance';
    changes.push({ ...extra, subject: context, text, category, version: s.label.replace('Valve ',''), url: s.url });
  }
  const byNumber = new Map(Object.values(source.sources).find(x=>x.result?.data?.heroes)?.result.data.heroes.map(x=>[x.id,heroes.find(h=>icons[h.id]?.valveName===x.name)?.id]) ?? []);
  for (const s of modern) {
    const p = source.sources[s.url]; if (!p) continue;
    for (const group of p.general_notes ?? []) for (const n of group.generic ?? []) add(n,'General rules',s,{kind:'general'});
    for (const hero of p.heroes ?? []) {
      const id = byNumber.get(hero.hero_id); if (!id) continue;
      for (const n of hero.hero_notes ?? []) add(n,'Base hero',s,{kind:'hero',id});
      for (const n of hero.talent_notes ?? []) add(n,'Talents',s,{kind:'hero',id});
      for (const ability of hero.abilities ?? []) {
        const label = names.get(String(ability.ability_id));
        for (const n of ability.ability_notes ?? []) add(n,label?.name_english_loc || label?.name_loc || 'Legacy ability',s,{kind:'hero',id,abilityId:label?.name});
      }
    }
    for (const item of [...(p.items ?? []),...(p.neutral_items ?? [])]) {
      const label = names.get(String(item.ability_id));
      for (const n of item.ability_notes ?? []) add(n,label?.name_english_loc || label?.name_loc || `Legacy item ${item.ability_id}`,s,{kind:'item',id:label?.name});
    }
  }
  // Mirrors occasionally stop updating between two patches. Apply explicit
  // numeric before/after facts released AFTER the snapshot, never backwards
  // over newer files. Keep unparsed structural rules as source notes.
  const overlays=[];
  function overlay(ability,note){
    if(!ability)return;
    const text=plain(note.note??'');
    const match=/(?:increased|decreased|reduced|rescaled|changed) from [+-]?[\d.,%/]+\s*s? to ([+-]?[\d.,%/]+)/i.exec(text);
    if(!match)return;
    const values=match[1].replace(/%/g,'').split('/').map(Number);if(values.some(n=>!Number.isFinite(n)))return;
    const field=/^Cooldown/i.test(text)?'cooldown':/^Mana Cost/i.test(text)?'mana':/^(?:[A-Za-z ]+ )?Stun Duration/i.test(text)?'stun':/^(?:Base )?Damage/i.test(text)?'damage':/^Heal(?:ing| Amount)?/i.test(text)?'heal':/^Duration/i.test(text)?'duration':/^Cost|^Recipe Cost/i.test(text)?'cost':undefined;
    if(!field)return;
    if(/scepter|shard/i.test(text)){ability.upgrades[`${field}_${/shard/i.test(text)?'shard':'scepter'}`]=values.join(' ');return;}
    if(field==='cost')ability.cost=values[0];else ability[field]=values;
  }
  for(const s of modern.filter(s=>s.date>snapshot.date)){
    const p=source.sources[s.url];if(!p)continue;
    overlays.push({version:p.patch_number,url:s.url,date:s.date});
    for(const hero of p.heroes??[]){
      for(const ab of hero.abilities??[])for(const n of ab.ability_notes??[])overlay(specs[names.get(String(ab.ability_id))?.name],n);
    }
    for(const item of p.items??[])for(const n of item.ability_notes??[])overlay(itemRows[names.get(String(item.ability_id))?.name],n);
  }
  catalogue[patch.id].overlays=overlays;
  economyRules=structuredClone(economyRules);
  for(const s of [...modern].sort((a,b)=>a.date.localeCompare(b.date))){
    const p=source.sources[s.url];if(!p)continue;
    let applied=false;
    for(const note of(p.general_notes??[]).flatMap(g=>g.generic??[])){
      const text=plain(note.note??'');let m;
      if((m=/Passive gold income increased from (\d+) to (\d+)/i.exec(text))){economyRules.passiveGoldPerMinute=Number(m[2]);applied=true;}
      if((m=/Passive Gold per minute decreased by (\d+)%/i.exec(text))){economyRules.passiveGoldPerMinute*=1-Number(m[1])/100;applied=true;}
      if((m=/^Gold bounties reduced by (\d+)%/i.exec(text))){economyRules.bountyMultiplier*=1-Number(m[1])/100;applied=true;}
      if((m=/^Melee Creeps (?:base )?gold bounty reduced by (\d+)/i.exec(text))){economyRules.creepBase-=Number(m[1])*.75;applied=true;}
      if((m=/^Melee creeps average gold bounty reduced by (\d+)/i.exec(text))){economyRules.creepBase-=Number(m[1])*.75;applied=true;}
      if((m=/^Range(?:d)? [Cc]reep(?:s)? (?:base )?(?:average )?gold bounty reduced (?:from (\d+) to (\d+)|by (\d+))/i.exec(text))){economyRules.creepBase-=(m[3]?Number(m[3]):Number(m[1])-Number(m[2]))*.25;applied=true;}
      if((m=/^Melee Creep Gold bounty increase per upgrade decreased from [\d.]+ to ([\d.]+)/i.exec(text))){economyRules.meleeGrowth=Number(m[1]);applied=true;}
      if((m=/^Range(?:d)? [Cc]reep(?:s)? (?:Gold bounty increase per upgrade|upgrade cycle gold bounty) (?:increased|changed|decreased) from \+?[\d.]+ to \+?([\d.]+)/i.exec(text))){economyRules.rangedGrowth=Number(m[1]);applied=true;}
      if(/^Reworked Gold Assist formula/.test(text)&&p.patch_number==='7.33'){economyRules.assistNetWorth=true;applied=true;}
      if(p.patch_number==='7.31'&&/^Neutral creeps now increase/.test(text)){economyRules.neutralGrowth=1;applied=true;}
      if(p.patch_number==='7.40'&&/^Melee Creep: Gold Bounty now increases by 1/.test(text)){economyRules.meleeGrowth=1;applied=true;}
    }
    if(applied)economyRules.sources.push({version:p.patch_number,url:s.url});
  }
  catalogue[patch.id].rules=economyRules;
  // Early Valve announcements identify heroes explicitly. Preserve all matching
  // gameplay bullets, excluding UI, bot AI and audio sections.
  const news = [...new Map(Object.values(source.sources).flatMap(x=>x.appnews?.newsitems ?? []).map(n=>[n.gid,n])).values()];
  const next = patches[patches.indexOf(patch)+1]?.startsOn ?? '2026-10-24';
  if (patch.year <= 2018) for (const n of news.filter(n=>new Date(n.date*1000).toISOString().slice(0,10)>=patch.startsOn && new Date(n.date*1000).toISOString().slice(0,10)<next)) {
    let section = '';
    const s={label:new Date(n.date*1000).toISOString().slice(0,10),url:`https://store.steampowered.com/news/app/570/view/${n.gid}`};
    const lines = n.contents.replace(/<br\s*\/?>|<\/?(?:ul|li)[^>]*>|\[\/?(?:list|\*)\]/gi,'\n').split(/\n/).map(plain).filter(Boolean);
    for (const line of lines) {
      if (/^[A-Z &/—-]{3,45}$/.test(line)) { section=line; continue; }
      if (!/GAMEPLAY|HEROES|BALANCE|ITEMS/.test(section) || /BOTS|UI|AUDIO|VISUAL/.test(section)) continue;
      const hero=heroes.find(h=>line.toLowerCase().startsWith(h.name.toLowerCase()+':'));
      if (hero) add({note:line.slice(hero.name.length+1)},'Hero rules',s,{kind:'hero',id:hero.id});
      else if (section==='GAMEPLAY' || section==='BALANCE' || section==='ITEMS') {
        if (/crash|server|client|performance|tooltip|courier|spectat|disconnect|pause|chat|lobb|matchmak/i.test(line)) continue;
        const item=Object.keys(itemRows).find(id=>line.toLowerCase().startsWith(itemRows[id].name.toLowerCase()+':'));
        add({note:line},item?itemRows[item].name:'General rules',s,{kind:item?'item':'general',...(item?{id:item}:{})});
      }
    }
  }
  // Snapshot diffs cover every changed kit/stat, including older patches whose
  // announcements link to retired patch pages. Do not call a later baseline a diff.
  const previous = catalogue[patches[patches.indexOf(patch)-1]?.id];
  if (previous && snapshot.date !== previous.source.date) {
    const s = {label:`Game files · ${snapshot.date}`,url:catalogue[patch.id].source.url};
    for (const [id,hero] of Object.entries(heroRows)) {
      const old=previous.heroes[id]; if (!old) continue;
      for (const ability of hero.kit) {
        const now=specs[ability],before=previous.abilities[ability];
        if (!old.kit.includes(ability)) add({note:`Added ${now.name}${now.granted?` as an Aghanim's ${now.granted} upgrade`:''}. ${effectSummary(now)}`},now.name,s,{kind:'hero',id,abilityId:ability});
        else if (JSON.stringify(now)!==JSON.stringify(before) && !changes.some(c=>c.id===id&&c.abilityId===ability)) {
          const lines=[];
          for (const [k,label] of [['cooldown','Cooldown'],['mana','Mana cost'],['damage','Damage'],['heal','Healing'],['stun','Stun duration'],['shield','Shield capacity'],['slow','Slow'],['duration','Effect duration']]) {
            if(JSON.stringify(now[k])!==JSON.stringify(before?.[k]) && (now[k].length||before?.[k]?.length)) {
              const a=now[k].at(-1)??0,b=before?.[k]?.at(-1)??0;
              lines.push(`${label} ${a>b?'increased':a<b?'reduced':'changed across ranks'}.`);
            }
          }
          if (lines.length) add({note:lines.join(' ')},now.name,s,{kind:'hero',id,abilityId:ability});
        }
      }
      for (const ability of old.kit.filter(a=>!hero.kit.includes(a))) add({note:`Removed ${previous.abilities[ability]?.name??pretty(ability)} from the main ability set.`},'Ability removed',s,{kind:'hero',id,abilityId:ability});
      const statLines=[];
      for(const [key,val]of Object.entries(hero.stats))if(val!==old.stats[key] && old.stats[key]!==undefined)statLines.push(`${pretty(key.replace('Attribute','').replace(/([a-z])([A-Z])/g,'$1 $2'))} ${val>old.stats[key]?'increased':'reduced'}.`);
      if(statLines.length&&!changes.some(c=>c.kind==='hero'&&c.id===id&&c.subject==='Base hero'))add({note:statLines.join(' ')},'Base hero',s,{kind:'hero',id});
      if(JSON.stringify(hero.talents)!==JSON.stringify(old.talents))add({note:'Talent choices changed. The source lists the replacement choices.'},'Talents',s,{kind:'hero',id});
    }
    for(const[id,item]of Object.entries(itemRows))if(JSON.stringify(item)!==JSON.stringify(previous.items[id])&&!changes.some(c=>c.kind==='item'&&c.id===id)){
      const old=previous.items[id];const bits=[];
      if(!old)bits.push('Added to the item catalogue.');
      else for(const[key,label]of [['cost','Price'],['attack','Attack damage'],['health','Durability'],['spells','Spell amplification'],['speed','Movement speed']])if(item[key]!==old[key])bits.push(`${label} ${item[key]>old[key]?'increased':'reduced'}.`);
      if(bits.length)add({note:bits.join(' ')},item.name,s,{kind:'item',id});
    }
  }
  changelog[patch.id]=[...new Map(changes.map(c=>[`${c.kind}:${c.id}:${c.subject}:${c.text}`,c])).values()];
  console.log(`${patch.id}: ${Object.keys(heroRows).length} kits, ${changes.length} changes`);
}
function effectSummary(a) {return [a.damage.length?'Deals spell damage.':'',a.heal.length?'Restores health.':'',a.stun.length?'Disables enemies.':'',a.summon?'Calls controlled units.':'',a.mobility?'Repositions the hero.':'',a.passive?'Passive effect.':''].filter(Boolean).join(' ');}
// Intern repeated ability definitions rather than bundling 32 copies of each.
const definitions=[], lookup=new Map();
function intern(spec){const key=JSON.stringify(spec);if(!lookup.has(key)){lookup.set(key,definitions.length);definitions.push(spec);}return lookup.get(key);}
for(const table of Object.values(catalogue)){
  table.signature=createHash('sha256').update(JSON.stringify(table)).digest('hex');
  const used=new Set(Object.values(table.heroes).flatMap(h=>[...h.kit,...h.talents]));
  table.abilities=Object.fromEntries([...used].filter(id=>table.abilities[id]).map(id=>{
    return[id,intern(table.abilities[id])];
  }));
  table.items=Object.fromEntries(Object.entries(table.items).map(([id,spec])=>[id,intern(spec)]));
}
writeFileSync(new URL('../src/data/combat-history.json',import.meta.url),JSON.stringify({definitions,patches:catalogue})+'\n');
writeFileSync(new URL('../src/data/patch-changelog.json',import.meta.url),JSON.stringify(changelog)+'\n');
