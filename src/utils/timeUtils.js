import { startOfDay, addMinutes, subDays, addDays } from 'date-fns';

/**
 * Converts the raw 5-minute slot logs into continuous Event objects.
 * 
 * @param {Object} logs - The map of { [isoString]: activityId }
 * @param {Date} date - The specific day to view (we scan 00:00 to 23:55)
 * @param {Function} getActivity - Helper to resolve ID to Activity object
 * @returns {Array} List of events: { id, start (min), end (min), activity, startTime (Date), endTime (Date) }
 */
export const deriveEventsFromLogs = (logs, date, getActivity) => {
    const events = [];
    const dayStart = startOfDay(date);

    let currentActivityId = null;
    let eventStartMin = null; // 0 to 1435

    // Scan all 288 slots of the day
    for (let i = 0; i < 288; i++) {
        const time = addMinutes(dayStart, i * 5);
        const logId = time.toISOString();
        const activityId = logs[logId];

        if (activityId !== currentActivityId) {
            // End previous event if exists
            if (currentActivityId) {
                // FIXED ID: Use Start Time for stability during resize
                const startIso = addMinutes(dayStart, eventStartMin).toISOString();

                events.push({
                    id: `${startIso}-event`,
                    startMin: eventStartMin,
                    endMin: i * 5, // The start of THIS slot is the end of PREV event
                    activity: getActivity(currentActivityId),
                    activityId: currentActivityId,
                    startTime: addMinutes(dayStart, eventStartMin),
                    endTime: time
                });
            }

            // Start new event if this slot is active
            if (activityId) {
                currentActivityId = activityId;
                eventStartMin = i * 5;
            } else {
                currentActivityId = null;
                eventStartMin = null;
            }
        }
    }

    // Close any open event at end of day
    if (currentActivityId) {
        const startIso = addMinutes(dayStart, eventStartMin).toISOString();
        events.push({
            id: `${startIso}-event`,
            startMin: eventStartMin,
            endMin: 24 * 60, // 1440
            activity: getActivity(currentActivityId),
            activityId: currentActivityId,
            startTime: addMinutes(dayStart, eventStartMin),
            endTime: addDays(dayStart, 1) // Midnight next day
        });
    }

    return events;
};


/**
 * Determines the "Logical Date" for a given time and activity.
 */
export const getLogicalDate = (slotTime, activityName = '') => {
    const name = activityName.toLowerCase().trim();
    const hour = slotTime.getHours();

    const calendarDay = startOfDay(slotTime);

    if (name === 'sleep') {
        if (hour >= 12) {
            return addDays(calendarDay, 1); // Counts for next day (Wake up day)
        } else {
            return calendarDay;
        }
    } else {
        if (hour < 4) {
            return subDays(calendarDay, 1);
        } else {
            return calendarDay;
        }
    }
};

/**
 * Aggregates stats using the Smart Midnight Logic.
 */
// eslint-disable-next-line no-unused-vars
export const calculateStatsWithLogicalDays = (_logs, _activities, _range, _now) => {
    return {};
};
