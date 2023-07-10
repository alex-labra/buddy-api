const express = require('express');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2');
const mysql2 = require('mysql2/promise'); //promise package
const cors = require('cors');
const app = express();

app.use(express.json());
require('dotenv').config();

// Enable CORS for all routes
app.use(cors());

// Create a callback function connection pool for database
const pool = mysql.createPool({
    host: process.env.MYSQL_ADDON_HOST,
    port: process.env.MYSQL_ADDON_PORT,
    user: process.env.MYSQL_ADDON_USER,
    password: process.env.MYSQL_ADDON_PASSWORD,
    database: process.env.MYSQL_ADDON_DB
});

// Create a connection pool with promise
const pool2 = mysql2.createPool({
    host: process.env.MYSQL_ADDON_HOST,
    port: process.env.MYSQL_ADDON_PORT,
    user: process.env.MYSQL_ADDON_USER,
    password: process.env.MYSQL_ADDON_PASSWORD,
    database: process.env.MYSQL_ADDON_DB
});

//jwt 
const JWT_SECRET_KEY = process.env.JWT_KEY;
const options = { expiresIn: '6h' };

//Verify token endpoint
app.get('/api/auth', authenticateToken, (req, res) => {
    res.send('Access granted');
});

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).send('Token is missing!');
    }

    jwt.verify(token, JWT_SECRET_KEY, (error, user) => {
        if (error) {
            return res.status(403).send('Invalid token!');
        }
        return res.status(200).send('Token is valid!');
        // or you can send additional data along with the success response
        // return res.status(200).json({ message: 'Token is valid!', user });
    });
}

//Login Route
const loginRoute = require('./routes/login')(pool2, jwt, JWT_SECRET_KEY, options);
app.use('/login', loginRoute);

//Enroll of Students Route
const enrollRoute = require('./routes/enroll')(pool2);
app.use('/enroll', enrollRoute);

//Delete a Class Route
const deleteRoute = require('./routes/delete-class')(pool2);
app.use('/delete-class', deleteRoute);

//SETTINGS: Update Name Route
const nameUpdateRoute = require('./routes/update-name')(pool2);
app.use('/update-name', nameUpdateRoute);

//SETTINGS: Update Password Route
const passwordUpdateRoute = require('./routes/update-password')(pool2);
app.use('/update-password', passwordUpdateRoute);

//SETTINGS: Update Email Route
const emailUpdateRoute = require('./routes/update-email')(pool2);
app.use('/update-email', emailUpdateRoute);

//Create New Quiz Route
const createQuizRoute = require('./routes/createQuiz')(pool2);
app.use('/createQuiz', createQuizRoute);

//Retrieve Quizzes Route
const retrieveQuizRoute = require('./routes/retrieveQuizzes')(pool2);
app.use('/retrieveQuizzes', retrieveQuizRoute);

//User Details Route
const userDetailsRoute = require('./routes/userDetails')(pool2);
app.use('/userDetails', userDetailsRoute);

//record score for quiz Route
const recordScoreRoute = require('./routes/recordScore')(pool2);
app.use('/recordScore', recordScoreRoute);

//get all user data Route
const getUserDataRoute = require('./routes/getUserData')(pool2);
app.use('/getUserData', getUserDataRoute);

//set Quiz details Route
const setQuizDetailsRoute = require('./routes/setQuizDetails')(pool2);
app.use('/setQuizDetails', setQuizDetailsRoute);

//New Class Route
const newClassRoute = require('./routes/newClass')(pool2);
app.use('/newClass', newClassRoute);

// New User Route
const newUserRoute = require('./routes/newUser')(pool);
app.use('/newUser', newUserRoute);

// Email Service Route
const emailServiceRoute = require('./routes/emailService');
app.use('/emailService', emailServiceRoute);

// Retrieve student list
app.post('/retrieve-students', async (req, res) => {
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


app.listen(process.env.PORT, () => {
    console.log(`Server listening on port ${process.env.PORT}`);
});