/**
 * Script to collect Trophy Road League data from the Clash of Clans API
 *
 * This script queries random clans and extracts league information from their members
 * to build a comprehensive database of all 34 trophy road leagues with their icons.
 *
 * Usage: node scripts/update-leagues.js
 *
 * Make sure you have your VITE_CLASH_API_KEY set in your .env file
 */

import axios from 'axios'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const API_KEY = process.env.VITE_CLASH_API_KEY
const API_BASE_URL = 'http://localhost:3001/api'

if (!API_KEY) {
  console.error('Error: VITE_CLASH_API_KEY not found in .env file')
  process.exit(1)
}

// Helper to encode clan tags
function encodeClanTag(tag) {
  return encodeURIComponent(tag.replace('#', ''))
}

// Extract league number from name
function getLeagueNumber(leagueName) {
  // Check for "Unranked" first
  if (leagueName.toLowerCase().includes('unranked')) {
    return 0
  }
  const match = leagueName.match(/(\d+)$/)
  return match ? parseInt(match[1]) : -1 // Return -1 if no number found (to distinguish from unranked)
}

async function searchClans(params = {}) {
  try {
    const response = await axios.get(`${API_BASE_URL}/clans`, {
      params: {
        limit: 50,
        minMembers: 30,
        ...params
      }
    })
    return response.data.items || []
  } catch (error) {
    console.error('Error searching clans:', error.message)
    return []
  }
}

async function getClanMembers(clanTag) {
  try {
    const encodedTag = encodeClanTag(clanTag)
    const response = await axios.get(`${API_BASE_URL}/clans/${encodedTag}`)
    return response.data.memberList || []
  } catch (error) {
    console.error(`Error fetching clan ${clanTag}:`, error.message)
    return []
  }
}

async function collectLeagueData() {
  const leagueMap = new Map()
  let clansProcessed = 0
  let membersProcessed = 0
  const targetClans = 35 // Increased to find Legend League

  console.log('Starting league data collection...')
  console.log(`Target: ${targetClans} clans\n`)

  // Search for clans with different trophy requirements to get a diverse sample
  // Focus heavily on very high trophy clans to find Legend League (34) players
  const trophyRanges = [
    { minClanTrophies: 70000 }, // Elite clans - most likely to have Legend players
    { minClanTrophies: 65000 },
    { minClanTrophies: 60000 },
    { minClanTrophies: 55000 },
    { minClanTrophies: 50000 },
    { minClanTrophies: 30000 },
    { minClanTrophies: 0 },
  ]

  for (const range of trophyRanges) {
    if (clansProcessed >= targetClans) break
    // Early exit if we found all leagues including Legend (34)
    if (leagueMap.has(34) && leagueMap.size >= 35) {
      console.log('\n✓ Found all 35 leagues including Legend League! Stopping early.')
      break
    }

    console.log(`\nSearching clans with minClanTrophies: ${range.minClanTrophies}...`)
    const clans = await searchClans(range)
    console.log(`Found ${clans.length} clans`)

    for (const clan of clans) {
      if (clansProcessed >= targetClans) break
      // Early exit if we found Legend League
      if (leagueMap.has(34) && leagueMap.size >= 35) break

      console.log(`\nProcessing clan: ${clan.name} (${clan.tag})`)
      const members = await getClanMembers(clan.tag)
      console.log(`  Members: ${members.length}`)

      for (const member of members) {
        // Use leagueTier (new trophy road system) if available, fallback to league (old system)
        const league = member.leagueTier || member.league
        if (!league) continue

        const leagueNum = getLeagueNumber(league.name)
        if (leagueNum === -1) continue // Skip if invalid league (no number found and not unranked)

        if (!leagueMap.has(leagueNum)) {
          leagueMap.set(leagueNum, {
            number: leagueNum,
            id: league.id,
            name: league.name,
            iconUrl: league.iconUrls?.small || '',
            minTrophies: member.trophies,
            maxTrophies: member.trophies,
          })
          console.log(`  ✓ Found new league: ${league.name} (League ${leagueNum})`)
        } else {
          // Update trophy ranges
          const existing = leagueMap.get(leagueNum)
          existing.minTrophies = Math.min(existing.minTrophies, member.trophies)
          existing.maxTrophies = Math.max(existing.maxTrophies, member.trophies)
        }

        membersProcessed++
      }

      clansProcessed++

      // Add a delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  console.log(`\n\n=== Collection Complete ===`)
  console.log(`Clans processed: ${clansProcessed}`)
  console.log(`Members processed: ${membersProcessed}`)
  console.log(`Unique leagues found: ${leagueMap.size}`)

  // Convert to array and sort by league number
  const leagues = Array.from(leagueMap.values()).sort((a, b) => a.number - b.number)

  console.log(`\nLeagues collected:`)
  leagues.forEach(league => {
    console.log(`  ${league.number}: ${league.name} (${league.minTrophies}-${league.maxTrophies} trophies)`)
  })

  return leagues
}

async function updateLeagueFile(leagues) {
  const filePath = path.join(__dirname, '../src/data/trophy-road-leagues.ts')

  const fileContent = `// Trophy Road League data (35 leagues total: 0-34)
// This data is collected from the Clash of Clans API
// Last updated: ${new Date().toISOString()}

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
export const TROPHY_ROAD_LEAGUES: TrophyRoadLeague[] = ${JSON.stringify(leagues, null, 2)}

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
`

  fs.writeFileSync(filePath, fileContent, 'utf-8')
  console.log(`\n✓ Updated ${filePath}`)
}

// Main execution
async function main() {
  try {
    const leagues = await collectLeagueData()

    if (leagues.length === 0) {
      console.error('\nError: No league data collected')
      process.exit(1)
    }

    await updateLeagueFile(leagues)

    console.log('\n✅ League data collection complete!')
    console.log(`\nCollected ${leagues.length} leagues out of 35 possible leagues (0-34)`)

    if (leagues.length < 35) {
      console.log('\n⚠️  Note: Not all 35 leagues were found. You may need to:')
      console.log('   - Run the script again to find more leagues')
      console.log('   - Increase the number of clans to query')
      console.log('   - Manually add missing leagues')

      // Show which leagues are missing
      const foundNumbers = new Set(leagues.map(l => l.number))
      const missing = []
      for (let i = 0; i <= 34; i++) {
        if (!foundNumbers.has(i)) missing.push(i)
      }
      if (missing.length > 0) {
        console.log(`   - Missing leagues: ${missing.join(', ')}`)
      }
    }
  } catch (error) {
    console.error('\nError:', error.message)
    process.exit(1)
  }
}

main()
