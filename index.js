const mqtt = require('mqtt');
const aws = require('aws-sdk');

// Initialize SNS for email notifications
const sns = new aws.SNS({ region: 'your-region' });
const topicArn = 'YOUR_SNS_TOPIC_ARN'; // Replace with the ARN of the SNS topic you’ll set up

// Lambda handler
exports.handler = async (event) => {
    // MQTT connection setup
    const mqttOptions = {
        host: process.env.MQTT_HOST,
        username: process.env.MQTT_USERNAME,
        password: process.env.MQTT_PASSWORD
    };
    const client = mqtt.connect(mqttOptions);

    let powerUseDetected = false;
    const currentTime = new Date();

    // Subscribe to the MQTT topic
    client.on('connect', () => {
        client.subscribe('cmnd/shellyplug/usage/alert');
    });

    // Set power usage flag within time window
    client.on('message', (topic, message) => {
        if (topic === 'cmnd/shellyplug/usage/alert') {
            powerUseDetected = true;
            client.end();
        }
    });

    // Check for the alert window time
    if (currentTime.getHours() >= 5 && currentTime.getHours() < 12 && !powerUseDetected) {
        await sns.publish({
            Message: 'Ei vedenkeittimen käyttöä tänä aamuna',
            TopicArn: topicArn
        }).promise();
    }
    return { statusCode: 200, body: 'Lambda execution complete' };
};
