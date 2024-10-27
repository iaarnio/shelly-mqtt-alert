const mqtt = require('mqtt');
const nodemailer = require('nodemailer');

// Set MQTT and email configuration
const mqttOptions = {
  host: process.env.MQTT_HOST,
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD
};

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Function to send an alert email
function sendAlert(message) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER,
    subject: 'Mairen älypistorasian hälytys',
    text: `Hälytys: ${message}`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(`Error: ${error}`);
    }
    console.log(`Email sent: ${info.response}`);
  });
}

// Connect to the MQTT broker
const client = mqtt.connect(mqttOptions);

client.on('connect', () => {
  console.log('Connected to MQTT broker');
  client.subscribe('cmnd/shellyplug/usage/alert');
});

client.on('error', (error) => {
  console.log('MQTT Connection Error:', error);
});

// Process incoming MQTT messages
client.on('message', (topic, message) => {
  console.log(`Received message: ${message.toString()} on topic: ${topic}`);

  // When an alert message is received from Tasmota, send an email alert
  if (topic === 'cmnd/shellyplug/usage/alert') {
    sendAlert("Ei vedenkeittimen käyttöä klo 05:00-12:00 välillä.");
  }
});
