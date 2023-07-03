const express = require('express');
const router = express.Router();

module.exports = (pool2) => {
    // Route for recording quiz score
    router.post('/', async (req, res) => {
        const { quizID, dueDate, timeLimit } = req.body;

        try {
            // Update the quiz details
            await pool2.query('UPDATE quizzes SET dueDate = ?, timeLimit = ? WHERE quizID = ?', [dueDate, timeLimit, quizID]);

            // Retrieve the updated quiz details
            const [quizResults] = await pool2.query('SELECT quizName, dueDate, timeLimit FROM quizzes WHERE quizID = ?', [quizID]);
            const quiz = quizResults[0];

            if (!quiz) {
                return res.status(404).send('Quiz not found');
            }

            const quizDetails = {
                quizName: quiz.quizName,
                dueDate: quiz.dueDate,
                timeLimit: quiz.timeLimit
            };

            res.status(200).json(quizDetails);
        } catch (error) {
            console.error(error);
            res.status(500).send('Error updating quiz details');
        }
    });

    return router;
};
