import { useCallback, useRef, useState } from 'react';

const useLongPress = (onLongPress, onClick, { shouldPreventDefault = true, delay = 400 } = {}) => {
    const [longPressTriggered, setLongPressTriggered] = useState(false);
    const timeout = useRef();
    const target = useRef();

    const start = useCallback(
        (event) => {
            if (shouldPreventDefault && event.target) {
                event.target.addEventListener('touchend', preventDefault, {
                    passive: false
                });
                target.current = event.target;
            }
            // Reset state
            setLongPressTriggered(false);

            timeout.current = setTimeout(() => {
                if (window.navigator && window.navigator.vibrate) {
                    window.navigator.vibrate(20); // slight haptic thud
                }
                setLongPressTriggered(true);
                onLongPress(event);
            }, delay);
        },
        [onLongPress, delay, shouldPreventDefault]
    );

    const clear = useCallback(
        (event, shouldTriggerClick = true) => {
            timeout.current && clearTimeout(timeout.current);
            if (shouldTriggerClick && !longPressTriggered && onClick) {
                onClick(event);
            }
            if (shouldPreventDefault && target.current) {
                target.current.removeEventListener('touchend', preventDefault);
            }
        },
        [shouldPreventDefault, onClick, longPressTriggered]
    );

    return {
        onPointerDown: (e) => start(e),
        onPointerUp: (e) => clear(e),
        onPointerLeave: (e) => clear(e, false),
        onPointerCancel: (e) => clear(e, false),
        onContextMenu: (e) => {
            if (shouldPreventDefault) {
                e.preventDefault();
            }
        }
    };
};

const preventDefault = (event) => {
    if (!('touches' in event)) {
        event.preventDefault();
    }
};

export default useLongPress;
