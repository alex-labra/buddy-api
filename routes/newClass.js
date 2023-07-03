const express = require('express');
const router = express.Router();

module.exports = (pool2) => {
    // Route for creating new class
    router.post('/', async (req, res) => {
        const { className, email } = req.body;
        if (!email || !className) {
            return res.status(400).send('Email and class name are required.');
        }

        try {
            const [typeResult] = await pool2.query('SELECT * FROM users WHERE email = ?', [email]);
            const typeInfo = typeResult[0];
            const userType = typeInfo.type;
            const userU = typeInfo.userID;
            const [classResults] = await pool2.query('SELECT * FROM classes WHERE className = ? AND teacherID = ?', [className, userU]);

            if (classResults.length === 0) {
                if (userType === 'teacher') {
                    const [insertClassResult] = await pool2.query('INSERT INTO classes (className, teacherID) VALUES (?, ?)', [className, userU]);
                    const classID = insertClassResult.insertId;
                    await pool2.query('INSERT INTO user_classes (userID, classID) VALUES (?, ?)', [userU, classID]);
                    res.status(200).send('Class was added successfully.');
                } else {
                    res.status(400).send('User is not a teacher.');
                }
            } else {
                res.status(400).send('Class already exists for the teacher.');
            }
        } catch (error) {
            console.log(error);
            res.status(500).send('Server Error');
        }
    });

    return router;
};
