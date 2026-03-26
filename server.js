require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const bodyParser = require('body-parser');

const { CohereClient } = require('cohere-ai');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// Supabase Initialization
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// In-memory fallback
let ideaCache = [
    {
        name: "EcoHealth Smart Monitor",
        sector: "Sustainability",
        core: "AI Water Analysis",
        description: "A IoT device that analyzes water quality in real-time using localized neural networks.",
        tags: ['Eco', 'IoT'],
        score: 88,
        status: 'Validated',
        created_at: new Date().toISOString()
    }
];

const cohere = new CohereClient({
    token: process.env.COHERE_API_KEY || process.env.COHERE_KEY
});

// Routes
app.get('/api/ideas', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('ideas')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.warn("Supabase Fetch Error (using fallback):", err.message);
        res.json(ideaCache);
    }
});

app.post('/api/ideas', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('ideas')
            .insert([req.body])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        console.warn("Supabase Insert Error (mocking success):", err.message);
        const newIdea = { ...req.body, id: Date.now(), created_at: new Date().toISOString() };
        ideaCache.unshift(newIdea);
        res.status(201).json(newIdea);
    }
});

// Bulk Save Endpoint
app.post('/api/ideas/bulk', async (req, res) => {
    const ideas = Array.isArray(req.body) ? req.body : [req.body];
    console.log(`📦 Bulk saving ${ideas.length} ideas...`);
    
    const saved = [];
    for (const idea of ideas) {
        const entry = { ...idea, id: Date.now() + Math.random(), created_at: new Date().toISOString() };
        ideaCache.unshift(entry);
        saved.push(entry);
    }
    
    // Try to save to Supabase too (optional bulk)
    try {
        await supabase.from('ideas').insert(ideas.map(i => ({...i, created_at: new Date().toISOString()})));
    } catch (e) {
        console.warn("Supabase Bulk Insert Failed (using local cache):", e.message);
    }

    res.status(201).json({ status: 'saved', count: saved.length });
});


// AI Forge Endpoint with Cohere
app.post('/api/forge', async (req, res) => {
    const { input, problem } = req.body;
    console.log(`🚀 Forging ideas for: ${input}`);

    try {
        const prompt = `Generate 2 unique startup ideas for the industry: ${input}. 
        Problem statement to address: ${problem || 'General market gaps'}.
        Format as JSON array of objects with keys: name, sector, core, description, tags (array), score (number 0-100), 
        blueprint (object with keys: tools (array of strings), steps (array of strings)).
        "core" should be a 1-2 word tech focus (e.g., "AI Legal Analysis").
        "tools" should be a HIGHLY OPTIMIZED 3-4 tool stack specifically for this idea. 
        Examples: 
        - For UI/UX: v0.dev, Canva AI, Framer AI.
        - For Development: Cursor AI, Replit Agent, Bolt.new.
        - For AI Logic: OpenAI API, LangChain, Pinecone, Groq.
        - For Database/Auth: Supabase, Neon, Clerk.
        - For Automation: Zapier Central, Make.com.
        "steps" should be a user-friendly 3-step guide using THE SUGGESTED TOOLS to get to a working model.
        Respond ONLY with the JSON array.`;

        const response = await cohere.chat({
            model: 'command-r-08-2024',
            message: prompt,
        });

        let forgedIdeas;
        try {
            const rawText = response.text.trim();
            const jsonPart = (rawText.match(/\[.*\]/s) || [null])[0];
            if (!jsonPart) throw new Error("No JSON array found in AI response");
            forgedIdeas = JSON.parse(jsonPart);
        } catch (e) {
            console.error("Cohere Parse Error:", e);
            // Fallback mock if AI response is not valid JSON
            forgedIdeas = [{
                name: `${input} AI Optimizer`,
                sector: input,
                core: "Custom Model Tuning",
                description: `Real-time optimization for ${input} business workflows.`,
                tags: ['AI', 'B2B'],
                score: 78
            }];
        }

        // Try to save to Supabase
        try {
            await supabase.from('ideas').insert(forgedIdeas);
        } catch (sErr) {
            console.warn("Supabase Save failed during forge:", sErr.message);
            ideaCache.unshift(...forgedIdeas);
        }

        res.json(forgedIdeas);
    } catch (error) {
        console.error("AI Forge Process Failed:", error.message);
        res.status(500).json({ error: "AI Forge Failed: " + error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 StartupForge Backend running on http://localhost:${PORT}`);
});
