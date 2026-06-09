(function () {
    'use strict';

    var MOBILE_BREAKPOINT = 900;
    var STORAGE_DEPARTED = 'synclyst_synciq_departed';
    var STORAGE_SUBMITTED = 'synclyst_synciq_extension_sent';
    var CHROME_STORE_URL = 'https://chromewebstore.google.com/detail/synclyst-listing-autopilo/copjkijolfpmhjgiggafngmdeibnmfnm';

    function isMobileDevice() {
        var ua = navigator.userAgent || '';
        var mobileUA = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|CriOS|FxiOS/i.test(ua);
        var tabletUA = /iPad|Tablet|PlayBook|Silk/i.test(ua);
        var inAppBrowser = /TikTok|BytedanceWebview|musical_ly|Instagram|FBAN|FBAV|Twitter/i.test(ua);
        if (inAppBrowser || mobileUA || tabletUA) return true;
        return false;
    }

    function isNarrowScreen() {
        return window.matchMedia('(max-width: ' + MOBILE_BREAKPOINT + 'px)').matches;
    }

    function shouldUseMobileFlow() {
        return isMobileDevice() || isNarrowScreen();
    }

    function applyDeviceClass() {
        var mobile = shouldUseMobileFlow();
        document.documentElement.classList.toggle('is-mobile', mobile);
        document.documentElement.classList.toggle('is-desktop', !mobile);
        return mobile;
    }

    function getNavigationType() {
        var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
        return nav && nav.type ? nav.type : '';
    }

    function hasReturnUrlParams() {
        var params = new URLSearchParams(window.location.search);
        return params.get('returned') === 'synciq' || params.get('from') === 'synciq';
    }

    function shouldShowReturnPrompt(fromBfcache) {
        if (sessionStorage.getItem(STORAGE_SUBMITTED)) return false;
        if (hasReturnUrlParams()) return true;

        if (!sessionStorage.getItem(STORAGE_DEPARTED)) return false;

        if (fromBfcache) return true;
        return getNavigationType() === 'back_forward';
    }

    function validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function cleanReturnParams() {
        var params = new URLSearchParams(window.location.search);
        if (!params.has('returned') && !params.has('from')) return;
        params.delete('returned');
        params.delete('from');
        var next = window.location.pathname + (params.toString() ? '?' + params.toString() : '') + window.location.hash;
        window.history.replaceState({}, '', next);
    }

    function markSynciqDeparted() {
        try {
            sessionStorage.setItem(STORAGE_DEPARTED, String(Date.now()));
        } catch (e) {}
    }

    function clearDepartedFlag() {
        try {
            sessionStorage.removeItem(STORAGE_DEPARTED);
        } catch (e) {}
    }

    function getHeroCopyRoot() {
        return document.querySelector('.synclyst-hero-copy');
    }

    function hideReturnPrompt() {
        var heroMobile = document.querySelector('.hero-cta-mobile');
        var returnBlock = document.getElementById('mobile-synciq-return');
        var heroCopy = getHeroCopyRoot();
        if (heroMobile) heroMobile.classList.remove('hidden');
        if (returnBlock) returnBlock.classList.remove('is-visible');
        if (heroCopy) heroCopy.classList.remove('mobile-extension-step');
    }

    function showReturnPrompt() {
        var heroMobile = document.querySelector('.hero-cta-mobile');
        var returnBlock = document.getElementById('mobile-synciq-return');
        var heroCopy = getHeroCopyRoot();
        if (heroMobile) heroMobile.classList.add('hidden');
        if (returnBlock) returnBlock.classList.add('is-visible');
        if (heroCopy) heroCopy.classList.add('mobile-extension-step');
        cleanReturnParams();
    }

    function updateHeroState(fromBfcache) {
        if (!shouldUseMobileFlow()) {
            hideReturnPrompt();
            return;
        }

        if (shouldShowReturnPrompt(fromBfcache)) {
            showReturnPrompt();
            return;
        }

        clearDepartedFlag();
        hideReturnPrompt();
    }

    function initSynciqHeroLink() {
        var btn = document.getElementById('mobile-synciq-hero-btn');
        if (!btn) return;
        btn.addEventListener('click', function () {
            markSynciqDeparted();
        });
    }

    function initReturnResetLink() {
        var link = document.getElementById('mobile-synciq-return-reset');
        if (!link) return;
        link.addEventListener('click', function (event) {
            event.preventDefault();
            clearDepartedFlag();
            hideReturnPrompt();
            hideInstallSuccess();
            var statusEl = document.getElementById('mobile-synciq-return-status');
            var submitBtn = document.getElementById('mobile-synciq-return-submit');
            if (statusEl) {
                statusEl.textContent = '';
                statusEl.classList.remove('is-error', 'is-success');
            }
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Send';
            }
        });
    }

    function setStatus(el, message, type) {
        if (!el) return;
        el.textContent = message || '';
        el.classList.remove('is-error', 'is-success');
        if (type) el.classList.add('is-' + type);
    }

    function hideInstallSuccess() {
        var successBlock = document.getElementById('mobile-synciq-return-success');
        var form = document.getElementById('mobile-synciq-return-form');
        var copy = document.querySelector('.mobile-synciq-return-copy');
        if (successBlock) successBlock.hidden = true;
        if (form) form.hidden = false;
        if (copy) copy.hidden = false;
    }

    function showInstallSuccess(chromeUrl) {
        var successBlock = document.getElementById('mobile-synciq-return-success');
        var installLink = document.getElementById('mobile-synciq-install-link');
        var form = document.getElementById('mobile-synciq-return-form');
        var copy = document.querySelector('.mobile-synciq-return-copy');
        var statusEl = document.getElementById('mobile-synciq-return-status');
        var url = chromeUrl || CHROME_STORE_URL;

        if (installLink) installLink.href = url;
        if (form) form.hidden = true;
        if (copy) copy.hidden = true;
        if (statusEl) {
            statusEl.textContent = '';
            statusEl.classList.remove('is-error', 'is-success');
        }
        if (successBlock) successBlock.hidden = false;
    }

    function initReturnForm() {
        var form = document.getElementById('mobile-synciq-return-form');
        if (!form) return;

        var emailInput = document.getElementById('mobile-synciq-return-email');
        var statusEl = document.getElementById('mobile-synciq-return-status');
        var submitBtn = document.getElementById('mobile-synciq-return-submit');

        form.addEventListener('submit', function (event) {
            event.preventDefault();
            var email = (emailInput && emailInput.value || '').trim().toLowerCase();

            if (emailInput) emailInput.classList.remove('is-error');
            setStatus(statusEl, '', '');

            if (!validateEmail(email)) {
                if (emailInput) emailInput.classList.add('is-error');
                setStatus(statusEl, 'Please enter a valid email address.', 'error');
                return;
            }

            if (submitBtn) submitBtn.disabled = true;
            setStatus(statusEl, 'Sending…', '');

            fetch('/api/synciq-return', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email }),
            })
                .then(function (res) {
                    return res.json().catch(function () { return {}; }).then(function (data) {
                        return { ok: res.ok, status: res.status, data: data };
                    });
                })
                .then(function (result) {
                    if (!result.ok) {
                        if (result.data && result.data.error) {
                            throw new Error(result.data.error);
                        }
                        if (result.status === 404) {
                            throw new Error('Email service is not available yet. Please try again in a few minutes.');
                        }
                        throw new Error('Something went wrong. Please try again.');
                    }

                    try {
                        sessionStorage.setItem(STORAGE_SUBMITTED, email);
                        sessionStorage.removeItem(STORAGE_DEPARTED);
                    } catch (e) {}

                    if (emailInput) emailInput.value = '';
                    showInstallSuccess(result.data && result.data.chromeStoreUrl);
                    if (submitBtn) submitBtn.textContent = 'Sent';
                })
                .catch(function (err) {
                    setStatus(statusEl, err.message || 'Something went wrong. Please try again.', 'error');
                    if (submitBtn) submitBtn.disabled = false;
                });
        });
    }

    function initBreakpointWatcher() {
        var mq = window.matchMedia('(max-width: ' + MOBILE_BREAKPOINT + 'px)');
        var onChange = function () {
            applyDeviceClass();
            updateHeroState(false);
        };

        if (typeof mq.addEventListener === 'function') {
            mq.addEventListener('change', onChange);
        } else if (typeof mq.addListener === 'function') {
            mq.addListener(onChange);
        }

        window.addEventListener('resize', onChange);
        window.addEventListener('orientationchange', onChange);
    }

    function init() {
        applyDeviceClass();
        initSynciqHeroLink();
        initReturnForm();
        initReturnResetLink();
        initBreakpointWatcher();
        updateHeroState(false);
    }

    window.addEventListener('pageshow', function (event) {
        applyDeviceClass();
        updateHeroState(Boolean(event.persisted));
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
