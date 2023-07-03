const express = require('express');
const router = express.Router();

module.exports = (pool2) => {
    // Route for recording quiz score
    router.post('/', async (req, res) => {
        const { email, quizID, score } = req.body;

        try {
            // Get the userID based on email
            const [userResults] = await pool2.query('SELECT userID FROM users WHERE email = ?', [email]);
            const userID = userResults[0].userID;

            // Insert the score into the scores table
            await pool2.query('INSERT INTO scores (userID, quizID, score) VALUES (?, ?, ?)', [userID, quizID, score]);

            res.status(200).send('Score recorded successfully');
        } catch (err) {
            console.error(err);
            res.status(500).send('Error recording score');
        }
    });

    return router;
};
