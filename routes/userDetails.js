const express = require('express');
const router = express.Router();

module.exports = (pool2) => {
    // Route to get user details
    router.get('/', async (req, res) => {
        const { email } = req.query;
        try {
            // Retrieve the user's details based on the email
            const [userResults] = await pool2.query('SELECT * FROM users WHERE email = ?', [email]);
            const user = userResults[0];

            if (!user) {
                return res.status(404).send('User not found');
            }

            // Retrieve the class names and quiz details associated with the user
            const [classResults] = await pool2.query(
                `SELECT c.className, q.quizID, q.quizName
         FROM classes c
         INNER JOIN user_classes uc ON c.classID = uc.classID
         INNER JOIN users u ON uc.userID = u.userID
         INNER JOIN quizzes q ON c.classID = q.classID
         WHERE u.email = ?`,
                [email]
            );

            const classQuizzes = {};

            for (const classData of classResults) {
                const { className, quizID, quizName } = classData;

                if (!classQuizzes[className]) {
                    classQuizzes[className] = [];
                }

                classQuizzes[className].push({ quizID, quizName });
            }

            const userDetails = {
                firstName: user.first_name,
                lastName: user.last_name,
                email: user.email,
                classQuizzes: classQuizzes,
            };

            res.status(200).json(userDetails);
        } catch (error) {
            console.error(error);
            return res.status(500).send('Server error');
        }
    });

    return router;
};
