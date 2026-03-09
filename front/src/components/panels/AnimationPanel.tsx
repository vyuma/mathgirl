"use client";

import { useAnimationStore, type AnimationJob } from "@/stores/animationStore";

function JobCard({ job }: { job: AnimationJob }) {
  if (job.status === "generating") {
    return (
      <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-4 space-y-3">
        <p className="text-sm font-medium text-teal-800">{job.description}</p>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-teal-600">
            <span>{job.currentStep || "準備中..."}</span>
            <span>{Math.round(job.progress)}%</span>
          </div>
          <div className="h-2 rounded-full bg-teal-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-teal-500 transition-all duration-500"
              style={{ width: `${job.progress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (job.status === "completed" && job.videoUrl) {
    return (
      <div className="rounded-xl border border-teal-200 bg-white/80 p-3 space-y-2">
        <p className="text-sm font-medium text-teal-800">{job.description}</p>
        <video
          src={job.videoUrl}
          controls
          autoPlay
          loop
          className="w-full rounded-lg"
        />
        <p className="text-xs text-gray-400">
          generation_id: {job.generationId} / video_id: {job.videoId}
        </p>
      </div>
    );
  }

  if (job.status === "failed") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 space-y-1">
        <p className="text-sm font-medium text-red-800">{job.description}</p>
        <p className="text-xs text-red-600">{job.error}</p>
      </div>
    );
  }

  return null;
}

export default function AnimationPanel() {
  const { jobs } = useAnimationStore();

  if (jobs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        まだアニメーションがありません
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  );
}
