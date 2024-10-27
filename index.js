// Import dependencies
const mqtt = require('mqtt');
const nodemailer = require('nodemailer');

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
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER,
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
