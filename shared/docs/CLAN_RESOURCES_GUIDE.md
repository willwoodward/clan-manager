# Clan Resources Calculation Guide

This document contains the formulas and reference data for calculating various clan resources.

## Raid Medals

There are 2 types of raid medals: defensive and offensive.

### Defensive Raid Medals

For each enemy that attacks your capital, the number of troop housing space destroyed by your defenses across all districts and capital (the entire raid) is tallied up.

Whichever capital raid defense scored the highest (usually the one that required the most number of enemy attacks) becomes the baseline; that number is divided by 25 and rounded up to the nearest whole integer if necessary, and that becomes your defensive raid medals award.

**Formula**: `defensive_medals = ceil(max_troop_housing_space_destroyed / 25)`

**Note**: This calculation may not be correct in some edge cases. Defensive raid medal testing is significantly harder than offensive.

### Offensive Raid Medals

Each District & Capital Peak your clan defeats is worth a fixed amount of raid medals for the clan. There's no credit for partially destroyed districts and no credit for partially destroyed capital peaks.

#### District Values (by District Hall level)
- DH1: 135 medals
- DH2: 225 medals
- DH3: 350 medals
- DH4: 405 medals
- DH5: 460 medals

#### Capital Peak Values (by Capital Hall level)
- CH2: 180 medals
- CH3: 360 medals
- CH4: 585 medals
- CH5: 810 medals
- CH6: 1115 medals
- CH7: 1240 medals
- CH8: 1260 medals
- CH9: 1375 medals
- CH10: 1450 medals

#### Distribution

At the end of the weekend, the clan's total earned raid medals are divided by total attacks (from the entire clan) to arrive at a value-per-attack. This number is rounded up to the next whole integer.

This rounded-up number becomes the value of each attack, and then each individual gets that number multiplied by the number of attacks they did, with a maximum of 6 attacks per player.

**Formula**:
```
medals_per_attack = ceil(total_clan_raid_medals / total_clan_attacks)
player_offensive_medals = medals_per_attack * min(player_attacks, 6)
```

---

## CWL (Clan War League) Medals

### League Medal Rewards by Position and League

| War League   | 1st | 2nd | 3rd | 4th | 5th | 6th | 7th | 8th | Bonuses | Bonus Value |
|--------------|-----|-----|-----|-----|-----|-----|-----|-----|---------|-------------|
| Bronze III   | 34  | 32  | 30  | 28  | 26  | 24  | 22  | 20  | 1       | 35          |
| Bronze II    | 46  | 44  | 42  | 40  | 38  | 36  | 34  | 32  | 1       | 35          |
| Bronze I     | 58  | 56  | 54  | 52  | 50  | 48  | 46  | 44  | 1       | 35          |
| Silver III   | 76  | 73  | 70  | 67  | 64  | 61  | 58  | 55  | 1       | 40          |
| Silver II    | 94  | 91  | 88  | 85  | 82  | 79  | 76  | 73  | 1       | 40          |
| Silver I     | 112 | 109 | 106 | 103 | 100 | 97  | 94  | 91  | 1       | 45          |
| Gold III     | 136 | 132 | 128 | 124 | 120 | 116 | 112 | 108 | 2       | 50          |
| Gold II      | 160 | 156 | 152 | 148 | 144 | 140 | 136 | 132 | 2       | 55          |
| Gold I       | 184 | 180 | 176 | 172 | 168 | 164 | 160 | 156 | 2       | 60          |
| Crystal III  | 214 | 209 | 204 | 199 | 194 | 189 | 184 | 179 | 2       | 65          |
| Crystal II   | 244 | 239 | 234 | 229 | 224 | 219 | 214 | 209 | 2       | 70          |
| Crystal I    | 274 | 269 | 264 | 259 | 254 | 249 | 244 | 239 | 2       | 75          |
| Master III   | 310 | 304 | 298 | 292 | 286 | 280 | 274 | 268 | 3       | 80          |
| Master II    | 346 | 340 | 334 | 328 | 322 | 316 | 310 | 304 | 3       | 85          |
| Master I     | 382 | 376 | 370 | 364 | 358 | 352 | 346 | 340 | 3       | 90          |
| Champion III | 424 | 417 | 410 | 403 | 396 | 389 | 382 | 375 | 4       | 95          |
| Champion II  | 466 | 459 | 452 | 445 | 438 | 431 | 424 | 417 | 4       | 100         |
| Champion I   | 508 | 501 | 494 | 487 | 480 | 473 | 466 | 459 | 4       | 105         |

**Notes**:
- Medal rewards vary by final league position (1st through 8th)
- Higher leagues offer more guaranteed bonus medals per player
- Bonus medals are awarded to select players chosen by clan leadership

---

## Clan Games

### Tier Thresholds

Clan Games have 6 reward tiers based on total clan points:

1. Tier 1: 3,000 points
2. Tier 2: 7,500 points
3. Tier 3: 12,000 points
4. Tier 4: 18,000 points
5. Tier 5: 30,000 points
6. Tier 6: 50,000 points

Higher tiers unlock better reward options for clan members.

---

## Capital Gold Ores

Capital Gold is earned from Clan Capital Raid Weekends based on war performance.

### Ore Distribution Formula

**Win**: 100% of possible ores
**Loss/Draw**: 40% of possible ores

The amount of ores available depends on the total districts and capital peaks completed, and is distributed based on individual player contributions during the raid weekend.

**Note**: The maximum possible ore value scales with Town Hall levels. Higher TH levels can earn more capital gold from raids.

### Rolling 30-Day Calculation

To estimate ore earnings over time, calculate based on all wars in the past 30 days:
```
total_ores = sum(war_ores for each war in last 30 days)
where war_ores = max_possible_ores * (1.0 if won else 0.4)
```

---

## References

- Raid Medal calculations source: Community raid medal guide (updated model)
- CWL Medal table source: Official Clash of Clans wiki
- Clan Games tiers: Official Clash of Clans game data
- Capital Gold mechanics: Clan Capital update documentation
