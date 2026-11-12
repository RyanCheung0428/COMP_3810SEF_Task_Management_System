// Handle POST forms for login, logout, and task changes.
document.addEventListener('submit', (event) => {
  const form = event.target;
  if (form.method !== 'post') return;
  if (form.dataset.submitting) {
    event.preventDefault();
    return;
  }

  // Ask for confirmation when the form has a data-confirm message.
  if (form.dataset.confirm && !window.confirm(form.dataset.confirm)) {
    event.preventDefault();
    return;
  }

  // Mark the form as submitting and disable the button to prevent a second submission.
  form.dataset.submitting = 'true';
  if (event.submitter) {
    event.submitter.disabled = true;
  }
});

// Reload a protected page restored by Back so the server checks the session again.
window.addEventListener('pageshow', (event) => {
  if (event.persisted && document.body.dataset.signedIn === 'yes') {
    window.location.reload();
    return;
  }

  // Reset restored forms so users can submit them again.
  for (const form of document.querySelectorAll('form[data-submitting]')) {
    delete form.dataset.submitting;
    for (const button of form.querySelectorAll('button[type="submit"]')) {
      button.disabled = false;
    }
  }
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
