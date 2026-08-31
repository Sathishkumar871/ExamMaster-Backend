require("dotenv").config();

const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function getAvailableModels() {
  try {
    console.log("Checking Groq models...\n");

    const models = await groq.models.list();

    console.log("Available Models:\n");

    models.data.forEach((model) => {
      console.log("-", model.id);
    });
  } catch (error) {
    console.error("Groq Error:", error.message);
  }
}

getAvailableModels();