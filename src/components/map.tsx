"use client";
import React from "react";
import { APIProvider, Map, MapCameraChangedEvent } from "@vis.gl/react-google-maps";

const MapComponent = () => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>
        <p>Google Maps API key is not configured. Please set the NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable.</p>
      </div>
    )
  }

  return (
    <APIProvider
     apiKey={apiKey}
     onLoad={() => console.log('Maps API has loaded.')}
   >
     <div style={{ height: "100vh", width: "100%" }}>
       <Map
           defaultZoom={13}
           defaultCenter={ { lng: 120.9417, lat: 24.23321 } }
           onCameraChanged={ (ev: MapCameraChangedEvent) =>
             console.log('camera changed:', ev.detail.center, 'zoom:', ev.detail.zoom)
           }>
       </Map>
     </div>
   </APIProvider>
 );
};

export default MapComponent;
