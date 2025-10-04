"use client";
import React from "react";
import { APIProvider, Map, MapCameraChangedEvent } from "@vis.gl/react-google-maps";

const MapComponent = () => {
  const position = { lat: 38.7946, lng: -106.5348 };

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY} onLoad={() => console.log('Maps API has loaded.')}>
       <Map
          defaultZoom={13}
          defaultCenter={ { lat: -33.860664, lng: 151.208138 } }
          onCameraChanged={ (ev: MapCameraChangedEvent) =>
            console.log('camera changed:', ev.detail.center, 'zoom:', ev.detail.zoom)
          }>
      </Map>
    </APIProvider>
  );
};

export default MapComponent;
