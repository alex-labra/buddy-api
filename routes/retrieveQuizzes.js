const express = require('express');
const router = express.Router();

module.exports = (pool2) => {
    // Route for updating email
    router.post('/', async (req, res) => {
        const { email, className } = req.body;

        try {
            // Get the quizIDs based on email and className from user_classes table
            const [quizResults] = await pool2.query(
                'SELECT q.quizID FROM quizzes q INNER JOIN classes c ON q.classID = c.classID ' +
                'INNER JOIN user_classes uc ON c.classID = uc.classID ' +
                'INNER JOIN users u ON uc.userID = u.userID ' +
                'WHERE u.email = ? AND c.className = ?',
                [email, className]
            );

            const quizIDs = quizResults.map(result => result.quizID);

            // Retrieve quizzes for each quizID
            const quizzes = [];

            for (const quizID of quizIDs) {
                // Retrieve quiz details from the quizzes table
                const [quizDataResults] = await pool2.query('SELECT * FROM quizzes WHERE quizID = ?', [quizID]);
                const quiz = quizDataResults[0];

                if (!quiz) {
                    return res.status(404).send('Quiz not found');
                }

                // Retrieve questions and choices for the quiz
                const [questionResults] = await pool2.query('SELECT * FROM questions WHERE quizID = ?', [quizID]);
                const questions = [];

                for (const question of questionResults) {
                    // Retrieve choices for each question
                    const [choiceResults] = await pool2.query('SELECT * FROM choices WHERE questionID = ?', [question.questionID]);
                    const choices = choiceResults.map(choice => ({
                        choiceID: choice.choiceID,
                        option1: choice.option1,
                        option2: choice.option2,
                        option3: choice.option3,
                        option4: choice.option4
                    }));

                    questions.push({
                        questionID: question.questionID,
                        question: question.question, // Include the question field
                        choices: choices,
                        answer: question.answer
                    });
                }

                const quizData = {
                    quizID: quiz.quizID,
                    classID: quiz.classID,
                    quizName: quiz.quizName,
                    quizDifficulty: quiz.quizDifficulty,
                    quizSubject: quiz.quizSubject,
                    dueDate: quiz.dueDate,
                    timeLimit: quiz.timeLimit,
                    questions: questions
                };

                quizzes.push(quizData);
            }

            res.status(200).json(quizzes);
        } catch (error) {
            console.error(error);
            return res.status(500).send('Server error');
        }
    });

    return router;
};
