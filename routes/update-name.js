const express = require('express');
const router = express.Router();

module.exports = (pool2) => {
    // Route for updating user name
    router.post('/', async (req, res) => {
        const { email, password, newFirstName, newLastName } = req.body;

        if (!email || !password || !newFirstName || !newLastName) {
            return res.status(400).send('Email, password, first name, and last name are required.');
        }

        try {
            // Check if the user exists
            const [userResults] = await pool2.query('SELECT * FROM users WHERE email = ?', [email]);
            const user = userResults[0];

            if (!user) {
                return res.status(404).send('User not found.');
            }

            // Check if the password matches
            if (user.password !== password) {
                return res.status(401).send('Invalid password.');
            }

            // Update the user's first name and last name
            await pool2.query('UPDATE users SET first_name = ?, last_name = ? WHERE email = ?', [newFirstName, newLastName, email]);

            res.status(200).send('Name updated successfully.');
        } catch (error) {
            console.error(error);
            return res.status(500).send('Server error');
        }
    });

    return router;
};
