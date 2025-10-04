"use client";
import React from "react";
import { APIProvider, Map } from "@vis.gl/react-google-maps";

const MapComponent = () => {
  const position = { lat: 38.7946, lng: -106.5348 };

  return (
    <APIProvider apiKey="AIzaSyAP55TtaAsZcw-v5MEdn_4lcBUQ9F3vlR0">
      <div style={{ height: "400px" }}>
        <Map zoom={4} center={position} />
      </div>
    </APIProvider>
  );
};

export default MapComponent;
