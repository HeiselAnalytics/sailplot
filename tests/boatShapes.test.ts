import { describe, expect, it } from 'vitest'
import {
  automaticGennakerAngle,
  automaticBoatHeadsailAngle,
  automaticBoatMainsailAngle,
  automaticSailAngle,
  automaticSpinnakerAngle,
  boatSequencePath,
  BOAT_SHAPES,
  constrainSailAngle,
  curvedSailPath,
  genoaPath,
  isCloseHauled,
  isGennakerStalled,
  isSailStalled,
  longestBoatLengthBasis,
  measurementBoatLengthBasis,
  luffingSpinnakerPath,
  relativeWindAngle,
  sailAngleLimits,
  sailSide,
  spinnakerPath,
  tackForHeading,
  upwindSailVisibility,
  COACHBOAT_BLUE,
} from '../src/editor/objects/boatShapes'
import { JURY_BOAT_GREY, UMPIRE_BOAT_GREY } from '../src/lib/boatColors'
import { createBoat } from '../src/lib/scenario'
import { BOAT_CLASSES, SAILING_BOAT_CLASSES } from '../src/types/scenario'

describe('historical boat shape profiles', () => {
  it('provides a hull profile for every supported class', () => {
    expect(BOAT_CLASSES).toEqual([
      'Optimist',
      'ILCA',
      'Generic keelboat',
      'Lacustre',
      'Tornado',
      '420',
      '470',
      '29er',
      '49er',
      'Windsurf',
      'Coachboat',
      'Jury boat',
      'Committee boat',
      'Umpire boat',
    ])
    expect(Object.values(BOAT_SHAPES).every((profile) => profile.hullPath.startsWith('M '))).toBe(
      true,
    )
    expect(Object.values(BOAT_SHAPES).every((profile) => profile.length > 0)).toBe(true)
    expect(Object.values(BOAT_SHAPES).every((profile) => profile.drawingLength > 0)).toBe(true)
  })

  it('keeps class-specific sail plans', () => {
    expect(BOAT_SHAPES.ILCA.jibTack).toBeNull()
    expect(BOAT_SHAPES['49er'].jibSize).toBeGreaterThan(0)
    expect(BOAT_SHAPES['49er'].gennakerSize).toBeGreaterThan(BOAT_SHAPES['49er'].mainsailSize)
    expect(BOAT_SHAPES['470'].spinnakerSize).toBe(32.8)
    expect(BOAT_SHAPES.Coachboat).toMatchObject({
      length: 57.5,
      kind: 'vsr',
      mast: null,
    })
    expect(BOAT_SHAPES.Coachboat.hullPath).toBe(
      'M 0 -46 C 3 -44 5.5 -40 7.5 -35 C 10 -29 11.5 -22 12 -14 L 13 31 C 13 35 11.5 38 8.5 39 L 5.5 40 L -5.5 40 L -8.5 39 C -11.5 38 -13 35 -13 31 L -12 -14 C -11.5 -22 -10 -29 -7.5 -35 C -5.5 -40 -3 -44 0 -46 Z',
    )
    expect(COACHBOAT_BLUE).toBe('#168DDD')
    expect(createBoat(0, 0, 1, 'Coachboat').color).toBe(COACHBOAT_BLUE)
    expect(BOAT_SHAPES['Jury boat']).toBe(BOAT_SHAPES.Coachboat)
    expect(createBoat(0, 0, 1, 'Jury boat').color).toBe(JURY_BOAT_GREY)
    expect(BOAT_SHAPES['Umpire boat']).toBe(BOAT_SHAPES.Coachboat)
    expect(createBoat(0, 0, 1, 'Umpire boat')).toMatchObject({
      color: UMPIRE_BOAT_GREY,
      boatFlagColor: null,
      umpireSignalFlag: 'none',
    })
    expect(BOAT_SHAPES.Lacustre).toMatchObject({
      length: 95,
      mainsailSize: 36,
      jibSize: 28,
      genoaSize: 52,
      numberPos: [0, 34],
      gennakerSize: 0,
    })
    expect(BOAT_SHAPES.Lacustre.jibSize).toBeGreaterThan(0)
    expect(BOAT_SHAPES.Lacustre.spinnakerSize).toBeGreaterThan(0)
    expect(BOAT_SHAPES['420']).toMatchObject({
      mainsailSize: 24,
      jibSize: 14.4,
      closeHauledMainsailAngle: 7,
      closeHauledHeadsailAngle: 10,
    })
    expect(BOAT_SHAPES['470']).toMatchObject({
      mainsailSize: 26.5,
      jibSize: 15.9,
      closeHauledMainsailAngle: 7,
      closeHauledHeadsailAngle: 10,
    })
    expect(BOAT_SHAPES['29er']).toMatchObject({
      mainsailSize: 20.5,
      jibSize: 17,
      closeHauledMainsailAngle: 6,
      closeHauledHeadsailAngle: 8,
    })
    expect(BOAT_SHAPES['49er']).toMatchObject({
      mainsailSize: 26.5,
      jibSize: 19,
      closeHauledMainsailAngle: 6,
      closeHauledHeadsailAngle: 8,
    })
    expect(BOAT_SHAPES.Windsurf).toMatchObject({
      length: 22,
      displayScale: 1.6,
      mast: [0, -4.5],
      mainsailSize: 15,
      numberPos: [0, 6],
    })
    expect(BOAT_SHAPES.Windsurf.hullPath).toContain('L 4.75 7.5')
  })

  it('uses the longest class as the boat-length basis for zones', () => {
    const laser = createBoat(100, 200, 1, 'ILCA')
    const lacustre = createBoat(200, 200, 2, 'Lacustre')
    const committeeBoat = createBoat(300, 200, 3, 'Committee boat')
    const coachboat = createBoat(400, 200, 4, 'Coachboat')
    expect(longestBoatLengthBasis([])).toEqual({
      boatClass: 'ILCA',
      length: 68.8,
      hullLength: 42.3,
      usesDefault: true,
    })
    expect(longestBoatLengthBasis([laser, lacustre, committeeBoat])).toEqual({
      boatClass: 'Lacustre',
      length: 89.3,
      hullLength: 95,
      usesDefault: false,
    })
    expect(longestBoatLengthBasis([committeeBoat, coachboat])).toEqual({
      boatClass: 'ILCA',
      length: 68.8,
      hullLength: 42.3,
      usesDefault: true,
    })
    expect(measurementBoatLengthBasis([laser, lacustre], 'Optimist')).toEqual({
      boatClass: 'Optimist',
      length: 57.5,
      hullLength: 23,
      usesDefault: false,
    })
    expect(measurementBoatLengthBasis([lacustre, committeeBoat], 'Committee boat')).toEqual({
      boatClass: 'Lacustre',
      length: 89.3,
      hullLength: 95,
      usesDefault: false,
    })
  })

  it.each(SAILING_BOAT_CLASSES)(
    'uses exactly one displayed %s hull length for one BL',
    (boatClass) => {
      const expectedDisplayedHullLengths: Partial<Record<(typeof BOAT_CLASSES)[number], number>> = {
        Optimist: 57.5,
        ILCA: 68.8,
        'Generic keelboat': 88,
        Lacustre: 89.3,
        Tornado: 76.25,
        '420': 66.36,
        '470': 69.56,
        '29er': 66.42,
        '49er': 71.04,
        Windsurf: 35.2,
      }
      const profile = BOAT_SHAPES[boatClass]
      const basis = measurementBoatLengthBasis([], boatClass)

      expect(basis.length).toBeCloseTo(expectedDisplayedHullLengths[boatClass]!, 8)
      expect(basis.length).toBeCloseTo(profile.drawingLength * profile.displayScale, 8)
      expect(basis.hullLength).toBe(profile.length)
      expect(3 * basis.length).toBeCloseTo(3 * profile.drawingLength * profile.displayScale, 8)
    },
  )
})

describe('wind-relative sails', () => {
  it('treats zero degrees as wind from the top', () => {
    expect(relativeWindAngle(0, 0)).toBe(0)
    expect(isSailStalled(0, 0, 0)).toBe(true)
    expect(automaticSailAngle(0, 0, 45, 90)).toBe(0)
  })

  it('keeps sails filled with wind from astern', () => {
    expect(isSailStalled(180, 0, 0)).toBe(false)
    expect(isSailStalled(150, 0, 0)).toBe(false)
    expect(isSailStalled(210, 0, 0)).toBe(false)
    expect(isGennakerStalled(180, 0, 0)).toBe(false)
  })

  it('mirrors automatic sail and gennaker angles across the wind axis', () => {
    expect(automaticSailAngle(90, 0, 45, 90)).toBeCloseTo(-automaticSailAngle(270, 0, 45, 90))
    expect(automaticGennakerAngle(120, 0)).toBeCloseTo(-automaticGennakerAngle(240, 0))
  })

  it('keeps the previous sail side exactly dead downwind', () => {
    expect(tackForHeading(179, 0, 'port')).toBe('starboard')
    expect(tackForHeading(181, 0, 'starboard')).toBe('port')
    expect(tackForHeading(180, 0, 'starboard')).toBe('starboard')
    expect(tackForHeading(180, 0, 'port')).toBe('port')

    expect(automaticBoatMainsailAngle('ILCA', 180, 0, 45, 90, 'starboard')).toBe(90)
    expect(automaticBoatMainsailAngle('ILCA', 180, 0, 45, 90, 'port')).toBe(-90)
    expect(automaticBoatHeadsailAngle('Lacustre', 180, 0, 45, 45, 'starboard')).toBe(45)
    expect(automaticBoatHeadsailAngle('Lacustre', 180, 0, 45, 45, 'port')).toBe(-45)
    expect(automaticSpinnakerAngle(180, 0, 'starboard')).toBe(100)
    expect(automaticSpinnakerAngle(180, 0, 'port')).toBe(-100)
    expect(automaticGennakerAngle(180, 0, 'starboard')).toBe(30)
    expect(automaticGennakerAngle(180, 0, 'port')).toBe(-30)
    expect(constrainSailAngle(90, 180, 0, 'starboard')).toBe(90)
    expect(constrainSailAngle(-90, 180, 0, 'port')).toBe(-90)
  })

  it('trims the ILCA mainsail to eleven degrees close-hauled', () => {
    expect(automaticBoatMainsailAngle('ILCA', 45, 0, 45, 90)).toBe(11)
    expect(automaticBoatMainsailAngle('ILCA', 315, 0, 45, 90)).toBe(-11)
    expect(automaticBoatMainsailAngle('ILCA', 0, 0, 45, 90)).toBe(0)
  })

  it('uses class-specific close-hauled mainsail and headsail trim', () => {
    expect(automaticBoatHeadsailAngle('Generic keelboat', 45, 0, 45, 45)).toBe(15)
    expect(automaticBoatHeadsailAngle('Generic keelboat', 315, 0, 45, 45)).toBe(-15)
    expect(automaticBoatMainsailAngle('Lacustre', 45, 0, 45, 90)).toBe(6)
    expect(automaticBoatHeadsailAngle('Lacustre', 45, 0, 45, 45)).toBe(9)
    expect(automaticBoatMainsailAngle('Tornado', 45, 0, 45, 80)).toBe(3)
    expect(automaticBoatMainsailAngle('420', 45, 0, 45, 90)).toBe(7)
    expect(automaticBoatHeadsailAngle('420', 45, 0, 45, 45)).toBe(10)
    expect(automaticBoatMainsailAngle('470', 45, 0, 45, 90)).toBe(7)
    expect(automaticBoatHeadsailAngle('470', 45, 0, 45, 45)).toBe(10)
    expect(automaticBoatMainsailAngle('29er', 45, 0, 45, 85)).toBe(6)
    expect(automaticBoatHeadsailAngle('29er', 45, 0, 45, 45)).toBe(8)
    expect(automaticBoatMainsailAngle('49er', 45, 0, 45, 85)).toBe(6)
    expect(automaticBoatHeadsailAngle('49er', 45, 0, 45, 45)).toBe(8)
    expect(BOAT_SHAPES.Tornado.mast![1] + BOAT_SHAPES.Tornado.mainsailSize).toBe(30)
  })

  it('moves the Lacustre genoa smoothly through the close-hauled boundary', () => {
    const onLayline = automaticBoatHeadsailAngle('Lacustre', 45, 0, 45, 45)
    const justOutsideLayline = automaticBoatHeadsailAngle('Lacustre', 46, 0, 45, 45)
    const closerToWind = automaticBoatHeadsailAngle('Lacustre', 35, 0, 45, 45)
    expect(onLayline).toBe(9)
    expect(justOutsideLayline).toBeCloseTo(9.08, 1)
    expect(Math.abs(justOutsideLayline - onLayline)).toBeLessThan(0.2)
    expect(closerToWind).toBe(7)
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
    expect(luffingSpinnakerPath(20, 0, 180)).toMatch(/^M 0 -20 /)
    expect(luffingSpinnakerPath(20, 0, 180)).toContain('C -2 -16 -2 -16 0 -14')
    expect(luffingSpinnakerPath(20, 0, 180).match(/ C /g)).toHaveLength(4)
    expect(luffingSpinnakerPath(20, 90, 180)).toMatch(/^M 20 0 /)
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
    expect(upwindSailVisibility('Jury boat')).toEqual({
      mainsailVisible: false,
      jibVisible: false,
      genoaVisible: false,
      spinnakerVisible: false,
      gennakerVisible: false,
    })
    expect(upwindSailVisibility('Coachboat')).toEqual({
      mainsailVisible: false,
      jibVisible: false,
      genoaVisible: false,
      spinnakerVisible: false,
      gennakerVisible: false,
    })
    expect(upwindSailVisibility('Umpire boat')).toEqual({
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
