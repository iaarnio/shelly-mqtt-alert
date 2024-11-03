import mqtt from 'mqtt';
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // Ensure the request is authorized
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    console.log("Unauthorized call - Missing or invalid authorization header.");
    return res.status(401).end('Unauthorized');
  }


  console.log("Cron job started.");

  let powerUseDetected = false;

  // Configure the MQTT client
  const client = mqtt.connect(process.env.MQTT_HOST, {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
  });

  // Log client connection
  client.on('connect', () => {
    console.log('Connected to MQTT broker');
    client.subscribe('cmnd/shellyplug/usage/#', (err) => {
      if (err) {
        console.error("Subscription error:", err);
      } else {
        console.log("Subscribed to topic cmnd/shellyplug/usage/#");
      }
    });
  });

  // Capture incoming messages and parse for power usage
  client.on('message', (topic, message) => {
    try {
      const data = message.toString();
      const timeRegex = /(\d{2}:\d{2}:\d{2})/;
      const match = data.match(timeRegex);

      if (match) {
        const [hours, minutes] = match[0].split(':').map(Number);
        const messageTimeUTC = new Date();
        messageTimeUTC.setUTCHours(hours, minutes, 0);

        // Check if message time is between 03:00 and 10:00 UTC
        const startWindow = new Date();
        startWindow.setUTCHours(3, 0, 0, 0);

        const endWindow = new Date();
        endWindow.setUTCHours(10, 0, 0, 0);

        if (messageTimeUTC >= startWindow && messageTimeUTC <= endWindow) {
          powerUseDetected = true;
          console.log(`Power usage detected at ${match[0]} UTC`);
        }
      }
    } catch (error) {
      console.error("Error parsing MQTT message:", error);
    }
  });

  console.log('before wait');

  // Wait a few seconds to capture messages
  await new Promise((resolve) => setTimeout(resolve, 5000));

  console.log('after wait');

  // If no power usage was detected, send an alert
  if (!powerUseDetected) {
    console.log("No power usage detected. Sending alert email.");
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: 'No Boiler Usage Detected',
      text: 'No boiler usage detected this morning.',
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log("Alert email sent successfully.");
    } catch (error) {
      console.error("Error sending email:", error);
    }
  } else {
    console.log("Power usage detected. No alert email sent.");
  }

  // End the MQTT client connection
  client.end(true, () => {
    console.log("Disconnected from MQTT broker.");
  });

  res.status(200).json({ message: 'Daily check completed' });
  console.log("Cron job completed.");
}
