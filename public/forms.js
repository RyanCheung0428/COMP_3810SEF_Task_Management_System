// Confirm deletion and ignore extra submits while a POST request is running.
for (const form of document.querySelectorAll('form[method="post"]')) {
  form.addEventListener('submit', (event) => {
    if (form.dataset.submitting) {
      event.preventDefault();
      return;
    }

    if (form.dataset.confirm && !window.confirm(form.dataset.confirm)) {
      event.preventDefault();
      return;
    }

    form.dataset.submitting = 'true';
    if (event.submitter) {
      event.submitter.disabled = true;
    }
  });
}

// A browser can restore a page from memory when the user presses Back.
window.addEventListener('pageshow', (event) => {
  if (event.persisted && document.body.dataset.signedIn === 'yes') {
    window.location.reload();
    return;
  }

  for (const form of document.querySelectorAll('form[data-submitting]')) {
    delete form.dataset.submitting;
    for (const button of form.querySelectorAll('button[type="submit"]')) {
      button.disabled = false;
    }
  }
});
