(() => {
  const config = window.TRACKS_BLOG_EDITOR_ENV || {};
  const statusEl = document.querySelector('[data-status]');
  const authPanel = document.querySelector('[data-auth-panel]');
  const workspace = document.querySelector('[data-workspace]');
  const loginForm = document.querySelector('[data-login-form]');
  const postForm = document.querySelector('[data-post-form]');
  const postList = document.querySelector('[data-post-list]');
  const emptyState = document.querySelector('[data-empty-state]');
  const sessionEmail = document.querySelector('[data-session-email]');
  const signOutButton = document.querySelector('[data-sign-out]');
  const refreshButton = document.querySelector('[data-refresh-posts]');
  const newPostButton = document.querySelector('[data-new-post]');
  const deleteButton = document.querySelector('[data-delete-post]');
  const saveButton = document.querySelector('[data-save-post]');
  const preview = document.querySelector('[data-preview]');
  const websiteBlogs = document.querySelector('[data-website-blogs]');
  const publishedCount = document.querySelector('[data-published-count]');
  const publicBlogLinks = document.querySelectorAll('[data-public-blog-link]');
  const editorTitle = document.querySelector('[data-editor-title]');
  const titleInput = document.querySelector('[data-title-input]');
  const slugInput = document.querySelector('[data-slug-input]');
  const idInput = document.querySelector('[data-post-id]');
  const publicSiteUrl = String(config.publicSiteUrl || '').trim().replace(/\/+$/, '');
  const isFileProtocol = window.location.protocol === 'file:';

  const state = {
    client: null,
    posts: [],
    activeId: null,
    slugEdited: false,
    preservingAccessError: false,
  };

  const looksLikeSupabaseBrowserKey = (key) =>
    key.startsWith('sb_publishable_') ||
    (key.startsWith('eyJ') && key.split('.').length === 3);

  const isConfigured =
    config.supabaseUrl?.startsWith('https://') &&
    config.supabaseAnonKey &&
    looksLikeSupabaseBrowserKey(config.supabaseAnonKey);

  const setStatus = (message, tone = '') => {
    statusEl.textContent = message;
    statusEl.dataset.tone = tone;
  };

  const getPublicHref = (path) => {
    const cleanPath = String(path || '').replace(/^\/+/, '');
    return publicSiteUrl ? `${publicSiteUrl}/${cleanPath}` : `../${cleanPath}`;
  };

  const syncPublicLinks = () => {
    publicBlogLinks.forEach((link) => {
      link.href = getPublicHref('blog.html');
    });
  };

  const escapeHtml = (value) =>
    String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const slugify = (value) =>
    String(value || '')
      .toLowerCase()
      .trim()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 96);

  const formatDate = (value) => {
    if (!value) return 'Unpublished';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unpublished';
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  const getPostTime = (post) => {
    const time = new Date(post.published_at || post.updated_at || post.created_at || 0).getTime();
    return Number.isNaN(time) ? 0 : time;
  };

  const getPublishedPosts = () =>
    state.posts
      .filter((post) => post.status === 'published')
      .slice()
      .sort((a, b) => getPostTime(b) - getPostTime(a));

  const getCategoryToneClass = (category) =>
    String(category || '').toLowerCase().includes('tour') ? 'is-tour' : '';

  const renderWebsiteBlogCard = (post) => {
    const category = post.category || 'Article';
    const readMinutes = Number(post.read_minutes) || 4;
    const author = post.author_name || 'Tracks';
    const date = formatDate(post.published_at);

    return `
      <a class="website-blog-card" href="${getPublicHref(`blog-post.html?slug=${encodeURIComponent(post.slug || '')}`)}" target="_blank" rel="noopener noreferrer">
        <article>
          <div class="article-visual">
            <div class="article-topline">
              <span class="article-pill ${getCategoryToneClass(category)}">${escapeHtml(category)}</span>
              <span class="article-date">${escapeHtml(date)}</span>
            </div>
            <div class="article-rows">
              <div class="article-row">
                <span>Status</span>
                <strong>Published</strong>
              </div>
              <div class="article-row">
                <span>Reading time</span>
                <strong>${readMinutes} min</strong>
              </div>
            </div>
          </div>
          <div class="article-meta">
            <span>Article</span>
            <span>${readMinutes} min read</span>
            <span>By ${escapeHtml(author)}</span>
          </div>
          <h3 class="article-title">${escapeHtml(post.title || 'Untitled post')}</h3>
          <p class="article-excerpt">${escapeHtml(post.excerpt || 'No excerpt yet.')}</p>
          <span class="read-link">
            Read article
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14"></path>
              <path d="m12 5 7 7-7 7"></path>
            </svg>
          </span>
        </article>
      </a>
    `;
  };

  const renderWebsiteBlogs = () => {
    if (!websiteBlogs) return;

    const publishedPosts = getPublishedPosts();
    if (publishedCount) {
      publishedCount.textContent = `${publishedPosts.length} published`;
    }

    websiteBlogs.innerHTML = publishedPosts.length
      ? publishedPosts.map(renderWebsiteBlogCard).join('')
      : '<div class="website-empty">Published blog posts will appear here using the same card layout as the public website.</div>';
  };

  const toDateInput = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
  };

  const renderBody = (body) => {
    const blocks = String(body || '')
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean);

    if (!blocks.length) {
      return '<p>Start typing to preview the post.</p>';
    }

    return blocks
      .map((block) => {
        if (block.startsWith('## ')) {
          return `<h2>${escapeHtml(block.slice(3))}</h2>`;
        }

        const lines = block.split(/\n/).map((line) => line.trim()).filter(Boolean);
        if (lines.length && lines.every((line) => line.startsWith('- '))) {
          return `<ul>${lines.map((line) => `<li>${escapeHtml(line.slice(2))}</li>`).join('')}</ul>`;
        }

        return `<p>${escapeHtml(block)}</p>`;
      })
      .join('');
  };

  const friendlyError = (error) => {
    if (!error) return 'Something went wrong.';
    if (error.code === '23505') return 'That slug already exists. Change it and try again.';
    if (error.code === 'PGRST116') return 'No matching blog was found to save or delete. Refresh and try again.';
    if (String(error.message || '').toLowerCase().includes('invalid login credentials')) {
      return 'Could not sign in. Check the super admin email and password.';
    }
    if (String(error.message || '').toLowerCase().includes('row-level security')) {
      return 'Supabase blocked this action. Confirm this user has owner or super_admin access in public.blog_editors, then refresh and sign in again.';
    }

    const parts = [error.message, error.details, error.hint].filter(Boolean);
    return parts.length ? parts.join(' ') : 'Something went wrong.';
  };

  const resetEditorState = () => {
    state.posts = [];
    state.activeId = null;
    renderPostList();
    fillForm();
  };

  const showSignedOut = (message = '', tone = '') => {
    authPanel.hidden = false;
    workspace.hidden = true;
    signOutButton.hidden = true;
    sessionEmail.textContent = '';
    setStatus(message, tone);
  };

  const setLoginDisabled = (disabled) => {
    loginForm.querySelectorAll('input, button').forEach((element) => {
      element.disabled = disabled;
    });
  };

  const isMatchingAdminRecord = (record, session) => {
    const role = String(record?.role || '').toLowerCase();
    const email = String(record?.email || '').toLowerCase();
    const sessionEmailValue = String(session?.user?.email || '').toLowerCase();
    const userId = String(record?.user_id || '');
    return ['owner', 'super_admin'].includes(role) &&
      (userId === session?.user?.id || email === sessionEmailValue);
  };

  const verifySuperAdminAccess = async (session) => {
    const { data, error } = await state.client
      .from('blog_editors')
      .select('user_id, email, role');

    if (error) {
      state.preservingAccessError = true;
      await state.client.auth.signOut();
      resetEditorState();
      showSignedOut(`Could not check super admin access: ${friendlyError(error)}`, 'error');
      return false;
    }

    if (!error && Array.isArray(data) && data.some((record) => isMatchingAdminRecord(record, session))) {
      return true;
    }

    state.preservingAccessError = true;
    await state.client.auth.signOut();
    resetEditorState();
    showSignedOut(`Only super admins can access this blog editor. Add ${session.user?.email || 'this user'} to public.blog_editors as owner or super_admin.`, 'error');
    return false;
  };

  const getFormPayload = () => {
    const formData = new FormData(postForm);
    const status = String(formData.get('status') || 'draft');
    const publishedDate = String(formData.get('published_at') || '').trim();
    const publishedAt = status === 'published'
      ? new Date(`${publishedDate || new Date().toISOString().slice(0, 10)}T12:00:00Z`).toISOString()
      : null;

    return {
      title: String(formData.get('title') || '').trim(),
      slug: slugify(formData.get('slug')),
      excerpt: String(formData.get('excerpt') || '').trim(),
      body: String(formData.get('body') || '').trim(),
      category: String(formData.get('category') || 'Article').trim(),
      author_name: String(formData.get('author_name') || 'Tracks').trim(),
      read_minutes: Number(formData.get('read_minutes')) || 4,
      status,
      published_at: publishedAt,
    };
  };

  const fillForm = (post = null) => {
    postForm.reset();
    state.activeId = post?.id || null;
    state.slugEdited = Boolean(post);
    idInput.value = post?.id || '';
    editorTitle.textContent = post ? 'Edit post' : 'New post';
    deleteButton.hidden = !post;
    if (saveButton) {
      saveButton.textContent = post ? 'Save changes' : 'Create blog';
    }

    postForm.elements.title.value = post?.title || '';
    postForm.elements.slug.value = post?.slug || '';
    postForm.elements.category.value = post?.category || 'Article';
    postForm.elements.author_name.value = post?.author_name || 'Tracks';
    postForm.elements.status.value = post?.status || 'draft';
    postForm.elements.published_at.value = toDateInput(post?.published_at);
    postForm.elements.read_minutes.value = post?.read_minutes || 4;
    postForm.elements.excerpt.value = post?.excerpt || '';
    postForm.elements.body.value = post?.body || '';

    renderPreview();
    renderPostList();
  };

  const renderPreview = () => {
    const payload = getFormPayload();

    preview.innerHTML = `
      <h1>${escapeHtml(payload.title || 'Untitled post')}</h1>
      <p><strong>${escapeHtml(payload.category || 'Article')}</strong> &middot; ${payload.read_minutes} min read</p>
      <p>${escapeHtml(payload.excerpt || 'No excerpt yet.')}</p>
      ${renderBody(payload.body)}
    `;
  };

  const renderPostList = () => {
    postList.innerHTML = state.posts
      .map((post) => `
        <button class="post-item" type="button" data-post-id="${escapeHtml(post.id)}" aria-current="${post.id === state.activeId}">
          <strong>${escapeHtml(post.title)}</strong>
          <span class="post-meta">${escapeHtml(formatDate(post.published_at))} &middot; ${escapeHtml(post.category || 'Article')}</span>
          <span class="status-pill">${escapeHtml(post.status)}</span>
        </button>
      `)
      .join('');

    emptyState.hidden = state.posts.length > 0;
    renderWebsiteBlogs();
  };

  const loadPosts = async () => {
    setStatus('Loading posts...', 'pending');

    const { data, error } = await state.client
      .from('blog_posts')
      .select('id, title, slug, excerpt, body, category, author_name, read_minutes, status, published_at, updated_at, created_at')
      .order('updated_at', { ascending: false });

    if (error) {
      setStatus(friendlyError(error), 'error');
      return;
    }

    state.posts = data || [];
    renderPostList();

    if (state.activeId) {
      const current = state.posts.find((post) => post.id === state.activeId);
      if (current) fillForm(current);
    }

    setStatus('Posts loaded.', 'success');
  };

  const savePost = async (event) => {
    event.preventDefault();

    const payload = getFormPayload();
    if (!payload.title || !payload.slug || !payload.excerpt || !payload.body) {
      setStatus('Title, slug, excerpt, and body are required.', 'error');
      return;
    }

    setStatus('Saving post...', 'pending');
    saveButton.disabled = true;
    deleteButton.disabled = true;

    const query = state.activeId
      ? state.client.from('blog_posts').update(payload).eq('id', state.activeId).select().single()
      : state.client.from('blog_posts').insert(payload).select().single();

    const { data, error } = await query;
    saveButton.disabled = false;
    deleteButton.disabled = false;

    if (error) {
      setStatus(friendlyError(error), 'error');
      return;
    }

    if (!data?.id) {
      setStatus('The save completed without returning a blog row. Refresh and check the blog list.', 'error');
      await loadPosts();
      return;
    }

    state.activeId = data.id;
    await loadPosts();
    fillForm(data);
    setStatus(payload.status === 'published' ? 'Post saved and published.' : 'Post saved.', 'success');
  };

  const deletePost = async () => {
    if (!state.activeId) return;

    const post = state.posts.find((item) => item.id === state.activeId);
    const confirmed = window.confirm(`Delete "${post?.title || 'this post'}"? This cannot be undone.`);
    if (!confirmed) return;

    setStatus('Deleting post...', 'pending');
    saveButton.disabled = true;
    deleteButton.disabled = true;

    const { data, error } = await state.client
      .from('blog_posts')
      .delete()
      .eq('id', state.activeId)
      .select('id')
      .maybeSingle();

    saveButton.disabled = false;
    deleteButton.disabled = false;

    if (error) {
      setStatus(friendlyError(error), 'error');
      return;
    }

    if (!data?.id) {
      setStatus('No blog was deleted. Refresh and try again.', 'error');
      return;
    }

    fillForm();
    await loadPosts();
    setStatus('Post deleted.', 'success');
  };

  const showSession = async () => {
    const { data } = await state.client.auth.getSession();
    const session = data?.session;

    if (!session) {
      if (state.preservingAccessError) {
        state.preservingAccessError = false;
        return;
      }

      showSignedOut();
      return;
    }

    authPanel.hidden = true;
    workspace.hidden = true;
    signOutButton.hidden = false;
    sessionEmail.textContent = session.user?.email || '';
    setStatus('Checking super admin access...', 'pending');

    const hasAccess = await verifySuperAdminAccess(session);
    if (!hasAccess) return;

    workspace.hidden = false;
    await loadPosts();
    if (!state.activeId) fillForm(state.posts[0] || null);
  };

  const initAuth = () => {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      setStatus('Signing in...', 'pending');

      const formData = new FormData(loginForm);
      const email = String(formData.get('email') || '').trim().toLowerCase();
      const password = String(formData.get('password') || '');

      if (!email || !password) {
        setStatus('Email and password are required.', 'error');
        return;
      }

      const { error } = await state.client.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setStatus(friendlyError(error), 'error');
        return;
      }

      loginForm.reset();
      await showSession();
    });

    signOutButton.addEventListener('click', async () => {
      await state.client.auth.signOut();
      resetEditorState();
      await showSession();
      setStatus('Signed out.', 'success');
    });

    state.client.auth.onAuthStateChange(() => {
      showSession();
    });
  };

  const initEditor = () => {
    newPostButton.addEventListener('click', () => {
      fillForm();
      setStatus('New post ready.', 'success');
    });

    refreshButton.addEventListener('click', loadPosts);
    deleteButton.addEventListener('click', deletePost);
    postForm.addEventListener('submit', savePost);

    postList.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const button = target?.closest('[data-post-id]');
      if (!button) return;

      const post = state.posts.find((item) => item.id === button.dataset.postId);
      if (post) fillForm(post);
    });

    slugInput.addEventListener('input', () => {
      state.slugEdited = true;
      slugInput.value = slugify(slugInput.value);
      renderPreview();
    });

    titleInput.addEventListener('input', () => {
      if (!state.slugEdited) {
        slugInput.value = slugify(titleInput.value);
      }
      renderPreview();
    });

    postForm.addEventListener('input', renderPreview);
    fillForm();
  };

  const initPwa = () => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
      });
    }
  };

  const init = async () => {
    syncPublicLinks();

    if (isFileProtocol) {
      showSignedOut('Open the editor from http://localhost:4174 or a deployed editor URL. Browsers block parts of login when this page is opened with file://.', 'error');
      setLoginDisabled(true);
      return;
    }

    if (!isConfigured || !window.supabase) {
      showSignedOut('Set Supabase values in config.js locally, or in Netlify environment variables before deploy.', 'error');
      setLoginDisabled(true);
      return;
    }

    setLoginDisabled(false);
    state.client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
    initAuth();
    initEditor();
    initPwa();
    await showSession();
  };

  init();
})();
