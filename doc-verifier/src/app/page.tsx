"use client";

import { useCallback, useMemo, useState } from "react";
import type { AnalysisResponse } from "@/lib/types";

const visaTypes = [
  { value: "tourist", label: "Tourist" },
  { value: "business", label: "Business" },
  { value: "student", label: "Student" },
  { value: "transit", label: "Transit" },
  { value: "work-short-term", label: "Short-Term Work" },
];

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-50";

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applicant, setApplicant] = useState({
    fullName: "",
    dateOfBirth: "",
    passportNumber: "",
    nationality: "",
    visaType: visaTypes[0]?.value ?? "tourist",
  });

  const handleFilesChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    setFiles(Array.from(event.target.files));
  }, []);

  const resetState = useCallback(() => {
    setAnalysis(null);
    setError(null);
  }, []);

  const handleApplicantChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name } = event.target;
      let { value } = event.target;
      if (name === "nationality") {
        value = value.toUpperCase().slice(0, 3);
      }
      if (name === "passportNumber") {
        value = value.toUpperCase();
      }
      resetState();
      setApplicant((current) => ({
        ...current,
        [name]: value,
      }));
    },
    [resetState]
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setIsSubmitting(true);
      setError(null);
      setAnalysis(null);

      try {
        const formData = new FormData();
        files.forEach((file) => formData.append("files", file));
        formData.append("applicant", JSON.stringify(applicant));

        const response = await fetch("/api/analyze", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const payload = await response.json();
          throw new Error(payload.error ?? "Request failed");
        }

        const payload = (await response.json()) as AnalysisResponse;
        setAnalysis(payload);
      } catch (submissionError) {
        setError((submissionError as Error).message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [applicant, files]
  );

  const jsonResult = useMemo(() => {
    if (!analysis) return "";
    return JSON.stringify(analysis, null, 2);
  }, [analysis]);

  return (
    <div className="min-h-screen bg-slate-950 bg-gradient-to-br from-slate-900 via-slate-950 to-black p-6 text-slate-100">
      <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-[360px,1fr]">
        <aside className="rounded-2xl border border-white/5 bg-white/5 p-6 shadow-2xl backdrop-blur">
          <h1 className="text-lg font-semibold text-white">Document Verifier</h1>
          <p className="mt-2 text-sm text-slate-300">
            Upload passport, visa, or government ID images for automated OCR, MRZ validation, and visa eligibility assessment.
          </p>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-200">
                Applicant Full Name
              </label>
              <input
                className={inputClass}
                name="fullName"
                value={applicant.fullName}
                onChange={handleApplicantChange}
                placeholder="Jane Doe"
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-200">
                  Date of Birth
                </label>
                <input
                  className={inputClass}
                  name="dateOfBirth"
                  type="date"
                  value={applicant.dateOfBirth}
                  onChange={handleApplicantChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-200">
                  Nationality (ISO-3)
                </label>
                <input
                  className={inputClass}
                  name="nationality"
                  value={applicant.nationality}
                  onChange={handleApplicantChange}
                  placeholder="USA"
                  maxLength={3}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-200">
                Passport Number
              </label>
              <input
                className={inputClass}
                name="passportNumber"
                value={applicant.passportNumber}
                onChange={handleApplicantChange}
                placeholder="123456789"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-200">
                Intended Visa Type
              </label>
              <select
                className={inputClass}
                name="visaType"
                value={applicant.visaType}
                onChange={handleApplicantChange}
              >
                {visaTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-200">
                Document Images
              </label>
              <input
                className="block w-full cursor-pointer rounded-md border border-dashed border-slate-600 bg-black/20 px-3 py-2 text-sm focus:outline-none"
                type="file"
                accept="image/*"
                onChange={handleFilesChange}
                multiple
                required
              />
              {files.length > 0 && (
                <p className="text-xs text-slate-400">
                  {files.length} file{files.length > 1 ? "s" : ""} ready for analysis.
                </p>
              )}
            </div>
            <button
              className="w-full rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:opacity-60"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Analyzing..." : "Run Verification"}
            </button>
            {error && (
              <p className="rounded-md bg-red-500/20 px-3 py-2 text-xs text-red-200">
                {error}
              </p>
            )}
          </form>
        </aside>
        <section className="rounded-2xl border border-white/5 bg-black/60 p-6 shadow-2xl backdrop-blur">
          {!analysis && !error && (
            <div className="flex h-full items-center justify-center text-center text-sm text-slate-400">
              <p>Submit documents to generate a structured verification report.</p>
            </div>
          )}
          {analysis && (
            <div className="space-y-6">
              <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4">
                <p className="text-sm font-semibold text-sky-200">Summary</p>
                <p className="mt-1 text-sm text-sky-50">{analysis.summary.text}</p>
                <ul className="mt-3 space-y-1 text-xs text-slate-200">
                  {analysis.summary.highlights.map((highlight) => (
                    <li key={highlight} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400" aria-hidden />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-100">
                  Validation Checks
                </h2>
                <ul className="mt-2 grid gap-2 text-xs text-slate-200">
                  {analysis.validations.map((validation) => (
                    <li
                      key={`${validation.rule}-${validation.status}-${validation.details}`}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                    >
                      <div className="flex items-center justify-between text-[11px] uppercase tracking-wide">
                        <span className="font-semibold text-slate-300">
                          {validation.rule.replace(/_/g, " ")}
                        </span>
                        <span
                          className={
                            validation.status === "pass"
                              ? "text-emerald-400"
                              : validation.status === "fail"
                              ? "text-red-400"
                              : "text-amber-300"
                          }
                        >
                          {validation.status}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-200">{validation.details}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-100">Eligibility</h2>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                      analysis.eligibility.status === "eligible"
                        ? "bg-emerald-500/20 text-emerald-200"
                        : analysis.eligibility.status === "ineligible"
                        ? "bg-red-500/20 text-red-200"
                        : "bg-amber-500/20 text-amber-200"
                    }`}
                  >
                    {analysis.eligibility.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-300">
                  Visa Type: <span className="font-medium text-slate-100">{analysis.eligibility.visaType}</span>
                </p>
                {analysis.eligibility.reasons.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-slate-200">
                    {analysis.eligibility.reasons.map((reason) => (
                      <li key={reason} className="flex gap-2">
                        <span className="h-1.5 w-1.5 translate-y-1 rounded-full bg-slate-400" aria-hidden />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-100">Structured Output</h2>
                <pre className="mt-2 max-h-[360px] overflow-auto rounded-xl border border-white/10 bg-black/50 p-4 text-[11px] leading-relaxed text-slate-200">
{jsonResult}
                </pre>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
