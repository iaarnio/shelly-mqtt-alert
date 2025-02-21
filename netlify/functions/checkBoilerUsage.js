import mqtt from 'mqtt';
import nodemailer from 'nodemailer';

export async function handler(event, context) {
  console.log("Starting daily boiler usage check.");

  // We'll store the largest "Today" value we see
  let usageToday = 0;

  // Configure the MQTT client
  const client = mqtt.connect(process.env.MQTT_HOST, {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    clientId: 'NetlifyFunctionClient',
    clean: true,
  });

  // Set up nodemailer
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Send alert if no usage was detected
  async function sendAlert() {
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
  }

  // On MQTT connect, subscribe to Tasmota telemetry
  client.on('connect', () => {
    console.log("Connected to MQTT broker");
    // Subscribe to Tasmota's periodic telemetry topic
    client.subscribe('tele/shellyplug/usage/SENSOR', (err) => {
      if (err) {
        console.error("Subscription error:", err);
      } else {
        console.log("Subscribed to topic tele/shellyplug/usage/SENSOR");
      }
    });
  });

  // Process incoming messages
  client.on('message', (topic, message) => {
    console.log(`Message received on topic ${topic}: ${message.toString()}`);
    try {
      const data = JSON.parse(message.toString());

      // The ENERGY object has the "Today" field we need
      if (data?.ENERGY?.Today !== undefined) {
        console.log(`Current ENERGY.Today = ${data.ENERGY.Today}`);
        // Store the largest "Today" we see (usually it's just one retained message)
        usageToday = Math.max(usageToday, data.ENERGY.Today);
      }
    } catch (error) {
      console.error("Error parsing MQTT message:", error);
    }
  });

  await new Promise((resolve) => setTimeout(resolve, 6000)); // Wait 6 seconds

  const USAGE_THRESHOLD = 0.05; // kWh

  // Decide if usage occurred
  if (usageToday > USAGE_THRESHOLD) {
    console.log(`Boiler usage detected (Today=${usageToday}). No alert sent.`);
  } else {
    console.log("No boiler usage detected. Sending alert email.");
    await sendAlert();
  }

  // Handle errors
  client.on('error', (err) => {
    console.error("MQTT connection error:", err.message);
  });
  client.on('offline', () => {
    console.log("MQTT client went offline");
  });

  client.on('close', () => console.log('MQTT connection closed.'));

  await new Promise(resolve => {
    client.end(true, () => {
      console.log("Disconnected from MQTT broker.");
      resolve();
    });
  });

  // Return success response
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Daily boiler check completed' }),
  };
}
