// ---------- Blog init ----------
document.addEventListener('DOMContentLoaded', async () => {
  // Glitch efekt
  setInterval(() => {
    document.querySelectorAll('.glitch').forEach(el => {
      el.classList.add('glitch-active');
      setTimeout(() => el.classList.remove('glitch-active'), 300);
    });
  }, 3000);

  // Nawigacja
  const navToggle = document.querySelector('.nav-toggle');
  const navMenu = document.querySelector('.nav-menu');
  navToggle?.addEventListener('click', () => navMenu.classList.toggle('show'));

  // Wskaźnik aktywnego linku w menu
  const menu = document.querySelector('.nav-menu');
  const links = document.querySelectorAll('.nav-item a');
  if (menu && links.length) {
    const indicator = document.createElement('div');
    indicator.classList.add('nav-indicator');
    menu.appendChild(indicator);

    function updateIndicator(link) {
      const rect = link.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      indicator.style.width = `${rect.width}px`;
      indicator.style.transform = `translateX(${rect.left - menuRect.left}px)`;
    }

    function setIndicatorToActive() {
      const activeLink = document.querySelector('.nav-item a.active');
      if (activeLink) updateIndicator(activeLink);
    }

    setIndicatorToActive();

    links.forEach(link => {
      link.addEventListener('mouseenter', () => updateIndicator(link));
      link.addEventListener('mouseleave', () => setTimeout(setIndicatorToActive, 1));
      link.addEventListener('touchend', setIndicatorToActive);
    });

    menu.addEventListener('mouseleave', setIndicatorToActive);
  }

  // Modal bloga
  const blogModal = document.getElementById('blog-modal');
  const blogModalInner = document.getElementById('blog-modal-inner');
  const closeBlogModal = document.getElementById('close-blog-modal');

  closeBlogModal?.addEventListener('click', () => {
    blogModal.classList.add('hidden');
    document.body.classList.remove('modal-open');
  });

  blogModal?.addEventListener('click', e => {
    if (e.target === blogModal) {
      blogModal.classList.add('hidden');
      document.body.classList.remove('modal-open');
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      blogModal?.classList.add('hidden');
      document.body.classList.remove('modal-open');
    }
  });

  // --- DYNAMICZNE WPISY BLOGA ---
  async function fetchBlogPosts() {
    try {
      const res = await fetch('api/api_get_posts.php', { credentials: 'include' });
      if (!res.ok) throw new Error('Błąd pobierania postów');
      const data = await res.json();
      return data.posts || [];
    } catch (err) {
      console.error(err);
      return [];
    }
  }

  function renderBlogPosts(posts) {
    const container = document.querySelector('.blog-articles-grid');
    if (!container) return;
    container.innerHTML = '';
    posts.forEach((post, idx) => {
      // Poprawne parsowanie daty (obsługa formatu "YYYY-MM-DD" i "YYYY-MM-DD HH:MM:SS")
      let dateStr = '';
      if (post.date) {
        // Zamień "YYYY-MM-DD" na "YYYY-MM-DDT00:00:00" jeśli nie ma T
        let dateVal = post.date;
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
          dateVal += 'T00:00:00';
        } else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateVal)) {
          dateVal = dateVal.replace(' ', 'T');
        }
        const d = new Date(dateVal);
        dateStr = isNaN(d.getTime()) ? post.date : d.toLocaleDateString('pl-PL');
      }
      const card = document.createElement('article');
      card.className = 'blog-article-card';
      card.innerHTML = `
        <div class="blog-article-meta">
          <span class="blog-article-date"><i class="fa-regular fa-calendar"></i> ${dateStr}</span>
          <span class="blog-article-tag">${post.tag || ''}</span>
        </div>
        <h3 class="blog-article-title">${post.title || ''}</h3>
        <p class="blog-article-excerpt">${(post.content || '').replace(/<[^>]+>/g, '').slice(0, 180)}...</p>
        <a href="#" class="blog-readmore-btn" data-idx="${idx}">Czytaj więcej</a>
      `;
      container.appendChild(card);
    });

    // Obsługa modala dla dynamicznych wpisów
    document.querySelectorAll('.blog-readmore-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const idx = btn.getAttribute('data-idx');
        const post = posts[idx];
        if (!post) return;
        const blogModal = document.getElementById('blog-modal');
        const blogModalInner = document.getElementById('blog-modal-inner');
        blogModalInner.innerHTML = `
          <div class="modal-meta">
            <span><i class="fa-regular fa-calendar"></i> ${post.date ? new Date(post.date).toLocaleDateString('pl-PL') : ''}</span>
            <span style="color:#FFD700;font-weight:bold;">${post.tag || ''}</span>
          </div>
          <span class="modal-glitch-title" data-text="${post.title || ''}">${post.title || ''}</span>
          <div class="modal-body">${post.content || ''}</div>
        `;
        blogModal.classList.remove('hidden');
        document.body.classList.add('modal-open');
      });
    });
  }

  async function refreshBlog() {
    const posts = await fetchBlogPosts();
    renderBlogPosts(posts);
  }

  // --- FORMULARZ DODAWANIA DLA ADMINA ---
  async function isAdmin() {
    try {
      const res = await fetch('/userpanel/auth.php?action=user_data', { credentials: 'include' });
      if (!res.ok) return false;
      const data = await res.json();
      return !!(data.user && (data.user.is_admin === 1 || data.user.is_admin === true));
    } catch {
      return false;
    }
  }

  const addFormHtml = `
    <form id="add-blog-form" style="margin:32px 0;display:none;flex-direction:column;gap:10px;">
      <input type="text" id="blog-title" placeholder="Tytuł" required style="padding:8px;border-radius:6px;">
      <input type="text" id="blog-tag" placeholder="Tag (np. AI, Biznes)">
      <textarea id="blog-content" placeholder="Treść wpisu (HTML dozwolony)" required style="padding:8px;border-radius:6px;"></textarea>
      <input type="text" id="blog-author" placeholder="Autor (opcjonalnie)">
      <button type="submit" style="padding:8px 18px;border-radius:8px;background:#FFD700;color:#232946;font-weight:bold;">Dodaj wpis</button>
    </form>
    <button id="show-add-form-btn" style="margin:18px 0 0 0;padding:8px 18px;border-radius:8px;background:#0ff;color:#232946;font-weight:bold;">Dodaj nowy wpis</button>
  `;

  if (await isAdmin()) {
    const section = document.querySelector('.blog-section');
    if (section && !document.getElementById('add-blog-form')) {
      section.insertAdjacentHTML('beforeend', addFormHtml);
      const addForm = document.getElementById('add-blog-form');
      const showBtn = document.getElementById('show-add-form-btn');
      showBtn.addEventListener('click', () => {
        addForm.style.display = addForm.style.display === 'none' ? 'flex' : 'none';
      });

      addForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('blog-title').value.trim();
        const content = document.getElementById('blog-content').value.trim();
        const tag = document.getElementById('blog-tag').value.trim();
        const author = document.getElementById('blog-author').value.trim();
        if (!title || !content) {
          alert('Tytuł i treść są wymagane!');
          return;
        }
        const token = window.BLOG_API_TOKEN || '';
        try {
          const res = await fetch('api/api_post.php', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ title, content, tag, author })
          });
          const text = await res.text();
          let data;
          try {
            data = JSON.parse(text);
          } catch (err) {
            alert('Błąd serwera: ' + text.slice(0, 200));
            return;
          }
          if (data.success) {
            alert('Dodano wpis!');
            addForm.reset();
            addForm.style.display = 'none';
            await refreshBlog();
          } else {
            alert('Błąd: ' + (data.message || 'Nie udało się dodać wpisu'));
          }
        } catch (err) {
          alert('Błąd sieci: ' + err.message);
        }
      });
    }
  }

  // Na koniec – załaduj posty
  await refreshBlog();
});
