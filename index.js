const express = require('express');
const sgMail = require('@sendgrid/mail');
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

//create new quiz
const createQuizRoute = require('./routes/createQuiz')(pool2);
app.use('/createQuiz', createQuizRoute);

//retrieve quiz
const retrieveQuizRoute = require('./routes/retrieveQuizzes')(pool2);
app.use('/retrieveQuizzes', retrieveQuizRoute);

//GET class details for teacher
app.get('/userDetails', async (req, res) => {
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



//record score for quiz
app.post('/recordScore', async (req, res) => {
    const { email, quizID, score } = req.body;

    try {
        // Get the userID based on email
        const [userResults] = await pool2.query('SELECT userID FROM users WHERE email = ?', [email]);
        const userID = userResults[0].userID;

        // Insert the score into the scores table
        await pool2.query('INSERT INTO scores (userID, quizID, score) VALUES (?, ?, ?)', [userID, quizID, score]);

        res.status(200).send('Score recorded successfully');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error recording score');
    }
});

//get all the user data
app.get('/getUserData', async (req, res) => {
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

//set Quiz details
app.post('/setQuizDetails', async (req, res) => {
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


app.post('/newClass', async (req, res) => {
    const className = req.body.className;
    const email = req.body.email;
    if (!email || !className) {
        return res.status(400).send('Emails and class name are required.');
    }

    try {
        const [typeResult] = await pool2.query('SELECT * FROM users WHERE email =?', [email]);
        const typeInfo = typeResult[0];
        const userType = typeInfo.type;
        const userU = typeInfo.userID;
        const [classResults] = await pool2.query('SELECT * FROM classes WHERE className = ? && teacherID = ?', [className, userU]);
        const classInfo = classResults[0];
        const classID = classInfo.classID;
        const ClassName = classInfo.className;
        console.log(typeResult);
        if (userType == 'teacher' && ClassName.toLowerCase() != className.toLowerCase()) {
            await pool2.query('INSERT INTO classes (className,teacherID) VALUES(?,?)', [className, userU]);
            await pool2.query('INSERT INTO user_classes (userID,classID) VALUES(?,?)', [userU, classID]);
        }
        else {
            res.status(400).send("User is not a teacher or no records found")
        }
    }
    catch (error) {
        console.log(error);
        return res.status(500).send('Server Error')
    }
    res.status(200).send('Class was added successfully ')
})

// Endpoint to send newUser Data to the DataBase
app.post('/newUser', (req, res) => {
    const userID = req.body.userID;
    const first_name = req.body.first_name;
    const last_name = req.body.last_name;
    const email = req.body.email;
    const type = req.body.type;
    const password = req.body.password;
    const avatar = req.body.avatar;
    pool.query('INSERT INTO users(first_name, last_name, email, type, password) VALUES(?,?,?,?,?)', [first_name, last_name, email, type, password, avatar], (error, results) => {
        if (error) {
            console.error('Error: ', error);
            res.status(500).json({ Error: 'An error just ocurred!!!' })
        } else {
            res.send("Posted")
        }
    });
})

//Endpoint to send email to SendGrid API from contact form
app.post('/emailService', (req, res) => {
    const { email, fullName, phoneNumber, message } = req.body;

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
        to: process.env.ADMIN_EMAIL,
        from: process.env.API_EMAIL,
        subject: 'Study Buddy Contact Request',
        text: `Name: ${fullName}\nEmail: ${email}\nPhone Number: ${phoneNumber}\n\n${message}`
    };

    sgMail
        .send(msg)
        .then(() => {
            console.log('Email Sent!');
            res.json({ message: 'Email was sent successfully!' });
        })
        .catch((error) => {
            console.error(error);
            res.status(500).json({ error: 'Error sending email' });
        });
});

app.listen(process.env.PORT, () => {
    console.log(`Server listening on port ${process.env.PORT}`);
});


