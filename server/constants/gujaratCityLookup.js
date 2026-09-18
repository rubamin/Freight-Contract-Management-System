// A reasonable-coverage City -> District lookup for Gujarat, used to
// auto-fill District (and confirm State) on Destination Master when a
// user types/selects a City (task item 7). This is intentionally not an
// exhaustive nationwide gazetteer - it covers the major
// cities/towns most likely to appear as freight destinations. Cities not
// in this list simply don't get an auto-filled District (the field is
// left blank for the admin to fill in manually), rather than the form
// blocking on an unrecognized city.
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
  GIR_SOMNATH: "Gir Somnath",
  KUTCH: "Kutch",
  BHUJ: "Kutch",
  GANDHIDHAM: "Kutch",
  DWARKA: "Devbhoomi Dwarka",
  KHAMBHAT: "Anand",
  PALITANA: "Bhavnagar",
  IDAR: "Sabarkantha",
  MODASA: "Aravalli",
  ARAVALLI: "Aravalli",
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

// Every destination created through this lookup defaults to Gujarat as the
// State, matching DestinationMaster.State's existing DB default - this
// module only ever needs to resolve District from City.
const DEFAULT_STATE = "Gujarat";

const lookupDistrictForCity = (city) => {
  if (!city) return null;
  const normalized = city.trim().toUpperCase().replace(/\s+/g, "_");
  return GUJARAT_CITY_DISTRICT_MAP[normalized] || null;
};

module.exports = { GUJARAT_CITY_DISTRICT_MAP, DEFAULT_STATE, lookupDistrictForCity };
