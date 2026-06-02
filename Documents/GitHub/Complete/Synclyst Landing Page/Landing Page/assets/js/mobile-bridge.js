(function () {
    'use strict';

    var CHROME_STORE_URL = 'https://chromewebstore.google.com/detail/synclyst-listing-autopilo/copjkijolfpmhjgiggafngmdeibnmfnm';
    var STORAGE_EMAIL = 'synclyst_mobile_email';
    var STORAGE_FROM = 'synclyst_mobile_from';
    var RESEND_COOLDOWN_MS = 60000;
    var MOBILE_BREAKPOINT = 900;

    var LABELS = {
        heroMobile: 'Claim Your 5 Free Scans (Create Account)',
        heroDesktop: 'Install Chrome Extension (Get 5 Free Scans)',
        stickyMobile: 'Secure My 5 Scans →',
        stickyDesktop: 'Install Extension →'
    };

    function $(sel, root) {
        return (root || document).querySelector(sel);
    }

    function isMobileDevice() {
        var ua = navigator.userAgent || '';
        var mobileUA = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|CriOS|FxiOS/i.test(ua);
        var tabletUA = /iPad|Tablet|PlayBook|Silk/i.test(ua);
        var inAppBrowser = /TikTok|BytedanceWebview|musical_ly|Instagram|FBAN|FBAV|Twitter/i.test(ua);

        if (inAppBrowser) return true;
        if (mobileUA || tabletUA) return true;

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

    function scrollToSignup() {
        var section = $('#mobile-signup');
        if (!section) return;

        section.scrollIntoView({ behavior: 'smooth', block: 'start' });

        setTimeout(function () {
            var emailInput = $('#signupEmail');
            if (emailInput) emailInput.focus({ preventScroll: true });
        }, 450);
    }

    function validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function showFieldError(input, errorEl, message) {
        input.classList.add('is-error');
        errorEl.textContent = message;
        errorEl.classList.add('is-visible');
    }

    function clearFieldError(input, errorEl) {
        input.classList.remove('is-error');
        errorEl.classList.remove('is-visible');
    }

    function getWelcomeUrl() {
        return window.location.origin + '/chromeextension/welcome';
    }

    function goToChromeStore() {
        window.location.href = CHROME_STORE_URL;
    }

    function handleSmartCta(e) {
        var target = e.target.closest('[data-open-signup], #heroCta, #stickyCtaBtn');
        if (!target) return;

        e.preventDefault();

        if (shouldUseMobileFlow()) {
            scrollToSignup();
        } else {
            goToChromeStore();
        }
    }

    function setCtaAsLink(el, href, label) {
        if (el.tagName === 'A') {
            el.href = href;
            el.textContent = label;
            el.removeAttribute('data-open-signup');
            return el;
        }

        var link = document.createElement('a');
        link.className = el.className;
        link.id = el.id || '';
        link.href = href;
        link.textContent = label;

        if (el.hasAttribute('data-cta-role')) {
            link.setAttribute('data-cta-role', el.getAttribute('data-cta-role'));
        }

        el.parentNode.replaceChild(link, el);
        return link;
    }

    function initDeviceCTAs() {
        var mobile = applyDeviceClass();
        var heroCta = $('#heroCta');
        var stickyCta = $('#stickyCtaBtn');
        var stickyText = $('#stickyCtaText');

        if (heroCta) {
            if (mobile) {
                heroCta.textContent = LABELS.heroMobile;
                heroCta.setAttribute('data-open-signup', '');
            } else {
                setCtaAsLink(heroCta, CHROME_STORE_URL, LABELS.heroDesktop);
            }
        }

        if (stickyCta) {
            if (mobile) {
                stickyCta.textContent = LABELS.stickyMobile;
                stickyCta.setAttribute('data-open-signup', '');
            } else {
                if (stickyText) stickyText.textContent = 'Desktop ready';
                setCtaAsLink(stickyCta, CHROME_STORE_URL, LABELS.stickyDesktop);
            }
        }
    }

    function handleSignupSubmit(e) {
        e.preventDefault();

        if (!shouldUseMobileFlow()) {
            goToChromeStore();
            return;
        }

        var form = e.target;
        var emailInput = $('#signupEmail', form);
        var passwordInput = $('#signupPassword', form);
        var emailError = $('#emailError', form);
        var passwordError = $('#passwordError', form);
        var submitBtn = $('#signupSubmit', form);

        var email = emailInput.value.trim();
        var password = passwordInput.value;

        clearFieldError(emailInput, emailError);
        clearFieldError(passwordInput, passwordError);

        var valid = true;
        if (!validateEmail(email)) {
            showFieldError(emailInput, emailError, 'Please enter a valid email address.');
            valid = false;
        }
        if (password.length < 8) {
            showFieldError(passwordInput, passwordError, 'Password must be at least 8 characters.');
            valid = false;
        }
        if (!valid) return;

        submitBtn.classList.add('is-loading');
        submitBtn.disabled = true;

        try {
            sessionStorage.setItem(STORAGE_EMAIL, email);
            sessionStorage.setItem(STORAGE_FROM, 'mobile_bridge');
        } catch (err) { /* ignore */ }

        var welcomeUrl = getWelcomeUrl();
        var signUpUrl = '/sign-up?redirect_url=' + encodeURIComponent(welcomeUrl) +
            '&email=' + encodeURIComponent(email) +
            '&source=mobile_bridge';

        window.location.href = signUpUrl;
    }

    function initStickyCta() {
        var sticky = $('#stickyCta');
        var hero = $('#hero');
        if (!sticky || !hero) return;

        var observer = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    sticky.classList.toggle('is-visible', !entry.isIntersecting);
                });
            },
            { threshold: 0, rootMargin: '0px 0px -20px 0px' }
        );
        observer.observe(hero);
    }

    function initPasswordToggle() {
        var toggle = $('#passwordToggle');
        var input = $('#signupPassword');
        if (!toggle || !input) return;

        toggle.addEventListener('click', function () {
            var isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            toggle.textContent = isPassword ? 'Hide' : 'Show';
        });
    }

    function initLandingPage() {
        initDeviceCTAs();

        document.addEventListener('click', handleSmartCta);

        var form = $('#signupForm');
        if (form) form.addEventListener('submit', handleSignupSubmit);

        initStickyCta();
        initPasswordToggle();

        window.addEventListener('resize', function () {
            initDeviceCTAs();
        });
    }

    function showToast(message) {
        var toast = $('#toast');
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add('is-visible');
        setTimeout(function () {
            toast.classList.remove('is-visible');
        }, 3500);
    }

    function initWelcomePage() {
        if (!shouldUseMobileFlow()) {
            window.location.replace(CHROME_STORE_URL);
            return;
        }

        var emailEl = $('#userEmail');
        var resendBtn = $('#resendBtn');
        if (!emailEl) return;

        var email = '';
        try {
            email = sessionStorage.getItem(STORAGE_EMAIL) || '';
        } catch (err) { /* ignore */ }

        var params = new URLSearchParams(window.location.search);
        if (!email && params.get('email')) {
            email = params.get('email');
        }

        if (email) {
            emailEl.textContent = email;
            emailEl.closest('.mb-email-card').classList.remove('is-hidden');
        } else {
            emailEl.closest('.mb-email-card').classList.add('is-hidden');
        }

        if (!resendBtn) return;

        var lastResend = 0;
        try {
            lastResend = parseInt(sessionStorage.getItem('synclyst_last_resend') || '0', 10);
        } catch (err) { /* ignore */ }

        function updateResendState() {
            var elapsed = Date.now() - lastResend;
            if (elapsed < RESEND_COOLDOWN_MS) {
                var secs = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
                resendBtn.disabled = true;
                resendBtn.textContent = 'Resend again in ' + secs + 's';
            } else {
                resendBtn.disabled = false;
                resendBtn.textContent = 'Resend Desktop Link';
            }
        }

        updateResendState();
        var interval = setInterval(updateResendState, 1000);

        resendBtn.addEventListener('click', function () {
            if (Date.now() - lastResend < RESEND_COOLDOWN_MS) return;

            lastResend = Date.now();
            try {
                sessionStorage.setItem('synclyst_last_resend', String(lastResend));
            } catch (err) { /* ignore */ }

            updateResendState();
            showToast('✓ Link resent! Check your inbox.');

            if (email && validateEmail(email)) {
                var welcomeUrl = window.location.href.split('?')[0];
                setTimeout(function () {
                    window.location.href = '/sign-in?email=' + encodeURIComponent(email) +
                        '&redirect_url=' + encodeURIComponent(welcomeUrl);
                }, 1500);
            }
        });

        window.addEventListener('beforeunload', function () {
            clearInterval(interval);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            if ($('#signupForm')) initLandingPage();
            if ($('#welcomePage')) initWelcomePage();
        });
    } else {
        if ($('#signupForm')) initLandingPage();
        if ($('#welcomePage')) initWelcomePage();
    }
})();
