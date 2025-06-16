"use client";
import React from "react";

export default function CanvasPage({ params }: { params: Promise<{ roomId: string }> }) {
    const { roomId } = React.use(params);

    if (!roomId) return <p>Loading...</p>;

    return <RoomCanvas roomId={roomId} />;
}