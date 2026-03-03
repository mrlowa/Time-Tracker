import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import DayView from './DayView';
import ActivityCreator from './ActivityCreator';
import Analytics from './Analytics';
import { TimeTrackerProvider, useTimeTracker } from '../context/TimeTrackerContext';
import Toast from './Toast';
import { useCatchUpNotification } from '../hooks/useCatchUpNotification';
import NotificationModal from './NotificationModal';
import CatchUpSheet from './CatchUpSheet';
import LiveFocusOverlay from './LiveFocusOverlay';
import LiveStatusMiniPlayer from './LiveStatusMiniPlayer';
import { generateSlotsFromElapsed } from '../utils/timeUtils';
import Icon from './Icon';

const DashboardContent = () => {
    const [currentView, setCurrentView] = useState('day');
    const [activeActivityId, setActiveActivityId] = useState(null);
    const [isCreatorOpen, setIsCreatorOpen] = useState(false);
    const [activityToEdit, setActivityToEdit] = useState(null);

    const { logs, activities, liveFocusState, startLiveFocus, minimizeLiveFocus, maximizeLiveFocus, finishLiveFocus, logSlots } = useTimeTracker();
    const { permission, requestPermission } = useCatchUpNotification(logs);
    const [isCatchUpOpen, setIsCatchUpOpen] = useState(false);

    const focusedActivity = liveFocusState?.activityId
        ? activities.find(a => a.id === liveFocusState.activityId)
        : null;

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('catchup') === 'true') {
            setIsCatchUpOpen(true);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    const handleFocusFinish = (elapsedSeconds, activity) => {
        const slots = generateSlotsFromElapsed(elapsedSeconds);
        if (slots.length > 0) {
            logSlots(slots, activity.id);
        }
        finishLiveFocus();
    };

    const handleFabClick = () => {
        if (!liveFocusState?.isActive && activities.length > 0) {
            startLiveFocus(activities[0].id);
        }
    };

    return (
        <>
            <div className="dashboard-container" style={{ display: 'flex', height: '100vh', width: '100vw', gap: '1rem', background: 'radial-gradient(circle at top right, #1f1f2e, #0F0F0F)' }}>
                <Sidebar
                    currentView={currentView}
                    onViewChange={setCurrentView}
                    activeActivityId={activeActivityId}
                    onActivitySelect={setActiveActivityId}
                    onOpenCreator={() => {
                        setActivityToEdit(null);
                        setIsCreatorOpen(true);
                    }}
                    onEditActivity={(activity) => {
                        setActivityToEdit(activity);
                        setIsCreatorOpen(true);
                    }}
                />

                <main className="glass-panel main-content" style={{
                    flex: 1,
                    margin: '1rem 1rem 1rem 0',
                    padding: '1.5rem',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative'
                }}>
                    {currentView === 'day' && (
                        <DayView activeActivityId={activeActivityId} />
                    )}
                    {currentView === 'analytics' && (
                        <Analytics />
                    )}
                </main>

                <nav className="bottom-nav">
                    <button
                        className={`bottom-nav-btn ${currentView === 'day' ? 'active' : ''}`}
                        onClick={() => setCurrentView('day')}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        <span>Day</span>
                    </button>
                    <button
                        className={`bottom-nav-btn ${currentView === 'analytics' ? 'active' : ''}`}
                        onClick={() => setCurrentView('analytics')}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                        <span>Analytics</span>
                    </button>
                </nav>

                {/* Modal Overlay for Editor */}
                {isCreatorOpen && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 100
                    }}>
                        <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
                            <ActivityCreator
                                onClose={() => setIsCreatorOpen(false)}
                                activityToEdit={activityToEdit}
                            />
                        </div>
                    </div>
                )}

                <Toast />
            </div>

            <NotificationModal
                permission={permission}
                onRequestPermission={requestPermission}
            />

            <CatchUpSheet
                isOpen={isCatchUpOpen}
                onClose={() => setIsCatchUpOpen(false)}
            />

            {!liveFocusState?.isMinimized && !liveFocusState?.isActive && (
                <button
                    onClick={handleFabClick}
                    style={{
                        position: 'fixed',
                        bottom: '90px',
                        right: '1.5rem',
                        width: '56px',
                        height: '56px',
                        borderRadius: '28px',
                        background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
                        color: 'white',
                        border: 'none',
                        boxShadow: '0 8px 20px rgba(236, 72, 153, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 90
                    }}
                >
                    <Icon name="Play" size={24} />
                </button>
            )}

            <LiveFocusOverlay
                isOpen={liveFocusState?.isActive && !liveFocusState?.isMinimized}
                activity={focusedActivity}
                onClose={() => finishLiveFocus()}
                onFinish={handleFocusFinish}
                onMinimize={minimizeLiveFocus}
            />

            <LiveStatusMiniPlayer
                isOpen={liveFocusState?.isActive && liveFocusState?.isMinimized}
                activity={focusedActivity}
                elapsedSeconds={0}
                onMaximize={maximizeLiveFocus}
            />
        </>
    );
};

const Layout = () => {
    return (
        <TimeTrackerProvider>
            <DashboardContent />
        </TimeTrackerProvider>
    );
};

export default Layout;
