const WHATSAPP_NUMBER = '37477105163';

const whatsappUrl = (message) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

const defaultMessage = 'Здравствуйте! Пишу с сайта TOVMASYAN Jeweler. Хочу получить консультацию.';

document.querySelectorAll('[data-whatsapp]').forEach((link) => {
  const message = link.dataset.whatsapp || defaultMessage;
  link.href = whatsappUrl(message);
  link.target = '_blank';
  link.rel = 'noopener';
});

document.querySelectorAll('[data-product]').forEach((link) => {
  const product = link.dataset.product;
  const message = `Здравствуйте! Пишу с сайта TOVMASYAN Jeweler. Меня интересует: ${product}. Подскажите, пожалуйста, наличие и цену.`;
  link.href = whatsappUrl(message);
  link.target = '_blank';
  link.rel = 'noopener';
});

const header = document.querySelector('[data-header]');
const onScroll = () => {
  document.body.classList.toggle('is-scrolled', window.scrollY > 24);
};
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

const menuToggle = document.querySelector('[data-menu-toggle]');
const nav = document.querySelector('[data-nav]');

if (menuToggle && nav) {
  menuToggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('is-open');
    menuToggle.classList.toggle('is-open', isOpen);
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('is-open');
      menuToggle.classList.remove('is-open');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

const revealItems = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -40px 0px' });

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
}

const chips = document.querySelectorAll('[data-filter]');
const products = document.querySelectorAll('[data-category]');

function setFilter(filter) {
  chips.forEach((chip) => chip.classList.toggle('is-active', chip.dataset.filter === filter));
  products.forEach((product) => {
    const categories = product.dataset.category.split(' ');
    const visible = filter === 'all' || categories.includes(filter);
    product.classList.toggle('is-hidden', !visible);
  });
}

chips.forEach((chip) => {
  chip.addEventListener('click', () => setFilter(chip.dataset.filter));
});

document.querySelectorAll('[data-filter-link]').forEach((link) => {
  link.addEventListener('click', () => {
    const filter = link.dataset.filterLink;
    setTimeout(() => setFilter(filter), 80);
  });
});

const orderForm = document.querySelector('[data-order-form]');
if (orderForm) {
  orderForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(orderForm);
    const name = String(formData.get('name') || '').trim();
    const interest = String(formData.get('interest') || '').trim();
    const message = String(formData.get('message') || '').trim();

    const lines = [
      'Здравствуйте! Пишу с сайта TOVMASYAN Jeweler.',
      name ? `Меня зовут: ${name}.` : '',
      interest ? `Интересует: ${interest}.` : '',
      message ? `Комментарий: ${message}` : '',
      'Подскажите, пожалуйста, детали и стоимость.'
    ].filter(Boolean);

    document.dispatchEvent(new CustomEvent('tovmasyan:order-request', {
      detail: { name, interest, message }
    }));

    window.open(whatsappUrl(lines.join('\n')), '_blank', 'noopener');
  });
}

const cursorGlow = document.querySelector('.cursor-glow');
if (cursorGlow && window.matchMedia('(pointer: fine)').matches) {
  window.addEventListener('pointermove', (event) => {
    document.body.classList.add('has-cursor');
    cursorGlow.style.left = `${event.clientX}px`;
    cursorGlow.style.top = `${event.clientY}px`;
  }, { passive: true });
}

const year = document.querySelector('[data-year]');
if (year) {
  year.textContent = new Date().getFullYear();
}
