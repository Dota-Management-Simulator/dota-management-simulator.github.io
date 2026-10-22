import baseline from "./data/rosters-2011.json";
import y2012 from "./data/rosters/2012.json";
import y2013 from "./data/rosters/2013.json";
import y2014 from "./data/rosters/2014.json";
import y2015 from "./data/rosters/2015.json";
import y2016 from "./data/rosters/2016.json";
import y2017 from "./data/rosters/2017.json";
import y2018 from "./data/rosters/2018.json";
import y2019 from "./data/rosters/2019.json";
import y2020 from "./data/rosters/2020.json";
import y2021 from "./data/rosters/2021.json";
import y2022 from "./data/rosters/2022.json";
import y2023 from "./data/rosters/2023.json";
import y2024 from "./data/rosters/2024.json";
import y2025 from "./data/rosters/2025.json";
import y2026 from "./data/rosters/2026.json";

export const rosterBatches = [y2012, y2013, y2014, y2015, y2016, y2017, y2018,
  y2019, y2020, y2021, y2022, y2023, y2024, y2025, y2026];
export const LAST_ROSTER_YEAR = 2026;
export const HISTORICAL_YEARS = [2011, ...rosterBatches.map((b) => b.year)];
export const rosterBatchFor = (year: number) => rosterBatches.find((b) => b.year === year);
export const rosterSources = [...baseline.sources, ...rosterBatches.flatMap((b) => b.sources)];
