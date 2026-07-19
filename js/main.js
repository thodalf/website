(() => {
  'use strict';

  document.getElementById('year').textContent = new Date().getFullYear();

  /* ---- Cursor glow ---- */
  const glow = document.getElementById('cursorGlow');
  if (glow && matchMedia('(hover: hover)').matches) {
    window.addEventListener('pointermove', (e) => {
      glow.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
    }, { passive: true });
  }

  /* ---- Nav scroll state + progress bar ---- */
  const nav = document.getElementById('siteNav');
  const progress = document.getElementById('scrollProgress');
  const onScroll = () => {
    const scrolled = window.scrollY > 40;
    nav.classList.toggle('is-scrolled', scrolled);
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    progress.style.width = max > 0 ? `${(window.scrollY / max) * 100}%` : '0%';
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- Mobile nav toggle ---- */
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  navToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('is-open');
    nav.classList.toggle('is-open', isOpen);
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });
  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('is-open');
      nav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });

  /* ---- Scroll reveal ---- */
  const revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  /* ---- Card stack tilt (Charta Logica) ---- */
  const stack = document.querySelector('.card-stack');
  if (stack && matchMedia('(hover: hover)').matches) {
    const cards = stack.querySelectorAll('.card-stack__item');
    stack.addEventListener('mousemove', (e) => {
      const rect = stack.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      cards.forEach((card) => {
        card.style.setProperty('--tiltX', `${py * -10}deg`);
        card.style.setProperty('--tiltY', `${px * 10}deg`);
        card.style.transform = `rotate(0deg) translate3d(${px * 14}px, ${py * 10}px, 0) rotateX(${py * -8}deg) rotateY(${px * 8}deg)`;
      });
    });
    stack.addEventListener('mouseleave', () => {
      cards.forEach((card) => { card.style.transform = ''; });
    });
  }

  /* ---- Parallax on hero blobs ---- */
  const heroBlobs = document.querySelectorAll('.hero__blob');
  if (heroBlobs.length && matchMedia('(hover: hover)').matches) {
    window.addEventListener('pointermove', (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 30;
      const y = (e.clientY / window.innerHeight - 0.5) * 30;
      heroBlobs.forEach((blob, i) => {
        const factor = i === 0 ? 1 : -1;
        blob.style.translate = `${x * factor}px ${y * factor}px`;
      });
    }, { passive: true });
  }

  /* ---- Mini-jeu : runner ---- */
  const runnerCanvas = document.getElementById('runnerCanvas');
  if (runnerCanvas) {
    const ctx = runnerCanvas.getContext('2d');
    const overlay = document.getElementById('runnerOverlay');
    const overlayText = document.getElementById('runnerOverlayText');
    const scoreEl = document.getElementById('runnerScore');
    const bestEl = document.getElementById('runnerBest');
    const minigameSection = document.getElementById('minigame');

    const BEST_KEY = 'linerve_runner_best';
    let best = Number(localStorage.getItem(BEST_KEY) || 0);
    bestEl.textContent = best;

    const GROUND_RATIO = 0.82;
    const GRAVITY = 2200;
    const JUMP_VELOCITY = -680;
    const PLAYER_SIZE = 26;
    const PLAYER_X = 50;

    let cssWidth = 0;
    let cssHeight = 220;
    let state = 'idle'; // idle | playing | gameover
    let player = { y: 0, vy: 0, onGround: true };
    let obstacles = [];
    let speed = 260;
    let score = 0;
    let groundOffset = 0;
    let spawnTimer = 0;
    let nextSpawn = 1.1;
    let lastTime = null;
    let inView = true;
    let audioCtx = null;

    function groundY() { return cssHeight * GROUND_RATIO; }

    function resize() {
      const rect = runnerCanvas.getBoundingClientRect();
      cssWidth = rect.width;
      cssHeight = rect.height || 220;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      runnerCanvas.width = Math.round(cssWidth * dpr);
      runnerCanvas.height = Math.round(cssHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    window.addEventListener('resize', resize, { passive: true });

    function beep(freq, duration, type = 'square') {
      try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
      } catch (err) { /* audio non bloquant */ }
    }

    function resetGame() {
      obstacles = [];
      score = 0;
      speed = 260;
      spawnTimer = 0;
      nextSpawn = 1.1;
      player.y = groundY() - PLAYER_SIZE;
      player.vy = 0;
      player.onGround = true;
      scoreEl.textContent = '0';
    }

    function startGame() {
      resetGame();
      state = 'playing';
      overlay.classList.add('is-hidden');
    }

    function jump() {
      if (state !== 'playing' || !player.onGround) return;
      player.vy = JUMP_VELOCITY;
      player.onGround = false;
      beep(620, 0.08);
    }

    function endGame() {
      state = 'gameover';
      const finalScore = Math.floor(score);
      if (finalScore > best) {
        best = finalScore;
        localStorage.setItem(BEST_KEY, String(best));
        bestEl.textContent = best;
      }
      overlayText.textContent = `Score ${finalScore} — Espace pour rejouer`;
      overlay.classList.remove('is-hidden');
      beep(140, 0.25, 'sawtooth');
    }

    function handleInput() {
      if (state === 'playing') { jump(); return; }
      startGame();
    }

    overlay.addEventListener('click', handleInput);
    runnerCanvas.addEventListener('pointerdown', handleInput);
    window.addEventListener('keydown', (e) => {
      if (!inView) return;
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        handleInput();
      }
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        entries.forEach((entry) => { inView = entry.isIntersecting; });
      }, { threshold: 0.3 }).observe(minigameSection);
    }

    function spawnObstacle() {
      const h = 22 + Math.random() * 26;
      const w = 14 + Math.random() * 10;
      obstacles.push({ x: cssWidth + w, w, h });
    }

    function update(dt) {
      groundOffset = (groundOffset + (state === 'playing' ? speed : 40) * dt) % 28;

      if (state !== 'playing') {
        player.y = groundY() - PLAYER_SIZE + Math.sin(performance.now() / 400) * 3;
        return;
      }

      score += dt * 12;
      scoreEl.textContent = Math.floor(score);
      speed = 260 + Math.floor(score) * 1.6;

      player.vy += GRAVITY * dt;
      player.y += player.vy * dt;
      const gy = groundY() - PLAYER_SIZE;
      if (player.y >= gy) {
        player.y = gy;
        player.vy = 0;
        player.onGround = true;
      }

      spawnTimer += dt;
      if (spawnTimer >= nextSpawn) {
        spawnTimer = 0;
        nextSpawn = Math.max(0.7, 1.5 - score / 400) + Math.random() * 0.6;
        spawnObstacle();
      }

      obstacles.forEach((o) => { o.x -= speed * dt; });
      obstacles = obstacles.filter((o) => o.x + o.w > -10);

      const pad = 5;
      const py = player.y;
      for (const o of obstacles) {
        const oy = groundY() - o.h;
        const overlapX = PLAYER_X + pad < o.x + o.w - pad && PLAYER_X + PLAYER_SIZE - pad > o.x + pad;
        const overlapY = py + pad < oy + o.h - pad && py + PLAYER_SIZE - pad > oy;
        if (overlapX && overlapY) { endGame(); break; }
      }
    }

    function draw() {
      ctx.clearRect(0, 0, cssWidth, cssHeight);

      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      for (let x = -groundOffset; x < cssWidth; x += 28) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, cssHeight); ctx.stroke();
      }

      const gy = groundY();
      ctx.strokeStyle = 'rgba(34,211,238,0.5)';
      ctx.shadowColor = 'rgba(34,211,238,0.6)';
      ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.moveTo(0, gy + PLAYER_SIZE); ctx.lineTo(cssWidth, gy + PLAYER_SIZE); ctx.stroke();
      ctx.shadowBlur = 0;

      obstacles.forEach((o) => {
        const oy = gy - o.h;
        const grad = ctx.createLinearGradient(o.x, oy, o.x, oy + o.h);
        grad.addColorStop(0, '#ff6b5e');
        grad.addColorStop(1, '#2b6bff');
        ctx.fillStyle = grad;
        ctx.shadowColor = 'rgba(255,59,48,0.5)';
        ctx.shadowBlur = 10;
        ctx.fillRect(o.x, oy, o.w, o.h);
        ctx.shadowBlur = 0;
      });

      const py = player.y;
      const pgrad = ctx.createLinearGradient(PLAYER_X, py, PLAYER_X + PLAYER_SIZE, py + PLAYER_SIZE);
      pgrad.addColorStop(0, '#a855f7');
      pgrad.addColorStop(1, '#22d3ee');
      ctx.fillStyle = pgrad;
      ctx.shadowColor = 'rgba(168,85,247,0.6)';
      ctx.shadowBlur = 14;
      const r = 6;
      ctx.beginPath();
      ctx.moveTo(PLAYER_X + r, py);
      ctx.arcTo(PLAYER_X + PLAYER_SIZE, py, PLAYER_X + PLAYER_SIZE, py + PLAYER_SIZE, r);
      ctx.arcTo(PLAYER_X + PLAYER_SIZE, py + PLAYER_SIZE, PLAYER_X, py + PLAYER_SIZE, r);
      ctx.arcTo(PLAYER_X, py + PLAYER_SIZE, PLAYER_X, py, r);
      ctx.arcTo(PLAYER_X, py, PLAYER_X + PLAYER_SIZE, py, r);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    function loop(t) {
      if (lastTime === null) lastTime = t;
      const dt = Math.min((t - lastTime) / 1000, 0.05);
      lastTime = t;
      update(dt);
      draw();
      requestAnimationFrame(loop);
    }

    resize();
    resetGame();
    requestAnimationFrame(loop);
  }
})();
