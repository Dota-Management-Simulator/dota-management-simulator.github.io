import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const commits={700:'518692e3dcc25efcbdcbe94163b77658bd94a88c',707:'ced5c8805673901d919f70c57ed695cc87244b82',720:'eeadf2e83653d13134ccd90c58ae3522a742546c',723:'666c8ab64d232020c0e6b856681e1399ba9cdfd9',732:'70396739d34584eae82806469c310e60dddf2eed',733:'707103df338c04854c2a3c466df8afa9eeaf7e27',738:'706ab702eb131f395699ae85d427903c8f975375',740:'840f0f2e7983e5135a3e29443431ce093981e17b'};
await mkdir('.local/terrain-source',{recursive:true});
const maps={},sources=[];
// Stable entity dump ordering verified against named 7.32 raw entities. The
// early processed exports retain coordinates but strip name/team metadata.
const labels=['r3b','r3m','r3t','r2b','r1b','r2m','r2t','r1t','r4t','d4t','d2t','d1t','d2m','d1m','d2b','d3b','d3t','d3m','d4b','r4b','r1m','d1b'];
const barrackLabels=['rmm','rmr','rbm','rbr','rtm','rtr','dbm','dbr','dmr','dmm','dtm','dtr'];
const list=v=>Array.isArray(v)?v:Object.values(v);
const xy=v=>[v.x,v.y??v['1']];
for(const[id,commit]of Object.entries(commits)) {
  let buffer,url=`https://raw.githubusercontent.com/leamare/dota-map-coordinates/${commit}/${['700','732'].includes(id)?'data/':''}mapdata.json`;
  const cache=`.local/terrain-source/structures-raw-${id}.json`;
  try{buffer=await readFile(cache);}catch{const r=await fetch(url);if(!r.ok)throw Error(`${url}: ${r.status}`);buffer=Buffer.from(await r.arrayBuffer());await writeFile(cache,buffer);}
  const parsed=JSON.parse(buffer),d=parsed.data??parsed,towers=list(d.npc_dota_tower),rax=list(d.npc_dota_barracks),forts=list(d.npc_dota_fort);
  if(towers.length!==22||rax.length!==12||forts.length!==2)throw Error(`Incomplete structures ${id}`);
  const result={bases:[null,null],towers:Array.from({length:2},()=>Array.from({length:3},()=>[null,null,null])),tier4:[[],[]],barracks:Array.from({length:2},()=>Array.from({length:3},()=>[null,null]))};
  for(const fort of forts)result.bases[fort.x<0?0:1]=xy(fort);
  towers.forEach((tower,index)=>{
    const name=tower.name,label=labels[index];
    const team=name?(name.includes('goodguys')?0:1):(label[0]==='r'?0:1);
    const tier=Number(name?.match(/tower(\d)/)?.[1]??label[1]);
    const lane=name?(name.endsWith('_top')?0:name.endsWith('_mid')?1:2):({t:0,m:1,b:2}[label[2]]);
    if(tower.subType&&tower.subType!==`tower${tier}`)throw Error(`Unexpected tower ordering ${id}/${index}`);
    if(tier===4)result.tier4[team].push(xy(tower));else result.towers[team][lane][tier-1]=xy(tower);
  });
  rax.forEach((b,index)=>{
    const name=b.name,label=barrackLabels[index],team=name?(name.startsWith('good')?0:1):label[0]==='r'?0:1;
    const lane=name?(name.endsWith('_top')?0:name.endsWith('_mid')?1:2):({t:0,m:1,b:2}[label[1]]);
    const kind=name?(name.includes('_melee_')?0:1):(label[2]==='m'?0:1);
    if(b.subType&&b.subType!==(kind===0?'melee':'range'))throw Error(`Unexpected barrack ordering ${id}/${index}`);
    result.barracks[team][lane][kind]=xy(b);
  });
  if(JSON.stringify(result).includes('null'))throw Error(`Unmapped building ${id}`);
  maps[id]=result;sources.push({era:id,source:url,sha256:createHash('sha256').update(buffer).digest('hex')});
}
await writeFile('src/data/map-structures.json',JSON.stringify(maps));
await writeFile('docs/map-structure-sources.json',JSON.stringify({retrievedOn:'2026-10-26',coordinates:'Original world coordinates; transform x/20+400,400-y/20. 22 towers,12 barracks,2 Ancients per era.',sources},null,2)+'\n');
