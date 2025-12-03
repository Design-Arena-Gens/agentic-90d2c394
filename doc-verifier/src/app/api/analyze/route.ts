import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeDocuments } from "@/lib/analysis";
import { defaultEligibilityPolicy } from "@/lib/policy";
import type { EligibilityPolicy } from "@/lib/types";

export const runtime = "nodejs";

const applicantSchema = z.object({
  fullName: z.string().min(1),
  dateOfBirth: z.string().min(1),
  passportNumber: z.string().min(1),
  nationality: z.string().min(1),
  visaType: z.string().min(1),
});

const policySchema = z
  .object({
    version: z.string().optional(),
    minimumPassportValidityMonths: z.number().min(0).optional(),
    allowedVisaTypes: z.array(z.string()).optional(),
    restrictedNationalities: z.array(z.string()).optional(),
    minimumApplicantAge: z.number().min(0).optional(),
  })
  .optional();

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const applicantPayload = formData.get("applicant");
    const policyPayload = formData.get("policy");
    const files = formData.getAll("files");

    if (!applicantPayload) {
      return NextResponse.json(
        { error: "Missing applicant payload" },
        { status: 400 }
      );
    }

    if (!files.length) {
      return NextResponse.json(
        { error: "At least one document image is required" },
        { status: 400 }
      );
    }

    const applicant = applicantSchema.parse(JSON.parse(String(applicantPayload)));
    let policy: EligibilityPolicy = defaultEligibilityPolicy;

    if (policyPayload) {
      const parsedPolicy = policySchema.parse(JSON.parse(String(policyPayload)));
      if (parsedPolicy) {
        policy = {
          ...defaultEligibilityPolicy,
          ...parsedPolicy,
          restrictedNationalities:
            parsedPolicy.restrictedNationalities?.map((n) => n.toLowerCase()) ??
            defaultEligibilityPolicy.restrictedNationalities,
        };
      }
    }

    const buffers = await Promise.all(
      files
        .filter((file): file is File => file instanceof File)
        .map(async (file) => {
          const arrayBuffer = await file.arrayBuffer();
          return Buffer.from(arrayBuffer);
        })
    );

    const analysis = await analyzeDocuments(buffers, applicant, policy);
    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Analysis error", error);
    return NextResponse.json(
      { error: "Failed to analyse document", details: (error as Error).message },
      { status: 500 }
    );
  }
}
