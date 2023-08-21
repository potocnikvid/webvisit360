import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const TO_EMAIL = process.env.TO_EMAIL ?? 'vid.slovenia7@gmail.com';
const FROM_EMAIL = process.env.FROM_EMAIL ?? 'vid.slovenia7@gmail.com';

export default async (req, res) => {
    const { email, message } = req.body;
    const msg = {
        to: TO_EMAIL,
        from: FROM_EMAIL,
        subject: 'Mail from ' + email,
        text: message,
        html: message,
    };
    try {
        await sgMail.send(msg);
        res.status(200).send('Email sent successfully');
    } catch (error) {
        console.error(error.response.body);
        res.status(500).send('Error sending email');
    }
};