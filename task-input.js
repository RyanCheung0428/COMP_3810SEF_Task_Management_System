const statuses = ['Pending', 'In Progress', 'Completed'];
const priorities = ['Low', 'Medium', 'High'];

const emptyTask = {
  title: '',
  description: '',
  status: 'Pending',
  priority: 'Medium',
  category: '',
  dueDate: null
};

function validateTask(input, partial = false) {
  const task = partial ? {} : { ...emptyTask };
  const errors = {};

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    errors._form = 'Enter valid task details.';
    return { task, errors };
  }

  // Copy only editable fields. IDs, ownership and timestamps come from the server.
  for (const field of Object.keys(emptyTask)) {
    if (!Object.hasOwn(input, field)) continue;

    const value = input[field];
    if (field === 'dueDate') {
      if (value === '' || value === null) {
        task.dueDate = null;
      } else if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const date = new Date(`${value}T00:00:00.000Z`);
        // Reject impossible dates, including dates JavaScript rolls into the next month.
        if (!Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value) {
          task.dueDate = date;
        } else {
          errors.dueDate = 'Enter a valid date.';
        }
      } else {
        errors.dueDate = 'Enter a valid date in YYYY-MM-DD format.';
      }
    } else if (typeof value !== 'string') {
      errors[field] = 'Enter a text value.';
    } else if (field === 'title' || field === 'category') {
      task[field] = value.trim();
    } else {
      task[field] = value;
    }
  }

  if (task.title !== undefined && (task.title.length < 1 || task.title.length > 120)) {
    errors.title = 'Enter a title of 1 to 120 characters.';
  }
  if (task.description !== undefined && task.description.length > 1000) {
    errors.description = 'Use 1,000 characters or fewer.';
  }
  if (task.status !== undefined && !statuses.includes(task.status)) {
    errors.status = 'Choose a valid status.';
  }
  if (task.priority !== undefined && !priorities.includes(task.priority)) {
    errors.priority = 'Choose a valid priority.';
  }
  if (partial && Object.keys(task).length === 0 && Object.keys(errors).length === 0) {
    errors._form = 'Provide at least one editable task field.';
  }

  return { task, errors };
}

function readTaskFilters(input) {
  const filters = { title: '', status: '', priority: '' };
  const query = {};
  const errors = {};

  for (const field of Object.keys(filters)) {
    if (input[field] === undefined) continue;
    if (typeof input[field] !== 'string') {
      errors[field] = 'Use a single value for this filter.';
    } else {
      filters[field] = input[field].trim();
    }
  }

  if (filters.title.length > 120) {
    errors.title = 'Use 120 characters or fewer.';
  } else if (filters.title) {
    // Search for the typed text, including any regular expression characters.
    const text = filters.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.title = new RegExp(text, 'i');
  }

  if (filters.status) {
    if (statuses.includes(filters.status)) query.status = filters.status;
    else errors.status = 'Choose a valid status.';
  }
  if (filters.priority) {
    if (priorities.includes(filters.priority)) query.priority = filters.priority;
    else errors.priority = 'Choose a valid priority.';
  }

  return { filters, query, errors };
}

module.exports = { emptyTask, statuses, priorities, validateTask, readTaskFilters };
