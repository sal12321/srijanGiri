/**
 * Srijan Giri — Game Developer Portfolio
 * scripts.js | Production v2.0
 *
 * Sections:
 *  1. Canvas particle background
 *  2. Navbar scroll behaviour
 *  3. Hamburger / mobile menu
 *  4. Hero typewriter
 *  5. Smooth scroll
 *  6. Project card video hover
 *  7. Intersection Observer — reveal & skill bars
 *  8. Contact form — validation + POST
 */

'use strict';

/* ─────────────────────────────────────────────
   1. CANVAS PARTICLE BACKGROUND
   ───────────────────────────────────────────── */
(function initCanvas() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H, particles = [];

  const PARTICLE_COUNT = 80;
  const ACCENT = 'rgba(255,77,106,';

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function Particle() {
    this.reset();
  }

  Particle.prototype.reset = function () {
    this.x     = Math.random() * W;
    this.y     = Math.random() * H;
    this.vx    = (Math.random() - 0.5) * 0.4;
    this.vy    = (Math.random() - 0.5) * 0.4;
    this.r     = Math.random() * 1.5 + 0.5;
    this.alpha = Math.random() * 0.4 + 0.05;
  };

  Particle.prototype.update = function () {
    this.x += this.vx;
    this.y += this.vy;
    if (this.x < 0 || this.x > W || this.y < 0 || this.y > H) this.reset();
  };

  Particle.prototype.draw = function () {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = ACCENT + this.alpha + ')';
    ctx.fill();
  };

  function drawConnections() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = ACCENT + (0.06 * (1 - dist / 120)) + ')';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
  }

  function loop() {
    ctx.clearRect(0, 0, W, H);

    // Radial glow at bottom
    const grad = ctx.createRadialGradient(W / 2, H, 0, W / 2, H, H * 0.7);
    grad.addColorStop(0, 'rgba(200,0,54,0.08)');
    grad.addColorStop(1, 'rgba(8,8,16,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    drawConnections();
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(loop);
  }

  resize();
  particles = Array.from({ length: PARTICLE_COUNT }, () => new Particle());
  loop();

  window.addEventListener('resize', resize, { passive: true });
})();


/* ─────────────────────────────────────────────
   2. NAVBAR SCROLL BEHAVIOUR
   ───────────────────────────────────────────── */
(function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  const onScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // run once on load
})();


/* ─────────────────────────────────────────────
   3. HAMBURGER / MOBILE MENU
   ───────────────────────────────────────────── */
(function initMobileMenu() {
  const btn  = document.getElementById('hamburger');
  const menu = document.getElementById('mobile-menu');
  if (!btn || !menu) return;

  btn.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('open');
    btn.classList.toggle('open', isOpen);
    btn.setAttribute('aria-expanded', isOpen);
    menu.setAttribute('aria-hidden', !isOpen);
    // prevent body scroll when menu open
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  // close on mobile link click
  menu.querySelectorAll('.mobile-link').forEach(link => {
    link.addEventListener('click', () => {
      menu.classList.remove('open');
      btn.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      menu.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    });
  });
})();


/* ─────────────────────────────────────────────
   4. HERO TYPEWRITER
   ───────────────────────────────────────────── */
(function initTypewriter() {
  const el = document.getElementById('typed-text');
  if (!el) return;

  const phrases = [
    'Game Developer',
    'Gameplay Programmer',
    'World Builder',
    'UE5 Specialist',
  ];

  let phraseIdx = 0, charIdx = 0, deleting = false;
  const SPEED_TYPE = 80, SPEED_DEL = 40, PAUSE = 1800;

  function tick() {
    const phrase = phrases[phraseIdx];
    el.textContent = deleting ? phrase.slice(0, charIdx--) : phrase.slice(0, charIdx++);

    if (!deleting && charIdx > phrase.length) {
      deleting = true;
      return setTimeout(tick, PAUSE);
    }
    if (deleting && charIdx < 0) {
      deleting = false;
      phraseIdx = (phraseIdx + 1) % phrases.length;
      return setTimeout(tick, 400);
    }
    setTimeout(tick, deleting ? SPEED_DEL : SPEED_TYPE);
  }

  setTimeout(tick, 800);
})();


/* ─────────────────────────────────────────────
   5. SMOOTH SCROLL
   ───────────────────────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (href === '#') return;
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});


/* ─────────────────────────────────────────────
   6. PROJECT CARD VIDEO HOVER
   WHY changed: original version paused ALL videos
   on mouseenter, then played only current. The new
   version correctly tracks which video is active
   and never affects videos on other cards.
   ───────────────────────────────────────────── */
(function initProjectVideos() {
  document.querySelectorAll('.project-card').forEach(card => {
    const video = card.querySelector('.project-video');
    if (!video) return;

    card.addEventListener('mouseenter', () => {
      video.play().catch(() => {}); // catch if browser blocks autoplay
    });

    card.addEventListener('mouseleave', () => {
      video.pause();
      video.currentTime = 0;
    });
  });
})();


/* ─────────────────────────────────────────────
   7. INTERSECTION OBSERVER — REVEAL & SKILL BARS
   WHY changed: original used inline style mutations
   which fight with CSS transitions. New version uses
   class toggling for clean, CSS-driven animation.
   ───────────────────────────────────────────── */
(function initObserver() {
  // Generic reveal for sections
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  // Project cards staggered entry
  const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        const card = entry.target;
        const delay = (parseInt(card.dataset.index || 0) - 1) * 120;
        setTimeout(() => card.classList.add('visible'), delay);
        cardObserver.unobserve(card);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

  document.querySelectorAll('.project-card').forEach(card => cardObserver.observe(card));

  // Skill bars — animate width when visible
  const skillObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const fill = entry.target;
        const level = fill.dataset.level || '0';
        fill.style.width = level + '%';
        skillObserver.unobserve(fill);
      }
    });
  }, { threshold: 0.3 });

  document.querySelectorAll('.skill-fill').forEach(bar => skillObserver.observe(bar));
})();


/* ─────────────────────────────────────────────
   8. CONTACT FORM — VALIDATION + POST
   WHY added: original had no form or backend route.
   Client validates first; if valid, POSTs to /contact
   (Express endpoint in server.js). Falls back
   gracefully if server is not running.
   ───────────────────────────────────────────── */
(function initContactForm() {
  const form      = document.getElementById('contact-form');
  if (!form) return;

  const statusEl  = document.getElementById('form-status');
  const submitBtn = document.getElementById('submit-btn');
  const btnText   = submitBtn?.querySelector('.btn-text');
  const btnLoad   = submitBtn?.querySelector('.btn-loading');

  // ── Validators ──────────────────────────────
  const validators = {
    name:    v => v.trim().length >= 2       || 'Name must be at least 2 characters.',
    email:   v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || 'Please enter a valid email address.',
    subject: v => v.trim().length >= 3       || 'Subject must be at least 3 characters.',
    message: v => v.trim().length >= 15      || 'Message must be at least 15 characters.',
  };

  function validateField(name, value) {
    const result = validators[name]?.(value);
    return result === true ? '' : (result || '');
  }

  function showFieldError(name, msg) {
    const input = form.querySelector(`[name="${name}"]`);
    const errorEl = document.getElementById(`${name}-error`);
    if (input) input.classList.toggle('error', !!msg);
    if (errorEl) errorEl.textContent = msg;
  }

  // Live validation on blur
  form.querySelectorAll('.form-input').forEach(input => {
    input.addEventListener('blur', () => {
      if (input.name && validators[input.name]) {
        showFieldError(input.name, validateField(input.name, input.value));
      }
    });
    // clear error on input
    input.addEventListener('input', () => {
      showFieldError(input.name, '');
    });
  });

  // ── Submit ───────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
      name:    form.name.value,
      email:   form.email.value,
      subject: form.subject.value,
      message: form.message.value,
    };

    // Validate all fields
    let hasErrors = false;
    for (const [field, value] of Object.entries(data)) {
      const err = validateField(field, value);
      showFieldError(field, err);
      if (err) hasErrors = true;
    }
    if (hasErrors) return;

    // Loading state
    submitBtn.disabled = true;
    if (btnText) btnText.hidden = true;
    if (btnLoad) btnLoad.hidden = false;
    setStatus('', '');

    try {
      const res = await fetch('/contact', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      });

      if (res.ok) {
        form.reset();
        setStatus('✓ Message sent! I\'ll get back to you within 24 hours.', 'success');
      } else {
        const err = await res.json().catch(() => ({}));
        setStatus(err.message || '✕ Something went wrong. Please try again.', 'error-msg');
      }
    } catch {
      // Network error — server may not be running in static mode
      setStatus('✕ Could not connect to server. Please email me directly.', 'error-msg');
    } finally {
      submitBtn.disabled = false;
      if (btnText) btnText.hidden = false;
      if (btnLoad) btnLoad.hidden = true;
    }
  });

  function setStatus(msg, type) {
    statusEl.textContent = msg;
    statusEl.className   = 'form-status' + (type ? ' ' + type : '');
  }
})();
