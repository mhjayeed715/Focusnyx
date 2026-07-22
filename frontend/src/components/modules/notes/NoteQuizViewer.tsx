"use client";

import React, { useState } from "react";
import { CheckCircle2, XCircle, HelpCircle, Award, Eye, EyeOff, Sparkles, RefreshCw } from "lucide-react";

export type McqQuestion = {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type ShortBroadQuestion = {
  id: number;
  question: string;
  answer: string;
};

export type QuizData = {
  type: "mcq" | "short" | "broad";
  count: number;
  mcqQuestions?: McqQuestion[];
  qaQuestions?: ShortBroadQuestion[];
  rawText?: string;
};

interface NoteQuizViewerProps {
  quizData: QuizData;
  onRetake?: () => void;
}

export function NoteQuizViewer({ quizData, onRetake }: NoteQuizViewerProps) {
  // State for MCQ selections: questionId -> selectedOptionIndex
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  // State for Short/Broad answer reveals: questionId -> boolean
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});

  const handleSelectOption = (questionId: number, optionIdx: number) => {
    // Lock answer after first selection
    if (selectedAnswers[questionId] !== undefined) return;
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
  };

  const toggleRevealAnswer = (questionId: number) => {
    setRevealedAnswers((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  if (quizData.type === "mcq" && quizData.mcqQuestions && quizData.mcqQuestions.length > 0) {
    const totalCount = quizData.mcqQuestions.length;
    const answeredCount = Object.keys(selectedAnswers).length;
    const correctCount = quizData.mcqQuestions.filter(
      (q) => selectedAnswers[q.id] === q.correctIndex
    ).length;

    return (
      <div className="mt-4 space-y-5 rounded-[22px] border-2 border-[#1E293B] bg-[#FFF9E6] p-5 shadow-[4px_4px_0_0_#1E293B]">
        {/* Header & Live Score Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[#1E293B] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-600" />
              <h4 className="font-display text-lg font-black text-[#1E293B]">Interactive MCQ Practice</h4>
            </div>
            <p className="text-xs font-semibold text-[var(--muted-fg)]">
              Select an answer for each question to view feedback.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hard-chip bg-white px-3 py-1 text-xs font-black">
              Score: {correctCount} / {totalCount}
            </span>
            {onRetake && (
              <button
                onClick={onRetake}
                className="flex items-center gap-1.5 rounded-full border-2 border-[#1E293B] bg-white px-3 py-1 text-xs font-bold shadow-[2px_2px_0_0_#1E293B] hover:bg-slate-50"
              >
                <RefreshCw size={12} /> Config
              </button>
            )}
          </div>
        </div>

        {/* MCQ Questions List */}
        <div className="space-y-6">
          {quizData.mcqQuestions.map((q, qIndex) => {
            const userSelected = selectedAnswers[q.id];
            const isAnswered = userSelected !== undefined;
            const isCorrect = userSelected === q.correctIndex;

            return (
              <div
                key={q.id || qIndex}
                className="space-y-3 rounded-2xl border-2 border-[#1E293B] bg-white p-4 shadow-[3px_3px_0_0_#1E293B]"
              >
                <p className="font-display font-black text-sm text-[#1E293B] flex items-start gap-2">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#1E293B] text-[11px] font-black text-white">
                    {qIndex + 1}
                  </span>
                  {q.question}
                </p>

                {/* Option Pills */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = userSelected === optIdx;
                    const isTrueCorrect = optIdx === q.correctIndex;

                    let btnClass = "border-[#1E293B] bg-white text-[#1E293B] hover:bg-slate-50";

                    if (isAnswered) {
                      if (isTrueCorrect) {
                        // Green for correct option
                        btnClass = "border-emerald-700 bg-[#ECFDF5] text-emerald-900 font-extrabold shadow-[2px_2px_0_0_#059669]";
                      } else if (isSelected && !isCorrect) {
                        // Red for wrong selected option
                        btnClass = "border-rose-600 bg-rose-50 text-rose-900 font-extrabold shadow-[2px_2px_0_0_#E11D48]";
                      } else {
                        btnClass = "border-slate-300 bg-slate-50 text-slate-400 opacity-60";
                      }
                    }

                    return (
                      <button
                        key={optIdx}
                        disabled={isAnswered}
                        onClick={() => handleSelectOption(q.id, optIdx)}
                        className={`flex items-center justify-between rounded-xl border-2 px-3.5 py-2.5 text-xs text-left transition-all ${btnClass}`}
                      >
                        <span className="font-semibold">{opt}</span>
                        {isAnswered && isTrueCorrect && (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                        )}
                        {isAnswered && isSelected && !isCorrect && (
                          <XCircle className="h-4 w-4 shrink-0 text-rose-600" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Feedback & Explanation Box */}
                {isAnswered && (
                  <div
                    className={`mt-2 rounded-xl border-2 p-3 text-xs font-semibold ${
                      isCorrect
                        ? "border-emerald-600 bg-[#ECFDF5] text-emerald-900"
                        : "border-rose-400 bg-rose-50 text-rose-900"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-black uppercase text-[11px] mb-1">
                      {isCorrect ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Correct!
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-rose-600" /> Incorrect
                        </>
                      )}
                    </div>
                    {q.explanation && <p className="leading-relaxed">{q.explanation}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Render Short / Broad Q&A Mode
  if (quizData.qaQuestions && quizData.qaQuestions.length > 0) {
    return (
      <div className="mt-4 space-y-4 rounded-[22px] border-2 border-[#1E293B] bg-[#F5F3FF] p-5 shadow-[4px_4px_0_0_#1E293B]">
        <div className="flex items-center justify-between border-b-2 border-[#1E293B] pb-3">
          <div>
            <h4 className="font-display text-lg font-black text-[#1E293B] capitalize">
              {quizData.type === "broad" ? "Broad / Essay Questions" : "Short Answer Questions"}
            </h4>
            <p className="text-xs font-semibold text-[var(--muted-fg)]">
              Test your memory and click to reveal detailed answers.
            </p>
          </div>
          {onRetake && (
            <button
              onClick={onRetake}
              className="flex items-center gap-1.5 rounded-full border-2 border-[#1E293B] bg-white px-3 py-1 text-xs font-bold shadow-[2px_2px_0_0_#1E293B] hover:bg-slate-50"
            >
              <RefreshCw size={12} /> Config
            </button>
          )}
        </div>

        <div className="space-y-4">
          {quizData.qaQuestions.map((q, idx) => {
            const isRevealed = Boolean(revealedAnswers[q.id]);
            return (
              <div
                key={q.id || idx}
                className="rounded-2xl border-2 border-[#1E293B] bg-white p-4 shadow-[3px_3px_0_0_#1E293B] space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-display font-black text-sm text-[#1E293B] flex items-start gap-2">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#8B5CF6] text-[11px] font-black text-white">
                      {idx + 1}
                    </span>
                    {q.question}
                  </p>
                  <button
                    onClick={() => toggleRevealAnswer(q.id)}
                    className="flex shrink-0 items-center gap-1 rounded-full border-2 border-[#1E293B] bg-[#FFF7D6] px-3 py-1 text-xs font-black shadow-[2px_2px_0_0_#1E293B]"
                  >
                    {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                    {isRevealed ? "Hide" : "Answer"}
                  </button>
                </div>

                {isRevealed && (
                  <div className="rounded-xl border-2 border-[#1E293B] bg-[#FAF5FF] p-3 text-xs leading-relaxed font-semibold text-purple-950">
                    <span className="font-black text-purple-800 uppercase block mb-1">Answer / Key Points:</span>
                    {q.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Fallback if raw text returned
  return (
    <div className="mt-4 rounded-2xl border-2 border-[#1E293B] bg-white p-4 shadow-[4px_4px_0_0_#1E293B]">
      <pre className="whitespace-pre-wrap font-sans text-xs font-semibold">{quizData.rawText}</pre>
    </div>
  );
}
