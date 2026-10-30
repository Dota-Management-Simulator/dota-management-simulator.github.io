/** Reproduce the factual terrain grid exports used by the match engine.
 * No third-party simulator code is bundled. Raw downloads stay in .local.
 * Original data exporter: https://github.com/leamare/dota-map-coordinates
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const current = 'f793787ecf402f52c9e698da260b02f041256898';
const definitions = [
  ['700', '518692e3dcc25efcbdcbe94163b77658bd94a88c', 'map_data.png', -8288],
  ...['707','720','723','732'].map(id => [id,current,`map_data_${id}.png`,-8288]),
  ...['733','738','740'].map(id => [id,current,`map_data_${id}.png`,-10464]),
];
await mkdir('.local/terrain-source', { recursive:true });

function png(buffer) {
  let width=0,height=0,bpp=4,palette=null; const parts=[];
  for(let offset=8;offset<buffer.length;) {
    const length=buffer.readUInt32BE(offset),name=buffer.toString('ascii',offset+4,offset+8),body=buffer.subarray(offset+8,offset+8+length);
    if(name==='IHDR') { width=body.readUInt32BE(0);height=body.readUInt32BE(4);bpp=body[9]===3?1:body[9]===2?3:4;if(body[8]!==8 || ![2,3,6].includes(body[9]) || body[12]!==0)throw Error('Expected RGB8/RGBA8/indexed8 PNG'); }
    if(name==='PLTE')palette=body;
    if(name==='IDAT')parts.push(body);
    offset+=12+length;
  }
  const raw=inflateSync(Buffer.concat(parts)),decoded=new Uint8Array(width*height*bpp),stride=width*bpp;
  for(let y=0;y<height;y++)for(let x=0;x<stride;x++) {
    const type=raw[y*(stride+1)],a=x>=bpp?decoded[y*stride+x-bpp]:0,b=y?decoded[(y-1)*stride+x]:0,c=x>=bpp&&y?decoded[(y-1)*stride+x-bpp]:0;
    let predictor=0;
    if(type===1)predictor=a;else if(type===2)predictor=b;else if(type===3)predictor=(a+b)>>1;
    else if(type===4) { const p=a+b-c,da=Math.abs(p-a),db=Math.abs(p-b),dc=Math.abs(p-c);predictor=da<=db&&da<=dc?a:db<=dc?b:c; }
    else if(type!==0)throw Error('Invalid PNG filter');
    decoded[y*stride+x]=(raw[y*(stride+1)+1+x]+predictor)&255;
  }
  const pixels=new Uint8Array(width*height*4);
  for(let i=0;i<width*height;i++){const source=palette??decoded,at=palette?decoded[i]*3:i*bpp;pixels[i*4]=source[at];pixels[i*4+1]=source[at+1];pixels[i*4+2]=source[at+2];pixels[i*4+3]=255;}
  return {width,height,pixels};
}

const maps={},sources=[];
for(const [id,commit,file,worldMin]of definitions) {
  const url=`https://raw.githubusercontent.com/leamare/dota-map-coordinates/${commit}/img/${file}`;
  const cache=`.local/terrain-source/${id}.png`;
  let buffer;try{buffer=await readFile(cache);}catch{const response=await fetch(url);if(!response.ok)throw Error(`${url}: ${response.status}`);buffer=Buffer.from(await response.arrayBuffer());await writeFile(cache,buffer);}
  const {width,height:n,pixels}=png(buffer),panels=width/n;
  if(!Number.isInteger(panels)||panels<4)throw Error(`Unexpected map panel count: ${panels}`);
  // File orientation follows image/SVG: north at row zero. Tree corner pixels
  // occupy the 2x2 tiles below-left in world space (above-left in image space).
  const values=new Uint32Array(n*n),tops=new Uint16Array(n*n);
  const rgb=(panel,x,y)=>{const at=(y*width+panel*n+x)*4;return pixels.subarray(at,at+3);};
  for(let y=0;y<n;y++)for(let x=0;x<n;x++) {
    const [r,g,b]=rgb(1,x,y);
    if(g===0&&b===0)for(const tx of[x-1,x])for(const ty of[y,y+1])if(tx>=0&&ty<n)tops[ty*n+tx]=Math.max(tops[ty*n+tx],r+40);
  }
  for(let y=0;y<n;y++)for(let x=0;x<n;x++) {
    const i=y*n+x,height=rgb(0,x,y)[0],walk=rgb(2,x,y)[0]>0,block=rgb(3,x,y)[0]===0,noWard=panels>=5&&rgb(4,x,y)[0]===0;
    values[i]=height | (tops[i]<<8) | (Number(walk)<<17) | (Number(block)<<18) | (Number(noWard)<<19);
  }
  const runs=[];let previous=values[0],count=0;
  for(const value of values){if(value===previous)count++;else{runs.push(`${previous.toString(36)}.${count.toString(36)}`);previous=value;count=1;}}
  runs.push(`${previous.toString(36)}.${count.toString(36)}`);
  const actualMin=n===260?-8288:worldMin===-8288?-10464:worldMin;
  maps[id]={n,worldMin:actualMin,worldMax:actualMin+(n-1)*64,runs:runs.join(',')};
  sources.push({era:id,source:url,sha256:createHash('sha256').update(buffer).digest('hex'),grid:n,tileWorldUnits:64,hasNoWardPanel:panels>=5});
  console.log(`${id}: ${n}², ${runs.length} runs`);
}
await writeFile('src/data/map-terrain.json',JSON.stringify(maps));
await writeFile('docs/map-terrain-sources.json',JSON.stringify({retrievedOn:'2026-10-26',source:'Valve terrain exported by leamare/dota-map-coordinates; factual grid values, no exporter/simulator source copied',alignment:'World x /20 +400, world y /-20 +400; same cropped central map frame as the source overviews. Early 6.x grids are separately traced.',sources},null,2)+'\n');
