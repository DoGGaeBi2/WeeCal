import { useEffect } from 'react';

/**
 * ESC 키를 누르면 특정 함수(closeFn)를 실행시켜주는 커스텀 훅
 * @param {Function} closeFn 창을 닫는 함수
 * @param {boolean} isOpen 창이 열려있는지 여부
 */
export const useEscapeKey = (closeFn, isOpen) => {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                closeFn();
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [closeFn, isOpen]);
};