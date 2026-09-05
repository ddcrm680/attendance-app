"use client";
import { useEffect, useState } from "react";
export default function SecureAttendancePhoto({
  attendanceId,
  punch,
  alt,
}: {
  attendanceId: number;
  punch: "check_in" | "check_out";
  alt: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    const token = localStorage.getItem("attendance_token");
    let url: string | null = null;
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api"}/attendance/${attendanceId}/photos/${punch}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    )
      .then((r) => (r.ok ? r.blob() : Promise.reject()))
      .then((b) => {
        url = URL.createObjectURL(b);
        setSrc(url);
      })
      .catch(() => setSrc(null));
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [attendanceId, punch]);
  return src ? (
    <img
      className="aspect-square rounded-xl object-cover"
      alt={alt}
      src={src}
    />
  ) : (
    <div className="aspect-square rounded-xl bg-gray-100 p-3 text-xs text-gray-500">
      Photo unavailable
    </div>
  );
}
