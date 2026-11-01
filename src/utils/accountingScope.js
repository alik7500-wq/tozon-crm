export const VG_CASH_DESK_ID = '9dc0e06d-5e0b-4bad-8bb7-83161d7a70a2';
export const isVgDesk = desk => desk?.id === VG_CASH_DESK_ID || desk?.code === 'TOZON_PLAZA_2_CASH';
export const cashDesksForScope = (desks, scope) => desks.filter(desk => scope === 'VG' ? isVgDesk(desk) : !isVgDesk(desk));
