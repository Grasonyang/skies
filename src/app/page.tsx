import MapComponent from '@/components/map';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold text-center mb-8">Google Map</h1>
      <MapComponent />
    </main>
  );
}
