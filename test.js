const fetch = require('node-fetch');
fetch('http://localhost:3000/auth.js?v=4').then(r => r.text()).then(t => {
  console.log('auth.js stars with:', t.substring(0, 15));
});
fetch('http://localhost:3000/fatwas/app.js?v=4').then(r => r.text()).then(t => {
  console.log('fatwas/app.js stars with:', t.substring(0, 15));
});
