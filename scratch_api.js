import axios from 'axios';
import mysql from 'mysql2/promise';

async function run() {
  try {
    // Generate token by signing a mock payload or using an existing user login
    const resLogin = await axios.post('http://localhost:8000/auth/login', {
      email: 'johnsmith@gmail.com',
      password: 'password' // replace with actual password if known, else let's bypass
    });
    console.log(resLogin.data);
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
  }
}
run();
