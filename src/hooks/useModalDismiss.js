import { useEffect, useCallback, useRef } from 'react';

// Global stack of active modal dismiss handlers for perfect modal layering
const modalStack = [];

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.keyCode === 27) {
      if (modalStack.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        const topHandler = modalStack[modalStack.length - 1];
        topHandler?.();
      }
    }
  }, true);
}

/**
 * Хук для закрытия модального окна по клавише ESC с проверкой несохраненных данных
 * @param {Object} params
 * @param {boolean} params.isOpen Открыто ли окно
 * @param {Function} params.onClose Функция закрытия окна
 * @param {boolean} [params.isDirty=false] Есть ли несохраненные данные
 * @param {string} [params.confirmMessage] Текст подтверждения при закрытии
 */
export const useModalDismiss = ({
  isOpen,
  onClose,
  isDirty = false,
  confirmMessage = 'Внесенные данные не сохранены. Вы уверены, что хотите закрыть окно?'
}) => {
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  const confirmMsgRef = useRef(confirmMessage);
  confirmMsgRef.current = confirmMessage;

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const requestClose = useCallback(() => {
    if (isDirtyRef.current) {
      const ok = window.confirm(confirmMsgRef.current);
      if (!ok) return false;
    }
    onCloseRef.current?.();
    return true;
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handler = () => {
      requestClose();
    };

    modalStack.push(handler);
    return () => {
      const idx = modalStack.lastIndexOf(handler);
      if (idx !== -1) {
        modalStack.splice(idx, 1);
      }
    };
  }, [isOpen, requestClose]);

  return { requestClose };
};
