# BHC_updated
Here’s a complete **README.md** for your **BHC Global Chatbot** project, tailored to the code and data you’ve shared:

---

```markdown
# BHC Global Chatbot

An AI-powered website chatbot built with **AWS Bedrock**, **LangChain**, and **React**, designed to provide instant answers from BHC Global’s website content and PowerConnect.AI resources.

---

## 📖 Overview

The **BHC Global Chatbot** is an interactive AI assistant named **Ava** that helps users quickly find information about BHC Global’s services, solutions, and career opportunities.  
It integrates **Claude 3.5 Sonnet** on AWS Bedrock for natural language responses, uses **Titan Embeddings** with **FAISS** for semantic search, and is deployed as a floating popup widget on the BHC Global website.

---

## ✨ Features

- 🤖 **AWS Bedrock + LangChain** conversational AI
- 📚 **RAG (Retrieval-Augmented Generation)** using BHC & PCAI website data
- 🔍 **Titan Embeddings + FAISS** vector search
- 🎨 **React-based floating chat widget** with Tailwind CSS
- 💬 Quick reply buttons for common queries
- 📱 Responsive design for desktop and mobile
- ⚡ Instant response streaming from API

---

## 🗂 Project Structure

```

.
├── frontend/
│   ├── app/
│   │   ├── layout.tsx         # Root layout with global widget mount
│   │   ├── page.tsx           # Demo page
│   │   ├── widget.tsx         # Widget mount entry
│   ├── components/
│   │   └── BHCChatWidget.tsx  # Chat UI logic & design
│   ├── globals.css            # Tailwind & global styles
│
├── backend/
│   ├── route.ts               # API route for chat requests
│   ├── rag.ts                 # Retrieval logic (FAISS + embeddings)
│   ├── systemPrompt.ts        # AI system prompt instructions
│   ├── bhc\_cleaned\_data.json  # Scraped BHC Global content
│   ├── pcai\_cleaned\_data.json # Scraped PowerConnect.AI content
│
└── README.md

````

---

## ⚙️ Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-username/BHC_updated.git
cd BHC_updated
````

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**
   Create a `.env` file in the root directory and add:

```env
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
USE_LLM=true
```

4. **Run the development server**

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## 🚀 Usage

* Visit the site and click the **💬 floating chat button** in the bottom-right corner.
* Type your query or use quick reply buttons.
* Ava will respond instantly using information from BHC Global and PowerConnect.AI.

---

## 📊 Data Sources

The chatbot is powered by:

* **BHC Global website content** (`bhc_cleaned_data.json`)
* **PowerConnect.AI website content** (`pcai_cleaned_data.json`)

These datasets are indexed into a FAISS vector store for semantic search.

---

## 🎨 UI & Styling

* **Framework:** React + Next.js (App Router)
* **Styling:** Tailwind CSS
* **Theme:** Blue (#BHC Blue) and white, matching BHC Global branding

---

## 🤝 Contributing

Pull requests are welcome!
If you’re adding new content or functionality:

1. Fork the repo
2. Create a feature branch
3. Submit a PR with a clear description of your changes

---

## 📄 License

This project is licensed under the MIT License.

---

## 📬 Contact

For business inquiries, please visit: [BHC Global Contact](https://bhcglobal.com/contact)
For technical support, email: `your-email@example.com`

```

---

If you want, I can also **add screenshots/GIFs of the widget** and a **diagram showing the RAG flow** so the README looks even more professional. That would make it visually appealing for GitHub. Do you want me to add those next?
```
