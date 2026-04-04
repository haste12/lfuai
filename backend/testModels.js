require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  try {
    const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const models = await ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
    console.log("Instantiated OK");
  } catch (e) {
    console.error("SDK Init Error:", e);
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await res.json();
    console.log("REST Available Models:");
    if (data.models) {
        data.models.forEach(m => console.log(m.name, "-", m.supportedGenerationMethods?.join(",")));
    } else {
        console.log(data);
    }
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}
test();
