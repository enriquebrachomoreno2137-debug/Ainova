const res = await fetch('https://ainova-blush.vercel.app/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'enrique', password: 'enrique' }),
});
const text = await res.text();
console.log('Status:', res.status);
console.log('Body:', text);
