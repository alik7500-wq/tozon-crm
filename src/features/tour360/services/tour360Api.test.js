import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../../../api/client';
import { tour360Api } from './tour360Api';

vi.mock('../../../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() }
}));

describe('360 tour API contract (axios response interceptor unwraps response.data)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads the backend tour list envelope', async () => {
    api.get.mockResolvedValue({ status: 'success', data: { tours: [{ id: 1, is_active: true }] } });
    expect(await tour360Api.getTours(5)).toEqual([{ id: 1, is_active: true }]);
    expect(api.get).toHaveBeenCalledWith('/projects/5/360-tours', { params: {} });
  });

  it('reads a complete tour tree', async () => {
    api.get.mockResolvedValue({ status: 'success', data: { tour: { id: 2, panoramas: [] } } });
    expect(await tour360Api.getTourById(2)).toEqual({ id: 2, panoramas: [] });
  });

  it('creates an inactive draft, not a published tour', async () => {
    api.post.mockResolvedValue({ status: 'success', data: { tour: { id: 7, is_active: false } } });
    expect(await tour360Api.createTour(5, { name: 'Test', tour_type: 'SHOWROOM', is_active: false })).toEqual({ id: 7, is_active: false });
    expect(api.post).toHaveBeenCalledWith('/projects/5/360-tours', { name: 'Test', tour_type: 'SHOWROOM', is_active: false });
  });

  it('gets the signed upload URL and path', async () => {
    api.post.mockResolvedValue({ status: 'success', data: { signedUploadUrl: 'https://storage.example/upload', storagePath: 'projects/5/360/7/a.jpg' } });
    expect(await tour360Api.requestUploadUrl(5, 7, { name: 'a.jpg', size: 123 })).toEqual({ signedUploadUrl: 'https://storage.example/upload', storagePath: 'projects/5/360/7/a.jpg' });
    expect(api.post).toHaveBeenCalledWith('/360-panoramas/upload-url', { projectId: 5, tourId: 7, filename: 'a.jpg', fileSizeBytes: 123 });
  });

  it('checks publication readiness using backend envelope', async () => {
    api.get.mockResolvedValue({ status: 'success', data: { preflight: { ready_for_publish: false, navigation: { missing_rooms: ['Кухня'] } } } });
    expect((await tour360Api.getPublishPreflight(7)).navigation.missing_rooms).toEqual(['Кухня']);
    expect(api.get).toHaveBeenCalledWith('/360-tours/7/publish-preflight');
  });

  it('returns a read-only publication manifest', async () => {
    api.get.mockResolvedValue({ status: 'success', data: { manifest: { can_execute: false, files: [] } } });
    expect((await tour360Api.getPublishManifest(7)).can_execute).toBe(false);
  });

  it('creates and deletes a navigation hotspot', async () => {
    api.post.mockResolvedValue({ status: 'success', data: { hotspot: { id: 3 } } });
    expect(await tour360Api.createHotspot(2, { hotspot_type: 'NAVIGATION', target_panorama_id: 4, yaw: 0, pitch: 0 })).toEqual({ id: 3 });
    await tour360Api.deleteHotspot(3);
    expect(api.delete).toHaveBeenCalledWith('/360-hotspots/3');
  });

  it('registers the uploaded panorama in a draft', async () => {
    api.post.mockResolvedValue({ status: 'success', data: { panorama: { id: 9, name: 'Гостиная' } } });
    expect(await tour360Api.createPanorama(7, { name: 'Гостиная', storage_path: 'p.jpg' })).toEqual({ id: 9, name: 'Гостиная' });
  });
});
