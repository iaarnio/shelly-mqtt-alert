import mqtt from 'mqtt';
import nodemailer from 'nodemailer';

export async function handler(event, context) {
  console.log("Starting daily boiler usage check.");
  let powerUseDetected = false;

  // Configure the MQTT client
  const client = mqtt.connect(process.env.MQTT_HOST, {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
  });

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Set up email function
  const sendAlert = async () => {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: 'No Boiler Usage Detected',
      text: 'No boiler usage detected this morning by 10:00 UTC.',
    };
    try {
      await transporter.sendMail(mailOptions);
      console.log("Alert email sent successfully.");
    } catch (error) {
      console.error("Error sending email:", error);
    }
  };

  // Set up MQTT message handler
  client.on('connect', () => {
    console.log("Connected to MQTT broker");
    client.subscribe('cmnd/shellyplug/usage/#', (err) => {
      if (err) {
        console.error("Subscription error:", err);
      } else {
        console.log("Subscribed to topic cmnd/shellyplug/usage/#");
      }
    });
  });

  client.on('message', (topic, message) => {
      console.log(`Message received on topic ${topic}: ${message.toString()}`);
      try {
      const data = message.toString();
      const timeRegex = /(\d{2}:\d{2}:\d{2})/;
      const match = data.match(timeRegex);

      if (match) {
        const [hours, minutes] = match[0].split(':').map(Number);
        const messageTimeUTC = new Date();
        messageTimeUTC.setUTCHours(hours, minutes, 0);

        // Define window between 03:00 and 10:00 UTC
        const startWindow = new Date();
        startWindow.setUTCHours(3, 0, 0, 0);

        const endWindow = new Date();
        endWindow.setUTCHours(10, 0, 0, 0);

        console.log(`Received MQTT message: ${data}`);
        console.log(`Timestamp extracted: ${match[0]} UTC`);
        console.log(`Start window: ${startWindow}`);
        console.log(`End window: ${endWindow}`);

        if (messageTimeUTC >= startWindow && messageTimeUTC <= endWindow) {
          powerUseDetected = true;
          console.log(`Power usage detected at ${match[0]} UTC`);
        }
      }
    } catch (error) {
      console.error("Error parsing MQTT message:", error);
    }
  });

  await new Promise((resolve) => setTimeout(resolve, 10000));

  if (!powerUseDetected) {
    await sendAlert();
  } else {
    console.log("Power usage detected, no alert sent.");
  }

  client.end(true, () => {
    console.log("Disconnected from MQTT broker.");
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Daily boiler check completed' }),
  };
}
