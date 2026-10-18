import {it, expect} from 'vitest';
import {apartmentStats} from '../apartmentStats';
const board = units => [{sections:[{floors:[{units}]}]}];
it('counts 142 apartments independently of 26 parking spaces and 2 commercial units', () => {
  const units = [
    ...Array.from({length:98}, () => ({unit_kind:'APARTMENT',status:'AVAILABLE',area_m2_x100:5571})),
    ...Array.from({length:8}, () => ({unit_kind:'APARTMENT',status:'RESERVED'})),
    ...Array.from({length:36}, () => ({unit_kind:'APARTMENT',status:'SOLD'})),
    ...Array.from({length:26}, () => ({unit_kind:'PARKING',status:'AVAILABLE',area_m2_x100:2552})),
    ...Array.from({length:2}, () => ({unit_kind:'COMMERCIAL',status:'AVAILABLE',area_m2_x100:44940})),
  ];
  expect(apartmentStats(board(units))).toEqual({total_units:142,available_units:98,reserved_units:8,sold_units:36,blocked_units:0,total_area_x100:98*5571});
});
it('includes legacy studios and excludes archived inventory', () => {
  expect(apartmentStats(board([{rooms:0,status:'BLOCKED'},{unit_kind:null,status:'AVAILABLE'},{unit_kind:'APARTMENT',status:'SOLD',archived_at:'2026-10-18'}]))).toMatchObject({total_units:2,available_units:1,blocked_units:1,sold_units:0});
});
it('handles empty or archived buildings without changing source data', () => {
  const buildings=board([{unit_kind:'APARTMENT',status:'AVAILABLE'}]);
  buildings[0].archived_at='2026-10-18';
  expect(apartmentStats(buildings).total_units).toBe(0);
  expect(apartmentStats().total_units).toBe(0);
  expect(buildings[0].sections[0].floors[0].units).toHaveLength(1);
});
