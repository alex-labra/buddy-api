const express = require('express');
const router = express.Router();

module.exports = (pool2) => {
    // Route for getting user data
    router.get('/', async (req, res) => {
        const { email } = req.query;

        try {
            // Get the user data based on email
            const [userResults] = await pool2.query('SELECT userID, first_name, last_name, email, type FROM users WHERE email = ?', [email]);
            const userData = userResults[0];

            // Get the classes the user is registered to
            const [classResults] = await pool2.query('SELECT * FROM classes WHERE classID IN (SELECT classID FROM user_classes WHERE userID = ?)', [userData.userID]);
            userData.classes = classResults;

            // Get the quizzes for each class
            for (const classData of userData.classes) {
                const [quizResults] = await pool2.query('SELECT * FROM quizzes WHERE classID = ?', [classData.classID]);
                classData.quizzes = quizResults;

                // Get the questions and choices for each quiz
                for (const quizData of classData.quizzes) {
                    const [questionResults] = await pool2.query('SELECT * FROM questions WHERE quizID = ?', [quizData.quizID]);
                    quizData.questions = questionResults;

                    for (const questionData of quizData.questions) {
                        const [choiceResults] = await pool2.query('SELECT * FROM choices WHERE questionID = ?', [questionData.questionID]);
                        questionData.choices = choiceResults;
                    }

                    // Get the score for the quiz, if any
                    const [scoreResults] = await pool2.query('SELECT score FROM scores WHERE userID = ? AND quizID = ?', [userData.userID, quizData.quizID]);
                    if (scoreResults.length > 0) {
                        quizData.score = scoreResults[0].score;
                    }
                }
            }

            res.status(200).json(userData);
        } catch (err) {
            console.error(err);
            res.status(500).send('Error retrieving user data');
        }
    });

    return router;
};
