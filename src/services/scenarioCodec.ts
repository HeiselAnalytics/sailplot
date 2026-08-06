import { deflate, inflate } from 'pako'
import { migrateScenario } from './migrations'
import type { Scenario } from '../types/scenario'

const bytesToBase64Url = (bytes: Uint8Array): string => {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

const base64UrlToBytes = (value: string): Uint8Array => {
  if (!/^[A-Za-z0-9_-]+$/.test(value))
    throw new Error('The share link contains invalid characters.')
  const padded =
    value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4)
  const binary = atob(padded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

export function encodeScenario(scenario: Scenario): string {
  return bytesToBase64Url(deflate(JSON.stringify(scenario), { level: 9 }))
}

export function decodeScenario(encoded: string): Scenario {
  try {
    const parsed: unknown = JSON.parse(inflate(base64UrlToBytes(encoded), { to: 'string' }))
    const version = (parsed as { version?: unknown })?.version
    if (typeof version === 'number' && version > 1) {
      throw new Error(`This plot uses unsupported future format version ${version}.`)
    }
    return migrateScenario(parsed)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('This plot')) throw error
    throw new Error('The share link is invalid or damaged.')
  }
}

export function scenarioFromHash(hash: string): Scenario | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const encoded = params.get('plot') ?? params.get('scenario')
  return encoded ? decodeScenario(encoded) : null
}

export function createShareUrl(scenario: Scenario, location = window.location): string {
  return `${location.origin}${location.pathname}#plot=${encodeScenario(scenario)}`
}
