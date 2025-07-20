// Simple frontend test to verify CORS is working
// You can run this in your browser's console while on your frontend app

// Test the CORS endpoint
fetch('http://localhost:5001/api/test', {
  method: 'GET',
  credentials: 'include', // Important for cookies
  headers: {
    'Content-Type': 'application/json',
  }
})
.then(response => {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
})
.then(data => {
  console.log('✅ CORS Test Success:', data);
})
.catch(error => {
  console.error('❌ CORS Test Failed:', error);
});

// Test the auth endpoint
fetch('http://localhost:5001/api/auth/verify', {
  method: 'GET',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  }
})
.then(response => response.json())
.then(data => {
  console.log('🔐 Auth endpoint response:', data);
})
.catch(error => {
  console.error('❌ Auth endpoint error:', error);
});
