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
  const previewToggle = document.querySelector('[data-preview-toggle]');
  const resetButton = document.querySelector('[data-reset-post]');
  const clearDialog = document.querySelector('[data-clear-dialog]');
  const confirmClearButton = document.querySelector('[data-confirm-clear]');
  const cancelClearButton = document.querySelector('[data-cancel-clear]');
  const editorPreview = document.querySelector('[data-editor-preview]');
  const preview = document.querySelector('[data-preview]');
  const websiteBlogs = document.querySelector('[data-website-blogs]');
  const publishedCount = document.querySelector('[data-published-count]');
  const publicBlogLinks = document.querySelectorAll('[data-public-blog-link]');
  const editorTitle = document.querySelector('[data-editor-title]');
  const titleInput = document.querySelector('[data-title-input]');
  const slugInput = document.querySelector('[data-slug-input]');
  const imageInput = document.querySelector('[data-image-input]');
  const imageFileInput = document.querySelector('[data-image-file-input]');
  const imageFileName = document.querySelector('[data-image-file-name]');
  const publishDateField = document.querySelector('[data-publish-date-field]');
  const idInput = document.querySelector('[data-post-id]');
  const bodyInput = document.querySelector('[data-body-input]');
  const bodyEditor = document.querySelector('[data-body-editor]');
  const toolbarButtons = document.querySelectorAll('[data-format-command]');
  const publicSiteUrl = String(config.publicSiteUrl || '').trim().replace(/\/+$/, '');
  const isFileProtocol = window.location.protocol === 'file:';
  const blogImageBucket = 'blog-images';
  const maxBlogImageBytes = 5 * 1024 * 1024;
  const allowedBlogImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

  const state = {
    client: null,
    posts: [],
    activeId: null,
    slugEdited: false,
    previewMode: false,
    pendingImageFile: null,
    pendingImagePreviewUrl: '',
    preservingAccessError: false,
  };

  const defaultDraft = {
    title: 'The Money Behind the Music Deserves Its Own Dashboard',
    slug: 'the-money-behind-the-music-deserves-its-own-dashboard',
    image_url: '',
    category: 'Music finance',
    author_name: 'Tracks',
    status: 'draft',
    published_at: '',
    read_minutes: 7,
    excerpt: 'Tracks brings royalties, gigs, merch, splits, connected accounts, and tax visibility into one music-first finance dashboard.',
    body: `
      <p><strong>Independent artists and bands are running more than creative projects.</strong> They are running businesses.</p>
      <p>Income comes from everywhere: royalties, gigs, merch, brand deals, syncs, Shopify orders, accounting platforms, and tax records. Some of it belongs to the whole band. Some belongs to individual members. Some has to be split with managers, accountants, or collaborators. Too often, all of that ends up spread across spreadsheets, screenshots, email threads, and half-remembered calculations.</p>
      <blockquote>Tracks is built to bring that picture together.</blockquote>
      <h2>A finance dashboard for music teams</h2>
      <p>At its core, Tracks is a finance dashboard designed specifically for musicians, bands, managers, and accountants. Instead of forcing music income into generic bookkeeping tools, it starts with the way music actually works: multiple revenue streams, shared ownership, role-based access, and a constant need to understand who is owed what.</p>
      <p>The overview dashboard gives artists a clear view of total income across royalties, tours and gigs, merch, brand income, sync, and other sources. Band members can see their own share, while managers can view commission estimates by revenue type. That means the same workspace can support the whole team without everyone needing the same level of access.</p>
      <h2>People, roles, and splits</h2>
      <p>One of the most useful parts of Tracks is the <strong>People &amp; Splits</strong> system. Bands can add artists, members, managers, accountants, and solo artist profiles, then define revenue splits or commission percentages. This turns financial tracking from a vague group conversation into something visible and structured.</p>
      <h2>Connected accounts reduce manual admin</h2>
      <p>Tracks also looks beyond manual entry. The app is being built around connected accounts, with support for services like Xero, QuickBooks, Shopify, PRS, Curve, Music Glue, SumUp, Companies House, HMRC, Spotify, and email-based workflows. The goal is simple: reduce the amount of financial admin musicians have to do by hand.</p>
      <h2>Tax visibility belongs beside income</h2>
      <p>Tax is part of the same picture. Tracks includes tax and HMRC-focused areas so upcoming deadlines and estimated tax obligations can sit beside the income that created them. For artists who are used to finding this out too late, that visibility matters.</p>
      <h2>Practical questions Tracks helps answer</h2>
      <p>The result is a dashboard that helps music teams answer practical questions faster:</p>
      <ul>
        <li>How much did we make this tax year?</li>
        <li>Where did the money come from?</li>
        <li>What is my share?</li>
        <li>What does the manager earn?</li>
        <li>Which deadlines are coming up?</li>
        <li>Which platforms are connected?</li>
        <li>Who has access to what?</li>
      </ul>
      <p>What makes Tracks interesting is that it treats music finance as its own category. A band is not a normal small business. A solo artist is not just a freelancer. A manager does not look at revenue the same way a drummer does. Tracks is designed around those differences.</p>
      <p>Tracks is still growing, but the direction is clear. It is a financial home base for music teams that want less admin, fewer awkward money conversations, and a clearer view of the business behind their creative work.</p>
      <p>For independent musicians, that kind of clarity can be the difference between guessing and planning. And for teams trying to grow sustainably, it gives the money side of music the same attention as the music itself.</p>
    `,
  };

  const emptyDraft = {
    title: '',
    slug: '',
    image_url: '',
    category: 'Article',
    author_name: 'Tracks',
    status: 'draft',
    published_at: '',
    read_minutes: 4,
    excerpt: '',
    body: '',
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

  const revokePendingImagePreview = () => {
    if (!state.pendingImagePreviewUrl) return;
    URL.revokeObjectURL(state.pendingImagePreviewUrl);
    state.pendingImagePreviewUrl = '';
  };

  const setImageFileLabel = (label = '') => {
    if (!imageFileName) return;
    imageFileName.textContent = label || (imageInput?.value ? 'Saved photo ready' : 'No photo selected');
  };

  const clearPendingImageFile = ({ clearInput = true } = {}) => {
    revokePendingImagePreview();
    state.pendingImageFile = null;
    if (clearInput && imageFileInput) imageFileInput.value = '';
    setImageFileLabel();
  };

  const setPendingImageFile = (file) => {
    clearPendingImageFile({ clearInput: false });
    state.pendingImageFile = file;
    state.pendingImagePreviewUrl = URL.createObjectURL(file);
    setImageFileLabel(`${file.name} selected`);
    renderPreview();
  };

  const getPreviewImageSrc = () => state.pendingImagePreviewUrl || imageInput?.value || '';

  const escapeHtml = (value) =>
    String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const getImageExtension = (file) => {
    const mimeExtension = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    }[file.type];

    if (mimeExtension) return mimeExtension;

    const nameExtension = String(file.name || '').split('.').pop();
    return nameExtension ? nameExtension.toLowerCase().replace(/[^a-z0-9]/g, '') : 'jpg';
  };

  const getUploadSlug = () => slugify(slugInput.value || titleInput.value || 'blog-image') || 'blog-image';

  const getUploadPath = (file) => {
    const randomId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `blog/${getUploadSlug()}-${randomId}.${getImageExtension(file)}`;
  };

  const allowedRichTextTags = new Set([
    'a',
    'blockquote',
    'br',
    'em',
    'h2',
    'li',
    'ol',
    'p',
    's',
    'strong',
    'u',
    'ul',
  ]);

  const blockRichTextTags = new Set(['blockquote', 'h2', 'ol', 'p', 'ul']);
  const richHtmlPattern = /<\/?(a|b|blockquote|br|div|em|h2|i|li|ol|p|s|span|strike|strong|u|ul)(\s|>|\/)/i;
  const allowedListTypes = new Set(['1', 'a', 'A', 'i', 'I']);

  const isAllowedLink = (href) => {
    try {
      const url = new URL(href, window.location.href);
      return ['http:', 'https:', 'mailto:'].includes(url.protocol);
    } catch {
      return false;
    }
  };

  const normalizeRichHtml = (html) => {
    const template = document.createElement('template');
    template.innerHTML = String(html || '');

    const output = document.createElement('div');
    let paragraph = null;

    const ensureParagraph = () => {
      if (!paragraph) paragraph = document.createElement('p');
      return paragraph;
    };

    const flushParagraph = () => {
      if (!paragraph) return;

      if (paragraph.textContent.trim() || paragraph.querySelector('br')) {
        output.append(paragraph);
      }

      paragraph = null;
    };

    Array.from(template.content.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.textContent.trim()) {
          ensureParagraph().append(document.createTextNode(node.textContent));
        }
        return;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) return;

      const tag = node.tagName.toLowerCase();
      if (blockRichTextTags.has(tag)) {
        flushParagraph();
        output.append(node.cloneNode(true));
        return;
      }

      if (tag === 'li') {
        flushParagraph();
        const list = document.createElement('ul');
        list.append(node.cloneNode(true));
        output.append(list);
        return;
      }

      ensureParagraph().append(node.cloneNode(true));
    });

    flushParagraph();

    output.querySelectorAll('p, h2, li, blockquote').forEach((element) => {
      if (!element.textContent.trim() && !element.querySelector('br')) {
        element.remove();
      }
    });

    output.querySelectorAll('ul, ol').forEach((element) => {
      if (!element.querySelector('li')) {
        element.remove();
      }
    });

    return output.innerHTML.trim();
  };

  const createSafeRichNode = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode(node.textContent || '');
    }

    const fragment = document.createDocumentFragment();
    if (node.nodeType !== Node.ELEMENT_NODE) return fragment;

    const rawTag = node.tagName.toLowerCase();
    const tag = rawTag === 'b'
      ? 'strong'
      : rawTag === 'i'
        ? 'em'
        : rawTag === 'strike'
          ? 's'
          : rawTag === 'div'
            ? 'p'
            : rawTag;

    if (!allowedRichTextTags.has(tag)) {
      Array.from(node.childNodes).forEach((child) => {
        fragment.append(createSafeRichNode(child));
      });
      return fragment;
    }

    const element = document.createElement(tag);

    if (tag === 'a') {
      const href = node.getAttribute('href') || '';
      if (!isAllowedLink(href)) {
        Array.from(node.childNodes).forEach((child) => {
          fragment.append(createSafeRichNode(child));
        });
        return fragment;
      }

      element.href = href;
      element.target = '_blank';
      element.rel = 'noopener noreferrer';
    }

    if (tag === 'ol') {
      const type = node.getAttribute('type') || '';
      if (allowedListTypes.has(type)) {
        element.setAttribute('type', type);
      }
    }

    Array.from(node.childNodes).forEach((child) => {
      element.append(createSafeRichNode(child));
    });

    return element;
  };

  const sanitizeRichHtml = (html) => {
    const template = document.createElement('template');
    template.innerHTML = String(html || '');

    const output = document.createElement('div');
    Array.from(template.content.childNodes).forEach((node) => {
      output.append(createSafeRichNode(node));
    });

    return normalizeRichHtml(output.innerHTML);
  };

  const isRichHtml = (value) => richHtmlPattern.test(String(value || ''));

  const renderLegacyBody = (body) => {
    const blocks = String(body || '')
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean);

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

  const bodyToEditorHtml = (body) => {
    const value = String(body || '').trim();
    if (!value) return '';
    return isRichHtml(value) ? sanitizeRichHtml(value) : renderLegacyBody(value);
  };

  const getRichTextContent = (html) => {
    const element = document.createElement('div');
    element.innerHTML = sanitizeRichHtml(html);
    return element.textContent.trim();
  };

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

  const getPostDisplayDate = (post) => formatDate(post.published_at || post.updated_at || post.created_at);

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
    const imageUrl = post.image_url || defaultDraft.image_url;

    return `
      <a class="website-blog-card" href="${getPublicHref(`blog-post.html?slug=${encodeURIComponent(post.slug || '')}`)}" target="_blank" rel="noopener noreferrer">
        <article>
          <div class="article-visual">
            <div class="article-topline">
              <span class="article-pill ${getCategoryToneClass(category)}">${escapeHtml(category)}</span>
              <span class="article-date">${escapeHtml(date)}</span>
            </div>
            <img class="article-image" src="${escapeHtml(imageUrl)}" alt="" loading="lazy" />
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

  const getPublishedAt = (status, publishedDate) => {
    if (status === 'published') {
      const current = state.posts.find((post) => post.id === state.activeId);
      return current?.status === 'published' && current.published_at
        ? current.published_at
        : new Date().toISOString();
    }

    const selectedDate = String(publishedDate || '').trim();
    if (status !== 'draft' || !selectedDate) return null;

    const plannedDate = new Date(`${selectedDate}T12:00:00Z`);
    return Number.isNaN(plannedDate.getTime()) ? null : plannedDate.toISOString();
  };

  const syncPublishDateVisibility = () => {
    if (!publishDateField || !postForm?.elements.status) return;

    const isDraft = postForm.elements.status.value === 'draft';
    publishDateField.hidden = !isDraft;
    postForm.elements.published_at.disabled = !isDraft;

    if (!isDraft) {
      postForm.elements.published_at.value = '';
    }
  };

  const renderBody = (body) => {
    const value = String(body || '').trim();
    if (!value) return '<p>Start typing to preview the post.</p>';
    return isRichHtml(value) ? sanitizeRichHtml(value) : renderLegacyBody(value);
  };

  const friendlyError = (error) => {
    if (!error) return 'Something went wrong.';
    if (error.code === '23505') return 'That slug already exists. Change it and try again.';
    if (error.code === 'PGRST116') return 'No matching blog was found to save or delete. Refresh and try again.';
    if (String(error.message || '').toLowerCase().includes('image_url')) {
      return 'The blog image field is not available in Supabase yet. Run the updated public.blog_posts SQL so image_url exists, then refresh.';
    }
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

  const syncBodyInput = () => {
    if (!bodyInput || !bodyEditor) return '';

    const html = sanitizeRichHtml(bodyEditor.innerHTML);
    bodyInput.value = html;
    return html;
  };

  const setBodyEditorHtml = (body = '') => {
    if (!bodyInput || !bodyEditor) return;

    const html = bodyToEditorHtml(body);
    bodyEditor.innerHTML = html;
    bodyInput.value = html;
  };

  const getSelectionAnchorElement = () => {
    const selection = document.getSelection();
    const anchorNode = selection?.anchorNode;
    if (!anchorNode) return null;
    return anchorNode.nodeType === Node.ELEMENT_NODE ? anchorNode : anchorNode.parentElement;
  };

  const getActiveList = (tagName) => {
    if (!bodyEditor) return null;

    const anchorElement = getSelectionAnchorElement();
    const list = anchorElement?.closest(tagName);
    return list && bodyEditor.contains(list) ? list : null;
  };

  const setCurrentOrderedListType = (type = '1') => {
    const list = getActiveList('ol');
    if (!list) return;

    if (type === '1') {
      list.removeAttribute('type');
      return;
    }

    list.setAttribute('type', type);
  };

  const updateToolbarState = () => {
    if (!bodyEditor) return;

    const anchorElement = getSelectionAnchorElement();
    const selectionIsInEditor = Boolean(anchorElement && bodyEditor.contains(anchorElement));
    const activeOrderedList = selectionIsInEditor ? getActiveList('ol') : null;
    const activeUnorderedList = selectionIsInEditor ? getActiveList('ul') : null;

    toolbarButtons.forEach((button) => {
      const command = button.dataset.formatCommand;
      const value = button.dataset.formatValue;
      let isActive = false;

      if (selectionIsInEditor && command === 'formatBlock') {
        isActive = document.queryCommandValue('formatBlock').toLowerCase() === String(value || '').toLowerCase();
      } else if (selectionIsInEditor && command === 'insertOrderedList') {
        const listStyle = button.dataset.listStyle || '1';
        isActive = Boolean(activeOrderedList) && (activeOrderedList.getAttribute('type') || '1') === listStyle;
      } else if (selectionIsInEditor && command === 'insertUnorderedList') {
        isActive = Boolean(activeUnorderedList);
      } else if (selectionIsInEditor && ['bold', 'italic', 'underline', 'strikeThrough'].includes(command)) {
        isActive = document.queryCommandState(command);
      }

      button.dataset.active = isActive ? 'true' : 'false';
    });
  };

  const applyToolbarCommand = (button) => {
    if (!bodyEditor || !button) return;

    const command = button.dataset.formatCommand;
    const value = button.dataset.formatValue || null;

    bodyEditor.focus();
    document.execCommand(command, false, value);
    if (command === 'insertOrderedList') {
      setCurrentOrderedListType(button.dataset.listStyle || '1');
    }
    syncBodyInput();
    renderPreview();
    updateToolbarState();
  };

  const setPreviewMode = (enabled) => {
    state.previewMode = Boolean(enabled);

    if (postForm) postForm.hidden = state.previewMode;
    if (editorPreview) editorPreview.hidden = !state.previewMode;

    if (previewToggle) {
      previewToggle.textContent = state.previewMode ? 'Edit' : 'Preview';
      previewToggle.setAttribute('aria-pressed', String(state.previewMode));
      previewToggle.setAttribute('aria-label', state.previewMode ? 'Return to edit mode' : 'Preview post');
    }

    if (state.previewMode) renderPreview();
  };

  const uploadPendingImage = async () => {
    if (!state.pendingImageFile) return imageInput?.value || '';

    const file = state.pendingImageFile;
    const filePath = getUploadPath(file);

    setStatus('Uploading image...', 'pending');
    if (saveButton) saveButton.disabled = true;

    const { data, error } = await state.client.storage
      .from(blogImageBucket)
      .upload(filePath, file, {
        cacheControl: '31536000',
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      throw error;
    }

    const { data: publicData } = state.client.storage
      .from(blogImageBucket)
      .getPublicUrl(data.path);

    const publicUrl = publicData?.publicUrl || '';
    if (imageInput) imageInput.value = publicUrl;
    clearPendingImageFile();
    return publicUrl;
  };

  const getFormPayload = () => {
    syncBodyInput();

    const formData = new FormData(postForm);
    const status = String(formData.get('status') || 'draft');
    const publishedDate = String(formData.get('published_at') || '').trim();
    const publishedAt = getPublishedAt(status, publishedDate);

    return {
      title: String(formData.get('title') || '').trim(),
      slug: slugify(formData.get('slug')),
      image_url: String(formData.get('image_url') || '').trim(),
      excerpt: String(formData.get('excerpt') || '').trim(),
      body: String(formData.get('body') || '').trim(),
      category: String(formData.get('category') || 'Article').trim(),
      author_name: String(formData.get('author_name') || 'Tracks').trim(),
      read_minutes: Number(formData.get('read_minutes')) || 4,
      status,
      published_at: publishedAt,
    };
  };

  const getDraftPost = (prefill = true) => ({ ...(prefill ? defaultDraft : emptyDraft) });

  const fillForm = (post = null, options = {}) => {
    const draft = post || getDraftPost(options.prefill !== false);

    postForm.reset();
    state.activeId = post?.id || null;
    state.slugEdited = Boolean(post);
    idInput.value = post?.id || '';
    editorTitle.textContent = post ? 'Edit post' : 'New post';
    deleteButton.hidden = !post;
    if (saveButton) {
      saveButton.textContent = post ? 'Save changes' : 'Create blog';
    }

    postForm.elements.title.value = draft.title || '';
    postForm.elements.slug.value = draft.slug || '';
    postForm.elements.image_url.value = draft.image_url || '';
    postForm.elements.category.value = draft.category || 'Article';
    postForm.elements.author_name.value = draft.author_name || 'Tracks';
    postForm.elements.status.value = draft.status || 'draft';
    postForm.elements.published_at.value = toDateInput(draft.published_at);
    postForm.elements.read_minutes.value = draft.read_minutes || 4;
    postForm.elements.excerpt.value = draft.excerpt || '';
    setBodyEditorHtml(draft.body || '');
    clearPendingImageFile();
    syncPublishDateVisibility();

    renderPreview();
    renderPostList();
    setPreviewMode(false);
  };

  const clearEditorFields = () => {
    fillForm(null, { prefill: false });
    setStatus('Fields cleared. Start a new post when ready.', 'success');
  };

  const openClearConfirmation = () => {
    if (clearDialog?.showModal) {
      clearDialog.showModal();
      return;
    }

    if (window.confirm('Are you sure you want to clear the fields?')) {
      clearEditorFields();
    }
  };

  const renderPreview = () => {
    const payload = getFormPayload();
    const previewImageSrc = getPreviewImageSrc();
    const imageMarkup = previewImageSrc
      ? `<figure class="editor-preview-hero"><img src="${escapeHtml(previewImageSrc)}" alt="${escapeHtml(payload.title || 'Blog image')}" /></figure>`
      : '<div class="editor-preview-hero is-empty">Add a required blog image to preview the full post layout.</div>';

    preview.innerHTML = `
      ${imageMarkup}
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
          <strong>${escapeHtml(post.title || 'Untitled post')}</strong>
          <span class="post-date">${escapeHtml(getPostDisplayDate(post))}</span>
          <span class="post-author">${escapeHtml(post.author_name || 'Tracks')}</span>
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
      .select('id, title, slug, image_url, excerpt, body, category, author_name, read_minutes, status, published_at, updated_at, created_at')
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

    saveButton.disabled = true;
    deleteButton.disabled = true;

    try {
      await uploadPendingImage();
    } catch (error) {
      saveButton.disabled = false;
      deleteButton.disabled = false;
      setStatus(`Could not upload image: ${friendlyError(error)}`, 'error');
      return;
    }

    const payload = getFormPayload();
    if (!payload.title || !payload.slug || !payload.image_url || !payload.excerpt || !getRichTextContent(payload.body)) {
      saveButton.disabled = false;
      deleteButton.disabled = false;
      setStatus('Title, slug, image, excerpt, and body are required.', 'error');
      return;
    }

    setStatus('Saving post...', 'pending');

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

    if (previewToggle) {
      previewToggle.addEventListener('click', () => {
        setPreviewMode(!state.previewMode);
      });
    }

    if (resetButton) {
      resetButton.addEventListener('click', openClearConfirmation);
    }

    if (confirmClearButton) {
      confirmClearButton.addEventListener('click', () => {
        clearDialog?.close();
        clearEditorFields();
      });
    }

    if (cancelClearButton) {
      cancelClearButton.addEventListener('click', () => {
        clearDialog?.close();
      });
    }

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

    if (imageFileInput) {
      imageFileInput.addEventListener('change', () => {
        const file = imageFileInput.files?.[0];
        if (!file) {
          clearPendingImageFile();
          renderPreview();
          return;
        }

        if (!allowedBlogImageTypes.has(file.type)) {
          clearPendingImageFile();
          setStatus('Upload a JPG, PNG, WebP, or GIF image.', 'error');
          renderPreview();
          return;
        }

        if (file.size > maxBlogImageBytes) {
          clearPendingImageFile();
          setStatus('Blog images must be 5 MB or smaller.', 'error');
          renderPreview();
          return;
        }

        setPendingImageFile(file);
        setStatus('Photo selected. It will upload when you save.', 'success');
      });
    }

    if (postForm.elements.status) {
      postForm.elements.status.addEventListener('change', () => {
        syncPublishDateVisibility();
        renderPreview();
      });
    }

    toolbarButtons.forEach((button) => {
      button.addEventListener('mousedown', (event) => {
        event.preventDefault();
      });

      button.addEventListener('click', () => {
        applyToolbarCommand(button);
      });
    });

    if (bodyEditor) {
      bodyEditor.addEventListener('input', () => {
        syncBodyInput();
        updateToolbarState();
      });

      bodyEditor.addEventListener('keyup', updateToolbarState);
      bodyEditor.addEventListener('mouseup', updateToolbarState);

      bodyEditor.addEventListener('paste', (event) => {
        event.preventDefault();

        const html = event.clipboardData?.getData('text/html') || '';
        const text = event.clipboardData?.getData('text/plain') || '';
        const safeHtml = html ? sanitizeRichHtml(html) : bodyToEditorHtml(text);

        document.execCommand('insertHTML', false, safeHtml || escapeHtml(text));
        syncBodyInput();
        renderPreview();
        updateToolbarState();
      });

      document.addEventListener('selectionchange', updateToolbarState);
    }

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
