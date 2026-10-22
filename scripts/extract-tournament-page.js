// Read-only DOM extraction, run through the browser research tab. This module
// does not fetch pages, execute page scripts, or infer missing historical facts.
() => {
  const section = (id) => {
    const heading = document.getElementById(id);
    const parts = [];
    for (let node = heading?.parentElement?.nextElementSibling; node; node = node.nextElementSibling) {
      if (node.querySelector('h2') || node.matches('h2')) break;
      parts.push(node.innerText);
    }
    return parts.join('\n');
  };
  const headingBefore = (element) => {
    for (let node = element; node; node = node.parentElement) {
      for (let sibling = node.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
        if (sibling.matches('h2,h3,h4')) return sibling.textContent;
        const headings = [...sibling.querySelectorAll('h2,h3,h4')];
        if (headings.length) return headings.at(-1).textContent;
      }
    }
    return '';
  };
  const info = document.querySelector('.fo-nttax-infobox');
  return {
    pageTitle: document.title,
    url: location.href,
    info: info?.innerText ?? '',
    fields: Object.fromEntries([...info?.querySelectorAll('.infobox-description') ?? []].map(d =>
      [d.textContent.trim().replace(/:$/, ''), d.nextElementSibling?.textContent.trim()])),
    format: section('Format'),
    prizes: [...document.querySelectorAll('.prizepooltable')].map(table => ({
      headers: [...table.querySelectorAll('th')].map(x => x.textContent),
      rows: [...table.querySelectorAll('tr')].map(row => ({
        place: row.querySelector('.prizepooltable-place')?.textContent,
        cells: [...row.querySelectorAll('td')].map(x => x.textContent),
        links: [...row.querySelectorAll('td a')].map(a => ({name: a.textContent, url: a.href})),
      })).filter(row => row.cells.length),
    })),
    participants: [...document.querySelectorAll('.team-participant-card')].map(card => ({
      name: card.querySelector('.team-participant-card__header-main')?.innerText,
      text: card.textContent,
      links: [...card.querySelectorAll('a')].map(a => ({name: a.textContent, url: a.href})),
    })),
    groups: [...document.querySelectorAll('.grouptable')].map(table => ({
      name: table.querySelector('th')?.textContent.trim(),
      heading: headingBefore(table),
      rows: [...table.querySelectorAll('tr')].filter(row => row.querySelector('.grouptableslot')).map(row => ({
        rank: row.querySelector('th')?.textContent.trim(),
        team: row.querySelector('.grouptableslot .team-template-text')?.textContent.trim(),
        teamUrl: row.querySelector('.grouptableslot .team-template-text a')?.href,
        label: row.className,
      })),
    })),
    brackets: [...document.querySelectorAll('.brkts-bracket')].map(bracket => ({
      heading: headingBefore(bracket),
      matches: [...bracket.querySelectorAll('.brkts-match')].map(match => ({
        teams: [...match.querySelectorAll(':scope > .brkts-opponent-entry')].map(x => x.getAttribute('aria-label') ?? x.querySelector('.team-name')?.textContent),
        scores: [...match.querySelectorAll(':scope > .brkts-opponent-entry .brkts-opponent-score-inner')].map(x => x.textContent),
        timestamp: match.querySelector('[data-timestamp]')?.getAttribute('data-timestamp'),
        details: match.querySelector('.brkts-popup')?.textContent,
        round: match.closest('.brkts-column')?.querySelector('.brkts-header')?.textContent,
      })),
    })),
    matchlists: [...document.querySelectorAll('.brkts-matchlist')].map(list => ({
      name: list.querySelector('.brkts-matchlist-title')?.textContent,
      heading: headingBefore(list),
      matches: [...list.querySelectorAll('.brkts-matchlist-match')].map(match => ({
        teams: [...match.querySelectorAll(':scope > .brkts-matchlist-opponent')].map(x => x.getAttribute('aria-label')),
        scores: [...match.querySelectorAll(':scope > .brkts-matchlist-score')].map(x => x.textContent),
        timestamp: match.querySelector('[data-timestamp]')?.getAttribute('data-timestamp'),
        details: match.querySelector('.brkts-popup')?.textContent,
      })),
    })),
    links: [...document.querySelectorAll('a')].filter(a => a.href.startsWith(location.origin + location.pathname + '/') && !a.href.includes('#') && !/action=|\/Statistics|\/Team_Rosters/.test(a.href)).map(a => ({name: a.textContent.trim(), url: a.href})).filter(x => x.name),
    stageLinks: [...document.querySelectorAll('a')].filter(a => a.href.startsWith(location.origin + '/dota2/') && !a.href.includes('#') && !/index.php|Portal:|Qualifier_Tournaments|Statistics/.test(a.href) && /Group Stage|Playoffs|Main Event|Phase [123]|Qualifiers?|Wild Card|Round of/i.test(a.textContent)).map(a => ({name: a.textContent.trim(), url: a.href})),
    sections: [...document.querySelectorAll('h2,h3')].map(x => x.id),
  };
}
