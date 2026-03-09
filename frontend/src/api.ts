/*
API Client

This file defines all frontend API helper functions used to communicate
with the backend assessment service.

Responsibilities:
1. Start a new assessment session.
2. Submit answers to questions during an assessment.
3. Retrieve the final capability report.
4. Fetch previous assessments for a user.

All functions use axios to communicate with the backend REST API.
*/

import axios from 'axios';
import type { AssessmentSession, CapabilityReport, Role, ExperienceLevel } from './types';
import type { AnswerResponse } from './types';

/*
Base URL for the backend API.

Uses the environment variable VITE_API_BASE_URL if available.
Falls back to localhost during local development.
*/
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';


/*
Start a new assessment session.

Parameters:
- userId: identifier of the user starting the assessment
- role: target role for the simulation
- level: experience level (beginner / intermediate / senior)

Returns:
- AssessmentSession object containing sessionId and first question.
*/
export async function startAssessment(params: {
  userId: string;
  role: Role;
  level: ExperienceLevel;
}): Promise<AssessmentSession> {

  const res = await axios.post(`${API_BASE_URL}/assessment/start`, params);

  return res.data;

}


/*
Submit an answer for the current assessment question.

Parameters:
- sessionId: active assessment session ID
- questionId: ID of the question being answered
- answer: candidate's answer text
- startedAtIso: timestamp when the question was shown
- endedAtIso: timestamp when the answer was submitted

Returns:
- AnswerResponse containing evaluation feedback and the next question.
*/
export async function submitAnswer(params: {
  sessionId: string;
  questionId: string;
  answer: string;
  startedAtIso: string;
  endedAtIso: string;
}): Promise<AnswerResponse> {

  /*
  sessionId is removed from the request body and instead placed
  in the URL path to match the backend API route.
  */
  const { sessionId, ...bodyData } = params;

  const res = await axios.post(
    `${API_BASE_URL}/assessment/${sessionId}/answer`,
    bodyData
  );

  return res.data;

}


/*
Fetch the final capability report for a completed assessment.

Parameters:
- sessionId: ID of the assessment session

Returns:
- CapabilityReport containing skill scores, readiness score,
  strengths, weaknesses, and learning recommendations.
*/
export async function fetchReport(sessionId: string): Promise<CapabilityReport> {

  const res = await axios.get(`${API_BASE_URL}/assessment/${sessionId}/report`);

  return res.data;

}


/*
Fetch all assessments previously created by a user.

Parameters:
- userId: identifier of the user

Returns:
- List of AssessmentSession objects representing past or
  in-progress assessments.
*/
export async function fetchUserAssessments(userId: string): Promise<AssessmentSession[]> {

  const res = await axios.get(`${API_BASE_URL}/users/${userId}/assessments`);

  return res.data;

}