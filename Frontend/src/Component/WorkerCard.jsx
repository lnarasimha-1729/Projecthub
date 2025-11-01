import React, { useEffect, useState } from "react";

function WorkerCard({ worker }) {
  const [locationName, setLocationName] = useState("");

  useEffect(() => {
    if (worker.location?.latitude && worker.location?.longitude) {
      getAccurateOSMLocation(worker.location.latitude, worker.location.longitude)
        .then(setLocationName)
        .catch(() => setLocationName("Unknown Location"));
    }
  }, [worker]);

  const getAccurateOSMLocation = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`
      );
      const data = await response.json();

      if (!data.address) return "Unknown Location";

      const address = data.address;

      // Extract accurate parts
      const area =
        address.neighbourhood ||
        address.suburb ||
        address.village ||
        address.town ||
        address.locality ||
        address.hamlet;

      const city =
        address.city ||
        address.municipality ||
        address.county ||
        address.district ||
        address.state_district;

      const state = address.state;

      // Return clean formatted location
      return [area, city, state].filter(Boolean).join(", ");
    } catch (err) {
      console.error("Error fetching location:", err);
      return "Unknown Location";
    }
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow hover:shadow-md transition">

      {locationName ? (
        <div className="text-sm text-blue-700 mt-1">📍 {locationName}</div>
      ) : (
        <div className="text-sm text-gray-400 mt-1">Fetching location...</div>
      )}
    </div>
  );
}

export default WorkerCard;
