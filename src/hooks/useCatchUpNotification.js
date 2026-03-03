import { useEffect, useState, useCallback } from 'react';
import { differenceInHours } from 'date-fns';

const STORAGE_KEY_LAST_LOGGED = 'time_tracker_last_slotted';

export const useCatchUpNotification = (logs) => {
    const [permission, setPermission] = useState(
        'Notification' in window ? Notification.permission : 'denied'
    );

    // Save the latest slotted time to local storage whenever logs change
    useEffect(() => {
        if (!logs) return;

        const sortedSlots = Object.keys(logs).sort();
        if (sortedSlots.length > 0) {
            const latestSlot = sortedSlots[sortedSlots.length - 1];
            localStorage.setItem(STORAGE_KEY_LAST_LOGGED, latestSlot);
        }
    }, [logs]);

    const requestPermission = useCallback(async () => {
        if ('Notification' in window) {
            const result = await Notification.requestPermission();
            setPermission(result);
            return result === 'granted';
        }
        return false;
    }, []);

    // Check periodically for catch-up need
    useEffect(() => {
        if (permission !== 'granted') return;

        const checkInactivity = async () => {
            const lastSlottedIso = localStorage.getItem(STORAGE_KEY_LAST_LOGGED);
            if (!lastSlottedIso) return;

            const lastSlottedDate = new Date(lastSlottedIso);
            const now = new Date();

            const hoursInactive = differenceInHours(now, lastSlottedDate);

            // If inactive for 2 hours or more
            if (hoursInactive >= 2) {
                // Check if we've already notified them about this block recently
                const lastNotified = localStorage.getItem('last_catchup_notification');
                if (lastNotified) {
                    const lastNotifiedDate = new Date(lastNotified);
                    // Don't spam, wait at least another hour if we already notified
                    if (differenceInHours(now, lastNotifiedDate) < 1) {
                        return;
                    }
                }

                if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
                    try {
                        const registration = await navigator.serviceWorker.ready;
                        registration.showNotification("Time Tracker Catch-Up", {
                            body: "You have unlogged time! What have you been up to?",
                            icon: "/pwa-192x192.png",
                            badge: "/mask-icon.svg",
                            data: {
                                url: "/?catchup=true"
                            }
                        });
                        localStorage.setItem('last_catchup_notification', now.toISOString());
                    } catch (e) {
                        console.error('Failed to show notification', e);
                    }
                }
            }
        };

        // Check every 15 minutes
        const intervalId = setInterval(checkInactivity, 15 * 60 * 1000);
        // Also check on mount
        checkInactivity();

        return () => clearInterval(intervalId);
    }, [permission]);

    return {
        permission,
        requestPermission
    };
};
