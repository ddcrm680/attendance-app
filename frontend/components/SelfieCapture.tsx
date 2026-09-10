"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  title: string;
  submitting?: boolean;
  onConfirm: (photo: File) => Promise<void>;
  onCancel: () => void;
};

export default function SelfieCapture({
  title,
  submitting = false,
  onConfirm,
  onCancel,
}: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const cameraRequest = useRef(0);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState(true);

  const stopCamera = () => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  };
  const openCamera = async () => {
    const requestId = ++cameraRequest.current;
    setError(null);
    setOpening(true);
    setPhoto(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "Camera is unavailable on this browser. Attendance cannot be marked without a selfie.",
      );
      setOpening(false);
      return;
    }
    try {
      stopCamera();
      const nextStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 1280 },
        },
        audio: false,
      });
      if (cameraRequest.current !== requestId) {
        nextStream.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = nextStream;
      if (video.current) {
        video.current.srcObject = nextStream;
        await video.current.play();
      }
    } catch (cause) {
      if (cameraRequest.current === requestId) {
        setError(
          cause instanceof DOMException && cause.name === "NotAllowedError"
            ? "Camera permission was denied. Allow camera access to take a selfie."
            : "Unable to open the camera. Check that no other app is using it.",
        );
      }
    } finally {
      if (cameraRequest.current === requestId) setOpening(false);
    }
  };

  useEffect(() => {
    openCamera();
    return () => {
      cameraRequest.current += 1;
      stopCamera();
      if (preview) URL.revokeObjectURL(preview);
    };
  }, []); // Fresh stream per punch.
  const capture = () => {
    const element = video.current;
    if (!element || !element.videoWidth)
      return setError("The camera is not ready yet.");
    cameraRequest.current += 1;
    const canvas = document.createElement("canvas");
    canvas.width = element.videoWidth;
    canvas.height = element.videoHeight;
    canvas.getContext("2d")?.drawImage(element, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob)
          return setError("Could not capture the selfie. Please retake it.");
        const file = new File([blob], "attendance-selfie.jpg", {
          type: "image/jpeg",
        });
        setPhoto(file);
        setPreview(URL.createObjectURL(file));
        stopCamera();
      },
      "image/jpeg",
      0.9,
    );
  };
  const cancel = () => {
    cameraRequest.current += 1;
    stopCamera();
    if (preview) URL.revokeObjectURL(preview);
    onCancel();
  };
  const confirm = async () => {
    if (!photo) return;
    try {
      await onConfirm(photo);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Selfie upload failed. Please try again.",
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/70 p-0 sm:items-center sm:justify-center sm:p-6">
      <section
        className="app-surface w-full max-w-lg rounded-t-[1.5rem] border border-[var(--line)] p-4 shadow-2xl sm:rounded-[1.5rem] sm:p-6"
        aria-label={`${title} selfie camera`}
      >
        <div className="mb-3 flex items-center justify-between">
          <div><p className="app-eyebrow mb-1">Verified attendance</p><h2 className="font-semibold">{title}: take a fresh selfie</h2></div>
          <button
            onClick={cancel}
            disabled={submitting}
            className="app-secondary-action min-h-9 px-3 text-sm"
          >
            Cancel
          </button>
        </div>
        {error && (
          <p
            role="alert"
            className="app-feedback app-feedback-error mb-3"
          >
            {error}
          </p>
        )}
        {preview ? (
          <img
            src={preview}
            alt="Selfie preview"
            className="aspect-square w-full rounded-xl object-cover"
          />
        ) : (
          <video
            ref={video}
            muted
            playsInline
            className="aspect-square w-full rounded-xl bg-black object-cover"
          />
        )}
        <p className="my-3 text-center text-sm text-gray-600">
          {preview
            ? "Review your selfie before submitting."
            : opening
              ? "Opening your camera…"
              : "Position your face in the frame, then capture."}
        </p>
        {preview ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={openCamera}
              disabled={submitting}
              className="app-secondary-action rounded-xl py-3 text-sm"
            >
              Retake
            </button>
            <button
              onClick={confirm}
              disabled={!photo || submitting}
              className="app-primary-action rounded-xl py-3 text-sm font-medium disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Confirm selfie"}
            </button>
          </div>
        ) : (
          <button
            onClick={capture}
            disabled={opening || !!error}
            className="app-primary-action w-full rounded-xl py-3 text-sm font-medium disabled:opacity-50"
          >
            Take selfie
          </button>
        )}
      </section>
    </div>
  );
}
