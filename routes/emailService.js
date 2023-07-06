const express = require('express');
const sgMail = require('@sendgrid/mail');
const router = express.Router();

router.post('/', (req, res) => {
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

module.exports = router;
