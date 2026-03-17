const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: "analytics-consumer",
  brokers: ["kafka:9092"]
});

const consumer = kafka.consumer({ groupId: "analytics-group" });

async function startConsumer() {

  await consumer.connect();
  await consumer.subscribe({ topic: "requests", fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const data = JSON.parse(message.value.toString());

      console.log("📊 Event:", data);
    }
  });
}

startConsumer();