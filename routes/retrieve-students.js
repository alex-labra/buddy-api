const express = require('express');
const router = express.Router();

module.exports = (pool2) => {
    // Route for recording quiz score
    router.post('/', async (req, res) => {
        const { classIDs } = req.body;
        console.log(classIDs)
        try {
            // Retrieve the students enrolled in the classes, including their class names
            const queryString = `SELECT u.userID, u.first_name, u.last_name, u.email, c.className
            FROM users u
            INNER JOIN user_classes uc ON u.userID = uc.userID
            INNER JOIN classes c ON uc.classID = c.classID
            WHERE uc.classID IN (?)
            AND u.type <> 'teacher'`;

            const [results] = await pool2.query(queryString, [classIDs]);

            // Restructure the response object with class names as keys
            const studentsByClass = {};

            results.forEach((student) => {
                const { className, ...studentData } = student;

                if (!studentsByClass[className]) {
                    studentsByClass[className] = [];
                }

                studentsByClass[className].push(studentData);
            });

            // Send the student list in the response
            res.status(200).json(studentsByClass);
        } catch (error) {
            console.error(error);
            res.status(500).send('Server error');
        }
    });

    return router;
};
