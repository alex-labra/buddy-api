const express = require('express');
const router = express.Router();

module.exports = (pool2) => {
    // Route for creating quiz
    router.post('/', async (req, res) => {
        const { quizName, quizDifficulty, quizSubject, quizData, className, email } = req.body;

        try {
            // Get the classID based on className and email
            const [classResults] = await pool2.query('SELECT classID FROM classes WHERE className = ? AND teacherID IN (SELECT userID FROM users WHERE email = ?)', [className, email]);
            const classID = classResults[0].classID;

            // Insert the quiz into the quizzes table
            const [quizResult] = await pool2.query('INSERT INTO quizzes (classID, quizName, quizDifficulty, quizSubject) VALUES (?, ?, ?, ?)', [classID, quizName, quizDifficulty, quizSubject]);
            const quizID = quizResult.insertId;

            // Retrieve the class name for the newly created quiz
            const [classResult] = await pool2.query('SELECT className FROM classes WHERE classID = ?', [classID]);
            const createdClassName = classResult[0].className;

            const createdQuiz = {
                quizID: quizID,
                quizName: quizName,
                className: createdClassName
            };

            // Insert the questions and choices into the questions and choices tables
            for (const questionData of quizData) {
                const { question, choices, answer } = questionData;

                // Insert the question into the questions table
                const [questionResult] = await pool2.query('INSERT INTO questions (quizID, question, answer) VALUES (?, ?, ?)', [quizID, question, answer]);
                const questionID = questionResult.insertId;

                // Insert the choices into the choices table
                await pool2.query('INSERT INTO choices (questionID, option1, option2, option3, option4) VALUES (?, ?, ?, ?, ?)', [questionID, ...choices]);
            }

            res.status(200).json(createdQuiz);
        } catch (error) {
            console.error(error);
            return res.status(500).send('Server error');
        }
    });

    return router;
};
