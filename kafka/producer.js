const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: "rate-limiter",
  brokers: ["kafka:9092"]
});

const producer = kafka.producer();

async function sendEvent(event) {
  await producer.connect();

  await producer.send({
    topic: "requests",
    messages: [
      { value: JSON.stringify(event) }
    ]
  });

  await producer.disconnect();
}

module.exports = { sendEvent };