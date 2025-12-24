// Trophy Road League data (35 leagues total: 0-34)
// This data is collected from the Clash of Clans API
// Last updated: 2025-12-07T23:47:50.635Z

export interface TrophyRoadLeague {
  number: number
  id: number
  name: string
  iconUrl: string
  minTrophies: number
  maxTrophies: number
}

// Trophy Road Leagues in order (0-34)
// 0 = Unranked, 1-34 = Trophy Road Leagues
// To update this data, run: npm run update-leagues
export const TROPHY_ROAD_LEAGUES: TrophyRoadLeague[] = [
  {
    "number": 0,
    "id": 105000000,
    "name": "Unranked",
    "iconUrl": "https://api-assets.clashofclans.com/leaguetiers/125/yyYo5DUFeFBZvmMEQh0ZxvG-1sUOZ_S3kDMB7RllXX0.png",
    "minTrophies": 0,
    "maxTrophies": 4156
  },
  {
    "number": 1,
    "id": 105000001,
    "name": "Skeleton League 1",
    "iconUrl": "https://api-assets.clashofclans.com/leaguetiers/125/CiSJYHyhMuloCpIIJ3n5-xCnRWrEd9vcq_zu6Ahkl3o.png",
    "minTrophies": 0,
    "maxTrophies": 271
  },
  {
    "number": 2,
    "id": 105000002,
    "name": "Skeleton League 2",
    "iconUrl": "https://api-assets.clashofclans.com/leaguetiers/125/CmM-Tihn6ojPGJstmTK_HC-QairrpYLyRhdKhQjkacQ.png",
    "minTrophies": 0,
    "maxTrophies": 365
  },
  {
    "number": 3,
    "id": 105000003,
    "name": "Skeleton League 3",
    "iconUrl": "https://api-assets.clashofclans.com/leaguetiers/125/YMnWU25Xs2SvtAkVS2WDDbcUQY-PTfCK9OSvCKJnwJU.png",
    "minTrophies": 0,
    "maxTrophies": 0
  },
  {
    "number": 4,
    "id": 105000004,
    "name": "Barbarian League 4",
    "iconUrl": "https://api-assets.clashofclans.com/leaguetiers/125/CoTrW7nhyiNIDCI4WHUK-0BuhOxibwd_tfASdtmMWFE.png",
    "minTrophies": 0,
    "maxTrophies": 198
  },
  {
    "number": 5,
    "id": 105000005,
    "name": "Barbarian League 5",
    "iconUrl": "https://api-assets.clashofclans.com/leaguetiers/125/7Alm6gwA1lYoRn5m8vrXAfbTKIK2fFU7OxfYhYwWJYM.png",
    "minTrophies": 0,
    "maxTrophies": 212
  },
  {
    "number": 6,
    "id": 105000006,
    "name": "Barbarian League 6",
    "iconUrl": "https://api-assets.clashofclans.com/leaguetiers/125/pQHVG1p0IboE8Ggp0U1YR7U8dWhVn4YSS1zSPH61F0I.png",
    "minTrophies": 0,
    "maxTrophies": 269
  },
  {
    "number": 7,
    "id": 105000007,
    "name": "Archer League 7",
    "iconUrl": "https://api-assets.clashofclans.com/leaguetiers/125/x1c7byHQmOHQVKGxAn1sqOW2XOCzTYW-e6OKjq-FBco.png",
    "minTrophies": 0,
    "maxTrophies": 421
  },
  {
    "number": 8,
    "id": 105000008,
    "name": "Archer League 8",
    "iconUrl": "https://api-assets.clashofclans.com/leaguetiers/125/lzneKpnJ_ADL1Xb1rceH7-svqRN1UaLnI7ldd8BbyxI.png",
    "minTrophies": 0,
    "maxTrophies": 401
  },
  {
    "number": 9,
    "id": 105000009,
    "name": "Archer League 9",
    "iconUrl": "https://api-assets.clashofclans.com/leaguetiers/125/ieEdz9Mqbo7g9iJfXwTnIh7Iwz-37aPEmWma1ENEwXE.png",
    "minTrophies": 0,
    "maxTrophies": 292
  },
  {
    "number": 10,
    "id": 105000010,
    "name": "Wizard League 10",
    "iconUrl": "https://api-assets.clashofclans.com/leaguetiers/125/3kJYaYpDwKF8AEkwRLkm-947_t2mAhpEQcZJYulPPIA.png",
    "minTrophies": 0,
    "maxTrophies": 336
  },
  {
    "number": 11,
    "id": 105000011,
    "name": "Wizard League 11",
    "iconUrl": "https://api-assets.clashofclans.com/leaguetiers/125/XazuJHG2wjBq39KEA4g4hh1nKJQwVO0fRoVDPHvWwAY.png",
    "minTrophies": 0,
    "maxTrophies": 332
  },
  {
    "number": 12,
    "id": 105000012,
    "name": "Wizard League 12",
    "iconUrl": "https://api-assets.clashofclans.com/leaguetiers/125/A_ZoGbh1g8wYRWygsQ_wMgbVz8GXvvfavKwlSx8C8PQ.png",
    "minTrophies": 0,
    "maxTrophies": 419
  },
  {
    "number": 13,
    "id": 105000013,
    "name": "Valkyrie League 13",
    "iconUrl": "https://api-assets.clashofclans.com/leaguetiers/125/6BwmbzkNm6p2unZonTauFQ_683uNl4NYtoOXJmEs78c.png",
    "minTrophies": 0,
    "maxTrophies": 490
  },
  {
    "number": 14,
    "id": 105000014,
    "name": "Valkyrie League 14",
    "iconUrl": "https://api-assets.clashofclans.com/leaguetiers/125/7AbbZbiV6whmfa6CZtqt6Ml4NgFH1B-UqCxc59ziqfk.png",
    "minTrophies": 0,
    "maxTrophies": 450
  },
  {
    "number": 15,
    "id": 105000015,
    "name": "Valkyrie League 15",
    "iconUrl": "https://api-assets.clashofclans.com/leaguetiers/125/vT-0ssHYx5zJbBbbjB5NHPXnlHk76MDxJmG7iKmghc4.png",
    "minTrophies": 0,
    "maxTrophies": 436
  },
  {
    "number": 16,
    "id": 105000016,
    "name": "Witch League 16",
    "iconUrl": "https://api-assets.clashofclans.com/leaguetiers/125/a3zg3PSqri2WrWD8tGzKs0hJ5OrND1Rx1SJ45f5O0gE.png",
    "minTrophies": 0,
    "maxTrophies": 513
  },
  {
    "number": 17,
    "id": 105000017,
    "name": "Witch League 17",
    "iconUrl": "https://api-assets.clashofclans.com/leaguetiers/125/3mEMvpajLceJ3EKu7u_JIh_cOEsT7wyh701zum9hqCY.png",
    "minTrophies": 0,
    "maxTrophies": 485
  },
  {
    "number": 18,
    "id": 105000018,
    "name": "Witch League 18",
    "iconUrl": "https://api-assets.clashofclans.com/leaguetiers/125/GeLamlTvRYNnZp5lEW64pyaORN30rCdrxTjU7oJoTN8.png",
    "minTrophies": 0,
    "maxTrophies": 511
  },
  {
    "number": 19,
    "id": 105000019,
    "name": "Golem League 19",
    "iconUrl": "https://api-assets.clashofclans.com/leaguetiers/125/yS8XBv_a_SNtCpcofsWMFaojRNwO504Py7HyDCBCjYU.png",
    "minTrophies": 0,
    "maxTrophies": 524
  },
  {
    "number": 20,
    "id": 105000020,
    "name": "Golem League 20",
    "iconUrl": "https://api-assets.clashofclans.com/leaguetiers/125/uizNRh8glQZuAbLdCa-EQSf3oJnge3nqoXHjtQ6O8pw.png",
    "minTrophies": 127,
    "maxTrophies": 556
  },
  {
    "number": 21,
    "id": 105000021,
    "name": "Golem League 21",
    "iconUrl": "https://api-assets.clashofclans.com/leaguetiers/125/WkqDvnK0CXI-Nc0TNTKG_fSuzRYoLRC54HFOdMCxVTI.png",
    "minTrophies": 0,
    "maxTrophies": 587
  },
  {
    "number": 22,
    "id": 105000022,
    "name": "P.E.K.K.A League 22",
    "iconUrl": "https://api-assets.clashofclans.com/leaguetiers/125/iTWXPUUFQy0uEb7NDpMTyzGMFOJvlC4SLAqlHYgC8do.png",
    "minTrophies": 0,
    "maxTrophies": 546
  },
  {
    "number": 23,
    "id": 105000023,
    "name": "P.E.K.K.A League 23",
    "iconUrl": "https://api-assets.clashofclans.com/leaguetiers/125/0eDMQmsiZ0gs8xzViGfVETnYjwzgELTKwYhH3izevT4.png",
    "minTrophies": 112,
    "maxTrophies": 583
  },
  {
    "number": 24,
    "id": 105000024,
    "name": "P.E.K.K.A League 24",
    "iconUrl": "https://api-assets.clashofclans.com/leaguetiers/125/vxV7LI0votsz0_n-8lW-Lag96D5HwKsEgEk_7247zC4.png",
    "minTrophies": 457,
    "maxTrophies": 643
  },
  {
    "number": 25,
    "id": 105000025,
    "name": "Titan League 25",
    "iconUrl": "https://api-assets.clashofclans.com/leaguetiers/125/JLqVXdNkAGjD_yqMRDgu9KK-hDrulNPjsKU4EugHqX8.png",
    "minTrophies": 0,
    "maxTrophies": 691
  },
  {
    "number": 26,
    "id": 105000026,
    "name": "Titan League 26",
    "iconUrl": "https://api-assets.clashofclans.com/leaguetiers/125/yIfqSgrhiYRcuMbAPCoeCj1FTmfylCLxnrAljEZc8K0.png",
    "minTrophies": 0,
    "maxTrophies": 809
  },
  {
    "number": 27,
    "id": 105000027,
    "name": "Titan League 27",
    "iconUrl": "https://api-assets.clashofclans.com/leaguetiers/125/1AhObOl55grQIWnGmn1J9qMWq5pmRA3aBObfYkQEjko.png",
    "minTrophies": 0,
    "maxTrophies": 770
  },
  {
    "number": 28,
    "id": 105000028,
    "name": "Dragon League 28",
    "iconUrl": "https://api-assets.clashofclans.com/leaguetiers/125/YCZ7O_3_c8eCBYvX-92qiWeLc6Md6eNJ5A8O-2vUg7I.png",
    "minTrophies": 0,
    "maxTrophies": 1186
  },
  {
    "number": 29,
    "id": 105000029,
    "name": "Dragon League 29",
    "iconUrl": "https://api-assets.clashofclans.com/leaguetiers/125/DIMeRH3N4lrNObA3zAmk_eUin8nvNeLR89qYznnA--s.png",
    "minTrophies": 0,
    "maxTrophies": 1021
  },
  {
    "number": 30,
    "id": 105000030,
    "name": "Dragon League 30",
    "iconUrl": "https://api-assets.clashofclans.com/leaguetiers/125/g7m9aF8YoYj9b0olPsyT4eUIxyYEmkqr53wYxWmzpE4.png",
    "minTrophies": 417,
    "maxTrophies": 1164
  },
  {
    "number": 31,
    "id": 105000031,
    "name": "Electro League 31",
    "iconUrl": "https://api-assets.clashofclans.com/leaguetiers/125/qVORiRguZ-xMq8L0g7rE1-rZuiA-lKlI8VKuMndRy4w.png",
    "minTrophies": 478,
    "maxTrophies": 1494
  },
  {
    "number": 32,
    "id": 105000032,
    "name": "Electro League 32",
    "iconUrl": "https://api-assets.clashofclans.com/leaguetiers/125/iX8uNhG6jBcQATWFS8a0gtidGy9O1PRYtXZZMTtUK3U.png",
    "minTrophies": 259,
    "maxTrophies": 1521
  },
  {
    "number": 33,
    "id": 105000033,
    "name": "Electro League 33",
    "iconUrl": "https://api-assets.clashofclans.com/leaguetiers/125/VFqkaQimExWtSmIf9PC8WEpj4Vd58oLjPWyZqfVb5VE.png",
    "minTrophies": 463,
    "maxTrophies": 1397
  }
]

// Helper function to get league by number
export function getLeagueByNumber(leagueNumber: number): TrophyRoadLeague | undefined {
  return TROPHY_ROAD_LEAGUES.find(l => l.number === leagueNumber)
}

// Helper function to get league by trophy count
export function getLeagueByTrophies(trophies: number): TrophyRoadLeague | undefined {
  return TROPHY_ROAD_LEAGUES.find(
    l => trophies >= l.minTrophies && trophies <= l.maxTrophies
  )
}

// Default icon as fallback
export const DEFAULT_LEAGUE_ICON = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8Y2lyY2xlIGN4PSIzMiIgY3k9IjMyIiByPSIzMCIgZmlsbD0iIzY0NzQ4QiIvPgogIDxwYXRoIGQ9Ik0zMiAxNkwyNiA0MEwzMiAzNkwzOCA0MEwzMiAxNloiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPg=='
