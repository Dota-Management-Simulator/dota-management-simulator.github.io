/** Original vector silhouettes after the seasonal client captures. These are
 * scenery, never screenshots containing somebody else's profile or chat. */
export default function Source1Scenery({ winter = false }: { winter?: boolean }) {
  const fir = "M0 0 -15 38 -6 35 -28 65 -15 61 -42 98 -23 93 -54 133 -12 124 -12 155 12 155 12 124 54 133 23 93 42 98 15 61 28 65 6 35 15 38Z";
  const branch = "M0 1000C45 800 78 600 64 390L43 195 4 84 53 178 66 285 106 205 134 95 116 221 78 330 95 469 155 380 195 335 222 235 211 350 166 405 111 514 105 618 175 562 250 528 303 456 264 535 183 584 112 683 100 814 65 1000Z";
  return <svg className={`source1-scenery${winter ? " is-winter" : ""}`} viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    {winter ? <>
      <g className="scenery-distance">{[[-15, 330, 2], [105, 390, 1.6], [255, 460, 1.3], [1390, 400, 1.8], [1550, 310, 2.2]].map(([x, y, scale]) => <path key={x} d={fir} transform={`translate(${x} ${y}) scale(${scale})`} />)}</g>
      <g className="scenery-near">{[[-25, 350, 3.8], [105, 530, 3.4], [1490, 490, 3.5], [1615, 300, 4.3]].map(([x, y, scale]) => <path key={x} d={fir} transform={`translate(${x} ${y}) scale(${scale})`} />)}</g>
      <path className="scenery-ground" d="M0 910Q210 850 420 960Q880 870 1120 940Q1400 825 1600 900V1000H0Z" />
    </> : <>
      <g className="scenery-distance"><path d={branch} transform="translate(60 20) scale(.7 1)" /><path d={branch} transform="translate(1500 40) scale(-.8 1)" /></g>
      <g className="scenery-near"><path d={branch} /><path d={branch} transform="translate(1600 0) scale(-1 1)" /><path d="M0 95Q190 160 390 70L500 40 399 90 334 137 318 177 327 124 255 146 140 162 0 130ZM1600 67Q1430 145 1250 98L1130 29 1253 72 1380 83 1470 65 1600 30Z" /></g>
    </>}
  </svg>;
}
