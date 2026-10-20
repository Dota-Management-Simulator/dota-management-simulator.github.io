# Lane Siege: Dota-inspired MOBA team management simulator

A single-file browser game. Two teams of five heroes auto-battle across three lanes, while you run a club: budget, five players and a staff.

## Run it

Open `index.html` in any modern browser. No build step or dependencies.

## What is in it

- Auto-battle sim with creep waves, towers, ancients, levels, respawns and auto-cast abilities
- 128 original heroes (36 Strength, 35 Agility, 34 Intelligence, 23 Universal) using Dota-style attribute rules
- Club management: players with skill and wages, free agents, staff (coach, analyst, physio), prize money
- Progress is saved in the browser (localStorage)

## Hero data

The roster is generated in the script from role templates (`SP`) and name prefixes (`PRE`). Hero names are original.
