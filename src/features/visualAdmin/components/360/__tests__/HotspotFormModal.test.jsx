import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { HotspotFormModal } from '../HotspotFormModal';
afterEach(cleanup);
const rooms = [{id:56,name:'Спальня'}, {id:57,name:'Гостиная'}];
const props = { isOpen:true, otherPanoramas:rooms, onClose:vi.fn(), onSave:vi.fn() };
describe('hotspot destination selection', () => {
  it('requires explicit destination and resets it when reopened', () => {
    const {rerender} = render(<HotspotFormModal {...props}/>);
    expect(screen.getByLabelText('Комната назначения').value).toBe('');
    expect(screen.getByRole('button',{name:'Добавить хотспот'}).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Комната назначения'),{target:{value:'57'}});
    rerender(<HotspotFormModal {...props} isOpen={false}/>);
    rerender(<HotspotFormModal {...props}/>);
    expect(screen.getByLabelText('Комната назначения').value).toBe('');
  });
  it('saves the selected destination and preserves the form on API failure', async () => {
    const onSave=vi.fn().mockRejectedValue(new Error('Ошибка API'));
    const onClose=vi.fn();
    render(<HotspotFormModal {...props} onSave={onSave} onClose={onClose}/>);
    fireEvent.change(screen.getByLabelText('Подпись хотспота'),{target:{value:'В гостиную'}});
    fireEvent.change(screen.getByLabelText('Комната назначения'),{target:{value:'57'}});
    fireEvent.click(screen.getByRole('button',{name:'Добавить хотспот'}));
    await waitFor(()=>expect(screen.getByRole('alert').textContent).toBe('Ошибка API'));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({target_panorama_id:57}));
    expect(onClose).not.toHaveBeenCalled();
  });
});
