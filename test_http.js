import 'dotenv/config';

async function run() {
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'sharmajana291@gmail.com', password: 'password123' }) // Need real credentials... wait, I can just mock the JWT!
  });
  
  console.log(loginRes.status);
}
run();
