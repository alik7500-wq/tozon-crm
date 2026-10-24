// @vitest-environment jsdom
import React from 'react';
import {beforeEach, afterEach, it, expect, vi} from 'vitest';
import {render, screen, fireEvent, waitFor, cleanup} from '@testing-library/react';
import {LayoutEditorModal} from '../components/LayoutEditorModal';
const mocks = vi.hoisted(() => ({get: vi.fn(), patch: vi.fn()}));
vi.mock('../../../api/client', () => ({api: mocks}));
vi.mock('../../../context/i18nContext', () => ({useI18n: () => ({t: key => key, getText: (tg, ru) => ru})}));
vi.mock('../../../components/ImageUpload', () => ({default: () => null}));
vi.mock('../components/LayoutPanoramaPreview', () => ({LayoutPanoramaPreview: ({projectId}) => <div data-testid="panorama-project">{projectId}</div>}));
beforeEach(() => {
  window.PointerEvent = class extends MouseEvent { constructor(type, options) {super(type, options); this.pointerId = options.pointerId ?? 1;} };
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = () => true;
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  mocks.get.mockResolvedValue({data: {layout: {name:'План', code:'A', furnished_plan_path:'https://example.com/plan.jpg'}, rooms:[
    {id:1, room_number:1, name_ru:'Гостиная', area:30, position_x_percent:50, position_y_percent:50},
    {id:2, room_number:2, name_ru:'Кухня', area:12, position_x_percent:50, position_y_percent:50}
  ]}});
  mocks.patch.mockResolvedValue({});
});
afterEach(() => {cleanup(); vi.clearAllMocks();});
it('drags the selected room and saves its own coordinates, without changing another room', async () => {
  render(<LayoutEditorModal layoutId={5} projectId={3} isOpen onClose={() => {}} />);
  await screen.findByDisplayValue('План');
  fireEvent.click(screen.getByText('tabRoomsEditor'));
  fireEvent.click(screen.getByText('Кухня'));
  const canvas = screen.getByAltText('Furnished Plan').parentElement;
  canvas.getBoundingClientRect = () => ({left:100, top:200, width:400, height:600});
  fireEvent.pointerDown(screen.getByTestId('editing-room-marker'), {pointerId:1, button:0, clientX:300, clientY:500});
  fireEvent.pointerMove(canvas, {pointerId:1, clientX:200, clientY:650});
  fireEvent.pointerUp(canvas, {pointerId:1, clientX:200, clientY:650});
  expect(screen.getByTestId('editing-room-marker').style.left).toBe('25%');
  expect(screen.getByTestId('editing-room-marker').style.top).toBe('75%');
  expect(mocks.patch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Обновить комнату'));
  await waitFor(() => expect(mocks.patch).toHaveBeenCalledWith('/inventory/layouts/5/rooms/2', expect.objectContaining({position_x_percent:25, position_y_percent:75})));
  expect(mocks.patch).toHaveBeenCalledTimes(1);
});
it('clamps a dragged marker to the image bounds', async () => {
  render(<LayoutEditorModal layoutId={5} projectId={3} isOpen onClose={() => {}} />);
  await screen.findByDisplayValue('План');
  fireEvent.click(screen.getByText('tabRoomsEditor'));
  fireEvent.click(screen.getByText('Гостиная'));
  const canvas = screen.getByAltText('Furnished Plan').parentElement;
  canvas.getBoundingClientRect = () => ({left:100, top:200, width:400, height:600});
  fireEvent.pointerDown(screen.getByTestId('editing-room-marker'), {pointerId:1, button:0});
  fireEvent.pointerMove(canvas, {pointerId:1, clientX:-100, clientY:1000});
  fireEvent.pointerUp(canvas, {pointerId:1});
  expect(screen.getByTestId('editing-room-marker').style.left).toBe('0%');
  expect(screen.getByTestId('editing-room-marker').style.top).toBe('100%');
});

it.each([undefined,3])('provides the layout project for panorama saving when caller project is %s', async projectId => {
  mocks.get.mockResolvedValue({data:{layout:{id:5,project_id:3,name:'План',code:'B2'},rooms:[]}});
  render(<LayoutEditorModal layoutId={5} projectId={projectId} isOpen onClose={() => {}} />);
  await screen.findByDisplayValue('План');
  fireEvent.click(screen.getByText('360° Тур'));
  expect(screen.getByTestId('panorama-project').textContent).toBe('3');
});
