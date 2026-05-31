import { config } from "./config.js";

export class RedisEventBus {
  constructor(redis) {
    this.redis = redis;
  }

  async publish(event) {
    await this.redis.xadd(
      config.eventStream,
      "*",
      "type",
      event.type,
      "payload",
      JSON.stringify(event)
    );
  }

  async subscribe(groupName, consumerName, handler) {
    try {
      await this.redis.xgroup("CREATE", config.eventStream, groupName, "0", "MKSTREAM");
    } catch (error) {
      if (!String(error.message).includes("BUSYGROUP")) {
        throw error;
      }
    }

    for (;;) {
      const response = await this.redis.xreadgroup(
        "GROUP",
        groupName,
        consumerName,
        "BLOCK",
        5000,
        "COUNT",
        20,
        "STREAMS",
        config.eventStream,
        ">"
      );

      if (!response) {
        continue;
      }

      for (const [, messages] of response) {
        for (const [id, fields] of messages) {
          const payloadIndex = fields.indexOf("payload");
          if (payloadIndex === -1) {
            await this.redis.xack(config.eventStream, groupName, id);
            continue;
          }

          const event = JSON.parse(fields[payloadIndex + 1]);
          await handler(event);
          await this.redis.xack(config.eventStream, groupName, id);
        }
      }
    }
  }
}
