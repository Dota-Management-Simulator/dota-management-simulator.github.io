"""Read regular-stage formats without borrowing qualifier/tiebreak rules."""
import re


def group_descriptions(text):
    text = re.split(r"^(?:Prize\s*(?:pool|distribution)|Broadcast Talent|Participating Teams)(?:\[edit\])?\s*$", text, flags=re.I | re.M)[0]
    text = re.sub(r"(?<=[.!])\s+(?=(?:Playoffs|Seeding Deciders|Main Event):)", "\n", text)
    sections = []
    title, lines = "", []
    heading = re.compile(r"^(?:Preliminaries \(Group Stage\)|Group Stage(?:\s*#?\s*\d+)?|(?:First|Second) Group Stage|Group Play|League Play|Online League|Offline Finals|LAN Finals|Main Event|Main Tournament|Playoffs?|Seeding Deciders|Wild\s*Card|(?:Qualifying Tournament|(?:Open|Main|Regional|Online) Qualifiers?))(?:\s*[:\-–].*)?$", re.I)
    for line in text.splitlines():
        line = re.sub(r"\[[^\]]*\]", "", line).strip()
        if heading.fullmatch(line):
            sections.append((title, "\n".join(lines)))
            title, lines = line, [line.split(":", 1)[1]] if ":" in line else []
        else:
            lines.append(line)
    sections.append((title, "\n".join(lines)))
    groups = [(title, body) for title, body in sections if re.match(r"(?:Preliminaries|Group|First Group|Second Group|League Play|Online League|Offline Finals|LAN Finals)", title, re.I)]
    if groups:
        return groups
    main = [(title, body) for title, body in sections if re.match(r"LAN Finals|Main Tournament|Main Event", title, re.I)]
    return main or sections[:1]


def is_gsl(description):
    if not re.search(r"\bGSL\b|\bgroups?\b", description, re.I):
        return False
    return bool(re.search(r"\bGSL\b|double.elimination groups?|(?:each group|groups?\b)[^\n]{0,100}(?:played|play|using)[^\n]{0,50}double.elimination|^Double.elimination format", description, re.I | re.M))


def group_format(text, stage=0, name=""):
    sections = group_descriptions(text)
    chosen = next((section for section in sections if name.lower() == section[0].lower()), None)
    if chosen is None and re.search(r"league", name, re.I):
        chosen = next((section for section in sections if re.match(r"Online League|League Play", section[0], re.I)), None)
    # A finals table must not borrow the preceding regional/online league rules.
    actual_groups = [section for section in sections if re.match(r"Preliminaries|Group|First Group|Second Group", section[0], re.I)]
    if not actual_groups:
        actual_groups = [section for section in sections if re.match(r"Offline Finals|LAN Finals", section[0], re.I) and re.search(r"groups?|round.robin", section[1], re.I)]
    candidates = actual_groups or sections
    title, description = chosen or candidates[min(stage, len(candidates) - 1)]
    description = re.split(r"\nThe playoffs?\b", description, flags=re.I)[0]
    gsl = is_gsl(description)
    # A paragraph describing extra tie games cannot define regular meetings.
    regular = re.split(r"Tie.?break|Individual game result|In case of a .*way.?tie", description, flags=re.I)[0]
    fixed = re.search(r"\b([23])[ -]game series", regular, re.I)
    match = re.search(r"\bBo([123])\b|best[ -]of[ -](1|2|3|one|two|three)\b", regular, re.I)
    value = (match[1] or match[2]).lower() if match else None
    games = int(value) if value and value.isdigit() else {"one": 1, "two": 2, "three": 3}.get(value)
    if fixed:
        games = int(fixed[1])
    if games is None and (re.search(r"2\s*-\s*0.*1\s*-\s*1.*0\s*-\s*2", regular, re.S) or re.search(r"plays? two games against", regular, re.I)):
        games = 2
    if games is None and re.search(r"plays? one game against", regular, re.I):
        games = 1
    if games is None and re.search(r"play.*other.*(?:2|two) times", regular, re.I):
        games = 2
    legs = 2 if re.search(r"double round.robin|(?:each other|every (?:other )?team).*twice", regular, re.I) else 1
    return {"games": games, "legs": legs, "gsl": gsl, "fixedMaps": int(fixed[1]) if fixed else None, "description": description}


def starting_advantage(details):
    if re.search(r"\b(?:no|without) (?:a )?(?:one|1)[ -](?:game|map) advantage", details, re.I):
        return False
    return bool(re.search(r"1\s*[-–:.]\s*0\s*(?:lead|advantage)|(?:one|1)[ -](?:game|map) (?:advantage|lead)", details, re.I))
