import axios, { AxiosError } from 'axios';
import { router } from 'expo-router';
import type {
  Category,
  CreateReportDto,
  MediaConfirmRequest,
  MediaConfirmResponse,
  MediaInitRequest,
  MediaInitResponse,
  PaginatedReportsResponse,
  Report,
} from '@urbanreport/types';
import { API_URL } from '@/constants/config';
import { useAuthStore } from '@/stores/authStore';

interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
}

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

apiClient.interceptors.request.use((request) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    request.headers.Authorization = ['Bearer', token].join(' ');
  }

  return request;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ProblemDetails>) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth();
      router.replace('/(auth)/login');
    }

    return await Promise.reject(error);
  },
);

export const api = {
  async fetchReports(params?: { userId?: string }): Promise<PaginatedReportsResponse> {
    const response = await apiClient.get<PaginatedReportsResponse>('/reports', { params });
    return response.data;
  },

  async fetchReportById(id: string): Promise<Report> {
    const response = await apiClient.get<Report>(`/reports/${id}`);
    return response.data;
  },

  async createReport(payload: CreateReportDto): Promise<Report> {
    const response = await apiClient.post<Report>('/reports', payload);
    return response.data;
  },

  async confirmReport(id: string): Promise<Report> {
    const response = await apiClient.post<Report>(`/reports/${id}/confirm`);
    return response.data;
  },

  async fetchCategories(): Promise<Category[]> {
    const response = await apiClient.get<Category[]>('/categories');
    return response.data;
  },

  async initMediaUpload(payload: MediaInitRequest): Promise<MediaInitResponse> {
    const response = await apiClient.post<MediaInitResponse>('/media/init', payload);
    return response.data;
  },

  async confirmMediaUpload(payload: MediaConfirmRequest): Promise<MediaConfirmResponse> {
    const response = await apiClient.post<MediaConfirmResponse>('/media/confirm', payload);
    return response.data;
  },
};
