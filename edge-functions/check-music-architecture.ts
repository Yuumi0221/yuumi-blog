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

console.log(`[music-check] ${songs.length} songs and special version mappings passed`)
