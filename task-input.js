// The task pages and API share these field choices, validation rules and search filters.
const inProgress = 'In Progress';
const completed = 'Completed';
const statuses = [inProgress, completed];

// These defaults fill the new-task form and list the fields a user can edit.
const emptyTask = {
  title: '',
  description: '',
  dueDate: null
};

// Parse a YYYY-MM-DD string as midnight UTC, or return null if invalid.
function parseDueDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  return date;
}

// Return cleaned task fields and errors. A partial update checks only the submitted fields.
function validateTask(input, { partial = false, allowStatus = true } = {}) {
  const task = partial ? {} : { ...emptyTask };
  const errors = {};

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    errors._form = 'Enter valid task details.';
    return { task, errors };
  }

  // Copy only editable fields. The server sets IDs, ownership and timestamps.
  const fields = Object.keys(emptyTask);
  if (allowStatus) fields.push('status');
  for (const field of fields) {
    if (!Object.hasOwn(input, field)) continue;

    const value = input[field];
    if (field === 'dueDate') {
      if (value === '' || value === null) {
        task.dueDate = null;
      } else {
        const date = parseDueDate(value);
        if (date) task.dueDate = date;
        else errors.dueDate = 'Enter a valid date in YYYY-MM-DD format.';
      }
    } else if (typeof value !== 'string') {
      errors[field] = 'Enter a text value.';
    } else if (field === 'title') {
      task[field] = value.trim();
    } else {
      task[field] = value;
    }
  }

  // Check text lengths and allowed choices, and record each error under its field name.
  if (task.title !== undefined && (task.title.length < 1 || task.title.length > 120)) {
    errors.title = 'Enter a title of 1 to 120 characters.';
  }
  if (task.description !== undefined && task.description.length > 1000) {
    errors.description = 'Use 1,000 characters or fewer.';
  }
  if (task.status !== undefined && !statuses.includes(task.status)) {
    errors.status = 'Choose a valid status.';
  }
  if (partial && Object.keys(task).length === 0 && Object.keys(errors).length === 0) {
    errors._form = 'Provide at least one editable task field.';
  }

  return { task, errors };
}

// Return the MongoDB query conditions and any validation errors.
function readTaskFilters(input) {
  const filters = { title: '', status: '' };
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
    // Match title, description, or any part of the YYYY-MM-DD dueDate.
    const text = filters.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(text, 'i');
    query.$or = [
      { title: pattern },
      { description: pattern },
      {
        $expr: {
          $regexMatch: {
            input: {
              $ifNull: [
                { $dateToString: { format: '%Y-%m-%d', date: '$dueDate' } },
                ''
              ]
            },
            regex: text,
            options: 'i'
          }
        }
      }
    ];
  }

  // Add status to the same query so a task must match both filters.
  if (filters.status) {
    if (statuses.includes(filters.status)) query.status = filters.status;
    else errors.status = 'Choose a valid status.';
  }

  return { query, errors };
}

module.exports = { emptyTask, inProgress, completed, statuses, validateTask, readTaskFilters };