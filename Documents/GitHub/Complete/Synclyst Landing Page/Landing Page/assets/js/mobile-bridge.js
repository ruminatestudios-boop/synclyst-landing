(function () {
    'use strict';

    var CHROME_STORE_URL = 'https://chromewebstore.google.com/detail/synclyst-listing-autopilo/copjkijolfpmhjgiggafngmdeibnmfnm';
    var STORAGE_EMAIL = 'synclyst_mobile_email';
    var STORAGE_FROM = 'synclyst_mobile_from';
    var RESEND_COOLDOWN_MS = 60000;

    var LABELS = {
        heroMobile: 'Claim Your 5 Free Scans (Create Account)',
        heroDesktop: 'Install Chrome Extension (Get 5 Free Scans)',
        stickyMobile: 'Secure My 5 Scans →',
        stickyDesktop: 'Install Extension →',
        secondaryMobile: 'Lock In My 5 Free Scans →'
    };

    function $(sel, root) {
        return (root || document).querySelector(sel);
    }

    function $$(sel, root) {
        return Array.prototype.slice.call((root || document).querySelectorAll(sel));
    }

    function isMobileDevice() {
        var ua = navigator.userAgent || '';
        var mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
        var coarsePointer = window.matchMedia('(pointer: coarse)').matches;
        var narrowScreen = window.matchMedia('(max-width: 768px)').matches;
        return mobileUA || (coarsePointer && narrowScreen);
    }

    function applyDeviceClass() {
        var mobile = isMobileDevice();
        document.documentElement.classList.toggle('is-mobile', mobile);
        document.documentElement.classList.toggle('is-desktop', !mobile);
        return mobile;
    }

    function openSheet() {
        var backdrop = $('#signupBackdrop');
        var sheet = $('#signupSheet');
        if (!backdrop || !sheet) return;
        backdrop.classList.add('is-open');
        sheet.classList.add('is-open');
        document.body.classList.add('sheet-open');
        var emailInput = $('#signupEmail');
        if (emailInput) {
            setTimeout(function () { emailInput.focus(); }, 350);
        }
    }

    function closeSheet() {
        var backdrop = $('#signupBackdrop');
        var sheet = $('#signupSheet');
        if (!backdrop || !sheet) return;
        backdrop.classList.remove('is-open');
        sheet.classList.remove('is-open');
        document.body.classList.remove('sheet-open');
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

    function navigateToChromeStore() {
        window.location.href = CHROME_STORE_URL;
    }

    function bindSignupTrigger(el) {
        el.addEventListener('click', function (e) {
            e.preventDefault();
            if (isMobileDevice()) {
                openSheet();
            } else {
                navigateToChromeStore();
            }
        });
    }

    function setCtaAsLink(el, href, label) {
        var link = document.createElement('a');
        link.className = el.className;
        link.id = el.id || '';
        link.href = href;
        link.textContent = label;
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');

        if (el.hasAttribute('data-cta-role')) {
            link.setAttribute('data-cta-role', el.getAttribute('data-cta-role'));
        }

        el.parentNode.replaceChild(link, el);
    }

    function initDeviceCTAs() {
        var mobile = applyDeviceClass();
        var heroCta = $('#heroCta');
        var stickyCta = $('#stickyCtaBtn');
        var stickyText = $('#stickyCtaText');

        if (heroCta) {
            if (mobile) {
                heroCta.textContent = LABELS.heroMobile;
                bindSignupTrigger(heroCta);
            } else {
                setCtaAsLink(heroCta, CHROME_STORE_URL, LABELS.heroDesktop);
            }
        }

        if (stickyCta) {
            if (mobile) {
                stickyCta.textContent = LABELS.stickyMobile;
                bindSignupTrigger(stickyCta);
            } else {
                if (stickyText) stickyText.textContent = 'Desktop ready';
                setCtaAsLink(stickyCta, CHROME_STORE_URL, LABELS.stickyDesktop);
            }
        }

        $$('[data-open-signup]').forEach(function (el) {
            if (el.id === 'heroCta' || el.id === 'stickyCtaBtn') return;
            if (mobile) {
                bindSignupTrigger(el);
            } else {
                setCtaAsLink(el, CHROME_STORE_URL, el.textContent.trim() || LABELS.heroDesktop);
            }
        });
    }

    function handleSignupSubmit(e) {
        e.preventDefault();

        if (!isMobileDevice()) {
            navigateToChromeStore();
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

    function initFeatureVideos() {
        $$('.mb-feature-video').forEach(function (video) {
            video.muted = true;
            video.playsInline = true;
            video.loop = true;
            video.autoplay = true;

            var playPromise = video.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(function () { /* autoplay blocked */ });
            }
        });
    }

    function initLandingPage() {
        initDeviceCTAs();

        var backdrop = $('#signupBackdrop');
        var closeBtn = $('#signupClose');
        if (backdrop) backdrop.addEventListener('click', closeSheet);
        if (closeBtn) closeBtn.addEventListener('click', closeSheet);

        var form = $('#signupForm');
        if (form) form.addEventListener('submit', handleSignupSubmit);

        initStickyCta();
        initPasswordToggle();
        initFeatureVideos();

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeSheet();
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
        if (!isMobileDevice()) {
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
