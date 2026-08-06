import { deflateRaw, inflateRaw } from 'pako'
import type { Scenario } from '../types/scenario'
import { compactScenario, expandCompactScenario } from './compactScenario'

const SHARE_FORMAT_VERSION = 1

// Every character is URL-fragment-safe and belongs to the QR alphanumeric alphabet.
// 41³ is large enough to store each pair of bytes in exactly three characters.
const BASE41_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ*-./:'

const bytesToBase41 = (bytes: Uint8Array): string => {
  let encoded = ''
  for (let index = 0; index < bytes.length; index += 2) {
    let value = index + 1 < bytes.length ? bytes[index] * 256 + bytes[index + 1] : bytes[index]
    encoded += BASE41_ALPHABET[value % 41]
    value = Math.floor(value / 41)
    encoded += BASE41_ALPHABET[value % 41]
    if (index + 1 < bytes.length) encoded += BASE41_ALPHABET[Math.floor(value / 41)]
  }
  return encoded
}

const base41ToBytes = (encoded: string): Uint8Array => {
  if (!encoded || encoded.length % 3 === 1)
    throw new Error('The share link contains invalid compact data.')

  const bytes: number[] = []
  for (let index = 0; index < encoded.length; index += 3) {
    const first = BASE41_ALPHABET.indexOf(encoded[index])
    const second = BASE41_ALPHABET.indexOf(encoded[index + 1])
    const hasPair = index + 2 < encoded.length
    const third = hasPair ? BASE41_ALPHABET.indexOf(encoded[index + 2]) : 0
    if (first < 0 || second < 0 || third < 0)
      throw new Error('The share link contains invalid characters.')

    const value = first + second * 41 + third * 41 * 41
    if ((hasPair && value > 0xffff) || (!hasPair && value > 0xff))
      throw new Error('The share link contains invalid compact data.')
    if (hasPair) bytes.push(Math.floor(value / 256))
    bytes.push(value % 256)
  }
  return Uint8Array.from(bytes)
}

export function encodeScenario(scenario: Scenario): string {
  return bytesToBase41(deflateRaw(JSON.stringify(compactScenario(scenario)), { level: 9 }))
}

export function decodeScenario(encoded: string): Scenario {
  try {
    const parsed: unknown = JSON.parse(inflateRaw(base41ToBytes(encoded), { to: 'string' }))
    return expandCompactScenario(parsed)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('This plot')) throw error
    throw new Error('The share link is invalid or damaged.')
  }
}

export function scenarioFromHash(hash: string): Scenario | null {
  const encoded = hash.replace(/^#/, '')
  if (!encoded) return null
  const version = Number(encoded[0])
  if (!Number.isInteger(version)) return null
  if (version > SHARE_FORMAT_VERSION)
    throw new Error(`This plot uses unsupported future share format version ${version}.`)
  if (version !== SHARE_FORMAT_VERSION) return null
  return decodeScenario(encoded.slice(1))
}

export function createShareUrl(scenario: Scenario, location = window.location): string {
  return `${location.origin}${location.pathname}#${SHARE_FORMAT_VERSION}${encodeScenario(scenario)}`
}
