import OpenAI from "openai";
import { env } from "../config/env.js";

const client = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

async function runPrompt(system, userContent, fallback) {
  if (!client) return fallback;
  const response = await client.chat.completions.create({
    model: env.OPENAI_MODEL,
    temperature: 0.3,
    messages: [
      { role: "system", content: system },
      { role: "user", content: userContent }
    ]
  });
  return response.choices?.[0]?.message?.content || fallback;
}

export async function generateRemark(input) {
  const fallback = `Student shows steady progress. Focus on ${input.weakSubjects?.join(", ") || "key weak topics"} with regular revision.`;
  return runPrompt(
    "You are School OS Agent. Write concise professional academic remarks for report cards.",
    JSON.stringify(input),
    fallback
  );
}

export async function performanceAnalysis(input) {
  const fallback = JSON.stringify({
    weak_subjects: input.weakSubjects || [],
    attendance_impact: "Attendance below target impacts consistency",
    intervention_plan: ["Weekly practice", "Parent-teacher follow-up", "Targeted remediation"]
  });
  return runPrompt(
    "You are School OS Agent. Return a compact JSON performance analysis.",
    JSON.stringify(input),
    fallback
  );
}

export async function circularDraft(input) {
  const fallback = `Subject: ${input.topic}\n\nDear Parents,\n${input.details}\n\nRegards,\nSchool Administration`;
  return runPrompt(
    "You are School OS Agent. Draft formal school circulars.",
    JSON.stringify(input),
    fallback
  );
}

export async function teacherSuggestions(input) {
  const fallback = JSON.stringify({
    strategies: ["Differentiate worksheets", "Frequent formative checks", "One-to-one support"],
    parent_actions: ["Daily 20-minute review", "Weekly progress check"]
  });
  return runPrompt(
    "You are School OS Agent. Provide practical intervention strategies for teachers.",
    JSON.stringify(input),
    fallback
  );
}
