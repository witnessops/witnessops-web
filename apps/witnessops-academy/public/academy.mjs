const header = document.querySelector('[data-menu]');
const toggle = header?.querySelector('.menu-toggle');
const navigation = header?.querySelector('nav');

if (header && toggle && navigation) {
  header.dataset.menuReady = 'true';
  toggle.hidden = false;

  function closeMenu(returnFocus = false) {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open academy navigation');
    if (returnFocus) toggle.focus();
  }

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', `${open ? 'Close' : 'Open'} academy navigation`);
  });
  navigation.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      closeMenu(true);
    }
  });
  document.addEventListener('click', (event) => {
    if (!header.contains(event.target)) closeMenu();
  });
  document.addEventListener('focusin', (event) => {
    if (!header.contains(event.target)) closeMenu();
  });
  matchMedia('(min-width: 900px)').addEventListener('change', () => closeMenu());
}
