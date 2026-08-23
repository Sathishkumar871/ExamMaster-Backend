async function getAvailableModels() {
           const apiKey = process.env.GROQ_API_KEY;  
  console.log("🔄 మీ కీ కి అందుబాటులో ఉన్న మోడల్స్ లిస్ట్ తెప్పిస్తున్నాము...");

  try {
    const response = await fetch("https://api.groq.com/openai/v1/models", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`
      }
    });

    const data = await response.json();
    console.log("📦 Available Models List:");
    
    if (data && data.data) {
      data.data.forEach(model => {
        console.log(`- ${model.id}`);
      });
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

getAvailableModels();