const API_BASE_URL = import.meta.env.VITE_BACKEND_ADDRESS || 'http://localhost:3000';

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

// Groups API
export const groupsAPI = {
  getAll: () => apiCall('/groups'),
  getById: (id) => apiCall(`/groups/${id}`),
  create: (data) => apiCall('/groups', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiCall(`/groups/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiCall(`/groups/${id}`, {
    method: 'DELETE',
  }),
  addMember: (groupId, email) => apiCall(`/groups/${groupId}/members`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  }),
  removeMember: (groupId, memberId) => apiCall(`/groups/${groupId}/members/${memberId}`, {
    method: 'DELETE',
  }),
};

// Expenses API
export const expensesAPI = {
  getAll: (groupId = null) => {
    const query = groupId ? `?groupId=${groupId}` : '';
    return apiCall(`/expenses${query}`);
  },
  getById: (id) => apiCall(`/expenses/${id}`),
  create: (data) => apiCall('/expenses', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiCall(`/expenses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiCall(`/expenses/${id}`, {
    method: 'DELETE',
  }),
  settle: (id, settled = true) => apiCall(`/expenses/${id}/settle`, {
    method: 'PATCH',
    body: JSON.stringify({ settled }),
  }),
};

// Payments API
export const paymentsAPI = {
  getAll: (groupId = null) => {
    const query = groupId ? `?groupId=${groupId}` : '';
    return apiCall(`/payments${query}`);
  },
  create: (data) => apiCall('/payments', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

// Balances API
export const balancesAPI = {
  getOverall: () => apiCall('/balances'),
  getByGroup: (groupId) => apiCall(`/balances/group/${groupId}`),
};

// Categories (static data, can be moved to backend later)
export const categories = [
  { id: 'food', name: 'Food & Dining', icon: '🍔' },
  { id: 'utilities', name: 'Utilities', icon: '💡' },
  { id: 'rent', name: 'Rent', icon: '🏠' },
  { id: 'transport', name: 'Transportation', icon: '🚗' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬' },
  { id: 'shopping', name: 'Shopping', icon: '🛒' },
  { id: 'travel', name: 'Travel', icon: '✈️' },
  { id: 'other', name: 'Other', icon: '📦' },
];

export const getCategoryById = (id) => categories.find((c) => c.id === id);
