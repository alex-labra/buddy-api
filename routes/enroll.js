const express = require('express');
const router = express.Router();

module.exports = (pool2) => {

// Route for checking login information
router.post('/', async (req, res) => {
    const { emails, className, teacherEmail } = req.body;

    if (!emails || !className) {
        return res.status(400).send('Emails and class name are required.');
    }

    try {
        const [teacherResults] = await pool2.query('SELECT userID FROM users WHERE email = ?', [teacherEmail]);
        const teacherInfo = teacherResults[0];
        teacherID = teacherInfo.userID;

        // Check if the class exists
        const [classResults] = await pool2.query('SELECT * FROM classes WHERE className = ? && teacherID = ?', [className, teacherID]);
        const classInfo = classResults[0];
        if (!classInfo) {
            return res.status(404).send('Class not found.');
        }

        const classID = classInfo.classID;

        for (const email of emails) {
            // Check if the user exists
            const [userResults] = await pool2.query('SELECT * FROM users WHERE email = ?', [email]);
            const user = userResults[0];
            if (!user) {
                console.log(`User with email ${email} not found. Skipping enrollment.`);
                continue;
            }

            const userID = user.userID;

            // Check if the user is already enrolled in the class
            const [enrollmentResults] = await pool2.query('SELECT * FROM user_classes WHERE userID = ? AND classID = ?', [userID, classID]);
            if (enrollmentResults.length > 0) {
                console.log(`User with email ${email} is already enrolled in the class. Skipping enrollment.`);
                continue;
            }

            // Enroll the user in the class
            await pool2.query('INSERT INTO user_classes (userID, classID) VALUES (?, ?)', [userID, classID]);
            console.log(`User with email ${email} enrolled in the class successfully.`);
        }

        res.status(200).send('Enrollment completed.');
    } catch (error) {
        console.error(error);
        return res.status(500).send('Server error');
    }
  });

    return router;
};
