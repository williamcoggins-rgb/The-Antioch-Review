/* ============================================
   THE ANTIOCH REVIEW — Admin Panel JavaScript
   Professional CMS Experience
   ============================================ */
(function () {
  'use strict';

  // --- State ---
  var currentPage = 'dashboard';
  var currentUser = null;
  var subscribersPage = 1;
  var articlesPage = 1;
  var articlesSection = '';
  var imagesPage = 1;
  var paymentsPage = 1;
  var imagePickerTarget = null;
  var isSourceMode = false;

  // --- API helpers ---
  function api(method, path, data) {
    var opts = {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin'
    };
    if (data && method !== 'GET') {
      opts.body = JSON.stringify(data);
    }
    return fetch('/api/' + path, opts).then(function (res) {
      return res.json().then(function (json) {
        if (!res.ok) throw new Error(json.error || 'Request failed');
        return json;
      });
    });
  }

  function toast(message, type) {
    var el = document.getElementById('toast');
    el.textContent = message;
    el.className = 'toast toast-' + (type || 'success');
    el.classList.add('visible');
    setTimeout(function () { el.classList.remove('visible'); }, 3000);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    var d = new Date(dateStr + 'Z');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // --- Auth ---
  function checkAuth() {
    api('GET', 'auth/check').then(function (data) {
      currentUser = data.user;
      showAdmin();
    }).catch(function () {
      showLogin();
    });
  }

  function showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('adminLayout').style.display = 'none';
  }

  function showAdmin() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminLayout').style.display = 'grid';
    document.getElementById('adminUser').textContent = 'Welcome, ' + currentUser.username;
    loadDashboard();
  }

  function login(username, password) {
    api('POST', 'auth/login', { username: username, password: password }).then(function (data) {
      currentUser = data.user;
      showAdmin();
      toast('Signed in successfully');
    }).catch(function (err) {
      var errorEl = document.getElementById('loginError');
      errorEl.textContent = err.message;
      errorEl.classList.add('visible');
    });
  }

  function logout() {
    api('POST', 'auth/logout').then(function () {
      currentUser = null;
      showLogin();
    });
  }

  // --- Navigation ---
  function navigateTo(page) {
    currentPage = page;
    document.querySelectorAll('.sidebar-nav a').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-page') === page);
    });
    document.querySelectorAll('.admin-page').forEach(function (p) {
      p.style.display = p.id === 'page-' + page ? 'block' : 'none';
    });
    switch (page) {
      case 'dashboard': loadDashboard(); break;
      case 'subscribers': loadSubscribers(); break;
      case 'articles': loadArticles(); break;
      case 'images': loadImages(); break;
      case 'payments': loadPayments(); break;
    }
  }

  // --- Dashboard ---
  function loadDashboard() {
    api('GET', 'dashboard').then(function (data) {
      document.getElementById('statSubscribers').textContent = data.totalSubscribers;
      document.getElementById('statArticles').textContent = data.totalArticles;
      document.getElementById('statPublished').textContent = data.publishedArticles;
      document.getElementById('statImages').textContent = data.totalImages;
      document.getElementById('statPayments').textContent = data.totalPayments;

      var subBody = document.querySelector('#recentSubscribers tbody');
      subBody.innerHTML = data.recentSubscribers.map(function (s) {
        return '<tr><td>' + escapeHtml(s.email) + '</td><td>' + formatDate(s.subscribed_at) + '</td></tr>';
      }).join('') || '<tr><td colspan="2" style="color:var(--admin-text-light)">No subscribers yet</td></tr>';

      var artBody = document.querySelector('#recentArticles tbody');
      artBody.innerHTML = data.recentArticles.map(function (a) {
        var badge = a.published ? '<span class="badge badge-success">Published</span>' : '<span class="badge badge-warning">Draft</span>';
        return '<tr><td>' + escapeHtml(a.title).substring(0, 40) + '</td><td style="text-transform:capitalize">' + escapeHtml(a.section) + '</td><td>' + badge + '</td></tr>';
      }).join('') || '<tr><td colspan="3" style="color:var(--admin-text-light)">No articles yet</td></tr>';
    });
  }

  // --- Subscribers ---
  window.loadSubscribers = function () {
    var search = document.getElementById('subscriberSearch').value;
    api('GET', 'subscribers?page=' + subscribersPage + '&limit=50&search=' + encodeURIComponent(search)).then(function (data) {
      var tbody = document.querySelector('#subscribersTable tbody');
      tbody.innerHTML = data.subscribers.map(function (s) {
        var statusBadge = s.active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-danger">Inactive</span>';
        return '<tr>' +
          '<td>' + escapeHtml(s.email) + '</td>' +
          '<td>' + escapeHtml(s.name) + '</td>' +
          '<td>' + escapeHtml(s.source) + '</td>' +
          '<td>' + formatDate(s.subscribed_at) + '</td>' +
          '<td>' + statusBadge + '</td>' +
          '<td><button class="btn btn-danger btn-sm" onclick="deleteSubscriber(' + s.id + ')">Delete</button></td>' +
          '</tr>';
      }).join('') || '<tr><td colspan="6" style="color:var(--admin-text-light)">No subscribers found</td></tr>';

      renderPagination('subscribersPagination', data.total, data.page, data.limit, function (p) {
        subscribersPage = p;
        window.loadSubscribers();
      });
    });
  };

  window.deleteSubscriber = function (id) {
    if (!confirm('Are you sure you want to delete this subscriber?')) return;
    api('DELETE', 'subscribers/' + id).then(function () {
      toast('Subscriber deleted');
      window.loadSubscribers();
    }).catch(function (err) { toast(err.message, 'error'); });
  };

  // --- Articles ---
  function loadArticles() {
    var params = 'page=' + articlesPage + '&limit=20';
    if (articlesSection) params += '&section=' + articlesSection;
    api('GET', 'articles?' + params).then(function (data) {
      var tbody = document.querySelector('#articlesTable tbody');
      tbody.innerHTML = data.articles.map(function (a) {
        var badge = a.published ? '<span class="badge badge-success">Published</span>' : '<span class="badge badge-warning">Draft</span>';
        var featBadge = a.featured ? ' <span class="badge badge-info">Featured</span>' : '';
        return '<tr>' +
          '<td><strong>' + escapeHtml(a.title).substring(0, 50) + '</strong></td>' +
          '<td>' + escapeHtml(a.author) + '</td>' +
          '<td style="text-transform:capitalize">' + escapeHtml(a.section) + '</td>' +
          '<td>' + badge + featBadge + '</td>' +
          '<td>' + formatDate(a.created_at) + '</td>' +
          '<td style="white-space:nowrap">' +
          '<button class="btn btn-outline btn-sm" onclick="editArticle(' + a.id + ')" style="margin-right:4px">Edit</button>' +
          '<button class="btn btn-success btn-sm" onclick="viewArticle(\'' + escapeHtml(a.slug) + '\')" style="margin-right:4px">View</button>' +
          '<button class="btn btn-danger btn-sm" onclick="deleteArticle(' + a.id + ')">Delete</button>' +
          '</td></tr>';
      }).join('') || '<tr><td colspan="6" style="color:var(--admin-text-light)">No articles found. Click "+ New Article" to create one.</td></tr>';

      renderPagination('articlesPagination', data.total, data.page, data.limit, function (p) {
        articlesPage = p;
        loadArticles();
      });
    });
  }

  window.viewArticle = function (slug) {
    window.open('/article/' + slug, '_blank');
  };

  window.showArticleForm = function (article) {
    document.getElementById('articleFormPanel').style.display = 'block';
    document.getElementById('articlesListPanel').style.display = 'none';

    // Scroll to top
    document.querySelector('.admin-main').scrollTop = 0;

    var editor = document.getElementById('rteEditor');
    isSourceMode = false;
    document.getElementById('rteSource').style.display = 'none';
    editor.style.display = 'block';

    if (article) {
      document.getElementById('articleId').value = article.id;
      document.getElementById('articleTitleInput').value = article.title;
      document.getElementById('articleSubtitle').value = article.subtitle || '';
      document.getElementById('articleAuthor').value = article.author;
      document.getElementById('articleSection').value = article.section;
      document.getElementById('articleLabel').value = article.label || '';
      document.getElementById('articleImage').value = article.image_url || '';
      document.getElementById('articleExcerpt').value = article.excerpt || '';
      editor.innerHTML = article.body || '';
      document.getElementById('articleFeatured').checked = !!article.featured;
      document.getElementById('articlePublished').checked = !!article.published;
    } else {
      document.getElementById('articleId').value = '';
      document.getElementById('articleForm').reset();
      editor.innerHTML = '';
      document.getElementById('articleFeatured').checked = false;
      document.getElementById('articlePublished').checked = false;
    }

    // Update live counters
    updateTitleCounter();
    updateExcerptCounter();
    updateImagePreview();
    updateEditorStats();
  };

  window.hideArticleForm = function () {
    document.getElementById('articleFormPanel').style.display = 'none';
    document.getElementById('articlesListPanel').style.display = 'block';
  };

  window.editArticle = function (id) {
    api('GET', 'articles/' + id).then(function (article) {
      window.showArticleForm(article);
    }).catch(function (err) { toast(err.message, 'error'); });
  };

  window.deleteArticle = function (id) {
    if (!confirm('Are you sure you want to delete this article? This cannot be undone.')) return;
    api('DELETE', 'articles/' + id).then(function () {
      toast('Article deleted');
      loadArticles();
    }).catch(function (err) { toast(err.message, 'error'); });
  };

  window.saveAsDraft = function () {
    document.getElementById('articlePublished').checked = false;
    document.getElementById('articleForm').dispatchEvent(new Event('submit', { cancelable: true }));
  };

  function gatherArticleData() {
    // Sync editor content to hidden field
    var editor = document.getElementById('rteEditor');
    var source = document.getElementById('rteSource');
    var body = isSourceMode ? source.value : editor.innerHTML;

    return {
      title: document.getElementById('articleTitleInput').value.trim(),
      subtitle: document.getElementById('articleSubtitle').value.trim(),
      author: document.getElementById('articleAuthor').value.trim(),
      section: document.getElementById('articleSection').value,
      label: document.getElementById('articleLabel').value.trim(),
      image_url: document.getElementById('articleImage').value.trim(),
      excerpt: document.getElementById('articleExcerpt').value.trim(),
      body: body,
      featured: document.getElementById('articleFeatured').checked,
      published: document.getElementById('articlePublished').checked
    };
  }

  function saveArticle(data) {
    var id = document.getElementById('articleId').value;
    if (id) {
      return api('PUT', 'articles/' + id, data).then(function () {
        toast('Article updated');
        window.hideArticleForm();
        loadArticles();
      });
    } else {
      return api('POST', 'articles', data).then(function () {
        toast('Article created');
        window.hideArticleForm();
        loadArticles();
      });
    }
  }

  // --- Rich Text Editor ---
  function initRichTextEditor() {
    var toolbar = document.getElementById('rteToolbar');
    var editor = document.getElementById('rteEditor');
    var source = document.getElementById('rteSource');

    // Toolbar button clicks
    toolbar.addEventListener('click', function (e) {
      var btn = e.target.closest('.rte-btn');
      if (!btn) return;
      e.preventDefault();

      var cmd = btn.getAttribute('data-cmd');
      var val = btn.getAttribute('data-val');
      var action = btn.getAttribute('data-action');

      if (action === 'source') {
        toggleSourceMode();
        return;
      }

      // Make sure we're in visual mode
      if (isSourceMode) return;

      editor.focus();

      if (action === 'link') {
        var url = prompt('Enter URL:');
        if (url) document.execCommand('createLink', false, url);
        return;
      }

      if (action === 'image') {
        var imgUrl = prompt('Enter image URL:');
        if (imgUrl) document.execCommand('insertHTML', false, '<img src="' + imgUrl + '" alt="" style="max-width:100%;height:auto;margin:16px 0;border-radius:8px;">');
        return;
      }

      if (action === 'pullquote') {
        var sel = window.getSelection();
        var text = sel.toString() || 'Your pull quote here';
        document.execCommand('insertHTML', false, '<div class="pullquote">' + escapeHtml(text) + '</div><p></p>');
        return;
      }

      if (cmd === 'formatBlock' && val) {
        document.execCommand(cmd, false, '<' + val + '>');
      } else if (cmd) {
        document.execCommand(cmd, false, val || null);
      }

      updateEditorStats();
    });

    // Keyboard shortcuts in editor
    editor.addEventListener('keydown', function (e) {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'b': e.preventDefault(); document.execCommand('bold'); break;
          case 'i': e.preventDefault(); document.execCommand('italic'); break;
          case 'u': e.preventDefault(); document.execCommand('underline'); break;
        }
      }
    });

    // Update stats on input
    editor.addEventListener('input', function () {
      updateEditorStats();
    });

    // Paste as clean HTML
    editor.addEventListener('paste', function (e) {
      e.preventDefault();
      var text = (e.clipboardData || window.clipboardData).getData('text/html');
      if (!text) text = (e.clipboardData || window.clipboardData).getData('text/plain');
      // Clean up pasted HTML - strip dangerous stuff but keep basic formatting
      var temp = document.createElement('div');
      temp.innerHTML = text;
      // Remove scripts and styles
      temp.querySelectorAll('script, style, link, meta').forEach(function (el) { el.remove(); });
      document.execCommand('insertHTML', false, temp.innerHTML);
      updateEditorStats();
    });
  }

  function toggleSourceMode() {
    var editor = document.getElementById('rteEditor');
    var source = document.getElementById('rteSource');
    var sourceBtn = document.querySelector('.rte-btn[data-action="source"]');

    if (isSourceMode) {
      // Switch to visual mode
      editor.innerHTML = source.value;
      source.style.display = 'none';
      editor.style.display = 'block';
      sourceBtn.classList.remove('active');
      isSourceMode = false;
    } else {
      // Switch to source mode
      source.value = editor.innerHTML;
      editor.style.display = 'none';
      source.style.display = 'block';
      sourceBtn.classList.add('active');
      isSourceMode = true;
    }
  }

  function updateEditorStats() {
    var editor = document.getElementById('rteEditor');
    var text = editor.innerText || editor.textContent || '';
    var words = text.trim().split(/\s+/).filter(function (w) { return w.length > 0; }).length;
    var minutes = Math.max(1, Math.ceil(words / 250));
    document.getElementById('wordCount').textContent = words + ' word' + (words !== 1 ? 's' : '');
    document.getElementById('readTime').textContent = minutes + ' min read';
  }

  // --- Title / Excerpt / Image live counters ---
  function updateTitleCounter() {
    var title = document.getElementById('articleTitleInput').value;
    document.getElementById('titleCharCount').textContent = title.length;

    // Generate slug preview
    var slug = title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 80);
    document.getElementById('slugPreview').textContent = slug || '\u2014';
  }

  function updateExcerptCounter() {
    var excerpt = document.getElementById('articleExcerpt').value;
    document.getElementById('excerptCharCount').textContent = excerpt.length;
  }

  function updateImagePreview() {
    var url = document.getElementById('articleImage').value.trim();
    var img = document.getElementById('imagePreviewImg');
    var empty = document.getElementById('imagePreviewEmpty');
    if (url) {
      img.src = url;
      img.style.display = 'block';
      empty.style.display = 'none';
      img.onerror = function () {
        img.style.display = 'none';
        empty.style.display = 'flex';
      };
    } else {
      img.style.display = 'none';
      empty.style.display = 'flex';
    }
  }

  // --- Images ---
  function loadImages() {
    api('GET', 'upload?page=' + imagesPage + '&limit=30').then(function (data) {
      var grid = document.getElementById('imageGrid');
      grid.innerHTML = data.images.map(function (img) {
        return '<div class="image-item">' +
          '<img src="' + escapeHtml(img.url) + '" alt="' + escapeHtml(img.original_name) + '" loading="lazy">' +
          '<div class="image-overlay">' +
          '<button onclick="copyImageUrl(\'' + escapeHtml(img.url) + '\')">Copy URL</button>' +
          '<button onclick="deleteImage(' + img.id + ')" style="color:var(--admin-danger)">Delete</button>' +
          '</div></div>';
      }).join('') || '<p style="color:var(--admin-text-light);text-align:center;padding:40px;">No images uploaded yet. Drag and drop or click to upload.</p>';

      renderPagination('imagesPagination', data.total, data.page, data.limit, function (p) {
        imagesPage = p;
        loadImages();
      });
    });
  }

  window.copyImageUrl = function (url) {
    navigator.clipboard.writeText(url).then(function () {
      toast('Image URL copied');
    });
  };

  window.deleteImage = function (id) {
    if (!confirm('Delete this image?')) return;
    api('DELETE', 'upload/' + id).then(function () {
      toast('Image deleted');
      loadImages();
    }).catch(function (err) { toast(err.message, 'error'); });
  };

  function uploadFiles(files, callback) {
    Array.from(files).forEach(function (file) {
      var formData = new FormData();
      formData.append('image', file);
      fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin'
      }).then(function (res) { return res.json(); })
        .then(function (data) {
          if (data.error) throw new Error(data.error);
          toast('Image uploaded: ' + file.name);
          if (callback) callback(data);
          loadImages();
        })
        .catch(function (err) { toast(err.message, 'error'); });
    });
  }

  // --- Image Picker (for article form) ---
  window.openImagePicker = function (targetInputId) {
    imagePickerTarget = targetInputId;
    document.getElementById('imagePickerModal').classList.add('visible');
    api('GET', 'upload?limit=50').then(function (data) {
      var grid = document.getElementById('modalImageGrid');
      grid.innerHTML = data.images.map(function (img) {
        return '<div class="image-item" onclick="selectImage(\'' + escapeHtml(img.url) + '\')">' +
          '<img src="' + escapeHtml(img.url) + '" alt="' + escapeHtml(img.original_name) + '" loading="lazy">' +
          '</div>';
      }).join('') || '<p style="color:var(--admin-text-light);text-align:center">No images. Upload one above.</p>';
    });
  };

  window.closeImagePicker = function () {
    document.getElementById('imagePickerModal').classList.remove('visible');
    imagePickerTarget = null;
  };

  window.selectImage = function (url) {
    if (imagePickerTarget) {
      document.getElementById(imagePickerTarget).value = url;
      updateImagePreview();
    }
    window.closeImagePicker();
  };

  // --- Payments ---
  function loadPayments() {
    api('GET', 'payments?page=' + paymentsPage + '&limit=50').then(function (data) {
      var tbody = document.querySelector('#paymentsTable tbody');
      tbody.innerHTML = data.payments.map(function (p) {
        return '<tr>' +
          '<td>' + escapeHtml(p.email) + '</td>' +
          '<td style="text-transform:capitalize">' + escapeHtml(p.plan) + '</td>' +
          '<td>$' + (p.amount / 100).toFixed(2) + '</td>' +
          '<td><span class="badge badge-success">' + escapeHtml(p.status) + '</span></td>' +
          '<td>' + formatDate(p.created_at) + '</td>' +
          '</tr>';
      }).join('') || '<tr><td colspan="5" style="color:var(--admin-text-light)">No payments yet</td></tr>';

      renderPagination('paymentsPagination', data.total, data.page, data.limit, function (p) {
        paymentsPage = p;
        loadPayments();
      });
    });
  }

  // --- Pagination helper ---
  function renderPagination(containerId, total, page, limit, onNavigate) {
    var container = document.getElementById(containerId);
    var totalPages = Math.ceil(total / limit);
    if (totalPages <= 1) { container.innerHTML = ''; return; }

    var html = '<button ' + (page <= 1 ? 'disabled' : '') + ' data-page="' + (page - 1) + '">&laquo; Prev</button>';
    for (var i = 1; i <= totalPages && i <= 10; i++) {
      html += '<button class="' + (i === page ? 'active' : '') + '" data-page="' + i + '">' + i + '</button>';
    }
    html += '<button ' + (page >= totalPages ? 'disabled' : '') + ' data-page="' + (page + 1) + '">Next &raquo;</button>';
    container.innerHTML = html;
    container.querySelectorAll('button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var p = parseInt(btn.getAttribute('data-page'));
        if (p >= 1 && p <= totalPages) onNavigate(p);
      });
    });
  }

  // --- Event listeners ---
  document.addEventListener('DOMContentLoaded', function () {
    checkAuth();
    initRichTextEditor();

    // Login form
    document.getElementById('loginForm').addEventListener('submit', function (e) {
      e.preventDefault();
      login(
        document.getElementById('loginUsername').value,
        document.getElementById('loginPassword').value
      );
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', function (e) {
      e.preventDefault();
      logout();
    });

    // Navigation
    document.querySelectorAll('.sidebar-nav a').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        navigateTo(a.getAttribute('data-page'));
      });
    });

    // Article form submit
    document.getElementById('articleForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var data = gatherArticleData();
      if (!data.title || !data.author || !data.section || !data.body || data.body === '<br>' || data.body.trim() === '') {
        toast('Please fill in Title, Author, Section, and Body', 'error');
        return;
      }
      saveArticle(data).catch(function (err) { toast(err.message, 'error'); });
    });

    // Section filter tabs
    document.querySelectorAll('#sectionFilter button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('#sectionFilter button').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        articlesSection = btn.getAttribute('data-section');
        articlesPage = 1;
        loadArticles();
      });
    });

    // Live title counter
    document.getElementById('articleTitleInput').addEventListener('input', updateTitleCounter);

    // Live excerpt counter
    document.getElementById('articleExcerpt').addEventListener('input', updateExcerptCounter);

    // Live image preview
    document.getElementById('articleImage').addEventListener('input', updateImagePreview);
    document.getElementById('articleImage').addEventListener('change', updateImagePreview);

    // Direct image upload button
    var directUploadBtn = document.getElementById('directUploadBtn');
    var directInput = document.getElementById('directImageUpload');
    if (directUploadBtn && directInput) {
      directUploadBtn.addEventListener('click', function () { directInput.click(); });
      directInput.addEventListener('change', function () {
        if (directInput.files.length) {
          uploadFiles(directInput.files, function (data) {
            if (data.url) {
              document.getElementById('articleImage').value = data.url;
              updateImagePreview();
            }
          });
          directInput.value = '';
        }
      });
    }

    // Image upload — drag & drop zone
    var uploadZone = document.getElementById('uploadZone');
    var fileInput = document.getElementById('imageFileInput');
    if (uploadZone) {
      uploadZone.addEventListener('click', function () { fileInput.click(); });
      uploadZone.addEventListener('dragover', function (e) { e.preventDefault(); uploadZone.classList.add('dragover'); });
      uploadZone.addEventListener('dragleave', function () { uploadZone.classList.remove('dragover'); });
      uploadZone.addEventListener('drop', function (e) {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        uploadFiles(e.dataTransfer.files);
      });
      fileInput.addEventListener('change', function () { uploadFiles(fileInput.files); fileInput.value = ''; });
    }

    // Modal upload zone
    var modalUploadZone = document.getElementById('modalUploadZone');
    var modalFileInput = document.getElementById('modalFileInput');
    if (modalUploadZone) {
      modalUploadZone.addEventListener('click', function () { modalFileInput.click(); });
      modalFileInput.addEventListener('change', function () {
        uploadFiles(modalFileInput.files);
        modalFileInput.value = '';
        setTimeout(function () { window.openImagePicker(imagePickerTarget); }, 1000);
      });
    }

    // Close modal on overlay click
    document.getElementById('imagePickerModal').addEventListener('click', function (e) {
      if (e.target === this) window.closeImagePicker();
    });

    // Password change
    document.getElementById('passwordForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var newPw = document.getElementById('newPassword').value;
      var confirmPw = document.getElementById('confirmPassword').value;
      if (newPw !== confirmPw) { toast('Passwords do not match', 'error'); return; }
      api('POST', 'auth/change-password', { newPassword: newPw }).then(function () {
        toast('Password changed successfully');
        document.getElementById('passwordForm').reset();
      }).catch(function (err) { toast(err.message, 'error'); });
    });

    // Subscriber search on Enter
    document.getElementById('subscriberSearch').addEventListener('keypress', function (e) {
      if (e.key === 'Enter') { subscribersPage = 1; window.loadSubscribers(); }
    });
  });

})();
