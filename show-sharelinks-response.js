const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';
const PROJECT_ID = 'bbf18964-c4c3-4361-9547-cb570389664c';

async function showShareLinksResponse() {
  try {
    // Login
    const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email: 'john.smith@acme.com',
      password: 'Password123!'
    });

    const token = loginResponse.data.accessToken;

    // Get project share links
    const shareLinksResponse = await axios.get(
      `${API_BASE_URL}/api/projects/${PROJECT_ID}/share-links`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    // Pretty print the response
    console.log(JSON.stringify(shareLinksResponse.data, null, 2));

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

showShareLinksResponse();
