// India-wide City/Area -> District + State lookup, used to auto-fill
// District and State on Destination Master when a user types/selects a
// City (task item 7, extended nationwide). Not an exhaustive nationwide
// gazetteer - it covers state capitals, major metros/cities, and the
// Gujarat industrial localities most likely to appear as freight
// destinations for this business. Cities/areas not in this list simply
// don't get an auto-filled District/State (left blank for the admin to
// fill in manually), rather than the form blocking on an unrecognized name.
//
// A handful of city names repeat across different states (e.g. Aurangabad
// in both Maharashtra and Bihar, Bilaspur in both Chhattisgarh and Himachal
// Pradesh, Hamirpur/Pratapgarh in both UP and another state). For those,
// the map value is an array with more than one {district, state} entry, so
// the caller (DestinationMaster's beforeValidate hook, or the frontend
// form) can offer all matches instead of silently guessing one.
//
// Map value shape: { district: string, state: string } | Array<{ district, state }>
export const CITY_DISTRICT_STATE_MAP = {
  // Andhra Pradesh
  VISAKHAPATNAM: { district: "Visakhapatnam", state: "Andhra Pradesh" },
  VIJAYAWADA: { district: "NTR", state: "Andhra Pradesh" },
  GUNTUR: { district: "Guntur", state: "Andhra Pradesh" },
  NELLORE: { district: "SPSR Nellore", state: "Andhra Pradesh" },
  KURNOOL: { district: "Kurnool", state: "Andhra Pradesh" },
  TIRUPATI: { district: "Chittoor", state: "Andhra Pradesh" },
  KADAPA: { district: "YSR Kadapa", state: "Andhra Pradesh" },
  RAJAHMUNDRY: { district: "East Godavari", state: "Andhra Pradesh" },
  KAKINADA: { district: "East Godavari", state: "Andhra Pradesh" },
  ANANTAPUR: { district: "Anantapur", state: "Andhra Pradesh" },

  // Arunachal Pradesh
  ITANAGAR: { district: "Papum Pare", state: "Arunachal Pradesh" },
  NAHARLAGUN: { district: "Papum Pare", state: "Arunachal Pradesh" },

  // Assam
  GUWAHATI: { district: "Kamrup Metropolitan", state: "Assam" },
  DIBRUGARH: { district: "Dibrugarh", state: "Assam" },
  SILCHAR: { district: "Cachar", state: "Assam" },
  JORHAT: { district: "Jorhat", state: "Assam" },
  TEZPUR: { district: "Sonitpur", state: "Assam" },
  NAGAON: { district: "Nagaon", state: "Assam" },

  // Bihar
  PATNA: { district: "Patna", state: "Bihar" },
  GAYA: { district: "Gaya", state: "Bihar" },
  BHAGALPUR: { district: "Bhagalpur", state: "Bihar" },
  MUZAFFARPUR: { district: "Muzaffarpur", state: "Bihar" },
  DARBHANGA: { district: "Darbhanga", state: "Bihar" },
  PURNIA: { district: "Purnia", state: "Bihar" },
  BIHAR_SHARIF: { district: "Nalanda", state: "Bihar" },
  SITAMARHI: { district: "Sitamarhi", state: "Bihar" },

  // Chhattisgarh
  RAIPUR: { district: "Raipur", state: "Chhattisgarh" },
  BHILAI: { district: "Durg", state: "Chhattisgarh" },
  DURG: { district: "Durg", state: "Chhattisgarh" },
  KORBA: { district: "Korba", state: "Chhattisgarh" },
  RAIGARH: { district: "Raigarh", state: "Chhattisgarh" },
  JAGDALPUR: { district: "Bastar", state: "Chhattisgarh" },

  // Goa
  PANAJI: { district: "North Goa", state: "Goa" },
  MARGAO: { district: "South Goa", state: "Goa" },
  VASCO_DA_GAMA: { district: "South Goa", state: "Goa" },
  MAPUSA: { district: "North Goa", state: "Goa" },

  // Gujarat - cities
  AHMEDABAD: { district: "Ahmedabad", state: "Gujarat" },
  GANDHINAGAR: { district: "Gandhinagar", state: "Gujarat" },
  SURAT: { district: "Surat", state: "Gujarat" },
  VADODARA: { district: "Vadodara", state: "Gujarat" },
  RAJKOT: { district: "Rajkot", state: "Gujarat" },
  BHAVNAGAR: { district: "Bhavnagar", state: "Gujarat" },
  JAMNAGAR: { district: "Jamnagar", state: "Gujarat" },
  JUNAGADH: { district: "Junagadh", state: "Gujarat" },
  ANAND: { district: "Anand", state: "Gujarat" },
  NADIAD: { district: "Kheda", state: "Gujarat" },
  KHEDA: { district: "Kheda", state: "Gujarat" },
  MEHSANA: { district: "Mehsana", state: "Gujarat" },
  BHARUCH: { district: "Bharuch", state: "Gujarat" },
  ANKLESHWAR: { district: "Bharuch", state: "Gujarat" },
  NAVSARI: { district: "Navsari", state: "Gujarat" },
  VALSAD: { district: "Valsad", state: "Gujarat" },
  VAPI: { district: "Valsad", state: "Gujarat" },
  MORBI: { district: "Morbi", state: "Gujarat" },
  PORBANDAR: { district: "Porbandar", state: "Gujarat" },
  PATAN: { district: "Patan", state: "Gujarat" },
  PALANPUR: { district: "Banaskantha", state: "Gujarat" },
  GODHRA: { district: "Panchmahal", state: "Gujarat" },
  HIMATNAGAR: { district: "Sabarkantha", state: "Gujarat" },
  SURENDRANAGAR: { district: "Surendranagar", state: "Gujarat" },
  BOTAD: { district: "Botad", state: "Gujarat" },
  AMRELI: { district: "Amreli", state: "Gujarat" },
  DAHOD: { district: "Dahod", state: "Gujarat" },
  VYARA: { district: "Tapi", state: "Gujarat" },
  TAPI: { district: "Tapi", state: "Gujarat" },
  VERAVAL: { district: "Gir Somnath", state: "Gujarat" },
  GIR_SOMNATH: { district: "Gir Somnath", state: "Gujarat" },
  KUTCH: { district: "Kutch", state: "Gujarat" },
  BHUJ: { district: "Kutch", state: "Gujarat" },
  GANDHIDHAM: { district: "Kutch", state: "Gujarat" },
  DWARKA: { district: "Devbhoomi Dwarka", state: "Gujarat" },
  KHAMBHAT: { district: "Anand", state: "Gujarat" },
  PALITANA: { district: "Bhavnagar", state: "Gujarat" },
  IDAR: { district: "Sabarkantha", state: "Gujarat" },
  MODASA: { district: "Aravalli", state: "Gujarat" },
  ARAVALLI: { district: "Aravalli", state: "Gujarat" },
  MANDVI: { district: "Kutch", state: "Gujarat" },
  UNJHA: { district: "Mehsana", state: "Gujarat" },
  VISNAGAR: { district: "Mehsana", state: "Gujarat" },
  KALOL: { district: "Gandhinagar", state: "Gujarat" },
  SANAND: { district: "Ahmedabad", state: "Gujarat" },
  DHOLKA: { district: "Ahmedabad", state: "Gujarat" },
  BAVLA: { district: "Ahmedabad", state: "Gujarat" },
  UMBERGAON: { district: "Valsad", state: "Gujarat" },
  BILIMORA: { district: "Navsari", state: "Gujarat" },
  JETPUR: { district: "Rajkot", state: "Gujarat" },
  GONDAL: { district: "Rajkot", state: "Gujarat" },
  WANKANER: { district: "Morbi", state: "Gujarat" },
  // Gujarat - industrial areas/localities (not standalone cities, but
  // commonly used as freight destinations)
  HAZIRA: { district: "Surat", state: "Gujarat" },
  PANDESARA: { district: "Surat", state: "Gujarat" },
  SACHIN: { district: "Surat", state: "Gujarat" },
  DAHEJ: { district: "Bharuch", state: "Gujarat" },
  ANKLESHWAR_GIDC: { district: "Bharuch", state: "Gujarat" },
  ODHAV: { district: "Ahmedabad", state: "Gujarat" },
  VATVA: { district: "Ahmedabad", state: "Gujarat" },
  NARODA: { district: "Ahmedabad", state: "Gujarat" },

  // Haryana
  GURUGRAM: { district: "Gurugram", state: "Haryana" },
  GURGAON: { district: "Gurugram", state: "Haryana" },
  FARIDABAD: { district: "Faridabad", state: "Haryana" },
  PANIPAT: { district: "Panipat", state: "Haryana" },
  AMBALA: { district: "Ambala", state: "Haryana" },
  KARNAL: { district: "Karnal", state: "Haryana" },
  HISAR: { district: "Hisar", state: "Haryana" },
  ROHTAK: { district: "Rohtak", state: "Haryana" },
  SONIPAT: { district: "Sonipat", state: "Haryana" },
  BAHADURGARH: { district: "Jhajjar", state: "Haryana" },
  YAMUNANAGAR: { district: "Yamunanagar", state: "Haryana" },

  // Himachal Pradesh
  SHIMLA: { district: "Shimla", state: "Himachal Pradesh" },
  MANALI: { district: "Kullu", state: "Himachal Pradesh" },
  KULLU: { district: "Kullu", state: "Himachal Pradesh" },
  DHARAMSHALA: { district: "Kangra", state: "Himachal Pradesh" },
  SOLAN: { district: "Solan", state: "Himachal Pradesh" },
  MANDI: { district: "Mandi", state: "Himachal Pradesh" },

  // Jharkhand
  RANCHI: { district: "Ranchi", state: "Jharkhand" },
  JAMSHEDPUR: { district: "East Singhbhum", state: "Jharkhand" },
  DHANBAD: { district: "Dhanbad", state: "Jharkhand" },
  BOKARO: { district: "Bokaro", state: "Jharkhand" },
  DEOGHAR: { district: "Deoghar", state: "Jharkhand" },
  HAZARIBAGH: { district: "Hazaribagh", state: "Jharkhand" },

  // Karnataka
  BENGALURU: { district: "Bengaluru Urban", state: "Karnataka" },
  BANGALORE: { district: "Bengaluru Urban", state: "Karnataka" },
  MYSURU: { district: "Mysuru", state: "Karnataka" },
  MYSORE: { district: "Mysuru", state: "Karnataka" },
  HUBBALLI: { district: "Dharwad", state: "Karnataka" },
  MANGALURU: { district: "Dakshina Kannada", state: "Karnataka" },
  MANGALORE: { district: "Dakshina Kannada", state: "Karnataka" },
  BELAGAVI: { district: "Belagavi", state: "Karnataka" },
  DAVANGERE: { district: "Davangere", state: "Karnataka" },
  TUMAKURU: { district: "Tumakuru", state: "Karnataka" },
  BALLARI: { district: "Ballari", state: "Karnataka" },
  SHIVAMOGGA: { district: "Shivamogga", state: "Karnataka" },
  HOSPET: { district: "Vijayanagara", state: "Karnataka" },

  // Kerala
  THIRUVANANTHAPURAM: { district: "Thiruvananthapuram", state: "Kerala" },
  KOCHI: { district: "Ernakulam", state: "Kerala" },
  KOZHIKODE: { district: "Kozhikode", state: "Kerala" },
  THRISSUR: { district: "Thrissur", state: "Kerala" },
  KOLLAM: { district: "Kollam", state: "Kerala" },
  KANNUR: { district: "Kannur", state: "Kerala" },
  ALAPPUZHA: { district: "Alappuzha", state: "Kerala" },
  PALAKKAD: { district: "Palakkad", state: "Kerala" },

  // Madhya Pradesh
  BHOPAL: { district: "Bhopal", state: "Madhya Pradesh" },
  INDORE: { district: "Indore", state: "Madhya Pradesh" },
  JABALPUR: { district: "Jabalpur", state: "Madhya Pradesh" },
  GWALIOR: { district: "Gwalior", state: "Madhya Pradesh" },
  UJJAIN: { district: "Ujjain", state: "Madhya Pradesh" },
  SAGAR: { district: "Sagar", state: "Madhya Pradesh" },
  DEWAS: { district: "Dewas", state: "Madhya Pradesh" },
  SATNA: { district: "Satna", state: "Madhya Pradesh" },
  RATLAM: { district: "Ratlam", state: "Madhya Pradesh" },
  REWA: { district: "Rewa", state: "Madhya Pradesh" },

  // Maharashtra
  MUMBAI: { district: "Mumbai", state: "Maharashtra" },
  PUNE: { district: "Pune", state: "Maharashtra" },
  NAGPUR: { district: "Nagpur", state: "Maharashtra" },
  NASHIK: { district: "Nashik", state: "Maharashtra" },
  SOLAPUR: { district: "Solapur", state: "Maharashtra" },
  KOLHAPUR: { district: "Kolhapur", state: "Maharashtra" },
  AMRAVATI: { district: "Amravati", state: "Maharashtra" },
  THANE: { district: "Thane", state: "Maharashtra" },
  NAVI_MUMBAI: { district: "Thane", state: "Maharashtra" },
  KALYAN: { district: "Thane", state: "Maharashtra" },
  BHIWANDI: { district: "Thane", state: "Maharashtra" },
  CHANDRAPUR: { district: "Chandrapur", state: "Maharashtra" },
  LATUR: { district: "Latur", state: "Maharashtra" },
  AKOLA: { district: "Akola", state: "Maharashtra" },
  JALGAON: { district: "Jalgaon", state: "Maharashtra" },
  SANGLI: { district: "Sangli", state: "Maharashtra" },
  MAHAPE: { district: "Thane", state: "Maharashtra" },

  // Manipur / Meghalaya / Mizoram / Nagaland
  IMPHAL: { district: "Imphal West", state: "Manipur" },
  SHILLONG: { district: "East Khasi Hills", state: "Meghalaya" },
  AIZAWL: { district: "Aizawl", state: "Mizoram" },
  KOHIMA: { district: "Kohima", state: "Nagaland" },
  DIMAPUR: { district: "Dimapur", state: "Nagaland" },

  // Odisha
  BHUBANESWAR: { district: "Khordha", state: "Odisha" },
  CUTTACK: { district: "Cuttack", state: "Odisha" },
  ROURKELA: { district: "Sundargarh", state: "Odisha" },
  SAMBALPUR: { district: "Sambalpur", state: "Odisha" },
  BERHAMPUR: { district: "Ganjam", state: "Odisha" },
  PURI: { district: "Puri", state: "Odisha" },

  // Punjab
  LUDHIANA: { district: "Ludhiana", state: "Punjab" },
  AMRITSAR: { district: "Amritsar", state: "Punjab" },
  JALANDHAR: { district: "Jalandhar", state: "Punjab" },
  PATIALA: { district: "Patiala", state: "Punjab" },
  BATHINDA: { district: "Bathinda", state: "Punjab" },
  MOHALI: { district: "SAS Nagar", state: "Punjab" },
  PATHANKOT: { district: "Pathankot", state: "Punjab" },

  // Rajasthan
  JAIPUR: { district: "Jaipur", state: "Rajasthan" },
  JODHPUR: { district: "Jodhpur", state: "Rajasthan" },
  UDAIPUR: { district: "Udaipur", state: "Rajasthan" },
  KOTA: { district: "Kota", state: "Rajasthan" },
  AJMER: { district: "Ajmer", state: "Rajasthan" },
  BIKANER: { district: "Bikaner", state: "Rajasthan" },
  BHILWARA: { district: "Bhilwara", state: "Rajasthan" },
  ALWAR: { district: "Alwar", state: "Rajasthan" },
  SIKAR: { district: "Sikar", state: "Rajasthan" },

  // Sikkim
  GANGTOK: { district: "East Sikkim", state: "Sikkim" },

  // Tamil Nadu
  CHENNAI: { district: "Chennai", state: "Tamil Nadu" },
  COIMBATORE: { district: "Coimbatore", state: "Tamil Nadu" },
  MADURAI: { district: "Madurai", state: "Tamil Nadu" },
  TIRUCHIRAPPALLI: { district: "Tiruchirappalli", state: "Tamil Nadu" },
  TRICHY: { district: "Tiruchirappalli", state: "Tamil Nadu" },
  SALEM: { district: "Salem", state: "Tamil Nadu" },
  TIRUNELVELI: { district: "Tirunelveli", state: "Tamil Nadu" },
  ERODE: { district: "Erode", state: "Tamil Nadu" },
  VELLORE: { district: "Vellore", state: "Tamil Nadu" },
  THOOTHUKUDI: { district: "Thoothukudi", state: "Tamil Nadu" },
  TUTICORIN: { district: "Thoothukudi", state: "Tamil Nadu" },

  // Telangana
  HYDERABAD: { district: "Hyderabad", state: "Telangana" },
  WARANGAL: { district: "Warangal", state: "Telangana" },
  NIZAMABAD: { district: "Nizamabad", state: "Telangana" },
  KARIMNAGAR: { district: "Karimnagar", state: "Telangana" },
  KHAMMAM: { district: "Khammam", state: "Telangana" },

  // Tripura
  AGARTALA: { district: "West Tripura", state: "Tripura" },

  // Uttar Pradesh
  LUCKNOW: { district: "Lucknow", state: "Uttar Pradesh" },
  KANPUR: { district: "Kanpur Nagar", state: "Uttar Pradesh" },
  AGRA: { district: "Agra", state: "Uttar Pradesh" },
  VARANASI: { district: "Varanasi", state: "Uttar Pradesh" },
  MEERUT: { district: "Meerut", state: "Uttar Pradesh" },
  GHAZIABAD: { district: "Ghaziabad", state: "Uttar Pradesh" },
  NOIDA: { district: "Gautam Buddha Nagar", state: "Uttar Pradesh" },
  PRAYAGRAJ: { district: "Prayagraj", state: "Uttar Pradesh" },
  ALLAHABAD: { district: "Prayagraj", state: "Uttar Pradesh" },
  BAREILLY: { district: "Bareilly", state: "Uttar Pradesh" },
  ALIGARH: { district: "Aligarh", state: "Uttar Pradesh" },
  MORADABAD: { district: "Moradabad", state: "Uttar Pradesh" },
  SAHARANPUR: { district: "Saharanpur", state: "Uttar Pradesh" },
  GORAKHPUR: { district: "Gorakhpur", state: "Uttar Pradesh" },
  JHANSI: { district: "Jhansi", state: "Uttar Pradesh" },
  MATHURA: { district: "Mathura", state: "Uttar Pradesh" },

  // Uttarakhand
  DEHRADUN: { district: "Dehradun", state: "Uttarakhand" },
  HARIDWAR: { district: "Haridwar", state: "Uttarakhand" },
  ROORKEE: { district: "Haridwar", state: "Uttarakhand" },
  RUDRAPUR: { district: "Udham Singh Nagar", state: "Uttarakhand" },
  HALDWANI: { district: "Nainital", state: "Uttarakhand" },
  RISHIKESH: { district: "Dehradun", state: "Uttarakhand" },

  // West Bengal
  KOLKATA: { district: "Kolkata", state: "West Bengal" },
  HOWRAH: { district: "Howrah", state: "West Bengal" },
  DURGAPUR: { district: "Paschim Bardhaman", state: "West Bengal" },
  ASANSOL: { district: "Paschim Bardhaman", state: "West Bengal" },
  SILIGURI: { district: "Darjeeling", state: "West Bengal" },
  KHARAGPUR: { district: "Paschim Medinipur", state: "West Bengal" },
  HALDIA: { district: "Purba Medinipur", state: "West Bengal" },

  // Union Territories
  DELHI: { district: "New Delhi", state: "Delhi" },
  NEW_DELHI: { district: "New Delhi", state: "Delhi" },
  CHANDIGARH: { district: "Chandigarh", state: "Chandigarh" },
  PUDUCHERRY: { district: "Puducherry", state: "Puducherry" },
  JAMMU: { district: "Jammu", state: "Jammu and Kashmir" },
  SRINAGAR: { district: "Srinagar", state: "Jammu and Kashmir" },
  LEH: { district: "Leh", state: "Ladakh" },
  SILVASSA: { district: "Dadra and Nagar Haveli", state: "Dadra and Nagar Haveli and Daman and Diu" },
  DAMAN: { district: "Daman", state: "Dadra and Nagar Haveli and Daman and Diu" },
  DIU: { district: "Diu", state: "Dadra and Nagar Haveli and Daman and Diu" },
  PORT_BLAIR: { district: "South Andaman", state: "Andaman and Nicobar Islands" },
  KAVARATTI: { district: "Lakshadweep", state: "Lakshadweep" },

  // Ambiguous city names that legitimately exist in more than one
  // state/district - these are the ones that should surface a dropdown on
  // Destination Master instead of guessing.
  AURANGABAD: [
    { district: "Aurangabad", state: "Maharashtra" },
    { district: "Aurangabad", state: "Bihar" },
  ],
  BILASPUR: [
    { district: "Bilaspur", state: "Chhattisgarh" },
    { district: "Bilaspur", state: "Himachal Pradesh" },
  ],
  HAMIRPUR: [
    { district: "Hamirpur", state: "Himachal Pradesh" },
    { district: "Hamirpur", state: "Uttar Pradesh" },
  ],
  PRATAPGARH: [
    { district: "Pratapgarh", state: "Uttar Pradesh" },
    { district: "Pratapgarh", state: "Rajasthan" },
  ],
};

/**
 * Normalizes a city/area name into the map's lookup key format.
 */
const normalizeCityKey = (city) => {
  if (!city) return "";
  return city.trim().toUpperCase().replace(/\s+/g, "_");
};

/**
 * Resolves a City/area name to its District + State match(es).
 * Always returns an array: empty when nothing matches, one entry when the
 * name is unambiguous, more than one when the name exists in multiple
 * districts/states (e.g. Aurangabad, Bilaspur).
 * @param {string} city
 * @returns {Array<{district: string, state: string}>}
 */
const lookupDistrictForCity = (city) => {
  const key = normalizeCityKey(city);
  if (!key) return [];
  const entry = CITY_DISTRICT_STATE_MAP[key];
  if (!entry) return [];
  return Array.isArray(entry) ? entry : [entry];
};

export { lookupDistrictForCity };
