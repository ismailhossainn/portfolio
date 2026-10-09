/* ==========================================================================
   Ismail Hossain — Portfolio
   ========================================================================== */
(() => {
    'use strict';

    const $  = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

    const root = document.documentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scrollBehavior = reduceMotion ? 'auto' : 'smooth';

    // ------------------------------------------------------------------
    // PRIMARY COLOUR — the colour itself lives in css/style.css (--primary, top of the file).
    // Here we only pick a readable colour for text/icons that sit ON it:
    // white, unless the colour is so light that white would be hard to read.
    // ------------------------------------------------------------------
    const applyPrimaryContrast = () => {
        try {
            const value = getComputedStyle(root).getPropertyValue('--primary').trim();
            if (!value) return;
            const ctx = document.createElement('canvas').getContext('2d');
            ctx.fillStyle = '#000';
            ctx.fillStyle = value;          // the canvas parses any CSS colour (hex, rgb, hsl, names …)
            ctx.fillRect(0, 0, 1, 1);
            const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
            const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
            const lum = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
            const whiteContrast = 1.05 / (lum + 0.05);
            root.style.setProperty('--on-primary', whiteContrast >= 3 ? '#ffffff' : '#111111');
        } catch (err) { /* keep the CSS default (white) */ }
    };
    applyPrimaryContrast();
    // handy for trying colours live in the browser console:  setPrimaryColor('#2563eb')
    window.setPrimaryColor = (color) => { root.style.setProperty('--primary', color); applyPrimaryContrast(); };

    // ------------------------------------------------------------------
    // SPLASH SCREEN — CSS slides it down at 0.5s–0.9s; remove it once gone
    // ------------------------------------------------------------------
    const splash = $('#splash');
    if (splash) {
        const removeSplash = () => splash.remove();
        splash.addEventListener('animationend', (e) => {
            if (e.animationName === 'splashOut') removeSplash();
        });
        setTimeout(removeSplash, 1200); // safety net
    }

    // ------------------------------------------------------------------
    // CUSTOM CURSOR
    // ------------------------------------------------------------------
    const cursor = $('#cursor');
    if (cursor && window.matchMedia('(pointer: fine)').matches) {
        const hoverTargets = 'a, button, [role="button"], .portfolio-card, .expertise-card, .contact-item, .filter-btn, .mode-toggle, .platform-nav-dot, input[type="range"]';
        let mouseX = 0, mouseY = 0, cursorX = 0, cursorY = 0, shown = false;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            if (!shown) {
                shown = true;
                cursorX = mouseX;
                cursorY = mouseY;
                cursor.classList.add('visible');
            }
        }, { passive: true });

        document.addEventListener('mouseover', (e) => {
            cursor.classList.toggle('hover', !!e.target.closest(hoverTargets));
        });
        document.addEventListener('mousedown', () => cursor.classList.add('down'));
        document.addEventListener('mouseup', () => cursor.classList.remove('down'));
        document.documentElement.addEventListener('mouseleave', () => cursor.classList.remove('visible'));
        document.documentElement.addEventListener('mouseenter', () => { if (shown) cursor.classList.add('visible'); });

        const animateCursor = () => {
            cursorX += (mouseX - cursorX) * 0.15;
            cursorY += (mouseY - cursorY) * 0.15;
            cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;
            requestAnimationFrame(animateCursor);
        };
        animateCursor();
    }

    // ------------------------------------------------------------------
    // DAY / DARK MODE TOGGLE
    // ------------------------------------------------------------------
    // Which theme to start with is decided by the tiny script in <head> (before first paint):
    //   saved toggle choice → else the device setting (light = Day) → else Dark.
    // Here we keep the toggle's icons in sync, save new choices, and follow the device
    // setting live as long as the visitor has never used the toggle.
    const THEME_KEY = 'theme-choice';
    const readSavedTheme = () => { try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; } };
    const modeToggle = $('#mode-toggle');
    if (modeToggle) {
        const sunIcon  = $('.sun-icon', modeToggle);
        const moonIcon = $('.moon-icon', modeToggle);
        const syncToggle = () => {
            const dark = root.getAttribute('data-theme') === 'dark';
            sunIcon.style.display  = dark ? 'none'  : 'block';
            moonIcon.style.display = dark ? 'block' : 'none';
            modeToggle.setAttribute('aria-pressed', String(dark));
        };
        const setTheme = (theme, save = true) => {
            root.setAttribute('data-theme', theme);
            syncToggle();
            if (save) { try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* storage blocked */ } }
        };
        const toggleTheme = () => setTheme(root.getAttribute('data-theme') === 'dark' ? 'day' : 'dark');

        syncToggle();
        modeToggle.addEventListener('click', toggleTheme);
        modeToggle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleTheme(); }
        });
        // keep other open tabs of the site in step
        window.addEventListener('storage', (e) => {
            if (e.key === THEME_KEY && (e.newValue === 'dark' || e.newValue === 'day')) setTheme(e.newValue, false);
        });
        // device switches between light / dark → follow it (only if the visitor never chose)
        if (window.matchMedia) {
            const light = window.matchMedia('(prefers-color-scheme: light)');
            const follow = (e) => { if (!readSavedTheme()) setTheme(e.matches ? 'day' : 'dark', false); };
            if (light.addEventListener) light.addEventListener('change', follow);
            else if (light.addListener) light.addListener(follow);
        }
    }

    // ------------------------------------------------------------------
    // SCROLL: progress bar, side rail, active links, up / down buttons
    // ------------------------------------------------------------------
    const progressBar = $('#scroll-progress');
    const railFill    = $('#side-rail-fill');
    const upBtn       = $('#platform-up');
    const downBtn     = $('#platform-down');
    const sections    = $$('section[id]');
    const navLinks    = $$('.nav-link');
    const navDots     = $$('.platform-nav-dot');

    const maxScroll = () => Math.max(1, root.scrollHeight - window.innerHeight);

    // custom scrollbar thumb (size + position follow the page)
    const scrollbar = $('#scrollbar');
    const thumb = $('#scrollbar-thumb');
    const updateThumb = (y, max) => {
        if (!scrollbar || !thumb) return;
        const scrollable = root.scrollHeight - window.innerHeight > 1;
        scrollbar.classList.toggle('is-idle', !scrollable);
        if (!scrollable) return;
        const trackH = scrollbar.clientHeight;
        const thumbH = Math.min(trackH, Math.max(36, trackH * window.innerHeight / root.scrollHeight));
        thumb.style.height = thumbH + 'px';
        thumb.style.transform = `translateY(${(y / max) * (trackH - thumbH)}px)`;
    };

    const updateOnScroll = () => {
        const y = window.scrollY;
        const max = maxScroll();
        const pct = Math.min(100, Math.max(0, (y / max) * 100));

        if (progressBar) progressBar.style.width = pct + '%';
        if (railFill) railFill.style.height = pct + '%';
        updateThumb(y, max);

        let current = sections.length ? sections[0].id : '';
        sections.forEach((s) => { if (y >= s.offsetTop - 200) current = s.id; });
        navLinks.forEach((l) => l.classList.toggle('active', l.getAttribute('href') === '#' + current));
        navDots.forEach((d) => d.classList.toggle('active', d.dataset.target === current));

        if (upBtn)   upBtn.disabled   = y <= 4;
        if (downBtn) downBtn.disabled = y >= max - 4;
    };

    let scrollTicking = false;
    window.addEventListener('scroll', () => {
        if (scrollTicking) return;
        scrollTicking = true;
        requestAnimationFrame(() => { updateOnScroll(); scrollTicking = false; });
    }, { passive: true });
    window.addEventListener('resize', updateOnScroll);
    if ('ResizeObserver' in window) new ResizeObserver(updateOnScroll).observe(document.body); // page height changes (images load, filters…)
    updateOnScroll();

    // drag the thumb / click the track to page up or down
    if (scrollbar && thumb) {
        let drag = null;
        thumb.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            thumb.setPointerCapture(e.pointerId);
            drag = { startY: e.clientY, startScroll: window.scrollY };
            scrollbar.classList.add('dragging');
            root.style.scrollBehavior = 'auto'; // follow the pointer instantly, no easing
        });
        thumb.addEventListener('pointermove', (e) => {
            if (!drag) return;
            const travel = Math.max(1, scrollbar.clientHeight - thumb.offsetHeight);
            window.scrollTo(0, drag.startScroll + (e.clientY - drag.startY) * (maxScroll() / travel));
        });
        const endDrag = () => {
            if (!drag) return;
            drag = null;
            scrollbar.classList.remove('dragging');
            root.style.scrollBehavior = '';
        };
        thumb.addEventListener('pointerup', endDrag);
        thumb.addEventListener('pointercancel', endDrag);
        scrollbar.addEventListener('pointerdown', (e) => {
            if (e.target !== scrollbar) return;
            const above = e.clientY < thumb.getBoundingClientRect().top;
            window.scrollBy({ top: (above ? -1 : 1) * window.innerHeight * 0.85, behavior: scrollBehavior });
        });
    }

    // Up / Down: step through the sections (top ↔ about ↔ portfolio ↔ contact ↔ footer)
    const sectionTops = () => sections.map((s) => s.offsetTop);
    const scrollToY = (top) => window.scrollTo({ top, behavior: scrollBehavior });

    if (upBtn) {
        upBtn.addEventListener('click', () => {
            const y = window.scrollY;
            const above = sectionTops().filter((t) => t < y - 24);
            scrollToY(above.length ? Math.max(...above) : 0);
        });
    }
    if (downBtn) {
        downBtn.addEventListener('click', () => {
            const y = window.scrollY;
            const below = sectionTops().filter((t) => t > y + 24);
            scrollToY(below.length ? Math.min(...below) : maxScroll());
        });
    }

    // Side dots + in-page anchors
    navDots.forEach((dot) => {
        dot.addEventListener('click', () => {
            const target = document.getElementById(dot.dataset.target);
            if (target) target.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
        });
    });
    $$('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener('click', (e) => {
            const target = document.querySelector(anchor.getAttribute('href'));
            if (!target) return;
            e.preventDefault();
            target.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
        });
    });

    // ------------------------------------------------------------------
    // TYPING EFFECT — starts as the splash screen leaves
    // ------------------------------------------------------------------
    const typingText = $('#typing-text');
    if (typingText) {
        const fullText = typingText.textContent;
        if (reduceMotion) {
            typingText.textContent = fullText;
        } else {
            typingText.textContent = '';
            let i = 0;
            const type = () => {
                if (i < fullText.length) {
                    typingText.textContent += fullText.charAt(i++);
                    setTimeout(type, 70);
                }
            };
            setTimeout(type, 900);
        }
    }

    // ------------------------------------------------------------------
    // SHOWREEL PLAYER — a YouTube video driven through the YouTube IFrame API, with our own
    // controls (play/pause, seek bar, mute/unmute) instead of YouTube's. It starts muted and
    // with captions off; the visitor can unmute / seek / pause at any time.
    // The video is set by data-video-id on #showreel in index.html.
    // ------------------------------------------------------------------
    const reel = $('#showreel');
    if (reel && 'IntersectionObserver' in window) {
        const videoId   = reel.dataset.videoId;
        const controls  = $('#showreel-controls');
        const playBtn   = $('#vc-play');
        const muteBtn   = $('#vc-mute');
        const seek      = $('#vc-seek');
        const timeEl    = $('#vc-time');
        const shield    = $('#showreel-shield');
        const PLAYING = 1;

        let player = null, ticker = null;
        let muted = true;        // our own record of the sound state (YouTube's isMuted() is not reliable while it starts)
        let scrubbing = false;   // the seek bar is being dragged
        let userPaused = false;  // the visitor paused it → never auto-resume
        let autoPaused = false;  // we paused it because it scrolled out of view

        const fmt = (s) => {
            s = Math.max(0, Math.floor(s || 0));
            return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
        };
        const setSeek = (fraction) => {
            seek.value = Math.round(fraction * 1000);
            seek.style.setProperty('--pct', (fraction * 100) + '%');
        };
        const isPlaying = () => !!player && player.getPlayerState && player.getPlayerState() === PLAYING;

        const refreshTime = () => {
            if (!player || !player.getCurrentTime || scrubbing) return;
            const d = player.getDuration() || 0;
            const state = player.getPlayerState();
            // not started yet (-1) or only cued (5): YouTube reports odd times → show the start
            const t = (state === -1 || state === 5) ? 0 : Math.min(d || Infinity, player.getCurrentTime() || 0);
            setSeek(d ? Math.min(1, t / d) : 0);
            timeEl.textContent = fmt(t) + ' / ' + fmt(d);
        };
        const refreshButtons = () => {
            const playing = isPlaying();
            playBtn.classList.toggle('is-playing', playing);
            playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
            muteBtn.classList.toggle('is-muted', muted);
            muteBtn.setAttribute('aria-pressed', String(muted));
            muteBtn.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
        };
        // YouTube may switch captions on by itself (account setting etc.) → keep them off
        const captionsOff = () => {
            try { player.unloadModule('captions'); } catch (e) { /* module not loaded */ }
            try { player.unloadModule('cc'); } catch (e) { /* module not loaded */ }
        };

        const togglePlay = () => {
            if (!player) return;
            if (isPlaying()) { userPaused = true; autoPaused = false; player.pauseVideo(); }
            else { userPaused = false; autoPaused = false; player.playVideo(); }
        };
        const toggleMute = () => {
            if (!player) return;
            muted = !muted;
            if (muted) player.mute();
            else { player.unMute(); player.setVolume(100); }
            refreshButtons();
        };

        playBtn.addEventListener('click', togglePlay);
        shield.addEventListener('click', togglePlay);
        muteBtn.addEventListener('click', toggleMute);

        // seek bar: preview while dragging, jump when released (works with the keyboard too)
        seek.addEventListener('input', () => {
            scrubbing = true;
            const frac = seek.value / 1000, d = player && player.getDuration ? player.getDuration() : 0;
            seek.style.setProperty('--pct', (frac * 100) + '%');
            timeEl.textContent = fmt(frac * d) + ' / ' + fmt(d);
        });
        seek.addEventListener('change', () => {
            if (player && player.seekTo) {
                const d = player.getDuration() || 0;
                player.seekTo((seek.value / 1000) * d, true);
            }
            setTimeout(() => { scrubbing = false; refreshTime(); }, 150);
        });

        const onReady = () => {
            muted = true;
            player.mute();
            captionsOff();
            try { player.getIframe().title = 'Showreel — Ismail Hossain'; } catch (e) { /* ignore */ }
            controls.classList.add('is-ready');
            refreshButtons();
            refreshTime();
            if (!reduceMotion) player.playVideo();
        };
        let captionsChecked = false;
        const onStateChange = () => {
            refreshButtons();
            refreshTime();
            if (isPlaying()) {
                if (!ticker) ticker = setInterval(refreshTime, 250);
                if (!captionsChecked) { captionsChecked = true; captionsOff(); setTimeout(captionsOff, 1200); }
            } else if (ticker) {
                clearInterval(ticker);
                ticker = null;
            }
        };

        // load the YouTube API only when the video is about to be seen (the page stays light until then)
        const loadYouTubeApi = () => new Promise((resolve, reject) => {
            if (window.YT && window.YT.Player) return resolve(window.YT);
            const previous = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = () => { if (previous) previous(); resolve(window.YT); };
            const script = document.createElement('script');
            script.src = 'https://www.youtube.com/iframe_api';
            script.onerror = reject;
            document.head.appendChild(script);
        });
        const createPlayer = () => loadYouTubeApi().then((YT) => {
            const vars = {
                autoplay: reduceMotion ? 0 : 1, mute: 1, controls: 0, loop: 1, playlist: videoId,
                rel: 0, modestbranding: 1, playsinline: 1, fs: 0, disablekb: 1,
                cc_load_policy: 0, iv_load_policy: 3
            };
            if (/^https?:$/.test(location.protocol)) vars.origin = location.origin;
            player = new YT.Player('showreel-player', {
                videoId, width: '100%', height: '100%', playerVars: vars,
                events: { onReady, onStateChange }
            });
        }).catch(() => { /* offline / blocked: the controls simply stay hidden */ });

        const loadObserver = new IntersectionObserver((entries) => {
            if (entries.some((e) => e.isIntersecting)) { loadObserver.disconnect(); createPlayer(); }
        }, { rootMargin: '600px 0px' });
        loadObserver.observe(reel);

        // a muted video that scrolls out of view pauses itself, and carries on when it comes back
        new IntersectionObserver((entries) => {
            if (!player || !player.getPlayerState) return;
            const visible = entries[entries.length - 1].isIntersecting;
            if (!visible && isPlaying() && muted) { autoPaused = true; player.pauseVideo(); }
            else if (visible && autoPaused && !userPaused) { autoPaused = false; player.playVideo(); }
        }, { threshold: 0.25 }).observe(reel);
    }

    // ------------------------------------------------------------------
    // PIXEL REVEAL — works on ANY <img data-pixel-reveal="up|down">.
    // The picture is drawn on a canvas in small blocks that refine
    // (8px → 4 → 2 → sharp), one row of tiles after another:
    //   "up"   = sweeps from the bottom to the top
    //   "down" = sweeps from the top to the bottom
    // Optional per-image settings:
    //   data-pixel-block="8"   first block size in CSS px (4, 8, 16, 32 …)
    //   data-pixel-delay="300" extra delay in ms
    // Nothing is tied to a file name: swap the file in /images (any size,
    // PNG / JPG / WebP / transparent …) and the effect adapts to it.
    // ------------------------------------------------------------------
    const pixelReveal = (img, { from = 'bottom', block = 8, sweep = 800, jitter = 260, step = 70 } = {}) => {
        // arms the image (hidden until revealed) and returns start(delay)
        img.classList.add('pixel-armed');

        let started = false;
        const finishNow = () => img.classList.remove('pixel-armed');

        // draw the image into a W×H canvas the way object-fit would show it
        const drawFitted = (ctx, W, H, fit) => {
            const nw = img.naturalWidth, nh = img.naturalHeight;
            if (fit === 'cover') {
                const s = Math.max(W / nw, H / nh), sw = W / s, sh = H / s;
                ctx.drawImage(img, (nw - sw) / 2, (nh - sh) / 2, sw, sh, 0, 0, W, H);
            } else if (fit === 'contain' || fit === 'scale-down') {
                const s = Math.min(W / nw, H / nh), dw = nw * s, dh = nh * s;
                ctx.drawImage(img, 0, 0, nw, nh, (W - dw) / 2, (H - dh) / 2, dw, dh);
            } else {
                ctx.drawImage(img, 0, 0, W, H);
            }
        };

        const run = () => {
            const w0 = img.offsetWidth, h0 = img.offsetHeight;
            if (!w0 || !h0 || !img.naturalWidth) return finishNow();

            const cs = getComputedStyle(img);
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const W = Math.round(w0 * dpr), H = Math.round(h0 * dpr);
            const maxLevel = Math.min(7, Math.max(1, Math.round(Math.log2(block * dpr))));
            const tile = 1 << maxLevel;     // tile size in canvas px

            // levels[n] = picture downscaled by 2^n (each step averages 2×2 pixels)
            const levels = [document.createElement('canvas')];
            levels[0].width = W; levels[0].height = H;
            drawFitted(levels[0].getContext('2d'), W, H, cs.objectFit);
            for (let n = 1; n <= maxLevel; n++) {
                const prev = levels[n - 1];
                const c = document.createElement('canvas');
                c.width = Math.max(1, Math.ceil(prev.width / 2));
                c.height = Math.max(1, Math.ceil(prev.height / 2));
                const cctx = c.getContext('2d');
                cctx.imageSmoothingQuality = 'high';
                cctx.drawImage(prev, 0, 0, c.width, c.height);
                levels.push(c);
            }

            // overlay canvas: same box, radius and filter as the <img>
            const host = img.offsetParent || img.parentNode;
            const canvas = document.createElement('canvas');
            canvas.className = 'pixel-canvas';
            canvas.width = W; canvas.height = H;
            canvas.style.cssText = `left:${img.offsetLeft}px;top:${img.offsetTop}px;width:${w0}px;height:${h0}px;border-radius:${cs.borderRadius};filter:${cs.filter}`;
            host.insertBefore(canvas, host.firstChild);
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false; // hard-edged blocks

            // each tile starts according to its row (+ a little random jitter)
            const cols = Math.ceil(W / tile), rows = Math.ceil(H / tile);
            const cells = [];
            for (let r = 0; r < rows; r++) {
                const order = from === 'bottom' ? rows - 1 - r : r;
                for (let c = 0; c < cols; c++) {
                    cells.push({ c, r, level: -1, done: false,
                        t0: (rows > 1 ? order / (rows - 1) : 0) * sweep + Math.random() * jitter });
                }
            }

            let left = cells.length;
            const start = performance.now();
            const frame = (now) => {
                const t = now - start;
                for (const cell of cells) {
                    if (cell.done) continue;
                    const e = t - cell.t0;
                    if (e < 0) continue;
                    const level = Math.max(0, maxLevel - Math.floor(e / step));
                    if (level === cell.level) continue;
                    cell.level = level;
                    const s = tile >> level; // tile size inside levels[level]
                    ctx.drawImage(levels[level], cell.c * s, cell.r * s, s, s, cell.c * tile, cell.r * tile, tile, tile);
                    if (level === 0) { cell.done = true; left--; }
                }
                if (left > 0) {
                    requestAnimationFrame(frame);
                } else {
                    finishNow();                                   // the real image shows underneath…
                    requestAnimationFrame(() => canvas.remove());  // …then the canvas goes
                }
            };
            requestAnimationFrame(frame);
        };

        return (delay = 0) => {
            if (started) return;
            started = true;
            const go = () => setTimeout(() => { try { run(); } catch (err) { finishNow(); } }, delay);
            if (img.complete) go();
            else {
                img.addEventListener('load', go, { once: true });
                img.addEventListener('error', finishNow, { once: true });
            }
        };
    };

    if (!reduceMotion && 'IntersectionObserver' in window) {
        const SPLASH_END = 800; // do not start while the splash screen still covers the page
        const thresholds = Array.from({ length: 21 }, (_, i) => i / 20);
        $$('img[data-pixel-reveal]').forEach((img) => {
            const start = pixelReveal(img, {
                from: img.dataset.pixelReveal === 'down' ? 'top' : 'bottom',
                block: parseFloat(img.dataset.pixelBlock) || 8
            });
            const extra = parseFloat(img.dataset.pixelDelay) || 0;
            const io = new IntersectionObserver((entries) => {
                // start once a fair part of the image is on screen (works for very tall images too)
                const e = entries[entries.length - 1];
                if (!e.isIntersecting) return;
                if (e.intersectionRatio < 0.25 && e.intersectionRect.height < window.innerHeight * 0.4) return;
                io.disconnect();
                start(Math.max(0, SPLASH_END - performance.now()) + extra);
            }, { threshold: thresholds });
            io.observe(img);
        });
    }

    // ------------------------------------------------------------------
    // SCROLL REVEAL (with a small stagger for items revealed together)
    // ------------------------------------------------------------------
    const revealSelector = '.section-header, .sf-card, .expertise-card, .portfolio-card, .contact-item, .social-section, .view-more, .about-right h2, .filter-buttons, .contact-image-wrapper';
    const revealObserver = new IntersectionObserver((entries) => {
        entries.filter((e) => e.isIntersecting).forEach((entry, i) => {
            const el = entry.target;
            el.style.transitionDelay = (i * 70) + 'ms';
            el.classList.add('visible');
            // drop the delay afterwards so hover transitions stay instant
            setTimeout(() => { el.style.transitionDelay = ''; }, 1000 + i * 70);
            revealObserver.unobserve(el);
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    $$(revealSelector).forEach((el) => revealObserver.observe(el));

    // ------------------------------------------------------------------
    // PORTFOLIO FILTER
    // ------------------------------------------------------------------
    const filterBtns = $$('.filter-btn');
    const filterCards = $$('.portfolio-card[data-category]');
    filterBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            filterBtns.forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.dataset.filter;
            let shownIndex = 0;

            filterCards.forEach((card) => {
                const match = filter === 'all' || card.dataset.category === filter;
                if (match) {
                    const wasHidden = card.classList.contains('filter-hidden');
                    card.classList.remove('filter-hidden');
                    card.classList.add('visible');
                    if (wasHidden) {
                        // ease cards back in one after another
                        const delay = shownIndex++ * 40;
                        card.classList.add('filter-out');
                        requestAnimationFrame(() => requestAnimationFrame(() => {
                            card.style.transitionDelay = delay + 'ms';
                            card.classList.remove('filter-out');
                            setTimeout(() => { card.style.transitionDelay = ''; }, 600 + delay);
                        }));
                    } else {
                        card.classList.remove('filter-out');
                    }
                } else {
                    card.classList.add('filter-out');
                    setTimeout(() => {
                        if (card.classList.contains('filter-out')) card.classList.add('filter-hidden');
                    }, 300);
                }
            });
        });
    });

    // ------------------------------------------------------------------
    // COPY TO CLIPBOARD
    // ------------------------------------------------------------------
    const flashCopied = (btn) => {
        btn.classList.add('copied');
        setTimeout(() => btn.classList.remove('copied'), 2000);
    };
    const copyText = (text, btn) => {
        const fallback = () => {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.cssText = 'position:fixed;left:-9999px';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            flashCopied(btn);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => flashCopied(btn)).catch(fallback);
        } else {
            fallback();
        }
    };
    // referenced from the inline onclick attributes in index.html
    window.copyEmail = (btn) => copyText('ismailhossainn720@gmail.com', btn);
    window.copyPhone = (btn) => copyText('+8801580592245', btn);

    // ------------------------------------------------------------------
    // MOBILE MENU
    // ------------------------------------------------------------------
    const menuToggle = $('#menu-toggle');
    const navLinksMenu = $('#nav-links');
    if (menuToggle && navLinksMenu) {
        const setOpen = (open) => {
            navLinksMenu.classList.toggle('active', open);
            menuToggle.setAttribute('aria-expanded', String(open));
        };
        menuToggle.addEventListener('click', () => setOpen(!navLinksMenu.classList.contains('active')));
        navLinks.forEach((link) => link.addEventListener('click', () => setOpen(false)));
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.navbar')) setOpen(false);
        });
    }
})();
