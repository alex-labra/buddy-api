const express = require('express');
const router = express.Router();

module.exports = (pool2) => {
    // Route for updating password
    router.post('/', async (req, res) => {
        const { email, oldPassword, newPassword } = req.body;

        if (!email || !oldPassword || !newPassword) {
            return res.status(400).send('Email, old password, and new password are required.');
        }

        try {
            // Check if the user exists
            const [userResults] = await pool2.query('SELECT * FROM users WHERE email = ?', [email]);
            const user = userResults[0];

            if (!user) {
                return res.status(404).send('User not found.');
            }

            // Check if the old password matches
            if (user.password !== oldPassword) {
                return res.status(401).send('Invalid old password.');
            }

            // Update the user's password
            await pool2.query('UPDATE users SET password = ? WHERE email = ?', [newPassword, email]);

            res.status(200).send('Password updated successfully.');
        } catch (error) {
            console.error(error);
            return res.status(500).send('Server error');
        }
    });

    return router;
};
