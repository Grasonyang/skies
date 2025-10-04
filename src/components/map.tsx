"use client";
import React from "react";
import { APIProvider, Map } from "@vis.gl/react-google-maps";

const MapComponent = () => {
  const position = { lat: 38.7946, lng: -106.5348 };

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}>
      <div style={{ height: "400px" }}>
        <Map zoom={4} center={position} />
      </div>
    </APIProvider>
  );
};

export default MapComponent;
