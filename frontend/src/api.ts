import axios from 'axios';
import type { AssessmentSession, CapabilityReport, Role, ExperienceLevel } from './types';
import type { AnswerResponse } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export async function startAssessment(params: {
  userId: string;
  role: Role;
  level: ExperienceLevel;
}): Promise<AssessmentSession> {
  const res = await axios.post(`${API_BASE_URL}/assessment/start`, params);
  return res.data;
}

export async function submitAnswer(params: {
  sessionId: string;
  questionId: string;
  answer: string;
  startedAtIso: string;
  endedAtIso: string;
}): Promise<AnswerResponse> {
  const { sessionId, ...bodyData } = params;
  const res = await axios.post(
    `${API_BASE_URL}/assessment/${sessionId}/answer`,
    bodyData
  );
  return res.data;
}

export async function fetchReport(sessionId: string): Promise<CapabilityReport> {
  const res = await axios.get(`${API_BASE_URL}/assessment/${sessionId}/report`);
  return res.data;
}

export async function fetchUserAssessments(userId: string): Promise<AssessmentSession[]> {
  const res = await axios.get(`${API_BASE_URL}/users/${userId}/assessments`);
  return res.data;
}
