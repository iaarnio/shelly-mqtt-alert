import mqtt from 'mqtt';
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // Ensure the request is authorized
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    console.log("Unauthorised call");
    return res.status(401).end('Unauthorized');
  }

  let powerUseDetected = false;

  // Configure the MQTT client
  const client = mqtt.connect(process.env.MQTT_HOST, {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
  });

  // Email configuration
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Function to send the alert email
  const sendAlert = async () => {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: 'No Boiler Usage Detected',
      text: 'No boiler usage detected this morning by 12:15 PM.',
    };
    try {
      await transporter.sendMail(mailOptions);
      console.log("Alert email sent successfully.");
    } catch (error) {
      console.error("Error sending email:", error);
    }
  };

  // Subscribe to the MQTT topic to check for power usage
  client.on('connect', () => {
    console.log('Connected to MQTT broker');
    client.subscribe('cmnd/shellyplug/usage/#');
  });

  client.on('message', (topic, message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data && data.ENERGY && data.ENERGY.Power > 10) {
        powerUseDetected = true;
      }
    } catch (error) {
      console.error("Error parsing MQTT message:", error);
    }
  });

  // Wait a few seconds to receive any messages if present
  await new Promise((resolve) => setTimeout(resolve, 5000));

  if (!powerUseDetected) {
    await sendAlert();
  }

  client.end();
  res.status(200).json({ message: 'Daily check completed' });
}
