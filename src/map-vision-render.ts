/** Collapse adjacent grid cells into horizontal SVG strips. Input is row-sorted. */
export function visionCellPath(cells:readonly [number,number][],size:number):string {
  const strips:string[]=[];
  let start=0,last=0,row=0,active=false;
  const flush=()=>{if(active)strips.push(`M${start},${row}h${last-start+size}v${size}h-${last-start+size}Z`);};
  for(const [x,y]of cells){
    if(active&&Math.abs(y-row)<.001&&Math.abs(x-last-size)<.001){last=x;continue;}
    flush();start=last=x;row=y;active=true;
  }
  flush();return strips.join('');
}
