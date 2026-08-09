import { useState, useEffect } from "react";
import { fetchCities } from "../utils/api";

const FALLBACK = ["Delhi", "Mumbai", "Bangalore", "Chennai", "Hyderabad"];

export function useCities() {
  const [cities, setCities] = useState(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCities()
      .then(({ cities: data }) => { if (data?.length) setCities(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { cities, loading };
}
