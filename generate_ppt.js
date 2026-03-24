const pptxgen = require("pptxgenjs");

let pptx = new pptxgen();
pptx.layout = 'LAYOUT_16x9';

// Slide 1: Title
let slide1 = pptx.addSlide();
slide1.addText("StartupForge AI", { x: 1, y: 1.5, w: 8, h: 2, fontSize: 48, color: "003366", bold: true, align: "center" });
slide1.addText("From Idea to Working Model Using 5 AI Tools", { x: 1, y: 3.5, w: 8, h: 1, fontSize: 24, color: "666666", align: "center" });

// Function to add standard slides
function createSlide(title, bodyArray) {
    let slide = pptx.addSlide();
    slide.addText(title, { x: 0.5, y: 0.5, w: 9, h: 0.8, fontSize: 32, bold: true, color: "003366", border: [0,0,{pt:2,color:'003366'},0] });
    
    // Formatting the bullet points
    let content = bodyArray.map(item => ({ text: item, options: { bullet: true, color: "363636", fontSize: 18, breakLine: true } }));
    slide.addText(content, { x: 0.5, y: 1.5, w: 9, h: 3.5, valign: "top" });
}

// Slide 2: Chosen Problem Statement
createSlide("1. Chosen Problem Statement", [
    "Macro Problem: 90% startup failure rate due to lack of market validation and unguided assumptions.",
    "Micro Focus (EcoHealth POC): Lack of accessible, real-time water quality monitoring in urban areas.",
    "Problem Context: Traditional laboratory testing is too slow, expensive, and inaccessible for local communities.",
    "Solution Provided: An automated AI pipeline to test, structure, and validate ideas instantly."
]);

// Slide 3: System Architecture
createSlide("2. System Architecture", [
    "Frontend Layer: HTML/CSS/JS (Vanilla) for dynamic dashboarding and visualization.",
    "Application Layer: Node.js with Express.js REST APIs as the central orchestrator.",
    "Database Layer: Supabase (PostgreSQL) for relational data & logs.",
    "AI Pipeline Orchestration: ManusAI (Seed) -> Cohere (NLP) -> CometML (Logs) -> IdeaProof (Scoring) -> Owlytics (Market Data)."
]);

// Slide 4: Tech Stack
createSlide("3. Tech Stack", [
    "Frontend: HTML5, CSS3, JavaScript, Chart.js",
    "Backend: Node.js, Express.js, CORS, Body-parser",
    "Database / BaaS: Supabase, PostgreSQL",
    "Integrations & MLOps: Cohere API (Command-R model), ManusAI, CometML REST API, IdeaProof Engine, Owlytics API."
]);

// Slide 5: Tool 1 - ManusAI
createSlide("Tool 1: ManusAI (Ideation Agent)", [
    "Description: The primary 'divergent thinking' engine. Extends seeds into varied concepts autonomously.",
    "Features: Autonomous seed expansion, Cross-pollination between disparate industries, Concept tagging.",
    "Pros/Cons: Extremely fast at ideation / ideas can sometimes be too abstract without refinement.",
    "Competitor vs ChatGPT: Primed purely for startups natively, avoiding general conversational fluff.",
    "Case Study Output: Sent 'HealthTech + Water' seed; generated the core pivot to an 'Edge-AI based IoT water scanner'."
]);

// Slide 6: Tool 2 - Cohere
createSlide("Tool 2: Cohere (NLP & Refinement)", [
    "Description: The 'convergent thinking' engine. Refines rough concepts into structured JSON formatting.",
    "Features: Strict JSON enforcement, Tone refinement (pitch articulation), Entity extraction.",
    "Pros/Cons: Highly reliable schema format / can be overly verbose if not contained.",
    "Competitor vs OpenAI: Extremely optimized for enterprise structuring & RAG workloads.",
    "Case Study Output: Extracted 'EcoHealth Smart Monitor' name, tags, and formatted pitch description into rendering JSON."
]);

// Slide 7: Tool 3 - CometML
createSlide("Tool 3: CometML (Experiment Tracking)", [
    "Description: The 'flight data recorder' for MLOps. Tracks LLM prompt success, parameters, and API health.",
    "Features: Prompt string logging, Hyperparameter tracking, A/B Testing versions.",
    "Pros/Cons: Prevents silent AI failures in production / adds slight overhead to API latency.",
    "Competitor vs W&B: Easier integration specifically tailored for strict LLM prompting.",
    "Case Study Output: Identified 404 failure in old Cohere model; successfully tracked rollover to command-r-08-2024 ensuring 98% success rate."
]);

// Slide 8: Tool 4 - IdeaProof
createSlide("Tool 4: IdeaProof (Validation Score)", [
    "Description: The mathematical heart of validation. Simulates market feasibility heuristically.",
    "Features: Regulatory risk assessment, Feasibility scoring (0-100), Entry barrier/competition analysis.",
    "Pros/Cons: Replaces emotional founder bias with data / might penalize highly disruptive blue ocean ideas.",
    "Competitor vs Traditional Research: Delivers baseline results in 400ms instead of 2 months and $20,000.",
    "Case Study Output: Assigned EcoHealth an 88/100 score, confirming low direct competition in localized neural network tech."
]);

// Slide 9: Tool 5 - Owlytics
createSlide("Tool 5: Owlytics (Market Insight)", [
    "Description: The external sensory system. Checks social momentum, public trends, and sentiment.",
    "Features: Trend trajectory mapping (6-month), Sentiment Radar (Positive/Negative/Neutral), Competitor heatmap.",
    "Pros/Cons: Visualizes public emotion effectively / can be swayed by temporary hype cycles.",
    "Competitor vs Google Trends: Combines search volume context with actual NLP sentiment analysis.",
    "Case Study Output: Identified a 65% upward trend in water-safety tech, verifying the market timing was perfect for EcoHealth."
]);

let filename = "StartupForge_Documentation.pptx";
pptx.writeFile({ fileName: filename }).then(() => {
    console.log("PPT generated successfully! Saved as " + filename);
}).catch(err => {
    console.error("Error writing PPTX:", err);
});
