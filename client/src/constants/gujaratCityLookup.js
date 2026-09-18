// Mirrors server/constants/gujaratCityLookup.js so the Destination Master
// add/edit form (task item 7) can auto-fill District/State instantly as
// the admin types a City, without a network round-trip. The server-side
// copy is still the authoritative one (applied via DestinationMaster's
// beforeValidate hook) for any entry point that bypasses this form, such
// as bulk Excel upload or the inline "add new destination" flow on Edit
// Contract.
const GUJARAT_CITY_DISTRICT_MAP = {
  AHMEDABAD: "Ahmedabad",
  GANDHINAGAR: "Gandhinagar",
  SURAT: "Surat",
  VADODARA: "Vadodara",
  RAJKOT: "Rajkot",
  BHAVNAGAR: "Bhavnagar",
  JAMNAGAR: "Jamnagar",
  JUNAGADH: "Junagadh",
  ANAND: "Anand",
  NADIAD: "Kheda",
  KHEDA: "Kheda",
  MEHSANA: "Mehsana",
  BHARUCH: "Bharuch",
  ANKLESHWAR: "Bharuch",
  NAVSARI: "Navsari",
  VALSAD: "Valsad",
  VAPI: "Valsad",
  MORBI: "Morbi",
  PORBANDAR: "Porbandar",
  PATAN: "Patan",
  PALANPUR: "Banaskantha",
  GODHRA: "Panchmahal",
  HIMATNAGAR: "Sabarkantha",
  SURENDRANAGAR: "Surendranagar",
  BOTAD: "Botad",
  AMRELI: "Amreli",
  DAHOD: "Dahod",
  VYARA: "Tapi",
  TAPI: "Tapi",
  VERAVAL: "Gir Somnath",
  KUTCH: "Kutch",
  BHUJ: "Kutch",
  GANDHIDHAM: "Kutch",
  DWARKA: "Devbhoomi Dwarka",
  KHAMBHAT: "Anand",
  PALITANA: "Bhavnagar",
  IDAR: "Sabarkantha",
  MODASA: "Aravalli",
  DAMAN: "Daman",
  SILVASSA: "Dadra and Nagar Haveli",
  MANDVI: "Kutch",
  UNJHA: "Mehsana",
  VISNAGAR: "Mehsana",
  KALOL: "Gandhinagar",
  SANAND: "Ahmedabad",
  DHOLKA: "Ahmedabad",
  BAVLA: "Ahmedabad",
  UMBERGAON: "Valsad",
  BILIMORA: "Navsari",
  JETPUR: "Rajkot",
  GONDAL: "Rajkot",
  WANKANER: "Morbi",
};

export const DEFAULT_STATE = "Gujarat";

export const lookupDistrictForCity = (city) => {
  if (!city) return "";
  const normalized = city.trim().toUpperCase().replace(/\s+/g, "_");
  return GUJARAT_CITY_DISTRICT_MAP[normalized] || "";
};
