import axios from 'axios';

const testLogin = async () => {
  try {
    const res = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'superadmin@gmail.com',
      password: 'admin'
    });
    console.log("Success:", res.data);
  } catch (err) {
    console.error("Login Error:", err.response ? err.response.data : err.message);
  }
}
testLogin();
