const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API request failed');
  return data;
}

export const chatApi = {
  /**
   * Send a message to the AI backend.
   * @param {string} message - The user's message
   * @param {string|null} userId - Firebase UID for authenticated users, null for guests
   * @param {string|null} userName - Display name (optional)
   * @param {Array} history - Previous messages for context
   * @param {string|null} sessionId - Guest session ID (used when userId is null)
   */
  sendMessage: (message, userId, userName, history = [], sessionId = null) =>
    apiFetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message, userId, userName, history, sessionId }),
    }),

  getRemaining: (userId) => apiFetch(`/api/chat/remaining/${userId}`),
};

export const userApi = {
  getUser: (userId) => apiFetch(`/api/users/${userId}`),
  updateUser: (userId, data) =>
    apiFetch(`/api/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getAllUsers: () => apiFetch('/api/users'),
};
