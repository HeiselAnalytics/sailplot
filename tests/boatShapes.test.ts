import { describe, expect, it } from 'vitest'
import {
  automaticGennakerAngle,
  automaticSailAngle,
  automaticSpinnakerAngle,
  boatSequencePath,
  BOAT_SHAPES,
  constrainSailAngle,
  curvedSailPath,
  genoaPath,
  isCloseHauled,
  isSailStalled,
  longestBoatLengthBasis,
  luffingSpinnakerPath,
  relativeWindAngle,
  sailAngleLimits,
  sailSide,
  spinnakerPath,
  tackForHeading,
  upwindSailVisibility,
  VSR_COACHBOAT_BLUE,
} from '../src/editor/objects/boatShapes'
import { createBoat } from '../src/lib/scenario'

describe('historical boat shape profiles', () => {
  it('provides a hull profile for every supported class', () => {
    expect(Object.values(BOAT_SHAPES).every((profile) => profile.hullPath.startsWith('M '))).toBe(
      true,
    )
    expect(Object.values(BOAT_SHAPES).every((profile) => profile.length > 0)).toBe(true)
  })

  it('keeps class-specific sail plans', () => {
    expect(BOAT_SHAPES['ILCA / Laser'].jibTack).toBeNull()
    expect(BOAT_SHAPES['49er'].jibSize).toBeGreaterThan(0)
    expect(BOAT_SHAPES['49er'].gennakerSize).toBeGreaterThan(BOAT_SHAPES['49er'].mainsailSize)
    expect(BOAT_SHAPES['470'].spinnakerSize).toBe(19)
    expect(BOAT_SHAPES['Coach boat'].mast).toBeNull()
    expect(BOAT_SHAPES['VSR Coachboat']).toMatchObject({
      length: 57.5,
      kind: 'vsr',
      mast: null,
    })
    expect(BOAT_SHAPES['VSR Coachboat'].hullPath).toBe(
      'M 0 -46 C 3 -44 5.5 -40 7.5 -35 C 10 -29 11.5 -22 12 -14 L 13 31 C 13 35 11.5 38 8.5 39 L 5.5 40 L -5.5 40 L -8.5 39 C -11.5 38 -13 35 -13 31 L -12 -14 C -11.5 -22 -10 -29 -7.5 -35 C -5.5 -40 -3 -44 0 -46 Z',
    )
    expect(VSR_COACHBOAT_BLUE).toBe('#168DDD')
    expect(createBoat(0, 0, 1, 'VSR Coachboat').color).toBe(VSR_COACHBOAT_BLUE)
    expect(BOAT_SHAPES.Lacustre).toMatchObject({
      length: 95,
      mainsailSize: 36,
      jibSize: 28,
      genoaSize: 56,
      numberPos: [0, 34],
      gennakerSize: 0,
    })
    expect(BOAT_SHAPES.Lacustre.jibSize).toBeGreaterThan(0)
    expect(BOAT_SHAPES.Lacustre.spinnakerSize).toBeGreaterThan(0)
  })

  it('uses the longest class as the boat-length basis for zones', () => {
    const laser = createBoat(100, 200, 1, 'ILCA / Laser')
    const lacustre = createBoat(200, 200, 2, 'Lacustre')
    expect(longestBoatLengthBasis([])).toEqual({
      boatClass: 'ILCA / Laser',
      length: 40,
      usesDefault: true,
    })
    expect(longestBoatLengthBasis([laser, lacustre])).toEqual({
      boatClass: 'Lacustre',
      length: 95,
      usesDefault: false,
    })
  })
})

describe('wind-relative sails', () => {
  it('treats zero degrees as wind from the top', () => {
    expect(relativeWindAngle(0, 0)).toBe(0)
    expect(isSailStalled(0, 0, 0)).toBe(true)
    expect(automaticSailAngle(0, 0, 45, 90)).toBe(0)
  })

  it('mirrors automatic sail and gennaker angles across the wind axis', () => {
    expect(automaticSailAngle(90, 0, 45, 90)).toBeCloseTo(-automaticSailAngle(270, 0, 45, 90))
    expect(automaticGennakerAngle(120, 0)).toBeCloseTo(-automaticGennakerAngle(240, 0))
  })

  it('uses a curved filled sail and a wavy luffing sail', () => {
    expect(curvedSailPath(20, 1, false)).toContain('C 2 8 2 12 0 20 Z')
    expect(curvedSailPath(20, 1, true).match(/ C /g)).toHaveLength(4)
    expect(genoaPath(20, 1, false)).toMatch(/^M 0 0 C 1\.4 7 /)
  })

  it('selects sail sides from incidence and reproduces the symmetric spinnaker', () => {
    expect(sailSide(90, 0, 20)).toBe(1)
    expect(sailSide(270, 0, -20)).toBe(-1)
    expect(automaticSpinnakerAngle(120, 0)).toBe(100)
    expect(automaticSpinnakerAngle(240, 0)).toBe(-100)
    expect(automaticSpinnakerAngle(60, 0)).toBe(60)
    expect(automaticSpinnakerAngle(300, 0)).toBe(-60)
    expect(automaticSpinnakerAngle(165, 45)).toBe(100)
    expect(automaticSpinnakerAngle(285, 45)).toBe(-100)
    expect(spinnakerPath(20, 1, false)).toContain('A 20 20')
    expect(spinnakerPath(20, 1, true)).toContain('20 0 C')
    expect(spinnakerPath(20, -1, true)).toContain('-20 0 C')
    expect(luffingSpinnakerPath(20, 0, 180)).toContain('-6 14.4')
    expect(luffingSpinnakerPath(20, 0, 180)).toContain('0 -20')
  })

  it('keeps sails behind the mast, on the leeward side and within 100 degrees', () => {
    expect(sailAngleLimits(90, 0)).toEqual({ min: 0, max: 100 })
    expect(sailAngleLimits(270, 0)).toEqual({ min: -100, max: 0 })
    expect(constrainSailAngle(140, 90, 0)).toBe(100)
    expect(constrainSailAngle(-40, 90, 0)).toBe(0)
    expect(constrainSailAngle(-140, 270, 0)).toBe(-100)
    expect(tackForHeading(270, 0)).toBe('port')
    expect(isCloseHauled(45, 0, 45)).toBe(true)
    expect(isCloseHauled(315, 0, 45)).toBe(true)
    expect(isCloseHauled(90, 0, 45)).toBe(false)
  })

  it('chooses the supported upwind sail plan for a boat class', () => {
    expect(upwindSailVisibility('470')).toEqual({
      mainsailVisible: true,
      jibVisible: true,
      genoaVisible: false,
      spinnakerVisible: false,
      gennakerVisible: false,
    })
    expect(upwindSailVisibility('Coach boat')).toEqual({
      mainsailVisible: false,
      jibVisible: false,
      genoaVisible: false,
      spinnakerVisible: false,
      gennakerVisible: false,
    })
    expect(upwindSailVisibility('VSR Coachboat')).toEqual({
      mainsailVisible: false,
      jibVisible: false,
      genoaVisible: false,
      spinnakerVisible: false,
      gennakerVisible: false,
    })
    expect(upwindSailVisibility('Lacustre')).toEqual({
      mainsailVisible: true,
      jibVisible: false,
      genoaVisible: true,
      spinnakerVisible: false,
      gennakerVisible: false,
    })
  })
})

describe('boat tracks', () => {
  it('connects numbered positions with a curved path', () => {
    const first = createBoat(100, 200)
    const second = { ...createBoat(180, 120), sequenceId: first.sequenceId, positionNumber: 2 }
    expect(boatSequencePath([second, first])).toMatch(/^M 100 200 C /)
  })
})
