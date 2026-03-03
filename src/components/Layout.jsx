import React, { useState } from 'react';
import Sidebar from './Sidebar';
import DayView from './DayView';
import ActivityCreator from './ActivityCreator';
import Analytics from './Analytics';
import { TimeTrackerProvider } from '../context/TimeTrackerContext';
import Toast from './Toast';

const Dashboard = () => {
    const [currentView, setCurrentView] = useState('day');
    const [activeActivityId, setActiveActivityId] = useState(null);
    const [isCreatorOpen, setIsCreatorOpen] = useState(false);
    const [activityToEdit, setActivityToEdit] = useState(null);

    return (
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

            {/* Modal Overlay */}
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
    );
};

import { useCatchUpNotification } from '../hooks/useCatchUpNotification';
import NotificationModal from './NotificationModal';

const Layout = () => {
    const { logs } = useTimeTracker();
    const { permission, requestPermission } = useCatchUpNotification(logs);

    return (
        <>
            <Dashboard />
            <NotificationModal
                permission={permission}
                onRequestPermission={requestPermission}
            />
        </>
    );
};

export default Layout;
