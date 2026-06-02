/* =============================================
   NAV HIGHLIGHT ON SCROLL
   Uses IntersectionObserver to watch all <section id="...">
   elements. When a section enters the viewport, the matching
   nav link gets the .active class; all others lose it.

   rootMargin '-40% 0px -55% 0px' means a section is considered
   "active" only when its top edge is between 40% and 55% from
   the top of the viewport — prevents flickering at boundaries.

   The .active class is defined in styles.css (nav-links a.active).
   ============================================= */

// Collect all navigable sections and their matching nav anchors
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // Remove .active from all links, then apply it to the one whose
        // href matches the currently visible section's id
        navLinks.forEach((link) => {
          link.classList.toggle(
            'active',
            link.getAttribute('href') === '#' + entry.target.id
          );
        });
      }
    });
  },
  { rootMargin: '-40% 0px -55% 0px' }
);

// Attach observer to every section that has an id
sections.forEach((s) => observer.observe(s));
