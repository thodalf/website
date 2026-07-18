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
})();
