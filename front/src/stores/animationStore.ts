import { create } from "zustand";

export type AnimationJob = {
  id: string; // job_id
  generationId: number;
  description: string;
  status: "generating" | "completed" | "failed";
  progress: number;
  currentStep: string;
  videoId: string | null;
  videoUrl: string | null;
  error: string | null;
};

interface AnimationState {
  jobs: AnimationJob[];
  startJob: (jobId: string, generationId: number, description: string) => void;
  updateProgress: (jobId: string, progress: number, currentStep: string) => void;
  completeJob: (
    jobId: string,
    generationId: number,
    videoId: string,
    videoUrl: string,
  ) => void;
  failJob: (jobId: string, error: string) => void;
  removeJob: (jobId: string) => void;
}

export const useAnimationStore = create<AnimationState>((set) => ({
  jobs: [],

  startJob: (jobId, generationId, description) =>
    set((state) => ({
      jobs: [
        ...state.jobs,
        {
          id: jobId,
          generationId,
          description,
          status: "generating",
          progress: 0,
          currentStep: "",
          videoId: null,
          videoUrl: null,
          error: null,
        },
      ],
    })),

  updateProgress: (jobId, progress, currentStep) =>
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === jobId ? { ...j, progress, currentStep } : j,
      ),
    })),

  completeJob: (jobId, generationId, videoId, videoUrl) =>
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === jobId
          ? {
              ...j,
              status: "completed" as const,
              progress: 100,
              generationId,
              videoId,
              videoUrl,
            }
          : j,
      ),
    })),

  failJob: (jobId, error) =>
    set((state) => {
      const normalizedJobId =
        jobId && jobId.trim().length > 0
          ? jobId
          : `animation_error_${Date.now()}`;

      const hasTarget = state.jobs.some((j) => j.id === normalizedJobId);
      if (hasTarget) {
        return {
          jobs: state.jobs.map((j) =>
            j.id === normalizedJobId
              ? { ...j, status: "failed" as const, error }
              : j,
          ),
        };
      }

      return {
        jobs: [
          {
            id: normalizedJobId,
            generationId: 0,
            description: "アニメーション生成",
            status: "failed",
            progress: 0,
            currentStep: "",
            videoId: null,
            videoUrl: null,
            error,
          },
          ...state.jobs,
        ],
      };
    }),

  removeJob: (jobId) =>
    set((state) => ({
      jobs: state.jobs.filter((j) => j.id !== jobId),
    })),
}));
