const messageKey = 'taskflow.message';
const requestError = document.querySelector('#request-error');
const taskPage = document.querySelector('#task-page');
const taskForm = document.querySelector('#task-form');
const guestForm = document.querySelector('form[data-auth]:not([data-auth="logout"])');
const logoutForm = document.querySelector('[data-auth="logout"]');
const hongKongDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Hong_Kong' });

function showMessage(element, message) {
  element.textContent = message;
  element.hidden = !message;
}

function consumeMessage() {
  const message = sessionStorage.getItem(messageKey) || '';
  sessionStorage.removeItem(messageKey);
  return message;
}

function signOut() {
  sessionStorage.removeItem(messageKey);
  window.location.replace('/login');
}

async function request(url, { method = 'GET', body, authenticated = true } = {}) {
  const headers = body === undefined ? {} : { 'Content-Type': 'application/json' };

  const response = await fetch(url, {
    method, headers, credentials: 'same-origin', body: JSON.stringify(body)
  });
  if (authenticated && response.status === 401) {
    signOut();
    return;
  }
  if (response.status === 204) return true;

  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || 'Something went wrong. Please try again.');
    error.fields = data.fields;
    throw error;
  }
  return data;
}

function handleForm(form, onSubmit, onError) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (form.dataset.submitting) return;
    form.dataset.submitting = 'true';
    if (event.submitter) event.submitter.disabled = true;
    try {
      await onSubmit();
    } catch (error) {
      onError(error);
    } finally {
      delete form.dataset.submitting;
      if (event.submitter) event.submitter.disabled = false;
    }
  });
}

function initializeGuestForm(form) {
  const status = document.querySelector('.narrow [role="status"]');
  const errorNotice = document.querySelector('.narrow [role="alert"]');
  if (status) showMessage(status, consumeMessage());

  handleForm(form, async () => {
    showMessage(errorNotice, '');
    const body = Object.fromEntries(new FormData(form));
    const result = await request(form.action, { method: 'POST', body, authenticated: false });
    if (form.dataset.auth === 'login') {
      window.location.replace('/tasks');
      return;
    }
    sessionStorage.setItem(messageKey, result.message);
    window.location.assign('/login');
  }, (error) => showMessage(errorNotice, error.message));
}

function taskPageUrl(path, view, searchTitle = '') {
  const query = new URLSearchParams();
  if (view === 'completed') query.set('view', 'completed');
  if (searchTitle) query.set('title', searchTitle);
  return path + (query.size ? '?' + query.toString() : '');
}

function taskApi(id) {
  return '/api/tasks' + (id ? '/' + encodeURIComponent(id) : '');
}

function buildTaskRow(task, view, today, searchTitle) {
  const row = document.querySelector('#task-row').content.firstElementChild.cloneNode(true);
  const completed = task.status === 'Completed';
  row.dataset.taskId = task._id;
  row.dataset.status = task.status;
  row.querySelector('h2').textContent = task.title;
  showMessage(row.querySelector('.description'), task.description || '');

  const toggle = row.querySelector('[data-task-action="toggle"]');
  const action = completed ? 'Reopen task' : 'Complete task';
  toggle.title = action;
  toggle.setAttribute('aria-label', action + ': ' + task.title);
  const check = toggle.querySelector('.task-check');
  check.classList.toggle('is-checked', completed);
  check.textContent = completed ? '✓' : '';

  if (task.dueDate) {
    const date = task.dueDate.slice(0, 10);
    const time = row.querySelector('time');
    time.dateTime = date;
    time.textContent = date;
    row.querySelector('.task-date').hidden = false;
    row.querySelector('.overdue').hidden = completed || date >= today;
  }

  row.querySelector('summary').setAttribute('aria-label', 'Actions for ' + task.title);
  row.querySelector('.task-options-panel a').href = taskPageUrl(
    '/tasks/' + encodeURIComponent(task._id) + '/edit', view, searchTitle
  );
  return row;
}

async function loadTaskList(page, searchState) {
  const version = ++searchState.version;
  const searchTitle = page.dataset.searchTitle;
  const query = new URLSearchParams();
  if (searchTitle) query.set('title', searchTitle);
  let tasks;
  try {
    tasks = await request('/api/tasks' + (query.size ? '?' + query.toString() : ''));
  } catch (error) {
    if (version !== searchState.version) return;
    throw error;
  }
  // Ignore an older response, including while a newer query is waiting for its debounce.
  if (!tasks || version !== searchState.version) return;
  const completed = tasks.filter((task) => task.status === 'Completed');
  const unfinished = tasks.filter((task) => task.status !== 'Completed');
  const visible = page.dataset.view === 'completed' ? completed : unfinished;
  const list = page.querySelector('.task-list');
  const today = hongKongDate.format(new Date());
  page.querySelector('#completed-count').textContent = completed.length;
  page.querySelector('#unfinished-count').textContent = unfinished.length;
  const rows = document.createDocumentFragment();
  for (const task of visible) rows.append(buildTaskRow(task, page.dataset.view, today, searchTitle));
  list.replaceChildren(rows);
  list.hidden = !visible.length;
  const empty = page.querySelector('.empty');
  empty.querySelector('h2').textContent = searchTitle ? 'No matching tasks'
    : page.dataset.view === 'completed' ? 'No completed tasks yet' : 'No unfinished tasks';
  empty.hidden = Boolean(visible.length);
  showMessage(requestError, '');
}

function initializeTaskList(page) {
  const notice = page.querySelector('[role="status"]');
  showMessage(notice, consumeMessage());
  const searchForm = page.querySelector('#task-search');
  const searchInput = searchForm.elements.title;
  const clearSearch = page.querySelector('#clear-task-search');
  const searchState = { version: 0 };
  let searchTimer;
  let composing = false;

  const syncSearch = () => {
    const title = searchInput.value.trim();
    page.dataset.searchTitle = title;
    clearSearch.hidden = !searchInput.value;
    for (const tab of page.querySelectorAll('.stat')) {
      tab.href = taskPageUrl('/tasks', tab.dataset.view, title);
    }
    page.querySelector('#add-task').href = taskPageUrl('/tasks/new', page.dataset.view, title);
    for (const row of page.querySelectorAll('.task-list [data-task-id]')) {
      row.querySelector('.task-options-panel a').href = taskPageUrl(
        '/tasks/' + encodeURIComponent(row.dataset.taskId) + '/edit', page.dataset.view, title
      );
    }
    window.history.replaceState(null, '', taskPageUrl('/tasks', page.dataset.view, title));
  };

  const reload = async () => {
    if (composing) return;
    try {
      await loadTaskList(page, searchState);
    } catch (error) {
      showMessage(requestError, error.message);
    }
  };

  const searchNow = () => {
    clearTimeout(searchTimer);
    syncSearch();
    return reload();
  };

  const scheduleSearch = () => {
    clearTimeout(searchTimer);
    searchState.version += 1;
    syncSearch();
    if (!composing) searchTimer = setTimeout(searchNow, 300);
  };

  searchInput.addEventListener('input', scheduleSearch);
  searchInput.addEventListener('compositionstart', () => {
    composing = true;
    clearTimeout(searchTimer);
    searchState.version += 1;
  });
  searchInput.addEventListener('compositionend', () => {
    composing = false;
    scheduleSearch();
  });
  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!composing) searchNow();
  });
  clearSearch.addEventListener('click', () => {
    searchInput.value = '';
    composing = false;
    searchNow();
    searchInput.focus();
  });

  let updating = false;
  page.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-task-action]');
    if (!button || updating) return;
    const row = button.closest('[data-task-id]');
    const deleting = button.dataset.taskAction === 'delete';
    if (deleting && !window.confirm('Delete this task?')) return;

    updating = true;
    button.disabled = true;
    showMessage(requestError, '');
    showMessage(notice, '');
    try {
      const status = row.dataset.status === 'Completed' ? 'In Progress' : 'Completed';
      const result = await request(taskApi(row.dataset.taskId), deleting
        ? { method: 'DELETE' }
        : { method: 'PUT', body: { status } });
      if (!result) return;
      showMessage(notice, deleting ? result.message
        : status === 'Completed' ? 'Task completed.' : 'Task reopened.');
      await reload();
    } catch (error) {
      showMessage(requestError, error.message);
    } finally {
      updating = false;
      button.disabled = false;
    }
  });
  return reload();
}

function showFieldErrors(form, errors = {}) {
  for (const input of form.querySelectorAll('[aria-describedby]')) {
    const message = errors[input.name] || '';
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
    showMessage(document.getElementById(input.getAttribute('aria-describedby')), message);
  }
}

async function initializeTaskForm(form) {
  const id = form.dataset.taskId;
  if (id) {
    const task = await request(taskApi(id));
    if (!task) return;
    form.elements.title.value = task.title;
    form.elements.description.value = task.description || '';
    form.elements.dueDate.value = task.dueDate?.slice(0, 10) || '';
  }
  form.querySelector('fieldset').disabled = false;
  handleForm(form, async () => {
    showMessage(requestError, '');
    showFieldErrors(form);
    const body = Object.fromEntries(new FormData(form));
    const result = await request(taskApi(id), { method: id ? 'PUT' : 'POST', body });
    if (!result) return;
    sessionStorage.setItem(messageKey, id ? 'Task updated.' : 'Task added.');
    window.location.assign(taskPageUrl('/tasks', form.dataset.view, form.dataset.searchTitle));
  }, (error) => {
    showMessage(requestError, error.fields?._form || error.message);
    showFieldErrors(form, error.fields);
  });
}

async function initialize() {
  if (guestForm) {
    initializeGuestForm(guestForm);
    return;
  }
  if (!taskPage && !taskForm) return;

  document.querySelector('#account-nav').hidden = false;
  document.querySelector('.brand').href = '/tasks';
  handleForm(logoutForm, async () => {
    if (await request(logoutForm.action, { method: 'POST', body: {} })) signOut();
  }, (error) => showMessage(requestError, error.message));

  if (taskPage) await initializeTaskList(taskPage);
  if (taskForm) await initializeTaskForm(taskForm);
}

window.addEventListener('pageshow', (event) => {
  if (event.persisted) window.location.reload();
});

document.addEventListener('click', (event) => {
  for (const options of document.querySelectorAll('.task-options[open]')) {
    if (!options.contains(event.target)) options.open = false;
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  const options = event.target.closest('.task-options[open]');
  if (!options) return;
  options.open = false;
  options.querySelector('summary').focus();
});

initialize().catch((error) => showMessage(requestError, error.message));
