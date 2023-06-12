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

// Create a connection pool for database
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

//check login info
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send('Email and password are required.');
    }

    try {
        // Check if user exists in the database
        const [results] = await pool2.query('SELECT * FROM users WHERE email = ?', [email]);

        const user = results[0];
        if (!user || password !== user.password) {
            return res.status(401).send('Authentication failed. Wrong email or password.');
        }

        // Create token and send it to the user
        const token = jwt.sign({ email: user.email, type: user.type }, JWT_SECRET_KEY, options);
        res.json({ token });
    } catch (error) {
        console.error(error);
        return res.status(500).send('Server error');
    }
});

app.post('/enroll', async (req, res) => {
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

//delete a class
app.post('/delete-class', async (req, res) => {
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

//SETTINGS: update name
app.post('/update-name', async (req, res) => {
    const { email, password, newFirstName, newLastName } = req.body;

    if (!email || !password || !newFirstName || !newLastName) {
        return res.status(400).send('Email, password, first name, and last name are required.');
    }

    try {
        // Check if the user exists
        const [userResults] = await pool2.query('SELECT * FROM users WHERE email = ?', [email]);
        const user = userResults[0];

        if (!user) {
            return res.status(404).send('User not found.');
        }

        // Check if the password matches
        if (user.password !== password) {
            return res.status(401).send('Invalid password.');
        }

        // Update the user's first name and last name
        await pool2.query('UPDATE users SET first_name = ?, last_name = ? WHERE email = ?', [newFirstName, newLastName, email]);

        res.status(200).send('Name updated successfully.');
    } catch (error) {
        console.error(error);
        return res.status(500).send('Server error');
    }
});

//SETTINGS: update password
app.post('/update-password', async (req, res) => {
    const { email, oldPassword, newPassword } = req.body;

    if (!email || !oldPassword || !newPassword) {
        return res.status(400).send('Email, old password, and new password are required.');
    }

    try {
        // Check if the user exists
        const [userResults] = await pool2.query('SELECT * FROM users WHERE email = ?', [email]);
        const user = userResults[0];

        if (!user) {
            return res.status(404).send('User not found.');
        }

        // Check if the old password matches
        if (user.password !== oldPassword) {
            return res.status(401).send('Invalid old password.');
        }

        // Update the user's password
        await pool2.query('UPDATE users SET password = ? WHERE email = ?', [newPassword, email]);

        res.status(200).send('Password updated successfully.');
    } catch (error) {
        console.error(error);
        return res.status(500).send('Server error');
    }
});

//SETTINGS: update email
app.post('/update-email', async (req, res) => {
    const { oldEmail, password, newEmail } = req.body;

    if (!oldEmail || !password || !newEmail) {
        return res.status(400).send('Old email, password, and new email are required.');
    }

    try {
        // Check if the user exists
        const [userResults] = await pool2.query('SELECT * FROM users WHERE email = ?', [oldEmail]);
        const user = userResults[0];

        if (!user) {
            return res.status(404).send('User not found.');
        }

        // Check if the password matches
        if (user.password !== password) {
            return res.status(401).send('Invalid password.');
        }

        // Update the user's email
        await pool2.query('UPDATE users SET email = ? WHERE email = ?', [newEmail, oldEmail]);

        res.status(200).send('Email updated successfully.');
    } catch (error) {
        console.error(error);
        return res.status(500).send('Server error');
    }
});

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


