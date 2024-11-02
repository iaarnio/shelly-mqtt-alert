import mqtt from 'mqtt';  // Ensure this package is installed
import nodemailer from 'nodemailer'; // Ensure this package is installed

// MQTT Configuration
const MQTT_HOST = process.env.MQTT_HOST;
const MQTT_USERNAME = process.env.MQTT_USERNAME;
const MQTT_PASSWORD = process.env.MQTT_PASSWORD;
const MQTT_TOPIC = 'cmnd/shellyplug/usage';

// Email Configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',  // You can use other providers like SES, SendGrid, etc.
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export default async function handler(req, res) {
  let powerUseDetected = false;

  // Create the MQTT client
  const client = mqtt.connect(MQTT_HOST, {
    username: MQTT_USERNAME,
    password: MQTT_PASSWORD
  });

  // Function to send an alert email
  const sendAlert = async () => {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: 'Mairen vedenkeittimen hälytys',
      text: `Ei vedenkeittimen käyttöä tänä aamuna. Voi olla hyvä tarkistaa, että kaikki on OK.`
    };
    try {
      await transporter.sendMail(mailOptions);
      console.log("Alert email sent successfully.");
    } catch (error) {
      console.error("Error sending email:", error);
    }
  };

  // Connect to MQTT and listen for messages
  client.on('connect', () => {
    console.log('Connected to MQTT broker');
    client.subscribe(MQTT_TOPIC);
  });

  client.on('message', (topic, message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data && data.ENERGY && data.ENERGY.Power > 10) {
        powerUseDetected = true; // Mark usage as detected
      }
    } catch (error) {
      console.error("Error parsing MQTT message:", error);
    }
  });

  // Wait for a few seconds to check messages
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // If no power usage was detected, send an alert email
  if (!powerUseDetected) {
    await sendAlert();
  }

  // End MQTT client connection
  client.end();

  // Respond with a status for the cron job
  res.status(200).json({ message: 'Daily check completed' });
}
