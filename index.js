const mqtt = require('mqtt');
const cron = require('node-cron');
const nodemailer = require('nodemailer');

// MQTT Connection
const client = mqtt.connect({
    host: process.env.MQTT_HOST,
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD
});

let powerUseDetected = false; // Flag to track power usage

// Nodemailer setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

function sendAlert(message) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER,
        subject: 'Boiler Usage Alert',
        text: message
    };
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) console.log(`Error: ${error}`);
        else console.log(`Email sent: ${info.response}`);
    });
}

// Check for power usage during the monitoring window (05:00 - 12:00)
client.on('message', (topic, message) => {
    const currentTime = new Date();
    const currentHour = currentTime.getHours();

    if (!powerUseDetected && currentHour >= 5 && currentHour < 12) {
        powerUseDetected = true;
        console.log(`Power usage detected at ${currentTime.toISOString()}`);
    }
});

// Schedule the 12:03 daily check using node-cron
cron.schedule('03 12 * * *', () => {
    checkUsage();
});

// Define checkUsage to send an alert if no power usage was detected
function checkUsage() {
    if (!powerUseDetected) {
      sendAlert("Ei vedenkeittimen käyttöä klo 05:00-12:00 välillä.");
    }
    powerUseDetected = false; // Reset flag for the next day
}
