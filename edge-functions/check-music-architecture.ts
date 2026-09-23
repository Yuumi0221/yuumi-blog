import assert from 'node:assert/strict'
import { songs } from '../pages/posts/songs.config'
import { validateSongs } from '../components/music/music'

function song(id: string) {
  const found = songs.find(item => item.id === id)
  assert(found, `Missing song: ${id}`)
  return found
}

assert.deepEqual(validateSongs(songs), [])

const ordinary = song('2025-12-25-snow-song-show').versions[0]
assert.deepEqual(ordinary.playbackCandidates.map(item => item.type), ['netease', 'bilibili'])

const literature = song('2020-11-29-literature').versions
assert.equal(literature[0].playbackCandidates.at(-1)?.type, 'bilibili')
assert.deepEqual(literature[1].playbackCandidates.map(item => item.type), ['netease'])

const carte = song('2020-05-08-fukashigi-no-carte').versions
assert.deepEqual(carte[0].playbackCandidates.map(item => item.type), ['netease', 'bilibili'])
assert.deepEqual(carte[1].playbackCandidates.map(item => item.type), ['url'])

const holyFlag = song('2019-10-20-holy-flag').versions
assert.deepEqual(
  holyFlag.map(item => item.playbackCandidates.find(candidate => candidate.type === 'bilibili')?.page),
  [1, 2],
)

const messiah = song('2021-08-26-blessing-messiah').versions
assert.deepEqual(messiah.map(item => item.playbackCandidates.map(candidate => candidate.type)), [
  ['url'],
  ['netease'],
  ['url'],
])
assert.deepEqual(messiah[0].lyricSource, { type: 'netease', songId: '1880246715' })

const requestedLyrics: Array<[string, string]> = [
  ['2026-01-11-chronostasis', '29593073'],
  ['2024-10-02-uchiage-hanabi', '496869422'],
  ['2023-07-25-hua-si-ji', '1997525129'],
  ['2023-06-18-sing-2015', '30706961'],
  ['2022-12-25-seinaru-hi-no-inori', '1832908905'],
  ['2022-10-12-ssfwl', '1382384478'],
  ['2022-08-12-hikaru-nara', '29732992'],
  ['2022-06-04-romance-no-yakusoku', '1862479259'],
  ['2021-10-31-dancing-stars-on-me', '32235959'],
  ['2021-10-11-queendom-izone-flip', '1869975831'],
  ['2021-05-07-sing-and-smile', '1834880550'],
  ['2020-12-06-hitchcock', '557581315'],
  ['2020-11-20-saikai', '1492062605'],
  ['2020-10-15-gekijo-no-ghost', '1337928912'],
  ['2020-08-13-tokyo-summer-session', '33211444'],
  ['2019-08-15-additional-memory', '1321543977'],
  ['2018-12-25-merry-chri', '29728098'],
]
for (const [id, songId] of requestedLyrics)
  assert.equal(song(id).versions[0].lyricSource?.songId, songId)

console.log(`[music-check] ${songs.length} songs and special version mappings passed`)
