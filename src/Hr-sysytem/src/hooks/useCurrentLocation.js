  import { useState, useCallback } from 'react';

/**
 * Custom hook to securely fetch and reverse geocode the user's current location.
 * Implements high accuracy, retry logic, and fallback for Nominatim OpenStreetMap.
 */
export const useCurrentLocation = () => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getReverseGeocoding = async (lat, lon) => {
    try {
      // Use LocationIQ for detailed street-level geocoding
      const response = await fetch(
        `https://us1.locationiq.com/v1/reverse?key=pk.a51ce64854c596ad67f87f875cb09070&lat=${lat}&lon=${lon}&format=json`
      );
      if (!response.ok) throw new Error('Geocoding network error');
      
      const data = await response.json();
      const addr = data.address || {};
      
      // Construct a clean address avoiding weird POIs (Points of Interest)
      const addressParts = [];
      if (addr.house_number) addressParts.push(addr.house_number);
      if (addr.road) addressParts.push(addr.road);
      if (addr.neighbourhood) addressParts.push(addr.neighbourhood);
      if (addr.suburb) addressParts.push(addr.suburb);
      if (addr.city || addr.town || addr.village) addressParts.push(addr.city || addr.town || addr.village);
      if (addr.state) addressParts.push(addr.state);
      if (addr.postcode) addressParts.push(addr.postcode);
      if (addr.country) addressParts.push(addr.country);
      
      const addressStr = addressParts.length > 0 ? addressParts.join(', ') : (data.display_name || 'Address not found');
      
      return {
        address: addressStr,
        city: addr.city || addr.town || addr.village || '',
        state: addr.state || '',
        country: addr.country || '',
        pincode: addr.postcode || ''
      };
    } catch (err) {
      console.error('Reverse Geocoding Failed:', err);
      return {
        address: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
        city: '',
        state: '',
        country: '',
        pincode: ''
      };
    }
  };

  const fetchPosition = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  };

  const refreshLocation = useCallback(async (retries = 3) => {
    setLoading(true);
    setError(null);

    let attempt = 0;
    while (attempt < retries) {
      try {
        const position = await fetchPosition();
        const { latitude, longitude, accuracy } = position.coords;
        const timestamp = new Date(position.timestamp).toISOString();

        // Check if accuracy is acceptable (less than or equal to 150 meters)
        if (accuracy > 150 && attempt < retries - 1) {
          attempt++;
          // Wait briefly before retrying
          await new Promise(res => setTimeout(res, 2000));
          continue;
        }

        // Fetch reverse geocoded data
        const geocodeData = await getReverseGeocoding(latitude, longitude);

        setLocation({
          latitude,
          longitude,
          accuracy: Math.round(accuracy),
          timestamp,
          ...geocodeData
        });
        
        if (accuracy > 150) {
           setError('Your GPS accuracy is low. Please move to an open area and try again.');
        }

        setLoading(false);
        return; // Success, exit loop
      } catch (err) {
        let errorMsg = 'An unknown error occurred while fetching location.';
        if (err.code === 1) {
          errorMsg = 'Location permission is required to mark attendance.';
          attempt = retries; // Stop retrying on permission denied
        } else if (err.code === 2) {
          errorMsg = 'GPS is unavailable or disabled. Please enable Location Services.';
        } else if (err.code === 3) {
          errorMsg = 'Location request timed out. Please check your GPS signal.';
        } else {
           errorMsg = err.message || errorMsg;
        }

        attempt++;
        if (attempt >= retries) {
          setError(errorMsg);
          setLocation(null);
          setLoading(false);
          return;
        }
        await new Promise(res => setTimeout(res, 1000)); // wait before retry
      }
    }
  }, []);

  return { location, loading, error, refreshLocation };
};
