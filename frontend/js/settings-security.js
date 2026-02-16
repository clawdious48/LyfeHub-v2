/**
 * Settings Security Section
 * Handles password change form with validation.
 */
(function() {
    'use strict';

    let securityInitialized = false;

    function initSecurity() {
        if (securityInitialized) return;
        if (!document.getElementById('change-password-form')) return;
        securityInitialized = true;
        setupPasswordForm();
    }

    // Auto-init when settings tab shown
    document.addEventListener('tab:activated', function(e) {
        if (e.detail && e.detail.tab === 'settings') initSecurity();
    });

    function setupPasswordForm() {
        const form = document.getElementById('change-password-form');
        if (!form) return;

        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            const currentPw = document.getElementById('current-password').value;
            const newPw = document.getElementById('new-password').value;
            const confirmPw = document.getElementById('confirm-password').value;

            // Validation
            if (newPw.length < 8) {
                Settings.showToast('Password must be at least 8 characters', 'error');
                return;
            }

            if (newPw !== confirmPw) {
                Settings.showToast('Passwords do not match', 'error');
                return;
            }

            const btn = document.getElementById('change-password-btn');
            const btnText = btn.querySelector('.btn-text');
            const btnSpinner = btn.querySelector('.btn-spinner');

            // Loading state
            btn.disabled = true;
            btnText.textContent = 'Updating…';
            btnSpinner.style.display = '';

            try {
                const res = await fetch('/api/users/me/password', {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        currentPassword: currentPw,
                        newPassword: newPw
                    })
                });

                if (!res.ok) {
                    const data = await res.json().catch(function() { return {}; });
                    throw new Error(data.error || data.message || 'Failed to change password');
                }

                Settings.showToast('Password updated successfully', 'success');
                form.reset();

            } catch (err) {
                Settings.showToast(err.message, 'error');
            } finally {
                btn.disabled = false;
                btnText.textContent = 'Update Password';
                btnSpinner.style.display = 'none';
            }
        });
    }

})();
