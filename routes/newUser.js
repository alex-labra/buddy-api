const express = require('express');
const router = express.Router();

module.exports = (pool) => {
    // Route for recording quiz score
    router.post('/', async (req, res) => {
        const first_name = req.body.first_name;
        const last_name = req.body.last_name;
        const email = req.body.email;
        const type = req.body.type;
        const password = req.body.password;

        // Check if all mandatory fields are present
        const missingFields = [];
        if (!first_name) missingFields.push('first_name');
        if (!last_name) missingFields.push('last_name');
        if (!email) missingFields.push('email');
        if (!type) missingFields.push('type');
        if (!password) missingFields.push('password');

        if (missingFields.length > 0) {
            res.status(400).json({ error: 'Missing mandatory fields', missingFields });
            return;
        }

        const avatar = req.body.avatar;
        pool.query(
            'INSERT INTO users (first_name, last_name, email, type, password, avatar) VALUES (?, ?, ?, ?, ?, ?)',
            [first_name, last_name, email, type, password, avatar],
            (error, results) => {
                if (error) {
                    console.error('Error: ', error);
                    res.status(500).json({ error: 'An error occurred while inserting user' });
                } else {
                    res.send('User successfully created');
                }
            }
        );
    });

    return router;
};
