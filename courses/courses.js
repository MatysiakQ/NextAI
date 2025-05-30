// Courses page JS
document.addEventListener('DOMContentLoaded', () => {
  setInterval(() => {
    document.querySelectorAll('.glitch').forEach(el => {
      el.classList.add('glitch-active');
      setTimeout(() => el.classList.remove('glitch-active'), 300);
    });
  }, 3000);

  const navToggle = document.querySelector('.nav-toggle');
  const navMenu = document.querySelector('.nav-menu');
  navToggle?.addEventListener('click', () => {
    navMenu.classList.toggle('show');
  });
});

// NAVIGATION INDICATOR LOGIC
document.addEventListener('DOMContentLoaded', () => {
  const menu = document.querySelector('.nav-menu');
  const links = document.querySelectorAll('.nav-item a');
  if (!menu || !links.length) return;
  const indicator = document.createElement('div');
  indicator.classList.add('nav-indicator');
  menu.appendChild(indicator);

  let hoveredLink = null;

  function updateIndicator(link) {
    if (!link) return;
    const rect = link.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    indicator.style.width = `${rect.width}px`;
    indicator.style.transform = `translateX(${rect.left - menuRect.left}px)`;
  }

  function setIndicatorToActive() {
    if (!hoveredLink) {
      const activeLink = document.querySelector('.nav-item a.active');
      if (activeLink) updateIndicator(activeLink);
    }
  }

  setIndicatorToActive();

  links.forEach(link => {
    link.addEventListener('mouseenter', () => {
      hoveredLink = link;
      updateIndicator(link);
    });
    link.addEventListener('mouseleave', () => {
      hoveredLink = null;
      setTimeout(() => {
        if (!document.querySelector('.nav-item a:hover')) {
          setIndicatorToActive();
        }
      }, 1);
    });
    link.addEventListener('touchend', () => {
      hoveredLink = null;
      setIndicatorToActive();
    });
  });

  menu.addEventListener('mouseleave', () => {
    hoveredLink = null;
    setIndicatorToActive();
  });
});
