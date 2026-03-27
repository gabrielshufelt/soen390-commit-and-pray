export const fetchOutdoorRoute = async (
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number },
  mode: string,
  apiKey: string
) => {
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${start.latitude},${start.longitude}&destination=${end.latitude},${end.longitude}&mode=${mode.toLowerCase()}&key=${apiKey}`;
  
  const response = await fetch(url).catch((err) => {
    throw new Error(`fetchOutdoorRoute: network failure — ${err.message}`);
  });
  const data = await response.json();

  if (data.status !== "OK") {
    throw new Error(`Google Maps API Error: ${data.status}`);
  }

  const leg = data.routes?.[0]?.legs?.[0];
  if (!leg) throw new Error("Google Maps returned no routes");

  return leg.steps.map((s: any) => ({
    instruction: s.html_instructions,
    distance: s.distance.text,
    source: "outdoor",
    maneuver: s.maneuver || "straight",
    coordinates: { latitude: s.start_location.lat, longitude: s.start_location.lng }
  }));
};