import React, { useState, useEffect } from 'react';

const NotificationModal = ({ permission, onRequestPermission }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Show the modal if permissions haven't been asked for yet (default state is 'default')
        if (permission === 'default' && !localStorage.getItem('notification_prompt_shown')) {
            // Delay slightly to not overwhelm on first load
            const timer = setTimeout(() => setIsVisible(true), 2000);
            return () => clearTimeout(timer);
        }
    }, [permission]);

    const handleAllow = async () => {
        setIsVisible(false);
        localStorage.setItem('notification_prompt_shown', 'true');
        await onRequestPermission();
    };

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem('notification_prompt_shown', 'true');
    };

    if (!isVisible) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
        }}>
            <div style={{
                background: '#1F1F2E',
                borderRadius: '16px',
                padding: '2rem',
                width: '90%',
                maxWidth: '400px',
                textAlign: 'center',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.1)',
                animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                <div style={{
                    width: '64px',
                    height: '64px',
                    background: 'rgba(96, 165, 250, 0.2)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.5rem auto'
                }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                </div>
                <h3 style={{ margin: '0 0 1rem 0', color: '#FFF', fontSize: '1.25rem' }}>Stay on Track</h3>
                <p style={{ color: '#A0A0B0', marginBottom: '2rem', lineHeight: '1.5' }}>
                    Enable notifications so we can gently remind you if you forget to log your time for a while.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button
                        onClick={handleAllow}
                        style={{
                            background: '#60A5FA',
                            color: '#000',
                            border: 'none',
                            padding: '1rem',
                            borderRadius: '8px',
                            fontWeight: '600',
                            fontSize: '1rem',
                            cursor: 'pointer'
                        }}
                    >
                        Allow Notifications
                    </button>
                    <button
                        onClick={handleDismiss}
                        style={{
                            background: 'transparent',
                            color: '#A0A0B0',
                            border: '1px solid rgba(255,255,255,0.1)',
                            padding: '1rem',
                            borderRadius: '8px',
                            fontWeight: '500',
                            fontSize: '1rem',
                            cursor: 'pointer'
                        }}
                    >
                        Maybe Later
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotificationModal;
