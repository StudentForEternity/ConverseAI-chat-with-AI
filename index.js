import { initializeApp } from "firebase/app"
import { getDatabase, ref, push, get } from "firebase/database"
import { Configuration, OpenAIApi } from "openai"
import { process } from "./env"

const appSettings = {
  databaseURL: "",
}
const app = initializeApp(appSettings)
const database = getDatabase(app)
const conversationInDatabase = ref(database)

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
})
const openai = new OpenAIApi(configuration)
const chatbotConversation = document.getElementById("chatbot-conversation")

const instructionsObj = {
  role: "system",
  content: `You are a highly sarcastic assistant that gives short answers.`,
}

document.addEventListener("submit", (e) => {
  e.preventDefault()
  const userInput = document.getElementById("user-input")
  push(conversationInDatabase, {
    role: "user",
    content: userInput.value,
  })

  fetchReply()

  const newSpeechBubble = document.createElement("div")
  newSpeechBubble.classList.add("speech", "speech-human")
  chatbotConversation.appendChild(newSpeechBubble)
  newSpeechBubble.textContent = userInput.value
  userInput.value = ""
  chatbotConversation.scrollTop = chatbotConversation.scrollHeight
})

function fetchReply() {
  get(conversationInDatabase).then(async (snapshot) => {
    if (snapshot.exists()) {
      const conversationArr = Object.values(snapshot.val())
      conversationArr.unshift(instructionsObj)

      const response = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: conversationArr,
        presence_penalty: 1,
        frequency_penalty: 0.2,
      })

      console.log(response.data.choices[0].message)
      push(conversationInDatabase, response.data.choices[0].message)
      renderTypewriterText(response.data.choices[0].message.content)
    } else {
      console.log("No data available in the Database...")
    }
  })
}

function renderTypewriterText(text) {
  const newSpeechBubble = document.createElement("div")
  newSpeechBubble.classList.add("speech", "speech-ai", "blinking-cursor")
  chatbotConversation.appendChild(newSpeechBubble)
  let i = 0
  const interval = setInterval(() => {
    newSpeechBubble.textContent += text.slice(i - 1, i)
    if (text.length === i) {
      clearInterval(interval)
      newSpeechBubble.classList.remove("blinking-cursor")
    }
    i++
    chatbotConversation.scrollTop = chatbotConversation.scrollHeight
  }, 50)
}
