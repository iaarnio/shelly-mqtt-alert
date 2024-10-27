// Import dependencies
const mqtt = require('mqtt');
const nodemailer = require('nodemailer');

// MQTT configuration
const mqttOptions = {
  host: 'mqtt://your-mqtt-broker-url',
  port: 1883,
  username: 'your-mqtt-username',
  password: 'your-mqtt-password'
};

// Nodemailer configuration
const transporter = nodemailer.createTransport({
  service: 'gmail', // or use a different email service
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-email-password'
  }
});

// Connect to the MQTT broker
const client = mqtt.connect(mqttOptions);

// Subscribe to a specific Tasmota topic
client.on('connect', () => {
  console.log('Connected to MQTT broker');
  client.subscribe('tasmota/sensor/data'); // Replace with your Tasmota topic
});

// Function to send an alert email
function sendAlert(message) {
  const mailOptions = {
    from: 'your-email@gmail.com',
    to: 'your-email@gmail.com',
    subject: 'Tasmota Alert',
    text: `Alert: ${message}`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(`Error: ${error}`);
    }
    console.log(`Email sent: ${info.response}`);
  });
}

// Process incoming MQTT messages
client.on('message', (topic, message) => {
  console.log(`Received message: ${message.toString()} on topic: ${topic}`);

  // Parse message and trigger email alert if needed
  const data = JSON.parse(message.toString());
  if (data.ENERGY && data.ENERGY.Power > 10) { // Adjust condition as needed
    sendAlert(`High power usage detected: ${data.ENERGY.Power}W`);
  }
});
