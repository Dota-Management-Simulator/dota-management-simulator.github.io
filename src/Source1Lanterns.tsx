/** Original vector approximation of the 2015 lantern dashboard surround. */
export default function Source1Lanterns() {
  return <svg className="source1-lanterns" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><radialGradient id="lantern-light"><stop stopColor="#ffb348" /><stop offset=".55" stopColor="#e45726" /><stop offset="1" stopColor="#811c14" /></radialGradient></defs>
    {[[20, 285, 1.5], [100, 560, 1], [1485, 175, 1.1], [1590, 505, 1.7], [1550, 820, 1.25], [1080, 80, .6]].map(([x, y, scale]) => <g key={x} transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M0-300V-66" stroke="#9b742d" strokeWidth="2" /><ellipse rx="47" ry="64" fill="url(#lantern-light)" stroke="#71351d" strokeWidth="3" />
      <g fill="none" stroke="#9c3220" strokeWidth="3"><ellipse rx="25" ry="64" /><path d="M0-64V64M-42-28Q0-11 42-28M-47 0Q0 15 47 0M-40 33Q0 48 40 33" /></g><path d="M-15-65H15M-16 65H16" stroke="#b78136" strokeWidth="9" /><path d="M0 71V110M-8 91V125M8 91V125" stroke="#c16b29" strokeWidth="4" />
    </g>)}
    <path d="M0 940L0 740 12 727 6 714 15 707 10 694 23 686 30 670 37 686 50 694 45 707 54 714 48 727 61 740 61 940M1530 1000V830L1543 817 1537 804 1548 794 1543 782 1555 773 1565 752 1575 773 1587 782 1582 794 1593 804 1587 817 1600 830V1000" fill="#231421" stroke="#75452e" strokeWidth="3" />
  </svg>;
}
