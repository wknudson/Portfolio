(() => {
  'use strict';

  /* -------------------------------------------------------
     Dark / Light theme toggle
     ------------------------------------------------------- */
  const root = document.documentElement;
  const themeBtn = document.getElementById('theme-toggle');
  const STORAGE_KEY = 'wk-theme';

  function getPreferredTheme() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function setTheme(theme) {
    root.setAttribute('data-theme', theme);
  }

  setTheme(getPreferredTheme());

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      localStorage.setItem(STORAGE_KEY, next);
    });
  }

  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setTheme(e.matches ? 'light' : 'dark');
    }
  });

  /* -------------------------------------------------------
     Fade-in on scroll (IntersectionObserver)
     ------------------------------------------------------- */
  const faders = document.querySelectorAll('.fade-in');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    faders.forEach((el) => observer.observe(el));
  } else {
    faders.forEach((el) => el.classList.add('visible'));
  }

  /* -------------------------------------------------------
     Mobile nav toggle
     ------------------------------------------------------- */
  const toggle = document.querySelector('.nav__toggle');
  const menu = document.querySelector('.nav__menu');

  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const isOpen = menu.classList.toggle('open');
      toggle.classList.toggle('active');
      toggle.setAttribute('aria-expanded', isOpen);
    });

    menu.querySelectorAll('.nav__link').forEach((link) => {
      link.addEventListener('click', () => {
        menu.classList.remove('open');
        toggle.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* -------------------------------------------------------
     Active nav link highlight on scroll
     ------------------------------------------------------- */
  const sections = document.querySelectorAll('.section');
  const navLinks = document.querySelectorAll('.nav__link');

  function setActiveLink() {
    let current = '';
    sections.forEach((section) => {
      const top = section.offsetTop - 100;
      if (window.scrollY >= top) {
        current = section.getAttribute('id');
      }
    });
    navLinks.forEach((link) => {
      link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
    });
  }

  window.addEventListener('scroll', setActiveLink, { passive: true });
  setActiveLink();

  /* -------------------------------------------------------
     Screenshot lightbox / gallery
     ------------------------------------------------------- */
  const lightbox = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightbox-img');
  const lbCounter = document.getElementById('lightbox-counter');
  let galleryImages = [];
  let currentIndex = 0;

  function openLightbox(images, startIndex) {
    if (!lightbox || !lbImg || !lbCounter || !images.length) return;
    galleryImages = images;
    currentIndex = startIndex || 0;
    showSlide();
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.hidden = true;
    document.body.style.overflow = '';
  }

  function showSlide() {
    if (!lbImg || !lbCounter || !galleryImages.length) return;
    lbImg.src = galleryImages[currentIndex].src;
    lbImg.alt = galleryImages[currentIndex].alt;
    lbCounter.textContent = `${currentIndex + 1} / ${galleryImages.length}`;
  }

  function nextSlide() {
    currentIndex = (currentIndex + 1) % galleryImages.length;
    showSlide();
  }

  function prevSlide() {
    currentIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length;
    showSlide();
  }

  if (lightbox) {
    lightbox.querySelector('.lightbox__close').addEventListener('click', closeLightbox);
    lightbox.querySelector('.lightbox__next').addEventListener('click', nextSlide);
    lightbox.querySelector('.lightbox__prev').addEventListener('click', prevSlide);

    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', (e) => {
      if (lightbox.hidden) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
    });
  }

  /* -------------------------------------------------------
     Scroll progress bar
     ------------------------------------------------------- */
  const progressBar = document.getElementById('scroll-progress');

  function updateProgress() {
    if (!progressBar) return;
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    progressBar.style.width = `${progress}%`;
  }

  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  /* -------------------------------------------------------
     Back-to-top button
     ------------------------------------------------------- */
  const backToTop = document.getElementById('back-to-top');

  if (backToTop) {
    function toggleBackToTop() {
      const pastHero = window.scrollY > window.innerHeight * 0.5;
      if (pastHero) {
        backToTop.hidden = false;
        requestAnimationFrame(() => backToTop.classList.add('visible'));
      } else {
        backToTop.classList.remove('visible');
        backToTop.addEventListener('transitionend', () => {
          if (!backToTop.classList.contains('visible')) backToTop.hidden = true;
        }, { once: true });
      }
    }

    window.addEventListener('scroll', toggleBackToTop, { passive: true });

    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* -------------------------------------------------------
     Contact form — fetch submission with inline feedback
     ------------------------------------------------------- */
  const contactForm = document.querySelector('.contact__form');
  const formStatus = document.getElementById('form-status');

  if (contactForm && formStatus) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = contactForm.querySelector('[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Sending...';
      submitBtn.disabled = true;
      formStatus.hidden = true;

      try {
        const res = await fetch(contactForm.action, {
          method: 'POST',
          body: new FormData(contactForm),
          headers: { Accept: 'application/json' },
        });
        if (res.ok) {
          formStatus.textContent = 'Message sent! I\'ll get back to you soon.';
          formStatus.className = 'form-status success';
          formStatus.hidden = false;
          contactForm.reset();
        } else {
          throw new Error(`Server responded with ${res.status}`);
        }
      } catch {
        formStatus.textContent = 'Something went wrong. Please try again or email me directly.';
        formStatus.className = 'form-status error';
        formStatus.hidden = false;
      } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
  }

  /* -------------------------------------------------------
     Screenshot lightbox — card triggers
     ------------------------------------------------------- */
  document.querySelectorAll('.card__image-wrap, .card__gallery-btn').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const card = trigger.closest('.card');
      const gallery = card.querySelector('.card__gallery');
      if (!gallery) return;
      const imgs = Array.from(gallery.querySelectorAll('img'));
      openLightbox(imgs, 0);
    });
  });
})();
