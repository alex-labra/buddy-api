const express = require('express');
const router = express.Router();

module.exports = (pool2, jwt, JWT_SECRET_KEY, options) => {

// Route for checking login information
router.post('/', async (req, res) => {
    const { email, password } = req.body;
  
    if (!email || !password) {
      return res.status(400).send('Email and password are required.');
    }
  
    try {
      // Check if user exists in the database
      const [results] = await pool2.query('SELECT * FROM users WHERE email = ?', [email]);
  
      const user = results[0];
      if (!user || password !== user.password) {
        return res.status(401).send('Authentication failed. Wrong email or password.');
      }
  
      // Create token and send it to the user
      const token = jwt.sign({ email: user.email, type: user.type }, JWT_SECRET_KEY, options);
      res.json({ token, type: user.type, email: user.email });
    } catch (error) {
      console.error(error);
      return res.status(500).send('Server error');
    }
  });

    return router;
};
