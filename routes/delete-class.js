const express = require('express');
const router = express.Router();

module.exports = (pool2) => {

// Route for deleting a class
router.post('/', async (req, res) => {
    const { className, userEmail } = req.body;

    if (!className || !userEmail) {
        return res.status(400).send('Class name and user email are required.');
    }

    try {
        // Teacher details
        const [teacherResults] = await pool2.query('SELECT type, userID FROM users WHERE email = ?', [userEmail]);
        const teacherInfo = teacherResults[0];
        const teacherType = teacherInfo.type;
        const teacherID = teacherInfo.userID;

        // Check if the user is a teacher
        if (teacherType !== 'teacher') {
            return res.status(403).send('Access denied. Only teachers can delete classes.');
        }

        // Check if the class exists
        const [classResults] = await pool2.query('SELECT * FROM classes WHERE className = ? AND teacherID = ?', [className, teacherID]);
        const classInfo = classResults[0];
        if (!classInfo) {
            return res.status(404).send('Class not found.');
        }

        const classID = classInfo.classID;

        // Delete the class
        await pool2.query('DELETE FROM classes WHERE classID = ?', [classID]);

        res.status(200).send('Class deleted successfully.');
    } catch (error) {
        console.error(error);
        return res.status(500).send('Server error');
    }
  });

    return router;
};
