import { Question } from "./db";
import fs from "fs";

interface GradingResult {
  transcribed_text: string;
  score: number;
  feedback: string;
  ai_reasoning: string;
}

export async function gradeSubmission(
  imagePaths: string[],
  questions: Question[],
  apiKey: string
): Promise<GradingResult[]> {
  const imageContents = imagePaths.map((p) => {
    const data = fs.readFileSync(p);
    const ext = p.split(".").pop()?.toLowerCase();
    const mediaType =
      ext === "png"
        ? "image/png"
        : ext === "jpg" || ext === "jpeg"
          ? "image/jpeg"
          : ext === "webp"
            ? "image/webp"
            : "image/png";
    return {
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: mediaType,
        data: data.toString("base64"),
      },
    };
  });

  const systemPrompt = `You are an expert exam grader for Hebrew high-school exams.
You will be shown scanned handwritten exam pages in Hebrew.
Your job is to:
1. Read and transcribe the Hebrew handwritten text for each answer
2. Grade each answer according to the provided rubric
3. Provide constructive feedback in Hebrew

IMPORTANT:
- The text is in Hebrew (right-to-left)
- Be generous but fair in interpreting handwriting
- Grade strictly according to the rubric criteria
- Provide feedback that helps the student understand what they did well and what to improve`;

  const questionsDescription = questions
    .map(
      (q) =>
        `Question ${q.question_number}: "${q.question_text}"
Max points: ${q.max_points}
Grading rubric: ${q.rubric}`
    )
    .join("\n\n");

  const userPrompt = `Here are scanned pages of a student's exam. Please grade each answer.

${questionsDescription}

For each question, respond in this exact JSON format (array of objects):
[
  {
    "question_number": 1,
    "transcribed_text": "The Hebrew text you read from the handwriting for this answer",
    "score": <number between 0 and max_points>,
    "feedback": "Feedback in Hebrew explaining the grade",
    "ai_reasoning": "Your reasoning process in English for the teacher to review"
  }
]

Return ONLY the JSON array, no other text.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [...imageContents, { type: "text", text: userPrompt }],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const text =
    data.content?.[0]?.type === "text" ? data.content[0].text : "";

  // Parse JSON from response, handling potential markdown code blocks
  let jsonStr = text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(jsonStr) as Array<{
    question_number: number;
    transcribed_text: string;
    score: number;
    feedback: string;
    ai_reasoning: string;
  }>;

  // Map results to questions in order
  return questions.map((q) => {
    const result = parsed.find(
      (r) => r.question_number === q.question_number
    );
    if (!result) {
      return {
        transcribed_text: "",
        score: 0,
        feedback: "לא נמצאה תשובה לשאלה זו",
        ai_reasoning: "No answer found for this question in the submission",
      };
    }
    return {
      transcribed_text: result.transcribed_text,
      score: Math.min(result.score, q.max_points),
      feedback: result.feedback,
      ai_reasoning: result.ai_reasoning,
    };
  });
}
