import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor, cleanup } from '@testing-library/react';
import { useTour360 } from './useTour360';
import { tour360Api } from '../services/tour360Api';
vi.mock('../services/tour360Api', () => ({ tour360Api: { getTours: vi.fn(), getTourById: vi.fn() } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe('apartment tour selection', () => {
  it('does not substitute another apartment tour when requested tour is absent', async () => {
    tour360Api.getTours.mockResolvedValue([{id:31,is_active:true}]);
    const {result}=renderHook(()=>useTour360(3,30));
    await waitFor(()=>expect(result.current.isLoading).toBe(false));
    expect(result.current.tour).toBeNull();
    expect(tour360Api.getTourById).not.toHaveBeenCalled();
  });
  it('limits the apartment viewer to its requested active tour', async () => {
    tour360Api.getTours.mockResolvedValue([{id:31,is_active:true},{id:30,is_active:true}]);
    tour360Api.getTourById.mockResolvedValue({id:30,panoramas:[{id:55,hotspots:[]}]});
    const {result}=renderHook(()=>useTour360(3,30));
    await waitFor(()=>expect(result.current.isLoading).toBe(false));
    expect(result.current.tours.map(t=>t.id)).toEqual([30]);
    expect(tour360Api.getTourById).toHaveBeenCalledWith(30);
  });
});
