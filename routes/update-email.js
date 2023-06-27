const express = require('express');
const router = express.Router();

module.exports = (pool2) => {
    // Route for updating email
    router.post('/', async (req, res) => {
        const { oldEmail, password, newEmail } = req.body;

        if (!oldEmail || !password || !newEmail) {
            return res.status(400).send('Old email, password, and new email are required.');
        }

        try {
            // Check if the user exists
            const [userResults] = await pool2.query('SELECT * FROM users WHERE email = ?', [oldEmail]);
            const user = userResults[0];

            if (!user) {
                return res.status(404).send('User not found.');
            }

            // Check if the password matches
            if (user.password !== password) {
                return res.status(401).send('Invalid password.');
            }

            // Update the user's email
            await pool2.query('UPDATE users SET email = ? WHERE email = ?', [newEmail, oldEmail]);

            res.status(200).send('Email updated successfully.');
        } catch (error) {
            console.error(error);
            return res.status(500).send('Server error');
        }
    });

    return router;
};
