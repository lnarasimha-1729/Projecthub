import React, { useEffect, useState } from "react";

function WorkerCard({ worker }) {
  const [locationName, setLocationName] = useState("");

  // 👇 This effect runs only when worker location changes
  useEffect(() => {
    if (worker?.location?.latitude && worker?.location?.longitude) {
      console.log("Worker location:", worker.location); // Debug check

      getReadableLocation(worker.location.latitude, worker.location.longitude)
        .then((loc) => {
          console.log("Fetched location:", loc);
          setLocationName(loc);
        })
        .catch((err) => {
          console.error("Error in getReadableLocation:", err);
          setLocationName("Unknown Location");
        });
    } else {
      console.warn("No valid location data for worker:", worker);
    }
  }, [worker?.location?.latitude, worker?.location?.longitude]);

  // 👇 Add this helper function INSIDE WorkerCard
  const getReadableLocation = async (latitude, longitude) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
        {
          headers: {
            "User-Agent": "WorkerApp/1.0 (youremail@example.com)",
          },
        }
      );
      const data = await res.json();

      if (!data.address) return "Unknown location";

      const addr = data.address;
      return [
        addr.suburb || addr.village || addr.town || addr.locality || addr.neighbourhood,
        addr.city || addr.county,
        addr.state,
      ]
        .filter(Boolean)
        .join(", ");
    } catch (err) {
      console.error("Error fetching location:", err);
      return "Unknown location";
    }
  };

  // 👇 UI
  return (
    <div className="bg-white p-4 rounded-xl shadow hover:shadow-md transition">
      <h3 className="text-lg font-semibold">{worker.Name}</h3>
      <p className="text-sm text-gray-500">{worker.Role}</p>

      {locationName ? (
        <div className="text-sm text-blue-700 mt-1">📍 {locationName}</div>
      ) : (
        <div className="text-sm text-gray-400 mt-1">Fetching location...</div>
      )}
    </div>
  );
}

export default WorkerCard;
